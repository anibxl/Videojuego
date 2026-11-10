class_name FloorBase
extends Node3D
## Base class for every elevator floor. Provides geometry/prop/lighting
## helpers, pickup placement, environment setup and map data.
## Subclasses implement `build()` only.

var floor_id := ""
var display_name := ""
var ambience := "amb_city"
var dark := false                 # enables the player's headlamp
var kill_y := -30.0               # falling below respawns the player
var elevator: Elevator
var env: Environment
var sun: DirectionalLight3D
var map_rects: Array = []         # [{r: Rect2(x, z, w, d), c: Color}]
var map_bounds := Rect2()
var game: Node                    # set by Game before build()

const PROP_LOD := 55.0
const MAP_FLOOR := Color(0.16, 0.17, 0.32)
const MAP_WALL := Color(0.38, 0.4, 0.7)

func build() -> void:
	pass

## Called by Game when the player falls below kill_y. Return true if the
## floor handled it (e.g. parkour challenge failure).
func on_player_fell(_player: Node) -> bool:
	return false

func on_enter() -> void:
	pass

# ================================================================= GEOMETRY
func box(pos: Vector3, size: Vector3, mat: Material, collide := true, rot_y := 0.0, parent: Node = null) -> MeshInstance3D:
	var p := parent if parent != null else self
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	mi.rotation.y = rot_y
	p.add_child(mi)
	if collide:
		var sb := StaticBody3D.new()
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		bs.size = size
		cs.shape = bs
		sb.add_child(cs)
		mi.add_child(sb)
		_record_map(pos, size, rot_y, p)
	return mi

## Box rotated around X (ramps / stairs) — `tilt` in radians.
func ramp(pos: Vector3, size: Vector3, tilt: float, mat: Material, rot_y := 0.0) -> MeshInstance3D:
	var root := Node3D.new()
	root.position = pos
	root.rotation.y = rot_y
	add_child(root)
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.rotation.x = tilt
	root.add_child(mi)
	var sb := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = size
	cs.shape = bs
	sb.add_child(cs)
	mi.add_child(sb)
	return mi

## Staircase: visual steps plus one smooth collision slope underneath, so
## the character walks up naturally (no step-snapping needed).
func stairs(start: Vector3, dir: Vector3, steps: int, step_rise: float, step_run: float, width: float, mat: Material) -> void:
	var d := Vector3(dir.x, 0, dir.z).normalized()
	for i in steps:
		var h := step_rise * (i + 1)
		var center := start + d * (step_run * (i + 0.5)) + Vector3(0, h / 2.0, 0)
		var size := Vector3(step_run, h, width) if absf(d.x) > 0.5 else Vector3(width, h, step_run)
		var mi := box(center, size, mat, false)
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	slope(start, start + d * step_run * steps + Vector3.UP * step_rise * steps, width)

## Invisible collision slope between two points (bottom-edge to top-edge).
func slope(a: Vector3, b: Vector3, width: float, mat: Material = null) -> void:
	var v := b - a
	var s := v.normalized()
	var n := (Vector3.UP - s * s.dot(Vector3.UP)).normalized()
	var x := n.cross(s)
	var sb := StaticBody3D.new()
	sb.transform = Transform3D(Basis(x, n, s), (a + b) / 2.0 - n * 0.1)
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = Vector3(width, 0.2, v.length())
	cs.shape = bs
	sb.add_child(cs)
	add_child(sb)
	if mat != null:
		var mi := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = bs.size
		mi.mesh = bm
		mi.material_override = mat
		sb.add_child(mi)

func cyl(pos: Vector3, radius: float, height: float, mat: Material, collide := true, segments := 16) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = radius
	cm.bottom_radius = radius
	cm.height = height
	cm.radial_segments = segments
	cm.rings = 1
	mi.mesh = cm
	mi.material_override = mat
	mi.position = pos
	add_child(mi)
	if collide:
		var sb := StaticBody3D.new()
		var cs := CollisionShape3D.new()
		var sh := CylinderShape3D.new()
		sh.radius = radius
		sh.height = height
		cs.shape = sh
		sb.add_child(cs)
		mi.add_child(sb)
		map_rects.append({"r": Rect2(pos.x - radius, pos.z - radius, radius * 2, radius * 2), "c": MAP_WALL})
	return mi

