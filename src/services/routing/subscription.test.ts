import { describe, expect, it, vi } from 'vitest'

const remote = vi.hoisted(() => vi.fn())
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: remote }))

import {
  downloadSubscription,
  parseSubscription,
  parseWireGuard,
} from './subscription'

describe('VPN subscription import', () => {
  it('accepts an ordinary Clash subscription', () => {
    const result = parseSubscription(
      'proxies:\n  - name: London\n    type: socks5\n    server: 127.0.0.1\n    port: 1080\n',
    )
    expect(result.proxies).toHaveLength(1)
  })
  it('decodes a subscription of links locally and preserves country names', () => {
    const text =
      'socks5://127.0.0.1:1080#London\nsocks5://127.0.0.1:1081#Berlin'
    const result = parseSubscription(btoa(text))
    expect(
      (result.proxies as { name: string }[]).map((node) => node.name),
    ).toEqual(['London', 'Berlin'])
  })
  it('skips Happ metadata and unsupported lines instead of failing', () => {
    const result = parseSubscription(
      '#profile-title: base64:UGFwZXI=\nsocks5://127.0.0.1:1080#London\nvless://broken',
    )
    expect(
      (result.proxies as { name: string }[]).map((node) => node.name),
    ).toEqual(['London'])
  })
  it('reads a WireGuard file with AmneziaWG settings and the tunnel DNS', () => {
    const node = parseWireGuard(
      '[Interface]\nPrivateKey = cHJpdmF0ZQ==\nAddress = 10.0.0.2/32, fd00::2/128\nDNS = 10.255.255.1\nJc = 4\nJmin = 40\n\n[Peer]\nPublicKey = cHVibGlj\nPresharedKey = cHNr\nAllowedIPs = 0.0.0.0/0, ::/0\nEndpoint = [2001:db8::1]:51820\n',
    )
    expect(node).toMatchObject({
      type: 'wireguard',
      server: '2001:db8::1',
      port: 51820,
      ip: '10.0.0.2',
      ipv6: 'fd00::2',
      'private-key': 'cHJpdmF0ZQ==',
      'pre-shared-key': 'cHNr',
      dns: ['10.255.255.1'],
      'remote-dns-resolve': true,
      'amnezia-wg-option': { jc: 4, jmin: 40 },
    })
    expect(() => parseWireGuard('[Interface]\nAddress = 10.0.0.2/32')).toThrow(
      'WireGuard',
    )
  })
  it('rejects a service error page without exposing its contents', () => {
    const sensitive = 'private-access-value'
    expect(() => parseSubscription(`<html>${sensitive}</html>`)).toThrow(
      'Ссылка не содержит',
    )
    try {
      parseSubscription(`<html>${sensitive}</html>`)
    } catch (error) {
      expect(String(error)).not.toContain(sensitive)
    }
  })
  it('shows countries from inline provider subscriptions in the normal interface', async () => {
    remote.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          'proxy-providers': {
            countries: {
              type: 'inline',
              payload: [
                {
                  name: 'London',
                  type: 'socks5',
                  server: '127.0.0.1',
                  port: 1080,
                },
              ],
            },
          },
        }),
    })
    const result = await downloadSubscription(
      'https://example.com/subscription',
    )
    expect(
      (result.proxies as { name: string }[]).map((item) => item.name),
    ).toEqual(['countries · London'])
    expect(result['proxy-providers']).toBeUndefined()
  })
  it('loads provider countries locally instead of sending the user to technical settings', async () => {
    remote.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          'proxy-providers': {
            countries: { type: 'http', url: 'https://example.com/countries' },
          },
        }),
    })
    remote.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          proxies: [
            { name: 'Berlin', type: 'socks5', server: '127.0.0.1', port: 1080 },
          ],
        }),
    })
    const result = await downloadSubscription(
      'https://example.com/subscription',
    )
    expect(
      (result.proxies as { name: string }[]).map((item) => item.name),
    ).toEqual(['countries · Berlin'])
  })
})
