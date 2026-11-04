import { PowerSettingsNewRounded } from '@mui/icons-material'
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useEffectEvent, useState } from 'react'
import { getBaseConfig } from 'tauri-plugin-mihomo-api'

import { useRoutingStatus } from '@/hooks/use-routing-status'
import { useRoutingWorkspace } from '@/hooks/use-routing-workspace'
import { useVerge } from '@/hooks/use-verge'
import {
  getRuntimeState,
  installService,
  restartCore,
  stopTailscaleDns,
} from '@/services/cmds'
import { revalidateQuery } from '@/services/query-client'
import { deviceOs, isWindows } from '@/services/routing/platform'

const colors = {
  on: '#2e7d32',
  off: '#c62828',
  checking: '#757575',
  problem: '#ed6c02',
}

async function waitFor(check: () => Promise<boolean>, seconds: number) {
  for (let i = 0; i < seconds * 2; i++) {
    if (await check().catch(() => false)) return true
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

/** TUN needs the privileged service; a Sidecar core accepts the setting but cannot open the tunnel. */
async function ensurePrivilegedCore() {
  let state = await getRuntimeState()
  if (!state.tunCapable) {
    const result = await installService()
    if (result.status !== 'installed')
      throw new Error(
        isWindows
          ? 'Windows не разрешила G Verge управлять подключениями. Нажми кнопку еще раз и ответь «Да» в окне Windows.'
          : 'macOS не разрешила G Verge управлять подключениями. Нажми кнопку еще раз и подтверди запрос macOS паролем.',
      )
    state = await getRuntimeState()
  }
  if (state.mode !== 'Service' && !state.isAdmin) await restartCore()
  const ready = await waitFor(async () => {
    const next = await getRuntimeState()
    return (next.mode === 'Service' || next.isAdmin) && next.tunCapable
  }, 30)
  if (!ready)
    throw new Error(
      'Служба G Verge не запустилась. Перезапусти G Verge и нажми кнопку снова.',
    )
}

export function PowerButton({ compact }: { compact: boolean }) {
  const { verge, patchVerge } = useVerge()
  const { save, dirty, data } = useRoutingWorkspace()
  const status = useRoutingStatus()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const enabled = verge?.enable_tun_mode ?? false

  const turnOn = async () => {
    if (dirty)
      throw new Error(
        'Есть несохраненный выбор. Нажми «Сохранить выбор», затем включи G Verge.',
      )
    if (!data?.sources.length)
      throw new Error('Сначала добавь VPN в разделе «Мои VPN».')
    if (!(await save()))
      throw new Error('Выбор не сохранился. Ошибка показана в «Программах».')
    await ensurePrivilegedCore()
    await patchVerge({ enable_tun_mode: true, enable_system_proxy: false })
    const tunnel = await waitFor(
      async () => (await getBaseConfig()).tun?.enable === true,
      15,
    )
    if (!tunnel)
      throw new Error(
        `${deviceOs} не дала создать подключение. Перезапусти G Verge и включи снова.`,
      )
  }

  const toggle = async () => {
    setBusy(true)
    setError('')
    const wasOn = status.state === 'on'
    try {
      if (wasOn) await patchVerge({ enable_tun_mode: false })
      else await turnOn()
    } catch (failure) {
      // A half-enabled state would show as working while traffic still bypasses G Verge.
      if (!wasOn)
        await patchVerge({ enable_tun_mode: false }).catch(() => undefined)
      setError(
        failure instanceof Error && failure.message
          ? failure.message
          : 'Не удалось переключить G Verge. Повтори через несколько секунд.',
      )
    } finally {
      setBusy(false)
    }
  }

  // Tailscale gets a new device name after a restart; re-saving rebinds the server exit to it.
  const fixDns = async () => {
    setBusy(true)
    setError('')
    try {
      await stopTailscaleDns()
      await revalidateQuery(['personal-routing-status'])
    } catch {
      setError(
        'Не удалось исправить DNS. Открой Tailscale и выключи «Use Tailscale DNS settings».',
      )
    } finally {
      setBusy(false)
    }
  }

  const rebind = useEffectEvent(() => {
    if (!busy && !dirty) void save()
  })
  useEffect(() => {
    if (status.tailscaleMoved) rebind()
  }, [status.tailscaleMoved])

  const state = busy ? 'checking' : status.state
  const color = colors[state]
  const label = busy
    ? enabled
      ? 'Выключаю…'
      : 'Включаю…'
    : status.state === 'on'
      ? 'Выключить G Verge'
      : 'Включить G Verge'

  return (
    <Box sx={{ px: compact ? 1 : 2, pb: 2 }}>
      <Tooltip
        title={compact ? error || `${status.title}. ${label}` : ''}
        placement="right"
      >
        <ButtonBase
          onClick={() => void toggle()}
          disabled={busy}
          aria-label={label}
          sx={{
            width: '100%',
            borderRadius: 3,
            p: compact ? 1 : 1.5,
            gap: 1.5,
            justifyContent: compact ? 'center' : 'flex-start',
            color: '#fff',
            bgcolor: color,
            transition: 'background-color 0.2s, filter 0.2s',
            '&:hover': { filter: 'brightness(1.1)' },
          }}
        >
          {busy ? (
            <CircularProgress size={28} sx={{ color: '#fff' }} />
          ) : (
            <PowerSettingsNewRounded sx={{ fontSize: 28 }} />
          )}
          {!compact && (
            <Box sx={{ textAlign: 'left', minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {busy ? label : status.title}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {busy ? `Может появиться запрос ${deviceOs}` : status.detail}
              </Typography>
            </Box>
          )}
        </ButtonBase>
      </Tooltip>
      {status.dnsLeak && !compact && (
        <Box role="alert" sx={{ mt: 1 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'warning.main' }}
          >
            Tailscale перехватывает DNS: провайдер видит, какие сайты ты
            открываешь.
          </Typography>
          <Button
            size="small"
            color="warning"
            disabled={busy}
            onClick={() => void fixDns()}
          >
            Исправить
          </Button>
        </Box>
      )}
      {error && !compact && (
        <Typography
          variant="caption"
          role="alert"
          sx={{ display: 'block', mt: 1, color: 'error.main' }}
        >
          {error}
        </Typography>
      )}
    </Box>
  )
}
