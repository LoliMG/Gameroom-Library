// Pantalla de entrada: iniciar sesión, crear cuenta, pedir el enlace para cambiar la contraseña y, al volver de ese
// enlace, poner la nueva. Las cuentas las gestiona Supabase Auth (correo + contraseña)
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '@/utils/supabase'
import '@/styles/authScreen.css'

type Mode = 'signin' | 'signup' | 'forgot'

// Mínimo propio, más estricto que el de Supabase (6)
const MIN_PASSWORD = 8

// Errores de Supabase más habituales, en español (los demás se muestran con un mensaje general)
const ERRORS: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed: 'Aún no has confirmado tu correo: abre el enlace que te hemos enviado.',
  user_already_exists: 'Ya hay una cuenta con ese correo. Inicia sesión.',
  weak_password: `La contraseña es demasiado débil (mínimo ${MIN_PASSWORD} caracteres).`,
  over_email_send_rate_limit: 'Se han enviado demasiados correos. Espera unos minutos y vuelve a intentarlo.',
  over_request_rate_limit: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
}
const errorText = (error: AuthError) => ERRORS[error.code ?? ''] ?? `No se ha podido completar: ${error.message}`

const TITLES: Record<Mode, string> = { signin: 'Entrar', signup: 'Crear cuenta', forgot: 'Recuperar contraseña' }

interface AuthScreenProps {
  /** Se ha entrado con el enlace de "he olvidado mi contraseña": se pide la nueva */
  recovering: boolean
  onRecovered: () => void
}

function AuthScreen({ recovering, onRecovered }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Ver lo que se escribe en la contraseña (botón "Mostrar" dentro del campo)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  // Aviso de error (role="alert") o de que todo ha ido bien (role="status")
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const changeMode = (next: Mode) => {
    setMode(next)
    setMessage(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    // Los enlaces de los correos vuelven a esta misma web (tiene que estar en las URL permitidas de Supabase Auth)
    const redirectTo = window.location.origin
    const { error } = recovering
      ? await supabase.auth.updateUser({ password })
      : mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : mode === 'signup'
          ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
          : await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setBusy(false)
    if (error) return setMessage({ text: errorText(error), error: true })
    // Al iniciar sesión, App cambia sola a la sala; en los demás casos se avisa de lo que sigue
    if (recovering) onRecovered()
    else if (mode === 'signup') setMessage({ text: 'Cuenta creada. Te hemos enviado un correo para confirmarla: abre el enlace y vuelve aquí.', error: false })
    else if (mode === 'forgot') setMessage({ text: 'Si hay una cuenta con ese correo, te llegará un enlace para poner una contraseña nueva.', error: false })
  }

  const title = recovering ? 'Nueva contraseña' : TITLES[mode]
  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit} aria-labelledby="auth-title">
        <h1 id="auth-title" className="auth-title">
          {title}
        </h1>
        {!recovering && (
          <label className="auth-field">
            Correo
            <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
        )}
        {(recovering || mode !== 'forgot') && (
          <label className="auth-field">
            {recovering ? 'Contraseña nueva' : 'Contraseña'}
            <span className="auth-password">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={mode === 'signin' && !recovering ? undefined : MIN_PASSWORD}
                autoComplete={mode === 'signin' && !recovering ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-pressed={showPassword}
                aria-label="Mostrar la contraseña"
                onClick={() => setShowPassword((shown) => !shown)}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </span>
          </label>
        )}
        {message && (
          <p className={`auth-message${message.error ? ' is-error' : ''}`} role={message.error ? 'alert' : 'status'}>
            {message.text}
          </p>
        )}
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Un momento…' : recovering ? 'Guardar contraseña' : mode === 'forgot' ? 'Enviar enlace' : title}
        </button>
        {!recovering && (
          <div className="auth-links">
            {mode !== 'signin' && (
              <button type="button" onClick={() => changeMode('signin')}>
                Ya tengo cuenta
              </button>
            )}
            {mode !== 'signup' && (
              <button type="button" onClick={() => changeMode('signup')}>
                Crear una cuenta
              </button>
            )}
            {mode !== 'forgot' && (
              <button type="button" onClick={() => changeMode('forgot')}>
                He olvidado mi contraseña
              </button>
            )}
          </div>
        )}
      </form>
    </main>
  )
}

export default AuthScreen
