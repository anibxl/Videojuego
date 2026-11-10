class_name EnergyFragment
extends Area3D
## Collectible currency. Each fragment in the world has a unique id so it is
## only ever collected once (saved in WorldState.collected).

var uid := ""
var _mesh: MeshInstance3D
var _t := 0.0
var _base_y := 0.0
var _player: Node3D

func setup(id: String) -> void:
	uid = id
	collision_layer = 0
	collision_mask = 2
	monitorable = false
	var cs := CollisionShape3D.new()
	var sph := SphereShape3D.new()
	sph.radius = 0.7
	cs.shape = sph
	add_child(cs)
	_mesh = MeshInstance3D.new()
	var top := CylinderMesh.new()
	top.top_radius = 0.0
	top.bottom_radius = 0.22
	top.height = 0.32
	top.radial_segments = 4
	top.rings = 1
	_mesh.mesh = top
	_mesh.material_override = Mats.neon(Color(0.35, 0.95, 1.0), 4.0)
	add_child(_mesh)
	var bottom := MeshInstance3D.new()
	var b := top.duplicate()
	bottom.mesh = b
	bottom.rotation.x = PI
	bottom.position.y = -0.32
	bottom.material_override = _mesh.material_override
	_mesh.add_child(bottom)
	var halo := MeshInstance3D.new()
	var hs := SphereMesh.new()
	hs.radius = 0.38
	hs.height = 0.76
	hs.radial_segments = 10
	hs.rings = 5
	halo.mesh = hs
	halo.material_override = Mats.holo(Color(0.3, 0.8, 1.0, 0.6), 0.6)
	halo.position.y = -0.16
	_mesh.add_child(halo)
	_mesh.position.y = 0.16
	# LOD: tiny objects vanish at distance (and fade) to save fill-rate
	_mesh.visibility_range_end = 70.0
	_mesh.visibility_range_end_margin = 8.0
	_mesh.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
	body_entered.connect(_on_body)
	add_to_group("scannable")
	add_to_group("fragments")

func _ready() -> void:
	_base_y = position.y
	_t = randf() * TAU

func _process(delta: float) -> void:
	_t += delta
	_mesh.rotation.y += delta * 1.8
	_mesh.position.y = 0.16 + sin(_t * 2.0) * 0.12
	# Level 8 ability: fragments drift toward the player.
	if Progression.level >= GameDB.LEVEL_MAGNET:
		if _player == null:
			_player = get_tree().get_first_node_in_group("player")
		if _player and _player.global_position.distance_to(global_position) < 7.0:
			global_position = global_position.move_toward(_player.global_position + Vector3.UP * 0.8, delta * 9.0)

func _on_body(body: Node) -> void:
	if not body.is_in_group("player") or uid == "":
		return
	var id := uid
	uid = ""
	WorldState.mark_collected(id)
	Audio.play("fragment", -3.0, 0.08)
	FX.burst(get_parent(), global_position + Vector3.UP * 0.2, Color(0.4, 0.95, 1.0), 18, 3.5)
	Inventory.add_fragments(1)
	Progression.add_xp(GameDB.XP_FRAGMENT, "Energy Fragment")
	queue_free()

func reveal() -> void:
	FX.burst(get_parent(), global_position, Color(0.4, 0.95, 1.0), 8, 1.5, 1.5)
