import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { BasePage } from '@/components/base'
import { useRoutingWorkspace } from '@/hooks/use-routing-workspace'
import { useVerge } from '@/hooks/use-verge'
import { deviceOs, isWindows } from '@/services/routing/platform'

export default function PersonalPreferencesPage() {
  const { verge, patchVerge } = useVerge()
  const { data, loadError, isPending } = useRoutingWorkspace()
  const [error, setError] = useState('')
  return (
    <BasePage title="Настройки">
      <Stack spacing={3} sx={{ maxWidth: 900, mx: 'auto', pb: 4 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {isPending && <Typography>Загружаю настройки…</Typography>}
        {loadError && (
          <Alert severity="error">
            Не удалось загрузить подключения. Перезапусти G Verge и повтори.
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          G Verge включается и выключается кнопкой слева, она видна в любом
          разделе.{' '}
          {isWindows
            ? 'При первом включении Windows может спросить разрешение, ответь «Да».'
            : 'При первом включении macOS попросит пароль администратора. Вводи его только в системном окне macOS.'}
        </Typography>
        <Divider />
        <Box>
          <Typography variant="h6" component="h2">
            {isWindows ? 'Запуск вместе с Windows' : 'Запуск вместе с Mac'}
          </Typography>
          <FormControlLabel
            label={`Открывать G Verge после входа в ${isWindows ? 'Windows' : 'Mac'}`}
            control={
              <Switch
                checked={verge?.enable_auto_launch ?? false}
                onChange={async (e) => {
                  try {
                    await patchVerge({ enable_auto_launch: e.target.checked })
                  } catch {
                    setError('Не удалось изменить автозапуск. Повтори позже.')
                  }
                }}
              />
            }
          />
          <Typography variant="body2" color="text.secondary">
            Это открывает приложение. Включение выбранных подключений зависит от
            сохраненного состояния G Verge.
          </Typography>
        </Box>
        <Box>
          <Typography variant="h6" component="h2">
            Внешний вид
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            {[
              ['system', `Как в ${deviceOs}`],
              ['light', 'Светлый'],
              ['dark', 'Темный'],
            ].map(([mode, label]) => (
              <Button
                key={mode}
                variant={verge?.theme_mode === mode ? 'contained' : 'outlined'}
                onClick={async () => {
                  try {
                    await patchVerge({ theme_mode: mode })
                  } catch {
                    setError('Не удалось изменить оформление. Повтори позже.')
                  }
                }}
              >
                {label}
              </Button>
            ))}
          </Stack>
        </Box>
        <Divider />
        <Box>
          <Typography variant="h6" component="h2">
            Где хранятся подключения
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, maxWidth: '70ch' }}
          >
            Ссылки VPN и настройки сохраняются на этом компьютере. G Verge не
            отправляет их внешним сервисам для преобразования. При обновлении
            VPN приложение обращается к адресу из твоей подписки.
          </Typography>
        </Box>
        {data && !data.sources.length && (
          <Alert severity="info">
            VPN еще не добавлены. Сначала вставь свою ссылку в разделе «Мои
            VPN».
          </Alert>
        )}
      </Stack>
    </BasePage>
  )
}
