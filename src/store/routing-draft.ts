import { useSyncExternalStore } from 'react'

import type { Workspace } from '@/services/routing/model'

type State = {
  draft: Workspace | null
  saved: string
  busy: boolean
  error: string
  message: string
}
let state: State = {
  draft: null,
  saved: '',
  busy: false,
  error: '',
  message: '',
}
const listeners = new Set<() => void>()
const publish = (patch: Partial<State>) => {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export const routingDraft = {
  hydrate(workspace: Workspace) {
    if (!state.draft)
      publish({ draft: workspace, saved: JSON.stringify(workspace) })
  },
  change(patch: Partial<Workspace>) {
    if (state.draft && !state.busy)
      publish({ draft: { ...state.draft, ...patch }, message: '' })
  },
  start() {
    publish({ busy: true, error: '', message: '' })
  },
  success(workspace: Workspace) {
    publish({
      draft: workspace,
      saved: JSON.stringify(workspace),
      busy: false,
      message:
        'Выбор сохранен. Для уже открытой программы может понадобиться перезапуск.',
    })
  },
  fail(message: string) {
    publish({ busy: false, error: message })
  },
  clear() {
    publish({ error: '', message: '' })
  },
}

export function useRoutingDraft() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => state,
  )
}
