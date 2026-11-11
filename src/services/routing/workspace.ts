import { open } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'
import { dump, load } from 'js-yaml'
import {
  closeAllConnections,
  selectNodeForGroup,
} from 'tauri-plugin-mihomo-api'

import {
  createProfile,
  deleteProfile,
  getNetworkInterfacesInfo,
  getProfiles,
  patchProfilesConfig,
  patchClashMode,
  readProfileFile,
  saveProfileFile,
} from '@/services/cmds'
import { mutate } from '@/services/mutate'
import parseUri from '@/utils/uri-parser'

import {
  compileWorkspace,
  emptyWorkspace,
  readConnection,
  targetSource,
  workspaceDescription,
  workspaceKey,
  type Workspace,
} from './model'
import { isWindows } from './platform'
import {
  downloadSubscription,
  parseWireGuard,
  subscriptionKey,
} from './subscription'

export const serverExitDescription = 'g-verge:tailscale-exit'

const inTailscaleRange = (ip: string) => {
  const [a, b] = ip.split('.').map(Number)
  return a === 100 && b >= 64 && b <= 127
}

/** macOS numbers utun devices at connect time, so the name is looked up on every save. */
export async function findTailscaleInterface() {
  const interfaces = await getNetworkInterfacesInfo()
  return (
    interfaces.find((item) =>
      item.addr.some((addr) => !!addr.V4 && inTailscaleRange(addr.V4.ip)),
    )?.name ?? null
  )
}

function parseProfile(content: string): Record<string, unknown> {
  let value: unknown
  try {
    value = load(content)
  } catch {
    throw new Error(
      'Не удалось прочитать профиль. Проверь формат YAML в разделе подписок.',
    )
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Нужен профиль в формате Clash/Mihomo.')
  }
  return value as Record<string, unknown>
}

export async function loadWorkspace() {
  const profiles = await getProfiles()
  const managed = profiles.items?.find(
    (item) => item.desc === workspaceDescription,
  )
  const config = managed?.uid
    ? parseProfile(await readProfileFile(managed.uid))
    : null
  const workspace = config?.[workspaceKey] as Workspace | undefined
  if (workspace && workspace.version !== 1)
    throw new Error('Версия правил не поддерживается.')
  return {
    workspace: workspace ?? emptyWorkspace(),
    managedUid: managed?.uid ?? null,
    currentUid: profiles.current,
    sources: await Promise.all(
      (profiles.items ?? [])
        .filter(
          (item) =>
            item.uid &&
            ['remote', 'local'].includes(item.type ?? '') &&
            item.desc !== workspaceDescription,
        )
        .map(async (item) => {
          const viaServer = item.desc === serverExitDescription
          try {
            const content = parseProfile(await readProfileFile(item.uid!))
            return {
              uid: item.uid,
              name: item.name,
              viaServer,
              nodes: Array.isArray(content.proxies)
                ? content.proxies.map((node: Record<string, unknown>) =>
                    String(node.name),
                  )
                : [],
              subscription: !!content[subscriptionKey],
              problem: false,
            }
          } catch {
            return {
              uid: item.uid,
              name: item.name,
              viaServer,
              nodes: [],
              subscription: false,
              problem: true,
            }
          }
        }),
    ),
  }
}

export async function applyWorkspace(workspace: Workspace) {
  return mutate(
    async () => {
      const before = await getProfiles()
      const sources = before.items ?? []
      const tailscale = await findTailscaleInterface()
      const connections = await Promise.all(
        workspace.sourceIds.map(async (id) => {
          const item = sources.find((source) => source.uid === id)
          if (!item)
            throw new Error(
              'Одно из подключений удалено. Выбери доступные подключения.',
            )
          const connection = readConnection(
            id,
            item.name ?? 'Подключение',
            parseProfile(await readProfileFile(id)),
          )
          if (item.desc !== serverExitDescription) return connection
          const used = [
            workspace.defaultTarget,
            ...workspace.routes
              .filter((route) => route.enabled)
              .map((route) => route.target),
            ...Object.values(workspace.chains ?? {}),
          ].some((target) => targetSource(target) === id)
          if (used && !tailscale)
            throw new Error(
              `${connection.name}: Tailscale на этом компьютере не подключен. Включи Tailscale и сохрани выбор заново.`,
            )
          return { ...connection, bindInterface: tailscale ?? undefined }
        }),
      )
      const config = compileWorkspace(workspace, connections)
      const content = dump(config, { noRefs: true, lineWidth: -1 })
      let managed = sources.find((item) => item.desc === workspaceDescription)
      if (managed?.uid) {
        if (!(await saveProfileFile(managed.uid, content))) {
          throw new Error(
            'Движок не принял правила. Прежняя конфигурация сохранена.',
          )
        }
      } else {
        await createProfile(
          {
            type: 'local',
            name: 'Мои подключения',
            desc: workspaceDescription,
          },
          content,
        )
        const after = await getProfiles()
        managed = after.items?.find(
          (item) => item.desc === workspaceDescription,
        )
      }
      if (!managed?.uid)
        throw new Error('Не удалось создать профиль. Повтори применение.')
      const outcome = await patchProfilesConfig({ current: managed.uid })
      if (outcome.status !== 'valid') {
        throw new Error(
          'Правила сохранены, но не включены. Проверь профиль в разделе подписок.',
        )
      }
      await patchClashMode('rule')
      for (const [sourceId, server] of Object.entries(
        workspace.serverDefaults ?? {},
      )) {
        if (!workspace.sourceIds.includes(sourceId)) continue
        await selectNodeForGroup(
          `connection-${sourceId}`,
          `connection-${sourceId}/${server}`,
        )
      }
      // Open connections keep their old route; programs reconnect through the new one.
      await closeAllConnections().catch(() => undefined)
      return managed.uid
    },
    {
      id: 'personal-routing-workspace',
      errorNotice: false,
      revalidate: [
        ['getProfiles'],
        ['personal-routing-workspace'],
        ['getRuntimeConfig'],
        ['personal-routing-status'],
      ],
    },
  )
}

