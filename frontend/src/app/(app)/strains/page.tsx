'use client'

import { useEffect } from 'react'
import { useProjectStore } from '@/store/projectStore'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

export default function StrainsPage() {
  const { strains, fetchStrains, isLoading, error } = useProjectStore()

  useEffect(() => {
    fetchStrains()
  }, [fetchStrains])

  const typeColors: Record<string, string> = {
    indica: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
    sativa: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    hybrid: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Strain Library</h1>
        <p className="text-sm text-gray-400 mt-1">Browse available cannabis strains and their properties</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && strains.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-6 animate-pulse">
              <div className="h-5 bg-gray-800 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-800 rounded-full w-16 mb-4" />
              <div className="h-3 bg-gray-800 rounded w-full mb-2" />
              <div className="h-3 bg-gray-800 rounded w-4/5" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && strains.length === 0 && (
        <div className="text-center py-24">
          <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-400 mb-2">No strains found</h2>
          <p className="text-sm text-gray-500">The strain library is empty. Check your backend connection.</p>
        </div>
      )}

      {/* Strains grid */}
      {strains.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {strains.map((strain) => (
            <Card key={strain.id}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-100">{strain.name}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColors[strain.type] ?? ''}`}>
                  {strain.type}
                </span>
              </div>

              {strain.description && (
                <p className="text-sm text-gray-400 mb-4 leading-relaxed line-clamp-2">
                  {strain.description}
                </p>
              )}

              <div className="grid grid-cols-3 gap-3">
                {strain.thcContent !== undefined && (
                  <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">THC</p>
                    <p className="text-sm font-semibold text-gray-200">{strain.thcContent}%</p>
                  </div>
                )}
                {strain.cbdContent !== undefined && (
                  <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">CBD</p>
                    <p className="text-sm font-semibold text-gray-200">{strain.cbdContent}%</p>
                  </div>
                )}
                {strain.floweringTime !== undefined && (
                  <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Flower</p>
                    <p className="text-sm font-semibold text-gray-200">{strain.floweringTime}w</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
