import { GrowLog as GrowLogType } from '@/store/projectStore'
import { formatDateTime } from '@/lib/utils'

interface GrowLogProps {
  log: GrowLogType
}

interface MetricProps {
  label: string
  value: number
  unit: string
}

function Metric({ label, value, unit }: MetricProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-2.5 text-center min-w-0">
      <p className="text-xs text-gray-500 mb-0.5 truncate">{label}</p>
      <p className="text-sm font-semibold text-gray-200">
        {value}
        <span className="text-xs text-gray-500 ml-0.5 font-normal">{unit}</span>
      </p>
    </div>
  )
}

export default function GrowLog({ log }: GrowLogProps) {
  const hasMetrics = log.ph !== undefined || log.ec !== undefined || log.temperature !== undefined || log.humidity !== undefined

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      {/* Date */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        <time className="text-xs text-gray-500 font-medium">{formatDateTime(log.createdAt)}</time>
      </div>

      {/* Notes */}
      <p className="text-sm text-gray-300 leading-relaxed mb-4">{log.notes}</p>

      {/* Metrics grid */}
      {hasMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {log.ph !== undefined && (
            <Metric label="pH" value={log.ph} unit="" />
          )}
          {log.ec !== undefined && (
            <Metric label="EC" value={log.ec} unit="mS/cm" />
          )}
          {log.temperature !== undefined && (
            <Metric label="Temp" value={log.temperature} unit="°C" />
          )}
          {log.humidity !== undefined && (
            <Metric label="RH" value={log.humidity} unit="%" />
          )}
        </div>
      )}

      {/* Photo */}
      {log.photoUrl && (
        <div className="mt-2">
          <img
            src={log.photoUrl}
            alt="Grow log photo"
            className="w-full max-w-sm rounded-lg object-cover border border-gray-800"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
            }}
          />
        </div>
      )}
    </div>
  )
}