func sphere(pos: Vector3, radius: float, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = radius
	sm.height = radius * 2
	sm.radial_segments = 16
	sm.rings = 8
	mi.mesh = sm
	mi.material_override = mat
	mi.position = pos
	add_child(mi)
	return mi

func prop(mi: GeometryInstance3D, lod := PROP_LOD) -> GeometryInstance3D:
	mi.visibility_range_end = lod
	mi.visibility_range_end_margin = 6.0
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi

func _record_map(pos: Vector3, size: Vector3, rot_y: float, parent: Node) -> void:
	if parent != self:
		return
	var w := size.x
	var d := size.z
	if absf(sin(rot_y)) > 0.7:
		var tmp := w
		w = d
		d = tmp
	var r := Rect2(pos.x - w / 2, pos.z - d / 2, w, d)
	if size.y >= 1.2:
		map_rects.append({"r": r, "c": MAP_WALL})
	elif w * d >= 16.0:
		map_rects.append({"r": r, "c": MAP_FLOOR.lerp(MAP_WALL, clampf(pos.y / 30.0, 0.0, 0.3))})
	map_bounds = r if map_bounds.size == Vector2.ZERO else map_bounds.merge(r)

# ================================================================= LIGHTING / NEON
func omni(pos: Vector3, col: Color, energy := 1.5, rng := 8.0) -> OmniLight3D:
	var l := OmniLight3D.new()
	l.position = pos
	l.light_color = col
	l.light_energy = energy
	l.omni_range = rng
	l.omni_attenuation = 1.4
	l.shadow_enabled = false
	l.add_to_group("detail_lights")
	add_child(l)
	return l

func spot(pos: Vector3, target: Vector3, col: Color, energy := 2.0, rng := 12.0, angle := 35.0) -> SpotLight3D:
	var l := SpotLight3D.new()
	add_child(l)
	l.position = pos
	l.look_at_from_position(pos, target, Vector3.UP if absf((target - pos).normalized().y) < 0.99 else Vector3.FORWARD)
	l.light_color = col
	l.light_energy = energy
	l.spot_range = rng
	l.spot_angle = angle
	l.shadow_enabled = false
	l.add_to_group("detail_lights")
	return l

func neon_text(text: String, pos: Vector3, rot_y: float, col: Color, px := 96, pixel := 0.01, flicker := false) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font = UIKit.font_bold if UIKit.font_bold else load("res://assets/fonts/Rajdhani-Bold.ttf")
	l.font_size = px
	l.pixel_size = pixel
	l.modulate = Color(col.r * 2.2, col.g * 2.2, col.b * 2.2)
	l.outline_size = 18
	l.outline_modulate = Color(col.r, col.g, col.b, 0.25)
	l.shaded = false
	l.position = pos
	l.rotation.y = rot_y
	l.visibility_range_end = 120.0
	add_child(l)
	if flicker:
		_flicker(l)
	return l

func _flicker(l: Label3D) -> void:
	var base := l.modulate
	var tw := l.create_tween().set_loops()
	tw.tween_interval(randf_range(2.0, 5.0))
	tw.tween_property(l, "modulate", base * Color(0.3, 0.3, 0.3, 1.0), 0.05)
	tw.tween_property(l, "modulate", base, 0.05)
	tw.tween_property(l, "modulate", base * Color(0.4, 0.4, 0.4, 1.0), 0.08)
	tw.tween_property(l, "modulate", base, 0.06)

func neon_bar(pos: Vector3, size: Vector3, col: Color, energy := 3.0, rot_y := 0.0) -> MeshInstance3D:
	var mi := box(pos, size, Mats.neon(col, energy), false, rot_y)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi

## Faint coloured light pool on the ground under a neon sign — a cheap fake
## of wet-street reflections that costs no real light.
func neon_puddle(pos: Vector3, size: Vector2, col: Color) -> void:
	var mi := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = size
	mi.mesh = pm
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.albedo_color = Color(col.r, col.g, col.b, 0.22)
	var g := GradientTexture2D.new()
	var grad := Gradient.new()
	grad.set_color(0, Color(1, 1, 1, 1))
	grad.set_color(1, Color(1, 1, 1, 0))
	g.gradient = grad
	g.fill = GradientTexture2D.FILL_RADIAL
	g.fill_from = Vector2(0.5, 0.5)
	g.fill_to = Vector2(1.0, 0.5)
	g.width = 64
	g.height = 64
	m.albedo_texture = g
	mi.material_override = m
	mi.position = pos + Vector3(0, 0.02, 0)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)

