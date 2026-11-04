import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { BasePage } from '@/components/base'
import { useRoutingWorkspace } from '@/hooks/use-routing-workspace'
import { openRemoteApplication } from '@/services/cmds'
import { useQuery } from '@/services/query-client'
import {
  addServerExit,
  findTailscaleInterface,
  removeConnection,
} from '@/services/routing/workspace'

export default function PersonalRemotePage() {
  const { data, draft, change, save, busy, error, message, refetch } =
    useRoutingWorkspace()
  const [openError, setOpenError] = useState('')
  const [serverName, setServerName] = useState('Мой VPS')
  const [serverAddress, setServerAddress] = useState('')
  const [serverPort, setServerPort] = useState('1080')
  const [serverBusy, setServerBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const { data: tailscale } = useQuery({
    queryKey: ['tailscale-interface'],
    queryFn: findTailscaleInterface,
    refetchInterval: 5000,
    retry: false,
  })
  const servers = data?.sources.filter((source) => source.viaServer) ?? []
  const addServer = async (event: React.FormEvent) => {
    event.preventDefault()
    setServerError('')
    const [a, b] = serverAddress.trim().split('.').map(Number)
    if (
      !/^\d+\.\d+\.\d+\.\d+$/.test(serverAddress.trim()) ||
      a !== 100 ||
      b < 64 ||
      b > 127
    )
      return setServerError(
        'Укажи адрес сервера из приложения Tailscale. Он начинается со 100.',
      )
    if (!/^\d+$/.test(serverPort) || +serverPort < 1 || +serverPort > 65535)
      return setServerError('Порт должен быть числом от 1 до 65535.')
    if (!serverName.trim() || /[,\r\n]/.test(serverName))
      return setServerError('Укажи название без запятых.')
    setServerBusy(true)
    try {
      await addServerExit(
        serverName.trim(),
        serverAddress.trim(),
        Number(serverPort),
      )
      await refetch()
    } catch {
      setServerError('Не удалось добавить сервер. Повтори через минуту.')
    } finally {
      setServerBusy(false)
    }
  }
  const open = async (app: 'tailscale' | 'windows') => {
    try {
      await openRemoteApplication(app)
    } catch {
      setOpenError(
        'Не удалось открыть приложение. Проверь, установлено ли оно на Mac.',
      )
    }
  }
  return (
    <BasePage
      title="Удаленные компьютеры"
      header={
        <Button variant="contained" onClick={() => void save()} disabled={busy}>
          Сохранить выбор
        </Button>
      }
    >
      <Stack spacing={3} sx={{ maxWidth: 900, mx: 'auto', pb: 4 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {openError && <Alert severity="error">{openError}</Alert>}
        <Box>
          <Typography variant="h6" component="h2">
            Подключение через Tailscale
          </Typography>
          <Typography sx={{ mt: 1, maxWidth: '70ch' }}>
            Tailscale связывает твой Mac с удаленными компьютерами. Для обычного
            доступа к рабочему столу его достаточно оставить включенным.
          </Typography>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => void open('tailscale')}
          >
            Открыть Tailscale
          </Button>
        </Box>
        <Box>
          <Typography variant="h6" component="h2">
            Рабочий стол другого компьютера
          </Typography>
          <Typography sx={{ mt: 1, maxWidth: '70ch' }}>
            Windows App показывает экран удаленного компьютера и позволяет
            работать на нем. Сначала подключи Tailscale, затем открой нужный
            компьютер в Windows App.
          </Typography>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => void open('windows')}
          >
            Открыть Windows App
          </Button>
        </Box>
        <Divider />
        <Box component="section">
          <Typography variant="h6" component="h2">
            Интернет через мой сервер
          </Typography>
          <Typography sx={{ mt: 1, maxWidth: '70ch' }}>
            Выбранные программы выходят в интернет с адреса твоего сервера.
            Связь с сервером идет по Tailscale, поэтому Tailscale на Mac должен
            быть подключен.
          </Typography>
          {tailscale === null && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Tailscale на Mac сейчас не подключен. Программы, выбранные для
              сервера, не смогут выйти в интернет.
            </Alert>
          )}
          {serverError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {serverError}
            </Alert>
          )}
          {servers.map((server) => (
            <Stack
              key={server.uid}
              direction="row"
              spacing={2}
              sx={{ alignItems: 'center', mt: 2 }}
            >
              <Typography sx={{ flex: 1, fontWeight: 600 }}>
                {server.name}
              </Typography>
              <Button
                color="error"
                disabled={serverBusy || busy}
                onClick={async () => {
                  setServerError('')
                  try {
                    await removeConnection(server.uid!, draft!)
                    await refetch()
                  } catch (failure) {
                    setServerError(
                      failure instanceof Error
                        ? failure.message
                        : 'Не удалось удалить сервер.',
                    )
                  }
                }}
              >
                Удалить
              </Button>
            </Stack>
          ))}
          {servers.length > 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Сервер можно выбрать для любой программы на экране «Программы».
            </Typography>
          ) : (
            <Stack
              component="form"
              onSubmit={addServer}
              spacing={2}
              sx={{ mt: 2, maxWidth: 440 }}
            >
              <TextField
                label="Название"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                required
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Адрес сервера в Tailscale"
                  value={serverAddress}
                  placeholder="100.101.102.103"
                  onChange={(e) => setServerAddress(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Порт"
                  value={serverPort}
                  onChange={(e) => setServerPort(e.target.value)}
                  required
                  sx={{ width: 110 }}
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
              </Stack>
              <Button
                type="submit"
                variant="outlined"
                disabled={serverBusy || !draft}
              >
                {serverBusy ? 'Добавляю…' : 'Добавить сервер'}
              </Button>
            </Stack>
          )}
        </Box>
        <Divider />
        <Box>
          <FormControlLabel
            label="Сохранять отдельный доступ к компьютерам Tailscale"
            control={
              <Switch
                checked={draft?.preserveTailscale ?? true}
                disabled={!draft || busy}
                onChange={(e) =>
                  change({ preserveTailscale: e.target.checked })
                }
              />
            }
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: '70ch' }}
          >
            Оставь включенным, чтобы выбор VPN для программ не перехватывал
            адреса твоих удаленных компьютеров. Само приложение Tailscale тоже
            должно быть подключено.
          </Typography>
        </Box>
        <Alert severity="info">
          Если программа работает внутри удаленного рабочего стола, она
          использует интернет того компьютера. Выбранный VPN на Mac меняет
          только подключения программ, запущенных на Mac.
        </Alert>
      </Stack>
    </BasePage>
  )
}
