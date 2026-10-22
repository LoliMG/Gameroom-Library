// Ajustes de la consola: los sonidos de fondo (silenciarlos o el volumen de cada uno) y la ciudad del tiempo de la sala. La ciudad se busca con el
// geocodificador de Open-Meteo (gratis y sin clave), que da sus coordenadas: con ellas la sala calcula la hora del sol
// y pedirá el clima
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AppSettings, SoundVolumes } from '@/types'
import { MAX_SOUND_VOLUME } from '@/types'

// Cada sonido de fondo con su nombre y cuándo suena
const SOUNDS: { key: keyof SoundVolumes; label: string; when: string }[] = [
  { key: 'wind', label: 'Viento', when: 'siempre, de día y de noche' },
  { key: 'rain', label: 'Lluvia', when: 'cuando llueve' },
  { key: 'thunder', label: 'Tormenta', when: 'truenos cuando hay tormenta' },
  { key: 'crickets', label: 'Grillos', when: 'de noche sin lluvia' },
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

interface SettingsPanelProps {
  settings: AppSettings
  onSetSettings: (settings: AppSettings) => void
}

function SettingsPanel({ settings, onSetSettings }: SettingsPanelProps) {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[] | null>(null) // null = aún no se ha buscado
  const [status, setStatus] = useState<string | null>(null) // null | 'searching' | mensaje de error

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
    <section className="add-book" aria-label="Ajustes">
      <h3 className="settings-title">Sonidos</h3>
      <div className="add-book-form">
        <button
          type="button"
          className={`dashboard-action${settings.sound ? ' is-quiet' : ''}`}
          onClick={() => onSetSettings({ ...settings, sound: !settings.sound })}
        >
          {settings.sound ? '🔇 Silenciar todos' : '🔊 Activar los sonidos'}
        </button>
        <span className="add-book-message">{settings.sound ? 'El volumen de cada sonido (100 % es el normal):' : 'Los sonidos de fondo están silenciados.'}</span>
      </div>
      <div className="settings-volumes">
        {SOUNDS.map(({ key, label, when }) => {
          const percent = Math.round(settings.volumes[key] * 100)
          return (
            <label key={key} className="settings-volume">
              <span>
                {label} <small>({when})</small>
              </span>
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

      <h3 className="settings-title">Tiempo de la sala</h3>
      <p className="add-book-message">
        Ciudad: <strong>{settings.city}</strong> ({settings.latitude.toFixed(2)}, {settings.longitude.toFixed(2)}). La luz, el cielo y
        el clima tras el ventanal siguen la hora y el tiempo de esta ciudad.
      </p>
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
  )
}

export default SettingsPanel
