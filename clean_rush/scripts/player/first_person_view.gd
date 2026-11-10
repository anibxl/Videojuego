class_name FirstPersonView
extends Node3D
## First-person viewmodel attached to the camera: the player's own arms (sleeve
## colour, skin tone and gloves from the saved character) holding the equipped
## tool. Handles two-handed grips, walk bob, look sway, tool switching and the
## tool-specific use animations (aim/recoil, sweeping, scrubbing).

var appearance: Dictionary = {}
var tool_root: Node3D       # animated grip pivot
var tool_model: Node3D
var tool_id := ""
var anim_kind := "aim"
var using := false
var _t := 0.0
var _use_t := 0.0
var _speed := 0.0
var _switch := 1.0           # 0 = lowered, 1 = raised
var _sway := Vector2.ZERO
var _look_delta := Vector2.ZERO
var _arm_r: MeshInstance3D
var _arm_l: MeshInstance3D
var _hand_r: MeshInstance3D
var _hand_l: MeshInstance3D
var _bag: MeshInstance3D
var _two_handed := true
var _mats: Dictionary = {}

const SHOULDER_R := Vector3(0.34, -0.58, 0.12)
const SHOULDER_L := Vector3(-0.34, -0.58, 0.12)

## Per-tool hold: [grip position (camera space), extra rotation (rad), two-handed]
const HOLD := {
	"gun": [Vector3(0.21, -0.25, -0.5), Vector3(0.02, 0.0, 0.0), true, 0.72],
	"blower": [Vector3(0.31, -0.36, -0.40), Vector3(0.12, 0.06, 0.0), true, 0.68],
	"pole": [Vector3(0.20, -0.17, -0.34), Vector3(0.22, 0.12, 0.0), true, 1.0],
	"hand": [Vector3(0.21, -0.25, -0.46), Vector3(0.25, 0.0, 0.0), false, 0.8],
	"machine": [Vector3(0.21, -0.27, -0.44), Vector3(0.15, 0.0, 0.0), true, 0.72],
}


func hold_kind(id: String) -> String:
	match id:
		"pressure_washer", "turbo_nozzle", "foam_sprayer":
			return "gun"
		"leaf_blower", "leaf_vacuum", "pro_blower", "garden_vacuum":
			return "blower"
		"rake", "broom", "pool_net", "pool_vacuum", "trash_picker":
			return "pole"
		"scrubber", "polisher":
			return "machine"
	return "hand"


func _ready() -> void:
	if appearance.is_empty():
		appearance = Game.appearance()
	tool_root = Node3D.new()
	add_child(tool_root)
	_build_arms()


func _mat(c: Color, rough := 0.7) -> StandardMaterial3D:
	var key := c.to_html() + str(rough)
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	_mats[key] = m
	return m


func _sleeve_color() -> Color:
	var special := {"gold_uniform": Color(0.92, 0.72, 0.18), "night_shift": Color(0.12, 0.14, 0.2), "legend_coat": Color(0.45, 0.15, 0.55)}
	return special.get(String(appearance.get("top", "")), Color(String(appearance.get("top_color", "#1550b8"))))


func _hand_color() -> Color:
	match String(appearance.get("gloves", "none")):
		"work":
			return Color(0.82, 0.62, 0.25)
		"rubber":
			return Color(1.0, 0.85, 0.15)
	return Appearance.skin_color(appearance)


func _build_arms() -> void:
	var cm := CylinderMesh.new()
	cm.top_radius = 0.045
	cm.bottom_radius = 0.055
	cm.height = 1.0
	cm.radial_segments = 10
	cm.rings = 1
	var sleeve := _mat(_sleeve_color(), 0.8)
	_arm_r = _mi(cm, sleeve)
	_arm_l = _mi(cm, sleeve)
	var hm := SphereMesh.new()
	hm.radius = 0.04
	hm.height = 0.08
	hm.radial_segments = 12
	hm.rings = 6
	var hand := _mat(_hand_color(), 0.55)
	_hand_r = _mi(hm, hand)
	_hand_r.scale = Vector3(0.9, 0.75, 1.25)
	_hand_l = _mi(hm, hand)
	_hand_l.scale = Vector3(0.9, 0.75, 1.25)


func _mi(mesh: Mesh, m: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)
	return mi


func refresh_appearance(a: Dictionary) -> void:
	appearance = a
	for n in [_arm_r, _arm_l, _hand_r, _hand_l]:
		n.queue_free()
	_mats.clear()
	_build_arms()


