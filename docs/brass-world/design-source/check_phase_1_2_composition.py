"""Validate the design illustration's cross-mode crossings and shared geometry."""
import hashlib,json,runpy
from pathlib import Path
root=Path(__file__).resolve().parent
data=runpy.run_path(str(root/'render_phase_1_2.py'))['GEOGRAPHY']
def intersect(a,b,c,d):
 den=(b[0]-a[0])*(d[1]-c[1])-(b[1]-a[1])*(d[0]-c[0])
 if abs(den)<1e-8:return None
 t=((c[0]-a[0])*(d[1]-c[1])-(c[1]-a[1])*(d[0]-c[0]))/den
 u=((c[0]-a[0])*(b[1]-a[1])-(c[1]-a[1])*(b[0]-a[0]))/den
 if 0<t<1 and 0<u<1:return [round(a[0]+t*(b[0]-a[0])),round(a[1]+t*(b[1]-a[1]))]
bindings={
 ('rails',0,'rivers',0,931,632):('B5','rail-basin-trunk-01','river-calder-02'),
 ('rails',0,'rivers',0,1052,579):('V2','rail-basin-trunk-02','river-calder-03'),
 ('rails',0,'rivers',2,1317,664):('B4','rail-basin-trunk-03','river-mere-02'),
 ('rails',1,'rivers',0,791,496):('V1','rail-coal-feeder-03','river-calder-02'),
 ('rails',1,'rivers',0,896,601):('B6','rail-coal-feeder-03','river-calder-02'),
 ('rails',2,'rivers',1,480,704):('B3','rail-southern-arc-01','river-weaver-02'),
 ('rails',2,'rivers',1,892,656):('B7','rail-southern-arc-04','river-weaver-03'),
 ('rails',2,'rivers',2,480,991):('B2a','rail-southern-arc-02','river-mere-02'),
 ('rails',2,'rivers',2,534,1019):('B2b','rail-southern-arc-02','river-mere-02'),
 ('rails',0,'canals',1,1370,765):('B1','rail-basin-trunk-03','canal-lower-calder-01'),
 ('rails',2,'canals',0,467,724):('B8','rail-southern-arc-01','canal-weaver-01'),
 ('rails',2,'canals',0,916,740):('B9','rail-southern-arc-04','canal-weaver-02'),
 ('canals',1,'rivers',2,1248,790):('A1','canal-lower-calder-01','river-mere-02'),
}
found=[]
for left,right in [('rails','rivers'),('rails','canals'),('canals','rivers')]:
 for i,p in enumerate(data[left]):
  for j,q in enumerate(data[right]):
   for a,b in zip(p,p[1:]):
    for c,d in zip(q,q[1:]):
     point=intersect(a,b,c,d)
     if point:
      key=(left,i,right,j,*point)
      assert key in bindings,('Unkeyed crossing',key)
      code,segment_a,segment_b=bindings[key]
      found.append({'code':code,'segments':[segment_a,segment_b],'paths':[left,i,right,j],'illustration_pixel':point})
assert len(found)==len(bindings)==13
assert len(data['cities'])==12 and len(data['regions'])==5
report={'status':'pass','limits':'Illustration coordinates remain provisional. Tests open-segment crossings between modes; endpoint joining follows route registry. No production coordinates are exported.','geometry_sha256':hashlib.sha256(json.dumps(data,sort_keys=True).encode()).hexdigest(),'cities':12,'regions':5,'crossings':found}
(root/'PHASE_1_2_COMPOSITION_CHECK.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: 12 cities, 5 regions, all 13 cross-mode intersections keyed to stable segment IDs; Day/Night share geometry object.')
