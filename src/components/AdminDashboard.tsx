// Panel de administración: botón "Dashboard" arriba a la izquierda (solo para la cuenta admin) que abre un modal grande
// encima de la sala con el resumen, el espacio usado y las cuentas (buscar, bloquear y borrar).
// No muestra nada de las bibliotecas de los demás: solo correos, fechas y cuántos libros tienen.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { deleteUserAccount, fetchAdminSummary, fetchAdminUsers, isAdminSession, setUserBlocked } from '@/utils/adminApi'
import type { AdminSummary, AdminUser } from '@/utils/adminApi'
import '@/styles/adminDashboard.css'

// Límites del plan gratuito de Supabase (para las barras de espacio): 500 MB de base de datos y 1 GB de archivos
const DB_LIMIT_BYTES = 500 * 1024 * 1024
const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Nunca')

/** Barra de espacio usado frente al límite */
function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percent = Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="admin-usage">
      <div className="admin-usage-label">
        <span>{label}</span>
        <span>
          {megabytes(used)} de {megabytes(limit)} ({percent} %)
        </span>
      </div>
      <div className="admin-usage-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className={`admin-usage-fill${percent >= 80 ? ' is-high' : ''}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function AdminModal({ selfId, onClose }: { selfId: string; onClose: () => void }) {
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  // Cuenta que se está borrando: lo escrito para confirmar (tiene que ser su correo)
  const [deleting, setDeleting] = useState<{ id: string; typed: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const load = useCallback(
    () =>
      Promise.all([fetchAdminSummary(), fetchAdminUsers()])
        .then(([loadedSummary, loadedUsers]) => {
          setSummary(loadedSummary)
          setUsers(loadedUsers)
          setError(null)
        })
        .catch((failure: Error) => setError(failure.message)),
    []
  )
  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Bloquear, desbloquear o borrar: después se vuelve a pedir todo para ver los números al día
  async function act(id: string, action: () => Promise<void>) {
    setBusyId(id)
    try {
      await action()
      setDeleting(null)
      await load()
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const search = query.trim().toLowerCase()
  const shown = users?.filter((user) => user.email.toLowerCase().includes(search)) ?? []

  return (
    <div className="admin-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-title" tabIndex={-1} ref={dialogRef}>
        <header className="admin-header">
          <h2 id="admin-title">Panel de administración</h2>
          <button type="button" className="admin-close" aria-label="Cerrar el panel" onClick={onClose}>
            ✕
          </button>
        </header>

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}

        <section aria-labelledby="admin-summary-title">
          <h3 id="admin-summary-title">Resumen</h3>
          {summary ? (
            <dl className="admin-stats">
              <div>
                <dt>Cuentas</dt>
                <dd>{summary.users}</dd>
              </div>
              <div>
                <dt>Activas (7 días)</dt>
                <dd>{summary.active7}</dd>
              </div>
              <div>
                <dt>Activas (30 días)</dt>
                <dd>{summary.active30}</dd>
              </div>
              <div>
                <dt>Libros en total</dt>
                <dd>{summary.books}</dd>
              </div>
            </dl>
          ) : (
            !error && <p className="admin-muted">Cargando…</p>
          )}
        </section>

        {summary && (
          <section aria-labelledby="admin-storage-title">
            <h3 id="admin-storage-title">Espacio</h3>
            <UsageBar label="Base de datos" used={summary.dbBytes} limit={DB_LIMIT_BYTES} />
            <UsageBar label="Portadas" used={summary.coverBytes} limit={STORAGE_LIMIT_BYTES} />
            <p className="admin-muted">Los PDF y EPUB no cuentan: se guardan en el navegador de cada persona.</p>
          </section>
        )}

        <section aria-labelledby="admin-users-title">
          <h3 id="admin-users-title">Cuentas</h3>
          <input
            type="search"
            className="admin-search"
            placeholder="Buscar por correo…"
            aria-label="Buscar cuentas por correo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {users && shown.length === 0 && <p className="admin-muted">Ninguna cuenta coincide.</p>}
          {shown.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Correo</th>
                    <th scope="col">Alta</th>
                    <th scope="col">Último acceso</th>
                    <th scope="col">Libros</th>
                    <th scope="col">Estado</th>
                    <th scope="col">
                      <span className="admin-visually-hidden">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((user) => {
                    const self = user.id === selfId
                    const confirming = deleting?.id === user.id
                    return (
                      <tr key={user.id} className={user.blocked ? 'is-blocked' : undefined}>
                        <td>{user.email}</td>
                        <td>{shortDate(user.created_at)}</td>
                        <td>{shortDate(user.last_sign_in_at)}</td>
                        <td>{user.books}</td>
                        <td>{self ? 'Tú' : user.blocked ? 'Bloqueada' : 'Activa'}</td>
                        <td className="admin-actions">
                          {!self && !confirming && (
                            <>
                              <button type="button" disabled={busyId === user.id} onClick={() => act(user.id, () => setUserBlocked(user.id, !user.blocked))}>
                                {user.blocked ? 'Desbloquear' : 'Bloquear'}
                              </button>
                              <button type="button" className="is-danger" disabled={busyId === user.id} onClick={() => setDeleting({ id: user.id, typed: '' })}>
                                Borrar
                              </button>
                            </>
                          )}
                          {confirming && (
                            <form
                              className="admin-confirm"
                              onSubmit={(event) => {
                                event.preventDefault()
                                act(user.id, () => deleteUserAccount(user.id))
                              }}
                            >
                              <label>
                                Escribe <strong>{user.email}</strong> para borrar la cuenta con todos sus datos (no se puede deshacer)
                                <input autoFocus value={deleting.typed} onChange={(event) => setDeleting({ id: user.id, typed: event.target.value })} />
                              </label>
                              <button type="submit" className="is-danger" disabled={deleting.typed.trim() !== user.email || busyId === user.id}>
                                {busyId === user.id ? 'Borrando…' : 'Borrar para siempre'}
                              </button>
                              <button type="button" onClick={() => setDeleting(null)}>
                                Cancelar
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/** Botón "Dashboard" y su modal. Para cualquier otra cuenta no dibuja nada */
function AdminDashboard() {
  const [selfId, setSelfId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSelfId(isAdminSession(data.session) ? data.session!.user.id : null))
  }, [])
  const close = useCallback(() => setOpen(false), [])
  if (!selfId) return null
  return (
    <>
      <button type="button" className="admin-dashboard-button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Dashboard
      </button>
      {open && <AdminModal selfId={selfId} onClose={close} />}
    </>
  )
}

export default AdminDashboard
