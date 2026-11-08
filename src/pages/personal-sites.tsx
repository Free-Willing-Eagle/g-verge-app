import { CloseRounded } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { BasePage } from '@/components/base'
import { RouteChoice } from '@/components/routing/route-choice'
import { SaveChoiceButton } from '@/components/routing/save-choice-button'
import { useRoutingWorkspace } from '@/hooks/use-routing-workspace'
import { useVerge } from '@/hooks/use-verge'
import {
  type AppRoute,
  isSubdomain,
  siteAddress,
} from '@/services/routing/model'

const readAddress = (input: string) => {
  try {
    return siteAddress(input)
  } catch {
    return null
  }
}

export default function PersonalSitesPage() {
  const {
    data,
    draft,
    busy,
    dirty,
    error,
    message,
    change,
    isPending,
    loadError,
  } = useRoutingWorkspace()
  const { verge } = useVerge()
  const navigate = useNavigate()
  const [site, setSite] = useState('')
  const [siteTarget, setSiteTarget] = useState('DIRECT')
  const [invalid, setInvalid] = useState(false)
  if (isPending || !draft || !data)
    return (
      <BasePage title="Интернет для сайтов">
        {loadError ? (
          <Alert severity="error">
            Не удалось загрузить подключения. Перезапусти G Verge.
          </Alert>
        ) : (
          <CircularProgress aria-label="Загружаю сайты" />
        )}
      </BasePage>
    )
  const sources = data.sources
  const sites = draft.routes.filter((route) => route.match === 'domain')
  const parentOf = (route: AppRoute) =>
    sites
      .filter((item) => isSubdomain(route.value, item.value))
      .sort((a, b) => b.value.length - a.value.length)[0]
  const rootOf = (route: AppRoute) =>
    sites
      .filter((item) => isSubdomain(route.value, item.value))
      .sort((a, b) => a.value.length - b.value.length)[0] ?? route
  const path = (route: AppRoute) => route.value.split('.').reverse().join('.')
  // A subdomain is listed right under the site it refines.
  const listed = [...sites].sort(
    (a, b) =>
      rootOf(a).name.localeCompare(rootOf(b).name, 'ru') ||
      (path(a) < path(b) ? -1 : 1),
  )
  const typed = readAddress(site)
  const addSite = (event: React.FormEvent) => {
    event.preventDefault()
    if (!typed) {
      setInvalid(true)
      return
    }
    const existing = sites.find((route) => route.value === typed.value)
    change({
      routes: existing
        ? draft.routes.map((route) =>
            route.id === existing.id ? { ...route, target: siteTarget } : route,
          )
        : [
            ...draft.routes,
            {
              id: crypto.randomUUID(),
              name: typed.name,
              match: 'domain',
              value: typed.value,
              target: siteTarget,
              enabled: true,
            },
          ],
    })
    setSite('')
    setInvalid(false)
  }
  return (
    <BasePage title="Интернет для сайтов" header={<SaveChoiceButton />}>
      <Stack spacing={3} inert={busy} sx={{ maxWidth: 960, mx: 'auto', pb: 4 }}>
        <Box>
          <Typography>
            Выбери, как открывается сайт. Выбор действует в любом браузере и
            программе и важнее выбора для программы.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {dirty
              ? 'Есть несохраненные изменения. Они сохранятся только после нажатия «Сохранить выбор».'
              : 'Выбор для сайта распространяется на все его поддомены: google.com включает mail.google.com и store.google.com.'}
          </Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {!verge?.enable_tun_mode && (
          <Alert severity="info">
            G Verge пока выключен, поэтому сайты открываются как обычно. Сохрани
            выбор и нажми красную кнопку слева.
          </Alert>
        )}
        <Box
          component="form"
          onSubmit={addSite}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'flex-start',
          }}
        >
          <TextField
            label="Адрес сайта"
            placeholder="google.com или ссылка на страницу"
            size="small"
            value={site}
            onChange={(e) => {
              setSite(e.target.value)
              setInvalid(false)
            }}
            error={invalid}
            helperText={
              invalid
                ? 'Нужен полный адрес, например google.com.'
                : !typed
                  ? ' '
                  : sites.some((route) => route.value === typed.value)
                    ? `${typed.name} уже в списке, выбор для него изменится`
                    : `${typed.name} и все его поддомены`
            }
            sx={{ flex: '1 1 260px' }}
          />
          <Box sx={{ flex: '0 1 260px', minWidth: 200 }}>
            <RouteChoice
              label="Как открывать"
              allowBlock
              value={siteTarget}
              sources={sources}
              onChange={setSiteTarget}
            />
          </Box>
          <Button type="submit" variant="outlined" sx={{ height: 40 }}>
            Добавить
          </Button>
        </Box>
        <Box component="section">
          {listed.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              Пока сайты открываются так же, как программа, в которой их
              открыли.
            </Typography>
          )}
          {listed.map((route) => {
            const parent = parentOf(route)
            return (
              <Box
                key={route.id}
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  alignItems: 'center',
                  py: 1.5,
                  pl: parent ? { sm: 3 } : 0,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: '1 1 160px' }}>
                  <Typography
                    sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
                  >
                    {route.name}
                  </Typography>
                  {parent && (
                    <Typography variant="caption" color="text.secondary">
                      Важнее выбора для {parent.name}
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    ml: 'auto',
                  }}
                >
                  <Box sx={{ width: 260 }}>
                    <RouteChoice
                      label={`Как открывать ${route.name}`}
                      allowBlock
                      value={route.target}
                      sources={sources}
                      onChange={(target) =>
                        change({
                          routes: draft.routes.map((item) =>
                            item.id === route.id ? { ...item, target } : item,
                          ),
                        })
                      }
                    />
                  </Box>
                  <Tooltip title="Убрать сайт из списка">
                    <IconButton
                      aria-label={`Убрать ${route.name} из списка`}
                      onClick={() =>
                        change({
                          routes: draft.routes.filter(
                            (item) => item.id !== route.id,
                          ),
                        })
                      }
                    >
                      <CloseRounded />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )
          })}
        </Box>
        {sources.length === 0 && (
          <Alert
            severity="info"
            action={
              <Button onClick={() => navigate('/my-connections')}>
                Добавить VPN
              </Button>
            }
          >
            Чтобы открывать сайт через VPN, сначала добавь свой VPN.
          </Alert>
        )}
        <Divider />
        <Box>
          <FormControlLabel
            label="Российские сайты без VPN"
            control={
              <Switch
                checked={draft.russiaDirect ?? false}
                onChange={(e) => change({ russiaDirect: e.target.checked })}
              />
            }
          />
          <Typography variant="body2" color="text.secondary">
            Банки, Госуслуги и многие российские сервисы не открываются через
            зарубежный VPN. Пока переключатель включен, такие сайты всегда
            открываются напрямую, даже в программах с VPN. Сайты из списка выше
            важнее.
          </Typography>
        </Box>
      </Stack>
    </BasePage>
  )
}
