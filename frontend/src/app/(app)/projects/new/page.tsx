'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/store/projectStore'
import { getErrorMessage } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'

type GrowType = 'indoor' | 'outdoor' | 'greenhouse'
type GrowMethod = 'soil' | 'hydroponic' | 'aeroponic'

export default function NewProjectPage() {
  const router = useRouter()
  const { strains, fetchStrains, createProject } = useProjectStore()

  const [name, setName] = useState('')
  const [strainId, setStrainId] = useState('')
  const [growType, setGrowType] = useState<GrowType>('indoor')
  const [growMethod, setGrowMethod] = useState<GrowMethod>('soil')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStrains()
  }, [fetchStrains])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Project name is required')
      return
    }
    if (!strainId) {
      setError('Please select a strain')
      return
    }
    if (!startDate) {
      setError('Start date is required')
      return
    }

    setIsLoading(true)
    try {
      const newProject = await createProject({
        name: name.trim(),
        strainId,
        growType,
        growMethod,
        startDate,
        currentPhase: 'germination',
        status: 'active',
      })
      router.push(`/projects/${newProject.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const GROW_TYPES: { value: GrowType; label: string; description: string }[] = [
    { value: 'indoor', label: 'Indoor', description: 'Controlled environment grow' },
    { value: 'outdoor', label: 'Outdoor', description: 'Natural sunlight grow' },
    { value: 'greenhouse', label: 'Greenhouse', description: 'Hybrid environment grow' },
  ]

  const GROW_METHODS: { value: GrowMethod; label: string; description: string }[] = [
    { value: 'soil', label: 'Soil', description: 'Traditional soil medium' },
    { value: 'hydroponic', label: 'Hydroponic', description: 'Water-based nutrient system' },
    { value: 'aeroponic', label: 'Aeroponic', description: 'Misted root system' },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-100">New Grow Project</h1>
        <p className="text-sm text-gray-400 mt-1">Set up a new cultivation project to track</p>
      </div>

      <Card>
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Project Name <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., Summer Outdoor Batch 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Strain Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Strain <span className="text-red-400">*</span>
            </label>
            <Select
              value={strainId}
              onChange={(e) => setStrainId(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select a strain…</option>
              {strains.map((strain) => (
                <option key={strain.id} value={strain.id}>
                  {strain.name} ({strain.type})
                </option>
              ))}
            </Select>
            {strains.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No strains available. Make sure the backend is running.
              </p>
            )}
          </div>

          {/* Grow Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Grow Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {GROW_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setGrowType(type.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    growType === type.value
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <p className={`text-sm font-medium ${growType === type.value ? 'text-emerald-400' : 'text-gray-200'}`}>
                    {type.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Grow Method */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Grow Method <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {GROW_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setGrowMethod(method.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    growMethod === method.value
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <p className={`text-sm font-medium ${growMethod === method.value ? 'text-emerald-400' : 'text-gray-200'}`}>
                    {method.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{method.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Start Date <span className="text-red-400">*</span>
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Creating…' : 'Create Project'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
