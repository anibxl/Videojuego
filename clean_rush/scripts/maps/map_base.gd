class_name MapBase
extends Node3D
## Base class for every cleaning location. Subclasses implement build() using
## the procedural helpers below; this class owns progress tracking, debris,
## surfaces, hidden discoveries and the restoration "bloom" effects.

signal progress_updated(snap: Dictionary)
signal discovery_found(d: Discovery, coins: int)
signal message(text: String, kind: String)

const TRACK_INTERVAL := 0.2

var map_id := ""
var def: Dictionary = {}
var surfaces: Array[CleanSurface] = []
var fields: Array[DebrisField] = []
var discoveries: Array[Discovery] = []
var bins: Array = []            # Array[Rect2] where bags can be emptied
var player_bounds := Rect2(-14, -14, 28, 28)
var spawn_point := Vector3.ZERO
var snapshot: Dictionary = {}
var blooms: Array = []          # [{node, threshold, done, scale}]
var health_materials: Array[ShaderMaterial] = []
var water_material: ShaderMaterial
var env: Environment
var sun: DirectionalLight3D
var sky_material: ProceduralSkyMaterial
var time_of_day := "afternoon"
var weather := "sunny"
var rain_fx: CPUParticles3D
var _base_atmo: Dictionary = {}
var menu_mode := false          # background for the main menu
var _track_t := 0.0
var _mat_cache: Dictionary = {}
var _rng := RandomNumberGenerator.new()
var _cleared_reported := {"leaf": 0, "trash": 0}
var _surface_counter := 0


func _ready() -> void:
	_rng.seed = hash(map_id)
	def = Data.map_def(map_id)
	var sp: Array = def.get("spawn", [0, 0, 0])
	spawn_point = Vector3(sp[0], sp[1], sp[2])
	build()
	for s in surfaces:
		s.completed.connect(_on_surface_completed)
	for f in fields:
		f.collected.connect(_on_field_collected)
		f.pile_bagged.connect(_on_pile_bagged)
	for d in discoveries:
		d.found.connect(_on_discovery_found)
	_track(true)


## Override in subclasses.
func build() -> void:
	pass


# ================================================================ tracking ===

func _process(delta: float) -> void:
	_track_t += delta
	if _track_t >= TRACK_INTERVAL:
		_track_t = 0.0
		_track(false)


func _track(initial: bool) -> void:
	var groups := {}
	var group_w := {}
	var total_w := 0.0
	var total_c := 0.0
	for s in surfaces:
		var w := s.weight()
		var p := s.progress()
		groups[s.group] = float(groups.get(s.group, 0.0)) + w * p
		group_w[s.group] = float(group_w.get(s.group, 0.0)) + w
		total_w += w
		total_c += w * p
	for g in groups.keys():
		groups[g] = groups[g] / maxf(group_w[g], 0.0001)
	var debris := {}
	var cleared := {"leaf": 0, "trash": 0}
	for f in fields:
		var w := f.dirty_initial * f.piece_weight
		var p := f.progress_total()
		total_w += w
		total_c += w * p
		var entry: Dictionary = debris.get(f.tag, {"w": 0.0, "c": 0.0, "zones": {}, "zw": {}})
		entry["w"] += w
		entry["c"] += w * p
		for z in f.zones.keys():
			var zw := float(f.zone_initial.get(z, 0))
			entry["zones"][z] = float(entry["zones"].get(z, 0.0)) + zw * f.progress_zone(z)
			entry["zw"][z] = float(entry["zw"].get(z, 0.0)) + zw
		debris[f.tag] = entry
		var k := "trash" if f.kind == "trash" else "leaf"
		cleared[k] += f.cleared_count()
	var debris_out := {}
	for tag in debris.keys():
		var e: Dictionary = debris[tag]
		var zones := {}
		for z in e["zones"].keys():
			zones[z] = 1.0 if e["zw"][z] <= 0.0 else e["zones"][z] / e["zw"][z]
		debris_out[tag] = {"total": 1.0 if e["w"] <= 0.0 else e["c"] / e["w"], "zones": zones}
	var overall := 1.0 if total_w <= 0.0 else total_c / total_w
	snapshot = {"overall": overall, "groups": groups, "debris": debris_out}
	snapshot["water"] = _water_clarity()
	if water_material:
		water_material.set_shader_parameter("clarity", snapshot["water"])
	for m in health_materials:
		m.set_shader_parameter("health", clampf(0.75 + overall * 0.35, 0.0, 1.0))
	if not initial and not menu_mode:
		for k in cleared.keys():
			var delta: int = cleared[k] - int(_cleared_reported[k])
			if delta > 0:
				Game.add_stat("leaves_cleared" if k == "leaf" else "trash_cleared", delta)
		for d in discoveries:
			d.check_reveal()
		_update_blooms(overall)
	_cleared_reported = cleared
	progress_updated.emit(snapshot)


func _water_clarity() -> float:
	var w: Dictionary = def.get("water", {})
	if w.is_empty():
		return 1.0
	var parts := []
	for g in w.get("surfaces", []):
		parts.append(group_progress(g))
	for t in w.get("debris", []):
		parts.append(debris_progress(t))
	if parts.is_empty():
		return 1.0
	var minimum := 1.0
	var sum := 0.0
	for p in parts:
		sum += p
		minimum = minf(minimum, p)
	# Clarity is held back by the dirtiest component.
	return clampf(sum / parts.size() * 0.6 + minimum * 0.4, 0.0, 1.0)


func overall() -> float:
	return float(snapshot.get("overall", 0.0))


func group_progress(group: String, layer := "") -> float:
	if layer != "":
		var w := 0.0
		var c := 0.0
		for s in surfaces:
			if s.group == group:
				w += s.size.x * s.size.y
				c += s.size.x * s.size.y * s.progress_of_layer(layer)
		return 1.0 if w <= 0.0 else c / w
	var w2 := 0.0
	var c2 := 0.0
	for s in surfaces:
		if s.group == group:
			w2 += s.weight()
			c2 += s.weight() * s.progress()
	return 1.0 if w2 <= 0.0 else c2 / w2


func debris_progress(tag: String, zone := "") -> float:
	var w := 0.0
	var c := 0.0
	for f in fields:
		if f.tag != tag:
			continue
		if zone == "":
			w += f.dirty_initial
			c += f.dirty_initial * f.progress_total()
		elif f.zones.has(zone):
			var zi := float(f.zone_initial.get(zone, 0))
			w += zi
			c += zi * f.progress_zone(zone)
	return 1.0 if w <= 0.0 else c / w


func water_clarity() -> float:
	return _water_clarity()


