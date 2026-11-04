import { isValidIpCidr } from '@/utils/network'

export type AppRoute = {
  id: string
  name: string
  match: 'app' | 'process' | 'domain' | 'network'
  value: string
  target: string
  enabled: boolean
}

export type Connection = {
  id: string
  name: string
  proxies: Record<string, unknown>[]
  providers: Record<string, Record<string, unknown>>
  bindInterface?: string
}

export type Workspace = {
  version: 1
  defaultTarget: string
  preserveTailscale: boolean
  routes: AppRoute[]
  sourceIds: string[]
  appPaths?: string[]
  serverDefaults?: Record<string, string>
  russiaDirect?: boolean
}

export const workspaceKey = 'x-personal-routing'
export const workspaceDescription = 'personal-routing-workspace-v1'

export const emptyWorkspace = (): Workspace => ({
  version: 1,
  defaultTarget: 'DIRECT',
  preserveTailscale: true,
  routes: [],
  sourceIds: [],
  russiaDirect: true,
})

// Russian banks and government services often refuse foreign addresses.
const russiaRules = [
  'DOMAIN-SUFFIX,ru,DIRECT',
  'DOMAIN-SUFFIX,su,DIRECT',
  'DOMAIN-SUFFIX,xn--p1ai,DIRECT',
  'GEOSITE,category-ru,DIRECT',
  'GEOIP,RU,DIRECT,no-resolve',
]

const invalidField = /[,\r\n]/

function field(value: string, label: string): string {
  if (!value.trim() || invalidField.test(value)) {
    throw new Error(`${label}: укажи значение без запятых и переносов строк.`)
  }
  return value.trim()
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Safari and other system apps run from this sealed volume; /Applications holds only a link.
const cryptexPrefix = '(?:/System/Volumes/Preboot/Cryptexes/App/System)?'

export const isSafari = (path: string) => /\/Safari\.app$/.test(path)

export const isWindowsProgram = (path: string) =>
  /^[a-z]:\\.+\.exe$/i.test(path)

// Folders shared by many unrelated programs; matching them would capture system processes.
const sharedWindowsFolder =
  /^[a-z]:(?:\\(?:windows(?:\\.*)?|program files(?: \(x86\))?|programdata|users\\[^\\]+(?:\\(?:desktop|downloads|documents)|\\appdata\\(?:local|roaming)(?:\\programs)?)?))?$/i

function windowsProgramRules(path: string, target: string): string[] {
  const split = path.lastIndexOf('\\')
  const folder = path.slice(0, split)
  const program = path.slice(split + 1)
  // The name follows updates that move a program into a new versioned folder; the folder covers helper programs beside it.
  const rules = [`PROCESS-NAME-REGEX,(?i)^${escapeRegex(program)}$,${target}`]
  if (!sharedWindowsFolder.test(folder))
    rules.push(
      `PROCESS-PATH-REGEX,(?i)^${escapeRegex(folder)}\\\\[^\\\\]+$,${target}`,
    )
  return rules
}

export function routeRules(route: AppRoute): string[] {
  const value = field(route.value, 'Условие')
  const target = field(route.target, 'Подключение')
  switch (route.match) {
    case 'app': {
      if (isWindowsProgram(value)) return windowsProgramRules(value, target)
      if (!value.startsWith('/') || !value.endsWith('.app')) {
        throw new Error('Выбери программу: .app на Mac или .exe на Windows.')
      }
      // Bundle matching includes helper processes used by Chromium and Electron apps.
      const rule = `PROCESS-PATH-REGEX,^${cryptexPrefix}${escapeRegex(value)}/.*,${target}`
      // Safari pages load through the shared WebKit network process outside the bundle.
      return isSafari(value)
        ? [rule, `PROCESS-NAME,com.apple.WebKit.Networking,${target}`]
        : [rule]
    }
    case 'process':
      return [`PROCESS-NAME,${value},${target}`]
    case 'domain':
      if (
        !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
          value,
        )
      ) {
        throw new Error('Укажи домен без https:// и пути страницы.')
      }
      return [`DOMAIN-SUFFIX,${value},${target}`]
    case 'network': {
      const ipv6 = value.includes(':')
      if (!isValidIpCidr(value)) {
        throw new Error('Укажи сеть с маской, например 192.168.2.0/24.')
      }
      return [`${ipv6 ? 'IP-CIDR6' : 'IP-CIDR'},${value},${target},no-resolve`]
    }
  }
}

