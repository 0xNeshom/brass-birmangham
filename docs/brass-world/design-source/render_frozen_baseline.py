"""Render the frozen geography using design-source/world.json only."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math, random, json, hashlib
OUT=Path(__file__).resolve().parents[1]
W,H=1800,1200
WORLD=json.loads((OUT/'design-source'/'world.json').read_text())
fontdir=Path('/usr/share/fonts/truetype/dejavu')
def font(size,serif=False,bold=False):
 return ImageFont.truetype(str(fontdir/(('DejaVuSerif' if serif else 'DejaVuSans')+('-Bold.ttf' if bold else '.ttf'))),size)
def px(p): return (p['x']*W,p['y']*H)
def path_px(points): return [px(p) for p in points]
NODES={x['id']:x for x in WORLD['nodes']}
SEGMENTS={x['id']:x for x in WORLD['segments']}
CORRIDORS={x['id']:x for x in WORLD['corridors']}
def corridor_path(c):
 pts=[]
 for sid in c['segments']:
  part=path_px(SEGMENTS[sid]['geometry'])
  pts.extend(part if not pts else part[1:])
 return pts
CITIES={x['display_name']:px(x['position']) for x in WORLD['cities']}
GEOGRAPHY={
 'cities':CITIES,
 'rivers':[corridor_path(c) for c in WORLD['corridors'] if c['network_type']=='river'],
 'canals':[corridor_path(c) for c in WORLD['corridors'] if c['network_type']=='canal'],
 'rails':[corridor_path(c) for c in WORLD['corridors'] if c['network_type']=='rail'],
 'regions':[path_px(r['geometry']) for r in WORLD['regions']],
}
def geometry_payload():
 keys=('cities','regions','nodes','corridors','segments','crossings','infrastructure','freight_interchanges','features','terrain_features','landmarks')
 return {k:WORLD[k] for k in keys}
digest=hashlib.sha256(json.dumps(geometry_payload(),sort_keys=True,separators=(',',':')).encode()).hexdigest()
PALS={
'day':dict(paper='#D7C39A',ink='#493E2E',fine='#8D8263',green='#687957',river='#607E7C',water='#B2C0AC',canal='#315D5B',rail='#694830',field='#B9AA71',light='#F3D7A0',shadow='#AE966A'),
'night':dict(paper='#292A27',ink='#E5D6B7',fine='#6F786B',green='#3D5145',river='#82AAA4',water='#34494A',canal='#A2C2AD',rail='#C28A65',field='#494C37',light='#FFCA72',shadow='#151B1A')}
def line(d,pts,fill,width=2):d.line(pts,fill=fill,width=width,joint='curve')
def dashed(d,pts,fill,width=3,dash=13,gap=8):
 phase=0
 for (x,y),(xx,yy) in zip(pts,pts[1:]):
  n=math.hypot(xx-x,yy-y);ux=(xx-x)/n;uy=(yy-y)/n;t=0
  while t<n:
   step=min(n-t,(dash+gap)-phase);a=phase<dash
   if a:line(d,[(x+t*ux,y+t*uy),(x+(t+min(step,dash-phase))*ux,y+(t+min(step,dash-phase))*uy)],fill,width)
   t+=step;phase=(phase+step)%(dash+gap)
def label(d,xy,text,p,size=22,serif=True,anchor='mm',ground=True):
 f=font(size,serif);b=d.textbbox(xy,text,font=f,anchor=anchor)
 if ground:d.rounded_rectangle((b[0]-6,b[1]-3,b[2]+6,b[3]+3),radius=3,fill=p['paper'])
 d.text(xy,text,font=f,fill=p['ink'],anchor=anchor)
def bridge(d,x,y,p,angle=0,code=None):
 # Halo under the bridge defines over/under without adding a connection.
 dx,dy=math.cos(angle)*15,math.sin(angle)*15
 line(d,[(x-dx,y-dy),(x+dx,y+dy)],p['paper'],12)
 line(d,[(x-dx,y-dy),(x+dx,y+dy)],p['rail'],4)
 for s in [-1,1]:
  cx,cy=x+s*dx,y+s*dy;line(d,[(cx-dy*.35,cy+dx*.35),(cx+dy*.35,cy-dx*.35)],p['ink'],2)
 if code:label(d,(x+18,y-17),code,p,13,False,anchor='lm')
def draw_map(variant):
 p=PALS[variant];random.seed(114)
 im=Image.new('RGB',(W,H),p['paper']);d=ImageDraw.Draw(im)
 # Paper fibers with low contrast and large unprinted clearings.
 for i in range(18000):
  x=random.randrange(W);y=random.randrange(H)
  d.point((x,y),fill=p['fine'] if i%8==0 else p['paper'])
 fills=([ '#B7B69A','#B9BD96','#C9AF7F','#B6BBA1','#C9BD86'] if variant=='day' else ['#343D35','#303E35','#3E3B30','#2C3C38','#3C3E30'])
 for polygon,color in zip(GEOGRAPHY['regions'],fills):d.polygon(polygon,fill=color)
 # Canonical elevation contours and hachures come directly from the shared source.
 for feature in WORLD['terrain_features']:
  if feature['type']!='terrain-contour-system':continue
  for ring in feature['rings']:line(d,path_px(ring),p['fine'],1)
  for hatch in feature['hachures']:line(d,path_px(hatch),p['fine'],1)
 # Forests only in selected terrain, open corridors remain clear.
 for grove in [x for x in WORLD['terrain_features'] if x['type']=='woodland']:
  for tree in grove['tree_points']:
   x,y=px(tree)
   line(d,[(x-5,y+4),(x,y-9),(x+5,y+4)],p['green'])
   line(d,[(x,y+2),(x,y+10)],p['green'])
 # Lowland field boundaries and orchard plots are engraved into the paper.
 for field in [x for x in WORLD['terrain_features'] if x['type']=='field-plot']:
  poly=path_px(field['geometry']);line(d,poly+[poly[0]],p['fine'])
  x,y=poly[0]
  for j in range(4):line(d,[(x+j*11,y+4),(x+j*11-4,y+32)],p['field'])
 # Tidal inlet and dock geography.
 inlet=next(x for x in WORLD['landmarks'] if x['id']=='landmark-rivermouth-inlet')
 coast=path_px(inlet['geometry']);d.polygon(coast,fill=p['water']);line(d,coast[:-2],p['river'],3)
 docks=next(x for x in WORLD['landmarks'] if x['id']=='landmark-rivermouth-docks')
 for dock in docks['geometry']:
  poly=path_px(dock);x,y=poly[0];xx,yy=poly[2]
  d.rectangle((x,y,xx,yy),fill=p['shadow'],outline=p['ink'])
  line(d,[(x+(xx-x)*.62,y),(x+(xx-x)*.62,y-24),(xx,y-24)],p['ink'],3)
 # Floodplains are narrow continuous banks, not arbitrary region blocks.
 for i,path in enumerate(GEOGRAPHY['rivers']):
  line(d,path,p['fine'],32 if i==0 else 23)
  line(d,path,p['water'],26 if i==0 else 17)
  line(d,path,p['river'],9 if i==0 else 6)
  line(d,path,p['water'],4 if i==0 else 2)
 # reservoir feeds the southern summit pound using a short local arm
 reservoir=next(x for x in WORLD['infrastructure'] if x['id']=='reservoir-foundry')
 d.polygon(path_px(reservoir['geometry']),fill=p['water'],outline=p['river'])
 line(d,path_px(reservoir['spillway_geometry']),p['canal'],3)
 for path in GEOGRAPHY['canals']:
  line(d,path,p['paper'],11);dashed(d,path,p['canal'],4)
 for connector in [c for c in WORLD['corridors'] if c['network_type']=='water-interface']:
  path=corridor_path(connector);line(d,path,p['paper'],11);dashed(d,path,p['canal'],4)
 for path in GEOGRAPHY['rails']:
  line(d,path,p['paper'],10);line(d,path,p['rail'],5);dashed(d,path,p['paper'],1,3,7)
 # Stable crossing and span identities, positions, and orientations are data-driven.
 for structure in WORLD['crossings']:
  for span in structure['spans']:
   x,y=px(span['position']);code=span['drawing_code'];angle=span.get('orientation_radians',0)
   bridge(d,x,y,p,angle,None)
   if structure['structure_kind']=='aqueduct':line(d,[(x-15,y),(x+15,y)],p['canal'],4)
   lx,ly=px(span['label_position']);line(d,[(x,y),(lx,ly)],p['fine'],1);label(d,(lx,ly),code,p,15,False)
 # Locks use paired transverse strokes at the registered lock anchors.
 for lock in [x for x in WORLD['infrastructure'] if 'lock' in x['type']]:
  x,y=px(lock['position'])
  for off in [-5,5]:line(d,[(x+off-5,y-8),(x+off+5,y+8)],p['ink'],2)
 # The canal-to-river connector meets the Calder only at its registered outlet node.
 local_stream=next(x for x in WORLD['features'] if x['id']=='feature-local-mill-feeder')
 line(d,path_px(local_stream['geometry']),p['river'],3)
 towpath=next(x for x in WORLD['infrastructure'] if x['id']=='bridge-weaver-towpath');tx,ty=px(towpath['position']);bridge(d,tx,ty,p,1.8,None)
 # Basin and terminal marks follow their infrastructure records.
 basins=[x for x in WORLD['infrastructure'] if x['type'] in {'canal-basin','canal-terminal','canal-junction'}]
 for basin in basins:
  x,y=px(basin['position'])
  d.rectangle((x-9,y-6,x+9,y+6),fill=p['water'],outline=p['canal'],width=2)
 # City footprints and original engraved industrial silhouettes.
 for name,(x,y) in GEOGRAPHY['cities'].items():
  d.ellipse((x-27,y-19,x+27,y+19),fill=p['shadow'])
  for j in range(5 if name=='Ironhaven' else 3):
   xx=x-30+j*16;yy=y-38-(j%2)*8
   d.rectangle((xx,yy,xx+13,y-17),fill=p['paper'],outline=p['ink'])
   line(d,[(xx,yy),(xx+7,yy-8),(xx+13,yy)],p['ink'],2)
   if name in ['Ironhaven','Copperfield','Foundry Vale','Blackridge']:d.rectangle((xx+3,yy-18,xx+6,yy),fill=p['ink'])
  if name!='Millbrook':d.rectangle((x+17,y+7,x+27,y+14),fill=p['rail'],outline=p['paper'])
  if name=='Ironhaven':
   d.ellipse((x-13,y-13,x+13,y+13),outline=p['rail'],width=2)
   d.ellipse((x-7,y-7,x+7,y+7),fill=p['paper'],outline=p['ink'],width=2)
  else:
   d.ellipse((x-6,y-6,x+6,y+6),fill=p['paper'],outline=p['ink'],width=2)
 # Separate light passes preserve exact physical geometry while implying Night depth.
 if variant=='night':
  glow=Image.new('RGBA',(W,H));g=ImageDraw.Draw(glow)
  for name in ['Ironhaven','Copperfield','Foundry Vale','Greyhaven','Rivermouth']:
   x,y=GEOGRAPHY['cities'][name];g.ellipse((x-55,y-65,x+65,y+35),fill=(248,153,54,85))
  im=Image.alpha_composite(im.convert('RGBA'),glow.filter(ImageFilter.GaussianBlur(28))).convert('RGB');d=ImageDraw.Draw(im)
  for name in ['Ironhaven','Copperfield','Foundry Vale','Greyhaven','Rivermouth']:
   x,y=GEOGRAPHY['cities'][name]
   for j in range(4):d.rectangle((x-21+j*12,y-31,x-18+j*12,y-24),fill=p['light'])
   for j in range(6):line(d,[(x-20+j*7,y+22+j*2),(x+10+j*6,y+22+j*2)],p['rail'],1)
 # Major labels are inset from infrastructure.
 # Text is a separate, versioned layer; labels never define the city anchors.
 for item in WORLD['labels']:
  size=item.get('font_size',17);label(d,px(item['position']),item['text'],p,size,item['layer'] not in {'region-label','water-label'})
 # Eight-point compass and quiet double-rule.
 for i in range(8):
  a=math.pi*i/4
  rr=44 if i%2==0 else 23
  x,y=1630,200
  d.polygon([(x,y),(x+rr*math.sin(a-.12),y-rr*math.cos(a-.12)),(x+rr*math.sin(a+.12),y-rr*math.cos(a+.12))],fill=p['rail'] if i%2==0 else p['fine'])
 label(d,(1630,140),'N',p,18)
 for inset in [18,29]:d.rectangle((inset,inset,W-inset,H-inset),outline=p['rail'],width=2 if inset==18 else 1)
 d.rectangle((65,45,1220,112),fill=p['paper']);label(d,(85,75),'THE CALDER MARCHES',p,36,True,anchor='lm')
 label(d,(1700,75),variant.upper()+'  /  v1.0.0',p,20,False,anchor='rm')
 # All information belongs in stable legend, with review status explicit.
 d.rectangle((45,1108,1755,1168),fill=p['paper'])
 for inset in [1128,1148]:line(d,[(65,inset),(1735,inset)],p['fine'],1)
 for k in range(4):d.arc((70+k*4,1112+k,100-k*4,1126-k),180,360,fill=p['fine'],width=1)
 label(d,(112,1120),'Contours: schematic elevation; higher inward, close spacing = steeper',p,13,False,anchor='lm')
 # A double-ring city mark identifies the capital; other settlements use a single ring.
 d.ellipse((65,1133,79,1147),outline=p['rail'],width=2);d.ellipse((69,1137,75,1143),outline=p['ink'],width=1)
 label(d,(86,1140),'Capital',p,12,False,anchor='lm')
 d.ellipse((145,1135,157,1145),outline=p['ink'],width=1);label(d,(165,1140),'Settlement',p,12,False,anchor='lm')
 line(d,[(275,1140),(305,1140)],p['river'],4);label(d,(312,1140),'River',p,12,False,anchor='lm')
 dashed(d,[(365,1140),(395,1140)],p['canal'],4);label(d,(402,1140),'Canal',p,12,False,anchor='lm')
 line(d,[(455,1140),(485,1140)],p['rail'],4);label(d,(492,1140),'Rail',p,12,False,anchor='lm')
 label(d,(570,1140),'Shared geography in Day and Night',p,12,False,anchor='lm')
 label(d,(65,1160),'2 viaducts · B1–B9 bridge structures (B2a/B2b spans) · A1 aqueduct',p,12,False,anchor='lm')
 label(d,(1730,1160),'FROZEN · 2026-11-23',p,12,False,anchor='rm')
 return im
if __name__=='__main__':
 day=draw_map('day');night=draw_map('night')
 day.save(OUT/'GEOGRAPHY_DAY_V1_0_0.png')
 night.save(OUT/'GEOGRAPHY_NIGHT_V1_0_0.png')
 comparison=Image.new('RGB',(3600,1200));comparison.paste(day,(0,0));comparison.paste(night,(1800,0));comparison.save(OUT/'GEOGRAPHY_COMPARISON_V1_0_0.png')
 (OUT/'design-source'/'GEOGRAPHY_V1_0_0_EQUIVALENCE.txt').write_text('Day and Night render from design-source/world.json and share its complete geographic geometry.\nGeometry SHA-256 '+digest+'\nBoard frame 1800 x 1200 (3:2); normalized coordinates multiply by width and height.\n')
 print(digest)
