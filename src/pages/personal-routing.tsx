import { AddRounded } from '@mui/icons-material'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { BasePage } from '@/components/base'
import { RouteChoice } from '@/components/routing/route-choice'
import { SaveChoiceButton } from '@/components/routing/save-choice-button'
import { useRoutingWorkspace } from '@/hooks/use-routing-workspace'
import { useVerge } from '@/hooks/use-verge'
import { getInstalledApplications } from '@/services/cmds'
import { useQuery } from '@/services/query-client'
import { isSafari } from '@/services/routing/model'
import { isWindows } from '@/services/routing/platform'
import { chooseApplication } from '@/services/routing/workspace'

const familiar = new Set([
  'Windows App',
  'Claude',
  'Google Chrome',
  'Paseo',
  'Safari',
  'Gemini',
  'Antigravity',
  'Telegram',
  'Telegram 2',
  'WhatsApp',
  'Signal',
  'Mail',
  'GitHub Desktop',
  'Яндекс Музыка',
  'RustDesk',
  'Yandex',
  'Discord',
  'Microsoft Edge',
  'Firefox',
  'Mozilla Firefox',
  'Steam',
  'Zoom',
  'Spotify',
  'ChatGPT',
])

export default function PersonalRoutingPage() {
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
  const { data: installed = [], refetch: refreshApps } = useQuery({
    queryKey: ['installed-applications'],
    queryFn: getInstalledApplications,
    retry: false,
  })
  const [searching, setSearching] = useState(false)
  if (isPending || !draft || !data)
    return (
      <BasePage title="Интернет для программ">
        {loadError ? (
          <Alert severity="error">
            Не удалось загрузить подключения. Перезапусти G Verge.
          </Alert>
        ) : (
          <CircularProgress aria-label="Загружаю программы" />
        )}
      </BasePage>
    )
  const sources = data.sources
  const paths = new Set([
    ...(draft.appPaths ?? []),
    ...installed.filter((app) => familiar.has(app.name)).map((app) => app.path),
    ...draft.routes
      .filter((route) => route.match === 'app')
      .map((route) => route.value),
  ])
  const apps = [...paths]
    .map((path) => ({
      path,
      name:
        installed.find((app) => app.path === path)?.name ??
        path
          .split(/[/\\]/)
          .pop()
          ?.replace(/\.(app|exe)$/i, '') ??
        path,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const setApp = (path: string, name: string, target: string) => {
    const other = draft.routes.filter(
      (route) => !(route.match === 'app' && route.value === path),
    )
    change({
      routes:
        target === 'DEFAULT'
          ? other
          : [
              ...other,
              {
                id: crypto.randomUUID(),
                name,
                match: 'app',
                value: path,
                target,
                enabled: true,
              },
            ],
    })
  }
  const addApp = (path: string) => {
    change({ appPaths: [...new Set([...(draft.appPaths ?? []), path])] })
    setSearching(false)
  }
  return (
    <BasePage title="Интернет для программ" header={<SaveChoiceButton />}>
      <Stack spacing={3} inert={busy} sx={{ maxWidth: 960, mx: 'auto', pb: 4 }}>
        <Box>
          <Typography>
            Выбери, как каждая программа выходит в интернет.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {dirty
              ? 'Есть несохраненные изменения. Они сохранятся только после нажатия «Сохранить выбор».'
              : 'Для программ без отдельного выбора используется общее подключение.'}
          </Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {sources.length === 0 && (
          <Alert
            severity="info"
            action={
              <Button onClick={() => navigate('/my-connections')}>
                Добавить VPN
              </Button>
            }
          >
            Сначала добавь свой VPN, затем выбери его для нужных программ.
          </Alert>
        )}
        {!verge?.enable_tun_mode && sources.length > 0 && (
          <Alert severity="info">
            G Verge пока выключен. Сохрани выбор и нажми красную кнопку слева,
            чтобы он начал работать.
          </Alert>
        )}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography component="h2" variant="h6">
              Общее подключение
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Для всех программ, которым ты не выбрал другое.
            </Typography>
          </Box>
          <Box sx={{ width: { xs: '100%', sm: 260 } }}>
            <RouteChoice
              label="Остальные программы"
              value={draft.defaultTarget}
              sources={sources}
              onChange={(value) => change({ defaultTarget: value })}
            />
          </Box>
        </Stack>
        <Divider />
        <Box component="section">
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography component="h2" variant="h6">
              Твои программы
            </Typography>
            <Button
              startIcon={<AddRounded />}
              onClick={() => setSearching(true)}
            >
              Добавить программу
            </Button>
          </Stack>
          {searching && (
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Autocomplete
                options={installed}
                getOptionLabel={(app) => app.name}
                onChange={(_, app) => {
                  if (app) addApp(app.path)
                }}
                renderOption={(props, app) => {
                  const { key, ...rest } = props
                  return (
                    <li key={key} {...rest}>
                      <Box>
                        <Typography variant="body2">{app.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {app.path}
                        </Typography>
                      </Box>
                    </li>
                  )
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    autoFocus
                    label={
                      isWindows
                        ? 'Найти программу на компьютере'
                        : 'Найти программу на Mac'
                    }
                    placeholder="Начни вводить название"
                  />
                )}
              />
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button
                  onClick={async () => {
                    const path = await chooseApplication()
                    if (path) addApp(path)
                  }}
                >
                  {isWindows
                    ? 'Выбрать файл программы'
                    : 'Выбрать через Finder'}
                </Button>
                <Button onClick={() => void refreshApps()}>
                  Обновить список
                </Button>
                <Button onClick={() => setSearching(false)}>
                  Закрыть поиск
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {isWindows
                  ? 'В поиске есть программы с ярлыком в меню «Пуск» или на рабочем столе. Если нужной нет, выбери ее файл .exe.'
                  : 'Программа появится в поиске после установки. Если она лежит в другой папке, выбери ее через Finder.'}
              </Typography>
            </Stack>
          )}
          {apps.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 3 }}>
              Добавь программу, для которой хочешь выбрать отдельное
              подключение.
            </Typography>
          )}
          {apps.map((app) => {
            const route = draft.routes.find(
              (item) =>
                item.match === 'app' && item.value === app.path && item.enabled,
            )
            return (
              <Stack
                key={app.path}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  alignItems: { sm: 'center' },
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
                  >
                    {app.name === 'Mail' ? 'Почта Apple' : app.name}
                  </Typography>
                  {isSafari(app.path) && route && (
                    <Typography variant="caption" color="text.secondary">
                      Страницы Safari загружает общий модуль macOS. Этот же
                      выбор получат Почта Apple и другие программы на его
                      основе.
                    </Typography>
                  )}
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 260 } }}>
                  <RouteChoice
                    label={`Интернет для ${app.name === 'Mail' ? 'Почты Apple' : app.name}`}
                    inherit
                    allowBlock
                    value={route?.target ?? 'DEFAULT'}
                    sources={sources}
                    onChange={(target) => setApp(app.path, app.name, target)}
                  />
                </Box>
              </Stack>
            )
          })}
        </Box>
      </Stack>
    </BasePage>
  )
}
