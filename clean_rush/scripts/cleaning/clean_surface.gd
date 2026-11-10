class_name CleanSurface
extends Node3D
## A rectangular cleanable surface (local XZ plane, normal +Y) driven by a
## low-resolution dirt mask texture. Tools remove dirt progressively pixel by
## pixel; the shader blends the dirt over a procedural clean material.
## Supports multiple dirt layers cleaned in sequence (e.g. mud -> dull paint).

signal layer_done(surface: CleanSurface, dirt_type: String)
signal completed(surface: CleanSurface)

const PX_PER_M := 11.0
const MIN_RES := 12
const MAX_RES := 96
const SNAP := 0.05
const AUTO_FINISH := 0.985

static var _shader: Shader
static var _glass_shader: Shader

var display_name := ""
var group := "default"
var size := Vector2(2, 2)
var layers: Array = ["mud"]
var layer_index := 0
var look: Dictionary = {}
var coverage := 0.85
var glass := false
var circle := false
var is_floor := false
var seed_value := 0

var res := Vector2i(16, 16)
var px_per_m := PX_PER_M
var data := PackedFloat32Array()
var bytes := PackedByteArray()
var image: Image
var texture: ImageTexture
var initial_sum := 0.0
var remaining := 0.0
var done := false
var foam_amount := 0.0
var material: ShaderMaterial
var mesh_instance: MeshInstance3D
var body: StaticBody3D
var _dirty := false
var _shine_tween: Tween


## cfg keys: name, group, size (Vector2), layers (Array), look (Dictionary),
## coverage (float), glass (bool), circle (bool), seed (int)
func setup(cfg: Dictionary) -> CleanSurface:
	display_name = cfg.get("name", "")
	group = cfg.get("group", "default")
	size = cfg.get("size", Vector2(2, 2))
	layers = cfg.get("layers", ["mud"])
	look = cfg.get("look", {})
	coverage = cfg.get("coverage", 0.85)
	glass = cfg.get("glass", false)
	circle = cfg.get("circle", false)
	seed_value = cfg.get("seed", randi() % 100000)
	return self


func _ready() -> void:
	add_to_group("clean_surface")
	if _shader == null:
		_shader = load("res://shaders/dirt_surface.gdshader")
		_glass_shader = load("res://shaders/dirt_glass.gdshader")
	is_floor = global_transform.basis.y.normalized().dot(Vector3.UP) > 0.7
	px_per_m = PX_PER_M
	res = Vector2i(clampi(int(round(size.x * px_per_m)), MIN_RES, MAX_RES), clampi(int(round(size.y * px_per_m)), MIN_RES, MAX_RES))
	_build_visual()
	_build_collision()
	_generate_layer()


func _build_visual() -> void:
	mesh_instance = MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = size
	mesh_instance.mesh = pm
	mesh_instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	material = ShaderMaterial.new()
	material.shader = _glass_shader if glass else _shader
	material.set_shader_parameter("clean_a", look.get("a", Color(0.8, 0.8, 0.78)))
	material.set_shader_parameter("clean_b", look.get("b", Color(0.68, 0.68, 0.66)))
	material.set_shader_parameter("pattern", look.get("pattern", 0))
	material.set_shader_parameter("pattern_scale", look.get("scale", 1.0))
	material.set_shader_parameter("size", size)
	material.set_shader_parameter("clean_roughness", look.get("roughness", 0.6))
	material.set_shader_parameter("clean_metallic", look.get("metallic", 0.0))
	material.set_shader_parameter("circle_clip", 1.0 if circle else 0.0)
	material.set_shader_parameter("seed", float(seed_value % 997) / 97.0)
	if glass:
		material.set_shader_parameter("clean_alpha", look.get("alpha", 0.22))
	mesh_instance.material_override = material
	add_child(mesh_instance)


func _build_collision() -> void:
	body = StaticBody3D.new()
	body.collision_layer = 2
	body.collision_mask = 0
	body.set_meta("surface", self)
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(size.x, 0.08, size.y)
	cs.shape = shape
	body.add_child(cs)
	add_child(body)


func current_type() -> String:
	return String(layers[mini(layer_index, layers.size() - 1)])


