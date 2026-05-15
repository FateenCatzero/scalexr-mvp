'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const signupSchema = z.object({
  restaurantSlug: z.string().min(1, 'Restaurant slug is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginValues = z.infer<typeof loginSchema>
type SignupValues = z.infer<typeof signupSchema>

export default function AdminLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const signupForm = useForm<SignupValues>({ resolver: zodResolver(signupSchema) })

  const handleForgotPassword = async () => {
    if (!resetEmail) { setError('Enter your email above first'); return }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setResetSent(true)
  }

  const switchMode = (next: 'login' | 'signup' | 'forgot') => {
    setError(null)
    setShowPassword(false)
    if (next === 'signup') {
      // Carry email over, clear password, keep slug as-is
      const email = loginForm.getValues('email')
      signupForm.setValue('email', email)
      signupForm.setValue('password', '')
    } else {
      // Carry email over, clear password
      const email = signupForm.getValues('email')
      loginForm.setValue('email', email)
      loginForm.setValue('password', '')
    }
    setMode(next)
  }

  const handleLogin = async (values: LoginValues) => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Login failed'); setLoading(false); return }
    const { data } = await supabase
      .from('restaurant_users')
      .select('restaurants(slug)')
      .eq('user_id', user.id)
      .single()
    const r = Array.isArray(data?.restaurants) ? data.restaurants[0] : data?.restaurants
    const slug = (r as { slug: string } | null)?.slug
    if (slug) {
      router.push(`/admin/${slug}`)
    } else {
      setError('No restaurant linked to this account.')
      setLoading(false)
    }
  }

  const handleSignup = async (values: SignupValues) => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, slug')
      .eq('slug', values.restaurantSlug)
      .single()
    if (!restaurant) {
      setError(`No restaurant found with slug "${values.restaurantSlug}"`)
      setLoading(false)
      return
    }

    const { error: authError, data: authData } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    const userId = authData.user?.id
    if (!userId) { setError('Signup failed'); setLoading(false); return }

    // Create public user profile first (required by FK constraint)
    await supabase.from('users').insert({
      id: userId,
      email: values.email,
      role: 'restaurant_admin',
    })

    const { error: linkError } = await supabase
      .from('restaurant_users')
      .insert({ user_id: userId, restaurant_id: restaurant.id, role: 'restaurant_admin' })
    if (linkError) {
      setError('Account created but could not link to restaurant. Try logging in.')
      setLoading(false)
      return
    }

    router.push(`/admin/${restaurant.slug}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">ScaleXR Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === 'login' ? 'Sign in to your restaurant' : mode === 'signup' ? 'Create an admin account' : 'Reset your password'}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                {...loginForm.register('email')}
              />
              {loginForm.formState.errors.email && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10"
                  {...loginForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        ) : mode === 'forgot' ? (
          <div className="space-y-4">
            {resetSent ? (
              <div className="text-center py-4">
                <p className="font-medium">Reset link sent!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check your email for a password reset link.
                </p>
                <button
                  onClick={() => { setMode('login'); setResetSent(false) }}
                  className="text-sm underline hover:text-foreground mt-3 transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button className="w-full" onClick={handleForgotPassword} disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                {...signupForm.register('email')}
              />
              {signupForm.formState.errors.email && (
                <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-slug">Restaurant slug</Label>
              <Input
                id="signup-slug"
                placeholder="demo"
                autoComplete="off"
                {...signupForm.register('restaurantSlug')}
              />
              <p className="text-xs text-muted-foreground">The URL identifier for your restaurant</p>
              {signupForm.formState.errors.restaurantSlug && (
                <p className="text-xs text-destructive">{signupForm.formState.errors.restaurantSlug.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10"
                  {...signupForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              {signupForm.formState.errors.password && (
                <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
              )}
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        )}

        {mode !== 'forgot' && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              className="underline hover:text-foreground transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        )}
        {mode === 'forgot' && !resetSent && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            <button
              onClick={() => switchMode('login')}
              className="underline hover:text-foreground transition-colors"
            >
              Back to sign in
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
