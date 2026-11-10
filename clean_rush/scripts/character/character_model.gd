class_name CharacterModel
extends Node3D
## Modular procedural 3D character. Every appearance option (skin, hair style &
## colour, eyes, face shape, brows, nose, mouth, body preset, height, build,
## top, bottoms, shoes, hats, glasses, gloves, watch) is a real 3D component.
## Includes walk / run / idle / tool-use animations and a tool mount.
## Faces -Z (Godot forward). Feet at y = 0.

var appearance: Dictionary = {}
var tool_mount: Node3D
var hips: Node3D
var spine: Node3D
var neck: Node3D
var head: Node3D
var shoulder_l: Node3D
var shoulder_r: Node3D
var elbow_l: Node3D
var elbow_r: Node3D
var hand_l: Node3D
var hand_r: Node3D
var thigh_l: Node3D
var thigh_r: Node3D
var knee_l: Node3D
var knee_r: Node3D
var _t := 0.0
var _walk := 0.0
var _blink := 0.0
var _eyes: Array = []
var _look := 0.0
var _look_target := 0.0
var _mats: Dictionary = {}

const ARM_UP := 0.29
const ARM_LO := 0.27
const THIGH := 0.44
const SHIN := 0.43


func _ready() -> void:
	if appearance.is_empty():
		appearance = Appearance.defaults()
	_build()


func apply(a: Dictionary) -> void:
	appearance = Appearance.sanitize(a)
	if is_inside_tree():
		_build()


# =============================================================== helpers ===

func _mat(c: Color, rough := 0.7, metal := 0.0, emit := 0.0) -> StandardMaterial3D:
	var key := "%s|%.2f|%.2f|%.2f" % [c.to_html(), rough, metal, emit]
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	m.metallic = metal
	if emit > 0.0:
		m.emission_enabled = true
		m.emission = c
		m.emission_energy_multiplier = emit
	_mats[key] = m
	return m


func _skin_mat() -> StandardMaterial3D:
	var m := _mat(Appearance.skin_color(appearance), 0.55)
	m.rim_enabled = true
	m.rim = 0.25
	m.rim_tint = 0.6
	return m


