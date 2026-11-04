import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import { useState } from 'react'

import { addTunnel } from '@/services/routing/workspace'
import { normalizeHost } from '@/utils/network'

type Props = { onClose: () => void; onAdded: () => void }

export function TunnelForm({ onClose, onAdded }: Props) {
  const [type, setType] = useState('ssh')
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('22')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [keyPath, setKeyPath] = useState('')
  const [hostKey, setHostKey] = useState('')
  const [exitNode, setExitNode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!name.trim() || /[,\r\n]/.test(name))
      return setError('Укажи имя без запятых и переносов строк.')
    if (
      type !== 'tailscale' &&
      (!normalizeHost(host) ||
        !/^\d+$/.test(port) ||
        Number(port) < 1 ||
        Number(port) > 65535)
    ) {
      return setError('Проверь адрес сервера и порт от 1 до 65535.')
    }
    if (
      type === 'ssh' &&
      (!username.trim() || !hostKey.trim() || !keyPath.trim())
    ) {
      return setError(
        'Для SSH нужны имя пользователя, путь к ключу и ключ сервера.',
      )
    }
    setBusy(true)
    try {
      const proxy: Record<string, unknown> =
        type === 'tailscale'
          ? {
              type,
              hostname: 'personal-routing',
              'state-dir': `./tailscale/${crypto.randomUUID()}`,
              ...(exitNode.trim() ? { 'exit-node': exitNode.trim() } : {}),
            }
          : {
              type,
              server: normalizeHost(host),
              port: Number(port),
              ...(username.trim() ? { username: username.trim() } : {}),
              ...(password ? { password } : {}),
              ...(type === 'ssh'
                ? {
                    'private-key': keyPath.trim(),
                    'host-key': [hostKey.trim()],
                  }
                : {}),
            }
      await addTunnel(name.trim(), proxy)
      onAdded()
      onClose()
    } catch {
      setError('Не удалось сохранить подключение. Проверь параметры и повтори.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>Подключить свой сервер</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              select
              label="Способ подключения"
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                setPort(e.target.value === 'ssh' ? '22' : '1080')
              }}
            >
              <MenuItem value="socks5">SOCKS5-прокси</MenuItem>
              <MenuItem value="http">HTTP-прокси</MenuItem>
              <MenuItem value="ssh">SSH-туннель</MenuItem>
              <MenuItem value="tailscale">
                Отдельное подключение Tailscale
              </MenuItem>
            </TextField>
            <TextField
              required
              label="Как назвать этот сервер"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {type === 'tailscale' ? (
              <>
                <Alert severity="info">
                  Для доступа к существующим устройствам обычно достаточно
                  Tailscale на Mac. Здесь создается отдельное устройство в твоей
                  сети. Вход потребуется при первом использовании; ссылка
                  появится в журнале движка.
                </Alert>
                <TextField
                  label="Выходной узел, если нужен интернет через Tailscale"
                  placeholder="100.x.x.x"
                  value={exitNode}
                  onChange={(e) => setExitNode(e.target.value)}
                  helperText="Без выходного узла доступны только адреса частной сети."
                />
              </>
            ) : (
              <>
                <Stack direction="row" spacing={2}>
                  <TextField
                    required
                    label="Адрес твоего сервера"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    required
                    label="Порт"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    sx={{ width: 110 }}
                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                  />
                </Stack>
                <TextField
                  label="Пользователь на сервере"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={type === 'ssh'}
                  autoComplete="off"
                />
                {type !== 'ssh' && (
                  <TextField
                    label="Пароль, если требуется"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    helperText="Пароль сохранится в локальном профиле приложения."
                  />
                )}
                {type === 'ssh' && (
                  <>
                    <TextField
                      required
                      label="Путь к закрытому ключу на Mac"
                      value={keyPath}
                      onChange={(e) => setKeyPath(e.target.value)}
                      helperText="Укажи путь к существующему ключу. Содержимое ключа вводить не нужно."
                    />
                    <TextField
                      required
                      label="Открытый ключ SSH-сервера"
                      value={hostKey}
                      onChange={(e) => setHostKey(e.target.value)}
                      helperText="Например, ssh-ed25519 AAAA... Проверь ключ по доверенному источнику."
                    />
                    <Alert severity="info">
                      Это туннель для интернет-запросов. Удаленный рабочий стол
                      остается в Windows App. SSH передает TCP; поддержку
                      нужного протокола нужно проверить.
                    </Alert>
                  </>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Сохраняю…' : 'Добавить'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
