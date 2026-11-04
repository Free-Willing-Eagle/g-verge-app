import { MenuItem, Stack, TextField } from '@mui/material'

import { connectionTarget, serverTarget } from '@/services/routing/model'

export type VisibleSource = {
  uid: string | null
  name: string | null
  nodes?: string[]
  viaServer?: boolean
}

export function RouteChoice({
  label,
  value,
  onChange,
  sources,
  inherit = false,
  allowBlock = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  sources: VisibleSource[]
  inherit?: boolean
  allowBlock?: boolean
}) {
  const selected = sources.find(
    (source) =>
      source.uid &&
      (value === connectionTarget(source.uid) ||
        value.startsWith(`${connectionTarget(source.uid)}/node/`)),
  )
  const primary = selected?.uid ? connectionTarget(selected.uid) : value
  const choices = [
    ...(inherit ? [{ value: 'DEFAULT', name: 'Как остальные программы' }] : []),
    { value: 'DIRECT', name: 'Без VPN' },
    ...(allowBlock ? [{ value: 'REJECT', name: 'Без интернета' }] : []),
    ...sources.map((source) => ({
      value: connectionTarget(source.uid!),
      name: source.viaServer
        ? `${source.name ?? 'Мой сервер'} (Tailscale)`
        : (source.name ?? 'Мое подключение'),
    })),
  ]
  const nodes = selected?.nodes ?? []
  return (
    <Stack spacing={1}>
      <TextField
        select
        fullWidth
        size="small"
        label={label}
        value={primary}
        onChange={(e) => onChange(e.target.value)}
      >
        {!choices.some((item) => item.value === primary) && (
          <MenuItem value={primary} disabled>
            {value === 'REJECT'
              ? 'Интернет заблокирован в старых настройках'
              : 'VPN больше недоступен'}
          </MenuItem>
        )}
        {choices.map((item) => (
          <MenuItem key={item.value} value={item.value}>
            {item.name}
          </MenuItem>
        ))}
      </TextField>
      {selected?.uid && nodes.length > 1 && (
        <TextField
          select
          fullWidth
          size="small"
          label="Страна и подключение"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <MenuItem value={connectionTarget(selected.uid)}>
            Как выбрано в «Мои VPN»
          </MenuItem>
          {value !== connectionTarget(selected.uid) &&
            !nodes.some(
              (name) => serverTarget(selected.uid!, name) === value,
            ) && (
              <MenuItem value={value} disabled>
                Прежнее подключение недоступно
              </MenuItem>
            )}
          {nodes.map((name) => (
            <MenuItem key={name} value={serverTarget(selected.uid!, name)}>
              {name}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  )
}
