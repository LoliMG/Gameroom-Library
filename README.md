# Rincón de Lectura

Proyecto interactivo 3D desarrollado con **React**, **Vite** y **React Three Fiber (R3F)**. Proporciona una base limpia y modular para construir una experiencia de lectura inmersiva en tres dimensiones con Three.js.

## Instalación

Instala las dependencias del proyecto ejecutando:

```bash
npm install
```

## Ejecución

Para iniciar el servidor de desarrollo local:

```bash
npm run dev
```

Para compilar la aplicación para producción:

```bash
npm run build
```

Para previsualizar la compilación de producción localmente:

```bash
npm run preview
```

## Estructura de Carpetas

```text
src/
├── assets/             # Imágenes, texturas y modelos 3D
├── components/         # Componentes de interfaz HTML (paneles, botones)
├── data/               # Datos de la aplicación (libros, catálogo)
├── hooks/              # Hooks personalizados de React
├── scene/              # Todo lo que se renderiza dentro del <Canvas>
│   ├── core/           # Composición de la escena, cámara en primera persona, luces, postprocesado y paleta
│   ├── room/           # Estructura de la sala: suelo y paredes, ventanal, puerta, techo, rodapiés, alfombra
│   ├── shelves/        # Estanterías de la pared a y mueble bajo empotrado
│   ├── books/          # Libros (lomos y contraportadas generados) y pantalla de la biblioteca
│   ├── decor/          # Rincón de lectura y decoración: sofá, repisas, velas, figuras, plantas
│   ├── garden/         # Jardín al atardecer: cielo, colinas, muro, fuente, banco, farolillos
│   └── shared/         # Piezas reutilizables para repetir modelos y geometrías (instanciado)
├── styles/             # Estilos CSS globales
│   └── global.css      # Reset mínimo para visualización a pantalla completa
├── App.jsx             # Montaje del <Canvas> y la escena
└── main.jsx            # Punto de entrada de la aplicación
```

## 📜 Documentación y Créditos

- **Catálogo Completo de Libros**: Consulta el listado detallado de los libros de la base de datos en [docs/BOOKS.md](docs/BOOKS.md).
- **Créditos y Atribuciones 3D**: Consulta todos los autores, enlaces y licencias de los modelos y texturas utilizados en [docs/CREDITS.md](docs/CREDITS.md).
