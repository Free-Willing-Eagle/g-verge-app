import { AddRounded, RefreshRounded } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { BasePage } from '@/components/base'
import { TunnelForm } from '@/components/routing/tunnel-form'
import { useRoutingWorkspace } from '@/hooks/use-routing-workspace'
import {
  importPersonalVpn,
  refreshPersonalVpn,
  removeConnection,
} from '@/services/routing/workspace'

export default function PersonalConnectionsPage() {
  const {
    data,
    draft,
    busy,
    dirty,
    save,
    change,
    refetch,
    error: saveError,
    loadError,
    isPending,
  } = useRoutingWorkspace()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [serverOpen, setServerOpen] = useState(false)
  const vpns = data?.sources.filter((source) => !source.viaServer)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      await importPersonalVpn(name, link)
      await refetch()
      setAdding(false)
      setLink('')
      setName('')
      setMessage('VPN добавлен. Теперь его можно выбрать для любой программы.')
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось добавить VPN. Проверь ссылку и повтори.',
      )
    } finally {
      setWorking(false)
    }
  }
  return (
    <BasePage
      title="Мои VPN"
      header={
        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={() => {
            setError('')
            setAdding(true)
          }}
        >
          Добавить VPN
        </Button>
      }
    >
      <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto', pb: 4 }}>
        <Typography>
          Здесь хранятся твои VPN. У каждого можно выбрать страну, а затем
          использовать его для нужных программ.
        </Typography>
        {saveError && <Alert severity="error">{saveError}</Alert>}
        {error && !adding && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {dirty && (
          <Alert
            severity="info"
            action={
              <Button disabled={busy} onClick={() => void save()}>
                Сохранить выбор
              </Button>
            }
          >
            Страна или подключения изменены. Сохрани выбор, чтобы программы
            начали его использовать.
          </Alert>
        )}
        {isPending && <Typography>Загружаю твои VPN…</Typography>}
        {loadError && (
          <Alert
            severity="error"
            action={<Button onClick={() => void refetch()}>Повторить</Button>}
          >
            Не удалось загрузить VPN. Проверь, запущено ли G Verge, и повтори.
          </Alert>
        )}
        {vpns && !vpns.length && (
          <Box sx={{ py: 4 }}>
            <Typography variant="h6" component="h2">
              Добавь свой VPN-сервис
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              Скопируй ссылку подписки в своем VPN-сервисе и вставь ее сюда.
              Настройки вручную вводить не нужно.
            </Typography>
            <Button variant="outlined" onClick={() => setAdding(true)}>
              Вставить ссылку на VPN
            </Button>
          </Box>
        )}
        {vpns?.map((source) => (
          <Box
            key={source.uid}
            component="section"
            sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
                {source.name}
              </Typography>
              {source.subscription && (
                <Button
                  disabled={working}
                  startIcon={<RefreshRounded />}
                  onClick={async () => {
                    setWorking(true)
                    setError('')
                    try {
                      await refreshPersonalVpn(source.uid!)
                      await refetch()
                      // Programs keep the old servers until the rules are rebuilt.
                      const applied = !dirty && (await save())
                      setMessage(
                        applied
                          ? `Список стран для ${source.name} обновлен и уже применен.`
                          : `Список стран для ${source.name} обновлен. Сохрани выбор на экране «Программы», чтобы использовать изменения.`,
                      )
                    } catch (failure) {
                      setError(
                        failure instanceof Error
                          ? failure.message
                          : 'Не удалось обновить VPN. Повтори позже.',
                      )
                    } finally {
                      setWorking(false)
                    }
                  }}
                >
                  Обновить страны
                </Button>
              )}
              <Button
                color="error"
                disabled={working || busy || !draft}
                onClick={async () => {
                  setError('')
                  setMessage('')
                  try {
                    await removeConnection(source.uid!, draft!)
                    await refetch()
                    setMessage(`${source.name} удален.`)
                  } catch (failure) {
                    setError(
                      failure instanceof Error
                        ? failure.message
                        : 'Не удалось удалить VPN.',
                    )
                  }
                }}
              >
                Удалить
              </Button>
            </Stack>
            {source.problem ? (
              <Alert severity="error">
                Не удалось прочитать это подключение. Добавь ссылку VPN заново.
              </Alert>
            ) : source.nodes.length > 0 ? (
              <Stack spacing={1} sx={{ mt: 2, maxWidth: 440 }}>
                <TextField
                  select
                  label="Страна для этого VPN"
                  value={
                    draft?.serverDefaults?.[source.uid!] ?? source.nodes[0]
                  }
                  disabled={busy}
                  onChange={(event) => {
                    const serverDefaults = {
                      ...draft?.serverDefaults,
                      [source.uid!]: event.target.value,
                    }
                    change({ serverDefaults })
                  }}
                >
                  {source.nodes.map((node) => (
                    <MenuItem key={node} value={node}>
                      {node}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography variant="body2" color="text.secondary">
                  На экране «Программы» можно выбрать другую страну отдельно для
                  каждой программы.
                </Typography>
              </Stack>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Это подключение добавлено в старом формате. Добавь VPN заново по
                ссылке, чтобы выбирать страны в простом интерфейсе.
              </Typography>
            )}
          </Box>
        ))}
        {!!vpns?.length && (
          <Button variant="outlined" onClick={() => navigate('/')}>
            Выбрать VPN для программ
          </Button>
        )}
        <Divider />
        <Box component="details">
          <Typography
            component="summary"
            sx={{ cursor: 'pointer', fontWeight: 600, py: 1 }}
          >
            У меня свой сервер для выхода в интернет
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ my: 2, maxWidth: '70ch' }}
          >
            Сервер в твоей сети Tailscale проще добавить в разделе «Удаленные
            компьютеры». Здесь вводятся данные другого сервера: SOCKS5, HTTP или
            SSH.
          </Typography>
          <Button variant="outlined" onClick={() => setServerOpen(true)}>
            Ввести данные сервера
          </Button>
        </Box>
      </Stack>
      <Dialog
        open={adding}
        onClose={working ? undefined : () => setAdding(false)}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={submit}>
          <DialogTitle>Добавить VPN</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2">
                Скопируй ссылку подписки в кабинете или боте своего VPN-сервиса.
                Можно использовать ту же ссылку, которую ты добавлял в Happ.
              </Typography>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Название VPN"
                placeholder="Например, Мой VPN"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
              <TextField
                label="Ссылка от VPN-сервиса"
                type="password"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                required
                autoComplete="off"
                helperText="Ссылка сохраняется только на этом компьютере. Она дает доступ к твоему VPN, не пересылай ее другим."
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdding(false)} disabled={working}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" disabled={working}>
              {working ? 'Загружаю VPN…' : 'Добавить VPN'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      {serverOpen && (
        <TunnelForm
          onClose={() => setServerOpen(false)}
          onAdded={() => void refetch()}
        />
      )}
    </BasePage>
  )
}
