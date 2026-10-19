// Llamadas a la API del servidor (server/library.ts), comunes al lector (readerApi.ts) y a la consola (catalogApi.ts)

/** fetch que lanza un error con el mensaje del servidor ({ error: '…' }) si la respuesta no es correcta */
export async function request(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, options)
  if (!response.ok) {
    const body: { error?: string } = await response.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${response.status}`)
  }
  return response
}

/** Opciones de fetch para enviar body como JSON con ese método (POST, PUT, PATCH…) */
export const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
