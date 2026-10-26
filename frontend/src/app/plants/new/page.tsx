'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GrowMethod, GrowType, plantsApi } from '@/lib/plants'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'

export default function NewPlantPage() {
  const router = useRouter()
  const { isAuthenticated, loadFromStorage } = useAuthStore()
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')
  const [customStrain, setCustomStrain] = useState('')
  const [growType, setGrowType] = useState<GrowType>('INDOOR')
  const [growMethod, setGrowMethod] = useState<GrowMethod>('SOIL')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { loadFromStorage(); setReady(true) }, [loadFromStorage])
  useEffect(() => { if (ready && !isAuthenticated) router.replace('/login') }, [ready, isAuthenticated, router])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await plantsApi.create({ name: name.trim(), customStrain: customStrain.trim(), growType, growMethod })
      router.push('/plants/' + encodeURIComponent(response.data.id))
    } catch {
      setError('Création impossible. Vérifiez les informations et réessayez.')
      setBusy(false)
    }
  }
  return <main className="mx-auto max-w-xl min-h-screen px-4 py-8">
    <Link href="/plants" className="text-emerald-400">← Mes plantes</Link>
    <h1 className="mt-6 mb-2 text-3xl font-bold">Ajouter une plante</h1>
    <p className="mb-8 text-gray-400">Quelques informations suffisent pour commencer votre journal.</p>
    <form onSubmit={submit} className="space-y-5">
      <label className="block">Nom de la plante
        <input required maxLength={120} value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-600 bg-gray-900 p-3" placeholder="Ex. Plante 01" />
      </label>
      <label className="block">Variété
        <input required maxLength={180} value={customStrain} onChange={e => setCustomStrain(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-600 bg-gray-900 p-3" placeholder="Nom de la variété" />
      </label>
      <label className="block">Environnement
        <select value={growType} onChange={e => setGrowType(e.target.value as GrowType)} className="mt-2 w-full rounded-xl border border-gray-600 bg-gray-900 p-3">
          <option value="INDOOR">Intérieur</option><option value="OUTDOOR">Extérieur</option><option value="GREENHOUSE">Serre</option>
        </select>
      </label>
      <label className="block">Support de culture
        <select value={growMethod} onChange={e => setGrowMethod(e.target.value as GrowMethod)} className="mt-2 w-full rounded-xl border border-gray-600 bg-gray-900 p-3">
          <option value="SOIL">Terre</option><option value="COCO">Coco</option><option value="HYDROPONIC">Hydroponie</option><option value="AEROPONIC">Aéroponie</option>
        </select>
      </label>
      {error && <p role="alert" className="text-red-400">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-emerald-500 p-4 font-semibold text-gray-950 disabled:opacity-50">{busy ? 'Création…' : 'Créer ma plante'}</button>
    </form>
  </main>
}
