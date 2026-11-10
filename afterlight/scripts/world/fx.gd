class_name FX
extends RefCounted
## Small, pooled-by-lifetime visual effects. Particle counts are scaled by
## the graphics preset to stay cheap on low-end phones.

static var particle_scale := 1.0

static func burst(parent: Node, pos: Vector3, col: Color, amount := 24, speed := 4.0, life := 0.9) -> void:
	if parent == null or not parent.is_inside_tree():
		return
	var p := CPUParticles3D.new()
	p.one_shot = true
	p.explosiveness = 0.95
	p.amount = maxi(4, int(amount * particle_scale))
	p.lifetime = life
	p.direction = Vector3.UP
	p.spread = 180.0
	p.initial_velocity_min = speed * 0.4
	p.initial_velocity_max = speed
	p.gravity = Vector3(0, -3.0, 0)
	p.scale_amount_min = 0.6
	p.scale_amount_max = 1.3
	var m := SphereMesh.new()
	m.radius = 0.06
	m.height = 0.12
	m.radial_segments = 6
	m.rings = 3
	m.material = Mats.neon(col, 4.0)
	p.mesh = m
	var grad := Gradient.new()
	grad.set_color(0, Color(1, 1, 1, 1))
	grad.set_color(1, Color(1, 1, 1, 0))
	p.color_ramp = grad
	parent.add_child(p)
	p.global_position = pos
	p.emitting = true
	parent.get_tree().create_timer(life + 0.3).timeout.connect(p.queue_free)

## Ambient floating motes (dust / embers) around a point.
static func motes(parent: Node, pos: Vector3, extents: Vector3, col: Color, amount := 60) -> CPUParticles3D:
	var p := CPUParticles3D.new()
	p.amount = maxi(6, int(amount * particle_scale))
	p.lifetime = 8.0
	p.preprocess = 8.0
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	p.emission_box_extents = extents
	p.direction = Vector3.UP
	p.spread = 60.0
	p.initial_velocity_min = 0.05
	p.initial_velocity_max = 0.3
	p.gravity = Vector3(0, 0.02, 0)
	p.scale_amount_min = 0.6
	p.scale_amount_max = 1.4
	var m := SphereMesh.new()
	m.radius = 0.03
	m.height = 0.06
	m.radial_segments = 4
	m.rings = 2
	m.material = Mats.neon(col, 2.0)
	p.mesh = m
	parent.add_child(p)
	p.position = pos
	p.add_to_group("ambient_particles")
	return p
