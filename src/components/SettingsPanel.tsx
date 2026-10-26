// Ajustes de la consola: los sonidos de fondo (silenciarlos o el volumen de cada uno), la ciudad del tiempo de la sala y el nivel de gráficos. La ciudad se busca con el
// geocodificador de Open-Meteo (gratis y sin clave), que da sus coordenadas: con ellas la sala calcula la hora del sol
// y pedirá el clima
import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { AppSettings, SoundVolumes } from '@/types'
import { MAX_SOUND_VOLUME } from '@/types'
import { invoke, supabase } from '@/utils/supabase'
import { deleteEbook, listEbooks } from '@/utils/ebookStore'
import { exportLibrary, importLibrary } from '@/utils/backup'
import { GRAPHICS_LEVELS, setGraphicsLevel, useGraphicsLevel } from '@/utils/graphics'

// Controles de la sala (antes, la ayuda del botón "?")
const CONTROLS: [string, string][] = [
  ['WASD', 'moverte'],
  ['Z', 'agacharte'],
  ['Arrastrar', 'mirar alrededor'],
  ['Clic en un libro', 'ver sus datos'],
  ['Arrastrar un libro', 'moverlo a cualquier sitio de las estanterías'],
  ['Ctrl + arrastrar o Ctrl + clic', 'elegir varios libros (Esc los suelta)'],
]

// Cada sonido de fondo con su nombre
const SOUNDS: { key: keyof SoundVolumes; label: string }[] = [
  { key: 'wind', label: 'Viento' },
  { key: 'rain', label: 'Lluvia' },
  { key: 'thunder', label: 'Tormenta' },
  { key: 'crickets', label: 'Grillos' },
]

/** Un resultado del geocodificador (https://open-meteo.com/en/docs/geocoding-api): solo los campos que se usan */
interface Place {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

/**
 * Copia de seguridad: descargar toda la biblioteca en un archivo y volver a cargarla (en esta cuenta o en otra). Tras
 * importar se recarga la página para que la sala lea la biblioteca al día
 */
function BackupButtons() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // null | 'exporting' | 'importing' | mensaje (error o resultado)
  const [status, setStatus] = useState<{ text: string; error: boolean } | 'exporting' | 'importing' | null>(null)
  const busy = status === 'exporting' || status === 'importing'