func _part(parent: Node3D, mesh: Mesh, m: Material, p: Vector3, rot := Vector3.ZERO, s := Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = m
	mi.position = p
	mi.rotation = rot
	mi.scale = s
	parent.add_child(mi)
	return mi


func _sphere(r: float, hemi := false, seg := 14) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * (1.0 if hemi else 2.0)
	s.is_hemisphere = hemi
	s.radial_segments = seg
	s.rings = seg / 2
	return s


func _capsule(r: float, h: float) -> CapsuleMesh:
	var c := CapsuleMesh.new()
	c.radius = r
	c.height = maxf(h, r * 2.0 + 0.001)
	c.radial_segments = 12
	c.rings = 4
	return c


func _cyl(r0: float, r1: float, h: float, seg := 12) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.bottom_radius = r0
	c.top_radius = r1
	c.height = h
	c.radial_segments = seg
	c.rings = 1
	return c


func _box(s: Vector3) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = s
	return b


func _node(parent: Node3D, p: Vector3, n := "") -> Node3D:
	var x := Node3D.new()
	x.position = p
	if n != "":
		x.name = n
	parent.add_child(x)
	return x


# ================================================================= build ===

func _build() -> void:
	for c in get_children():
		c.queue_free()
	_eyes.clear()
	var a := appearance
	var body: Dictionary = Appearance.option_def("body", String(a["body"]))
	var bw := float(body.get("width", 1.0)) * float(a["build"])
	var lw := float(body.get("limb", 1.0)) * (0.5 + 0.5 * float(a["build"]))
	var h := float(a["height"])
	var skin := _skin_mat()
	var top_id := String(a["top"])
	var top_col := Color(String(a["top_color"]))
	var bottom_id := String(a["bottom"])
	var bot_col := Color(String(a["bottom_color"]))
	if bottom_id == "jeans" and String(a["bottom_color"]) == "#2b2b30":
		bot_col = Color(0.2, 0.32, 0.55)
	var special := {"gold_uniform": Color(0.92, 0.72, 0.18), "night_shift": Color(0.12, 0.14, 0.2), "legend_coat": Color(0.45, 0.15, 0.55)}
	if special.has(top_id):
		top_col = special[top_id]
	var top_m := _mat(top_col, 0.75, 0.25 if top_id == "gold_uniform" else 0.0)
	var bot_m := _mat(bot_col, 0.85)
	var long_sleeves := top_id in ["work_shirt", "sweatshirt", "uniform", "pro_uniform", "night_shift", "gold_uniform", "legend_coat"]
	var long_legs := bottom_id != "shorts"

	var root := _node(self, Vector3.ZERO, "Rig")
	root.scale = Vector3.ONE * h
	hips = _node(root, Vector3(0, 0.93, 0), "Hips")
	# ---- Legs ----
	for side in [-1, 1]:
		var thigh := _node(hips, Vector3(side * 0.092 * bw, -0.02, 0))
		var knee := _node(thigh, Vector3(0, -THIGH, 0))
		var foot := _node(knee, Vector3(0, -SHIN, 0))
		_part(thigh, _capsule(0.088 * lw, THIGH + 0.1), bot_m, Vector3(0, -THIGH / 2, 0))
		if long_legs:
			_part(knee, _capsule(0.07 * lw, SHIN + 0.07), bot_m, Vector3(0, -SHIN / 2, 0))
			if bottom_id == "work_trousers":
				_part(knee, _box(Vector3(0.11 * lw, 0.1, 0.03)), _mat(bot_col.darkened(0.4), 0.9), Vector3(0, -0.04, -0.06 * lw))
			if bottom_id == "cargo":
				_part(thigh, _box(Vector3(0.03, 0.12, 0.1)), _mat(bot_col.darkened(0.15), 0.9), Vector3(side * 0.08 * lw, -0.25, 0))
			if bottom_id == "jeans":
				_part(thigh, _box(Vector3(0.006, THIGH, 0.006)), _mat(Color(0.85, 0.65, 0.3), 0.6), Vector3(side * 0.074 * lw, -THIGH / 2, 0))
		else:
			_part(knee, _capsule(0.062 * lw, SHIN + 0.05), skin, Vector3(0, -SHIN / 2, 0))
			_part(thigh, _cyl(0.097 * lw, 0.094 * lw, 0.07), _mat(bot_col.darkened(0.1)), Vector3(0, -THIGH + 0.08, 0))
		_shoe(foot)
		if side < 0:
			thigh_l = thigh
			knee_l = knee
		else:
			thigh_r = thigh
			knee_r = knee
	# Pelvis / belt.
	_part(hips, _capsule(0.16 * bw, 0.34 * bw), bot_m, Vector3(0, 0.0, 0), Vector3(0, 0, PI / 2), Vector3(1, 1, 0.75))
	_part(hips, _cyl(0.15 * bw, 0.15 * bw, 0.04), _mat(Color(0.18, 0.14, 0.1), 0.6), Vector3(0, 0.09, 0), Vector3.ZERO, Vector3(1, 1, 0.72))
	# ---- Torso ----
	spine = _node(hips, Vector3(0, 0.08, 0), "Spine")
	var torso := _part(spine, _capsule(0.172 * bw, 0.58), top_m, Vector3(0, 0.25, 0), Vector3.ZERO, Vector3(1.08, 1.0, 0.74))
	torso.name = "Torso"
	_top_details(spine, top_id, top_col, bw)
	# ---- Neck & head ----
	neck = _node(spine, Vector3(0, 0.55, 0), "Neck")
	_part(neck, _cyl(0.058, 0.054, 0.1), skin, Vector3(0, 0.03, 0))
	head = _node(neck, Vector3(0, 0.1, 0), "Head")
	_build_head(head, skin)
	# ---- Arms ----
	for side in [-1, 1]:
		var sh := _node(spine, Vector3(side * 0.205 * bw, 0.47, 0))
		var el := _node(sh, Vector3(0, -ARM_UP, 0))
		var hd := _node(el, Vector3(0, -ARM_LO, 0))
		_part(sh, _sphere(0.07 * lw), top_m, Vector3.ZERO)
		_part(sh, _capsule(0.06 * lw, ARM_UP + 0.06), top_m, Vector3(0, -ARM_UP / 2, 0))
		_part(el, _capsule(0.051 * lw, ARM_LO + 0.05), top_m if long_sleeves else skin, Vector3(0, -ARM_LO / 2, 0))
		if long_sleeves:
			_part(el, _cyl(0.047 * lw, 0.047 * lw, 0.04), _mat(top_col.darkened(0.25)), Vector3(0, -ARM_LO + 0.03, 0))
		var glove := String(a["gloves"])
		var hand_m: Material = skin
		if glove == "work":
			hand_m = _mat(Color(0.82, 0.62, 0.25), 0.9)
		elif glove == "rubber":
			hand_m = _mat(Color(1.0, 0.85, 0.15), 0.35)
		_part(hd, _sphere(0.052 * lw), hand_m, Vector3(0, -0.035, 0), Vector3.ZERO, Vector3(0.85, 1.25, 0.65))
		_part(hd, _capsule(0.016 * lw, 0.07), hand_m, Vector3(side * -0.03, -0.02, -0.02), Vector3(0.4, 0, side * 0.8))
		if side < 0 and String(a["watch"]) != "none":
			var wc := Color(0.12, 0.12, 0.14) if a["watch"] == "sport" else Color(0.85, 0.7, 0.35)
			_part(el, _cyl(0.048 * lw, 0.048 * lw, 0.025), _mat(wc, 0.4, 0.6), Vector3(0, -ARM_LO + 0.05, 0))
			_part(el, _box(Vector3(0.03, 0.012, 0.03)), _mat(Color(0.9, 0.95, 1.0), 0.1, 0.2), Vector3(0, -ARM_LO + 0.05, -0.047 * lw))
		if side < 0:
			shoulder_l = sh
			elbow_l = el
			hand_l = hd
		else:
			shoulder_r = sh
			elbow_r = el
			hand_r = hd
	# Tool mount follows the right hand but keeps the body's orientation.
	tool_mount = _node(self, Vector3(0.2, 1.05, -0.35), "ToolMount")


func _shoe(foot: Node3D) -> void:
	var a := appearance
	var id := String(a["shoes"])
	var col := Color(String(a["shoes_color"]))
	match id:
		"sneakers":
			_part(foot, _box(Vector3(0.1, 0.07, 0.25)), _mat(col, 0.7), Vector3(0, -0.02, -0.05))
			_part(foot, _box(Vector3(0.105, 0.03, 0.26)), _mat(Color(0.95, 0.95, 0.95), 0.8), Vector3(0, -0.055, -0.05))
			_part(foot, _sphere(0.05), _mat(col, 0.7), Vector3(0, -0.02, -0.15), Vector3.ZERO, Vector3(1, 0.7, 0.8))
		"boots", "gold_boots":
			var bc := Color(0.85, 0.65, 0.15) if id == "gold_boots" else col
			_part(foot, _cyl(0.065, 0.06, 0.16), _mat(bc, 0.6, 0.5 if id == "gold_boots" else 0.0), Vector3(0, 0.05, 0))
			_part(foot, _box(Vector3(0.11, 0.08, 0.26)), _mat(bc, 0.6, 0.5 if id == "gold_boots" else 0.0), Vector3(0, -0.02, -0.05))
			_part(foot, _box(Vector3(0.115, 0.025, 0.27)), _mat(Color(0.1, 0.08, 0.06), 0.9), Vector3(0, -0.06, -0.05))
		_:
			_part(foot, _box(Vector3(0.1, 0.08, 0.25)), _mat(col, 0.45), Vector3(0, -0.02, -0.05))
			_part(foot, _sphere(0.052), _mat(col, 0.45), Vector3(0, -0.02, -0.15), Vector3.ZERO, Vector3(1, 0.75, 0.8))
			_part(foot, _box(Vector3(0.105, 0.02, 0.26)), _mat(Color(0.1, 0.08, 0.06), 0.9), Vector3(0, -0.06, -0.05))


func _top_details(sp: Node3D, top_id: String, col: Color, bw: float) -> void:
	var dark := _mat(col.darkened(0.3), 0.8)
	match top_id:
		"polo":
			_part(sp, _cyl(0.07, 0.085, 0.05), _mat(col.lightened(0.15), 0.8), Vector3(0, 0.53, 0))
			_part(sp, _box(Vector3(0.03, 0.12, 0.01)), _mat(Color.WHITE, 0.6), Vector3(0, 0.45, -0.113 * bw))
		"work_shirt":
			_part(sp, _box(Vector3(0.012, 0.42, 0.01)), dark, Vector3(0, 0.27, -0.114 * bw))
			for k in 4:
				_part(sp, _sphere(0.009, false, 6), _mat(Color(0.9, 0.9, 0.85)), Vector3(0.012, 0.42 - k * 0.1, -0.118 * bw))
			_part(sp, _box(Vector3(0.08, 0.08, 0.01)), dark, Vector3(-0.07 * bw, 0.4, -0.113 * bw))
			_part(sp, _cyl(0.075, 0.09, 0.05), dark, Vector3(0, 0.53, 0))
		"sweatshirt":
			_part(sp, _sphere(0.14, true), dark, Vector3(0, 0.5, 0.07), Vector3(-1.2, 0, 0), Vector3(1, 0.6, 1))  # hood
			_part(sp, _box(Vector3(0.18, 0.08, 0.01)), dark, Vector3(0, 0.12, -0.113 * bw))  # pocket
			_part(sp, _cyl(0.16 * bw, 0.16 * bw, 0.05), dark, Vector3(0, -0.01, 0), Vector3.ZERO, Vector3(1, 1, 0.75))
		"uniform", "pro_uniform", "night_shift", "gold_uniform", "legend_coat":
			var stripe := _mat(Color(0.95, 0.95, 0.9), 0.3, 0.2, 0.25 if top_id in ["pro_uniform", "night_shift"] else 0.0)
			if top_id in ["pro_uniform", "night_shift"]:
				stripe = _mat(Color(0.75, 1.0, 0.2) if top_id == "pro_uniform" else Color(0.9, 0.9, 0.95), 0.3, 0.3, 0.3)
			for y in [0.18, 0.32]:
				_part(sp, _cyl(0.158 * bw, 0.158 * bw, 0.03), stripe, Vector3(0, y, 0), Vector3.ZERO, Vector3(1, 1, 0.73))
			# Clean Rush logo badge.
			_part(sp, _cyl(0.028, 0.028, 0.01), _mat(Color("1fc8c8"), 0.5), Vector3(-0.07 * bw, 0.44, -0.112 * bw), Vector3(PI / 2, 0, 0))
			_part(sp, _cyl(0.075, 0.09, 0.05), _mat(col.darkened(0.25)), Vector3(0, 0.53, 0))
			if top_id == "legend_coat":
				_part(sp, _box(Vector3(0.34 * bw, 0.25, 0.02)), _mat(Color(0.95, 0.75, 0.2), 0.4, 0.6), Vector3(0, -0.12, 0.1 * bw))
		_:
			_part(sp, _cyl(0.07, 0.085, 0.03), dark, Vector3(0, 0.53, 0))


func _build_head(hd: Node3D, skin: Material) -> void:
	var a := appearance
	var face := String(a["face"])
	var shape: Vector3 = {"oval": Vector3(0.92, 1.08, 0.98), "round": Vector3(1.02, 1.0, 1.0), "square": Vector3(1.03, 1.02, 0.98), "long": Vector3(0.88, 1.14, 0.96)}.get(face, Vector3.ONE)
	_part(hd, _sphere(0.112, false, 18), skin, Vector3(0, 0.1, 0), Vector3.ZERO, shape)
	# Jaw / chin.
	var jaw_w := 0.085 if face == "square" else (0.07 if face == "round" else 0.062)
	_part(hd, _sphere(jaw_w, false, 12), skin, Vector3(0, 0.035, -0.02), Vector3.ZERO, Vector3(1.0, 0.75, 0.95))
	# Ears.
	for side in [-1, 1]:
		_part(hd, _sphere(0.025, false, 8), skin, Vector3(side * 0.104 * shape.x, 0.095, 0.005), Vector3.ZERO, Vector3(0.5, 1, 0.8))
	# Eyes.
	var es: Vector2 = {"round": Vector2(1.0, 1.0), "almond": Vector2(1.18, 0.78), "narrow": Vector2(1.25, 0.58)}.get(String(a["eyes"]), Vector2.ONE)
	var iris := _mat(Appearance.eye_color(a), 0.25)
	for side in [-1, 1]:
		var eye := _node(hd, Vector3(side * 0.04, 0.118, -0.098 * shape.z))
		eye.scale = Vector3(es.x, es.y, 1.0)
		_part(eye, _sphere(0.02, false, 10), _mat(Color(0.97, 0.97, 0.96), 0.2), Vector3.ZERO)
		_part(eye, _sphere(0.0125, false, 8), iris, Vector3(0, 0, -0.012), Vector3.ZERO, Vector3(1, 1, 0.5))
		_part(eye, _sphere(0.0055, false, 6), _mat(Color(0.03, 0.03, 0.03), 0.1), Vector3(0, 0, -0.0175), Vector3.ZERO, Vector3(1, 1, 0.4))
		_eyes.append(eye)
	# Eyebrows (hair colour).
	var hair_c := Color(String(a["hair_color"]))
	var brow_m := _mat(hair_c.darkened(0.15), 0.9)
	var brows := String(a["brows"])
	for side in [-1, 1]:
		var bs := Vector3(0.042, 0.009, 0.012)
		var rot := Vector3(0, 0, side * -0.12)
		match brows:
			"straight":
				rot = Vector3.ZERO
			"thick":
				bs = Vector3(0.046, 0.016, 0.014)
			"arched":
				rot = Vector3(0, 0, side * -0.3)
		_part(hd, _box(bs), brow_m, Vector3(side * 0.042, 0.152, -0.104 * shape.z), rot)
	# Nose.
	match String(a["nose"]):
		"straight":
			_part(hd, _box(Vector3(0.02, 0.045, 0.025)), skin, Vector3(0, 0.085, -0.112 * shape.z), Vector3(-0.25, 0, 0))
		"wide":
			_part(hd, _sphere(0.019, false, 8), skin, Vector3(0, 0.075, -0.11 * shape.z), Vector3.ZERO, Vector3(1.6, 1, 1))
		"long":
			_part(hd, _box(Vector3(0.018, 0.055, 0.03)), skin, Vector3(0, 0.082, -0.115 * shape.z), Vector3(-0.3, 0, 0))
		_:
			_part(hd, _sphere(0.015, false, 8), skin, Vector3(0, 0.078, -0.11 * shape.z))
	# Mouth.
	var lip := _mat(Appearance.skin_color(a).darkened(0.35).lerp(Color(0.7, 0.3, 0.3), 0.3), 0.5)
	var mz := -0.104 * shape.z
	match String(a["mouth"]):
		"smile":
			_part(hd, _box(Vector3(0.03, 0.007, 0.006)), lip, Vector3(0, 0.043, mz))
			for side in [-1, 1]:
				_part(hd, _box(Vector3(0.014, 0.006, 0.006)), lip, Vector3(side * 0.02, 0.047, mz + 0.003), Vector3(0, 0, side * 0.5))
		"wide":
			_part(hd, _box(Vector3(0.05, 0.009, 0.006)), lip, Vector3(0, 0.044, mz))
		"small":
			_part(hd, _box(Vector3(0.02, 0.008, 0.006)), lip, Vector3(0, 0.044, mz))
		_:
			_part(hd, _box(Vector3(0.035, 0.007, 0.006)), lip, Vector3(0, 0.044, mz))
	_build_hair(hd, shape, hair_c)
	_build_glasses(hd, shape)
	_build_hat(hd, shape)


func _build_hair(hd: Node3D, shape: Vector3, col: Color) -> void:
	var style := String(appearance["hair_style"])
	if style == "bald":
		return
	var m := _mat(col, 0.65)
	m.rim_enabled = true
	m.rim = 0.3
	var hat := String(appearance["hat"]) != "none"
	var cap_r := 0.118
	var top := Vector3(0, 0.125, 0.012)
	var sc := shape * Vector3(1.0, 1.0, 1.04)
	match style:
		"buzz":
			_part(hd, _sphere(0.115, true, 16), m, top, Vector3(0.25, 0, 0), sc * Vector3(1, 0.85, 1))
		"short", "side_part":
			_part(hd, _sphere(cap_r, true, 16), m, top, Vector3(0.3, 0, 0), sc)
			if not hat:
				_part(hd, _sphere(0.1, true, 12), m, top + Vector3(0.02 if style == "side_part" else 0.0, 0.03, 0.0), Vector3(-0.1, 0, 0.15 if style == "side_part" else 0.0), Vector3(1.05, 0.55, 1.05))
			if not hat:
				_part(hd, _box(Vector3(0.17, 0.03, 0.04)), m, Vector3(0.02 if style == "side_part" else 0.0, 0.192, -0.09), Vector3(0.3, 0, 0.12 if style == "side_part" else 0.0))
		"medium", "bob":
			_part(hd, _sphere(cap_r + 0.006, true, 16), m, top, Vector3(0.35, 0, 0), sc)
			var low := -0.03 if style == "bob" else 0.04
			_part(hd, _capsule(0.1, 0.2), m, Vector3(0, low + 0.08, 0.03), Vector3.ZERO, Vector3(1.15 * shape.x, 1, 0.95))
			if not hat:
				_part(hd, _box(Vector3(0.2, 0.04, 0.05)), m, Vector3(0, 0.19, -0.09), Vector3(0.35, 0, 0))
		"long_straight", "long_wavy":
			_part(hd, _sphere(cap_r + 0.006, true, 16), m, top, Vector3(0.35, 0, 0), sc)
			if not hat:
				_part(hd, _box(Vector3(0.22, 0.36, 0.06)), m, Vector3(0, -0.06, 0.07))
			for side in [-1, 1]:
				_part(hd, _box(Vector3(0.04, 0.26, 0.07)), m, Vector3(side * 0.108 * shape.x, 0.0, -0.01))
			if style == "long_wavy":
				for k in 6:
					_part(hd, _sphere(0.05, false, 8), m, Vector3((k % 3 - 1) * 0.07, -0.12 - (k / 3) * 0.1, 0.085))
			if not hat:
				_part(hd, _box(Vector3(0.2, 0.04, 0.05)), m, Vector3(0, 0.19, -0.09), Vector3(0.35, 0, 0))
		"curly":
			for k in 26:
				var th := k * 2.399
				var ph := acos(1.0 - (k + 0.5) / 26.0 * 1.15)
				var d := Vector3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th))
				if d.z < -0.55 and d.y < 0.5:
					continue
				_part(hd, _sphere(0.038, false, 8), m, Vector3(0, 0.1, 0) + d * Vector3(0.115 * shape.x, 0.12 * shape.y, 0.115))
		"afro":
			_part(hd, _sphere(0.165 if not hat else 0.13, false, 16), m, Vector3(0, 0.15, 0.03), Vector3.ZERO, Vector3(1.05, 0.95, 1.0))
		"ponytail":
			_part(hd, _sphere(cap_r + 0.004, true, 16), m, top, Vector3(0.35, 0, 0), sc)
			_part(hd, _cyl(0.02, 0.02, 0.025), _mat(Color("ff8c2a"), 0.5), Vector3(0, 0.12, 0.12), Vector3(1.2, 0, 0))
			_part(hd, _capsule(0.035, 0.24), m, Vector3(0, 0.0, 0.15), Vector3(0.25, 0, 0))
			if not hat:
				_part(hd, _box(Vector3(0.2, 0.035, 0.05)), m, Vector3(0, 0.19, -0.09), Vector3(0.35, 0, 0))
		"bun":
			_part(hd, _sphere(cap_r + 0.004, true, 16), m, top, Vector3(0.35, 0, 0), sc)
			if not hat:
				_part(hd, _sphere(0.055, false, 10), m, Vector3(0, 0.22, 0.06))
			if not hat:
				_part(hd, _box(Vector3(0.2, 0.035, 0.05)), m, Vector3(0, 0.19, -0.09), Vector3(0.35, 0, 0))


