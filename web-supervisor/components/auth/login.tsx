'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { authenticateUser } from '@/app/actions'

interface LoginProps {
  onLoginSuccess: () => void
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('supervisor@gmail.com')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const { toast } = useToast()

  // Fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Por favor ingrese su correo y contraseña.",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const res = await authenticateUser(email, password)

      if (res.success && res.user) {
        localStorage.setItem(
          'supervisor_session',
          JSON.stringify({
            email: res.user.email,
            name: res.user.name,
            role: res.user.role,
            rememberMe,
            timestamp: Date.now()
          })
        )
        toast({
          title: "¡Acceso concedido!",
          description: `Bienvenido a la Torre de Control Venado, ${res.user.name}.`,
        })
        onLoginSuccess()
      } else {
        toast({
          variant: "destructive",
          title: "Error de credenciales",
          description: res.error || "Correo o contraseña incorrectos.",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: err.message || "No se pudo establecer conexión con el servidor.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-theme min-h-screen bg-background font-body-md text-on-background flex w-full">
      <main className="flex min-h-screen w-full">
        {/* Left Side: Visual/Brand */}
        <section className="hidden lg:flex lg:w-1/2 relative bg-[#092140] flex-col justify-between overflow-hidden">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              alt="Operaciones Logísticas" 
              className="w-full h-full object-cover" 
              src="/bg_login.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#092140]/60 via-[#092140]/20 to-transparent"></div>
          </div>
          <div className="relative z-10 p-margin-page flex flex-col h-full bg-pattern">
            {/* Branding Header */}
            <div className="flex items-center gap-stack-gap">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2 shadow-md shrink-0">
                <img src="/logo.png" alt="Grupo Venado Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="font-headline-lg text-headline-lg text-surface-bright leading-none">Torre de Control</h1>
                <p className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-widest mt-1">Operaciones de Campo</p>
              </div>
            </div>
            {/* Central Message */}
            <div className="mt-auto max-w-lg mb-margin-page">
              <h2 className="font-display text-display text-surface-bright mb-stack-gap">
                Visibilidad total en tiempo real para decisiones críticas.
              </h2>
              <p className="font-body-lg text-body-lg text-surface-variant max-w-md">
                Optimice su logística, monitoree reponedores y gestione rutas con la plataforma de control de campo más avanzada del mercado.
              </p>
            </div>
            {/* Status Indicator (Mocking live status) */}
            <div className="flex gap-gutter mt-auto pt-gutter border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-fixed animate-pulse"></span>
                <span className="font-label-sm text-label-sm text-surface-dim">Sistema Activo</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Login Form */}
        <section className="w-full lg:w-1/2 flex items-center justify-center p-gutter bg-surface">
          <div 
            className="w-full max-w-[440px] transition-all duration-700 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
            }}
          >
            {/* Mobile Branding (Only visible on small screens) */}
            <div className="flex lg:hidden items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-md shrink-0">
                <img src="/logo.png" alt="Grupo Venado Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="font-headline-md text-headline-md text-on-surface">Torre de Control</h1>
            </div>
            <div className="space-y-stack-gap mb-10">
              <h2 className="font-display-mobile lg:font-display text-display-mobile lg:text-display text-on-surface">Iniciar sesión</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">Ingrese sus credenciales corporativas para acceder al panel de mando.</p>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div className="space-y-2">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block" htmlFor="email">Correo Institucional</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">mail</span>
                  <input 
                    className="w-full pl-12 pr-4 py-4 bg-white border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body-md text-on-surface placeholder:text-outline/60" 
                    id="email" 
                    name="email" 
                    placeholder="usuario@empresa.com" 
                    required 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block" htmlFor="password">Contraseña</label>
                  <a className="font-label-sm text-label-sm text-primary hover:text-on-primary-fixed-variant transition-colors" href="#" onClick={(e) => e.preventDefault()}>¿Olvidó su contraseña?</a>
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                  <input 
                    className="w-full pl-12 pr-12 py-4 bg-white border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body-md text-on-surface placeholder:text-outline/60" 
                    id="password" 
                    name="password" 
                    placeholder="••••••••••••" 
                    required 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors flex items-center justify-center p-1" 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              
              {/* Remember Me & Security */}
              <div className="flex items-center">
                <input 
                  className="w-4 h-4 text-primary bg-white border-outline-variant rounded focus:ring-primary accent-[#006948]" 
                  id="remember" 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="ml-2 font-body-md text-on-surface-variant select-none text-sm cursor-pointer" htmlFor="remember">Mantener sesión iniciada por 24 horas</label>
              </div>
              
              {/* Action Button (Primary Emerald) */}
              <button 
                className="w-full py-4 bg-primary text-on-primary rounded-lg font-headline-md text-headline-md hover:bg-on-primary-fixed-variant active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer" 
                type="submit"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Accediendo...' : 'Acceder al Panel'}</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </form>
            
            {/* Footer Help */}
            <div className="mt-margin-page pt-stack-gap border-t border-outline-variant/30 text-center">
              <p className="font-body-md text-on-surface-variant">
                ¿Tiene problemas para ingresar? <br/>
                Contacte a <span className="text-on-surface font-bold">soporte@torredecontrol.com</span>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
