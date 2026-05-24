'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProjectStore } from '@/store/projectStore'
import { formatDate, GROW_TYPE_LABELS, GROW_METHOD_LABELS, capitalize } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import PhaseTimeline from '@/components/projects/PhaseTimeline'
import TaskList from '@/components/projects/TaskList'
import NutrientPanel from '@/components/projects/NutrientPanel'
import GrowLog from '@/components/journal/GrowLog'
import AddLogForm from '@/components/journal/AddLogForm'

type Tab = 'overview' | 'tasks' | 'journal' | 'nutrients'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'journal', label: 'Journal' },
  { id: 'nutrients', label: 'Nutrients' },
]

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const {
    currentProject,
    fetchProject,
    fetchTasks,
    fetchGrowLogs,
    fetchNutrients,
    growLogs,
    isLoading,
    error,
    clearCurrentProject,
  } = useProjectStore()

  const [activeTab, setActiveTab] = useState<Tab>('overview')

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId)
    }
    return () => {
      clearCurrentProject()
    }
  }, [projectId, fetchProject, clearCurrentProject])

  useEffect(() => {
    if (projectId) {
      if (activeTab === 'tasks') fetchTasks(projectId)
      if (activeTab === 'journal') fetchGrowLogs(projectId)
      if (activeTab === 'nutrients') fetchNutrients(projectId)
    }
  }, [activeTab, projectId, fetchTasks, fetchGrowLogs, fetchNutrients])

  if (isLoading && !currentProject) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-800 rounded w-40 mb-8" />
          <div className="bg-gray-900 rounded-xl border border-gray-800 h-48" />
        </div>
      </div>
    )
  }

  if (error && !currentProject) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          {error}
        </div>
      </div>
    )
  }

  if (!currentProject) return null

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All Projects
      </button>

      {/* Project header */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-100 truncate">{currentProject.name}</h1>
              <Badge variant={currentProject.currentPhase as 'germination' | 'vegetative' | 'flowering' | 'flush'}>
                {capitalize(currentProject.currentPhase)}
              </Badge>
            </div>
            {currentProject.strain && (
              <p className="text-gray-400 text-sm mb-4">{currentProject.strain.name}</p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {GROW_TYPE_LABELS[currentProject.growType]}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                {GROW_METHOD_LABELS[currentProject.growMethod]}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Started {formatDate(currentProject.startDate)}
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  currentProject.status === 'active' ? 'bg-emerald-500' :
                  currentProject.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
                }`} />
                <span className="text-gray-400">{capitalize(currentProject.status)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 mb-6">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-5">
              Growth Timeline
            </h2>
            <PhaseTimeline
              currentPhase={currentProject.currentPhase}
              startDate={currentProject.startDate}
            />
          </div>

          {currentProject.notes && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Notes
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed">{currentProject.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <TaskList projectId={projectId} />
      )}

      {activeTab === 'journal' && (
        <div className="space-y-4">
          <AddLogForm projectId={projectId} />
          {growLogs.length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-sm">No grow logs yet. Add your first entry above.</p>
            </div>
          )}
          {growLogs.map((log) => (
            <GrowLog key={log.id} log={log} />
          ))}
        </div>
      )}

      {activeTab === 'nutrients' && (
        <NutrientPanel projectId={projectId} />
      )}
    </div>
  )
}
