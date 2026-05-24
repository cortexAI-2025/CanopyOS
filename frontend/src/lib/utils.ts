import { type ClassValue } from 'clsx'

// Simple className merger without clsx dependency
export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .trim()
}

// Format date to readable string
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Format date with time
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Calculate days since a start date
export function daysSince(startDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// Phase progress calculation
export type Phase = 'germination' | 'vegetative' | 'flowering' | 'flush' | 'harvest'

export const PHASE_ORDER: Phase[] = ['germination', 'vegetative', 'flowering', 'flush']

export const PHASE_DURATIONS: Record<Phase, number> = {
  germination: 7,
  vegetative: 28,
  flowering: 56,
  flush: 14,
  harvest: 0,
}

export const PHASE_LABELS: Record<Phase, string> = {
  germination: 'Germination',
  vegetative: 'Vegetative',
  flowering: 'Flowering',
  flush: 'Flush',
  harvest: 'Harvest',
}

export function getPhaseProgress(currentPhase: Phase): number {
  const index = PHASE_ORDER.indexOf(currentPhase)
  if (index === -1) return 100
  return Math.round(((index + 0.5) / PHASE_ORDER.length) * 100)
}

// Phase badge colors
export const PHASE_COLORS: Record<string, string> = {
  germination: 'blue',
  vegetative: 'green',
  flowering: 'purple',
  flush: 'orange',
  harvest: 'yellow',
}

// Grow type labels
export const GROW_TYPE_LABELS: Record<string, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  greenhouse: 'Greenhouse',
}

// Grow method labels
export const GROW_METHOD_LABELS: Record<string, string> = {
  soil: 'Soil',
  hydroponic: 'Hydroponic',
  aeroponic: 'Aeroponic',
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Capitalize first letter
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Parse API error message
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string }
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }
    if (axiosError.message) {
      return axiosError.message
    }
  }
  return 'An unexpected error occurred'
}
