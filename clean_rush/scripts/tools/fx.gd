class_name Fx
extends RefCounted
## Factory for lightweight CPU particle effects (mobile friendly).

static var _mats: Dictionary = {}


static func amount_scale() -> float:
	return [0.45, 0.75, 1.0][Game.graphics_level()]


static func billboard_mat(color: Color, soft := true) -> StandardMaterial3D:
	var key := color.to_html() + str(soft)
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.vertex_color_use_as_albedo = true
	m.albedo_color = color
	m.albedo_texture = _soft_dot() if soft else null
	m.disable_receive_shadows = true
	_mats[key] = m
	return m


static var _dot: ImageTexture
static func _soft_dot() -> ImageTexture:
	if _dot:
		return _dot
	var img := Image.create(32, 32, false, Image.FORMAT_RGBA8)
	for y in 32:
		for x in 32:
			var d := Vector2(x - 15.5, y - 15.5).length() / 15.5
			var a := clampf(1.0 - d, 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, a * a))
	_dot = ImageTexture.create_from_image(img)
	return _dot


static func _base(amount: int, lifetime: float, color: Color, size: float) -> CPUParticles3D:
	var p := CPUParticles3D.new()
	p.amount = maxi(2, int(amount * amount_scale()))
	p.lifetime = lifetime
	var q := QuadMesh.new()
	q.size = Vector2(size, size)
	q.material = billboard_mat(color)
	p.mesh = q
	p.local_coords = false
	return p


static func sparkles(color: Color) -> CPUParticles3D:
	var p := _base(14, 1.0, color, 0.12)
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 0.35
	p.direction = Vector3.UP
	p.spread = 30
	p.initial_velocity_min = 0.4
	p.initial_velocity_max = 1.0
	p.gravity = Vector3(0, 0.3, 0)
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.4
	p.color_ramp = _fade_ramp(color)
	return p


static func splash() -> CPUParticles3D:
	var p := _base(36, 0.45, Color(0.85, 0.95, 1.0, 0.85), 0.12)
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 0.15
	p.direction = Vector3.UP
	p.spread = 70
	p.initial_velocity_min = 1.5
	p.initial_velocity_max = 3.5
	p.gravity = Vector3(0, -9, 0)
	p.scale_amount_min = 0.4
	p.scale_amount_max = 1.2
	p.color_ramp = _fade_ramp(Color(0.85, 0.95, 1.0, 0.85))
	return p


static func mist(color: Color) -> CPUParticles3D:
	var p := _base(18, 0.9, color, 0.45)
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 0.25
	p.direction = Vector3.UP
	p.spread = 90
	p.initial_velocity_min = 0.2
	p.initial_velocity_max = 0.6
	p.gravity = Vector3(0, 0.2, 0)
	p.scale_amount_min = 0.6
	p.scale_amount_max = 1.6
	p.color_ramp = _fade_ramp(color)
	return p


static func stream(color: Color, size := 0.09) -> CPUParticles3D:
	# Emitted along local -Z (the nozzle direction).
	var p := _base(60, 0.35, color, size)
	p.local_coords = false
	p.direction = Vector3(0, 0, -1)
	p.spread = 4
	p.initial_velocity_min = 14
	p.initial_velocity_max = 17
	p.gravity = Vector3(0, -3, 0)
	p.scale_amount_min = 0.6
	p.scale_amount_max = 1.2
	p.color_ramp = _fade_ramp(color)
	return p


static func cone(color: Color, speed: float, spread: float, size: float) -> CPUParticles3D:
	var p := _base(40, 0.5, color, size)
	p.direction = Vector3(0, 0, -1)
	p.spread = spread
	p.initial_velocity_min = speed * 0.7
	p.initial_velocity_max = speed
	p.gravity = Vector3.ZERO
	p.damping_min = 2
	p.damping_max = 4
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.5
	p.color_ramp = _fade_ramp(color)
	return p


static func suction(color: Color) -> CPUParticles3D:
	var p := _base(30, 0.4, color, 0.08)
	p.local_coords = true
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 0.9
	p.radial_accel_min = -18
	p.radial_accel_max = -12
	p.gravity = Vector3.ZERO
	p.color_ramp = _fade_ramp(color)
	return p


static func burst(color: Color, amount := 24, speed := 3.0, size := 0.14) -> CPUParticles3D:
	var p := _base(amount, 0.8, color, size)
	p.one_shot = true
	p.explosiveness = 0.95
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 0.2
	p.direction = Vector3.UP
	p.spread = 80
	p.initial_velocity_min = speed * 0.5
	p.initial_velocity_max = speed
	p.gravity = Vector3(0, -5, 0)
	p.color_ramp = _fade_ramp(color)
	return p


static func confetti() -> CPUParticles3D:
	var p := burst(Color.WHITE, 60, 6.0, 0.16)
	var g := Gradient.new()
	g.set_color(0, Color("1fc8c8"))
	g.add_point(0.33, Color("ff8c2a"))
	g.add_point(0.66, Color("5bd66b"))
	g.set_color(g.get_point_count() - 1, Color("ffffff"))
	p.color_initial_ramp = g
	p.lifetime = 1.6
	p.gravity = Vector3(0, -4, 0)
	return p


static func _fade_ramp(color: Color) -> Gradient:
	var g := Gradient.new()
	g.set_color(0, Color(color, color.a))
	g.set_color(1, Color(color, 0.0))
	return g


## Spawns a one-shot effect in the world and frees it afterwards.
static func spawn_burst(parent: Node, at: Vector3, p: CPUParticles3D) -> void:
	parent.add_child(p)
	p.global_position = at
	p.emitting = true
	p.get_tree().create_timer(p.lifetime + 0.3).timeout.connect(p.queue_free)
