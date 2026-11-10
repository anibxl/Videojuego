class_name Elevator
extends Node3D
## The physical elevator cab that exists on every floor.
## Local space: cab floor at y=0, interior centred on the origin, doors on +Z.
## The player stands inside and uses the wall panel to choose a floor; the
## Game scene runs the travel sequence (doors, hum, shake, transition).

const W := 4.0
const D := 4.0
const H := 3.4
const DOOR_W := 2.2
const DOOR_H := 2.8

var door_l: SlidingDoor
var door_r: SlidingDoor
var indicator_out: Label3D
var indicator_in: Label3D
var panel_light: OmniLight3D
var _arrow: Label3D
var accent := Color(0.42, 0.96, 1.0)

func build(floor_label: String, accent_color := Color(0.42, 0.96, 1.0)) -> void:
	accent = accent_color
	var wall := Mats.std(Color(0.11, 0.1, 0.18), 0.35, 0.6)
	var trim := Mats.neon(accent, 2.6)
	var floor_m := Mats.tiles(Color(0.12, 0.11, 0.2), Color(0.1, 0.09, 0.17), Color(0.4, 0.35, 0.8), 1.0, 0.2, 1.0, 0.05)
	# floor + ceiling
	_box(Vector3(0, -0.1, 0), Vector3(W + 0.4, 0.2, D + 0.4), floor_m)
	_box(Vector3(0, H + 0.1, 0), Vector3(W + 0.4, 0.2, D + 0.4), wall)
	# back + sides
	_box(Vector3(0, H / 2, -D / 2 - 0.1), Vector3(W + 0.4, H, 0.2), wall)
	_box(Vector3(-W / 2 - 0.1, H / 2, 0), Vector3(0.2, H, D), wall)
	_box(Vector3(W / 2 + 0.1, H / 2, 0), Vector3(0.2, H, D), wall)
	# front wall around door opening
	var side_w := (W - DOOR_W) / 2.0
	_box(Vector3(-(DOOR_W / 2 + side_w / 2), H / 2, D / 2 + 0.1), Vector3(side_w + 0.2, H, 0.2), wall)
	_box(Vector3(DOOR_W / 2 + side_w / 2, H / 2, D / 2 + 0.1), Vector3(side_w + 0.2, H, 0.2), wall)
	_box(Vector3(0, (H + DOOR_H) / 2, D / 2 + 0.1), Vector3(DOOR_W, H - DOOR_H, 0.2), wall)
	# neon door frame (outside)
	_box(Vector3(0, DOOR_H + 0.08, D / 2 + 0.24), Vector3(DOOR_W + 0.3, 0.08, 0.06), trim, false)
	_box(Vector3(-DOOR_W / 2 - 0.12, DOOR_H / 2, D / 2 + 0.24), Vector3(0.08, DOOR_H, 0.06), trim, false)
	_box(Vector3(DOOR_W / 2 + 0.12, DOOR_H / 2, D / 2 + 0.24), Vector3(0.08, DOOR_H, 0.06), trim, false)
	# interior light strips + ceiling panel
	_box(Vector3(0, H - 0.02, 0), Vector3(2.4, 0.04, 2.4), Mats.neon(Color(1.0, 0.92, 0.8), 1.6), false)
	_box(Vector3(-W / 2 + 0.02, 1.1, 0), Vector3(0.04, 0.05, D - 0.4), trim, false)
	_box(Vector3(W / 2 - 0.02, 1.1, 0), Vector3(0.04, 0.05, D - 0.4), trim, false)
	_box(Vector3(0, 1.1, -D / 2 + 0.02), Vector3(W - 0.4, 0.05, 0.04), trim, false)
	# handrail on the back wall
	_box(Vector3(0, 0.95, -D / 2 + 0.12), Vector3(W - 0.8, 0.06, 0.06), Mats.std(Color(0.7, 0.72, 0.8), 0.2, 1.0), false)
	var light := OmniLight3D.new()
	light.position = Vector3(0, H - 0.4, 0)
	light.light_color = Color(1.0, 0.9, 0.8)
	light.light_energy = 1.4
	light.omni_range = 5.5
	light.shadow_enabled = false
	add_child(light)
	# doors
	var door_mat := Mats.std(Color(0.55, 0.57, 0.68), 0.25, 0.9)
	door_l = SlidingDoor.new()
	add_child(door_l)
	door_l.position = Vector3(-DOOR_W / 4, DOOR_H / 2, D / 2 - 0.02)
	door_l.setup(Vector3(DOOR_W / 2, DOOR_H, 0.08), door_mat, Vector3(-DOOR_W / 2 + 0.05, 0, 0), true)
	door_r = SlidingDoor.new()
	add_child(door_r)
	door_r.position = Vector3(DOOR_W / 4, DOOR_H / 2, D / 2 - 0.02)
	door_r.setup(Vector3(DOOR_W / 2, DOOR_H, 0.08), door_mat, Vector3(DOOR_W / 2 - 0.05, 0, 0), true)
	for d in [door_l, door_r]:
		d.duration = 0.85
		var stripe := MeshInstance3D.new()
		var sm := BoxMesh.new()
		sm.size = Vector3(0.03, DOOR_H * 0.8, 0.1)
		stripe.mesh = sm
		stripe.material_override = trim
		stripe.position.x = DOOR_W / 4 - 0.03 if d == door_l else -DOOR_W / 4 + 0.03
		d.add_detail(stripe)
	# indicators
	indicator_out = _label(floor_label, Vector3(0, DOOR_H + 0.42, D / 2 + 0.26), 0.0, 96)
	indicator_in = _label(floor_label, Vector3(0, DOOR_H + 0.3, D / 2 - 0.02), PI, 72)
	_arrow = _label("", Vector3(0.9, DOOR_H + 0.3, D / 2 - 0.02), PI, 56)
	# control panel (inside, right wall near the door)
	var panel_root := Node3D.new()
	panel_root.position = Vector3(W / 2 - 0.05, 1.3, D / 2 - 0.9)
	add_child(panel_root)
	var pb := MeshInstance3D.new()
	var pbm := BoxMesh.new()
	pbm.size = Vector3(0.06, 0.9, 0.5)
	pb.mesh = pbm
	pb.material_override = Mats.std(Color(0.05, 0.05, 0.1), 0.3, 0.5)
	panel_root.add_child(pb)
	for i in 8:
		var btn := MeshInstance3D.new()
		var bmm := CylinderMesh.new()
		bmm.top_radius = 0.04
		bmm.bottom_radius = 0.04
		bmm.height = 0.03
		bmm.radial_segments = 10
		btn.mesh = bmm
		btn.rotation.z = PI / 2
		btn.position = Vector3(-0.04, 0.3 - (i / 2) * 0.17, -0.1 + (i % 2) * 0.2)
		btn.material_override = Mats.neon(accent if i != 6 else Color(1.0, 0.6, 0.3), 2.0)
		panel_root.add_child(btn)
	panel_light = OmniLight3D.new()
	panel_light.position = Vector3(-0.3, 0, 0)
	panel_light.light_color = accent
	panel_light.light_energy = 0.6
	panel_light.omni_range = 1.6
	panel_root.add_child(panel_light)
	var it := Interactable.new()
	it.prompt = "Use Elevator"
	it.radius = 2.4
	it.position = Vector3(0, 1.2, 0)
	it.action = func(_p): Events.request_panel.emit("elevator", {})
	add_child(it)