func _build_glasses(hd: Node3D, shape: Vector3) -> void:
	var id := String(appearance["glasses"])
	if id == "none":
		return
	var frame := _mat(Color(0.1, 0.1, 0.12), 0.4, 0.5)
	var z := -0.112 * shape.z
	var lens := _mat(Color(0.05, 0.05, 0.08, 0.85) if id == "sunglasses" else Color(0.8, 0.9, 1.0, 0.25), 0.05, 0.3)
	lens.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if id == "goggles":
		_part(hd, _box(Vector3(0.17, 0.05, 0.03)), _mat(Color(0.95, 0.75, 0.1, 0.6), 0.1, 0.0), Vector3(0, 0.118, z))
		_part(hd, _cyl(0.118, 0.118, 0.02), _mat(Color(0.1, 0.1, 0.1)), Vector3(0, 0.118, 0), Vector3.ZERO, Vector3(shape.x, 1, shape.z))
		return
	for side in [-1, 1]:
		if id == "round":
			var t := TorusMesh.new()
			t.inner_radius = 0.019
			t.outer_radius = 0.024
			_part(hd, t, frame, Vector3(side * 0.04, 0.115, z), Vector3(PI / 2, 0, 0))
		else:
			_part(hd, _box(Vector3(0.048, 0.034, 0.006)), frame, Vector3(side * 0.04, 0.115, z))
		_part(hd, _cyl(0.02, 0.02, 0.004), lens, Vector3(side * 0.04, 0.115, z - 0.002), Vector3(PI / 2, 0, 0), Vector3(1.15 if id != "round" else 1.0, 1, 0.8 if id != "round" else 1.0))
		_part(hd, _box(Vector3(0.004, 0.006, 0.1)), frame, Vector3(side * 0.103 * shape.x, 0.118, -0.06))
	_part(hd, _box(Vector3(0.025, 0.005, 0.005)), frame, Vector3(0, 0.12, z))


