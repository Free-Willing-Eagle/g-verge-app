import { Button } from '@mui/material'

import { useRoutingWorkspace } from '@/hooks/use-routing-workspace'

export function SaveChoiceButton() {
  const { data, busy, dirty, save } = useRoutingWorkspace()
  return (
    <Button
      variant="contained"
      onClick={() => void save()}
      disabled={
        !data ||
        busy ||
        (!dirty &&
          data.managedUid !== null &&
          data.currentUid === data.managedUid)
      }
    >
      {busy ? 'Сохраняю…' : 'Сохранить выбор'}
    </Button>
  )
}
