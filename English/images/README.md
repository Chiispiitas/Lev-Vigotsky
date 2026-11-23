# Practice images

## Exercise illustrations

The six images in `drills/` were made with the built-in ImageGen tool. Each prompt used the corresponding people or places page from the supplied Horizons illustration guide.

> Create one brand-new educational illustration using the artwork in the attached Horizons visual guide as style calibration. Ignore the guide typography and document layout. Rough springy black ink outlines with subtle human irregularity, flat warm cream, muted brick orange, teal, dusty violet and medium green, sparse simple background, no glossy effects or heavy textures. For people, use ordinary slightly awkward adult proportions, small plain eyes, and simple hair shapes. Horizontal 3:2 single scene. Use new characters and surroundings. No legible words, letters, numbers, borders, watermarks or logos.

| Asset | Guide page | Scene prompt |
| --- | --- | --- |
| [a1-language.webp](drills/a1-language.webp) | People | At a small secondhand clothing stall, an adult in a dusty violet sweatshirt hangs an orange coat on a short rack while a customer in a warm cream cardigan looks over the display. A simple striped awning and a mirror. Show the everyday shopping action clearly. |
| [a1-home.webp](drills/a1-home.webp) | Places | A quiet small-town residential street with two gently skewed adjoining row houses, colored front doors, a low brick wall and a little front garden. One young tree and a straightforward sidewalk. Clear silhouettes and spare detail. No shop, station or market. |
| [a2-travel.webp](drills/a2-travel.webp) | People | A traveler in a dusty teal jacket and a friend in a brick-orange cardigan wait on a bench under a simple station canopy with a soft overnight bag at their feet. Behind them are plain windows and the suggestion of railway tracks. No signage, clocks, tickets or hotel desks. |
| [a2-out.webp](drills/a2-out.webp) | People | Two young adults arrive outside a small performance hall in early evening. Show one friendly gesture toward the doorway, a simple marquee with warm circular bulbs, and muted red curtains visible through the entrance. No signs or performers. |
| [b1-wellbeing.webp](drills/b1-wellbeing.webp) | People | In a quiet school courtyard, three older students talk informally near a shaded bench, one leaning on the bench back while another gestures as they talk. A low cream wall, a tree and simple paving. No written lists, clocks, or faces showing illness. |
| [b1-experiences.webp](drills/b1-experiences.webp) | Places | Three small figures at a distance look out from a wooden nature overlook onto a green valley, with low hills, a few birds over the valley, and a gently curving trail in the foreground. Clear path and silhouettes, no equipment close-ups or weather drama. |

Part 1 uses original vector drawings with the guide’s ink outlines and flat colors. The notice lettering comes directly from each exam’s question text. To update the images, run `node English/build-notice-images.mjs` and verify them with `node English/build-notice-images.mjs --check`.

The B1 Speaking forms use stock photographs. The local JPEGs are sized for web and print.

- Form A: “Community Gardening Project in Bloomington” by Zack Gilbert. [Photo](https://www.pexels.com/photo/community-gardening-project-in-bloomington-39778110/)
- Form B: “Community Volunteers Cleaning Riverbank Outdoors” by Vitaly Gariev. [Photo](https://www.pexels.com/photo/community-volunteers-cleaning-riverbank-outdoors-36713110/)
- [Pexels License](https://www.pexels.com/license/)

The study and exercise illustrations were created with the built-in ImageGen tool using the supplied *Horizons – Authored Illustration Style* PDF as visual calibration. The town scene follows the places reference. The station and park scenes follow the people reference. The selected WebP assets are used on the preparation pages.

| Asset | Prompt |
| --- | --- |
| `a1-study.webp` | Create a new wide educational illustration, using the artwork in the supplied style-guide page as calibration. Ignore its typography and document design. Easy-to-read town street for an A1 English vocabulary page. At a simple junction, show a small cream public library, an orange bakery with a striped awning, a dusty violet two-story apartment, a green park with a bench, and a zebra crossing. Springy uneven thick black outlines, thinner architectural interior details, gently skewed roofs and windows, cartoon shadows, classic rough Flash vector-ink look, lively warm cream brick orange teal dusty violet and medium green. Use the reference's illustration style, not its layout or buildings. A quiet everyday neighborhood with no people. No letters, labels, title, watermarks, border, or branding. Wide horizontal composition. |
| `a2-study.webp` | Create a new wide educational illustration, using the artwork in the supplied style-guide page as calibration. Ignore its typography and document design. Two young adults with a folded route sheet and small shoulder bags stand outside a simple station, making weekend plans. One points at the sheet, the other is listening. In the spare background a station bench, a row of plain windows and the end of an unbranded train. Deliberately hand-drawn rough Flash-style uneven black ink outlines, simple dark eyes and hair, ordinary slightly awkward adult proportions, flat warm cream orange and teal fills, minimal shadows. Use the reference's authored illustration look, with new figures and scene. One wide scene, no panels, no numbers, no text, no brands, no border. |
| `b1-study.webp` | Create a new wide educational illustration, using the artwork in the supplied style-guide page as calibration. Ignore its typography and document design. Two young adults on an easy park trail pause on a bench next to a path junction, one has a reusable water bottle and the other folds a map. Natural, slightly awkward adult proportions, small plain eyes, simple silhouettes for hair, expressive posture and minimal scenery. Rough hand-drawn Flash-style uneven black ink outlines, flat fills, dusty violet, warm cream, teal and medium green, small stylized shadow beneath bench. New figures and scene in the reference's authored illustration look. One wide scene, no panels or text, no brands, no border. |
