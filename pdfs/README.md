# 📚 Libros electrónicos para el lector

El lector integrado en la sala permite abrir y leer libros electrónicos en formatos **EPUB** y **PDF**.

> ⚠️ Pon solo libros que tengas derecho a usar para uso personal. No subas archivos de libros con derechos al repositorio de Git.

## Cómo añadir un libro electrónico

### Desde la aplicación (Recomendado)
1. Inicia sesión en la sala y haz clic en el libro que quieras leer para abrir su ficha.
2. Pulsa el botón de subida (**Añadir PDF o EPUB** con icono de bandeja y flecha).
3. Selecciona el archivo PDF o EPUB desde tu equipo.
4. El archivo (hasta 300 MB) se guardará de forma privada en el almacenamiento local de tu propio navegador (**IndexedDB**), tanto en desarrollo local como en la web publicada. A partir de ese momento, la ficha mostrará el botón **Leer** (icono de libro abierto).

El archivo solo está en ese navegador: en otro ordenador o navegador hay que añadirlo de nuevo. Si borras los datos del navegador, se pierde (tus subrayados, marcadores y por dónde ibas siguen en tu cuenta). Para quitarlo, usa el botón de la papelera de la ficha.

### Esta carpeta

La app ya no lee los archivos de `pdfs/` ni de `ebooks/`: la única forma de añadir un libro electrónico es desde su ficha. Puedes usar esta carpeta para guardar tus copias en local; los PDF que pongas aquí están en `.gitignore` y no se suben al repositorio.