func _build_hat(hd: Node3D, shape: Vector3) -> void:
	var id := String(appearance["hat"])
	if id == "none":
		return
	var col := Color(String(appearance["hat_color"]))
	var m := _mat(col, 0.7)
	var top := Vector3(0, 0.13, 0.008)
	match id:
		"cap":
			_part(hd, _sphere(0.125, true, 16), m, top, Vector3(0.15, 0, 0), shape * Vector3(1, 0.72, 1.02))
			_part(hd, _cyl(0.085, 0.09, 0.012), m, Vector3(0, 0.165, -0.12), Vector3(-0.15, 0, 0), Vector3(1.1, 1, 0.8))
			_part(hd, _sphere(0.012, false, 6), _mat(col.darkened(0.3)), top + Vector3(0, 0.09, 0))
		"beanie":
			_part(hd, _sphere(0.128, true, 16), m, top - Vector3(0, 0.01, 0), Vector3(0.2, 0, 0), shape * Vector3(1, 0.95, 1.02))
			_part(hd, _cyl(0.128 * shape.x, 0.128 * shape.x, 0.04), _mat(col.darkened(0.2)), top + Vector3(0, -0.005, 0.01), Vector3(0.2, 0, 0))
		"bucket":
			_part(hd, _cyl(0.11, 0.125, 0.09), m, top + Vector3(0, 0.04, 0))
			_part(hd, _cyl(0.16, 0.18, 0.015), m, top + Vector3(0, 0.0, 0))
		"sun_hat":
			_part(hd, _cyl(0.09, 0.115, 0.09), _mat(Color(0.9, 0.82, 0.6), 0.9), top + Vector3(0, 0.05, 0))
			_part(hd, _cyl(0.24, 0.25, 0.012), _mat(Color(0.9, 0.82, 0.6), 0.9), top + Vector3(0, 0.0, 0))
			_part(hd, _cyl(0.116, 0.116, 0.025), m, top + Vector3(0, 0.02, 0))
		"hard_hat":
			_part(hd, _sphere(0.135, true, 16), _mat(Color(1.0, 0.8, 0.1), 0.35), top, Vector3.ZERO, Vector3(1, 0.85, 1.05))
			_part(hd, _cyl(0.15, 0.16, 0.012), _mat(Color(1.0, 0.8, 0.1), 0.35), top + Vector3(0, 0.0, -0.01))
		"crown":
			var gold := _mat(Color(1.0, 0.8, 0.2), 0.25, 0.9)
			_part(hd, _cyl(0.1, 0.105, 0.05), gold, top + Vector3(0, 0.08, 0))
			for k in 6:
				var ang := k * TAU / 6.0
				_part(hd, _cyl(0.0, 0.02, 0.05), gold, top + Vector3(cos(ang) * 0.095, 0.13, sin(ang) * 0.095), Vector3(PI, 0, 0))


