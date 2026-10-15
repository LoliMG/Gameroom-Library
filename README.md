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
│   ├── Experience.jsx  # Luces y composición de la escena
│   └── SpinningBox.jsx # Cubo 3D con rotación en el eje Y
├── styles/             # Estilos CSS globales
│   └── global.css      # Reset mínimo para visualización a pantalla completa
├── App.jsx             # Montaje del <Canvas> y la escena
└── main.jsx            # Punto de entrada de la aplicación
```
