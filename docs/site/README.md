# Sitio institucional de LEV VIGOTSKY

Primera plantilla pública, preparada el 11 de noviembre de 2026. Publicación en la raíz de GitHub Pages: https://chiispiitas.github.io/Lev-Vigotsky/. Se conserva la publicación de las aplicaciones existentes en sus subcarpetas. No se ha añadido dominio personalizado.

## Estructura

Portada, Quiénes somos, Oferta académica, Galería y vida escolar, orientación de admisiones, Instagram en vivo y Contacto con Google Maps. Aula virtual dirige exactamente a https://levvigotsky.runacode.com/public/ y permanece en el encabezado móvil y de escritorio.

`index.html` contiene el contenido editorial y los enlaces. `site.css` define la identidad, tipografía y adaptación de pantalla. `site.js` añade el menú móvil, ampliación de fotografías y apariciones suaves. No se necesita compilación, servidor de aplicación ni credenciales para publicar en Pages. Para previsualizar, servir la raíz mediante un servidor HTTP estático.

## Referencias investigadas

Selección por patrones útiles, no ranking de calidad ni comparación de resultados educativos:

| Referencia oficial | Qué se toma como inspiración |
| --- | --- |
| [Colegio Menor, Ecuador](https://www.colegiomenor.edu.ec/es) | Oferta organizada por etapas y consulta visible. |
| [Colegio Americano de Quito](https://www.fcaq.k12.ec/) y [admisiones](https://www.fcaq.k12.ec/admissions) | Separar presentación, aprendizaje y orientación de admisiones. |
| [Green School Bali](https://bali.greenschool.org/) | Fotografías reales y relato breve de vida escolar por bloques. |
| [Sevenoaks School](https://www.sevenoaksschool.org/) | Portales y contacto como accesos de utilidad. |
| [UWCSEA](https://www.uwcsea.edu.sg/) | Diferenciar acceso a plataforma del recorrido institucional. |

Se desarrolló un diseño propio con fondos claros, amarillo de acento, azul profundo, Poppins para interfaz y Cinzel para el nombre. No se copiaron textos, fotos ni atributos educativos de otras instituciones.

## Información real y textos de propuesta

- Oferta y contactos: [Linktree institucional UEPLV](https://linktr.ee/UEPLV), que enlaza el Instagram indicado por el usuario. Inicial I (3), Inicial II (4), preprimaria (5), EGB segundo a décimo y Bachillerato en Ciencias / Técnico en Administración de Empresas. Se usa “Preparatoria” como denominación web del nivel de 5 años.
- Contactos de Inicial a 7.º: [WhatsApp institucional](https://wa.link/32me8l), 096 379 8828. De 8.º a Bachillerato: [WhatsApp institucional](https://wa.link/8g05dc), 096 971 7983.
- Dirección y ambos teléfonos confirmados por David en este chat el 11 de noviembre de 2026: avenida 229 y calle 309, Villas de Circunvalación, Manta.
- Runachay: URL provista directamente por el usuario. El botón se enlaza sin intermediarios. No se requieren credenciales para el sitio informativo.
- Los titulares, párrafos de acompañamiento y pasos de orientación son propuesta editorial de esta plantilla. No se presentan como misión, visión, requisitos oficiales, fechas de admisión ni garantías de resultados.
- No se publican costos, cupos, horarios, estadísticas, acreditaciones o testimonios no verificados.

`source-facts.json` conserva la trazabilidad de la investigación previa a la confirmación del usuario. Esta confirmación actualiza el estado de dirección y teléfonos aquí registrado.

## Imágenes y fuentes

Fotografías reales descargadas de los embeds públicos del Instagram de la institución y convertidas a WebP para reducir peso. No son imágenes generadas de estudiantes o de instalaciones. La firma original integrada en cada fotografía se conserva. La composición en pantalla puede recortar la vista; la galería ampliada muestra la imagen completa.

| Archivo publicado | Publicación de origen |
| --- | --- |
| `assets/site/photos/initial.webp` | https://www.instagram.com/p/DfPeQCOmbYa/ — guaguas de pan en Vigotskids |
| `assets/site/photos/arts.webp` | https://www.instagram.com/p/DfCtKFgGeXt/ — concurso artístico intercolegial |
| `assets/site/photos/parade.webp` | https://www.instagram.com/p/DfX8s27oaqr/ — comunidad docente en desfile cívico |

Emblema: `Karaoke/assets/school-logo.png`, original señalado por el usuario; copia web con margen transparente retirado, proporciones conservadas, sin redibujar. El favicon usa el mismo recurso. Mascotas `assets/site/mascot/welcome.webp` y `reading.webp`: generadas con el **image_gen integrado**, dos llamadas separadas con el original como referencia, transparencia alfa verificada. Prompts completos en `image-prompts.txt`. No se incorporaron iconos dibujados en código ni bibliotecas de iconos. Los controles tienen etiquetas de texto.

Poppins 400 y 600 y Cinzel se sirven desde `assets/site/fonts/`. Los archivos y licencias OFL proceden del repositorio oficial [google/fonts](https://github.com/google/fonts). La auditoría de marca de este proyecto se conserva en esta carpeta como documento editable.

## Instagram y mapa

El iframe de perfil de Instagram carga `https://www.instagram.com/levvigotskyue/embed/` directamente. Es contenido vivo del proveedor, distinto de las fotografías locales de la galería. Se verificó el perfil con sus seis publicaciones visibles durante la revisión de navegador del 11 de noviembre. Instagram controla el orden y la disponibilidad; bloqueos de privacidad, cookies o cambios de la plataforma pueden impedir la carga. Siempre permanece disponible un enlace al perfil. No se promete una sincronización propia ni se almacenan tokens.

Google Maps se incorpora con búsqueda del nombre exacto de la institución en Manta. El enlace externo usa el Place ID `ChIJQynuiAjkK5ARl4mW5OQkZCk`. Se verificó que el mapa incorporado resuelve al mismo establecimiento (CID `2982549418732325271`). Ambos servicios cargan al acercarse a la sección para reducir el trabajo inicial.

## Mantenimiento

Actualizar oferta, contactos y redacción en `index.html`. Para reemplazar fotos, actualizar también texto alternativo, leyenda y enlace de origen. Mantener las mascotas en sus dos ubicaciones discretas. Las animaciones respetan movimiento reducido; la información permanece visible si JavaScript está deshabilitado. La galería ampliable requiere JavaScript; los enlaces originales permanecen accesibles sin él.

El contenido y las imágenes son una primera versión revisable. Cambiar el futuro dominio en metadatos y datos estructurados cuando se configure; conservar mientras tanto las rutas relativas para que funcionen en el subdirectorio de GitHub Pages.

## Verificación de esta versión

Se comprobaron sintaxis de JavaScript, referencias de archivos, enlaces internos, IDs únicos, descripciones de imágenes, títulos de iframes y datos estructurados. Revisión en Edge con anchos de contenido CSS de 320, 390, 767, 1024 y 1440 px sin desbordamiento horizontal. Se probó apertura y cierre del menú móvil y del diálogo de fotografías, con devolución del foco. Se observó Instagram con seis publicaciones y el mapa resuelto al establecimiento. El navegador puede registrar mensajes internos de Instagram; el contenido del proveedor no está bajo control del sitio. No se declara certificación integral de accesibilidad ni prueba en dispositivos físicos.

## Mejora de identidad de noviembre de 2026

David confirmó el eslogan oficial **Educar es amar con la Gracia de Dios**, con G mayúscula en Gracia. Esta indicación sustituye el estado pendiente del eslogan en la auditoría inicial. El hero lo presenta como texto accesible y los metadatos sociales también lo incorporan.

Quiénes somos incorpora la fotografía real de la comunidad docente y tres ilustraciones de curiosidad, valores e identidad. Oferta académica añade ilustraciones por etapa y botones diferenciados en amarillo, gris azulado y azul profundo. La referencia de Bali se utiliza para reforzar la relación entre imagen, etapa y acción, manteniendo la identidad de Lev Vigotsky.

El fondo del afiche aportado se recreó mediante generación de imagen: cabezas de búho angulares en gris pálido sobre blanco, con repetición revisada. Se utiliza únicamente en la franja de orientación al final de Oferta académica. Todos los iconos y el patrón se produjeron con **image_gen integrado**; no son dibujos SVG, CSS ni iconos de una biblioteca.

| Recurso final publicado | Uso | Prompt completo |
| --- | --- | --- |
| [curiosity.webp](../../assets/site/icons/curiosity.webp) | Curiosidad, libro y lupa | [Prompts de identidad](brand-icon-prompts-v2.txt) |
| [values.webp](../../assets/site/icons/values.webp) | Valores, manos y corazón | [Prompts de identidad](brand-icon-prompts-v2.txt) |
| [identity.webp](../../assets/site/icons/identity.webp) | Pertenencia, búho académico | [Prompts de identidad](brand-icon-prompts-v2.txt) |
| [initial.webp](../../assets/site/icons/initial.webp) | Inicial, bloques y lápiz | [Prompts académicos](academic-icon-prompts-v2.txt) |
| [basic.webp](../../assets/site/icons/basic.webp) | Básica, cuaderno y útiles | [Prompts académicos](academic-icon-prompts-v2.txt) |
| [high-school.webp](../../assets/site/icons/high-school.webp) | Bachillerato, birrete y libros | [Prompts académicos](academic-icon-prompts-v2.txt) |
| [owl-watermark-v2.webp](../../assets/site/patterns/owl-watermark-v2.webp) | Patrón repetible del acento | [Prompt del patrón](pattern-prompt-v2.txt) |

Se conservaron las transparencias de las ilustraciones. Las copias web solo se optimizaron en tamaño y compresión; no se redibujaron. Se revisó de nuevo el texto exacto del hero, la carga de los seis iconos y la ausencia de desbordamiento horizontal en 320, 390, 767, 1024 y 1440 px.

## Revisión visual y Facebook

Se restauran los botones iniciales de seis píxeles de radio, sin relieve. Se genera un trazo grueso de pincel y un fondo más fiel al afiche, aplicado a toda Oferta académica. Ambos se crearon con image_gen integrado. Recursos finales: `assets/site/patterns/brush-gold-v3.webp` y `assets/site/patterns/owl-background-v3.webp`.

Prompts: trazo horizontal dorado grueso artesanal, bordes de cerdas irregulares, textura de pintura y transparencia, sin texto; recrear únicamente el fondo del afiche con cabezas angulares de búho en gris muy pálido, disposición diagonal irregular y tamaños e inclinaciones variables, sin contenido de primer plano. Referencia: afiche institucional aportado por David.

Se incorpora el plugin nativo de página de Facebook con timeline y enlace alternativo. Facebook puede condicionar la carga a las preferencias del visitante. Tres fotos públicas de su galería amplían la galería local a seis imágenes. Fuentes de los nuevos archivos:
- `assets/site/photos/facebook-0.webp`: https://www.facebook.com/photo.php?fbid=1679430200861635&set=pb.100063840121139.-2207520000&type=3
- `assets/site/photos/facebook-1.webp`: https://www.facebook.com/photo.php?fbid=1679430194194969&set=pb.100063840121139.-2207520000&type=3
- `assets/site/photos/facebook-2.webp`: https://www.facebook.com/photo.php?fbid=1679430190861636&set=pb.100063840121139.-2207520000&type=3
