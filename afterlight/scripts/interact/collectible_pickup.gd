class_name CollectiblePickup
extends Area3D
## A world collectible (artifact, key, cosmetic). Collected on touch.
## Presentation scales with rarity: glow strength, ground ring and — for
## Rare and above — a light beam (unless it is a hidden secret, which only
## the Pulse Scanner reveals).

var item_id := ""
var uid := ""
var _visual: Node3D
var _beam: MeshInstance3D
var _t := 0.0
var _reveal_t := 0.0
var show_beam := true

func setup(id: String, world_uid: String, beam := true) -> void:
	item_id = id
	uid = world_uid
	show_beam = beam
	var def := GameDB.item(id)
	var rar: int = def.rarity
	var col: Color = def.color
	var rcol := GameDB.rarity_color(rar)
	collision_layer = 0
	collision_mask = 2
	monitorable = false
	var cs := CollisionShape3D.new()
	var sph := SphereShape3D.new()
	sph.radius = 0.85
	cs.shape = sph
	add_child(cs)
	_visual = Node3D.new()
	_visual.position.y = 0.9
	add_child(_visual)
	var mi := MeshInstance3D.new()
	mi.mesh = Mats.shape_mesh(def.shape)
	mi.material_override = Mats.neon(col, 1.2 + rar * 0.6)
	if def.shape == "coin" or def.shape == "clock":
		mi.rotation.x = PI / 2
	_visual.add_child(mi)
	var shell := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.45
	sm.height = 0.9
	sm.radial_segments = 12
	sm.rings = 6
	shell.mesh = sm
	shell.material_override = Mats.holo(Color(rcol.r, rcol.g, rcol.b, 0.5), 0.5 + rar * 0.15)
	_visual.add_child(shell)
	# ground ring
	var ring := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.55
	tm.outer_radius = 0.62
	tm.rings = 24
	tm.ring_segments = 4
	ring.mesh = tm
	ring.material_override = Mats.neon(rcol, 2.5)
	ring.position.y = 0.04
	add_child(ring)
	_beam = MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.35
	cm.bottom_radius = 0.5
	cm.height = 9.0
	cm.radial_segments = 12
	cm.rings = 1
	cm.cap_top = false
	cm.cap_bottom = false
	_beam.mesh = cm
	_beam.material_override = Mats.beam(rcol, 0.5 + rar * 0.12)
	_beam.position.y = 4.5
	_beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_beam.visible = show_beam and rar >= GameDB.Rarity.RARE
	add_child(_beam)
	body_entered.connect(_on_body)
	add_to_group("scannable")

func _process(delta: float) -> void:
	_t += delta
	_visual.rotation.y += delta * 1.2
	_visual.position.y = 0.9 + sin(_t * 1.8) * 0.12
	if _reveal_t > 0.0:
		_reveal_t -= delta
		if _reveal_t <= 0.0:
			_beam.visible = show_beam and GameDB.item(item_id).rarity >= GameDB.Rarity.RARE

func reveal() -> void:
	_reveal_t = 8.0
	_beam.visible = true
	FX.burst(get_parent(), global_position + Vector3.UP, GameDB.rarity_color(GameDB.item(item_id).rarity), 12, 2.0, 1.5)

func _on_body(body: Node) -> void:
	if not body.is_in_group("player") or item_id == "":
		return
	var id := item_id
	item_id = ""
	WorldState.mark_collected(uid)
	var def := GameDB.item(id)
	FX.burst(get_parent(), global_position + Vector3.UP, GameDB.rarity_color(def.rarity), 30 + def.rarity * 10, 5.0, 1.2)
	Inventory.add_item(id)
	queue_free()