# ================================================================= BUILDINGS
## Skyscraper with procedural windows, rooftop details and optional sign.
func building(pos: Vector3, size: Vector3, seed_v: int, base := Color(0.07, 0.07, 0.13), lit := 0.22, collide := true) -> void:
	var mi := box(pos + Vector3(0, size.y / 2, 0), size, Mats.building(seed_v, base, lit), collide)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	# roof parapet + details
	var top := pos.y + size.y
	var trim := Mats.std(base.lightened(0.1), 0.8)
	box(Vector3(pos.x, top + 0.4, pos.z + size.z / 2 - 0.15), Vector3(size.x, 0.8, 0.3), trim, false)
	box(Vector3(pos.x, top + 0.4, pos.z - size.z / 2 + 0.15), Vector3(size.x, 0.8, 0.3), trim, false)
	if seed_v % 3 == 0:
		var ant := box(Vector3(pos.x + size.x * 0.2, top + 3.0, pos.z), Vector3(0.2, 6.0, 0.2), Mats.std(Color(0.2, 0.2, 0.25)), false)
		ant.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		sphere(Vector3(pos.x + size.x * 0.2, top + 6.1, pos.z), 0.18, Mats.neon(Color(1.0, 0.2, 0.3), 5.0))
	elif seed_v % 3 == 1:
		box(Vector3(pos.x - size.x * 0.2, top + 1.0, pos.z + 1.0), Vector3(3.0, 2.0, 2.5), trim, false)
	# neon edge strip on some buildings
	if seed_v % 4 == 0:
		var c: Color = [Color(1.0, 0.3, 0.7), Color(0.3, 0.9, 1.0), Color(0.6, 0.4, 1.0)][seed_v % 3]
		neon_bar(Vector3(pos.x - size.x / 2 - 0.05, pos.y + size.y * 0.5 + 2, pos.z + size.z / 2 + 0.05), Vector3(0.12, size.y - 6, 0.12), c, 2.5)

# ================================================================= PROPS
func prop_crate(pos: Vector3, s := 1.0, rot_y := 0.0) -> void:
	box(pos + Vector3(0, s / 2, 0), Vector3(s, s, s), Mats.std(Color(0.28, 0.2, 0.16), 0.9), true, rot_y)

func prop_bench(pos: Vector3, rot_y := 0.0) -> void:
	var root := Node3D.new()
	root.position = pos
	root.rotation.y = rot_y
	add_child(root)
	var wood := Mats.std(Color(0.3, 0.2, 0.18), 0.8)
	var metal := Mats.std(Color(0.15, 0.15, 0.2), 0.5, 0.6)
	box(Vector3(0, 0.45, 0), Vector3(2.0, 0.1, 0.6), wood, true, 0.0, root)
	box(Vector3(0, 0.8, -0.28), Vector3(2.0, 0.5, 0.08), wood, false, 0.0, root)
	box(Vector3(-0.85, 0.22, 0), Vector3(0.08, 0.45, 0.6), metal, false, 0.0, root)
	box(Vector3(0.85, 0.22, 0), Vector3(0.08, 0.45, 0.6), metal, false, 0.0, root)

func prop_lamp(pos: Vector3, col := Color(1.0, 0.75, 0.45), with_light := false) -> void:
	var p := cyl(pos + Vector3(0, 2.2, 0), 0.08, 4.4, Mats.std(Color(0.12, 0.12, 0.17), 0.5, 0.7), true, 8)
	prop(p, 90)
	var head := box(pos + Vector3(0.35, 4.35, 0), Vector3(0.9, 0.12, 0.3), Mats.std(Color(0.12, 0.12, 0.17), 0.5, 0.7), false)
	prop(head, 90)
	var bulb := box(pos + Vector3(0.45, 4.27, 0), Vector3(0.6, 0.05, 0.2), Mats.neon(col, 4.0), false)
	prop(bulb, 90)
	neon_puddle(Vector3(pos.x + 0.45, pos.y, pos.z), Vector2(4, 4), col)
	if with_light:
		omni(pos + Vector3(0.45, 3.8, 0), col, 1.2, 9.0)

