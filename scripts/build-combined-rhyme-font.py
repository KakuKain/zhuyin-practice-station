"""Reuse complete vertical annotation glyphs from the bundled OFL font."""
from pathlib import Path
from copy import deepcopy
from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

root = Path(__file__).resolve().parents[1]
source = TTFont(root / 'assets/font-sources/BpmfZihiOnly-R.ttf')
names = ['ya1','yo1','ye1','yai2','yao1','you1','yan1','yin1','yang1','ying1',
         'wa1','wo1','wai1','wei1','wan1','wen1','wang1','weng1','yue1','yuan1','yun1','yong1']
for name in names:
    glyph = deepcopy(source['glyf']['z_' + name])
    glyph.components = [part for part in glyph.components if not part.glyphName.startswith('tone')]
    source['glyf']['z_' + name] = glyph
source_set = source.getGlyphSet()
pen = TTGlyphPen(None)
glyphs = {'.notdef': pen.glyph()}
for index, name in enumerate(names):
    recording = DecomposingRecordingPen(source_set)
    source_set['z_' + name].draw(recording)
    bounds = BoundsPen(None)
    recording.replay(bounds)
    left, bottom, right, top = bounds.bounds
    scale = 800 / (top - bottom)
    output = TTGlyphPen(None)
    recording.replay(TransformPen(output, (scale, 0, 0, scale, (1000 - (right-left)*scale)/2-left*scale, 100-bottom*scale)))
    glyphs[f'rhyme{index}'] = output.glyph()
font = FontBuilder(1000, isTTF=True)
font.setupGlyphOrder(list(glyphs))
font.setupCharacterMap({0xE100+i: f'rhyme{i}' for i in range(len(names))})
font.setupGlyf(glyphs)
font.setupHorizontalMetrics({name:(1000, getattr(glyph, 'xMin', 0)) for name, glyph in glyphs.items()})
font.setupHorizontalHeader(ascent=1000, descent=0)
font.setupNameTable({'familyName':'Kid Combined Rhymes','styleName':'Regular','uniqueFontIdentifier':'KidCombinedRhymes-1','fullName':'Kid Combined Rhymes','psName':'KidCombinedRhymes'})
font.setupOS2(sTypoAscender=1000,sTypoDescender=0,usWinAscent=1000,usWinDescent=0)
font.setupPost()
font.font.flavor='woff2'
font.save(root / 'public/fonts/KidCombinedRhymes.woff2')
