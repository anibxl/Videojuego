class_name Vegetation
extends RefCounted
## Realistic, mobile-friendly vegetation built from alpha-tested foliage cards
## (one MultiMesh per plant = one draw call), textured branching trunks,
## wind animation in the shaders and distance-based LOD.

static var _foliage_mats: Dictionary = {}
static var _bark_mats: Dictionary = {}
static var _card_mesh: Mesh
static var _grass_mesh: Mesh
static var _grass_mat: ShaderMaterial
static var _inner_mats: Dictionary = {}


static func quality() -> int:
	return Game.graphics_level()


static func foliage_mat(tint: Color, needles := false) -> ShaderMaterial:
	var key := tint.to_html() + str(needles)
	if _foliage_mats.has(key):
		return _foliage_mats[key]
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/foliage.gdshader")
	m.set_shader_parameter("card", load("res://assets/textures/pine_card.png" if needles else "res://assets/textures/foliage_card.png"))
	m.set_shader_parameter("tint", tint)
	m.set_shader_parameter("tint2", tint.darkened(0.45))
	m.set_shader_parameter("alpha_cut", 0.45)
	_foliage_mats[key] = m
	return m


static func inner_mat(tint: Color) -> StandardMaterial3D:
	var key := tint.to_html()
	if _inner_mats.has(key):
		return _inner_mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = tint.darkened(0.55)
	m.roughness = 1.0
	_inner_mats[key] = m
	return m


static func bark_mat(birch := false) -> StandardMaterial3D:
	var key := "birch" if birch else "bark"
	if _bark_mats.has(key):
		return _bark_mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_texture = load("res://assets/textures/bark_birch.png" if birch else "res://assets/textures/bark.png")
	m.uv1_scale = Vector3(2, 2, 1)
	m.roughness = 0.95
	_bark_mats[key] = m
	return m


static func card_mesh() -> Mesh:
	if _card_mesh:
		return _card_mesh
	# Slightly bent quad (3x2 grid) so cards don't look perfectly flat.
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var cols := 3
	var rows := 2
	var verts := []
	for r in rows + 1:
		for c in cols + 1:
			var u := float(c) / cols
			var v := float(r) / rows
			var x := u - 0.5
			var y := 0.5 - v
			var z := -0.12 * (x * x * 4.0)
			verts.append([Vector3(x, y, z), Vector2(u, v)])
	for r in rows:
		for c in cols:
			var i0 := r * (cols + 1) + c
			var quad := [i0, i0 + 1, i0 + cols + 2, i0, i0 + cols + 2, i0 + cols + 1]
			for k in quad:
				st.set_uv(verts[k][1])
				st.set_normal(Vector3(0, 0.3, 1).normalized())
				st.add_vertex(verts[k][0])
	_card_mesh = st.commit()
	return _card_mesh


static func _mm_instance(parent: Node3D, mesh: Mesh, mat: Material, xforms: Array, heights: Array, colors: Array, shadows: bool, vis_end := 0.0) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.use_custom_data = true
	mm.mesh = mesh
	mm.instance_count = xforms.size()
	for i in xforms.size():
		mm.set_instance_transform(i, xforms[i])
		mm.set_instance_color(i, colors[i] if i < colors.size() else Color.WHITE)
		mm.set_instance_custom_data(i, Color(heights[i] if i < heights.size() else 1.0, 0, 0, 0))
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.material_override = mat
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadows and quality() >= 1 else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if vis_end > 0.0:
		mmi.visibility_range_end = vis_end
		mmi.visibility_range_end_margin = 4.0
		mmi.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
	parent.add_child(mmi)
	return mmi


static func _cyl_between(parent: Node3D, a: Vector3, b: Vector3, r0: float, r1: float, mat: Material) -> MeshInstance3D:
	var cm := CylinderMesh.new()
	var d := b - a
	cm.height = d.length()
	cm.bottom_radius = r0
	cm.top_radius = r1
	cm.radial_segments = 7
	cm.rings = 1
	var mi := MeshInstance3D.new()
	mi.mesh = cm
	mi.material_override = mat
	var up := d.normalized()
	var x := up.cross(Vector3.FORWARD if absf(up.dot(Vector3.FORWARD)) < 0.9 else Vector3.RIGHT).normalized()
	var z := x.cross(up).normalized()
	mi.transform = Transform3D(Basis(x, up, z), (a + b) * 0.5)
	parent.add_child(mi)
	return mi


