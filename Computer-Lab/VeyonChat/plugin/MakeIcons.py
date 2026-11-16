"""Editable vector geometry, exported to SVG and high-resolution PNG toolbar assets."""
from pathlib import Path
from PIL import Image, ImageDraw
from xml.sax.saxutils import escape

out=Path(__file__).parent/'icons';out.mkdir(exist_ok=True)
navy='#243451'; gold='#F5BE4F'; green='#248667'; red='#BE4A4A'
def icon(name,kind):
    s=4; im=Image.new('RGBA',(64*s,64*s));d=ImageDraw.Draw(im);svg=[]
    def rect(box,fill,stroke=None,r=0,w=2):
        d.rounded_rectangle(tuple(int(v*s) for v in box),radius=r*s,fill=fill,outline=stroke,width=w*s)
        x,y,x2,y2=box;svg.append(f'<rect x="{x}" y="{y}" width="{x2-x}" height="{y2-y}" rx="{r}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{w}"/>')
    def line(points,color=navy,w=3):
        d.line([(int(x*s),int(y*s)) for x,y in points],fill=color,width=round(w*s),joint='curve')
        for x,y in (points[0],points[-1]):d.ellipse(((x-w/2)*s,(y-w/2)*s,(x+w/2)*s,(y+w/2)*s),fill=color)
        svg.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in points)}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')
    def circle(x,y,r,fill,stroke=None,w=2):
        d.ellipse(((x-r)*s,(y-r)*s,(x+r)*s,(y+r)*s),fill=fill,outline=stroke,width=w*s)
        svg.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke or "none"}" stroke-width="{w}"/>')
    rect((2,2,62,62),'#F7F5F0',r=15)
    if kind in ('ai','noai'):
        rect((12,28,49,49),'#FFFFFF',navy,4)
        line([(30,29),(30,49)],w=2)
        line([(17,35),(24,35)],w=2);line([(17,41),(24,41)],w=2)
        rect((28,10,48,29),gold,navy,4)
        for x in (34,42):line([(x,7),(x,10)],w=2)
        for x in (34,42):line([(x,29),(x,32)],w=2)
        for y in (16,23):line([(25,y),(28,y)],w=2);line([(48,y),(51,y)],w=2)
        circle(35,18,1.5,navy);circle(42,18,1.5,navy)
        line([(35,24),(42,24)],w=2)
        circle(48,47,10,green if kind=='ai' else red)
        if kind=='ai':line([(43,47),(47,51),(53,43)],'#FFFFFF',2.8)
        else:line([(43,42),(53,52)],'#FFFFFF',3)
    elif kind=='exam':
        rect((17,14,48,53),'#FFFFFF',navy,4)
        rect((25,9,40,18),gold,navy,3)
        for y in (25,32,39):line([(23,y),(34,y)],w=2)
        circle(46,45,11,gold)
        line([(40,45),(44,49),(52,40)],navy,3)
    elif kind=='free':
        # Open shackle and unlocked body.
        line([(25,29),(25,20),(29,14),(37,12),(44,17)],green,4)
        rect((17,28,48,52),gold,navy,5)
        circle(32,38,3,navy);line([(32,39),(32,45)],w=3)
        line([(48,13),(51,9)],green,2);line([(51,20),(56,19)],green,2)
    elif kind=='chat':
        rect((9,12,45,36),'#FFFFFF',navy,5)
        line([(16,36),(16,43),(26,36)],navy,2)
        rect((25,29,56,50),gold,navy,5)
        line([(48,50),(48,56),(40,50)],navy,2)
        for x in (18,27,36):circle(x,24,2,navy)
        line([(32,38),(49,38)],navy,2);line([(32,44),(44,44)],navy,2)
    else:
        rect((11,12,44,40),'#FFFFFF',navy,4);line([(12,20),(43,20)],w=2)
        rect((21,25,54,53),gold,navy,4);line([(22,33),(53,33)],w=2)
        line([(32,39),(43,48)],navy,3);line([(43,39),(32,48)],navy,3)
    im.save(out/(name+'.png'))
    (out/(name+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'+''.join(svg)+'</svg>',encoding='utf-8')
for name,kind in [('class-ai-allowed','ai'),('class-ai-blocked','noai'),('exam','exam'),('free','free'),('close-apps','close'),('chat','chat')]:icon(name,kind)
sheet=Image.new('RGB',(600,140),'#FFFFFF')
for i,name in enumerate(['class-ai-allowed','class-ai-blocked','exam','free','close-apps']):
    im=Image.open(out/(name+'.png')).resize((96,96),Image.Resampling.LANCZOS);sheet.paste(im,(12+i*120,20),im)
sheet.save(out/'preview.png')
