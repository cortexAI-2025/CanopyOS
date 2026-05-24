import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach JWT from localStorage
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('canopyos_token')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('canopyos_token')
      localStorage.removeItem('canopyos_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me'),
}

// Projects endpoints
export const projectsApi = {
  getAll: () => api.get('/projects'),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post('/projects', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
}

// Strains endpoints
export const strainsApi = {
  getAll: () => api.get('/strains'),
  getById: (id: string) => api.get(`/strains/${id}`),
}

// Tasks endpoints
export const tasksApi = {
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/tasks`),
  update: (taskId: string, data: Record<string, unknown>) =>
    api.patch(`/tasks/${taskId}`, data),
}

// Grow Logs endpoints
export const growLogsApi = {
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/grow-logs`),
  create: (projectId: string, data: Record<string, unknown>) =>
    api.post(`/projects/${projectId}/grow-logs`, data),
}

// Nutrients endpoints
export const nutrientsApi = {
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/nutrients`),
}
