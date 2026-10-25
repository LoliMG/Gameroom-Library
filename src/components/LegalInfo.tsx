// Información legal en un modal con pestañas (lo abre el botón "?" de arriba a la derecha): política de privacidad,
// cookies y almacenamiento en el navegador, y créditos. Describe lo que la web hace de verdad con los datos: si cambia
// lo que se guarda, con quién se comparte o quién envía los correos de la cuenta, hay que cambiar también este texto
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { modelsManifest } from '@/data/modelsManifest'
import '@/styles/legalInfo.css'

// Quién es la responsable y cómo contactar (para pedir el borrado de la cuenta o ejercer cualquier derecho)
const OWNER = 'Loli Mariscal'
const CONTACT_EMAIL = 'loli.mariscal@hotmail.com'
const UPDATED = '25 de octubre de 2026'

// Créditos de los modelos 3D (sus licencias CC BY piden nombrar al autor, enlazar la licencia y avisar de los
// cambios), por título
const MODEL_CREDITS = Object.values(modelsManifest)
  .map((model) => model.credit)
  .sort((a, b) => a.title.localeCompare(b.title, 'es'))
// 'CC-BY-SA-4.0' → https://creativecommons.org/licenses/by-sa/4.0/
const licenseUrl = (license: string) => {
  const [, kind, version] = /^CC-(.+)-([\d.]+)$/.exec(license) ?? []
  return kind ? `https://creativecommons.org/licenses/${kind.toLowerCase()}/${version}/` : undefined
}
const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'

const TABS = [
  { id: 'privacy', label: 'Privacidad' },
  { id: 'terms', label: 'Condiciones de uso' },
  { id: 'storage', label: 'Cookies y almacenamiento' },
  { id: 'credits', label: 'Créditos' },
] as const
type TabId = (typeof TABS)[number]['id']

const contact = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>

function PrivacyTab() {
  return (
    <>
      <section>
        <h3>Quién es responsable</h3>
        <p>
          {OWNER}, que gestiona esta web de forma personal y sin ánimo de lucro. Para cualquier pregunta sobre tus datos o para ejercer
          tus derechos, escribe a {contact}.
        </p>
      </section>

      <section>
        <h3>Qué datos se guardan</h3>
        <ul>
          <li>
            <strong>Tu cuenta:</strong> tu correo y tu contraseña. La contraseña se guarda cifrada de forma irreversible: nadie puede
            leerla. Son necesarios para crear la cuenta; sin ellos no se puede usar la sala.
          </li>
          <li>
            <strong>Tu biblioteca:</strong> los libros que añades y sus portadas, su estado de lectura, su sitio en las estanterías, tus
            subrayados, marcadores, diario de lecturas, etiquetas, lista de deseos, corcho y ajustes (incluida la ciudad que eliges para
            el tiempo de la sala).
          </li>
          <li>
            <strong>Datos técnicos:</strong> cuándo creaste la cuenta y cuándo entraste por última vez. Los proveedores que alojan la web
            registran la dirección IP de cada petición en sus registros de seguridad.
          </li>
        </ul>
        <p>
          <strong>Tus PDF y EPUB no salen de tu navegador:</strong> se guardan solo en este dispositivo y no se suben a ningún servidor.
        </p>
      </section>

      <section>
        <h3>Para qué y con qué base legal</h3>
        <ul>
          <li>
            <strong>Darte el servicio</strong> (guardar tu biblioteca, mostrártela cuando entras y enviarte los correos de la cuenta,
            como el de recuperar la contraseña): es lo que pides al crear la cuenta (ejecución del servicio, artículo 6.1.b del RGPD).
          </li>
          <li>
            <strong>Mantener la web segura y gestionar las cuentas</strong> (registros de seguridad, y bloquear o borrar cuentas que
            abusen del servicio): interés legítimo en que la web funcione para todo el mundo (artículo 6.1.f del RGPD).
          </li>
        </ul>
        <p>No hay publicidad, no se venden datos, no se hacen perfiles y no se toman decisiones automatizadas sobre ti.</p>
      </section>

      <section>
        <h3>Quién puede ver tus datos</h3>
        <p>
          Ninguna otra cuenta puede ver tu biblioteca. La administradora solo ve, para gestionar las cuentas, tu correo, cuándo te diste
          de alta y entraste por última vez y cuántos libros tienes; no ve tus libros, subrayados ni diario.
        </p>
        <p>
          Las portadas se guardan en un espacio que se puede ver con su dirección exacta (así se cargan más rápido), pero esas direcciones
          no se publican ni se pueden listar.
        </p>
      </section>

      <section>
        <h3>Proveedores</h3>
        <ul>
          <li>
            <strong>Supabase</strong>: guarda las cuentas y las bibliotecas, en servidores de la Unión Europea (Irlanda), y envía los
            correos de la cuenta.
          </li>
          <li>
            <strong>Vercel</strong>: aloja la web.
          </li>
          <li>
            <strong>Open Library y Google Books</strong>: cuando buscas un libro, el servidor de la web les envía lo que buscas (nunca tu
            correo ni tu dirección IP).
          </li>
          <li>
            <strong>Open-Meteo</strong>: tu navegador le envía el nombre de la ciudad que buscas y, después, sus coordenadas, para mostrar
            el tiempo y la luz de la sala.
          </li>
        </ul>
        <p>
          Supabase y Vercel tratan los datos solo por encargo de esta web. Son empresas de Estados Unidos: si algún dato sale de la Unión
          Europea, lo hace con las garantías del RGPD (Marco de Privacidad de Datos UE-EE. UU. o cláusulas contractuales tipo de la
          Comisión Europea).
        </p>
      </section>

      <section>
        <h3>Cuánto tiempo</h3>
        <p>
          Mientras tengas la cuenta. Cuando la borras, se borran al momento también tu biblioteca y tus portadas. Los registros de seguridad de
          los proveedores se borran solos tras el plazo que fija cada uno.
        </p>
      </section>

      <section>
        <h3>Tus derechos</h3>
        <ul>
          <li>
            <strong>Acceso y portabilidad:</strong> en Ajustes, «Exportar mi biblioteca» te descarga una copia con todos los datos de tu
            biblioteca. Para los datos de la cuenta, escribe a {contact}.
          </li>
          <li>
            <strong>Rectificación:</strong> puedes cambiar tus libros y datos desde la consola de la sala; para cambiar tu correo,
            escribe a {contact}.
          </li>
          <li>
            <strong>Supresión:</strong> en Ajustes, «Borrar mi cuenta» la borra al momento con todos sus datos.
          </li>
          <li>
            <strong>Oposición y limitación:</strong> escribe a {contact}.
          </li>
        </ul>
        <p>Te responderé en un plazo máximo de un mes.</p>
        <p>
          Si crees que no se respetan tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (
          <a href="https://www.aepd.es" target="_blank" rel="noreferrer">
            aepd.es
          </a>
          ).
        </p>
      </section>

      <section>
        <h3>Menores</h3>
        <p>Si tienes menos de 14 años, pide a tu madre, padre o tutor que cree la cuenta contigo o que te dé permiso.</p>
      </section>
    </>
  )
}

