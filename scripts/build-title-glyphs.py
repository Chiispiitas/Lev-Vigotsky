"""Extract the site's Poppins glyphs for directional, clipped ink animation."""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

root = Path(__file__).resolve().parents[1]
result = {}
for weight, filename in [('bold', 'Poppins-SemiBold.ttf'), ('regular', 'Poppins-Regular.ttf')]:
    font = TTFont(root / 'assets/site/fonts' / filename)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    data = {}
    for char in set('Educar es amar con la Gracia de Dios') - {' '}:
        name = cmap[ord(char)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        bounds = BoundsPen(glyphs)
        glyphs[name].draw(bounds)
        data[char] = {'path': pen.getCommands(), 'bounds': bounds.bounds}
    result[weight] = {'units': font['head'].unitsPerEm, 'asc': font['hhea'].ascent,
                      'desc': font['hhea'].descent, 'glyphs': data}
(root / 'assets/site/title-glyphs.js').write_text(
    '/* Generated from the bundled Poppins fonts; see scripts/build-title-glyphs.py. */\n'
    'window.titleGlyphs=' + json.dumps(result, separators=(',', ':')) + ';\n', encoding='utf-8')