## Fills spherical clusters with randomly oriented foliage cards.
static func _canopy(parent: Node3D, clusters: Array, tint: Color, rng: RandomNumberGenerator, card_size: float, per_cluster: int, height_ref: float, needles := false) -> void:
	var xf := []
	var hs := []
	var cs := []
	var n := int(per_cluster * [0.55, 0.8, 1.0][quality()])
	for c in clusters:
		var center: Vector3 = c[0]
		var radius: float = c[1]
		for k in n:
			var dir := Vector3(rng.randf_range(-1, 1), rng.randf_range(-0.7, 1), rng.randf_range(-1, 1)).normalized()
			var p := center + dir * radius * sqrt(rng.randf()) * 0.85
			var b := Basis.from_euler(Vector3(rng.randf_range(-1.2, 0.4), rng.randf() * TAU, rng.randf_range(-0.5, 0.5)))
			var s := card_size * rng.randf_range(0.75, 1.25)
			xf.append(Transform3D(b.scaled(Vector3(s, s, s)), p))
			hs.append(clampf(p.y / height_ref, 0.0, 1.0))
			cs.append(Color.WHITE)
		# Inner volume so the canopy never looks hollow.
		var sm := SphereMesh.new()
		sm.radius = radius * 0.5
		sm.height = radius * 1.0
		sm.radial_segments = 8
		sm.rings = 5
		var mi := MeshInstance3D.new()
		mi.mesh = sm
		mi.material_override = inner_mat(tint)
		mi.position = center
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if quality() >= 1 else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mi)
	_mm_instance(parent, card_mesh(), foliage_mat(tint, needles), xf, hs, cs, true, 70.0)


## species: oak | maple | birch | pine | cypress
static func tree(parent: Node3D, pos: Vector3, species: String, tint: Color, scale_f := 1.0, seed := 0) -> Node3D:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed if seed != 0 else hash(pos)
	var root := Node3D.new()
	root.position = pos
	root.scale = Vector3.ONE * scale_f
	root.rotation.y = rng.randf() * TAU
	parent.add_child(root)
	var birch := species == "birch"
	var bark := bark_mat(birch)
	match species:
		"pine", "cypress":
			var h := 6.5 if species == "pine" else 5.5
			_cyl_between(root, Vector3.ZERO, Vector3(0, h, 0), 0.24, 0.05, bark)
			var clusters := []
			var tiers := 6
			for i in tiers:
				var t := float(i) / tiers
				var y := 1.3 + t * (h - 1.0)
				var r := (1.6 if species == "pine" else 0.75) * (1.0 - t * 0.85) + 0.25
				var ring := 3 if species == "pine" else 1
				for k in ring:
					var a := k * TAU / ring + i
					clusters.append([Vector3(cos(a) * r * 0.45, y, sin(a) * r * 0.45), r * 0.75])
			_canopy(root, clusters, tint, rng, 1.0, 9, h + 1.0, true)
		_:
			var trunk_h := 2.4 if species != "birch" else 3.0
			var r0 := 0.26 if species != "birch" else 0.15
			var lean := Vector3(rng.randf_range(-0.2, 0.2), trunk_h, rng.randf_range(-0.2, 0.2))
			_cyl_between(root, Vector3.ZERO, lean, r0, r0 * 0.7, bark)
			# Root flare.
			_cyl_between(root, Vector3(0, -0.05, 0), Vector3(0, 0.45, 0), r0 * 1.6, r0, bark)
			var clusters := []
			var branches := 4 if species != "birch" else 5
			for i in branches:
				var a := i * TAU / branches + rng.randf_range(-0.3, 0.3)
				var spread := (1.5 if species == "oak" else 1.2) if species != "birch" else 0.7
				var tip := lean + Vector3(cos(a) * spread, rng.randf_range(0.9, 1.6) + (0.6 if species == "birch" else 0.0), sin(a) * spread)
				_cyl_between(root, lean * 0.8, tip, r0 * 0.5, r0 * 0.15, bark)
				clusters.append([tip + Vector3(0, 0.3, 0), (1.25 if species != "birch" else 0.8) * rng.randf_range(0.85, 1.15)])
			clusters.append([lean + Vector3(0, 1.9 if species != "birch" else 2.4, 0), 1.35 if species != "birch" else 0.9])
			_canopy(root, clusters, tint, rng, 1.25 if species != "birch" else 0.9, 14, trunk_h + 3.0)
	# Collision for the trunk only.
	var body := StaticBody3D.new()
	body.collision_layer = 1
	var cs := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = 0.3
	shape.height = 3.0
	cs.shape = shape
	cs.position.y = 1.5
	body.add_child(cs)
	root.add_child(body)
	return root


static func bush(parent: Node3D, pos: Vector3, tint: Color, size := 1.0, flowers_color := Color(0, 0, 0, 0)) -> Node3D:
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(pos)
	var root := Node3D.new()
	root.position = pos
	parent.add_child(root)
	var clusters := []
	for i in 3:
		clusters.append([Vector3((i - 1) * 0.38 * size, 0.42 * size, rng.randf_range(-0.15, 0.15) * size), 0.52 * size])
	_canopy(root, clusters, tint, rng, 0.7 * size, 10, 1.0 * size)
	if flowers_color.a > 0.0:
		for k in 8:
			var d := Vector3(rng.randf_range(-1, 1), rng.randf_range(0.2, 1), rng.randf_range(-1, 1)).normalized()
			var mi := MeshInstance3D.new()
			var sm := SphereMesh.new()
			sm.radius = 0.06 * size
			sm.height = 0.1 * size
			sm.radial_segments = 6
			sm.rings = 3
			mi.mesh = sm
			mi.material_override = ItemModels.mat(flowers_color, 0.0, 0.6)
			mi.position = Vector3(0, 0.45 * size, 0) + d * 0.6 * size
			root.add_child(mi)
	return root


