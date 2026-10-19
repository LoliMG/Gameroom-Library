// Comprobación rápida del ciclo del día (posición del sol y atmósfera según su altura): node scripts/checkDaylight.ts
import assert from 'node:assert/strict'
import { sunPosition, sunDirection, paletteForElevation, DAY, GOLDEN, NIGHT } from '../src/scene/core/ambiencePalette.ts'

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

console.log('Ciclo del día (sol y atmósfera): OK')
