"""Original canal-yard artwork. Run with Blender --background --python this_file."""
import bpy, math, random, os
from mathutils import Vector
random.seed(24)
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public','after-rain')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_x=1800;scene.render.resolution_y=1125;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.34,.43,.51,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
scene.view_settings.view_transform='AgX'
def material(name,color,rough=.4,metal=0,noise=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes;p=next(n for n in n if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if noise:
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=14;tex.inputs['Detail'].default_value=4
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.3;bump.inputs['Distance'].default_value=.08
  m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
 return m
def cube(name,loc,scale,mat,bevel=0):
 verts=[(x*scale[0]/2,y*scale[1]/2,z*scale[2]/2) for x,y,z in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[(2,6,4,0),(5,7,3,1),(4,5,1,0),(3,7,6,2),(1,3,2,0),(6,7,5,4)]);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=loc;o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Soft weathered edges','BEVEL');mod.width=bevel;mod.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def emission(name,color,strength):
 m=material(name,color);p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=strength;return m
stone=[material('Wet basalt %02d'%i,(.055+i*.007,.069+i*.007,.078+i*.007),.23,.12,True) for i in range(7)]
mortar=material('Damp grit',(.035,.043,.046),.85,noise=True)
brick=material('Soot stained brick',(.13,.102,.084),.72,noise=True)
roof=material('Weathered zinc',(.075,.098,.11),.43,.45,True)
iron=material('Blackened iron',(.025,.031,.034),.27,.65)
wood=material('Wet dock timber',(.045,.033,.024),.46,noise=True)
window=emission('One amber window',(.98,.36,.065),5)
glass=material('Cold unlit glass',(.07,.105,.12),.16,.35)
cube('Mortar bed',(0,3,-.18),(42,40,.3),mortar)
# An irregular waterline leaves wet stones framing the reflection.
def in_water(x,y):
 r=((x+1.6)/4.7)**2+((y-1.1)/5.2)**2
 return r < 1+.07*math.sin(x*3+y*1.2)+.05*math.sin(y*4)
for row in range(40):
 y=-8+row*.64
 for col in range(40):
  x=-14+col*.76+(.38 if row%2 else 0)
  if in_water(x,y):continue
  o=cube('Set stone', (x+random.uniform(-.035,.035),y+random.uniform(-.025,.025),-.015+random.uniform(-.02,.02)),(.69+random.uniform(-.06,.05),.56+random.uniform(-.05,.04),.22),random.choice(stone),.06)
  o.rotation_euler.z=random.uniform(-.06,.06)
# Water mesh follows the same shoreline as the gaps in the paving.
vertices=[(-1.6,1.1,.045)];segments=160
for i in range(segments):
 a=2*math.pi*i/segments;r=1+.025*math.sin(a*9)+.016*math.sin(a*17)
 vertices.append((-1.6+4.75*r*math.cos(a),1.1+5.25*r*math.sin(a),.045))
mesh=bpy.data.meshes.new('Puddle shoreline');mesh.from_pydata(vertices,[],[(0,i+1,(i+1)%segments+1) for i in range(segments)]);mesh.update()
water=bpy.data.objects.new('Water • interaction mask',mesh);bpy.context.collection.objects.link(water)
water.data.materials.append(material('Still rainwater',(.12,.17,.19),.055,.76))
# Warehouses, iron frames and a distinct sawtooth silhouette.
for bx,by,w,h in [(-3,11,11,5),(8,14,8,7),(-13,17,8,8),(0,24,12,8)]:
 cube('Canal warehouse',(bx,by,h/2),(w,4,h),brick,.05)
 for floor in range(2):
  for j in range(int(w/1.8)):
   wx=bx-w/2+1+j*1.8;wz=1.5+floor*2
   lit=bx==-3 and floor==0 and j==3
   cube('Amber warehouse window' if lit else 'Warehouse glazing',(wx,by-2.025,wz),(.85,.035,1.25),window if lit else glass,.015)
   for dx in [-.46,0,.46]:cube('Iron window mullion',(wx+dx,by-2.06,wz),(.045,.055,1.35),iron)
   for dz in [-.66,0,.66]:cube('Iron window transom',(wx,by-2.06,wz+dz),(.96,.055,.045),iron)
 for j in range(int(w/2.7)):
  x=bx-w/2+j*2.7
  verts=[(x,by-2,h),(x+2.7,by-2,h),(x+2.7,by-2,h+1.3),(x,by+2,h),(x+2.7,by+2,h),(x+2.7,by+2,h+1.3)]
  me=bpy.data.meshes.new('Sawtooth roof');me.from_pydata(verts,[],[(0,1,2),(3,5,4),(0,2,5,3),(1,4,5,2)]);me.materials.append(roof);ob=bpy.data.objects.new('Sawtooth roof',me);bpy.context.collection.objects.link(ob)
 for x in [bx-w/2+.15,bx+w/2-.15]:cube('Brick pier',(x,by-2.13,h/2),(.36,.25,h),brick,.025)
# Chimney with bands and cap, reflected in the central puddle.
for cx,cy,height in [(-5,14,13),(9,22,16),(-12,27,12)]:
 bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.62,radius2=.43,depth=height,location=(cx,cy,height/2));o=bpy.context.object;o.name='Brick chimney';o.data.materials.append(brick)
 for z in [height*.55,height*.8,height-.15]:
  bpy.ops.mesh.primitive_torus_add(major_radius=.48,minor_radius=.055,location=(cx,cy,z));bpy.context.object.data.materials.append(iron)
# Dock edging, a mooring ring, and a few timber details.
for i in range(8):cube('Canal coping',(10.2,-4+i*1.7,.1),(1.1,1.6,.38),stone[2],.08)
cube('Canal water',(15,7,-.25),(8,35,.1),water.data.materials[0])
for i in range(3):cube('Dock timber',(8.3,-2+i*.42,.23),(2.7,.32,.27),wood,.035)
bpy.ops.mesh.primitive_torus_add(major_radius=.32,minor_radius=.065,location=(7,-2.2,.48),rotation=(.6,.2,0));bpy.context.object.name='Mooring ring';bpy.context.object.data.materials.append(iron)
# Large overcast source produces soft highlights on wet paving.
bpy.ops.object.light_add(type='AREA',location=(-5,1,13));light=bpy.context.object;light.data.energy=1500;light.data.shape='DISK';light.data.size=15;light.data.color=(.68,.8,1)
bpy.ops.object.camera_add(location=(7,-10,3.1));camera=bpy.context.object;camera.name='Desktop camera';camera.rotation_euler=(Vector((-1,5,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=30;scene.camera=camera
# Distance haze adds depth without covering the foreground stones.
fog=bpy.data.materials.new('Cool canal mist');fog.use_nodes=True;ns=fog.node_tree.nodes;ns.clear();out=ns.new('ShaderNodeOutputMaterial');vol=ns.new('ShaderNodeVolumePrincipled');vol.inputs['Density'].default_value=.012;vol.inputs['Color'].default_value=(.53,.62,.68,1);fog.node_tree.links.new(vol.outputs['Volume'],out.inputs['Volume']);cube('Morning mist',(0,16,8),(70,48,16),fog)
scene.render.filepath=os.path.join(OUT,'desktop.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','after-rain.blend'))
bpy.ops.render.render(write_still=True)
# Binary emissive mask, with identical camera projection and geometry occlusion.
black=emission('Mask black',(0,0,0),1);white=emission('Mask water',(1,1,1),1)
for m,c in [(black,(0,0,0,1)),(white,(1,1,1,1))]:
 m.node_tree.nodes.clear();out=m.node_tree.nodes.new('ShaderNodeOutputMaterial');e=m.node_tree.nodes.new('ShaderNodeEmission');e.inputs['Color'].default_value=c;m.node_tree.links.new(e.outputs[0],out.inputs['Surface'])
for o in scene.objects:
 if o.type=='MESH':
  if o.name=='Morning mist':o.hide_render=True;continue
  o.data.materials.clear();o.data.materials.append(white if o==water else black)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=0
scene.view_settings.view_transform='Standard';scene.cycles.samples=1
scene.render.filepath=os.path.join(OUT,'desktop-mask.png');bpy.ops.render.render(write_still=True)