export function readConnection(
  id: string,
  name: string,
  config: Record<string, unknown>,
): Connection {
  const proxies = config.proxies
  const providers = config['proxy-providers']
  if (proxies !== undefined && !Array.isArray(proxies)) {
    throw new Error(`${name}: поле proxies должно содержать список серверов.`)
  }
  if (
    providers !== undefined &&
    (typeof providers !== 'object' ||
      providers === null ||
      Array.isArray(providers))
  ) {
    throw new Error(`${name}: неверный формат proxy-providers.`)
  }
  const nodes = (proxies ?? []) as Record<string, unknown>[]
  const feeds = (providers ?? {}) as Record<string, Record<string, unknown>>
  if (
    nodes.some(
      (node) =>
        typeof node !== 'object' ||
        node === null ||
        typeof node.name !== 'string' ||
        typeof node.type !== 'string',
    )
  ) {
    throw new Error(
      `${name}: у каждого сервера должны быть имя и тип подключения.`,
    )
  }
  if (nodes.length === 0 && Object.keys(feeds).length === 0) {
    throw new Error(
      `${name}: серверы не найдены. Нужен профиль в формате Clash/Mihomo.`,
    )
  }
  for (const provider of Object.values(feeds)) {
    if (
      !provider ||
      typeof provider !== 'object' ||
      !['http', 'inline'].includes(String(provider.type))
    ) {
      throw new Error(
        `${name}: объединение поддерживает HTTP-провайдеры и встроенные списки. Файловые провайдеры используй в исходном профиле.`,
      )
    }
    if (provider['dialer-proxy']) {
      throw new Error(
        `${name}: провайдер с отдельной цепочкой нужно настроить в исходном профиле.`,
      )
    }
  }
  return { id, name, proxies: nodes, providers: feeds }
}

export function serverTarget(id: string, name: string): string {
  return `${connectionTarget(id)}/node/${encodeURIComponent(name)}`
}

export function connectionTarget(id: string): string {
  return `connection-${field(id, 'Идентификатор')}`
}

