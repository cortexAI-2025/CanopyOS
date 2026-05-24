'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/lib/utils'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isAuthenticated, loadFromStorage, error, clearError } = useAuthStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (error) {
      setLocalError(error)
      clearError()
    }
  }, [error, clearError])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError('')

    if (!name.trim()) {
      setLocalError('Name is required')
      return
    }
    if (!email.trim()) {
      setLocalError('Email is required')
      return
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    try {
      await register(email.trim(), password, name.trim())
      router.replace('/dashboard')
    } catch (err) {
      setLocalError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-emerald-500"
            >
              <path
                d="M14 2C14 2 6 8 6 16C6 20.418 9.582 24 14 24C18.418 24 22 20.418 22 16C22 8 14 2 14 2Z"
                fill="currentColor"
                opacity="0.9"
              />
              <path
                d="M14 8C14 8 10 12 10 16C10 18.209 11.791 20 14 20"
                stroke="#030712"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-2xl font-bold tracking-tight text-gray-100">
              Canopy<span className="text-emerald-500">OS</span>
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Smart Grow Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          <h1 className="text-lg font-semibold text-gray-100 mb-6">Create your account</h1>

          {localError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {localError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Full name
              </label>
              <Input
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
                <span className="text-gray-500 font-normal ml-1">(min. 8 characters)</span>
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
