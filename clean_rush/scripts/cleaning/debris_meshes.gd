class_name DebrisMeshes
extends RefCounted
## Procedural low-poly meshes for debris pieces, cached and shared.

static var _cache: Dictionary = {}
static var _material: StandardMaterial3D


static func material() -> StandardMaterial3D:
	if _material == null:
		_material = StandardMaterial3D.new()
		_material.vertex_color_use_as_albedo = true
		_material.cull_mode = BaseMaterial3D.CULL_DISABLED
		_material.roughness = 0.75
	return _material


static func get_mesh(style: String) -> Mesh:
	if _cache.has(style):
		return _cache[style]
	var m: Mesh
	match style:
		"can":
			m = _can()
		"paper":
			m = _paper()
		"bag":
			m = _bag()
		"twig":
			m = _twig()
		"bottle":
			m = _bottle()
		_:
			m = _leaf()
	_cache[style] = m
	return m


static func _leaf() -> Mesh:
	# Realistic leaf card (textured from the atlas): 4x4 grid, gently curled
	# edges and a raised mid-rib so leaves catch the light naturally.
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := 4
	var size := 0.3
	var pts := []
	for r in n + 1:
		for c in n + 1:
			var u := float(c) / n
			var v := float(r) / n
			var x := (u - 0.5) * size
			var z := (v - 0.5) * size
			var e := absf(u - 0.5) * 2.0
			var y: float = 0.012 * e * e + 0.006 * (1.0 - e) - 0.004 * (v - 0.5)
			pts.append([Vector3(x, y, z), Vector2(u, v)])
	for r in n:
		for c in n:
			var i0 := r * (n + 1) + c
			for k in [i0, i0 + 1, i0 + n + 2, i0, i0 + n + 2, i0 + n + 1]:
				st.set_uv(pts[k][1])
				st.set_color(Color.WHITE)
				st.add_vertex(pts[k][0])
	st.generate_normals()
	return st.commit()


static var _leaf_mat: ShaderMaterial
static func leaf_material() -> ShaderMaterial:
	if _leaf_mat == null:
		_leaf_mat = ShaderMaterial.new()
		_leaf_mat.shader = load("res://shaders/leaf.gdshader")
		_leaf_mat.set_shader_parameter("atlas", load("res://assets/textures/leaves_atlas.png"))
	return _leaf_mat


static func _from_primitives(parts: Array) -> Mesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for p in parts:
		var prim: PrimitiveMesh = p[0]
		var xf: Transform3D = p[1]
		var col: Color = p[2]
		var arrays := prim.get_mesh_arrays()
		var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
		var normals: PackedVector3Array = arrays[Mesh.ARRAY_NORMAL]
		var idx: PackedInt32Array = arrays[Mesh.ARRAY_INDEX]
		for k in idx:
			st.set_color(col)
			st.set_normal((xf.basis * normals[k]).normalized())
			st.add_vertex(xf * verts[k])
	return st.commit()


static func _can() -> Mesh:
	var c := CylinderMesh.new()
	c.top_radius = 0.035
	c.bottom_radius = 0.035
	c.height = 0.12
	c.radial_segments = 8
	c.rings = 1
	var band := CylinderMesh.new()
	band.top_radius = 0.036
	band.bottom_radius = 0.036
	band.height = 0.04
	band.radial_segments = 8
	band.rings = 1
	var rot := Basis(Vector3(0, 0, 1), PI / 2)
	return _from_primitives([
		[c, Transform3D(rot, Vector3(0, 0.035, 0)), Color(1, 1, 1)],
		[band, Transform3D(rot, Vector3(0, 0.035, 0)), Color(0.95, 0.95, 0.95)],
	])


static func _paper() -> Mesh:
	var s := SphereMesh.new()
	s.radius = 0.06
	s.height = 0.1
	s.radial_segments = 6
	s.rings = 3
	return _from_primitives([[s, Transform3D(Basis().scaled(Vector3(1.1, 0.8, 0.9)), Vector3(0, 0.04, 0)), Color(1, 1, 1)]])


static func _bag() -> Mesh:
	var s := SphereMesh.new()
	s.radius = 0.15
	s.height = 0.26
	s.radial_segments = 7
	s.rings = 4
	var k := SphereMesh.new()
	k.radius = 0.04
	k.height = 0.08
	k.radial_segments = 5
	k.rings = 2
	return _from_primitives([
		[s, Transform3D(Basis(), Vector3(0, 0.12, 0)), Color(1, 1, 1)],
		[k, Transform3D(Basis(), Vector3(0, 0.26, 0)), Color(0.8, 0.8, 0.8)],
	])


static func _bottle() -> Mesh:
	var c := CylinderMesh.new()
	c.top_radius = 0.02
	c.bottom_radius = 0.04
	c.height = 0.2
	c.radial_segments = 7
	c.rings = 1
	return _from_primitives([[c, Transform3D(Basis(Vector3(0, 0, 1), PI / 2), Vector3(0, 0.04, 0)), Color(1, 1, 1)]])


static func _twig() -> Mesh:
	var b := BoxMesh.new()
	b.size = Vector3(0.025, 0.025, 0.3)
	var b2 := BoxMesh.new()
	b2.size = Vector3(0.018, 0.018, 0.12)
	return _from_primitives([
		[b, Transform3D(Basis(), Vector3(0, 0.015, 0)), Color(1, 1, 1)],
		[b2, Transform3D(Basis(Vector3.UP, 0.6), Vector3(0.03, 0.015, 0.06)), Color(1, 1, 1)],
	])
