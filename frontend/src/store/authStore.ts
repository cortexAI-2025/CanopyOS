import { create } from 'zustand'
import { authApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'

export interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  loadFromStorage: () => void
  clearError: () => void
}

type AuthStore = AuthState & AuthActions

const TOKEN_KEY = 'canopyos_token'
const USER_KEY = 'canopyos_user'

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  loadFromStorage: () => {
    if (typeof window === 'undefined') return
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const userRaw = localStorage.getItem(USER_KEY)
      if (token && userRaw) {
        const user: User = JSON.parse(userRaw)
        set({ user, token, isAuthenticated: true })
      }
    } catch {
      // Corrupted storage — clear it
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.login(email, password)
      const { token, user } = response.data
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      set({ user, token, isAuthenticated: true, isLoading: false, error: null })
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error), isAuthenticated: false })
      throw error
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.register(email, password, name)
      const { token, user } = response.data
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      set({ user, token, isAuthenticated: true, isLoading: false, error: null })
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error), isAuthenticated: false })
      throw error
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
    set({ user: null, token: null, isAuthenticated: false, error: null })
  },

  clearError: () => set({ error: null }),
}))
