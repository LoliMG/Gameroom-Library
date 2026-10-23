# ✨ Qué puedes hacer en el Rincón de Lectura

El Rincón de Lectura es una sala de lectura inmersiva en 3D donde vive tu biblioteca. Puedes pasear por ella, ordenar tus estanterías físicas, leer tus libros electrónicos en el sofá junto a la chimenea, llevar un diario de lecturas y disfrutar de una habitación que cambia en tiempo real con la hora solar y la meteorología de tu ciudad.

---

## 🔐 Tu cuenta y privacidad

- **Registro e inicio de sesión**: entra con tu correo electrónico y contraseña.
- **Tu espacio privado**: gracias a las políticas de seguridad (RLS) en la base de datos Supabase, tu colección, tus estanterías, tus notas, tu diario y tu corcho son completamente privados y solo accesibles desde tu cuenta.
- **Recuperación de contraseña**: si olvidas tu clave, puedes solicitar un enlace de restablecimiento desde la pantalla de entrada.
- **Cerrar sesión**: puedes cerrar sesión en cualquier momento desde la pestaña de *Ajustes* (icono de engranaje ⚙) en la pantalla de la biblioteca.

---

## 🚶 Pasear por la sala

| Para… | Haz esto |
|---|---|
| Caminar | Teclas `W` `A` `S` `D` o las flechas de dirección |
| Mirar alrededor | Arrastra con el ratón |
| Mirar sin arrastrar | Pulsa `C` para fijar la cámara al ratón (aparece una mirilla en el centro). Vuelve a pulsar `C` o `Esc` para soltarla |
| Agacharte | Mantén pulsada la `Z` (ideal para examinar las baldas inferiores) |
| Recordar los controles | Pasa el ratón por el botón `?` en la esquina superior derecha |

La habitación cuenta con colisiones reales: no puedes atravesar paredes ni muebles.

---

## 📚 Tus libros en las estanterías

- **Ver la ficha de un libro**: haz clic en cualquier libro de las estanterías o de la sala. Verás su portada, título, autor, saga, editorial, número de páginas y su estado de lectura.
- **Cambiarlo de sitio**: mantén pulsado el libro con el ratón y arrástralo hasta cualquier hueco de las estanterías. Si lo sueltas en una zona no válida, vuelve suavemente a su posición anterior.
- **Mover varios a la vez**: con `Ctrl` pulsado, haz clic en varios libros o arrastra un recuadro de selección sobre ellos para mover el grupo junto. Pulsa `Esc` para deseleccionar.
- **Ponerlo de frente**: desde la ficha del libro, pulsa el botón de las flechas circulares para mostrarlo de frente en la balda con la portada visible, o devuélvelo a su posición de canto.
- **Verlo en 3D en grande**: el botón del ojo abre un visor 3D en primer plano. Arrastra con el ratón o usa las flechas para girarlo y leer la sinopsis de la contraportada. Si no tiene sinopsis o quieres personalizarla, puedes redactarla y guardarla directamente ahí.
- **Dejarlo para leer pronto**: desde su ficha, pulsa el botón de la pila para mandarlo a la pila «por leer» que descansa en el suelo junto al sofá (hasta 5 libros). Desde su ficha puedes devolverlo a la estantería, o volverá solo cuando lo marques como leído.
- **Colgarlo como póster**: si es una de tus portadas predilectas, pulsa el icono del cuadro en su ficha para enmarcarlo sobre la repisa de la chimenea (caben 2 cuadros).
- **Subir tu libro electrónico (EPUB o PDF)**: en la ficha del libro, pulsa el botón de subida (bandeja con flecha) para seleccionar un archivo PDF o EPUB de tu ordenador. El archivo se almacena en el almacenamiento privado de tu navegador (**IndexedDB**), sin subir tus documentos a ningún servidor y sin límites de espacio.
- **Quitar el libro electrónico**: si ya no necesitas el archivo en ese equipo, el botón de la papelera en la ficha lo elimina del almacenamiento local de tu navegador.
- **Apuntar por dónde vas**: si estás leyendo un libro en papel, escribe en su ficha la página en la que vas. Al terminarlo, pulsa **¡Terminado!**: el libro pasa a estado leído y se registra automáticamente en tu diario con la fecha actual.
- **Ver tu progreso en la sala**: los libros que estás leyendo llevan una cinta en el lomo indicando visualmente tu porcentaje de avance. Además, el libro que estés leyendo en ese momento reposa sobre la mesa de centro junto al café.

