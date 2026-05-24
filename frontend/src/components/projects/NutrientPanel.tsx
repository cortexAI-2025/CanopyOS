'use client'

import { useEffect } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { capitalize } from '@/lib/utils'

interface NutrientPanelProps {
  projectId: string
}

const PHASE_COLORS: Record<string, string> = {
  germination: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  vegetative: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  flowering: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  flush: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

function NPKBar({ label, value, max = 10, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-4">{label}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right">{value}</span>
    </div>
  )
}

export default function NutrientPanel({ projectId }: NutrientPanelProps) {
  const { nutrientPlans, fetchNutrients, isLoading, error } = useProjectStore()

  useEffect(() => {
    fetchNutrients(projectId)
  }, [projectId, fetchNutrients])

  if (isLoading && nutrientPlans.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-5 animate-pulse">
            <div className="h-4 bg-gray-800 rounded w-24 mb-4" />
            <div className="space-y-3">
              <div className="h-3 bg-gray-800 rounded" />
              <div className="h-3 bg-gray-800 rounded" />
              <div className="h-3 bg-gray-800 rounded" />
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

  if (nutrientPlans.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <svg className="w-10 h-10 mx-auto mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <p className="text-sm">No nutrient plans configured for this project.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {nutrientPlans.map((plan) => {
        const phaseStyle = PHASE_COLORS[plan.phase] ?? 'text-gray-400 bg-gray-800 border-gray-700'

        return (
          <div
            key={plan.id}
            className="bg-gray-900 rounded-xl border border-gray-800 p-5"
          >
            {/* Phase header */}
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mb-4 ${phaseStyle}`}>
              {capitalize(plan.phase)} Phase
            </div>

            {/* pH + EC targets */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Target pH</p>
                <p className="text-xl font-bold text-gray-100">{plan.targetPh.toFixed(1)}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Target EC</p>
                <p className="text-xl font-bold text-gray-100">{plan.targetEc.toFixed(1)}</p>
                <p className="text-xs text-gray-600">mS/cm</p>
              </div>
            </div>

            {/* NPK Ratios */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2.5">NPK Ratio</p>
              <div className="space-y-2">
                <NPKBar label="N" value={plan.nitrogenRatio} color="bg-emerald-500" />
                <NPKBar label="P" value={plan.phosphorusRatio} color="bg-purple-500" />
                <NPKBar label="K" value={plan.potassiumRatio} color="bg-orange-500" />
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                {plan.nitrogenRatio} : {plan.phosphorusRatio} : {plan.potassiumRatio}
              </p>
            </div>

            {/* Notes */}
            {plan.notes && (
              <div className="pt-3 border-t border-gray-800">
                <p className="text-xs text-gray-500 leading-relaxed">{plan.notes}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
