'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Plant, PlantLog, plantsApi } from '@/lib/plants'
import { useAuthStore } from '@/store/authStore'

export default function PlantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id)
  const { isAuthenticated, loadFromStorage } = useAuthStore()
  const [ready, setReady] = useState(false)
  const [plant, setPlant] = useState<Plant | null>(null)
  const [logs, setLogs] = useState<PlantLog[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => { loadFromStorage(); setReady(true) }, [loadFromStorage])
  useEffect(() => {
    if (!ready) return
    if (!isAuthenticated) { router.replace('/login'); return }
    Promise.all([plantsApi.get(id), plantsApi.logs(id)])
      .then(([p, l]) => { setPlant(p.data); setLogs(l.data) })
      .catch(() => setError('Impossible de charger ce journal.'))
      .finally(() => setLoading(false))
  }, [ready, isAuthenticated, router, id])

  async function addLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!notes.trim() || busy) return
    setBusy(true); setError('')
    try {
      const response = await plantsApi.addLog(id, { notes: notes.trim() })
      setLogs(previous => [response.data, ...previous])
      setNotes('')
    } catch { setError('Observation non enregistrée. Réessayez.') }
    finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-2xl min-h-screen px-4 py-8">
    <Link href="/plants" className="text-emerald-400">← Mes plantes</Link>
    {loading && <p className="mt-8" role="status">Chargement…</p>}
    {plant && <>
      <header className="mt-6 mb-8"><h1 className="text-3xl font-bold">{plant.name}</h1>
        <p className="mt-2 text-gray-400">{plant.strain?.name || plant.customStrain} · {plant.growType} · {plant.growMethod}</p>
      </header>
      <section className="rounded-2xl border border-gray-700 bg-gray-900 p-5 mb-8">
        <h2 className="text-xl font-semibold mb-4">Nouvelle observation</h2>
        <form onSubmit={addLog}>
          <label htmlFor="notes" className="block mb-2">Notes</label>
          <textarea id="notes" required maxLength={5000} rows={4} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Qu'avez-vous observé aujourd'hui ?" className="w-full rounded-xl border border-gray-600 bg-gray-950 p-3" />
          <button disabled={busy} className="mt-3 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-gray-950 disabled:opacity-50">{busy ? 'Enregistrement…' : 'Ajouter au journal'}</button>
        </form>
      </section>
      <section><h2 className="text-xl font-semibold mb-4">Journal de culture</h2>
        {logs.length === 0 && <p className="text-gray-400">Aucune observation pour le moment.</p>}
        <ol className="space-y-4">{logs.map(log => <li key={log.id} className="rounded-xl border border-gray-700 p-4">
          <time className="text-sm text-gray-400">{new Date(log.createdAt).toLocaleDateString('fr-FR')}</time>
          {log.notes && <p className="mt-2 whitespace-pre-wrap">{log.notes}</p>}
          {(log.ph != null || log.ec != null) && <p className="mt-2 text-sm text-emerald-400">{log.ph != null ? 'pH : ' + log.ph : ''} {log.ec != null ? 'EC : ' + log.ec : ''}</p>}
        </li>)}</ol>
      </section>
    </>}
    {error && <p role="alert" className="mt-4 text-red-400">{error}</p>}
  </main>
}
