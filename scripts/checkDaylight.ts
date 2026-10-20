// Comprobación rápida del ciclo del día (posición del sol y atmósfera según su altura) y del tiempo (nubes, lluvia, nieve):
// node scripts/checkDaylight.ts
import assert from 'node:assert/strict'
import { sunPosition, sunDirection, paletteForElevation, applyWeather, CLEAR_WEATHER, DAY, GOLDEN, NIGHT } from '../src/scene/core/ambiencePalette.ts'
import { weatherFromForecast } from '../src/utils/weatherApi.ts'
import { Color } from 'three'

const MALAGA = { latitude: 36.7213, longitude: -4.4214 }
const at = (iso: string) => sunPosition(new Date(iso), MALAGA.latitude, MALAGA.longitude)
const near = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual.toFixed(2)} no está a ±${tolerance} de ${expected}`)

// Mediodía solar del solsticio de verano (12:19 UTC en Málaga): sol al sur a 90 - 36.72 + 23.44 = 76.7°
const summerNoon = at('2026-06-21T12:19:00Z')
near(summerNoon.elevation, 76.7, 1)
near(summerNoon.azimuth, 180, 3)
// Puesta de sol de ese día (21:41 hora peninsular = 19:41 UTC): en el horizonte, hacia el oeste-noroeste
const summerSunset = at('2026-06-21T19:41:00Z')
near(summerSunset.elevation, -0.5, 1.2)
near(summerSunset.azimuth, 300, 3)
// Equinoccio de primavera a mediodía solar: 90 - 36.72 = 53.3°
near(at('2026-03-20T12:25:00Z').elevation, 53.3, 1)
// Medianoche: el sol muy por debajo del horizonte
assert.ok(at('2026-10-19T23:00:00Z').elevation < -30)

// En la escena el oeste es +Z (el ventanal) y el norte -X
const west = sunDirection(0, 270)
near(west.z, 1, 1e-9)
near(west.x, 0, 1e-9)
near(sunDirection(0, 0).x, -1, 1e-9)
near(sunDirection(90, 123).y, 1, 1e-9)

// Atmósfera: día con el sol alto, noche con el sol muy bajo y mezcla a medio camino (sin saltos)
assert.equal(paletteForElevation(40), DAY)
assert.equal(paletteForElevation(-30), NIGHT)
assert.equal(paletteForElevation(2).skyTop, GOLDEN.skyTop)
const between = paletteForElevation(7) // A medio camino entre día (12°) y hora dorada (2°)
near(between.lightIntensity, (DAY.lightIntensity + GOLDEN.lightIntensity) / 2, 1e-9)
assert.ok(paletteForElevation(-8).stars > 0 && paletteForElevation(-8).stars < 1)

// Tiempo de Open-Meteo: código 3 (cubierto) sin lluvia; código 63 (lluvia moderada); llovizna con mucha agua medida;
// niebla (45); y una respuesta vacía, que cuenta como despejado
const overcast = weatherFromForecast({ current: { weather_code: 3, cloud_cover: 100, precipitation: 0, wind_speed_10m: 4.7, temperature_2m: 17 } })
assert.deepEqual(overcast, { cloudCover: 1, rain: 0, snow: 0, fog: false, thunder: false, windSpeed: 4.7, temperature: 17 })
assert.equal(weatherFromForecast({ current: { weather_code: 95 } }).thunder, true)
assert.equal(weatherFromForecast({ current: { weather_code: 63 } }).rain, 0.65)
assert.equal(weatherFromForecast({ current: { weather_code: 51, precipitation: 1.5 } }).rain, 1) // 6 mm/h: fuerte
assert.equal(weatherFromForecast({ current: { weather_code: 45 } }).fog, true)
// Nieve: va a snow y no a rain (también lo que ha caído, que con código de nieve es nieve)
const snowing = weatherFromForecast({ current: { weather_code: 73, precipitation: 2 } })
assert.equal(snowing.rain, 0)
assert.equal(snowing.snow, 1)
assert.equal(weatherFromForecast({ current: { weather_code: 71 } }).snow, 0.35)
assert.equal(weatherFromForecast({ current: { weather_code: 63 } }).snow, 0)
assert.deepEqual(weatherFromForecast({}), CLEAR_WEATHER)

// Nubes: despejado no cambia nada; cubierto apaga la luz y tapa las estrellas
assert.equal(applyWeather(DAY, CLEAR_WEATHER), DAY)
const cloudyNight = applyWeather(NIGHT, overcast)
assert.equal(cloudyNight.stars, 0)
assert.ok(applyWeather(DAY, overcast).lightIntensity < DAY.lightIntensity)
assert.notEqual(applyWeather(DAY, overcast).skyTop, DAY.skyTop)
// La nieve blanquea el prado: más claro que con el cielo solo cubierto
const lightness = (color: string) => new Color(color).getHSL({ h: 0, s: 0, l: 0 }).l
assert.ok(lightness(applyWeather(DAY, snowing).meadowNear) > lightness(applyWeather(DAY, overcast).meadowNear))

console.log('Ciclo del día y tiempo (sol, atmósfera, nubes, lluvia y nieve): OK')