---

## 📖 Leer en el sofá

Cuando un libro tiene asociado un archivo digital (EPUB o PDF) en tu navegador, su ficha muestra el botón **Leer** (icono de libro abierto). Al pulsarlo, te sientas cómodamente en el sofá frente a la chimenea y el libro se abre a doble página.

- **Pasar de página**: haz clic en los bordes de la página, arrástrala como una hoja real o utiliza las teclas `←` y `→`.
- **Subrayar citas**: selecciona cualquier fragmento de texto con el cursor y elige tu color preferido: amarillo, rosa, verde o azul.
- **Añadir notas y comentarios**: haz clic sobre cualquier subrayado para escribirle una nota. Los comentarios se muestran como notas flotantes en el margen.
- **Marcar páginas**: pulsa la cinta de la esquina superior del libro para dejar un marcapáginas.
- **Índice de notas y marcadores**: en los laterales dispones de paneles desplegables con todos tus subrayados, notas y marcadores para saltar a ellos con un solo clic.
- **Memoria de lectura**: el lector recuerda siempre con exactitud por qué página ibas.
- **Levantarte**: pulsa `Esc` o el botón de cierre para cerrar el libro y volver a explorar la sala.

---

## 🖥️ La pantalla de la biblioteca

En la pared, junto a la chimenea, se encuentra la pantalla mural de gestión de tu colección. Úsala con el ratón libre (si tienes la cámara fija en mirilla, pulsa `C` para liberarla).

### Mi biblioteca (Catálogo de portadas)
- Visualiza todas las portadas de tu colección en una cuadrícula clara. Pulsa sobre cualquier portada para abrir su ficha.
- **Búsqueda instantánea**: busca en tiempo real por título, autor, editorial o saga.
- **Filtros por estado de lectura**: filtra al instante entre *Todos*, *Acabados*, *Leyendo* y *Sin leer*.
- **Filtro por tipo de obra**: menú desplegable para separar *Mangas* de *Novelas*.
- **Filtro por etiquetas y favoritos**: marca tus obras favoritas con la estrella (⭐) de su portada y fíltralas con la estrella superior, o navega por tus etiquetas personalizadas.
- **🎲 Elige por mí**: si dudas sobre qué empezar a leer, pulsa este botón. Te seleccionará al azar un libro pendiente de tu biblioteca y lo iluminará con un resplandor azul en su estantería correspondiente.
- **Cambio de estado por lotes**: marca las casillas de varios libros y asígnales de una vez el estado *Acabado*, *Leyendo* o *Sin leer*.
- **Localizar en la sala (icono de diana)**: pulsa la diana de cualquier libro para que su volumen brille en azul dentro de la habitación 3D.
- **Editar libro (icono de lápiz)**: modifica título, autor, editorial, páginas, formato (novela o manga), saga, número de tomo y etiquetas. Incluye un botón para eliminar el libro de tu colección si lo deseas.
- Pulsa el título *Mi biblioteca* en la cabecera para limpiar los filtros y volver a la vista inicial.

### Añadir libro
- **Búsqueda automática**: escribe el ISBN o el título de la obra y pulsa *Buscar*. El sistema consulta los catálogos de Open Library y Google Books, recupera sus datos, descarga su portada oficial y añade el libro directamente en el primer hueco libre de tus estanterías.
- **Alta manual**: si el libro no aparece en los catálogos o se trata de una edición especial, pulsa *Añadir a mano* para rellenar sus datos y adjuntar una imagen de portada desde tu equipo.
- **♡ Lo quiero**: si encuentras un libro que aún no posees, guárdalo directamente en tu lista de deseos desde los resultados de búsqueda.

### Lista de deseos (♡)
- Consulta todos los libros que tienes pendientes de conseguir, con sus portadas y detalles.
- Al adquirir uno, pulsa **Ya lo tengo** para incorporarlo de inmediato a tu biblioteca y asignarle un lugar en la estantería.

### Diario de lecturas (📖)
- **Reto de lectura anual**: define el objetivo de libros que deseas leer en el año y consulta tu porcentaje de cumplimiento.
- **Calendario interactivo**: un mapa de calor visual donde cada día con lectura queda coloreado. Pasa el cursor por cualquier fecha para consultar qué libros estabas leyendo.
- **Registro de lecturas**: historial detallado con fechas de inicio y finalización, valoración personal de 1 a 5 estrellas, reseñas y opción de registrar relecturas.
- **✨ Ver mi año**: informe anual con el total de libros completados, páginas leídas, calificación media, tu mes más lector y tu autor más leído.
- Navega cómodamente entre diferentes años con las flechas `‹` y `›`.

