// Ajustes de la consola: la ciudad del tiempo de la sala. Se busca con el geocodificador de Open-Meteo (gratis y sin
// clave), que da sus coordenadas: con ellas la sala pedirá el clima y la hora de salida y puesta del sol
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AppSettings } from '@/types'

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
    onSetSettings({ city: place.name, latitude: place.latitude, longitude: place.longitude })
    setPlaces(null)
    setQuery('')
  }

  return (
    <section className="add-book" aria-label="Ajustes">
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
