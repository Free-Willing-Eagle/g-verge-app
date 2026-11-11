import { describe, expect, it } from 'vitest'

import {
  compileWorkspace,
  connectionTarget,
  emptyWorkspace,
  readConnection,
  routeRules,
  serverTarget,
  siteAddress,
} from './model'

const route = {
  id: 'one',
  name: 'Chrome',
  match: 'app' as const,
  value: '/Applications/Google Chrome.app',
  target: 'DIRECT',
  enabled: true,
}

describe('personal routing compilation', () => {
  it('matches the complete app bundle including helper processes', () => {
    const [rule] = routeRules(route)
    const regex = new RegExp(rule.split(',')[1])
    expect(
      regex.test(
        '/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Helper.app/Contents/MacOS/Google Chrome Helper',
      ),
    ).toBe(true)
    expect(
      regex.test('/Applications/Google ChromeXapp/Contents/MacOS/Chrome'),
    ).toBe(false)
    expect(regex.test('/Applications/Other.app/Contents/MacOS/Chrome')).toBe(
      false,
    )
  })

  it('routes Safari through its sealed system location and WebKit network process', () => {
    const rules = routeRules({
      ...route,
      value: '/Applications/Safari.app',
      target: 'connection-a',
    })
    expect(
      new RegExp(rules[0].split(',')[1]).test(
        '/System/Volumes/Preboot/Cryptexes/App/System/Applications/Safari.app/Contents/MacOS/Safari',
      ),
    ).toBe(true)
    expect(rules[1]).toBe(
      'PROCESS-NAME,com.apple.WebKit.Networking,connection-a',
    )
  })

  it('binds a server exit to the Tailscale device', () => {
    const server = readConnection('s', 'VPS', {
      proxies: [
        { name: 'VPS', type: 'socks5', server: '100.64.0.10', port: 1080 },
      ],
    })
    const result = compileWorkspace(emptyWorkspace(), [
      { ...server, bindInterface: 'utun5' },
    ])
    expect(result.proxies[0]['interface-name']).toBe('utun5')
  })

  it('places Tailscale exceptions first, chosen sites above Russian sites, programs after them', () => {
    const site = {
      ...route,
      id: 'site',
      match: 'domain' as const,
      value: 'kinopoisk.ru',
      target: 'REJECT',
    }
    const result = compileWorkspace(
      { ...emptyWorkspace(), routes: [route, site] },
      [],
    )
    expect(result.rules.slice(0, 3)).toEqual([
      'IP-CIDR,100.64.0.0/10,DIRECT,no-resolve',
      'IP-CIDR6,fd7a:115c:a1e0::/48,DIRECT,no-resolve',
      'DOMAIN-SUFFIX,kinopoisk.ru,REJECT',
    ])
    expect(result.rules[3]).toBe('DOMAIN-SUFFIX,ru,DIRECT')
    expect(result.rules.at(-2)).toContain('PROCESS-PATH-REGEX')
    expect(result.rules.at(-1)).toBe('MATCH,DIRECT')
    expect(
      compileWorkspace(
        { ...emptyWorkspace(), russiaDirect: false, routes: [route] },
        [],
      ).rules.some((rule) => rule.includes(',ru,')),
    ).toBe(false)
  })

  it('matches a Windows program by name and its own folder, never a shared system folder', () => {
    const [byName, byFolder] = routeRules({
      ...route,
      value: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    })
    expect(byName).toBe('PROCESS-NAME-REGEX,(?i)^chrome\\.exe$,DIRECT')
    const folder = new RegExp(byFolder.split(',')[1].replace('(?i)', ''), 'i')
    expect(
      folder.test(
        'c:\\program files\\google\\chrome\\application\\chrome_proxy.exe',
      ),
    ).toBe(true)
    expect(
      folder.test('C:\\Program Files\\Google\\Chrome\\Application\\1.0\\x.exe'),
    ).toBe(false)
    expect(
      routeRules({ ...route, value: 'C:\\Windows\\System32\\mstsc.exe' }),
    ).toHaveLength(1)
  })

  it('isolates identical server and provider names from different subscriptions', () => {
    const config = {
      proxies: [
        { name: 'London', type: 'socks5', server: '127.0.0.1', port: 1080 },
        { name: 'Tunnel', type: 'ssh', 'dialer-proxy': 'London' },
      ],
      'proxy-providers': {
        nodes: {
          type: 'http',
          url: 'https://example.com/profile',
          path: './same.yaml',
        },
      },
    }
    const sources = ['a', 'b'].map((id) => readConnection(id, id, config))
    const result = compileWorkspace(emptyWorkspace(), sources)
    expect(new Set(result.proxies.map((node) => node.name)).size).toBe(4)
    expect(result.proxies[1]['dialer-proxy']).toBe('connection-a/London')
    expect(
      Object.values(result['proxy-providers']).map((item) => item.path),
    ).toEqual([
      './providers/connection-a-nodes.yaml',
      './providers/connection-b-nodes.yaml',
    ])
    expect(config.proxies[0].name).toBe('London')
  })

  it('never silently falls back to direct when a selected connection disappears', () => {
    expect(() =>
      compileWorkspace(
        { ...emptyWorkspace(), defaultTarget: connectionTarget('missing') },
        [],
      ),
    ).toThrow('недоступно')
  })

  it('rejects injected rules, malformed networks and missing nodes', () => {
    expect(() =>
      routeRules({ ...route, value: '/Applications/Chrome.app,REJECT' }),
    ).toThrow()
    expect(() =>
      routeRules({ ...route, match: 'network', value: '999.1.1.1/24' }),
    ).toThrow()
    expect(() =>
      routeRules({ ...route, match: 'network', value: '::::/64' }),
    ).toThrow()
    expect(() => readConnection('a', 'Мой VPN', {})).toThrow(
      'серверы не найдены',
    )
  })

  it('reports unreachable duplicate app rules', () => {
    expect(() =>
      compileWorkspace(
        {
          ...emptyWorkspace(),
          routes: [route, { ...route, id: 'two', target: 'REJECT' }],
        },
        [],
      ),
    ).toThrow('Повторяется')
  })
  it('keeps different countries of one VPN independent for different apps', () => {
    const source = readConnection('vpn', 'Мой VPN', {
      proxies: [
        { name: 'London', type: 'socks5', server: '127.0.0.1', port: 1080 },
        { name: 'Berlin', type: 'socks5', server: '127.0.0.1', port: 1081 },
      ],
    })
    const result = compileWorkspace(
      {
        ...emptyWorkspace(),
        routes: [
          { ...route, target: serverTarget('vpn', 'London') },
          {
            ...route,
            id: 'second',
            value: '/Applications/Claude.app',
            target: serverTarget('vpn', 'Berlin'),
          },
        ],
      },
      [source],
    )
    expect(
      result['proxy-groups'].find(
        (group) => group.name === serverTarget('vpn', 'London'),
      )?.proxies,
    ).toEqual(['connection-vpn/London'])
    expect(
      result['proxy-groups'].find(
        (group) => group.name === serverTarget('vpn', 'Berlin'),
      )?.proxies,
    ).toEqual(['connection-vpn/Berlin'])
  })
  it('makes a website exception take precedence over its browser', () => {
    const result = compileWorkspace(
      {
        ...emptyWorkspace(),
        routes: [
          route,
          {
            ...route,
            id: 'site',
            match: 'domain',
            value: 'example.com',
            target: 'REJECT',
          },
        ],
      },
      [],
    )
    expect(result.rules[2]).toBe('DOMAIN-SUFFIX,example.com,REJECT')
  })
  it('reads a site from a pasted link and covers its subdomains', () => {
    expect(siteAddress('https://www.Google.com:443/store?q=1#x')).toEqual({
      name: 'google.com',
      value: 'google.com',
    })
    expect(siteAddress('*.store.google.com.').value).toBe('store.google.com')
    expect(siteAddress('госуслуги.рф')).toEqual({
      name: 'госуслуги.рф',
      value: 'xn--c1aapkosapc.xn--p1ai',
    })
    for (const wrong of ['google', '192.168.1.1', '[::1]', 'a b.com', ''])
      expect(() => siteAddress(wrong)).toThrow()
  })
  it('lets a chosen subdomain override its site', () => {
    const site = (value: string, target: string) => ({
      ...route,
      id: value,
      match: 'domain' as const,
      value,
      target,
    })
    const result = compileWorkspace(
      {
        ...emptyWorkspace(),
        routes: [
          site('google.com', 'REJECT'),
          site('store.google.com', 'DIRECT'),
        ],
      },
      [],
    )
    expect(result.rules.slice(2, 4)).toEqual([
      'DOMAIN-SUFFIX,store.google.com,DIRECT',
      'DOMAIN-SUFFIX,google.com,REJECT',
    ])
  })
  it('sends UDP through the VPN instead of leaking it directly', () => {
    const result = compileWorkspace(
      { ...emptyWorkspace(), sourceIds: ['vpn'] },
      [
        readConnection('vpn', 'VPN', {
          proxies: [
            { name: 'AM', type: 'vless', server: '192.0.2.1', port: 443 },
          ],
        }),
      ],
    )
    expect(result.proxies[0].udp).toBe(true)
  })

  it('reaches a blocked VPN through another one and refuses loops', () => {
    const blocked = readConnection('blocked', 'Windscribe', {
      proxies: [
        { name: 'Amsterdam', type: 'wireguard', server: '192.0.2.1', port: 1 },
      ],
      'proxy-providers': {
        nodes: { type: 'http', url: 'https://example.com/p', path: './p.yaml' },
      },
    })
    const working = readConnection('working', 'VPN', {
      proxies: [
        { name: 'Moscow', type: 'vless', server: '192.0.2.2', port: 443 },
      ],
    })
    const via = serverTarget('working', 'Moscow')
    const compile = (chains: Record<string, string>, list = [blocked]) =>
      compileWorkspace({ ...emptyWorkspace(), chains }, [...list, working])
    const result = compile({ blocked: via })
    const node = (name: string) =>
      result.proxies.find((item) => item.name === name)
    expect(node('connection-blocked/Amsterdam')?.['dialer-proxy']).toBe(via)
    expect(node('connection-working/Moscow')?.['dialer-proxy']).toBeUndefined()
    expect(
      result['proxy-providers']['connection-blocked/nodes'].override,
    ).toMatchObject({ 'dialer-proxy': via })
    expect(result['proxy-groups'].some((group) => group.name === via)).toBe(
      true,
    )
    expect(() =>
      compile({
        blocked: connectionTarget('working'),
        working: connectionTarget('blocked'),
      }),
    ).toThrow('друг через друга')
    expect(() => compile({ blocked: connectionTarget('blocked') })).toThrow(
      'друг через друга',
    )
    expect(() => compile({ working: connectionTarget('gone') })).toThrow(
      'больше недоступно',
    )
    expect(() =>
      compile({ blocked: connectionTarget('working') }, [
        { ...blocked, bindInterface: 'utun5' },
      ]),
    ).toThrow('Tailscale')
  })
})
