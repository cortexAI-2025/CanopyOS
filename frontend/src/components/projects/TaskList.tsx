'use client'

import { useEffect } from 'react'
import { useProjectStore, Task } from '@/store/projectStore'
import { formatDate, capitalize } from '@/lib/utils'

interface TaskListProps {
  projectId: string
}

const PHASE_COLORS: Record<string, string> = {
  germination: 'text-blue-400',
  vegetative: 'text-emerald-400',
  flowering: 'text-purple-400',
  flush: 'text-orange-400',
}

export default function TaskList({ projectId }: TaskListProps) {
  const { tasks, fetchTasks, updateTask, isLoading, error } = useProjectStore()

  useEffect(() => {
    fetchTasks(projectId)
  }, [projectId, fetchTasks])

  // Group tasks by phase
  const tasksByPhase = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = task.phase || 'general'
    if (!acc[key]) acc[key] = []
    acc[key].push(task)
    return acc
  }, {})

  const phaseOrder = ['germination', 'vegetative', 'flowering', 'flush', 'general']
  const sortedPhases = Object.keys(tasksByPhase).sort(
    (a, b) => phaseOrder.indexOf(a) - phaseOrder.indexOf(b)
  )

  async function handleToggle(task: Task) {
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    try {
      await updateTask(task.id, newStatus)
    } catch {
      // error is set in store
    }
  }

  if (isLoading && tasks.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-800 rounded" />
              <div className="flex-1">
                <div className="h-4 bg-gray-800 rounded w-2/3 mb-1.5" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
        {error}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <svg className="w-10 h-10 mx-auto mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p className="text-sm">No tasks found for this project.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sortedPhases.map((phase) => {
        const phaseTasks = tasksByPhase[phase]
        const completedCount = phaseTasks.filter((t) => t.status === 'done').length

        return (
          <div key={phase}>
            {/* Phase header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${PHASE_COLORS[phase] ?? 'text-gray-400'}`}>
                {capitalize(phase)} Phase
              </h3>
              <span className="text-xs text-gray-500">
                {completedCount}/{phaseTasks.length} complete
              </span>
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {phaseTasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-gray-900 rounded-xl border p-4 transition-colors ${
                    task.status === 'done' ? 'border-gray-800 opacity-60' : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggle(task)}
                      className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                        task.status === 'done'
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-gray-600 hover:border-emerald-500 bg-transparent'
                      }`}
                      aria-label={task.status === 'done' ? 'Mark as pending' : 'Mark as done'}
                    >
                      {task.status === 'done' && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {task.weekNumber !== undefined && (
                          <span className="text-xs text-gray-600">Week {task.weekNumber}</span>
                        )}
                        {task.dueDate && (
                          <span className="text-xs text-gray-600">Due {formatDate(task.dueDate)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