func prop_vending(pos: Vector3, rot_y: float, col := Color(0.3, 0.6, 1.0)) -> Node3D:
	var root := Node3D.new()
	root.position = pos
	root.rotation.y = rot_y
	add_child(root)
	box(Vector3(0, 1.0, 0), Vector3(1.1, 2.0, 0.8), Mats.std(col.darkened(0.5), 0.4, 0.3), true, 0.0, root)
	box(Vector3(0, 1.2, 0.41), Vector3(0.9, 1.3, 0.02), Mats.neon(col, 1.5), false, 0.0, root)
	box(Vector3(0, 0.3, 0.41), Vector3(0.6, 0.2, 0.03), Mats.std(Color(0.05, 0.05, 0.08)), false, 0.0, root)
	return root

func prop_car(pos: Vector3, rot_y: float, col: Color) -> void:
	var root := Node3D.new()
	root.position = pos
	root.rotation.y = rot_y
	add_child(root)
	var body := Mats.std(col, 0.35, 0.6)
	box(Vector3(0, 0.55, 0), Vector3(1.9, 0.7, 4.2), body, true, 0.0, root)
	box(Vector3(0, 1.15, -0.2), Vector3(1.7, 0.55, 2.2), Mats.std(Color(0.05, 0.06, 0.1), 0.1, 0.5), false, 0.0, root)
	box(Vector3(-0.6, 0.6, 2.11), Vector3(0.4, 0.15, 0.02), Mats.neon(Color(1.0, 0.95, 0.8), 1.0), false, 0.0, root)
	box(Vector3(0.6, 0.6, 2.11), Vector3(0.4, 0.15, 0.02), Mats.neon(Color(1.0, 0.95, 0.8), 1.0), false, 0.0, root)
	box(Vector3(0, 0.6, -2.11), Vector3(1.5, 0.1, 0.02), Mats.neon(Color(1.0, 0.15, 0.2), 2.0), false, 0.0, root)
	for x in [-0.85, 0.85]:
		for z in [-1.3, 1.3]:
			var w := MeshInstance3D.new()
			var cm := CylinderMesh.new()
			cm.top_radius = 0.33
			cm.bottom_radius = 0.33
			cm.height = 0.25
			cm.radial_segments = 10
			w.mesh = cm
			w.rotation.z = PI / 2
			w.position = Vector3(x, 0.33, z)
			w.material_override = Mats.std(Color(0.04, 0.04, 0.05), 0.9)
			root.add_child(prop(w))

func prop_planter(pos: Vector3, leaf := Color(0.2, 0.55, 0.45)) -> void:
	box(pos + Vector3(0, 0.35, 0), Vector3(1.2, 0.7, 1.2), Mats.std(Color(0.18, 0.17, 0.25), 0.9), true)
	var b := sphere(pos + Vector3(0, 1.2, 0), 0.65, Mats.std(leaf, 0.8))
	prop(b)
	var b2 := sphere(pos + Vector3(0.25, 1.6, 0.1), 0.4, Mats.std(leaf.lightened(0.1), 0.8))
	prop(b2)

func prop_barrier(pos: Vector3, rot_y := 0.0) -> void:
	box(pos + Vector3(0, 0.5, 0), Vector3(2.0, 1.0, 0.3), Mats.std(Color(0.5, 0.5, 0.55), 0.9), true, rot_y)
	box(pos + Vector3(0, 0.75, 0), Vector3(2.02, 0.12, 0.32), Mats.neon(Color(1.0, 0.55, 0.1), 1.5), false, rot_y)

func prop_ac(pos: Vector3, rot_y := 0.0) -> void:
	var mi := box(pos, Vector3(1.0, 0.7, 0.6), Mats.std(Color(0.55, 0.56, 0.6), 0.6, 0.3), false, rot_y)
	prop(mi)

func prop_pipe(from: Vector3, to: Vector3, radius := 0.12, col := Color(0.25, 0.26, 0.32)) -> void:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = radius
	cm.bottom_radius = radius
	cm.height = from.distance_to(to)
	cm.radial_segments = 8
	cm.rings = 1
	mi.mesh = cm
	mi.material_override = Mats.std(col, 0.4, 0.7)
	add_child(mi)
	mi.position = (from + to) / 2
	var dir := (to - from).normalized()
	if absf(dir.dot(Vector3.UP)) < 0.999:
		mi.basis = Basis(Quaternion(Vector3.UP, dir))
	prop(mi)

