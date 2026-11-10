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
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	# Outline of a maple-ish leaf in XZ, center raised slightly for curl.
	var outline := [
		Vector3(0, 0, -0.13), Vector3(0.035, 0.01, -0.07), Vector3(0.085, 0.015, -0.075), Vector3(0.06, 0.01, -0.02),
		Vector3(0.1, 0.02, 0.02), Vector3(0.04, 0.008, 0.04), Vector3(0.012, 0.0, 0.09),
		Vector3(-0.012, 0.0, 0.09), Vector3(-0.04, 0.008, 0.04), Vector3(-0.1, 0.02, 0.02), Vector3(-0.06, 0.01, -0.02),
		Vector3(-0.085, 0.015, -0.075), Vector3(-0.035, 0.01, -0.07),
	]
	var center := Vector3(0, 0.018, -0.01)
	st.set_normal(Vector3.UP)
	for k in outline.size():
		var a: Vector3 = outline[k]
		var b: Vector3 = outline[(k + 1) % outline.size()]
		st.set_color(Color(1, 1, 1))
		st.add_vertex(center)
		st.set_color(Color(0.85, 0.85, 0.85))
		st.add_vertex(a)
		st.add_vertex(b)
	# Stem.
	st.set_color(Color(0.6, 0.5, 0.4))
	st.add_vertex(Vector3(-0.006, 0.004, 0.09))
	st.add_vertex(Vector3(0.006, 0.004, 0.09))
	st.add_vertex(Vector3(0.0, 0.004, 0.15))
	st.generate_normals()
	return st.commit()


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