func _generate_layer() -> void:
	var dtype := current_type()
	var ddef: Dictionary = Data.dirt_def(dtype)
	material.set_shader_parameter("dirt_a", Data.arr_color(ddef.get("a")))
	material.set_shader_parameter("dirt_b", Data.arr_color(ddef.get("b")))
	material.set_shader_parameter("dirt_mode", int(ddef.get("mode", 0)))
	var n := res.x * res.y
	data.resize(n)
	bytes.resize(n * 2)
	bytes.fill(0)
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value + layer_index * 7919
	var noise := FastNoiseLite.new()
	noise.seed = rng.randi()
	noise.frequency = 0.09
	noise.fractal_octaves = 3
	var mode := int(ddef.get("mode", 0))
	match mode:
		1:
			_gen_graffiti(rng)
		2:
			_gen_blobs(rng, noise)
		3:
			for i in n:
				data[i] = 0.75 + 0.25 * (noise.get_noise_2d(i % res.x, i / res.x) * 0.5 + 0.5)
		_:
			var stretch := 3.0 if dtype == "smudge" else 1.0
			for y in res.y:
				for x in res.x:
					var v := noise.get_noise_2d(x * stretch, y) * 0.5 + 0.5
					var edge := 1.0 - minf(minf(x, res.x - 1 - x), minf(y, res.y - 1 - y)) / (0.25 * mini(res.x, res.y) + 0.001)
					v += clampf(edge, 0.0, 1.0) * 0.25
					var d := clampf((v - (1.0 - coverage)) * 2.2 + 0.35, 0.0, 1.0)
					if d < 0.15:
						d = 0.0
					data[y * res.x + x] = d
	if circle:
		for y in res.y:
			for x in res.x:
				var dx := (x + 0.5) / res.x - 0.5
				var dy := (y + 0.5) / res.y - 0.5
				if dx * dx + dy * dy > 0.25:
					data[y * res.x + x] = 0.0
	initial_sum = 0.0
	for i in n:
		initial_sum += data[i]
		bytes[i * 2] = int(data[i] * 255.0)
	if initial_sum <= 0.001:
		data[n / 2] = 1.0
		initial_sum = 1.0
	remaining = initial_sum
	image = Image.create_from_data(res.x, res.y, false, Image.FORMAT_RG8, bytes)
	if texture == null:
		texture = ImageTexture.create_from_image(image)
	else:
		texture.set_image(image)
	material.set_shader_parameter("dirt_mask", texture)


func _gen_graffiti(rng: RandomNumberGenerator) -> void:
	data.fill(0.0)
	var strokes := rng.randi_range(3, 6)
	for s in strokes:
		var cx := rng.randf_range(0.15, 0.85) * res.x
		var cy := rng.randf_range(0.2, 0.8) * res.y
		var w := rng.randf_range(0.15, 0.4) * res.x
		var h := rng.randf_range(0.1, 0.3) * res.y
		var thick := maxf(1.2, rng.randf_range(0.02, 0.05) * res.x)
		var freq := rng.randf_range(2.0, 5.0)
		var steps := 80
		for k in steps:
			var t := float(k) / steps
			var px := cx - w * 0.5 + w * t
			var py := cy + sin(t * TAU * freq * 0.5 + s) * h * 0.5 + cos(t * TAU * 2.0) * h * 0.2
			_stamp(px, py, thick, rng.randf_range(0.8, 1.0))


func _gen_blobs(rng: RandomNumberGenerator, noise: FastNoiseLite) -> void:
	data.fill(0.0)
	var blobs := rng.randi_range(4, 9)
	for b in blobs:
		var cx := rng.randf_range(0.1, 0.9) * res.x
		var cy := rng.randf_range(0.1, 0.9) * res.y
		_stamp(cx, cy, rng.randf_range(0.12, 0.3) * mini(res.x, res.y), 1.0)
	for i in data.size():
		if data[i] > 0.0:
			data[i] = clampf(data[i] * (0.7 + 0.5 * (noise.get_noise_2d(i % res.x, i / res.x) * 0.5 + 0.5)), 0.0, 1.0)


func _stamp(cx: float, cy: float, r: float, value: float) -> void:
	for y in range(maxi(0, int(cy - r)), mini(res.y, int(cy + r) + 1)):
		for x in range(maxi(0, int(cx - r)), mini(res.x, int(cx + r) + 1)):
			var dd := Vector2(x - cx, y - cy).length()
			if dd <= r:
				var i := y * res.x + x
				data[i] = maxf(data[i], value * clampf(1.2 - dd / r * 0.4, 0.0, 1.0))


# ------------------------------------------------------------------ cleaning --

func efficiency_for(types: Dictionary) -> float:
	return float(types.get(current_type(), 0.0))


func world_to_px(world_point: Vector3) -> Vector2:
	var lp := to_local(world_point)
	return Vector2((lp.x / size.x + 0.5) * res.x, (lp.z / size.y + 0.5) * res.y)