func _on_surface_completed(s: CleanSurface) -> void:
	if menu_mode:
		return
	Game.add_stat("surfaces_completed", 1)
	Audio.play("surface_done", -4.0)
	Fx.spawn_burst(self, s.global_position + s.global_transform.basis.y * 0.2, Fx.burst(Color(0.6, 1.0, 0.95), 16, 2.0))
	if s.display_name != "":
		message.emit("%s spotless!" % s.display_name, "good")


func _on_field_collected(f: DebrisField, n: int) -> void:
	if menu_mode:
		return
	Audio.play("pop", -10.0, 0.2, 0.05)


func _on_pile_bagged(_f: DebrisField, at: Vector3, n: int) -> void:
	if menu_mode:
		return
	Audio.play("empty_bag", -4.0)
	Fx.spawn_burst(self, at, Fx.burst(Color(0.85, 0.5, 0.15), 18, 2.5, 0.12))
	message.emit("Leaf pile bagged! (%d leaves)" % n, "good")


func _on_discovery_found(d: Discovery) -> void:
	var coins := Game.add_discovery(map_id, d.disc_id)
	Audio.play("discovery")
	discovery_found.emit(d, coins)


func check_pickups(player_pos: Vector3) -> void:
	var r := 1.3 + Game.gear_value("magnet")
	for d in discoveries:
		d.try_pickup(player_pos, r)


func in_bin(p: Vector3) -> bool:
	for r in bins:
		var rr: Rect2 = r
		if rr.grow(0.8).has_point(Vector2(p.x, p.z)):
			return true
	return false


func _update_blooms(o: float) -> void:
	for b in blooms:
		if not b["done"] and o >= b["threshold"]:
			b["done"] = true
			var n: Node3D = b["node"]
			n.visible = true
			var tw := create_tween()
			tw.tween_property(n, "scale", b["scale"], 0.8).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)


## Registers a decoration that grows in once the map is clean enough.
func add_bloom(n: Node3D, threshold: float) -> void:
	blooms.append({"node": n, "threshold": threshold, "done": false, "scale": n.scale})
	n.scale = Vector3.ONE * 0.01
	n.visible = false


# ============================================================= environment ===

func setup_environment(sky_top: Color, sky_horizon: Color, ground_col: Color, sun_dir: Vector3, sun_color := Color(1.0, 0.95, 0.85), sun_energy := 1.0, ambient := 0.4) -> void:
	var we := WorldEnvironment.new()
	env = Environment.new()
	var sky := Sky.new()
	sky_material = ProceduralSkyMaterial.new()
	sky.sky_material = sky_material
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 0.95
	env.tonemap_white = 6.0
	env.glow_enabled = Game.graphics_level() >= 2
	env.glow_intensity = 0.25
	env.glow_bloom = 0.05
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.15
	env.adjustment_contrast = 1.08
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.shadow_enabled = Game.graphics_level() >= 1
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS if Game.graphics_level() >= 2 else DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = [30.0, 40.0, 55.0][Game.graphics_level()]
	sun.shadow_blur = 1.8
	add_child(sun)
	_base_atmo = {"top": sky_top, "horizon": sky_horizon, "ground": ground_col, "dir": sun_dir.normalized(),
		"color": sun_color, "energy": sun_energy, "ambient": ambient}
	apply_atmosphere(Game.resolve_time_of_day(map_id), Game.resolve_weather(map_id))


## Time of day: "morning" | "afternoon" | "evening". Weather: "sunny" | "cloudy" | "windy" | "rain".
func apply_atmosphere(tod: String, weather: String) -> void:
	time_of_day = tod
	self.weather = weather
	var b: Dictionary = _base_atmo
	var top: Color = b["top"]
	var hor: Color = b["horizon"]
	var sun_col: Color = b["color"]
	var energy: float = b["energy"]
	var dir: Vector3 = b["dir"]
	var amb: float = b["ambient"]
	# Sun direction from the map default, then elevation/azimuth by time of day.
	var az := atan2(dir.x, dir.z)
	var elev := deg_to_rad(52.0)
	match tod:
		"morning":
			elev = deg_to_rad(24.0)
			az += 1.1
			sun_col = sun_col.lerp(Color(1.0, 0.82, 0.62), 0.6)
			energy *= 0.85
			hor = hor.lerp(Color(1.0, 0.86, 0.72), 0.45)
		"evening":
			elev = deg_to_rad(13.0)
			az -= 1.2
			sun_col = sun_col.lerp(Color(1.0, 0.6, 0.35), 0.7)
			energy *= 0.75
			top = top.lerp(Color(0.32, 0.38, 0.62), 0.5)
			hor = hor.lerp(Color(1.0, 0.62, 0.38), 0.6)
			amb *= 1.05
	match weather:
		"cloudy", "rain":
			var grey := Color(0.62, 0.66, 0.7) if weather == "cloudy" else Color(0.48, 0.52, 0.58)
			top = top.lerp(grey, 0.75)
			hor = hor.lerp(grey.lightened(0.15), 0.75)
			energy *= 0.42 if weather == "cloudy" else 0.32
			amb *= 1.25
			sun_col = sun_col.lerp(Color(0.9, 0.92, 0.95), 0.6)
	var d := Vector3(sin(az) * cos(elev), -sin(elev), cos(az) * cos(elev)).normalized()
	sky_material.sky_top_color = top
	sky_material.sky_horizon_color = hor
	sky_material.ground_bottom_color = b["ground"]
	sky_material.ground_horizon_color = hor
	sky_material.sun_angle_max = 20.0
	env.ambient_light_color = top.lerp(hor, 0.5).lerp(Color(0.6, 0.65, 0.7), 0.3)
	env.ambient_light_energy = amb * 0.9
	sun.light_color = sun_col
	sun.light_energy = energy * 0.72
	sun.shadow_blur = 3.5 if weather in ["cloudy", "rain"] else 1.8
	sun.look_at_from_position(Vector3.ZERO, d, Vector3.UP)
	# Light atmospheric depth fog on Medium/High.
	env.fog_enabled = Game.graphics_level() >= 1
	env.fog_light_color = hor.lerp(top, 0.3)
	env.fog_density = 0.006 if weather in ["cloudy", "rain"] else 0.0035
	env.fog_sky_affect = 0.0
	RenderingServer.global_shader_parameter_set("wind_strength", 2.6 if weather == "windy" else (1.6 if weather == "rain" else 1.0))
	if rain_fx and is_instance_valid(rain_fx):
		rain_fx.queue_free()
		rain_fx = null
	if weather == "rain" and not menu_mode:
		rain_fx = _make_rain()
		add_child(rain_fx)
	if not menu_mode:
		if weather in ["rain", "windy"]:
			Audio.loop_start("weather", "rain" if weather == "rain" else "wind", -12.0)
		else:
			Audio.loop_stop("weather")


