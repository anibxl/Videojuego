class_name Mats
extends RefCounted
## Material library with caching. Sharing material instances keeps draw-call
## batching efficient on mobile GPUs and avoids per-object shader compiles.

static var _cache := {}
static var _shaders := {}

static func _shader(name: String) -> Shader:
	if not _shaders.has(name):
		_shaders[name] = load("res://assets/shaders/%s.gdshader" % name)
	return _shaders[name]

static func clear_cache() -> void:
	_cache.clear()

static func std(col: Color, rough := 0.8, metal := 0.0) -> StandardMaterial3D:
	var key := "std_%s_%.2f_%.2f" % [col.to_html(), rough, metal]
	if not _cache.has(key):
		var m := StandardMaterial3D.new()
		m.albedo_color = col
		m.roughness = rough
		m.metallic = metal
		_cache[key] = m
	return _cache[key]

## Emissive "neon" material. energy > 1 feeds the glow post-process.
static func neon(col: Color, energy := 3.0) -> StandardMaterial3D:
	var key := "neon_%s_%.2f" % [col.to_html(), energy]
	if not _cache.has(key):
		var m := StandardMaterial3D.new()
		m.albedo_color = col * 0.3
		m.emission_enabled = true
		m.emission = col
		m.emission_energy_multiplier = energy
		m.roughness = 0.4
		_cache[key] = m
	return _cache[key]

static func glass(col := Color(0.4, 0.7, 1.0, 0.25)) -> StandardMaterial3D:
	var key := "glass_%s" % col.to_html()
	if not _cache.has(key):
		var m := StandardMaterial3D.new()
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.albedo_color = col
		m.roughness = 0.05
		m.metallic = 0.4
		m.emission_enabled = true
		m.emission = Color(col.r, col.g, col.b) * 0.3
		_cache[key] = m
	return _cache[key]

static func unshaded(col: Color) -> StandardMaterial3D:
	var key := "unsh_%s" % col.to_html()
	if not _cache.has(key):
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.albedo_color = col
		if col.a < 1.0:
			m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		_cache[key] = m
	return _cache[key]

static func building(seed_v: float, base := Color(0.07, 0.07, 0.13), lit := 0.22) -> ShaderMaterial:
	var key := "bld_%d_%s_%.2f" % [int(seed_v) % 8, base.to_html(), lit]
	if not _cache.has(key):
		var m := ShaderMaterial.new()
		m.shader = _shader("building")
		m.set_shader_parameter("base_color", base)
		m.set_shader_parameter("trim_color", base.lightened(0.12))
		m.set_shader_parameter("seed", float(int(seed_v) % 8) + 0.37)
		m.set_shader_parameter("lit_ratio", lit)
		_cache[key] = m
	return _cache[key]

static func ground(a := Color(0.06, 0.06, 0.1), b := Color(0.1, 0.09, 0.16), tile := 4.0, puddles := 0.45) -> ShaderMaterial:
	var key := "gnd_%s_%s_%.1f_%.2f" % [a.to_html(), b.to_html(), tile, puddles]
	if not _cache.has(key):
		var m := ShaderMaterial.new()
		m.shader = _shader("ground")
		m.set_shader_parameter("color_a", a)
		m.set_shader_parameter("color_b", b)
		m.set_shader_parameter("tile", tile)
		m.set_shader_parameter("puddles", puddles)
		_cache[key] = m
	return _cache[key]

static func tiles(a: Color, b: Color, line: Color, tile := 2.0, rough := 0.35, checker := 1.0, dirt := 0.25) -> ShaderMaterial:
	var key := "til_%s_%s_%s_%.1f_%.2f_%.1f_%.2f" % [a.to_html(), b.to_html(), line.to_html(), tile, rough, checker, dirt]
	if not _cache.has(key):
		var m := ShaderMaterial.new()
		m.shader = _shader("tiles")
		m.set_shader_parameter("color_a", a)
		m.set_shader_parameter("color_b", b)
		m.set_shader_parameter("line_color", line)
		m.set_shader_parameter("tile", tile)
		m.set_shader_parameter("roughness", rough)
		m.set_shader_parameter("checker", checker)
		m.set_shader_parameter("dirt", dirt)
		_cache[key] = m
	return _cache[key]

static func holo(col: Color, energy := 1.6) -> ShaderMaterial:
	var key := "holo_%s_%.2f" % [col.to_html(), energy]
	if not _cache.has(key):
		var m := ShaderMaterial.new()
		m.shader = _shader("holo")
		m.set_shader_parameter("color", col)
		m.set_shader_parameter("energy", energy)
		_cache[key] = m
	return _cache[key]

static func beam(col: Color, intensity := 0.6) -> ShaderMaterial:
	var key := "beam_%s_%.2f" % [col.to_html(), intensity]
	if not _cache.has(key):
		var m := ShaderMaterial.new()
		m.shader = _shader("beam")
		m.set_shader_parameter("color", col)
		m.set_shader_parameter("intensity", intensity)
		_cache[key] = m
	return _cache[key]

static func sky_material(top: Color, horizon: Color, glow: Color, stars := 1.0, aurora := 1.0) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = _shader("sky")
	m.set_shader_parameter("top_color", top)
	m.set_shader_parameter("horizon_color", horizon)
	m.set_shader_parameter("glow_color", glow)
	m.set_shader_parameter("star_density", stars)
	m.set_shader_parameter("aurora", aurora)
	return m

## Mesh for a collectible "shape" (shared with IconDraw names).
static func shape_mesh(shape: String) -> Mesh:
	match shape:
		"coin":
			var c := CylinderMesh.new(); c.top_radius = 0.28; c.bottom_radius = 0.28; c.height = 0.06; c.radial_segments = 20
			return c
		"orb", "sun":
			var s := SphereMesh.new(); s.radius = 0.25; s.height = 0.5; s.radial_segments = 16; s.rings = 8
			return s
		"crystal":
			var p := PrismMesh.new(); p.size = Vector3(0.3, 0.7, 0.3)
			return p
		"pyramid", "crown", "star":
			var p2 := PrismMesh.new(); p2.size = Vector3(0.45, 0.4, 0.45)
			return p2
		"card", "note":
			var b := BoxMesh.new(); b.size = Vector3(0.4, 0.28, 0.03)
			return b
		"fish", "feather":
			var cap := CapsuleMesh.new(); cap.radius = 0.1; cap.height = 0.5; cap.radial_segments = 12; cap.rings = 4
			return cap
		"lantern":
			var l := CylinderMesh.new(); l.top_radius = 0.14; l.bottom_radius = 0.18; l.height = 0.4; l.radial_segments = 8
			return l
		"clock":
			var cl := CylinderMesh.new(); cl.top_radius = 0.26; cl.bottom_radius = 0.26; cl.height = 0.1; cl.radial_segments = 20
			return cl
	var bx := BoxMesh.new(); bx.size = Vector3(0.32, 0.32, 0.32)
	return bx