func _box(pos: Vector3, size: Vector3, mat: Material, collide := true) -> void:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	add_child(mi)
	if collide:
		var sb := StaticBody3D.new()
		sb.position = pos
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		bs.size = size
		cs.shape = bs
		sb.add_child(cs)
		add_child(sb)

func _label(text: String, pos: Vector3, rot_y: float, px: int) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font = load("res://assets/fonts/Rajdhani-Bold.ttf")
	l.font_size = px
	l.pixel_size = 0.004
	l.modulate = Color(accent.r * 1.6, accent.g * 1.6, accent.b * 1.6)
	l.outline_size = 0
	l.shaded = false
	l.double_sided = false
	l.position = pos
	l.rotation.y = rot_y
	add_child(l)
	return l

func set_indicator(text: String, arrow := "") -> void:
	indicator_out.text = text
	indicator_in.text = text
	_arrow.text = arrow

func close_doors(silent := false) -> void:
	door_l.close(silent)
	await door_r.close(silent)

func open_doors(silent := false) -> void:
	door_l.open(true)
	await door_r.open(silent)

func set_doors_instant(open_v: bool) -> void:
	door_l.set_open_instant(open_v)
	door_r.set_open_instant(open_v)

## Where the player stands when arriving (inside, facing the doors).
func spawn_transform() -> Transform3D:
	var t := Transform3D()
	t.origin = global_transform * Vector3(0, 0.1, -0.4)
	t.basis = Basis(Vector3.UP, global_rotation.y + PI)
	return t