# ============================================================ animation ===

## speed: horizontal m/s, cleaning: bool, anim: "sweep" | "scrub" | "aim" | ""
func animate(delta: float, speed: float, cleaning: bool, anim: String) -> void:
	if hips == null:
		return
	_t += delta
	var running := speed > 5.2
	var moving := speed > 0.3
	var k := clampf(delta * 10.0, 0.0, 1.0)
	if moving:
		_walk += delta * speed * (2.0 if not running else 1.7)
	var s := sin(_walk)
	var c := cos(_walk)
	var stride := (0.95 if running else 0.6) * clampf(speed / 4.0, 0.3, 1.0) if moving else 0.0
	# Legs: thighs swing, knees bend on the back swing.
	thigh_l.rotation.x = lerpf(thigh_l.rotation.x, s * stride, k)
	thigh_r.rotation.x = lerpf(thigh_r.rotation.x, -s * stride, k)
	knee_l.rotation.x = lerpf(knee_l.rotation.x, -maxf(0.0, -c) * stride * 1.4 - (0.05 if moving else 0.0), k)
	knee_r.rotation.x = lerpf(knee_r.rotation.x, -maxf(0.0, c) * stride * 1.4 - (0.05 if moving else 0.0), k)
	# Body bob, lean and breathing.
	var bob := absf(c) * (0.05 if running else 0.025) if moving else sin(_t * 1.8) * 0.004
	hips.position.y = lerpf(hips.position.y, 0.93 - (0.03 if running else 0.0) + bob, k)
	spine.rotation.x = lerpf(spine.rotation.x, (-0.22 if running else (-0.06 if moving else 0.0)) + (-0.12 if cleaning and anim == "scrub" else 0.0), k)
	var breathe := 1.0 + sin(_t * 1.8) * 0.012
	spine.scale = Vector3(breathe, 1.0, breathe)
	# Arms.
	var lx := 0.0
	var rx := 0.0
	var lz := 0.0
	var rz := 0.0
	var le := 0.15
	var re := 0.15
	var twist := 0.0
	if cleaning:
		match anim:
			"sweep":
				var sw := sin(_t * 7.0)
				rx = 0.95 + sw * 0.35
				lx = 0.75 + sw * 0.35
				rz = -0.15
				lz = 0.35
				re = 0.35
				le = 0.6
				twist = sw * 0.22
			"scrub":
				rx = 1.25 + cos(_t * 12.0) * 0.18
				rz = sin(_t * 12.0) * 0.18
				re = 0.35 + sin(_t * 12.0) * 0.15
				lx = 0.35
				lz = 0.15
				le = 0.5
			_:
				rx = 1.2
				re = 0.35
				rz = -0.05
				lx = 1.05
				lz = 0.45
				le = 0.85
				twist = sin(_t * 2.0) * 0.05
	elif moving:
		lx = -s * stride * 0.9
		rx = s * stride * 0.9
		le = 0.25 + (0.6 if running else 0.15)
		re = le
		lz = 0.08
		rz = -0.08
	else:
		lx = sin(_t * 1.1) * 0.03
		rx = -sin(_t * 1.1) * 0.03
		lz = 0.1
		rz = -0.1
	shoulder_l.rotation = shoulder_l.rotation.lerp(Vector3(lx, 0, -lz), k)
	shoulder_r.rotation = shoulder_r.rotation.lerp(Vector3(rx, 0, -rz), k)
	elbow_l.rotation.x = lerpf(elbow_l.rotation.x, le, k)
	elbow_r.rotation.x = lerpf(elbow_r.rotation.x, re, k)
	spine.rotation.y = lerpf(spine.rotation.y, twist, k)
	# Head: look around when idle, look at work when cleaning.
	if not moving and not cleaning:
		if randf() < delta * 0.25:
			_look_target = randf_range(-0.5, 0.5)
	else:
		_look_target = 0.0
	_look = lerpf(_look, _look_target, clampf(delta * 3.0, 0.0, 1.0))
	head.rotation = Vector3(0.25 if cleaning else 0.0, _look, 0.0)
	# Blink.
	_blink -= delta
	var closed := _blink < 0.12
	if _blink < 0.0:
		_blink = randf_range(2.5, 5.0)
	for e in _eyes:
		var n: Node3D = e
		n.scale.y = lerpf(n.scale.y, 0.1 if closed else ({"round": 1.0, "almond": 0.78, "narrow": 0.58}.get(String(appearance["eyes"]), 1.0)), 0.5)
	# Tool follows the right hand, keeping the body's facing.
	if tool_mount and hand_r:
		var hp := to_local(hand_r.global_position)
		tool_mount.position = tool_mount.position.lerp(hp, clampf(delta * 20.0, 0.0, 1.0))
		tool_mount.rotation = Vector3(0, spine.rotation.y * 0.6, 0)
