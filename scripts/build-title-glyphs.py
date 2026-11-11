"""Extract the site's Poppins glyphs for directional, clipped ink animation."""
import json, re, ast
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

root = Path(__file__).resolve().parents[1]
routes = {}
for key, paths in re.findall(r"^  (\w):(.+),?$", (root / 'site.js').read_text(), re.M):
    routes[key] = ast.literal_eval(paths.rstrip(','))
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
        left, bottom, right, top = bounds.bounds
        strokes = []
        for route in routes[char]:
            route_pen = SVGPathPen(glyphs)
            parse_path(route, TransformPen(route_pen, (right-left, 0, 0, top-bottom, left, -top)))
            strokes.append(route_pen.getCommands())
        data[char] = {'path': pen.getCommands(), 'bounds': bounds.bounds, 'strokes': strokes}
    result[weight] = {'units': font['head'].unitsPerEm, 'asc': font['hhea'].ascent,
                      'desc': font['hhea'].descent, 'glyphs': data}
(root / 'assets/site/title-glyphs.js').write_text(
    '/* Generated from the bundled Poppins fonts; see scripts/build-title-glyphs.py. */\n'
    'window.titleGlyphs=' + json.dumps(result, separators=(',', ':')) + ';\n', encoding='utf-8')
