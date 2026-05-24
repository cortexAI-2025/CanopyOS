'use client'

import { useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { getErrorMessage } from '@/lib/utils'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface AddLogFormProps {
  projectId: string
}

export default function AddLogForm({ projectId }: AddLogFormProps) {
  const { addGrowLog } = useProjectStore()

  const [isExpanded, setIsExpanded] = useState(false)
  const [notes, setNotes] = useState('')
  const [ph, setPh] = useState('')
  const [ec, setEc] = useState('')
  const [temperature, setTemperature] = useState('')
  const [humidity, setHumidity] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function reset() {
    setNotes('')
    setPh('')
    setEc('')
    setTemperature('')
    setHumidity('')
    setPhotoUrl('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!notes.trim()) {
      setError('Notes are required')
      return
    }

    setIsLoading(true)
    try {
      await addGrowLog(projectId, {
        notes: notes.trim(),
        ph: ph ? parseFloat(ph) : undefined,
        ec: ec ? parseFloat(ec) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        humidity: humidity ? parseFloat(humidity) : undefined,
        photoUrl: photoUrl.trim() || undefined,
      })
      reset()
      setIsExpanded(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-200">Add Grow Log Entry</span>
          {success && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible form */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-gray-800">
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Notes <span className="text-red-400">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe what you observed today…"
                rows={3}
                disabled={isLoading}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 disabled:opacity-50 transition-colors resize-none"
              />
            </div>

            {/* Metrics grid */}
            <div>
              <p className="text-sm font-medium text-gray-300 mb-2">
                Measurements <span className="text-gray-500 font-normal">(optional)</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">pH</label>
                  <Input
                    type="number"
                    placeholder="6.5"
                    value={ph}
                    onChange={(e) => setPh(e.target.value)}
                    min="0"
                    max="14"
                    step="0.1"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">EC (mS/cm)</label>
                  <Input
                    type="number"
                    placeholder="1.8"
                    value={ec}
                    onChange={(e) => setEc(e.target.value)}
                    min="0"
                    step="0.1"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Temp (°C)</label>
                  <Input
                    type="number"
                    placeholder="24"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    step="0.5"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Humidity (%)</label>
                  <Input
                    type="number"
                    placeholder="55"
                    value={humidity}
                    onChange={(e) => setHumidity(e.target.value)}
                    min="0"
                    max="100"
                    step="1"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Photo URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Photo URL <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <Input
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Saving…' : 'Save Entry'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  reset()
                  setIsExpanded(false)
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