func prop_shopfront(pos: Vector3, rot_y: float, sign_text: String, col: Color, width := 8.0, shutter := true) -> void:
	## A ground-floor shop facade: glass, frame, shutter and neon sign.
	var root := Node3D.new()
	root.position = pos
	root.rotation.y = rot_y
	add_child(root)
	box(Vector3(0, 1.6, 0), Vector3(width - 1.0, 3.0, 0.1), Mats.glass(Color(col.r * 0.3, col.g * 0.3, col.b * 0.4, 0.6)), false, 0.0, root)
	box(Vector3(0, 1.6, -0.6), Vector3(width - 1.0, 3.0, 0.1), Mats.neon(col.darkened(0.6), 0.6), false, 0.0, root)
	box(Vector3(0, 3.25, 0.1), Vector3(width - 0.6, 0.3, 0.3), Mats.std(Color(0.1, 0.1, 0.16)), false, 0.0, root)
	if shutter:
		box(Vector3(0, 2.6, 0.08), Vector3(width - 1.0, 1.0, 0.05), Mats.std(Color(0.25, 0.25, 0.3), 0.6, 0.5), false, 0.0, root)
	var l := Label3D.new()
	l.text = sign_text
	l.font = load("res://assets/fonts/Rajdhani-Bold.ttf")
	l.font_size = 110
	l.pixel_size = 0.01
	l.modulate = Color(col.r * 2.2, col.g * 2.2, col.b * 2.2)
	l.outline_size = 16
	l.outline_modulate = Color(col.r, col.g, col.b, 0.25)
	l.shaded = false
	l.position = Vector3(0, 3.9, 0.2)
	l.visibility_range_end = 110.0
	root.add_child(l)
	neon_puddle(pos + Vector3(sin(rot_y), 0, cos(rot_y)) * 1.8, Vector2(width, 4.0), col)

# ================================================================= GAMEPLAY OBJECTS
func add_elevator(pos: Vector3, rot_y: float, label: String, accent := Color(0.42, 0.96, 1.0)) -> Elevator:
	elevator = Elevator.new()
	elevator.position = pos
	elevator.rotation.y = rot_y
	add_child(elevator)
	elevator.build(label, accent)
	map_rects.append({"r": Rect2(pos.x - 2.2, pos.z - 2.2, 4.4, 4.4), "c": Color(0.42, 0.96, 1.0, 0.8), "elevator": true})
	return elevator

func add_fragment(pos: Vector3, idx: int) -> void:
	var uid := "%s_frag_%d" % [floor_id, idx]
	if WorldState.is_collected(uid):
		return
	var f := EnergyFragment.new()
	f.setup(uid)
	f.position = pos
	add_child(f)

func add_collectible(id: String, pos: Vector3, beam := true) -> void:
	var uid := "item_" + id
	if WorldState.is_collected(uid) or Inventory.has_item(id):
		return
	var c := CollectiblePickup.new()
	c.setup(id, uid, beam)
	c.position = pos
	add_child(c)

func add_note(id: String, pos: Vector3, rot_y := 0.0) -> void:
	var uid := "item_" + id
	if WorldState.is_collected(uid) or Inventory.is_discovered(id):
		return
	var root := Node3D.new()
	root.position = pos
	root.rotation.y = rot_y
	add_child(root)
	var paper := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.42, 0.56, 0.02)
	paper.mesh = bm
	paper.material_override = Mats.neon(Color(1.0, 0.95, 0.8), 0.7)
	paper.rotation.x = -0.15
	root.add_child(paper)
	var glow := omni(Vector3.ZERO, Color(1.0, 0.9, 0.7), 0.5, 2.2)
	glow.reparent(root, false)
	glow.position = Vector3(0, 0.3, 0.4)
	var it := Interactable.new()
	it.prompt = "Read Note"
	it.radius = 2.0
	it.action = func(_p):
		WorldState.mark_collected(uid)
		Audio.play("pickup", -6.0)
		Inventory.add_item(id)
		Events.note_opened.emit(id)
		root.queue_free()
	root.add_child(it)
	root.add_to_group("scannable_static")