export async function addTunnel(name: string, proxy: Record<string, unknown>) {
  return mutate(
    () =>
      createProfile(
        {
          type: 'local',
          name,
          desc: `g-verge:connection:${String(proxy.type)}`,
        },
        dump({ proxies: [{ ...proxy, name }], rules: ['MATCH,DIRECT'] }),
      ),
    {
      id: 'personal-routing-workspace',
      errorNotice: false,
      revalidate: [['getProfiles'], ['personal-routing-workspace']],
    },
  )
}

export async function addServerExit(name: string, host: string, port: number) {
  return mutate(
    () =>
      createProfile(
        { type: 'local', name, desc: serverExitDescription },
        dump({
          proxies: [{ name, type: 'socks5', server: host, port, udp: true }],
          rules: ['MATCH,DIRECT'],
        }),
      ),
    {
      id: 'personal-routing-workspace',
      errorNotice: false,
      revalidate: [['getProfiles'], ['personal-routing-workspace']],
    },
  )
}

export async function removeConnection(uid: string, workspace: Workspace) {
  const used = [
    workspace.defaultTarget,
    ...workspace.routes.map((route) => route.target),
  ].some((target) => targetSource(target) === uid)
  if (used)
    throw new Error(
      'Это подключение выбрано для программ или сайтов. Сначала выбери для них другое и сохрани выбор.',
    )
  if (
    Object.values(workspace.chains ?? {}).some(
      (via) => targetSource(via) === uid,
    )
  )
    throw new Error(
      'Через это подключение работает другой VPN. Сначала выбери для него «Напрямую» и сохрани выбор.',
    )
  return mutate(() => deleteProfile(uid), {
    id: 'personal-routing-workspace',
    errorNotice: false,
    revalidate: [['getProfiles'], ['personal-routing-workspace']],
  })
}

export async function chooseApplication() {
  const selection = await open({
    title: isWindows ? 'Выбери файл программы' : 'Выбери приложение Mac',
    defaultPath: isWindows ? 'C:\\Program Files' : '/Applications',
    multiple: false,
    directory: false,
    filters: [{ name: 'Программы', extensions: [isWindows ? 'exe' : 'app'] }],
  })
  return typeof selection === 'string' ? selection : null
}

/** VPN services that hand out WireGuard give a .conf file instead of a link. */
export async function chooseWireGuardFile() {
  const selection = await open({
    title: 'Выбери файл WireGuard',
    multiple: false,
    directory: false,
    filters: [{ name: 'WireGuard', extensions: ['conf'] }],
  })
  if (typeof selection !== 'string') return null
  return {
    name: selection
      .split(/[/\\]/)
      .pop()!
      .replace(/\.conf$/i, ''),
    text: new TextDecoder().decode(await readFile(selection)),
  }
}

export async function importPersonalVpn(name: string, link: string) {
  const value = link.trim()
  if (!name.trim())
    throw new Error('Укажи название, чтобы отличать этот VPN от остальных.')
  return mutate(
    async () => {
      const existing = await getProfiles()
      if (
        existing.items?.some(
          (item) =>
            item.name?.trim().toLowerCase() === name.trim().toLowerCase(),
        )
      )
        throw new Error(
          'VPN с таким названием уже добавлен. Обнови его в списке или укажи другое название.',
        )
      const config = /^https?:\/\//i.test(value)
        ? await downloadSubscription(value)
        : /^\s*\[interface\]/im.test(value)
          ? { proxies: [{ ...parseWireGuard(value), name: name.trim() }] }
          : { proxies: [parseUri(value)] }
      readConnection('new', name, config)
      await createProfile(
        { type: 'local', name: name.trim(), desc: 'g-verge:vpn' },
        dump(
          {
            ...config,
            ...(/^https?:\/\//i.test(value)
              ? { [subscriptionKey]: { url: value } }
              : {}),
            rules: ['MATCH,DIRECT'],
          },
          { noRefs: true, lineWidth: -1 },
        ),
      )
    },
    {
      id: 'personal-routing-workspace',
      errorNotice: false,
      revalidate: [['getProfiles'], ['personal-routing-workspace']],
    },
  )
}

export async function refreshPersonalVpn(uid: string) {
  return mutate(
    async () => {
      const old = parseProfile(await readProfileFile(uid))
      const source = old[subscriptionKey] as { url?: string } | undefined
      if (!source?.url)
        throw new Error('У этого подключения нет ссылки для обновления.')
      const config = await downloadSubscription(source.url)
      readConnection(uid, 'VPN', config)
      if (
        !(await saveProfileFile(
          uid,
          dump(
            { ...config, [subscriptionKey]: source, rules: ['MATCH,DIRECT'] },
            { noRefs: true, lineWidth: -1 },
          ),
        ))
      ) {
        throw new Error(
          'Не удалось обновить VPN. Прежний список стран сохранен.',
        )
      }
    },
    {
      id: 'personal-routing-workspace',
      errorNotice: false,
      revalidate: [['getProfiles'], ['personal-routing-workspace']],
    },
  )
}
