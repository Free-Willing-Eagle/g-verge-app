import { useEffect } from 'react'

import { useQuery } from '@/services/query-client'
import type { Workspace } from '@/services/routing/model'
import { applyWorkspace, loadWorkspace } from '@/services/routing/workspace'
import { routingDraft, useRoutingDraft } from '@/store/routing-draft'

export function useRoutingWorkspace() {
  const query = useQuery({
    queryKey: ['personal-routing-workspace'],
    queryFn: loadWorkspace,
    retry: false,
  })
  const state = useRoutingDraft()
  useEffect(() => {
    if (query.data) routingDraft.hydrate(query.data.workspace)
  }, [query.data])
  const save = async (patch: Partial<Workspace> = {}) => {
    if (!state.draft || !query.data) return false
    const workspace = {
      ...state.draft,
      ...patch,
      sourceIds: query.data.sources.map((source) => source.uid!),
    }
    routingDraft.start()
    try {
      await applyWorkspace(workspace)
      routingDraft.success(workspace)
      return true
    } catch (error) {
      routingDraft.fail(
        error instanceof Error
          ? error.message
          : 'Не удалось сохранить выбор. Проверь подключения и повтори.',
      )
      return false
    }
  }
  return {
    ...query,
    ...state,
    loadError: query.error,
    dirty: !!state.draft && state.saved !== JSON.stringify(state.draft),
    save,
    change: routingDraft.change,
  }
}
