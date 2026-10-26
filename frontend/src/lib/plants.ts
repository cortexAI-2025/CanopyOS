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
export const plantsApi = {
  list: () => api.get<Plant[]>('/plants'),
  get: (id: string) => api.get<Plant>('/plants/' + encodeURIComponent(id)),
  create: (data: PlantInput) => api.post<Plant>('/plants', data),
  logs: (id: string) => api.get<PlantLog[]>('/plants/' + encodeURIComponent(id) + '/logs'),
  addLog: (id: string, data: { notes?: string; photoUrl?: string; ph?: number; ec?: number; temperature?: number; humidity?: number }) =>
    api.post<PlantLog>('/plants/' + encodeURIComponent(id) + '/logs', data),
}