export function compileWorkspace(
  workspace: Workspace,
  connections: Connection[],
) {
  const available = new Set([
    'DIRECT',
    'REJECT',
    ...connections.map((item) => connectionTarget(item.id)),
  ])
  const chosenServers = new Map<
    string,
    { source: Connection; server: string }
  >()
  const checkTarget = (target: string) => {
    if (!available.has(target)) {
      const source = connections.find((item) =>
        target.startsWith(`${connectionTarget(item.id)}/node/`),
      )
      if (source) {
        const server = decodeURIComponent(
          target.slice(`${connectionTarget(source.id)}/node/`.length),
        )
        if (
          source.proxies.some((node) => node.name === server) ||
          Object.keys(source.providers).length > 0
        ) {
          chosenServers.set(target, { source, server })
          return
        }
      }
    }
    if (!available.has(target))
      throw new Error('Выбранное подключение больше недоступно. Выбери другое.')
  }
  checkTarget(workspace.defaultTarget)
  const seen = new Set<string>()
  const rules: string[] = []
  if (workspace.preserveTailscale) {
    rules.push(
      'IP-CIDR,100.64.0.0/10,DIRECT,no-resolve',
      'IP-CIDR6,fd7a:115c:a1e0::/48,DIRECT,no-resolve',
    )
  }
  const addRoute = (route: AppRoute) => {
    try {
      checkTarget(route.target)
    } catch {
      throw new Error(
        `«${route.name}»: выбранный VPN или страна больше недоступны. Выбери другое подключение.`,
      )
    }
    for (const rule of routeRules(route)) {
      const condition = rule.slice(0, rule.lastIndexOf(`,${route.target}`))
      if (seen.has(condition)) {
        // Two programs from one folder share its helper rule; the first choice keeps it.
        if (rule.startsWith('PROCESS-PATH-REGEX,(?i)')) continue
        throw new Error(
          `Повторяется правило «${route.name}». Первое правило всегда имеет приоритет.`,
        )
      }
      seen.add(condition)
      rules.push(rule)
    }
  }
  const enabled = workspace.routes.filter((item) => item.enabled)
  enabled
    .filter((item) => item.match === 'domain')
    .sort((a, b) => b.value.length - a.value.length)
    .forEach(addRoute)
  // Sites chosen one by one stay above the Russian list; programs come after it.
  if (workspace.russiaDirect) rules.push(...russiaRules)
  enabled.filter((item) => item.match !== 'domain').forEach(addRoute)
  rules.push(`MATCH,${workspace.defaultTarget}`)

  const proxies: Record<string, unknown>[] = []
  const providers: Record<string, Record<string, unknown>> = {}
  const groups: Record<string, unknown>[] = []
  for (const connection of connections) {
    const target = connectionTarget(connection.id)
    const renamed = new Map(
      connection.proxies.map((node) => [
        String(node.name),
        `${target}/${String(node.name)}`,
      ]),
    )
    if (renamed.size !== connection.proxies.length) {
      throw new Error(`${connection.name}: повторяются имена серверов.`)
    }
    for (const node of connection.proxies) {
      const copy = {
        ...node,
        name: renamed.get(String(node.name)),
        // Without UDP the core skips the rule and sends QUIC directly, exposing the real address.
        udp: true,
        // The core otherwise binds every outbound to Wi-Fi, where Tailscale addresses are unreachable.
        ...(connection.bindInterface
          ? { 'interface-name': connection.bindInterface }
          : {}),
      }
      const dialer = node['dialer-proxy']
      if (
        typeof dialer === 'string' &&
        !['DIRECT', 'REJECT'].includes(dialer)
      ) {
        if (!renamed.has(dialer))
          throw new Error(
            `${connection.name}: цепочка ссылается на недоступный сервер.`,
          )
        Object.assign(copy, { 'dialer-proxy': renamed.get(dialer) })
      }
      proxies.push(copy)
    }
    const feeds = Object.entries(connection.providers).map(
      ([name, provider]) => {
        const key = `${target}/${name}`
        // Separate cache files prevent subscriptions with identical paths overwriting each other.
        const copy = {
          ...provider,
          override: {
            ...(provider.override as Record<string, unknown> | undefined),
            udp: true,
          },
          path: `./providers/${encodeURIComponent(target)}-${encodeURIComponent(name)}.yaml`,
        }
        providers[key] = copy
        return key
      },
    )
    if (connection.proxies.length === 0 && feeds.length === 0) {
      throw new Error(`${connection.name}: нет серверов.`)
    }
    const preferred = workspace.serverDefaults?.[connection.id]
    if (preferred && !renamed.has(preferred))
      throw new Error(
        `${connection.name}: выбранная страна больше недоступна. Выбери другую в разделе «Мои VPN».`,
      )
    const ordered = [...renamed.values()]
    if (preferred)
      ordered.splice(
        0,
        0,
        ...ordered.splice(ordered.indexOf(renamed.get(preferred)!), 1),
      )
    groups.push({
      name: target,
      type: 'select',
      ...(renamed.size ? { proxies: ordered } : {}),
      ...(feeds.length ? { use: feeds } : {}),
    })
  }
  for (const [target, { source, server }] of chosenServers) {
    const ownNode = source.proxies.find((node) => node.name === server)
    groups.push({
      name: target,
      type: 'select',
      ...(ownNode
        ? { proxies: [`${connectionTarget(source.id)}/${server}`] }
        : {
            use: Object.keys(source.providers).map(
              (key) => `${connectionTarget(source.id)}/${key}`,
            ),
            filter: `^${escapeRegex(server)}$`,
          }),
    })
  }
  return {
    mode: 'rule',
    'find-process-mode': 'always',
    'allow-lan': false,
    tun: {
      'auto-route': true,
      'auto-detect-interface': true,
      'route-exclude-address': workspace.preserveTailscale
        ? ['100.64.0.0/10', 'fd7a:115c:a1e0::/48']
        : [],
    },
    dns: {
      enable: true,
      // Programs get placeholder addresses, so a VPN server resolves the real name and the home provider never sees it.
      'enhanced-mode': 'fake-ip',
      'fake-ip-range': '198.18.0.1/16',
      'fake-ip-filter': [
        '+.ts.net',
        '+.local',
        '+.lan',
        '+.home.arpa',
        'localhost',
        '+.localhost',
        'captive.apple.com',
        // Windows reports "No internet" when its connectivity probe gets a placeholder address.
        '+.msftconnecttest.com',
        '+.msftncsi.com',
        'time.apple.com',
        '+.time.apple.com',
      ],
      // With fake-ip the app replaces the Mac's DNS with a placeholder, so 'system' would no longer mean the router.
      'default-nameserver': ['77.88.8.8', '8.8.8.8'],
      nameserver: [
        'https://common.dot.dns.yandex.net/dns-query',
        'https://dns.google/dns-query',
      ],
      ...(workspace.preserveTailscale
        ? {
            'nameserver-policy': { '+.ts.net': '100.100.100.100' },
          }
        : {}),
    },
    proxies,
    'proxy-providers': providers,
    'proxy-groups': groups,
    rules,
    [workspaceKey]: workspace,
  }
}
