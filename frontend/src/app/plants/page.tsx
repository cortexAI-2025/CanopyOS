'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plant, plantsApi } from '@/lib/plants'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

export default function PlantsPage() {
  const router = useRouter()
  const { isAuthenticated, loadFromStorage } = useAuthStore()
  const [ready, setReady] = useState(false)
  const [plants, setPlants] = useState<Plant[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFromStorage()
    setReady(true)
  }, [loadFromStorage])

  useEffect(() => {
    if (!ready) return
    if (!isAuthenticated) { router.replace('/login'); return }
    plantsApi.list()
      .then(response => setPlants(response.data))
      .catch(() => setError('Impossible de charger les plantes.'))
      .finally(() => setLoading(false))
  }, [ready, isAuthenticated, router])

  return <main className="mx-auto max-w-3xl min-h-screen px-4 py-8">
    <header className="flex items-center justify-between gap-4 mb-8">
      <div><p className="text-emerald-400 text-sm">CanopyOS</p><h1 className="text-3xl font-bold">Mes plantes</h1></div>
      <Link href="/plants/new" className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-gray-950">+ Ajouter</Link>
    </header>
    {loading && <p role="status">Chargement…</p>}
    {error && <p role="alert" className="text-red-400">{error}</p>}
    {!loading && !error && plants.length === 0 && <section className="rounded-2xl border border-gray-700 p-8 text-center">
      <h2 className="text-xl font-semibold">Votre journal commence ici</h2>
      <p className="mt-2 text-gray-400">Ajoutez votre première plante pour suivre son évolution.</p>
      <Link className="mt-5 inline-block text-emerald-400 underline" href="/plants/new">Créer une plante</Link>
    </section>}
    <ul className="grid gap-3 sm:grid-cols-2">
      {plants.map(plant => <li key={plant.id}>
        <Link href={'/plants/' + encodeURIComponent(plant.id)} className="block rounded-2xl border border-gray-700 bg-gray-900 p-5 hover:border-emerald-500">
          <h2 className="text-xl font-semibold">{plant.name}</h2>
          <p className="mt-1 text-gray-300">{plant.strain?.name || plant.customStrain || 'Variété non renseignée'}</p>
          <p className="mt-3 text-sm text-gray-400">{plant.growType} · {plant.growMethod}</p>
        </Link>
      </li>)}
    </ul>
  </main>
}