  async function download() {
    setStatus('exporting')
    try {
      const url = URL.createObjectURL(await exportLibrary())
      const link = document.createElement('a')
      link.href = url
      link.download = `biblioteca-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      // Se libera un momento después: si no, en algunos navegadores la descarga sale vacía
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus({ text: 'Copia descargada (sin los PDF y EPUB, que están en este navegador). Guárdala en un sitio seguro.', error: false })
    } catch (error) {
      setStatus({ text: (error as Error).message, error: true })
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // Así se puede volver a elegir el mismo archivo
    if (!file) return
    if (!window.confirm('¿Importar esta copia? Los libros, su estado y los ajustes de la copia sustituyen a los que ya tengas con el mismo ISBN; los subrayados, marcadores y lecturas se añaden.')) return
    setStatus('importing')
    try {
      const { books, covers } = await importLibrary(file)
      setStatus({ text: `Importados ${books} libros y ${covers} portadas. Recargando la sala…`, error: false })
      window.setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      setStatus({ text: (error as Error).message, error: true })
    }
  }

  return (
    <>
      <div className="add-book-form">
        <button type="button" className="dashboard-action is-quiet" disabled={busy} onClick={download}>
          {status === 'exporting' ? 'Preparando la copia…' : 'Exportar mi biblioteca'}
        </button>
        <button type="button" className="dashboard-action is-quiet" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          {status === 'importing' ? 'Importando…' : 'Importar una copia'}
        </button>
        <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={upload} />
      </div>
      {status && typeof status === 'object' && (
        <p className={`add-book-message${status.error ? ' is-error' : ''}`} role={status.error ? 'alert' : 'status'}>
          {status.text}
        </p>
      )}
    </>
  )
}

// Cerrar sesión y borrar la propia cuenta con todos sus datos (función delete-account) y los PDF y EPUB de este
// navegador. El borrado se confirma escribiendo el correo de la cuenta
function AccountActions() {
  // null = sin abrir; texto = lo escrito para confirmar
  const [typed, setTyped] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null) // null | 'deleting' | mensaje de error

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user
    if (!user || typed?.trim().toLowerCase() !== user.email?.toLowerCase()) {
      setStatus('El correo no coincide con el de tu cuenta')
      return
    }
    setStatus('deleting')
    try {
      await invoke('delete-account', {})
      // La cuenta ya no existe: se quitan sus libros electrónicos de este navegador y se cierra la sesión solo aquí
      // (App vuelve sola a la pantalla de entrada)
      const ebooks = await listEbooks(user.id).catch(() => ({}))
      await Promise.all(Object.keys(ebooks).map((isbn) => deleteEbook(user.id, isbn).catch(() => undefined)))
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  if (typed === null) {
    return (
      <div className="add-book-form settings-account">
        {/* Al cerrar la sesión, App vuelve sola a la pantalla de entrada */}
        <button type="button" className="dashboard-action is-quiet" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
        <button type="button" className="dashboard-action is-danger" onClick={() => setTyped('')}>
          Borrar mi cuenta
        </button>
      </div>
    )
  }
  const deleting = status === 'deleting'
  return (
    <form className="add-book-form settings-delete-account" onSubmit={remove}>
      <label>
        Se borrarán tu cuenta, tus libros, portadas, subrayados, diario y ajustes, y los PDF y EPUB de este navegador. No se puede
        deshacer: si quieres conservar algo, exporta antes tu biblioteca. Escribe tu correo para confirmar.
        <input type="email" className="dashboard-search" autoFocus autoComplete="off" value={typed} disabled={deleting} onChange={(event) => setTyped(event.target.value)} />
      </label>
      <button type="submit" className="dashboard-action is-danger" disabled={deleting || !typed.trim()}>
        {deleting ? 'Borrando…' : 'Borrar para siempre'}
      </button>
      <button type="button" className="dashboard-action is-quiet" disabled={deleting} onClick={() => (setTyped(null), setStatus(null))}>
        Cancelar
      </button>
      {status && !deleting && (
        <p className="add-book-message is-error" role="alert">
          {status}
        </p>
      )}
    </form>
  )
}

interface SettingsPanelProps {
  settings: AppSettings
  onSetSettings: (settings: AppSettings) => void
}

function SettingsPanel({ settings, onSetSettings }: SettingsPanelProps) {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[] | null>(null) // null = aún no se ha buscado
  const [status, setStatus] = useState<string | null>(null) // null | 'searching' | mensaje de error
  const graphics = useGraphicsLevel()

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!query.trim()) return
    setStatus('searching')
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=es&format=json`
      )
      if (!response.ok) throw new Error(`El buscador de ciudades respondió ${response.status}`)
      const json: { results?: Place[] } = await response.json()
      setPlaces(json.results ?? [])
      setStatus(null)
    } catch (error) {
      setStatus(`No se pudo buscar la ciudad: ${(error as Error).message}`)
    }
  }

  const choose = (place: Place) => {
    onSetSettings({ ...settings, city: place.name, latitude: place.latitude, longitude: place.longitude })
    setPlaces(null)
    setQuery('')
  }

  return (
    <div className="add-book settings" role="region" aria-label="Ajustes">
      <section className="settings-card" aria-labelledby="settings-sounds">
        <header className="settings-card-header">
          <h3 id="settings-sounds" className="settings-title">
            Sonidos
          </h3>
          <button
            type="button"
            className={`dashboard-action settings-mute${settings.sound ? ' is-quiet' : ''}`}
            onClick={() => onSetSettings({ ...settings, sound: !settings.sound })}
          >
            {settings.sound ? '🔇 Silenciar todos' : '🔊 Activar los sonidos'}
          </button>
        </header>
        <div className="settings-volumes">
          {SOUNDS.map(({ key, label }) => {
            const percent = Math.round(settings.volumes[key] * 100)
            return (
              <label key={key} className="settings-volume">
                <span>{label}</span>
                <input
                  type="range"
                  min={0}
                  max={MAX_SOUND_VOLUME * 100}
                  step={5}
                  value={percent}
                  disabled={!settings.sound}
                  aria-valuetext={`${percent} %`}
                  onChange={(event) => onSetSettings({ ...settings, volumes: { ...settings.volumes, [key]: Number(event.target.value) / 100 } })}
                />
                <output>{percent} %</output>
              </label>
            )
          })}
        </div>
      </section>

      <section className="settings-card" aria-labelledby="settings-weather">
        <header className="settings-card-header">
          <h3 id="settings-weather" className="settings-title">
            Tiempo de la sala
          </h3>
          <span className="add-book-message">
            <strong>{settings.city}</strong> ({settings.latitude.toFixed(2)}, {settings.longitude.toFixed(2)})
          </span>
        </header>
        <form className="add-book-form" onSubmit={search}>
          <input
            type="search"
            className="dashboard-search"
            placeholder="Buscar otra ciudad…"
            aria-label="Buscar ciudad"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="dashboard-action" disabled={status === 'searching'}>
            {status === 'searching' ? 'Buscando…' : 'Buscar'}
          </button>
        </form>
        {status && status !== 'searching' && (
          <p className="add-book-message is-error" role="alert">
            {status}
          </p>
        )}
        {places?.length === 0 && <p className="add-book-message">No se ha encontrado ninguna ciudad con ese nombre.</p>}
        {places && places.length > 0 && (
          <ul className="settings-places">
            {places.map((place) => (
              <li key={place.id}>
                <button type="button" className="dashboard-filter" onClick={() => choose(place)}>
                  {[place.name, place.admin1, place.country].filter(Boolean).join(', ')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="settings-card" aria-labelledby="settings-graphics">
        <header className="settings-card-header">
          <h3 id="settings-graphics" className="settings-title">
            Gráficos
          </h3>
          <div className="dashboard-segmented settings-graphics" role="group" aria-labelledby="settings-graphics">
            {GRAPHICS_LEVELS.map(({ value, label }) => (
              <button key={value} type="button" className="dashboard-filter" aria-pressed={graphics === value} onClick={() => setGraphicsLevel(value)}>
                {label}
              </button>
            ))}
          </div>
        </header>
        <p className="add-book-message">
          Si la sala te va lenta, ponlo en bajo: quita el brillo de las llamas y las sombras, y suaviza menos los bordes.
          Se guarda solo en este navegador.
        </p>
      </section>

      <section className="settings-card" aria-labelledby="settings-controls">
        <h3 id="settings-controls" className="settings-title">
          Controles
        </h3>
        <dl className="settings-controls">
          {CONTROLS.map(([keys, action]) => (
            <div key={keys}>
              <dt>{keys}</dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="settings-card" aria-labelledby="settings-backup">
        <h3 id="settings-backup" className="settings-title">
          Copia de seguridad
        </h3>
        <BackupButtons />
      </section>

      <section className="settings-card" aria-labelledby="settings-account">
        <h3 id="settings-account" className="settings-title">
          Cuenta
        </h3>
        <AccountActions />
      </section>
    </div>
  )
}

export default SettingsPanel