func _make_rain() -> CPUParticles3D:
	var p := CPUParticles3D.new()
	p.amount = int(900 * Fx.amount_scale())
	p.lifetime = 0.9
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	p.emission_box_extents = Vector3(14, 0.5, 14)
	p.direction = Vector3(0.1, -1, 0)
	p.spread = 3
	p.gravity = Vector3(0, -18, 0)
	p.initial_velocity_min = 10
	p.initial_velocity_max = 13
	var q := QuadMesh.new()
	q.size = Vector2(0.015, 0.35)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.albedo_color = Color(0.8, 0.85, 0.95, 0.35)
	m.billboard_mode = BaseMaterial3D.BILLBOARD_FIXED_Y
	q.material = m
	p.mesh = q
	p.position = Vector3(0, 9, 0)
	p.local_coords = false
	p.emitting = true
	return p


## Keeps rain centred on the camera so it always surrounds the player.
func follow_camera(cam_pos: Vector3) -> void:
	if rain_fx:
		rain_fx.global_position = Vector3(cam_pos.x, cam_pos.y + 4.0, cam_pos.z)


# =============================================================== materials ===

func mat(c: Color, rough := 0.8, metal := 0.0) -> StandardMaterial3D:
	var key := "%s|%.2f|%.2f" % [c.to_html(), rough, metal]
	if _mat_cache.has(key):
		return _mat_cache[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	m.metallic = metal
	if c.a < 0.99:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_mat_cache[key] = m
	return m


func emissive(c: Color, energy := 1.5) -> StandardMaterial3D:
	var key := "emit|%s|%.2f" % [c.to_html(), energy]
	if _mat_cache.has(key):
		return _mat_cache[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.emission_enabled = true
	m.emission = c
	m.emission_energy_multiplier = energy
	_mat_cache[key] = m
	return m


func ground_material(a: Color, b: Color, c: Color, scale := 0.35, restorable := false, soil := 0.1) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/ground.gdshader")
	m.set_shader_parameter("grass_tex", load("res://assets/textures/grass_ground.png"))
	m.set_shader_parameter("soil_tex", load("res://assets/textures/soil.png"))
	m.set_shader_parameter("use_textures", 1.0 if a.g > a.r else 0.0)
	m.set_shader_parameter("soil_amount", soil)
	m.set_shader_parameter("color_a", a.darkened(0.12))
	m.set_shader_parameter("color_b", b.darkened(0.12))
	m.set_shader_parameter("color_c", c.darkened(0.12))
	m.set_shader_parameter("scale", scale)
	m.set_shader_parameter("health", 1.0)
	if restorable:
		health_materials.append(m)
		m.set_shader_parameter("health", 0.75)
	return m


## Textured material (triplanar so boxes never stretch). Cached.
func tex_mat(path: String, tint := Color.WHITE, uv_scale := 1.0, rough := 0.85) -> StandardMaterial3D:
	var key := "tex|%s|%s|%.2f|%.2f" % [path, tint.to_html(), uv_scale, rough]
	if _mat_cache.has(key):
		return _mat_cache[key]
	var m := StandardMaterial3D.new()
	m.albedo_texture = load(path)
	m.albedo_color = tint
	m.uv1_triplanar = true
	m.uv1_world_triplanar = true
	m.uv1_scale = Vector3.ONE * uv_scale
	m.roughness = rough
	_mat_cache[key] = m
	return m


# ============================================================== primitives ===

func _mesh_node(mesh: Mesh, material: Material, pos: Vector3, rot_deg := Vector3.ZERO, parent: Node3D = null) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = material
	mi.position = pos
	mi.rotation_degrees = rot_deg
	(parent if parent else self).add_child(mi)
	return mi


func _add_collider(node: Node3D, shape: Shape3D, offset := Vector3.ZERO) -> StaticBody3D:
	var b := StaticBody3D.new()
	b.collision_layer = 1
	b.collision_mask = 0
	var cs := CollisionShape3D.new()
	cs.shape = shape
	cs.position = offset
	b.add_child(cs)
	node.add_child(b)
	return b


func box(pos: Vector3, size: Vector3, material: Material, collide := true, rot_deg := Vector3.ZERO, parent: Node3D = null) -> MeshInstance3D:
	var bm := BoxMesh.new()
	bm.size = size
	var mi := _mesh_node(bm, material, pos, rot_deg, parent)
	if collide:
		var s := BoxShape3D.new()
		s.size = size
		_add_collider(mi, s)
	return mi


func cyl(pos: Vector3, radius: float, height: float, material: Material, collide := true, top := -1.0, segments := 12, parent: Node3D = null) -> MeshInstance3D:
	var cm := CylinderMesh.new()
	cm.bottom_radius = radius
	cm.top_radius = radius if top < 0.0 else top
	cm.height = height
	cm.radial_segments = segments
	cm.rings = 1
	var mi := _mesh_node(cm, material, pos, Vector3.ZERO, parent)
	if collide:
		var s := CylinderShape3D.new()
		s.radius = maxf(radius, top)
		s.height = height
		_add_collider(mi, s)
	return mi


func sphere(pos: Vector3, radius: float, material: Material, squash := Vector3.ONE, segments := 10, parent: Node3D = null) -> MeshInstance3D:
	var sm := SphereMesh.new()
	sm.radius = radius
	sm.height = radius * 2.0
	sm.radial_segments = segments
	sm.rings = maxi(4, segments / 2)
	var mi := _mesh_node(sm, material, pos, Vector3.ZERO, parent)
	mi.scale = squash
	return mi


## Invisible wall (keeps the player inside the play area).
func blocker(pos: Vector3, size: Vector3) -> void:
	# Layer 4 (value 8): blocks the player only, never tool rays or debris.
	var n := Node3D.new()
	n.position = pos
	add_child(n)
	var s := BoxShape3D.new()
	s.size = size
	var b := _add_collider(n, s)
	b.collision_layer = 8


func ground_plane(rect: Rect2, material: Material, y := 0.0) -> MeshInstance3D:
	var pm := PlaneMesh.new()
	pm.size = rect.size
	pm.subdivide_width = 2
	pm.subdivide_depth = 2
	var mi := _mesh_node(pm, material, Vector3(rect.get_center().x, y, rect.get_center().y))
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var s := BoxShape3D.new()
	s.size = Vector3(rect.size.x, 1.0, rect.size.y)
	_add_collider(mi, s, Vector3(0, -0.5, 0))
	return mi


func boundary_walls(rect: Rect2, height := 3.0) -> void:
	player_bounds = rect
	var c := rect.get_center()
	blocker(Vector3(c.x, height / 2, rect.position.y - 0.5), Vector3(rect.size.x + 2, height, 1))
	blocker(Vector3(c.x, height / 2, rect.end.y + 0.5), Vector3(rect.size.x + 2, height, 1))
	blocker(Vector3(rect.position.x - 0.5, height / 2, c.y), Vector3(1, height, rect.size.y + 2))
	blocker(Vector3(rect.end.x + 0.5, height / 2, c.y), Vector3(1, height, rect.size.y + 2))


# ================================================================ surfaces ===

## Generic cleanable surface. `basis` orients the local +Y normal.
func surface(sname: String, group: String, pos: Vector3, basis: Basis, size: Vector2, layers: Array, look: Dictionary, extra := {}) -> CleanSurface:
	_surface_counter += 1
	var s := CleanSurface.new()
	var cfg := {"name": sname, "group": group, "size": size, "layers": layers, "look": look,
		"seed": hash(map_id) % 10000 + _surface_counter * 131}
	cfg.merge(extra, true)
	s.setup(cfg)
	s.transform = Transform3D(basis, pos)
	add_child(s)
	surfaces.append(s)
	return s


## Horizontal surface lying on top of something at height y.
func floor_surface(sname: String, group: String, rect: Rect2, y: float, layers: Array, look: Dictionary, extra := {}) -> CleanSurface:
	return surface(sname, group, Vector3(rect.get_center().x, y + 0.012, rect.get_center().y), Basis(), rect.size, layers, look, extra)


## Vertical surface facing direction `facing_deg` (0 = +Z, 90 = +X, 180 = -Z, 270 = -X).
func wall_surface(sname: String, group: String, center: Vector3, width: float, height: float, facing_deg: float, layers: Array, look: Dictionary, extra := {}) -> CleanSurface:
	var yaw := deg_to_rad(facing_deg)
	var b := Basis(Vector3.UP, yaw) * Basis(Vector3.RIGHT, PI / 2)
	var normal := Basis(Vector3.UP, yaw) * Vector3(0, 0, 1)
	return surface(sname, group, center + normal * 0.015, b, Vector2(width, height), layers, look, extra)


## Splits a big floor into tiles (better tracking resolution + per-tile completion).
func floor_grid(sname: String, group: String, rect: Rect2, y: float, cols: int, rows: int, layers: Array, look: Dictionary, extra := {}) -> Array:
	var out := []
	var cw := rect.size.x / cols
	var ch := rect.size.y / rows
	for r in rows:
		for c in cols:
			var sub := Rect2(rect.position.x + c * cw, rect.position.y + r * ch, cw, ch)
			out.append(floor_surface(sname, group, sub, y, layers, look, extra))
	return out


# ================================================================== debris ===

func debris(cfg: Dictionary) -> DebrisField:
	var f := DebrisField.new()
	if cfg.has("count"):
		cfg["count"] = int(cfg["count"] * (1.0 if menu_mode else Game.density()))
	f.setup(cfg)
	add_child(f)
	fields.append(f)
	return f


func discovery(index: int, pos: Vector3, cover_surface: CleanSurface = null, cover_field: DebrisField = null) -> Discovery:
	var list: Array = def.get("discoveries", [])
	if index >= list.size():
		return null
	var d := Discovery.new()
	d.setup(list[index]["id"], list[index], cover_surface, cover_field)
	d.position = pos
	add_child(d)
	discoveries.append(d)
	return d


## Bin / drop-off point for bags and debris.
func add_bin(center: Vector3, style := "wheelie", yaw_deg := 0.0) -> Rect2:
	var root := Node3D.new()
	root.position = center
	root.rotation_degrees.y = yaw_deg
	add_child(root)
	match style:
		"compost":
			for i in 4:
				var a := i * PI / 2
				box(Vector3(cos(a) * 0.7, 0.45, sin(a) * 0.7), Vector3(0.1 if i % 2 == 0 else 1.5, 0.9, 1.5 if i % 2 == 0 else 0.1), mat(Color(0.5, 0.33, 0.18)), true, Vector3.ZERO, root)
			box(Vector3(0, 0.25, 0), Vector3(1.3, 0.5, 1.3), mat(Color(0.35, 0.22, 0.1)), false, Vector3.ZERO, root)
		"street":
			cyl(Vector3(0, 0.5, 0), 0.32, 1.0, mat(Color(0.12, 0.45, 0.3), 0.5, 0.3), true, 0.3, 12, root)
			cyl(Vector3(0, 1.02, 0), 0.34, 0.06, mat(Color(0.2, 0.2, 0.22), 0.4, 0.5), false, -1, 12, root)
		_:
			box(Vector3(0, 0.55, 0), Vector3(0.7, 1.1, 0.8), mat(Color(0.15, 0.55, 0.3), 0.6), true, Vector3.ZERO, root)
			box(Vector3(0, 1.13, -0.02), Vector3(0.74, 0.07, 0.86), mat(Color(0.1, 0.4, 0.22), 0.6), false, Vector3.ZERO, root)
			cyl(Vector3(0.3, 0.1, 0.42), 0.1, 0.08, mat(Color(0.1, 0.1, 0.1)), false, -1, 10, root).rotation_degrees.z = 90
			cyl(Vector3(-0.3, 0.1, 0.42), 0.1, 0.08, mat(Color(0.1, 0.1, 0.1)), false, -1, 10, root).rotation_degrees.z = 90
	# Floating marker ring so the player knows where to empty bags.
	var ring := MeshInstance3D.new()
	var t := TorusMesh.new()
	t.inner_radius = 1.0
	t.outer_radius = 1.1
	t.ring_segments = 4
	ring.mesh = t
	ring.scale = Vector3(1, 0.05, 1)
	ring.position = Vector3(0, 0.03, 0)
	ring.material_override = emissive(Color(0.12, 0.85, 0.8), 1.2)
	root.add_child(ring)
	var r := Rect2(center.x - 0.9, center.z - 0.9, 1.8, 1.8)
	bins.append(r)
	return r


# =================================================================== props ===

func tree(pos: Vector3, canopy: Array, scale_f := 1.0, style := "round") -> Node3D:
	if style == "palm":
		return _palm(pos, canopy, scale_f)
	var tint: Color = canopy[0]
	var species := style
	if style == "round":
		var autumn := tint.r > tint.g
		var h := absi(hash(pos)) % 3
		if autumn:
			species = "maple" if h != 1 else "oak"
		else:
			species = ["oak", "birch", "oak"][h]
	elif style == "pine":
		species = "pine"
	return Vegetation.tree(self, pos, species, tint.lerp(canopy[canopy.size() - 1], 0.3), scale_f)


func _palm(pos: Vector3, canopy: Array, scale_f: float) -> Node3D:
	var root := Node3D.new()
	root.position = pos
	root.scale = Vector3.ONE * scale_f
	add_child(root)
	var trunk_m := tex_mat("res://assets/textures/bark.png", Color(0.9, 0.8, 0.65), 1.5)
	for i in 6:
		cyl(Vector3(sin(i * 0.3) * 0.15, 0.35 + i * 0.7, 0), 0.19 - i * 0.012, 0.72, trunk_m, false, 0.16 - i * 0.012, 8, root)
	var tshape := CylinderShape3D.new()
	tshape.radius = 0.3
	tshape.height = 3.0
	_add_collider(root, tshape, Vector3(0, 1.5, 0))
	var fm := Vegetation.foliage_mat(canopy[0], true)
	var xf := []
	var hs := []
	for i in 9:
		for k in 4:
			var a := i * TAU / 9.0
			var dist := 0.4 + k * 0.55
			var p := Vector3(cos(a) * dist, 4.2 - k * k * 0.12, sin(a) * dist)
			xf.append(Transform3D(Basis(Vector3.UP, -a + PI / 2) * Basis(Vector3.RIGHT, -1.2).scaled(Vector3(1.1, 0.7, 1.1)), p))
			hs.append(0.6 + k * 0.1)
	Vegetation._mm_instance(root, Vegetation.card_mesh(), fm, xf, hs, [], true, 70.0)
	return root


func bush(pos: Vector3, color: Color, size := 1.0) -> Node3D:
	var flowering := Color(0, 0, 0, 0)
	if absi(hash(pos)) % 4 == 0 and color.g > color.r:
		flowering = [Color(1, 0.45, 0.6), Color(1, 1, 1), Color(0.75, 0.5, 1.0)][absi(hash(pos)) % 3]
	var root := Vegetation.bush(self, pos, color.lerp(Color(0.3, 0.48, 0.2), 0.3), size, flowering)
	var body := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = 0.55 * size
	cs.shape = shape
	cs.position.y = 0.4 * size
	body.add_child(cs)
	root.add_child(body)
	return root


func flowers(rect: Rect2, count: int, colors: Array, y := 0.0) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = _flower_head()
	mm.instance_count = count
	for i in count:
		var p := Vector3(_rng.randf_range(rect.position.x, rect.end.x), y + _rng.randf_range(0.25, 0.45), _rng.randf_range(rect.position.y, rect.end.y))
		mm.set_instance_transform(i, Transform3D(Basis().scaled(Vector3.ONE * _rng.randf_range(0.8, 1.4)), p))
		mm.set_instance_color(i, colors[_rng.randi() % colors.size()])
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.roughness = 0.6
	mmi.material_override = m
	add_child(mmi)
	# Stems.
	var stems := MultiMesh.new()
	stems.transform_format = MultiMesh.TRANSFORM_3D
	var cm := CylinderMesh.new()
	cm.top_radius = 0.012
	cm.bottom_radius = 0.015
	cm.height = 0.35
	cm.radial_segments = 4
	cm.rings = 1
	stems.mesh = cm
	stems.instance_count = count
	for i in count:
		var t := mm.get_instance_transform(i)
		stems.set_instance_transform(i, Transform3D(Basis(), Vector3(t.origin.x, y + 0.17, t.origin.z)))
	var smi := MultiMeshInstance3D.new()
	smi.multimesh = stems
	smi.material_override = mat(Color(0.25, 0.55, 0.2))
	smi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(smi)
	return mmi


func grass_tufts(rect: Rect2, count: int, color: Color, avoid: Array = []) -> void:
	# Upgraded: realistic instanced grass clumps with wind (density scales with quality).
	var per_m2 := clampf(count / maxf(rect.get_area(), 1.0) * 6.0, 2.0, 10.0)
	Vegetation.grass_field(self, rect, per_m2, color.darkened(0.3), color.lightened(0.25), avoid, absi(hash(map_id)) + count)


func hedge(rect: Rect2, height: float, color: Color) -> void:
	Vegetation.hedge(self, rect, height, color.lerp(Color(0.2, 0.4, 0.17), 0.3))


func fence(from: Vector3, to: Vector3, color: Color, height := 1.0) -> void:
	var d := to - from
	var length := d.length()
	var yaw := atan2(d.x, d.z)
	var n := maxi(2, int(length / 0.18))
	var m := tex_mat("res://assets/textures/wood.png", color.lerp(Color.WHITE, 0.2), 1.0, 0.75)
	var center := (from + to) / 2
	var holder := Node3D.new()
	holder.position = Vector3(center.x, 0, center.z)
	holder.rotation.y = yaw
	add_child(holder)
	# Pickets with pointed tops, slight height variation, sturdier posts every 2 m.
	for i in n:
		var z := -length / 2 + length * (float(i) / (n - 1))
		var h := height * (0.97 + 0.06 * sin(i * 1.7))
		box(Vector3(0, h / 2, z), Vector3(0.025, h, 0.09), m, false, Vector3.ZERO, holder)
		box(Vector3(0, h, z), Vector3(0.024, 0.064, 0.064), m, false, Vector3(45, 0, 0), holder)
	var posts := maxi(2, int(length / 2.0) + 1)
	for i in posts:
		var z2 := -length / 2 + length * (float(i) / (posts - 1))
		box(Vector3(0.05, height * 0.55, z2), Vector3(0.1, height * 1.1, 0.1), m, false, Vector3.ZERO, holder)
	box(Vector3(0.04, height * 0.78, 0), Vector3(0.04, 0.08, length), m, false, Vector3.ZERO, holder)
	box(Vector3(0.04, height * 0.28, 0), Vector3(0.04, 0.08, length), m, false, Vector3.ZERO, holder)
	var s2 := BoxShape3D.new()
	s2.size = Vector3(0.2, height, length)
	_add_collider(holder, s2, Vector3(0, height / 2, 0))


func lamp_post(pos: Vector3, color := Color(0.15, 0.18, 0.22)) -> void:
	cyl(pos + Vector3(0, 1.75, 0), 0.07, 3.5, mat(color, 0.4, 0.6), true, 0.05, 8)
	box(pos + Vector3(0, 3.55, 0), Vector3(0.4, 0.2, 0.4), mat(color, 0.4, 0.6), false)
	sphere(pos + Vector3(0, 3.38, 0), 0.16, emissive(Color(1.0, 0.92, 0.7), 2.0))


func table_set(pos: Vector3, yaw_deg: float, group: String, wood: Color, dirt: Array, prefix := "Table") -> Node3D:
	var root := Node3D.new()
	root.position = pos
	root.rotation_degrees.y = yaw_deg
	add_child(root)
	var m := mat(wood, 0.7)
	var leg := mat(wood.darkened(0.3), 0.7)
	box(Vector3(0, 0.74, 0), Vector3(1.6, 0.06, 0.9), m, true, Vector3.ZERO, root)
	for sx in [-0.7, 0.7]:
		for sz in [-0.35, 0.35]:
			box(Vector3(sx, 0.36, sz), Vector3(0.07, 0.72, 0.07), leg, false, Vector3.ZERO, root)
	var look := {"a": wood, "b": wood.darkened(0.15), "pattern": 2, "roughness": 0.65}
	var s := CleanSurface.new()
	_surface_counter += 1
	s.setup({"name": prefix, "group": group, "size": Vector2(1.6, 0.9), "layers": dirt, "look": look, "seed": _surface_counter * 77})
	s.position = Vector3(0, 0.78, 0)
	root.add_child(s)
	surfaces.append(s)
	for side in [-1, 1]:
		box(Vector3(0, 0.44, side * 0.85), Vector3(1.5, 0.05, 0.4), m, true, Vector3.ZERO, root)
		for sx in [-0.65, 0.65]:
			box(Vector3(sx, 0.21, side * 0.85), Vector3(0.06, 0.42, 0.3), leg, false, Vector3.ZERO, root)
		var bs := CleanSurface.new()
		_surface_counter += 1
		bs.setup({"name": prefix + " bench", "group": group, "size": Vector2(1.5, 0.4), "layers": dirt, "look": look, "seed": _surface_counter * 77})
		bs.position = Vector3(0, 0.475, side * 0.85)
		root.add_child(bs)
		surfaces.append(bs)
	return root


func park_bench(pos: Vector3, yaw_deg: float, group: String, dirt: Array, wood := Color(0.62, 0.42, 0.24), metal := Color(0.15, 0.2, 0.25)) -> Node3D:
	var root := Node3D.new()
	root.position = pos
	root.rotation_degrees.y = yaw_deg
	add_child(root)
	var m := mat(metal, 0.4, 0.6)
	for sx in [-0.8, 0.8]:
		box(Vector3(sx, 0.25, 0), Vector3(0.08, 0.5, 0.5), m, false, Vector3.ZERO, root)
		box(Vector3(sx, 0.7, 0.22), Vector3(0.08, 0.5, 0.06), m, false, Vector3.ZERO, root)
	var wm := mat(wood, 0.7)
	box(Vector3(0, 0.48, 0), Vector3(1.8, 0.06, 0.5), wm, true, Vector3.ZERO, root)
	box(Vector3(0, 0.8, 0.25), Vector3(1.8, 0.4, 0.05), wm, false, Vector3(-10, 0, 0), root)
	var look := {"a": wood, "b": wood.darkened(0.15), "pattern": 2, "roughness": 0.6, "scale": 0.6}
	var seat := CleanSurface.new()
	_surface_counter += 1
	seat.setup({"name": "Bench", "group": group, "size": Vector2(1.8, 0.5), "layers": dirt, "look": look, "seed": _surface_counter * 53})
	seat.position = Vector3(0, 0.515, 0)
	root.add_child(seat)
	surfaces.append(seat)
	var back := CleanSurface.new()
	_surface_counter += 1
	back.setup({"name": "", "group": group, "size": Vector2(1.8, 0.4), "layers": dirt, "look": look, "seed": _surface_counter * 53})
	back.transform = Transform3D(Basis(Vector3.RIGHT, deg_to_rad(80)), Vector3(0, 0.8, 0.22))
	root.add_child(back)
	surfaces.append(back)
	return root


func planter(pos: Vector3, size: Vector3, group: String, dirt: Array, color: Color, plant_color: Color, bloom_threshold := -1.0) -> void:
	box(pos + Vector3(0, size.y / 2, 0), size, mat(color, 0.8))
	box(pos + Vector3(0, size.y - 0.02, 0), Vector3(size.x - 0.12, 0.05, size.z - 0.12), mat(Color(0.3, 0.2, 0.12), 1.0), false)
	var look := {"a": color, "b": color.darkened(0.12), "pattern": 4 if size.y > 0.5 else 0, "roughness": 0.8, "scale": 1.0}
	wall_surface("Planter", group, pos + Vector3(0, size.y / 2, size.z / 2), size.x, size.y, 0, dirt, look)
	wall_surface("", group, pos + Vector3(0, size.y / 2, -size.z / 2), size.x, size.y, 180, dirt, look)
	wall_surface("", group, pos + Vector3(size.x / 2, size.y / 2, 0), size.z, size.y, 90, dirt, look)
	wall_surface("", group, pos + Vector3(-size.x / 2, size.y / 2, 0), size.z, size.y, 270, dirt, look)
	if bloom_threshold >= 0.0:
		var plants := Node3D.new()
		plants.position = pos + Vector3(0, size.y, 0)
		add_child(plants)
		var n := int(size.x / 0.5)
		for i in n:
			var x := -size.x / 2 + 0.25 + i * (size.x - 0.5) / maxf(1, n - 1)
			sphere(Vector3(x, 0.25, 0), 0.28, mat(plant_color.lightened((i % 3) * 0.08), 0.85), Vector3(1, 1.2, 1), 7, plants)
			sphere(Vector3(x + 0.1, 0.5, 0.05), 0.09, mat([Color(1, 0.4, 0.6), Color(1, 0.85, 0.2), Color(0.95, 0.95, 1)][i % 3], 0.6), Vector3.ONE, 6, plants)
		add_bloom(plants, bloom_threshold)


func house_facade(center: Vector3, width: float, height: float, wall: Color, roof: Color, facing_deg := 0.0) -> Node3D:
	var root := Node3D.new()
	root.position = center
	root.rotation_degrees.y = facing_deg
	add_child(root)
	var wall_m := tex_mat("res://assets/textures/siding.png", wall, 0.5, 0.9)
	var roof_m := tex_mat("res://assets/textures/roof_tiles.png", roof.lerp(Color.WHITE, 0.45), 0.5, 0.8)
	var trim := mat(Color(0.97, 0.97, 0.95), 0.6)
	var stone_m := tex_mat("res://assets/textures/rock.png", Color(0.95, 0.92, 0.88), 1.0)
	box(Vector3(0, height / 2, -2.0), Vector3(width, height, 4.0), wall_m, true, Vector3.ZERO, root)
	box(Vector3(0, 0.25, -1.98), Vector3(width + 0.06, 0.5, 4.06), stone_m, false, Vector3.ZERO, root)   # stone plinth
	box(Vector3(0, height + 0.9, -1.0), Vector3(width + 0.6, 0.18, 3.4), roof_m, false, Vector3(28, 0, 0), root)
	box(Vector3(0, height + 0.9, -3.0), Vector3(width + 0.6, 0.18, 3.4), roof_m, false, Vector3(-28, 0, 0), root)
	box(Vector3(0, height + 1.72, -2.0), Vector3(width + 0.6, 0.12, 0.3), mat(roof.darkened(0.3)), false, Vector3.ZERO, root)
	# Gutter + downpipes.
	var metal := mat(Color(0.75, 0.77, 0.8), 0.35, 0.7)
	box(Vector3(0, height + 0.1, 0.45), Vector3(width + 0.6, 0.1, 0.12), metal, false, Vector3.ZERO, root)
	for sx in [-width / 2 + 0.15, width / 2 - 0.15]:
		box(Vector3(sx, height / 2, 0.1), Vector3(0.08, height, 0.08), metal, false, Vector3.ZERO, root)
	# Chimney.
	box(Vector3(width * 0.3, height + 1.8, -2.4), Vector3(0.7, 1.6, 0.7), tex_mat("res://assets/textures/rock.png", Color(0.8, 0.5, 0.4), 1.5), false, Vector3.ZERO, root)
	var glass := mat(Color(0.42, 0.6, 0.72), 0.08, 0.4)
	var n := int(width / 3.0)
	for i in n:
		var x := -width / 2 + 1.5 + i * 3.0
		if absf(x) < 1.0:
			continue
		var wy := height * 0.55
		box(Vector3(x, wy, 0.02), Vector3(1.36, 1.46, 0.08), trim, false, Vector3.ZERO, root)
		box(Vector3(x, wy, 0.05), Vector3(1.16, 1.26, 0.04), glass, false, Vector3.ZERO, root)
		box(Vector3(x, wy, 0.08), Vector3(0.05, 1.26, 0.03), trim, false, Vector3.ZERO, root)
		box(Vector3(x, wy, 0.08), Vector3(1.16, 0.05, 0.03), trim, false, Vector3.ZERO, root)
		box(Vector3(x, wy - 0.8, 0.14), Vector3(1.5, 0.08, 0.28), trim, false, Vector3.ZERO, root)
		# Shutters.
		for sx2 in [-0.82, 0.82]:
			box(Vector3(x + sx2, wy, 0.05), Vector3(0.28, 1.4, 0.05), mat(Color(0.18, 0.36, 0.42), 0.7), false, Vector3.ZERO, root)
		# Window box with flowers.
		box(Vector3(x, wy - 0.95, 0.22), Vector3(1.2, 0.22, 0.25), tex_mat("res://assets/textures/wood.png", Color(0.7, 0.45, 0.3), 2.0), false, Vector3.ZERO, root)
		for k in 6:
			sphere(Vector3(x - 0.5 + k * 0.2, wy - 0.78, 0.22), 0.09, mat([Color(1, 0.35, 0.45), Color(1, 0.85, 0.3), Color(0.95, 0.95, 1)][k % 3], 0.6), Vector3.ONE, 6, root)
	# Door with panels, porch, steps, lamp and mat.
	box(Vector3(0, 1.15, 0.03), Vector3(1.4, 2.4, 0.08), trim, false, Vector3.ZERO, root)
	box(Vector3(0, 1.12, 0.07), Vector3(1.15, 2.22, 0.06), mat(Color(0.55, 0.2, 0.12), 0.55), false, Vector3.ZERO, root)
	for py in [0.6, 1.6]:
		box(Vector3(0, py, 0.11), Vector3(0.8, 0.6, 0.02), mat(Color(0.48, 0.17, 0.1), 0.55), false, Vector3.ZERO, root)
	sphere(Vector3(0.42, 1.1, 0.14), 0.04, mat(Color(1.0, 0.8, 0.3), 0.25, 0.9), Vector3.ONE, 6, root)
	box(Vector3(0, 0.08, 0.55), Vector3(2.2, 0.16, 1.0), stone_m, true, Vector3.ZERO, root)
	box(Vector3(0, 0.17, 0.5), Vector3(0.9, 0.02, 0.55), mat(Color(0.35, 0.25, 0.18), 1.0), false, Vector3.ZERO, root)
	box(Vector3(0.95, 2.1, 0.12), Vector3(0.14, 0.24, 0.14), mat(Color(0.12, 0.12, 0.12), 0.4, 0.6), false, Vector3.ZERO, root)
	sphere(Vector3(0.95, 2.06, 0.18), 0.06, emissive(Color(1.0, 0.85, 0.55), 1.6), Vector3.ONE, 6, root)
	box(Vector3(-0.85, 1.6, 0.09), Vector3(0.25, 0.08, 0.02), mat(Color(0.75, 0.6, 0.25), 0.3, 0.8), false, Vector3.ZERO, root)  # house number plate
	return root


# =================================================== garden detail props ===

func mailbox(pos: Vector3, yaw_deg := 0.0, color := Color(0.15, 0.35, 0.6)) -> void:
	var root := Node3D.new()
	root.position = pos
	root.rotation_degrees.y = yaw_deg
	add_child(root)
	box(Vector3(0, 0.55, 0), Vector3(0.1, 1.1, 0.1), tex_mat("res://assets/textures/wood.png", Color(0.6, 0.45, 0.3), 2.0), true, Vector3.ZERO, root)
	box(Vector3(0, 1.2, 0), Vector3(0.3, 0.26, 0.48), mat(color, 0.4, 0.4), false, Vector3.ZERO, root)
	cyl(Vector3(0, 1.32, 0), 0.15, 0.48, mat(color, 0.4, 0.4), false, -1, 10, root).rotation_degrees.x = 90
	box(Vector3(0.17, 1.33, 0.12), Vector3(0.02, 0.2, 0.05), mat(Color(0.85, 0.15, 0.1), 0.5), false, Vector3.ZERO, root)


func garden_light(pos: Vector3) -> void:
	cyl(pos + Vector3(0, 0.3, 0), 0.05, 0.6, mat(Color(0.12, 0.13, 0.14), 0.4, 0.6), false, -1, 8)
	cyl(pos + Vector3(0, 0.65, 0), 0.09, 0.12, emissive(Color(1.0, 0.88, 0.6), 1.3), false, -1, 8)
	cyl(pos + Vector3(0, 0.73, 0), 0.11, 0.04, mat(Color(0.12, 0.13, 0.14), 0.4, 0.6), false, -1, 8)


func rock(pos: Vector3, size := 0.5, seed := 0) -> void:
	var r := RandomNumberGenerator.new()
	r.seed = seed if seed != 0 else hash(pos)
	var mi := sphere(pos + Vector3(0, size * 0.25, 0), size, tex_mat("res://assets/textures/rock.png", Color.WHITE, 1.4, 0.95), Vector3(r.randf_range(0.8, 1.3), r.randf_range(0.45, 0.7), r.randf_range(0.8, 1.2)), 7)
	mi.rotation.y = r.randf() * TAU


func wheelbarrow(pos: Vector3, yaw_deg := 0.0) -> void:
	var root := Node3D.new()
	root.position = pos
	root.rotation_degrees.y = yaw_deg
	add_child(root)
	var green := mat(Color(0.2, 0.5, 0.3), 0.5, 0.3)
	box(Vector3(0, 0.55, 0), Vector3(0.7, 0.3, 1.0), green, true, Vector3(0, 0, 0), root)
	box(Vector3(0, 0.42, 0.55), Vector3(0.6, 0.06, 0.3), green, false, Vector3(-35, 0, 0), root)
	var wheel := cyl(Vector3(0, 0.22, 0.75), 0.22, 0.1, mat(Color(0.1, 0.1, 0.1), 0.8), false, -1, 14, root)
	wheel.rotation_degrees.z = 90
	for sx in [-0.28, 0.28]:
		box(Vector3(sx, 0.5, -0.65), Vector3(0.04, 0.04, 0.9), mat(Color(0.3, 0.3, 0.32), 0.4, 0.6), false, Vector3(-12, 0, 0), root)
		box(Vector3(sx, 0.2, -0.25), Vector3(0.04, 0.4, 0.04), mat(Color(0.3, 0.3, 0.32), 0.4, 0.6), false, Vector3.ZERO, root)
	# A few leaves already inside.
	box(Vector3(0, 0.66, 0), Vector3(0.6, 0.06, 0.9), mat(Color(0.75, 0.42, 0.12), 0.9), false, Vector3.ZERO, root)


func bird_bath(pos: Vector3) -> void:
	var stone := tex_mat("res://assets/textures/rock.png", Color(0.95, 0.93, 0.9), 2.0)
	cyl(pos + Vector3(0, 0.08, 0), 0.3, 0.16, stone, true, -1, 12)
	cyl(pos + Vector3(0, 0.5, 0), 0.09, 0.7, stone, false, 0.12, 10)
	cyl(pos + Vector3(0, 0.9, 0), 0.45, 0.14, stone, false, 0.5, 14)
	cyl(pos + Vector3(0, 0.975, 0), 0.4, 0.01, mat(Color(0.35, 0.55, 0.65, 0.85), 0.05, 0.2), false, -1, 14)


func watering_can(pos: Vector3, yaw_deg := 0.0) -> void:
	var root := Node3D.new()
	root.position = pos
	root.rotation_degrees.y = yaw_deg
	add_child(root)
	var m := mat(Color(0.25, 0.6, 0.45), 0.35, 0.5)
	cyl(Vector3(0, 0.15, 0), 0.13, 0.3, m, false, -1, 12, root)
	cyl(Vector3(0.2, 0.22, 0), 0.025, 0.35, m, false, 0.015, 6, root).rotation_degrees.z = -55
	box(Vector3(-0.02, 0.33, 0), Vector3(0.2, 0.03, 0.03), m, false, Vector3.ZERO, root)


func leaning_tool(pos: Vector3, yaw_deg := 0.0, kind := "rake") -> void:
	var root := Node3D.new()
	root.position = pos
	root.rotation_degrees = Vector3(0, yaw_deg, 0)
	add_child(root)
	var wood := tex_mat("res://assets/textures/wood.png", Color(0.85, 0.65, 0.45), 3.0)
	var pole := cyl(Vector3(0, 0.8, 0), 0.02, 1.6, wood, false, -1, 6, root)
	pole.rotation_degrees.x = -12
	var head_y := 0.05 if kind == "rake" else 0.1
	var head := box(Vector3(0, head_y, 0.17), Vector3(0.45 if kind == "rake" else 0.22, 0.05, 0.06 if kind == "rake" else 0.3), mat(Color(0.35, 0.36, 0.38), 0.4, 0.7), false, Vector3.ZERO, root)
	head.rotation_degrees.x = -12


static var _flower_mesh: Mesh
func _flower_head() -> Mesh:
	if _flower_mesh:
		return _flower_mesh
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for k in 6:
		var a := k * TAU / 6.0
		var a1 := a - 0.35
		var a2 := a + 0.35
		var tip := Vector3(cos(a) * 0.1, 0.02, sin(a) * 0.1)
		st.set_color(Color(1, 1, 1))
		st.set_normal(Vector3.UP)
		st.add_vertex(Vector3.ZERO)
		st.add_vertex(Vector3(cos(a1) * 0.06, 0.012, sin(a1) * 0.06))
		st.add_vertex(tip)
		st.add_vertex(Vector3.ZERO)
		st.add_vertex(tip)
		st.add_vertex(Vector3(cos(a2) * 0.06, 0.012, sin(a2) * 0.06))
	# Yellow centre (vertex colour multiplies with instance colour; keep it bright).
	for k in 6:
		var a3 := k * TAU / 6.0
		var b3 := (k + 1) * TAU / 6.0
		st.set_color(Color(1.0, 0.85, 0.2))
		st.add_vertex(Vector3(0, 0.03, 0))
		st.add_vertex(Vector3(cos(b3) * 0.025, 0.025, sin(b3) * 0.025))
		st.add_vertex(Vector3(cos(a3) * 0.025, 0.025, sin(a3) * 0.025))
	_flower_mesh = st.commit()
	return _flower_mesh


func parasol(pos: Vector3, color: Color) -> void:
	cyl(pos + Vector3(0, 1.2, 0), 0.04, 2.4, mat(Color(0.9, 0.9, 0.9), 0.4, 0.5), true)
	cyl(pos + Vector3(0, 2.35, 0), 1.4, 0.4, mat(color, 0.7), false, 0.05, 10)


func pot(pos: Vector3, color: Color, plant: Color, s := 1.0) -> void:
	cyl(pos + Vector3(0, 0.25 * s, 0), 0.25 * s, 0.5 * s, mat(color, 0.8), true, 0.3 * s, 10)
	sphere(pos + Vector3(0, 0.65 * s, 0), 0.3 * s, mat(plant, 0.9), Vector3(1, 1.1, 1), 7)
