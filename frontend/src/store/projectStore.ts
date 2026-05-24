import { create } from 'zustand'
import { projectsApi, strainsApi, tasksApi, growLogsApi, nutrientsApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'

export interface Strain {
  id: string
  name: string
  type: 'indica' | 'sativa' | 'hybrid'
  floweringTime?: number
  thcContent?: number
  cbdContent?: number
  description?: string
}

export interface Project {
  id: string
  name: string
  strainId: string
  strain?: Strain
  growType: 'indoor' | 'outdoor' | 'greenhouse'
  growMethod: 'soil' | 'hydroponic' | 'aeroponic'
  currentPhase: 'germination' | 'vegetative' | 'flowering' | 'flush' | 'harvest'
  startDate: string
  status: 'active' | 'completed' | 'paused'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  phase: string
  weekNumber?: number
  dueDate?: string
  status: 'pending' | 'done'
  createdAt: string
}

export interface GrowLog {
  id: string
  projectId: string
  notes: string
  ph?: number
  ec?: number
  temperature?: number
  humidity?: number
  photoUrl?: string
  createdAt: string
}

export interface NutrientPlan {
  id: string
  projectId: string
  phase: string
  targetPh: number
  targetEc: number
  nitrogenRatio: number
  phosphorusRatio: number
  potassiumRatio: number
  notes?: string
}

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  strains: Strain[]
  tasks: Task[]
  growLogs: GrowLog[]
  nutrientPlans: NutrientPlan[]
  isLoading: boolean
  error: string | null
}

interface ProjectActions {
  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  createProject: (data: Partial<Project>) => Promise<Project>
  fetchStrains: () => Promise<void>
  fetchTasks: (projectId: string) => Promise<void>
  updateTask: (taskId: string, status: 'pending' | 'done') => Promise<void>
  fetchGrowLogs: (projectId: string) => Promise<void>
  addGrowLog: (projectId: string, data: Partial<GrowLog>) => Promise<void>
  fetchNutrients: (projectId: string) => Promise<void>
  clearError: () => void
  clearCurrentProject: () => void
}

type ProjectStore = ProjectState & ProjectActions

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  strains: [],
  tasks: [],
  growLogs: [],
  nutrientPlans: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await projectsApi.getAll()
      set({ projects: response.data, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) })
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await projectsApi.getById(id)
      set({ currentProject: response.data, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) })
    }
  },

  createProject: async (data: Partial<Project>) => {
    set({ isLoading: true, error: null })
    try {
      const response = await projectsApi.create(data as Record<string, unknown>)
      const newProject: Project = response.data
      set((state) => ({
        projects: [...state.projects, newProject],
        isLoading: false,
      }))
      return newProject
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) })
      throw error
    }
  },

  fetchStrains: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await strainsApi.getAll()
      set({ strains: response.data, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) })
    }
  },

  fetchTasks: async (projectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await tasksApi.getByProject(projectId)
      set({ tasks: response.data, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) })
    }
  },

  updateTask: async (taskId: string, status: 'pending' | 'done') => {
    try {
      await tasksApi.update(taskId, { status })
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status } : t
        ),
      }))
    } catch (error) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  fetchGrowLogs: async (projectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await growLogsApi.getByProject(projectId)
      set({ growLogs: response.data, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) })
    }
  },

  addGrowLog: async (projectId: string, data: Partial<GrowLog>) => {
    set({ isLoading: true, error: null })
    try {
      const response = await growLogsApi.create(projectId, data as Record<string, unknown>)
      const newLog: GrowLog = response.data
      set((state) => ({
        growLogs: [newLog, ...state.growLogs],
        isLoading: false,
      }))
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) })
      throw error
    }
  },

  fetchNutrients: async (projectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await nutrientsApi.getByProject(projectId)
      set({ nutrientPlans: response.data, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) })
    }
  },

  clearError: () => set({ error: null }),

  clearCurrentProject: () =>
    set({ currentProject: null, tasks: [], growLogs: [], nutrientPlans: [] }),
}))