func add_location(id: String, pos: Vector3, size: Vector3) -> void:
	var z := DiscoveryZone.new()
	z.position = pos
	add_child(z)
	z.setup(id, size)

func add_interactable(pos: Vector3, prompt: String, action: Callable, radius := 2.3) -> Interactable:
	var it := Interactable.new()
	it.prompt = prompt
	it.radius = radius
	it.action = action
	it.position = pos
	add_child(it)
	return it

func add_door(pos: Vector3, size: Vector3, mat: Material, open_offset: Vector3, rot_y := 0.0, start_open := false) -> SlidingDoor:
	var d := SlidingDoor.new()
	d.position = pos
	d.rotation.y = rot_y
	add_child(d)
	d.setup(size, mat, open_offset, start_open)
	return d

func add_invisible_wall(pos: Vector3, size: Vector3) -> void:
	var sb := StaticBody3D.new()
	sb.position = pos
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = size
	cs.shape = bs
	sb.add_child(cs)
	add_child(sb)

# ================================================================= ENVIRONMENT
## cfg keys: top, horizon, glow, ambient, ambient_energy, fog, fog_density,
## sun_color, sun_energy, sun_dir(Vector3 euler deg), glow_strength, stars, aurora, bg (Color for interiors)
func setup_environment(cfg: Dictionary) -> void:
	env = Environment.new()
	if cfg.has("bg"):
		env.background_mode = Environment.BG_COLOR
		env.background_color = cfg.bg
	else:
		env.background_mode = Environment.BG_SKY
		var sky := Sky.new()
		sky.sky_material = Mats.sky_material(cfg.get("top", Color(0.02, 0.02, 0.07)), cfg.get("horizon", Color(0.22, 0.09, 0.32)),
			cfg.get("glow", Color(0.1, 0.35, 0.6)), cfg.get("stars", 1.0), cfg.get("aurora", 1.0))
		sky.radiance_size = Sky.RADIANCE_SIZE_64
		sky.process_mode = Sky.PROCESS_MODE_QUALITY
		env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = cfg.get("ambient", Color(0.35, 0.3, 0.6))
	env.ambient_light_energy = cfg.get("ambient_energy", 0.5)
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY if not cfg.has("bg") else Environment.REFLECTION_SOURCE_DISABLED
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = cfg.get("exposure", 1.0)
	env.tonemap_white = 6.0
	env.glow_enabled = true
	env.glow_intensity = cfg.get("glow_strength", 0.9)
	env.glow_strength = 1.0
	env.glow_bloom = 0.05
	env.glow_hdr_threshold = 0.9
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_ADDITIVE
	env.set_glow_level(0, 0.0)
	env.set_glow_level(1, 1.0)
	env.set_glow_level(2, 0.8)
	env.set_glow_level(3, 0.5)
	env.set_glow_level(4, 0.3)
	env.fog_enabled = true
	env.fog_light_color = cfg.get("fog", Color(0.16, 0.1, 0.28))
	env.fog_density = cfg.get("fog_density", 0.012)
	env.fog_sky_affect = cfg.get("fog_sky", 0.25)
	env.adjustment_enabled = true
	env.adjustment_saturation = cfg.get("saturation", 1.12)
	env.adjustment_contrast = 1.05
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	var e: Vector3 = cfg.get("sun_dir", Vector3(-50, 35, 0))
	sun.rotation_degrees = e
	sun.light_color = cfg.get("sun_color", Color(0.55, 0.55, 0.9))
	sun.light_energy = cfg.get("sun_energy", 0.45)
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	sun.directional_shadow_max_distance = 45.0
	sun.shadow_blur = 1.5
	add_child(sun)

## Applies Low / Medium / High presets to this floor.
func apply_graphics(preset: int) -> void:
	if env:
		env.glow_enabled = preset >= 1
		env.fog_density = env.fog_density
	if sun:
		sun.shadow_enabled = preset >= 1
		sun.directional_shadow_max_distance = 30.0 if preset == 1 else 50.0
	for l in get_tree().get_nodes_in_group("detail_lights"):
		if is_ancestor_of(l):
			l.visible = preset >= 1 or l.light_energy >= 1.5
	for p in get_tree().get_nodes_in_group("ambient_particles"):
		if is_ancestor_of(p):
			p.visible = preset >= 1
