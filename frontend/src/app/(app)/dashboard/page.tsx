'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectStore } from '@/store/projectStore'
import ProjectCard from '@/components/dashboard/ProjectCard'
import Button from '@/components/ui/Button'

export default function DashboardPage() {
  const router = useRouter()
  const { projects, fetchProjects, isLoading, error } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const activeProjects = projects.filter((p) => p.status === 'active')
  const completedProjects = projects.filter((p) => p.status === 'completed')

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">My Grows</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track and manage all your cultivation projects</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/projects/new')}
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Total Projects</p>
          <p className="text-3xl font-bold text-gray-100">{projects.length}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Active</p>
          <p className="text-3xl font-bold text-emerald-400">{activeProjects.length}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Completed</p>
          <p className="text-3xl font-bold text-gray-100">{completedProjects.length}</p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && projects.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-xl border border-gray-800 p-6 animate-pulse"
            >
              <div className="h-5 bg-gray-800 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-800 rounded w-1/3 mb-6" />
              <div className="h-2 bg-gray-800 rounded mb-6" />
              <div className="flex gap-2">
                <div className="h-5 bg-gray-800 rounded-full w-16" />
                <div className="h-5 bg-gray-800 rounded-full w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mb-5">
            <svg
              className="w-8 h-8 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">No grows yet</h2>
          <p className="text-sm text-gray-400 max-w-xs mb-6">
            Start your first cultivation project. Track phases, tasks, nutrients, and grow logs all in one place.
          </p>
          <Link href="/projects/new">
            <Button variant="primary" size="lg">
              Start Your First Grow
            </Button>
          </Link>
        </div>
      )}

      {/* Projects grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
