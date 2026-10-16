# Empire Fest 2026



Aplicación en español para Miss y Míster Comercio, Unidad Educativa Particular Lev Vigotsky.



URL: https://chiispiitas.github.io/Lev-Vigotsky/EmpireFest2026/



## Uso



1. Ingresa con el código personal de organización o de tu jurado.

2. Organización: registra nombre, número, imperio y categoría en **Participantes**. No se han añadido candidatos ficticios al evento real.

3. Jurados: selecciona un participante, completa todos los criterios y publica la evaluación. Un cero es una calificación válida; un campo vacío queda pendiente. Los botones de medio punto son accesos rápidos; se permiten hasta dos decimales.

4. Organización: actualiza el consolidado para recibir las últimas evaluaciones. El total aparece únicamente cuando existen las tres rúbricas. Miss, Míster, Mini Miss y Mini Míster se clasifican por separado; los empates mantienen la misma posición y no se aplica un desempate automático.

5. Descarga el CSV o elige **Imprimir / guardar PDF**, seleccionando Guardar como PDF en el diálogo del navegador.



Los borradores se guardan en este dispositivo y por rúbrica/participante. Mantén tu dispositivo protegido. La sesión se conserva en `sessionStorage` de la pestaña para sobrevivir a una recarga; el código se vuelve a validar con Wix al restaurarla. **Salir** elimina la sesión guardada. No se usa almacenamiento permanente para los códigos. Los cursos aparecen en las listas, evaluaciones, consolidado y CSV. Organización dispone de **Recargar** para consultar los datos actuales sin salir.



## Eliminar puntuaciones desde organización

En el consolidado, **Eliminar puntuaciones** pide confirmación con el nombre del concursante antes de borrar todas sus evaluaciones publicadas y sus versiones anteriores. El concursante permanece inscrito. La acción solo está autorizada para organización y no puede deshacerse. Si cambian las evaluaciones después de cargar la vista, se exige actualizar y confirmar de nuevo.

El botón se activa únicamente cuando `bootstrap` informa `features.deleteScores: true`, después de instalar y publicar la versión correspondiente de `backend/empire-fest-2026.js` en Wix. Reemplazar solo ese módulo por el contenido de `wix-empire-fest-2026.js`; no modificar el archivo de HTTP functions ni las otras aplicaciones.

## Rúbricas



Se transcribieron los criterios, descripciones, pregunta y orientaciones de `RÚBRICAS DE CALIFICACIÓN EMPIRE FEST (1).pdf`:



| Jurado | Área | Pesos |

| --- | --- | --- |

| Carlos Delgado | Cultura, traje típico y puesta en escena | 3 + 2 + 2 + 2 + 1 |

| Karla Moreira / Santiago Villapol | Comercio e historia comercial de los imperios | 3 + 3 + 2 + 1 + 1 |

| Cristhina Cedeño | Pasarela, actitud y expresión corporal | 3 + 3 + 2 + 2 |



Cada rúbrica vale 10 puntos. El total es 30. Karla Moreira y Santiago Villapol tienen accesos separados para la misma rúbrica de comercio: cualquiera puede publicar la única nota vigente de esa categoría. La publicación más reciente reemplaza esa nota en el consolidado, conservando el historial y el nombre de quien la publicó. Sus borradores locales están separados por jurado.



## Wix



Sitio: `ec26a170-6af8-4e52-a36b-8a7cebeb321b` (Mr David Collection).



Endpoint: `POST https://chiispiitas.wixsite.com/mr-david-collection/_functions/empireFest2026`.



Colecciones separadas con permisos ADMIN para lectura, escritura, edición y eliminación:



- `EmpireFest2026Participants`: participantes reales.

- `EmpireFest2026Scores`: historial de publicaciones. Las revisiones son nuevas inserciones; se conserva la más reciente por participante/rúbrica para el consolidado.

- `EmpireFest2026Access`: nombres, roles, rúbricas asignadas y hashes SHA-256 de códigos aleatorios de 96 bits. Ningún código se incluye en este repositorio.



Archivos backend instalados:



- `wix-empire-fest-2026.js` → `backend/empire-fest-2026.js`.

- `wix-empire-fest-rubrics.js` → `backend/empire-fest-rubrics.js` (idéntico a `rubrics.js`).

- `wix-http-functions-addition.js` → adición al final de `backend/http-functions.js`, preservando el contenido original.



No reemplazar el archivo existente de HTTP functions al reinstalar. No borrar ni editar las colecciones Quiz o Sustentación. Los IDs de participantes son estables por número, evitando duplicados concurrentes. Las publicaciones reutilizan un UUID en los reintentos y el backend calcula el total a partir de los criterios, ignorando cualquier total enviado por el cliente. Cada código de jurado autoriza solamente su rúbrica. El código de organización permite registrar participantes y leer el consolidado, pero no calificar.



Para revocar un código, la organización puede eliminar o cambiar su registro en `EmpireFest2026Access` desde Wix CMS. Al crear uno nuevo, almacenar solo `sha256(código)` en `codeHash`; el código debe ser de 24 caracteres hexadecimales aleatorios. Compartir cada código únicamente con su titular.



La ruta HTTP admite `bootstrap`, `addParticipant` (organización), y `submit` (jurado). Usa `Content-Type: text/plain;charset=UTF-8` para permitir el envío desde GitHub Pages sin preflight. Las respuestas CORS autorizan únicamente `https://chiispiitas.github.io`, y los datos requieren el código personal en cada llamada.



Documentación usada: [HTTP functions](https://dev.wix.com/docs/velo/articles/getting-started/expose-an-api), [backend de Wix](https://dev.wix.com/docs/develop-websites/articles/coding-with-velo/backend-code/about-the-site-backend), [colecciones](https://dev.wix.com/docs/api-reference/business-solutions/cms/collection-management/data-collections/create-data-collection).



## Verificación



Ejecutar `node --test EmpireFest2026/empire.test.mjs` desde la raíz del repositorio. Cubre pesos oficiales, criterios incompletos, cero, límites/decimales, totales, revisiones, aislamiento entre jurados, registro de participantes, fechas y reintentos.



Es una aplicación estática sin compilación ni dependencias de JavaScript. Para una vista local, servir esta carpeta con cualquier servidor estático. La comunicación real con Wix se verifica desde GitHub Pages con un código de acceso autorizado.


Los participantes MINI del documento `mimi pres 2.pdf` están registrados en Wix con categorías `Mini Miss` y `Mini Míster`, curso, imperio y color. Los filtros, clasificaciones, CSV y reportes impresos los separan de las categorías principales. No se incluyen nombres de estudiantes en este repositorio público.