function TermsTab() {
  return (
    <>
      <section>
        <h3>Qué es esta web</h3>
        <p>
          Una sala de lectura en 3D para organizar tu biblioteca: tus libros, tus lecturas y tus notas. Es gratuita, la gestiona {OWNER}{' '}
          de forma personal y no tiene ánimo de lucro. Al crear una cuenta aceptas estas condiciones.
        </p>
      </section>

      <section>
        <h3>Tu cuenta</h3>
        <ul>
          <li>Usa un correo que sea tuyo: es el que sirve para recuperar la contraseña.</li>
          <li>Guarda bien tu contraseña y no la compartas. Lo que se haga desde tu cuenta es responsabilidad tuya.</li>
          <li>Si crees que alguien ha entrado en tu cuenta, cambia la contraseña y escribe a {contact}.</li>
        </ul>
      </section>

      <section>
        <h3>Lo que subes</h3>
        <ul>
          <li>
            Lo que añades (portadas, sinopsis, subrayados, notas, diario) sigue siendo tuyo. Solo das permiso para guardarlo y mostrártelo
            en tu sala; nadie más lo ve.
          </li>
          <li>
            Sube solo portadas, PDF y EPUB que tengas derecho a usar. Los PDF y EPUB se quedan en tu navegador, pero la responsabilidad de
            tenerlos es tuya.
          </li>
        </ul>
      </section>

      <section>
        <h3>Lo que no está permitido</h3>
        <ul>
          <li>Usar la web para algo ilegal o para guardar contenido ilícito.</li>
          <li>Intentar entrar en otras cuentas o en partes de la web que no son para ti.</li>
          <li>Sobrecargar la web, por ejemplo con programas que hagan peticiones de forma masiva.</li>
          <li>Crear cuentas en masa o con datos de otras personas.</li>
        </ul>
        <p>
          Si una cuenta incumple estas condiciones, se puede bloquear o borrar. Siempre que se pueda, se avisará antes por correo.
        </p>
      </section>

      <section>
        <h3>Disponibilidad y copias</h3>
        <p>
          La web se ofrece tal cual, sin garantías: puede haber cortes, cambios o errores, y puede cerrarse. Si se cierra, se avisará con
          tiempo para que puedas descargar tu biblioteca. Haz copias de vez en cuando con «Exportar mi biblioteca» en Ajustes (los PDF y
          EPUB no van en la copia: guárdalos tú).
        </p>
      </section>

      <section>
        <h3>Responsabilidad</h3>
        <p>
          En la medida en que lo permite la ley, la web no responde de pérdidas de datos, de cortes del servicio ni de datos inexactos de
          terceros (como los de los libros o el tiempo). Nada de esto limita los derechos que te da la ley como consumidor.
        </p>
      </section>

      <section>
        <h3>Propiedad intelectual</h3>
        <p>
          El diseño y el código de la sala son de {OWNER}. Los modelos 3D y las texturas son de sus autores y se usan con sus licencias
          (mira la pestaña Créditos).
        </p>
      </section>

      <section>
        <h3>Cambios y ley aplicable</h3>
        <p>
          Si estas condiciones cambian, la nueva versión se publica aquí con su fecha; los cambios importantes se avisarán antes. Se rigen
          por la ley española; si tienes algún problema, escribe primero a {contact}.
        </p>
      </section>
    </>
  )
}

