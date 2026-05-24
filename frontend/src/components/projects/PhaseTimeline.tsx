import { PHASE_ORDER, PHASE_LABELS, PHASE_DURATIONS, Phase, daysSince } from '@/lib/utils'

interface PhaseTimelineProps {
  currentPhase: string
  startDate: string
}

const PHASE_COLORS: Record<Phase, string> = {
  germination: 'bg-blue-500',
  vegetative: 'bg-emerald-500',
  flowering: 'bg-purple-500',
  flush: 'bg-orange-500',
  harvest: 'bg-yellow-500',
}

const PHASE_RING_COLORS: Record<Phase, string> = {
  germination: 'ring-blue-500',
  vegetative: 'ring-emerald-500',
  flowering: 'ring-purple-500',
  flush: 'ring-orange-500',
  harvest: 'ring-yellow-500',
}

export default function PhaseTimeline({ currentPhase, startDate }: PhaseTimelineProps) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase as Phase)
  const totalDays = daysSince(startDate)

  return (
    <div className="relative">
      {/* Connecting line */}
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-800 mx-8" />

      {/* Phases */}
      <div className="relative flex items-start justify-between">
        {PHASE_ORDER.map((phase, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isFuture = index > currentIndex

          return (
            <div key={phase} className="flex flex-col items-center flex-1">
              {/* Circle */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center mb-3 transition-all ${
                  isCompleted
                    ? `${PHASE_COLORS[phase]} ring-2 ${PHASE_RING_COLORS[phase]}`
                    : isCurrent
                    ? `${PHASE_COLORS[phase]} ring-2 ${PHASE_RING_COLORS[phase]} ring-offset-2 ring-offset-gray-900 shadow-lg`
                    : 'bg-gray-800 border-2 border-gray-700'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                ) : (
                  <div className="w-2.5 h-2.5 bg-gray-600 rounded-full" />
                )}
              </div>

              {/* Phase label */}
              <p
                className={`text-xs font-semibold mb-1 text-center ${
                  isCurrent
                    ? 'text-gray-100'
                    : isCompleted
                    ? 'text-gray-300'
                    : 'text-gray-600'
                }`}
              >
                {PHASE_LABELS[phase]}
              </p>

              {/* Duration */}
              <p className="text-xs text-gray-500 text-center">
                {PHASE_DURATIONS[phase] > 0 ? `~${PHASE_DURATIONS[phase]}d` : '—'}
              </p>

              {/* Current indicator */}
              {isCurrent && (
                <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  Current
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Days elapsed */}
      <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
        <span>Day {totalDays} of grow</span>
        <span>
          Phase {Math.max(1, currentIndex + 1)} of {PHASE_ORDER.length}
        </span>
      </div>
    </div>
  )
}
