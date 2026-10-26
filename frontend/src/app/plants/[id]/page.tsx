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
  const [ph, setPh] = useState('')
  const [ec, setEc] = useState('')
  const [temperature, setTemperature] = useState('')
  const [humidity, setHumidity] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photos, setPhotos] = useState<{ id: string; src: string }[]>([])
  const [uploading, setUploading] = useState(false)
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

  useEffect(() => {
    if (!ready || !isAuthenticated) return
    let active = true
    const urls: string[] = []
    plantsApi.photos(id).then(async response => {
      const loaded = await Promise.all(response.data.map(async photo => {
        const blob = await plantsApi.photoBlob(id, photo.id)
        const src = URL.createObjectURL(blob.data)
        urls.push(src)
        return { id: photo.id, src }
      }))
      if (active) setPhotos(loaded)
    }).catch(() => setError('Impossible de charger les photos.'))
    return () => { active = false; urls.forEach(url => URL.revokeObjectURL(url)) }
  }, [ready, isAuthenticated, id])

  async function uploadPhoto(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError('Photo limitée à 5 Mo.'); return }
    setUploading(true); setError('')
    try {
      const uploaded = await plantsApi.uploadPhoto(id, file)
      const blob = await plantsApi.photoBlob(id, uploaded.data.id)
      setPhotos(previous => [{ id: uploaded.data.id, src: URL.createObjectURL(blob.data) }, ...previous])
    } catch { setError('Import de la photo impossible.') }
    finally { setUploading(false) }
  }

  async function addLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await plantsApi.addLog(id, {
        notes: notes.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        ph: ph === '' ? undefined : Number(ph),
        ec: ec === '' ? undefined : Number(ec),
        temperature: temperature === '' ? undefined : Number(temperature),
        humidity: humidity === '' ? undefined : Number(humidity),
      })
      setLogs(previous => [response.data, ...previous])
      setNotes(''); setPh(''); setEc(''); setTemperature(''); setHumidity(''); setPhotoUrl('')
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
          <textarea id="notes" maxLength={5000} rows={4} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Qu'avez-vous observé aujourd'hui ?" className="w-full rounded-xl border border-gray-600 bg-gray-950 p-3" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label>pH<input type="number" min="0" max="14" step="0.1" value={ph} onChange={e => setPh(e.target.value)} className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-600 p-3" /></label>
            <label>EC<input type="number" min="0" step="0.01" value={ec} onChange={e => setEc(e.target.value)} className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-600 p-3" /></label>
            <label>Température °C<input type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-600 p-3" /></label>
            <label>Humidité %<input type="number" min="0" max="100" step="0.1" value={humidity} onChange={e => setHumidity(e.target.value)} className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-600 p-3" /></label>
          </div>
          <label className="mt-4 block">URL de la photo (HTTPS)
            <input type="url" pattern="https://.*" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-600 p-3" />
          </label>
          <button disabled={busy} className="mt-3 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-gray-950 disabled:opacity-50">{busy ? 'Enregistrement…' : 'Ajouter au journal'}</button>
        </form>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Photos de la plante</h2>
        <label className="block rounded-xl border border-gray-700 p-4">
          Ajouter une photo (JPEG, PNG ou WebP, 5 Mo maximum)
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}
            onChange={e => { const file = e.target.files?.[0]; if (file) void uploadPhoto(file); e.target.value = '' }}
            className="mt-3 block w-full text-sm" />
        </label>
        {uploading && <p role="status" className="mt-2">Envoi de la photo…</p>}
        <div className="mt-3 grid grid-cols-2 gap-3">{photos.map(photo =>
          <div key={photo.id} className="overflow-hidden rounded-xl border border-gray-700">
            <img src={photo.src} alt="Photo de culture importée" className="h-40 w-full object-cover" />
          </div>)}
        </div>
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