static func hedge(parent: Node3D, rect: Rect2, height: float, tint: Color) -> Node3D:
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(rect)
	var root := Node3D.new()
	parent.add_child(root)
	var core := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(rect.size.x * 0.92, height * 0.92, rect.size.y * 0.92)
	core.mesh = bm
	core.material_override = inner_mat(tint)
	core.position = Vector3(rect.get_center().x, height * 0.46, rect.get_center().y)
	root.add_child(core)
	var area := rect.size.x * rect.size.y + (rect.size.x + rect.size.y) * 2.0 * height
	var n := int(area * 9.0 * [0.5, 0.8, 1.0][quality()])
	var xf := []
	var hs := []
	for i in n:
		var face := rng.randi() % 5
		var p := Vector3(rng.randf_range(rect.position.x, rect.end.x), rng.randf_range(0.1, height), rng.randf_range(rect.position.y, rect.end.y))
		match face:
			0:
				p.y = height
			1:
				p.x = rect.position.x
			2:
				p.x = rect.end.x
			3:
				p.z = rect.position.y
			4:
				p.z = rect.end.y
		var b := Basis.from_euler(Vector3(rng.randf_range(-1.2, 1.2), rng.randf() * TAU, rng.randf_range(-0.6, 0.6)))
		var s := rng.randf_range(0.45, 0.7)
		xf.append(Transform3D(b.scaled(Vector3(s, s, s)), p))
		hs.append(clampf(p.y / height, 0.0, 1.0) * 0.4)
	_mm_instance(root, card_mesh(), foliage_mat(tint), xf, hs, [], true, 60.0)
	# Collision.
	var body := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(rect.size.x, height, rect.size.y)
	cs.shape = shape
	cs.position = core.position
	body.add_child(cs)
	root.add_child(body)
	return root


static func grass_mesh() -> Mesh:
	if _grass_mesh:
		return _grass_mesh
	# Two crossed quads, UV.y = 0 at the tip.
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for k in 2:
		var a := k * PI / 2.0
		var dx := Vector3(cos(a), 0, sin(a)) * 0.22
		var quad := [[-dx, Vector2(0, 1)], [dx, Vector2(1, 1)], [dx + Vector3(0, 0.32, 0), Vector2(1, 0)],
			[-dx, Vector2(0, 1)], [dx + Vector3(0, 0.32, 0), Vector2(1, 0)], [-dx + Vector3(0, 0.32, 0), Vector2(0, 0)]]
		for q in quad:
			st.set_uv(q[1])
			st.set_normal(Vector3.UP)
			st.add_vertex(q[0])
	_grass_mesh = st.commit()
	return _grass_mesh


static func grass_material(base: Color, tip: Color) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/grass_blades.gdshader")
	m.set_shader_parameter("card", load("res://assets/textures/grass_card.png"))
	m.set_shader_parameter("base_color", base)
	m.set_shader_parameter("tip_color", tip)
	return m


## Instanced grass clumps in 6 m chunks (frustum culling + distance fade).
static func grass_field(parent: Node3D, rect: Rect2, per_m2: float, base: Color, tip: Color, avoid: Array = [], seed := 1) -> void:
	var dens: float = per_m2 * [0.0, 0.55, 1.0][quality()]
	if dens <= 0.0:
		return
	var rng := RandomNumberGenerator.new()
	rng.seed = seed
	var mat := grass_material(base, tip)
	var chunk := 6.0
	var cx := int(ceil(rect.size.x / chunk))
	var cz := int(ceil(rect.size.y / chunk))
	for ix in cx:
		for iz in cz:
			var r := Rect2(rect.position.x + ix * chunk, rect.position.y + iz * chunk, minf(chunk, rect.end.x - (rect.position.x + ix * chunk)), minf(chunk, rect.end.y - (rect.position.y + iz * chunk)))
			var n := int(r.get_area() * dens)
			var xf := []
			for i in n:
				var p := Vector3(rng.randf_range(r.position.x, r.end.x), 0.0, rng.randf_range(r.position.y, r.end.y))
				var ok := true
				for a in avoid:
					if (a as Rect2).has_point(Vector2(p.x, p.z)):
						ok = false
						break
				if not ok:
					continue
				var s := rng.randf_range(0.9, 1.6)
				xf.append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s, s * rng.randf_range(0.7, 1.2), s)), p))
			if xf.is_empty():
				continue
			var mmi := _mm_instance(parent, grass_mesh(), mat, xf, [], [], false, 32.0)
			mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