### Ajustes (⚙)
- **Sonidos ambientales**: activa o silencia todos los sonidos con un solo botón, o gradúa de forma individual el volumen del viento, la lluvia, los truenos y los grillos (0 a 100%).
- **Ciudad y clima real**: busca cualquier ciudad del mundo con el geocodificador integrado de Open-Meteo. La sala ajustará la hora solar y la climatología exterior a dicha ubicación.
- **Cuenta**: botón para cerrar tu sesión de forma segura.

---

## 🕯️ Elementos interactivos de la sala

Cuando el puntero del ratón se transforma en una mano, indica que puedes interactuar con el objeto:

| Objeto | Efecto |
|---|---|
| **Chimenea** | Enciende o apaga el fuego. Se encenderá sola cuando el termómetro exterior indique frío |
| **Lámpara de pie** | Enciende o apaga la luz cálida del rincón. Se enciende de forma automática al caer la noche |
| **Velas** | Enciende o apaga sus llamas |
| **Ventanal arqueado** | Ábrelo o ciérralo. Al abrirlo, el sonido del exterior (viento, lluvia, grillos) se percibe con mayor intensidad |
| **Gramófono** | Reproduce una sintonía lofi relajante. Púlsalo de nuevo para pausarla |
| **Gato** | Camina libremente por la habitación. Si te acercas y haces clic sobre él, se sentará y ronroneará |
| **Tablero de corcho** | Situado sobre el sofá. Haz clic para abrirlo a pantalla completa y personalizarlo |
| **Pila «por leer» y pósters** | Pulsa sobre cualquiera de sus volúmenes para abrir directamente su ficha |

---

## 📌 El tablero de corcho

Un espacio creativo para plasmar notas, recuerdos e ideas. Haz clic en el corcho de la pared para editarlo:

- **Notas adhesivas (pósits)**: elige entre varios colores y escribe recordatorios o pensamientos.
- **Pegatinas decorativas**: lunas, estrellas, dragones, flores, gatos y motivos de fantasía.
- **Frases célebres**: importa frases que hayas subrayado previamente en el lector o escribe citas propias con autoría.
- **Interacción fluida**: arrastra los elementos para distribuirlos, gíralos o elimínalos con facilidad. Todo lo que coloques se traslada de inmediato al corcho 3D de la pared.

---

## ⏳ Modo concentración

Pulsa el botón del reloj de arena en la barra inferior izquierda y selecciona una duración de 10 a 60 minutos. Aparecerá una cuenta atrás visual en pantalla y el gato acudirá a dormir plácidamente junto al calor de la chimenea. Al expirar el tiempo, sonará una suave campanilla de aviso y el gato se desperezará.

---

## 📷 Foto postal del rincón

El botón de la cámara fotográfica en la esquina inferior derecha captura la perspectiva 3D exacta que estás observando en ese instante. Genera una imagen en formato postal vintage con fecha y marco, lista para descargar y guardar en tu ordenador.

---

## 🌦️ Una sala viva y conectada

- **Ciclo solar fidedigno**: amanecer, mañana luminosa, atardecer dorado y noche estrellada calculados matemáticamente según las coordenadas de la ciudad seleccionada.
- **Meteorología real**: si en tu ciudad llueve, hay tormenta eléctrica, niebla o nieva, el ventanal mostrará esos mismos fenómenos. Con nieve, el jardín exterior y las colinas se cubren de un manto blanco.
- **Acústica espacial**: el sonido del viento, la lluvia y los grillos responde a la distancia de la cámara respecto al ventanal.
- **Pequeños detalles**: partículas de polvo en suspensión bajo los rayos de luz y secretos que aguardan en el jardín durante la noche.

---

## 💾 Guardado continuo

No es necesario guardar manualmente: cada cambio de sitio de un libro, cada nota del diario, cada pósit del corcho, tu lista de deseos y tus ajustes quedan sincronizados en tiempo real en la nube asociados a tu cuenta de Supabase. Los archivos de tus libros electrónicos permanecen seguros y privados en el almacenamiento local de tu navegador.

