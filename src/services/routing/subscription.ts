import { fetch } from '@tauri-apps/plugin-http'
import { load } from 'js-yaml'

import parseUri from '@/utils/uri-parser'

export const subscriptionKey = 'x-personal-subscription'

/** Messages meant for the user; transport errors are replaced because they can contain the private URL. */
class SubscriptionError extends Error {}

const uriScheme =
  /^(?:vless|vmess|ss|ssr|trojan|hysteria2?|hy2?|tuic|anytls|socks5?|wireguard|wg|https?):\/\//i

export function parseSubscription(text: string): Record<string, unknown> {
  const raw = text.trim().replace(/^\uFEFF/, '')
  let yaml: unknown
  try {
    yaml = load(raw)
  } catch {
    /* URI lists are not YAML documents. */
  }
  if (yaml && typeof yaml === 'object' && !Array.isArray(yaml)) {
    const config = yaml as Record<string, unknown>
    if (Array.isArray(config.proxies) || config['proxy-providers'])
      return config
  }
  // Happ subscriptions start with '#profile-title:' style metadata lines.
  const lines = (text: string) =>
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  let links = raw
  if (!lines(raw).some((line) => uriScheme.test(line))) {
    try {
      links = new TextDecoder().decode(
        Uint8Array.from(
          atob(lines(raw).join('').replace(/-/g, '+').replace(/_/g, '/')),
          (char) => char.charCodeAt(0),
        ),
      )
    } catch {
      throw new SubscriptionError(
        'Ссылка не содержит подключений VPN. Попроси у сервиса ссылку подписки для Happ или Clash.',
      )
    }
  }
  const entries = lines(links)
  if (entries.length === 0)
    throw new SubscriptionError('В подписке пока нет доступных подключений.')
  // One unsupported server must not hide the countries that do work.
  const proxies = entries.flatMap((line) => {
    try {
      return [parseUri(line)]
    } catch {
      return []
    }
  })
  if (proxies.length === 0)
    throw new SubscriptionError(
      'G Verge пока не поддерживает подключения из этой подписки. Попроси у сервиса ссылку для Clash.',
    )
  return { proxies }
}

export async function downloadSubscription(link: string, depth = 0) {
  try {
    const url = new URL(link)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    const response = await fetch(url.href, {
      method: 'GET',
      connectTimeout: 15000,
      headers: { 'User-Agent': 'clash-verge' },
    })
    if (!response.ok) throw new Error()
    return await expandProviders(
      parseSubscription(await response.text()),
      depth,
    )
  } catch (error) {
    if (error instanceof SubscriptionError) throw error
    // eslint-disable-next-line preserve-caught-error -- Transport errors can contain the private subscription URL.
    throw new Error(
      'Не удалось загрузить VPN. Проверь интернет и скопируй ссылку подписки заново из кабинета сервиса.',
    )
  }
}

async function expandProviders(
  config: Record<string, unknown>,
  depth: number,
): Promise<Record<string, unknown>> {
  const feeds = config['proxy-providers'] as
    | Record<string, Record<string, unknown>>
    | undefined
  if (!feeds) return config
  if (depth >= 3)
    throw new SubscriptionError(
      'В этой подписке слишком много вложенных списков. Попроси у сервиса обычную ссылку для Happ или Clash.',
    )
  const proxies = [...((config.proxies ?? []) as Record<string, unknown>[])]
  for (const [name, feed] of Object.entries(feeds)) {
    let nodes: Record<string, unknown>[]
    if (feed.type === 'inline' && Array.isArray(feed.payload))
      nodes = feed.payload
    else if (feed.type === 'http' && typeof feed.url === 'string') {
      const nested = await downloadSubscription(feed.url, depth + 1)
      nodes = (nested.proxies ?? []) as Record<string, unknown>[]
    } else
      throw new SubscriptionError(
        'Для этой подписки нужна другая ссылка. Попроси у VPN-сервиса обычную ссылку для Happ или Clash.',
      )
    const override =
      feed.override && typeof feed.override === 'object'
        ? (feed.override as Record<string, unknown>)
        : {}
    for (const node of nodes)
      proxies.push({
        ...node,
        ...override,
        name: `${name} · ${String(node.name)}`,
      })
  }
  const result: Record<string, unknown> = { ...config, proxies }
  delete result['proxy-providers']
  return result
}

const amneziaKeys = ['jc', 'jmin', 'jmax', 's1', 's2', 'h1', 'h2', 'h3', 'h4']

/** Reads a WireGuard or AmneziaWG .conf file, the format VPN services hand out instead of a link. */
export function parseWireGuard(text: string): Record<string, unknown> {
  const sections: Record<string, Record<string, string>[]> = {}
  let current: Record<string, string> | null = null
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.replace(/[#;].*$/, '').trim()
    if (!line) continue
    const header = /^\[(\w+)\]$/.exec(line)
    if (header) {
      current = {}
      ;(sections[header[1].toLowerCase()] ??= []).push(current)
      continue
    }
    const pair = /^(\w+)\s*=\s*(.+)$/.exec(line)
    if (pair && current) current[pair[1].toLowerCase()] = pair[2].trim()
  }
  const own = sections.interface?.[0]
  const peer = sections.peer?.[0]
  const endpoint = /^\[?([^\]]+?)\]?:(\d+)$/.exec(peer?.endpoint ?? '')
  if (!own?.privatekey || !peer?.publickey || !endpoint || !own.address)
    throw new SubscriptionError(
      'Это не файл WireGuard. Скачай в кабинете VPN-сервиса файл настроек WireGuard (.conf).',
    )
  const list = (value = '') =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  const addresses = list(own.address).map((item) => item.replace(/\/\d+$/, ''))
  const dns = list(own.dns)
  const amnezia = Object.fromEntries(
    amneziaKeys
      .filter((key) => own[key] !== undefined)
      .map((key) => [key, Number(own[key])]),
  )
  return {
    name: 'WireGuard',
    type: 'wireguard',
    server: endpoint[1],
    port: Number(endpoint[2]),
    ip: addresses.find((item) => !item.includes(':')),
    ipv6: addresses.find((item) => item.includes(':')),
    'private-key': own.privatekey,
    'public-key': peer.publickey,
    ...(peer.presharedkey ? { 'pre-shared-key': peer.presharedkey } : {}),
    'allowed-ips': list(peer.allowedips).length
      ? list(peer.allowedips)
      : ['0.0.0.0/0', '::/0'],
    ...(own.mtu ? { mtu: Number(own.mtu) } : {}),
    ...(peer.persistentkeepalive
      ? { 'persistent-keepalive': Number(peer.persistentkeepalive) }
      : {}),
    udp: true,
    // Site names are then looked up inside the tunnel, not by the local provider.
    ...(dns.length ? { dns, 'remote-dns-resolve': true } : {}),
    ...(Object.keys(amnezia).length ? { 'amnezia-wg-option': amnezia } : {}),
  }
}
