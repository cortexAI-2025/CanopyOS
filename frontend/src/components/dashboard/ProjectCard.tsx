import Link from 'next/link'
import { Project } from '@/store/projectStore'
import {
  formatDate,
  getPhaseProgress,
  GROW_TYPE_LABELS,
  GROW_METHOD_LABELS,
  capitalize,
  Phase,
} from '@/lib/utils'
import Badge from '@/components/ui/Badge'

interface ProjectCardProps {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const progress = getPhaseProgress(project.currentPhase as Phase)
  const strainName = project.strain?.name ?? '—'

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 flex flex-col hover:border-gray-700 transition-colors">
      {/* Top: name + phase badge */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-base font-semibold text-gray-100 leading-snug truncate">
          {project.name}
        </h3>
        <Badge variant={project.currentPhase as 'germination' | 'vegetative' | 'flowering' | 'flush'}>
          {capitalize(project.currentPhase)}
        </Badge>
      </div>

      {/* Strain */}
      <p className="text-sm text-gray-400 mb-4 truncate">{strainName}</p>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">Progress</span>
          <span className="text-xs text-gray-500">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Chips: grow type + method */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-800 text-xs text-gray-400 border border-gray-700">
          {GROW_TYPE_LABELS[project.growType] ?? project.growType}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-800 text-xs text-gray-400 border border-gray-700">
          {GROW_METHOD_LABELS[project.growMethod] ?? project.growMethod}
        </span>
      </div>

      {/* Footer: start date + view link */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-800">
        <span className="text-xs text-gray-500">Started {formatDate(project.startDate)}</span>
        <Link
          href={`/projects/${project.id}`}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors flex items-center gap-1"
        >
          View Project
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
