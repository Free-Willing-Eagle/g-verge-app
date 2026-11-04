import { getBaseConfig } from 'tauri-plugin-mihomo-api'

import { useVerge } from '@/hooks/use-verge'
import {
  getClashMode,
  getProfiles,
  getRuntimeConfig,
  getRuntimeState,
  tailscaleTakesDns,
} from '@/services/cmds'
import { useQuery } from '@/services/query-client'
import { workspaceDescription } from '@/services/routing/model'
import { findTailscaleInterface } from '@/services/routing/workspace'

export type RoutingState = 'off' | 'on' | 'checking' | 'problem'

export function useRoutingStatus() {
  const { verge } = useVerge()
  const requested = verge?.enable_tun_mode ?? false
  const { data, error, isPending } = useQuery({
    queryKey: ['personal-routing-status'],
    enabled: requested,
    queryFn: async () => {
      const [profiles, live, mode, runtime, config, tailscale, dnsLeak] =
        await Promise.all([
          getProfiles(),
          getBaseConfig(),
          getClashMode(),
          getRuntimeState(),
          getRuntimeConfig(),
          findTailscaleInterface().catch(() => null),
          tailscaleTakesDns().catch(() => false),
        ])
      const managed = profiles.items?.find(
        (item) => item.desc === workspaceDescription,
      )
      const proxies = (config as { proxies?: Record<string, unknown>[] } | null)
        ?.proxies
      const bound = (proxies ?? [])
        .map((proxy) => proxy['interface-name'])
        .filter((name): name is string => typeof name === 'string')
      return {
        // The core reports TUN as enabled only after macOS created the tunnel.
        working:
          !!managed?.uid &&
          profiles.current === managed.uid &&
          mode === 'rule' &&
          live.tun?.enable === true &&
          (runtime.mode === 'Service' || runtime.isAdmin),
        tailscaleMoved: !!tailscale && bound.some((name) => name !== tailscale),
        dnsLeak,
      }
    },
    refetchInterval: 3000,
    retry: false,
  })
  if (!requested)
    return {
      state: 'off' as RoutingState,
      title: 'G Verge выключен',
      detail: 'Нажми, чтобы включить',
      tailscaleMoved: false,
      dnsLeak: false,
    }
  if (data?.working && !error)
    return {
      state: 'on' as RoutingState,
      title: 'G Verge включен',
      detail: 'Выбор программ работает',
      tailscaleMoved: data.tailscaleMoved,
      dnsLeak: data.dnsLeak,
    }
  if (isPending)
    return {
      state: 'checking' as RoutingState,
      title: 'Проверяю подключение',
      detail: 'Это займет несколько секунд',
      tailscaleMoved: false,
      dnsLeak: false,
    }
  return {
    state: 'problem' as RoutingState,
    title: 'G Verge не работает',
    detail: 'Нажми кнопку, чтобы включить заново',
    tailscaleMoved: false,
    dnsLeak: false,
  }
}