function StorageTab() {
  return (
    <>
      <section>
        <h3>Cookies</h3>
        <p>
          Esta web no usa cookies. Tampoco tiene publicidad, herramientas de análisis ni seguimiento, ni carga fuentes, vídeos o scripts
          de otras webs.
        </p>
      </section>
      <section>
        <h3>Lo que se guarda en tu navegador</h3>
        <ul>
          <li>
            <strong>Tu sesión</strong> (almacenamiento local), para que no tengas que entrar cada vez. Se borra al cerrar sesión.
          </li>
          <li>
            <strong>Tus PDF y EPUB</strong> (IndexedDB, una base de datos del navegador), para leerlos en la sala. Solo están en este
            dispositivo: si borras los datos del navegador, desaparecen.
          </li>
        </ul>
        <p>
          Las dos cosas son necesarias para darte lo que pides, así que no hace falta pedirte permiso (artículo 22.2 de la LSSI). Puedes
          borrarlas cuando quieras desde los ajustes de tu navegador.
        </p>
      </section>
    </>
  )
}

function CreditsTab() {
  return (
    <>
      <section>
        <h3>Modelos 3D ({MODEL_CREDITS.length})</h3>
        <ul>
          {MODEL_CREDITS.map((credit) => (
            <li key={credit.url}>
              <a href={credit.url} target="_blank" rel="noreferrer">
                {credit.title}
              </a>
              , de {credit.author} (
              <a href={licenseUrl(credit.license)} target="_blank" rel="noreferrer">
                {credit.license.replace(/-/g, ' ')}
              </a>
              )
            </li>
          ))}
        </ul>
        <p>Se han adaptado para la sala: tamaño, posición y compresión de las texturas.</p>
      </section>
      <section>
        <h3>Texturas</h3>
        <ul>
          <li>
            Papel pintado:{' '}
            <a href="https://www.metmuseum.org/art/collection/search/383485" target="_blank" rel="noreferrer">
              Jasmine
            </a>
            , de William Morris (1872), fotografía de The Metropolitan Museum of Art (
            <a href={CC0} target="_blank" rel="noreferrer">
              CC0
            </a>
            ).
          </li>
          <li>
            Suelo:{' '}
            <a href="https://polyhaven.com/a/dark_wooden_planks" target="_blank" rel="noreferrer">
              Dark Wooden Planks
            </a>
            , de Poly Haven (
            <a href={CC0} target="_blank" rel="noreferrer">
              CC0
            </a>
            ).
          </li>
        </ul>
      </section>
      <section>
        <h3>Datos de los libros</h3>
        <p>
          Las búsquedas de libros usan{' '}
          <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
            Open Library
          </a>{' '}
          y{' '}
          <a href="https://books.google.com" target="_blank" rel="noreferrer">
            Google Books
          </a>
          . El tiempo de la sala viene de{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>
          .
        </p>
      </section>
    </>
  )
}

const PANELS = { privacy: PrivacyTab, terms: TermsTab, storage: StorageTab, credits: CreditsTab } satisfies Record<TabId, unknown>

function LegalInfo({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<TabId>('privacy')
  const dialogRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const select = (id: TabId) => {
    setTab(id)
    bodyRef.current?.scrollTo(0, 0)
  }
  // Flechas, Inicio y Fin entre pestañas (patrón de pestañas de WAI-ARIA)
  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex((item) => item.id === tab)
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 }[event.key]
    if (next === undefined) return
    event.preventDefault()
    const id = TABS[(next + TABS.length) % TABS.length].id
    select(id)
    document.getElementById(`legal-tab-${id}`)?.focus()
  }

  const Panel = PANELS[tab]
  return (
    <div className="legal-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="legal-modal" role="dialog" aria-modal="true" aria-labelledby="legal-title" tabIndex={-1} ref={dialogRef}>
        <header className="legal-header">
          <h2 id="legal-title">Información legal</h2>
          <button type="button" className="legal-close" aria-label="Cerrar la información legal" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="legal-tabs" role="tablist" aria-label="Secciones">
          {TABS.map((item) => (
            <button
              key={item.id}
              id={`legal-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-controls="legal-panel"
              tabIndex={tab === item.id ? 0 : -1}
              className="legal-tab"
              onClick={() => select(item.id)}
              onKeyDown={onTabKeyDown}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div id="legal-panel" className="legal-body" role="tabpanel" aria-labelledby={`legal-tab-${tab}`} tabIndex={0} ref={bodyRef}>
          <Panel />
          <p className="legal-updated">Última actualización: {UPDATED}.</p>
        </div>
      </div>
    </div>
  )
}

export default LegalInfo
