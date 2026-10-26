import api from './api'

export type GrowType = 'INDOOR' | 'OUTDOOR' | 'GREENHOUSE'
export type GrowMethod = 'SOIL' | 'COCO' | 'HYDROPONIC' | 'AEROPONIC'

export interface PlantInput {
  name: string
  growType: GrowType
  growMethod: GrowMethod
  strainId?: string
  customStrain?: string
}
export interface Plant extends PlantInput {
  id: string
  createdAt: string
  strain?: { name: string } | null
}
export interface PlantLog {
  id: string
  notes?: string | null
  photoUrl?: string | null
  ph?: number | null
  ec?: number | null
  temperature?: number | null
  humidity?: number | null
  createdAt: string
}
export interface PlantPhoto { id: string; createdAt: string }
export const plantsApi = {
  photos: (id: string) => api.get<PlantPhoto[]>('/plants/' + encodeURIComponent(id) + '/photos'),
  uploadPhoto: (id: string, file: File) => {
    const data = new FormData()
    data.append('photo', file)
    return api.post<{ id: string; url: string }>('/plants/' + encodeURIComponent(id) + '/photos', data, {
      headers: { 'Content-Type': undefined },
    })
  },
  photoBlob: (id: string, photoId: string) => api.get<Blob>(
    '/plants/' + encodeURIComponent(id) + '/photos/' + encodeURIComponent(photoId),
    { responseType: 'blob' },
  ),
  list: () => api.get<Plant[]>('/plants'),
  get: (id: string) => api.get<Plant>('/plants/' + encodeURIComponent(id)),
  create: (data: PlantInput) => api.post<Plant>('/plants', data),
  logs: (id: string) => api.get<PlantLog[]>('/plants/' + encodeURIComponent(id) + '/logs'),
  addLog: (id: string, data: { notes?: string; photoUrl?: string; ph?: number; ec?: number; temperature?: number; humidity?: number }) =>
    api.post<PlantLog>('/plants/' + encodeURIComponent(id) + '/logs', data),
}