## Removes dirt around a world point. Returns cleaned area in m² (or -1 if the
## tool has no effect on the current dirt type).
func clean_at(world_point: Vector3, radius: float, amount: float, types: Dictionary, wet := false) -> float:
	if wet:
		_wet_stamp(world_point, radius)
	if done:
		return 0.0
	var eff := efficiency_for(types)
	if eff <= 0.0:
		return -1.0
	var tough := float(Data.dirt_def(current_type()).get("toughness", 1.0))
	var strength := amount * eff / tough * (1.0 + foam_amount * 1.5)
	var c := world_to_px(world_point)
	var r := maxf(1.0, radius * px_per_m)
	var removed := 0.0
	var x0 := maxi(0, int(c.x - r))
	var x1 := mini(res.x - 1, int(c.x + r))
	var y0 := maxi(0, int(c.y - r))
	var y1 := mini(res.y - 1, int(c.y + r))
	if x0 > x1 or y0 > y1:
		return 0.0
	var r2 := r * r
	for y in range(y0, y1 + 1):
		var dy := y + 0.5 - c.y
		for x in range(x0, x1 + 1):
			var dx := x + 0.5 - c.x
			var d2 := dx * dx + dy * dy
			if d2 > r2:
				continue
			var i := y * res.x + x
			var v := data[i]
			if v <= 0.0:
				continue
			var nv := v - strength * (1.0 - d2 / r2 * 0.7)
			if nv < SNAP:
				nv = 0.0
			removed += v - nv
			data[i] = nv
			bytes[i * 2] = int(nv * 255.0)
	if removed <= 0.0:
		return 0.0
	remaining = maxf(0.0, remaining - removed)
	if foam_amount > 0.0:
		foam_amount = maxf(0.0, foam_amount - removed / initial_sum * 2.0)
		material.set_shader_parameter("foam", foam_amount)
	_dirty = true
	if layer_progress() >= AUTO_FINISH:
		_finish_layer()
	return removed / (px_per_m * px_per_m)


func add_foam(amount: float) -> void:
	if done:
		return
	foam_amount = clampf(foam_amount + amount, 0.0, 1.0)
	material.set_shader_parameter("foam", foam_amount)


func _finish_layer() -> void:
	data.fill(0.0)
	for i in data.size():
		bytes[i * 2] = 0
	remaining = 0.0
	_dirty = true
	var finished := current_type()
	_flash()
	if layer_index < layers.size() - 1:
		layer_index += 1
		layer_done.emit(self, finished)
		# Small delay so the player sees the clean layer before the next one.
		_upload()
		_generate_layer()
	else:
		done = true
		foam_amount = 0.0
		material.set_shader_parameter("foam", 0.0)
		layer_done.emit(self, finished)
		completed.emit(self)


func _flash() -> void:
	if _shine_tween:
		_shine_tween.kill()
	_shine_tween = create_tween()
	_shine_tween.tween_method(func(v): material.set_shader_parameter("shine", v), 1.0, 0.0, 0.8)


func dirt_at(world_point: Vector3) -> float:
	if done:
		return 0.0
	var c := world_to_px(world_point)
	var x := int(c.x)
	var y := int(c.y)
	if x < 0 or y < 0 or x >= res.x or y >= res.y:
		return 0.0
	return data[y * res.x + x]


func layer_progress() -> float:
	if done:
		return 1.0
	return clampf(1.0 - remaining / initial_sum, 0.0, 1.0)


func progress() -> float:
	if done:
		return 1.0
	return (layer_index + layer_progress()) / float(layers.size())


func progress_of_layer(dirt_type: String) -> float:
	var idx := layers.find(dirt_type)
	if idx < 0 or done or idx < layer_index:
		return 1.0
	if idx > layer_index:
		return 0.0
	return layer_progress()


func weight() -> float:
	return size.x * size.y * layers.size() * (0.5 if circle else 1.0)


var _wet_active := false
var _wet_t := 0.0


## Marks pixels as wet (darker / glossy) to show exactly where water hit.
func _wet_stamp(world_point: Vector3, radius: float) -> void:
	var c := world_to_px(world_point)
	var r := maxf(1.0, radius * px_per_m * 1.15)
	var r2 := r * r
	for y in range(maxi(0, int(c.y - r)), mini(res.y, int(c.y + r) + 1)):
		var dy := y + 0.5 - c.y
		for x in range(maxi(0, int(c.x - r)), mini(res.x, int(c.x + r) + 1)):
			var dx := x + 0.5 - c.x
			if dx * dx + dy * dy <= r2:
				bytes[(y * res.x + x) * 2 + 1] = 255
	_wet_active = true
	_dirty = true


func _process(delta: float) -> void:
	if _wet_active:
		_wet_t += delta
		if _wet_t >= 0.15:
			_wet_t = 0.0
			var any := false
			var n := res.x * res.y
			for i in n:
				var w := bytes[i * 2 + 1]
				if w > 0:
					bytes[i * 2 + 1] = maxi(0, w - 4)
					any = true
			_wet_active = any
			_dirty = true
	if _dirty:
		_upload()


func _upload() -> void:
	_dirty = false
	image.set_data(res.x, res.y, false, Image.FORMAT_RG8, bytes)
	texture.update(image)