## Builds and holds the tool; returns the tool model (has a "Nozzle" marker).
func set_tool(id: String) -> Node3D:
	tool_id = id
	if tool_model:
		tool_model.queue_free()
	tool_model = ToolModels.build(id)
	for mi in tool_model.find_children("*", "MeshInstance3D", true, false):
		(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	tool_root.add_child(tool_model)
	var hold: Array = HOLD[hold_kind(id)]
	tool_model.rotation = hold[1]
	tool_model.scale = Vector3.ONE * float(hold[3])
	_two_handed = hold[2]
	anim_kind = String(Data.tool_def(id).get("anim", "aim"))
	if _bag:
		_bag.queue_free()
		_bag = null
	if int(Data.tool_def(id).get("debris", {}).get("capacity", 0)) > 0:
		# Collection bag/net fill indicator next to the tool.
		var sm := SphereMesh.new()
		sm.radius = 0.09
		sm.height = 0.18
		_bag = MeshInstance3D.new()
		_bag.mesh = sm
		_bag.material_override = _mat(Color(0.45, 0.3, 0.15), 0.9)
		_bag.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_bag.position = Vector3(0.12, -0.08, 0.12)
		tool_root.add_child(_bag)
	_switch = 0.0   # play the raise animation
	return tool_model


func set_motion(speed: float, look_delta: Vector2) -> void:
	_speed = speed
	_look_delta = look_delta


func set_using(on: bool, kind: String, fill: float) -> void:
	using = on
	anim_kind = kind
	if _bag:
		_bag.visible = fill >= 0.0
		var f := clampf(fill, 0.0, 1.0)
		_bag.scale = Vector3.ONE * (0.55 + f * 0.9)
		var m := _bag.material_override as StandardMaterial3D
		m.albedo_color = Color(0.45, 0.3, 0.15).lerp(Color(0.85, 0.45, 0.12), f)


func _process(delta: float) -> void:
	if tool_model == null:
		return
	_t += delta
	_switch = minf(1.0, _switch + delta * 3.2)
	if using:
		_use_t += delta
	var hold: Array = HOLD[hold_kind(tool_id)]
	var base: Vector3 = hold[0]
	# Walk bob (gentle) and breathing.
	var bob_amt := clampf(_speed / 6.0, 0.0, 1.0) * float(Game.setting("head_bob"))
	var wt := _t * (7.0 + _speed * 0.8)
	var bob := Vector3(sin(wt) * 0.012, -absf(cos(wt)) * 0.014, 0.0) * bob_amt
	var breathe := Vector3(0, sin(_t * 1.6) * 0.004, 0)
	# Look sway: the tool lags slightly behind camera rotation.
	_sway = _sway.lerp(_look_delta * 0.0018, clampf(delta * 8.0, 0.0, 1.0))
	var sway := Vector3(-_sway.x, _sway.y, 0).limit_length(0.05)
	var lower := Vector3(0, -0.45 * (1.0 - _switch) * (1.0 - _switch), 0.1 * (1.0 - _switch))
	var use_off := Vector3.ZERO
	var use_rot := Vector3.ZERO
	if using:
		match anim_kind:
			"sweep":
				var s := sin(_use_t * 6.5)
				use_off = Vector3(s * 0.06, 0.0, -0.03)
				use_rot = Vector3(0.0, s * 0.35, s * 0.12)
			"scrub":
				use_off = Vector3(cos(_use_t * 12.0) * 0.025, sin(_use_t * 12.0) * 0.025, -0.06)
			_:
				use_off = Vector3(randf_range(-0.003, 0.003), randf_range(-0.003, 0.003), 0.018)
				use_rot = Vector3(0.02, 0, 0)
	tool_root.position = tool_root.position.lerp(base + bob + breathe + sway + lower + use_off, clampf(delta * 14.0, 0.0, 1.0))
	tool_root.rotation = tool_root.rotation.lerp(use_rot + Vector3(sway.y * 2.0, sway.x * 2.0, 0), clampf(delta * 12.0, 0.0, 1.0))
	# Arms reach the grips.
	var hand_r := tool_root.position + tool_root.basis * Vector3(0, -0.02, 0.04)
	_place_arm(_arm_r, SHOULDER_R, hand_r)
	_hand_r.position = hand_r
	_arm_l.visible = _two_handed
	_hand_l.visible = _two_handed
	if _two_handed:
		var noz: Node3D = tool_model.get_node("Nozzle")
		var local := tool_model.transform * (noz.position * 0.42)
		var hand_l := tool_root.position + tool_root.basis * local
		_place_arm(_arm_l, SHOULDER_L, hand_l)
		_hand_l.position = hand_l


func _place_arm(arm: MeshInstance3D, a: Vector3, b: Vector3) -> void:
	var d := b - a
	var length := d.length()
	if length < 0.01:
		return
	var up := d / length
	var x := up.cross(Vector3.FORWARD if absf(up.dot(Vector3.FORWARD)) < 0.95 else Vector3.RIGHT).normalized()
	var z := x.cross(up).normalized()
	arm.transform = Transform3D(Basis(x, up * length, z), (a + b) * 0.5)
