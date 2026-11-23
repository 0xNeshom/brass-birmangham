"""Original Calder Marches cartographic review artwork, Pillow only.
Illustration coordinates are a provisional composition, not canonical world data.
Day and Night consume the same GEOGRAPHY object. Run from any directory.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math, random, json, hashlib
OUT=Path(__file__).resolve().parents[1]
W,H=1800,1200
fontdir=Path('/usr/share/fonts/truetype/dejavu')
def font(size,serif=False,bold=False):
 return ImageFont.truetype(str(fontdir/(('DejaVuSerif' if serif else 'DejaVuSans')+('-Bold.ttf' if bold else '.ttf'))),size)
# Shared review geometry. Its serialization is fingerprinted in both treatments.
GEOGRAPHY={
 'cities':{'Brackenford':(350,300),'Blackridge':(720,230),'Calderwick':(800,430),'Millbrook':(280,550),'Westford':(490,710),'Ironhaven':(940,640),'Copperfield':(1230,565),'Greyhaven':(1440,720),'Rivermouth':(1660,835),'Foundry Vale':(1070,900),'Ashbourne':(830,1050),'Dunmere':(450,995)},
 'rivers':[
 [(900,95),(940,220),(895,335),(800,430),(790,500),(850,560),(940,640),(1000,670),(1080,530),(1250,480),(1380,580),(1430,670),(1540,760),(1660,795),(1770,835)],
 [(90,390),(180,430),(280,550),(370,640),(490,710),(665,710),(790,690),(940,640)],
 [(110,1080),(280,1070),(450,995),(520,985),(570,1110),(950,1100),(1190,1040),(1260,740),(1380,580)]],
 'canals':[
 [(280,570),(310,650),(490,735),(700,790),(860,780),(970,700)],
 [(970,700),(1110,765),(1300,800),(1390,755),(1440,745),(1540,850),(1660,865)],
 [(830,1030),(960,990),(1070,920),(1090,850),(1000,770),(970,700)]],
 'rails':[
 [(490,690),(655,620),(790,605),(890,650),(1000,600),(1100,560),(1230,545),(1300,630),(1380,785),(1455,735),(1550,790),(1660,815)],
 [(350,280),(520,235),(720,210),(755,320),(800,410),(760,470),(830,530),(900,570),(890,650)],
 [(490,690),(400,820),(420,910),(450,975),(650,1080),(830,1030),(1050,890),(930,790),(890,650)]],
 'regions':[
 [(80,110),(1200,110),(1160,360),(950,460),(600,500),(90,390)],
 [(90,390),(600,500),(650,650),(590,850),(150,915)],
 [(600,500),(950,460),(1160,360),(1410,540),(1330,890),(1070,990),(590,850),(650,650)],
 [(1200,110),(1720,330),(1770,1080),(1330,950),(1330,890),(1410,540),(1160,360)],
 [(150,915),(590,850),(1070,990),(1330,950),(1770,1080),(1740,1115),(80,1115)]]
}
digest=hashlib.sha256(json.dumps(GEOGRAPHY,sort_keys=True).encode()).hexdigest()
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
 # Broad landforms use nested contour rings and short hachures.
 for cx,cy,rx,ry in [(230,205,155,78),(520,165,180,60),(1050,250,130,95),(1130,410,150,72),(1300,460,120,65)]:
  for k in range(6):
   r=1-k*.12
   d.ellipse((cx-rx*r,cy-ry*r,cx+rx*r,cy+ry*r),outline=p['fine'],width=1)
  for a in range(0,360,18):
   theta=math.radians(a);x=cx+rx*math.cos(theta);y=cy+ry*math.sin(theta)
   line(d,[(x,y),(x+10*math.cos(theta),y+7*math.sin(theta))],p['fine'])
 # Forests only in selected terrain, open corridors remain clear.
 for cx,cy,rx,ry in [(165,760,95,120),(1140,190,90,50),(620,440,95,40),(1490,410,100,90)]:
  for i in range(50):
   x=cx+random.uniform(-rx,rx);y=cy+random.uniform(-ry,ry)
   line(d,[(x-5,y+4),(x,y-9),(x+5,y+4)],p['green'])
   line(d,[(x,y+2),(x,y+10)],p['green'])
 # Lowland field boundaries and orchard plots are engraved into the paper.
 for x in range(540,990,65):
  for y in range(880,1090,55):
   poly=[(x,y),(x+56,y-8),(x+50,y+40),(x-8,y+42)]
   line(d,poly+[poly[0]],p['fine'])
   for j in range(4):line(d,[(x+j*11,y+4),(x+j*11-4,y+32)],p['field'])
 # Tidal inlet and dock geography.
 coast=[(1715,650),(1660,730),(1645,795),(1690,860),(1660,930),(1720,1000),(1770,1030),(1770,630)]
 d.polygon(coast,fill=p['water']);line(d,coast[:-2],p['river'],3)
 for x,y in [(1675,800),(1685,825),(1695,850)]:
  d.rectangle((x,y,x+65,y+11),fill=p['shadow'],outline=p['ink'])
  line(d,[(x+40,y),(x+40,y-24),(x+66,y-24)],p['ink'],3)
 # Floodplains are narrow continuous banks, not arbitrary region blocks.
 for i,path in enumerate(GEOGRAPHY['rivers']):
  line(d,path,p['fine'],32 if i==0 else 23)
  line(d,path,p['water'],26 if i==0 else 17)
  line(d,path,p['river'],9 if i==0 else 6)
  line(d,path,p['water'],4 if i==0 else 2)
 # reservoir feeds the southern summit pound using a short local arm
 d.ellipse((1095,900,1150,932),fill=p['water'],outline=p['river'],width=2)
 line(d,[(1095,916),(1070,920)],p['canal'],3)
 for path in GEOGRAPHY['canals']:
  line(d,path,p['paper'],11);dashed(d,path,p['canal'],4)
 for path in GEOGRAPHY['rails']:
  line(d,path,p['paper'],10);line(d,path,p['rail'],5);dashed(d,path,p['paper'],1,3,7)
 # Named crossing codes are keyed in the topology registry. B2 has two spans.
 for x,y,a,c in [(791,496,.62,'V1'),(1052,579,-.35,'V2'),(1370,765,1.02,'B1'),(480,991,.55,'B2a'),(534,1020,.55,'B2b'),(480,704,1.8,'B3'),(1317,664,1.02,'B4'),(931,632,-.3,'B5'),(896,601,1.5,'B6'),(892,656,1.2,'B7'),(467,724,1.8,'B8'),(916,740,1.2,'B9')]:bridge(d,x,y,p,a,None)
 # Mere aqueduct, lower cut above the river. Distinct teal deck.
 bridge(d,1240,789,p,0,'A1');line(d,[(1233,790),(1263,790)],p['canal'],4)
 # Locks use paired transverse strokes.
 for x,y in [(332,663),(1430,747),(1642,865),(1040,800),(955,673)]:
  for off in [-5,5]:line(d,[(x+off-5,y-8),(x+off+5,y+8)],p['ink'],2)
 # Schematic basin/city/station positions are distinct.
 for x,y in [(970,700),(490,735),(1440,745),(1660,865),(830,1030)]:
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
 offsets={'Brackenford':(0,35),'Blackridge':(0,35),'Calderwick':(-15,-70),'Millbrook':(-30,-70),'Westford':(-25,45),'Ironhaven':(-35,-72),'Copperfield':(65,-55),'Greyhaven':(25,-55),'Rivermouth':(-10,62),'Foundry Vale':(0,55),'Ashbourne':(0,55),'Dunmere':(-10,53)}
 for name,(x,y) in GEOGRAPHY['cities'].items():
  dx,dy=offsets[name];label(d,(x+dx,y+dy),name,p,30 if name=='Ironhaven' else 25)
 for xy,t in [((430,365),'NORTHERN UPLANDS'),((245,895),'WESTERN TEXTILE DISTRICT'),((1190,350),'CENTRAL INDUSTRIAL BASIN'),((1500,510),'EASTERN CANAL DISTRICT'),((1170,1070),'SOUTHERN LOWLANDS')]:label(d,xy,t,p,17,False)
 label(d,(700,735),'R. Weaver',p,17);label(d,(1230,890),'R. Mere',p,17);label(d,(1520,805),'R. Calder',p,17)
 # Infrastructure keys use leader lines where city engraving is dense.
 for x,y,lx,ly,code in [(791,496,815,480,'V1'),(1052,579,1070,555,'V2'),(1370,765,1390,780,'B1'),(480,991,500,970,'B2a'),(534,1019,565,1000,'B2b'),(480,704,420,675,'B3'),(1317,664,1340,645,'B4'),(931,632,1020,720,'B5'),(896,601,800,590,'B6'),(892,656,810,660,'B7'),(467,724,405,760,'B8'),(916,740,860,790,'B9')]:
  line(d,[(x,y),(lx,ly)],p['fine'],1)
  label(d,(lx,ly),code,p,15,False)
 # Eight-point compass and quiet double-rule.
 for i in range(8):
  a=math.pi*i/4
  rr=44 if i%2==0 else 23
  x,y=1630,200
  d.polygon([(x,y),(x+rr*math.sin(a-.12),y-rr*math.cos(a-.12)),(x+rr*math.sin(a+.12),y-rr*math.cos(a+.12))],fill=p['rail'] if i%2==0 else p['fine'])
 label(d,(1630,140),'N',p,18)
 for inset in [18,29]:d.rectangle((inset,inset,W-inset,H-inset),outline=p['rail'],width=2 if inset==18 else 1)
 d.rectangle((65,45,1220,112),fill=p['paper']);label(d,(85,75),'THE CALDER MARCHES',p,36,True,anchor='lm')
 label(d,(1700,75),variant.upper()+'  /  1.1',p,20,False,anchor='rm')
 # All information belongs in stable legend, with review status explicit.
 d.rectangle((45,1130,1755,1170),fill=p['paper'])
 line(d,[(65,1150),(115,1150)],p['river'],5);label(d,(125,1150),'River',p,16,False,anchor='lm')
 dashed(d,[(220,1150),(270,1150)],p['canal'],4);label(d,(280,1150),'Canal',p,16,False,anchor='lm')
 line(d,[(380,1150),(430,1150)],p['rail'],4);dashed(d,[(380,1150),(430,1150)],p['paper'],1,3,7);label(d,(440,1150),'Rail',p,16,False,anchor='lm')
 label(d,(610,1150),'V1/V2 viaducts · B1–B9 bridges · A1 aqueduct',p,15,False,anchor='lm')
 label(d,(1730,1150),'PROVISIONAL · owner approval pending',p,15,False,anchor='rm')
 return im
if __name__=='__main__':
 day=draw_map('day');night=draw_map('night')
 day.save(OUT/'PHASE_1_1_GEOGRAPHY.png')
 night.save(OUT/'PHASE_1_1_NIGHT.png')
 comparison=Image.new('RGB',(3600,1200));comparison.paste(day,(0,0));comparison.paste(night,(1800,0));comparison.save(OUT/'PHASE_1_1_DAY_NIGHT.png')
 (OUT/'design-source'/'GEOMETRY_EQUIVALENCE.txt').write_text('Day and Night use the same GEOGRAPHY object in render_phase_1_1.py.\nIllustration geometry SHA-256 '+digest+'\nProvisional review positions only. Fonts DejaVu Serif and Sans review substitutes.\n')
 print(digest)
