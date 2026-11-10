class_name PlayerModel
extends Node3D
## The explorer's 3D body, built from primitives with a hand-tuned palette,
## and animated procedurally: idle breathing, walk, run (lean + arm pump),
## jump (tuck), fall and landing squash. Cosmetics attach to sockets.
## Model faces -Z.

var hips: Node3D
var torso: Node3D
var head: Node3D
var arm_l: Node3D
var arm_r: Node3D
var leg_l: Node3D
var leg_r: Node3D
var hat_socket: Node3D
var feather_socket: Node3D
var lamp: SpotLight3D
var trail: CPUParticles3D
var _visor_mat: StandardMaterial3D

var _phase := 0.0
var _t := 0.0
var _land := 0.0
var _speed_blend := 0.0
var _air_blend := 0.0

const JACKET := Color(0.22, 0.16, 0.42)
const JACKET_DARK := Color(0.12, 0.1, 0.24)
const PANTS := Color(0.08, 0.09, 0.16)
const SKIN := Color(0.85, 0.7, 0.6)
const ACCENT := Color(0.42, 0.96, 1.0)

func _ready() -> void:
	_build()
	Events.equipment_changed.connect(refresh_cosmetics)
	refresh_cosmetics()

func _mesh(parent: Node3D, mesh: Mesh, mat: Material, pos := Vector3.ZERO, rot := Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.rotation = rot
	parent.add_child(mi)
	return mi

func _capsule(r: float, h: float) -> CapsuleMesh:
	var c := CapsuleMesh.new()
	c.radius = r
	c.height = h
	c.radial_segments = 14
	c.rings = 4
	return c

func _sphere(r: float) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2
	s.radial_segments = 16
	s.rings = 8
	return s

func _torus(inner: float, outer: float) -> TorusMesh:
	var t := TorusMesh.new()
	t.inner_radius = inner
	t.outer_radius = outer
	t.rings = 16
	t.ring_segments = 8
	return t

func _boxm(size: Vector3) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = size
	return b

func _build() -> void:
	var jacket := Mats.std(JACKET, 0.7)
	var jacket_dark := Mats.std(JACKET_DARK, 0.8)
	var pants := Mats.std(PANTS, 0.85)
	var skin := Mats.std(SKIN, 0.6)
	var neon := Mats.neon(ACCENT, 3.0)
	hips = Node3D.new()
	hips.position.y = 0.92
	add_child(hips)
	# legs
	leg_l = Node3D.new(); leg_l.position = Vector3(-0.13, 0, 0); hips.add_child(leg_l)
	leg_r = Node3D.new(); leg_r.position = Vector3(0.13, 0, 0); hips.add_child(leg_r)
	for leg in [leg_l, leg_r]:
		_mesh(leg, _capsule(0.1, 0.84), pants, Vector3(0, -0.42, 0))
		_mesh(leg, _boxm(Vector3(0.2, 0.14, 0.32)), Mats.std(Color(0.9, 0.92, 1.0), 0.5), Vector3(0, -0.86, -0.05))
		_mesh(leg, _boxm(Vector3(0.21, 0.03, 0.33)), neon, Vector3(0, -0.8, -0.05))
	# torso
	torso = Node3D.new()
	hips.add_child(torso)
	_mesh(torso, _capsule(0.22, 0.72), jacket, Vector3(0, 0.3, 0))
	_mesh(torso, _boxm(Vector3(0.46, 0.06, 0.3)), jacket_dark, Vector3(0, 0.02, 0))  # belt
	_mesh(torso, _boxm(Vector3(0.05, 0.4, 0.02)), neon, Vector3(0, 0.35, -0.215))   # zipper glow
	# backpack
	_mesh(torso, _boxm(Vector3(0.38, 0.42, 0.18)), jacket_dark, Vector3(0, 0.38, 0.26))
	_mesh(torso, _boxm(Vector3(0.3, 0.04, 0.02)), neon, Vector3(0, 0.45, 0.355))
	_mesh(torso, _boxm(Vector3(0.3, 0.04, 0.02)), neon, Vector3(0, 0.33, 0.355))
	# scarf
	_mesh(torso, _torus(0.13, 0.22), Mats.std(Color(0.95, 0.35, 0.55), 0.8), Vector3(0, 0.66, 0), Vector3(0.15, 0, 0))
	# head
	head = Node3D.new()
	head.position = Vector3(0, 0.82, 0)
	torso.add_child(head)
	_mesh(head, _sphere(0.19), skin, Vector3(0, 0.02, 0))
	var hood := _mesh(head, _sphere(0.235), jacket, Vector3(0, 0.06, 0.035))
	hood.scale = Vector3(1.0, 1.02, 1.05)
	_visor_mat = Mats.neon(ACCENT, 3.5).duplicate()
	var visor := _mesh(head, _capsule(0.06, 0.34), _visor_mat, Vector3(0, 0.03, -0.17), Vector3(0, 0, PI / 2))
	visor.scale = Vector3(1, 1, 0.6)
	hat_socket = Node3D.new(); hat_socket.position = Vector3(0, 0.3, 0.02); head.add_child(hat_socket)
	feather_socket = Node3D.new(); feather_socket.position = Vector3(0.18, 0.18, 0.08); head.add_child(feather_socket)
	# arms
	arm_l = Node3D.new(); arm_l.position = Vector3(-0.3, 0.6, 0); torso.add_child(arm_l)
	arm_r = Node3D.new(); arm_r.position = Vector3(0.3, 0.6, 0); torso.add_child(arm_r)
	for arm in [arm_l, arm_r]:
		_mesh(arm, _capsule(0.075, 0.6), jacket, Vector3(0, -0.28, 0))
		_mesh(arm, _sphere(0.075), Mats.std(Color(0.1, 0.1, 0.16), 0.6), Vector3(0, -0.6, 0))
		_mesh(arm, _boxm(Vector3(0.16, 0.03, 0.16)), neon, Vector3(0, -0.48, 0))
	# headlamp for dark floors
	lamp = SpotLight3D.new()
	lamp.position = Vector3(0, 0.05, -0.2)
	lamp.rotation.x = -0.18
	lamp.light_color = Color(0.8, 0.95, 1.0)
	lamp.light_energy = 2.4
	lamp.spot_range = 16.0
	lamp.spot_angle = 38.0
	lamp.shadow_enabled = false
	lamp.visible = false
	head.add_child(lamp)
	for c in find_children("*", "MeshInstance3D", true, false):
		(c as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON

func refresh_cosmetics() -> void:
	for c in hat_socket.get_children(): c.queue_free()
	for c in feather_socket.get_children(): c.queue_free()
	if Inventory.equipped.get("hat", "") == "e_neon_crown" and Inventory.has_item("e_neon_crown"):
		var crown := Node3D.new()
		hat_socket.add_child(crown)
		var band := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.17; cm.bottom_radius = 0.16; cm.height = 0.07; cm.radial_segments = 16
		band.mesh = cm
		band.material_override = Mats.neon(Color(0.85, 0.45, 1.0), 4.0)
		crown.add_child(band)
		for i in 5:
			var a := i * TAU / 5.0
			var spike := MeshInstance3D.new()
			var pm := PrismMesh.new()
			pm.size = Vector3(0.07, 0.12, 0.04)
			spike.mesh = pm
			spike.material_override = band.material_override
			spike.position = Vector3(cos(a) * 0.155, 0.09, sin(a) * 0.155)
			spike.rotation.y = -a + PI / 2
			crown.add_child(spike)
	if Inventory.equipped.get("feather", "") == "r_silver_feather" and Inventory.has_item("r_silver_feather"):
		var f := MeshInstance3D.new()
		var fm := CapsuleMesh.new()
		fm.radius = 0.035; fm.height = 0.36; fm.radial_segments = 8; fm.rings = 2
		f.mesh = fm
		f.material_override = Mats.neon(Color(0.85, 0.9, 1.0), 1.5)
		f.rotation = Vector3(0.6, 0, -0.5)
		f.position.y = 0.12
		feather_socket.add_child(f)
	var want_trail: bool = Inventory.equipped.get("trail", false) and Progression.level >= GameDB.LEVEL_TRAIL
	if want_trail and trail == null:
		trail = CPUParticles3D.new()
		trail.amount = 40
		trail.lifetime = 0.9
		trail.local_coords = false
		trail.direction = Vector3.UP
		trail.spread = 30.0
		trail.initial_velocity_min = 0.1
		trail.initial_velocity_max = 0.4
		trail.gravity = Vector3.ZERO
		trail.scale_amount_min = 0.04
		trail.scale_amount_max = 0.08
		var qm := SphereMesh.new()
		qm.radius = 0.5; qm.height = 1.0; qm.radial_segments = 6; qm.rings = 3
		qm.material = Mats.neon(Color(0.6, 0.4, 1.0), 4.0)
		trail.mesh = qm
		var g := Gradient.new()
		g.set_color(0, Color(1, 1, 1, 1))
		g.set_color(1, Color(1, 1, 1, 0))
		trail.color_ramp = g
		trail.position = Vector3(0, 0.6, 0.3)
		add_child(trail)
	elif not want_trail and trail != null:
		trail.queue_free()
		trail = null

func set_lamp(on: bool) -> void:
	lamp.visible = on

func land(strength: float) -> void:
	_land = clampf(strength, 0.3, 1.0)

## speed: horizontal speed (m/s), running: sprinting, on_floor, vy: vertical velocity
func animate(delta: float, speed: float, running: bool, on_floor: bool, vy: float) -> void:
	_t += delta
	var target_speed := clampf(speed / 8.0, 0.0, 1.0)
	_speed_blend = lerpf(_speed_blend, target_speed, 1.0 - exp(-delta * 10.0))
	_air_blend = lerpf(_air_blend, 0.0 if on_floor else 1.0, 1.0 - exp(-delta * 12.0))
	var stride := 7.0 + speed * 1.15
	if on_floor and speed > 0.2:
		_phase += delta * stride
	var amp := clampf(speed / 4.5, 0.0, 1.0) * (0.55 + (0.35 if running else 0.0))
	var s := sin(_phase)
	# ground cycle
	var leg_swing := s * amp
	var arm_swing := -s * amp * (0.9 if running else 0.7)
	var bob := absf(sin(_phase)) * 0.06 * amp
	var breathe := sin(_t * 2.2) * 0.012 * (1.0 - _speed_blend)
	# air pose
	var air_leg_l := 0.55 if vy > 0 else 0.25
	var air_leg_r := -0.15 if vy > 0 else 0.1
	leg_l.rotation.x = lerpf(leg_swing, air_leg_l, _air_blend)
	leg_r.rotation.x = lerpf(-leg_swing, air_leg_r, _air_blend)
	arm_l.rotation.x = lerpf(arm_swing, -0.6, _air_blend)
	arm_r.rotation.x = lerpf(-arm_swing, -0.4, _air_blend)
	arm_l.rotation.z = lerpf(-0.08 - sin(_t * 1.5) * 0.02 * (1.0 - _speed_blend), -0.7, _air_blend)
	arm_r.rotation.z = lerpf(0.08 + sin(_t * 1.5) * 0.02 * (1.0 - _speed_blend), 0.7, _air_blend)
	# lean forward when running, slight twist with stride
	torso.rotation.x = lerpf(torso.rotation.x, (-0.22 if running and speed > 5.0 else -0.06 * _speed_blend), 1.0 - exp(-delta * 8.0))
	torso.rotation.y = s * 0.08 * amp
	head.rotation.y = -s * 0.05 * amp
	# landing squash
	if _land > 0.0:
		_land = maxf(0.0, _land - delta * 4.0)
	var squash := sin(_land * PI) * 0.12 if _land > 0.0 else 0.0
	hips.position.y = 0.92 + bob + breathe - squash * 0.8
	hips.scale = Vector3(1.0 + squash * 0.4, 1.0 - squash * 0.5, 1.0 + squash * 0.4)
	torso.scale.y = 1.0 + breathe * 1.5
	_visor_mat.emission_energy_multiplier = 3.0 + sin(_t * 3.0) * 0.6
	if trail:
		trail.emitting = speed > 1.0 or not on_floor
