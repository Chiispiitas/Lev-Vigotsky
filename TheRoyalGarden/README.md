# The Royal Garden · Reinado UEPLV 2026–2027

Frontend estático en https://ueplv.com/TheRoyalGarden/ y servicio de evaluación en un proyecto Wix Headless independiente. El sitio de Wix es c7ee9770-6552-42af-8234-4d0efb028368.

- Mini Reinado y primera fase: cinco criterios de hasta 2 puntos.
- Segunda fase: Impacto del proyecto y Elocuencia y expresión, hasta 5 puntos cada uno.
- Cada fase se califica sobre 10. El consolidado promedia las tres notas de su mesa, con el mismo peso y sin desempate automático. La segunda fase se presenta por separado.
- Organización confirma manualmente la lista de finalistas. Cada finalista debe tener tres notas de primera fase; la lista se bloquea al confirmarla.
- Los códigos se entregan por separado. El portal conserva la sesión al recargar la misma pestaña y la elimina al salir.
- Wix CMS: RoyalGardenCandidates, RoyalGardenAccess, RoyalGardenScores y RoyalGardenFinalists, todas privadas. Los registros de acceso contienen huellas de los códigos. Las correcciones de notas agregan revisiones y el consolidado usa la más reciente. En el CMS se pueden completar las reinas pendientes.

## Publicación del servicio

Dentro de wix-backend usa npm ci, copia .env.example a .env.local para los valores ficticios de compilación y ejecuta npx tsc --noEmit y npx astro build. Publica dist/ y .wix/build-metadata.json con el flujo de release para builds Astro en Wix Headless. Wix inyecta la identidad del sitio al ejecutar el servicio. El frontend solo usa la URL pública del servicio definida en endpoint.mjs.
