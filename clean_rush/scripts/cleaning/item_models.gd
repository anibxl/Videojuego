class_name ItemModels
extends RefCounted
## Small procedural 3D models for hidden discoveries.

static var _mats: Dictionary = {}


static func mat(c: Color, metal := 0.0, rough := 0.5, emit := 0.0) -> StandardMaterial3D:
	var key := "%s_%s_%s_%s" % [c.to_html(), metal, rough, emit]
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.metallic = metal
	m.roughness = rough
	if emit > 0.0:
		m.emission_enabled = true
		m.emission = c
		m.emission_energy_multiplier = emit
	_mats[key] = m
	return m


static func part(parent: Node3D, mesh: Mesh, m: Material, p: Vector3, rot := Vector3.ZERO, s := Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = m
	mi.position = p
	mi.rotation = rot
	mi.scale = s
	parent.add_child(mi)
	return mi


static func sphere(r: float) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2
	s.radial_segments = 12
	s.rings = 6
	return s


static func cyl(r: float, h: float, top := -1.0) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.bottom_radius = r
	c.top_radius = r if top < 0 else top
	c.height = h
	c.radial_segments = 12
	c.rings = 1
	return c


static func box(s: Vector3) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = s
	return b


static func build(model: String) -> Node3D:
	var n := Node3D.new()
	var gold := mat(Color(1.0, 0.8, 0.2), 0.9, 0.25, 0.15)
	match model:
		"coin":
			part(n, cyl(0.12, 0.025), gold, Vector3(0, 0.15, 0), Vector3(PI / 2, 0, 0))
		"gnome":
			part(n, cyl(0.1, 0.18, 0.08), mat(Color(0.2, 0.45, 0.9)), Vector3(0, 0.09, 0))
			part(n, sphere(0.07), mat(Color(1.0, 0.8, 0.65)), Vector3(0, 0.23, 0))
			part(n, cyl(0.075, 0.18, 0.0), mat(Color(0.9, 0.15, 0.15)), Vector3(0, 0.36, 0))
			part(n, sphere(0.055), mat(Color(0.97, 0.97, 0.97)), Vector3(0, 0.19, 0.045), Vector3.ZERO, Vector3(1, 1.3, 0.7))
		"ball":
			part(n, sphere(0.16), mat(Color(0.97, 0.97, 0.97), 0.0, 0.4), Vector3(0, 0.16, 0))
			part(n, sphere(0.162), mat(Color(0.1, 0.1, 0.12)), Vector3(0, 0.16, 0), Vector3.ZERO, Vector3(0.45, 1, 0.45))
		"duck":
			part(n, sphere(0.13), mat(Color(1.0, 0.85, 0.1)), Vector3(0, 0.1, 0), Vector3.ZERO, Vector3(1.2, 0.8, 1))
			part(n, sphere(0.08), mat(Color(1.0, 0.85, 0.1)), Vector3(0.08, 0.22, 0))
			part(n, box(Vector3(0.07, 0.025, 0.05)), mat(Color(1.0, 0.45, 0.1)), Vector3(0.17, 0.21, 0))
		"ring":
			var t := TorusMesh.new()
			t.inner_radius = 0.07
			t.outer_radius = 0.1
			part(n, t, gold, Vector3(0, 0.12, 0), Vector3(PI / 2.5, 0, 0))
			part(n, sphere(0.035), mat(Color(0.6, 0.9, 1.0), 0.2, 0.05, 0.6), Vector3(0, 0.23, 0.02))
		"key":
			var t2 := TorusMesh.new()
			t2.inner_radius = 0.035
			t2.outer_radius = 0.06
			part(n, t2, gold, Vector3(-0.12, 0.05, 0))
			part(n, box(Vector3(0.22, 0.025, 0.03)), gold, Vector3(0.04, 0.05, 0))
			part(n, box(Vector3(0.03, 0.025, 0.06)), gold, Vector3(0.13, 0.05, 0.03))
		"boat":
			part(n, box(Vector3(0.36, 0.08, 0.14)), mat(Color(0.65, 0.4, 0.2)), Vector3(0, 0.05, 0))
			part(n, cyl(0.01, 0.3), mat(Color(0.5, 0.35, 0.2)), Vector3(0, 0.22, 0))
			part(n, box(Vector3(0.16, 0.2, 0.01)), mat(Color(0.97, 0.97, 0.95)), Vector3(0.06, 0.24, 0))
		"toy":
			part(n, box(Vector3(0.16, 0.18, 0.12)), mat(Color(0.75, 0.78, 0.82), 0.7, 0.3), Vector3(0, 0.15, 0))
			part(n, box(Vector3(0.12, 0.1, 0.1)), mat(Color(0.75, 0.78, 0.82), 0.7, 0.3), Vector3(0, 0.3, 0))
			part(n, sphere(0.02), mat(Color(1, 0.3, 0.2), 0, 0.3, 1.5), Vector3(0.03, 0.31, 0.05))
			part(n, sphere(0.02), mat(Color(1, 0.3, 0.2), 0, 0.3, 1.5), Vector3(-0.03, 0.31, 0.05))
			part(n, cyl(0.03, 0.08), mat(Color(0.3, 0.3, 0.35)), Vector3(0.05, 0.03, 0))
			part(n, cyl(0.03, 0.08), mat(Color(0.3, 0.3, 0.35)), Vector3(-0.05, 0.03, 0))
		"badge":
			part(n, cyl(0.16, 0.03), mat(Color(0.12, 0.78, 0.78), 0.4, 0.3, 0.2), Vector3(0, 0.18, 0), Vector3(PI / 2, 0, 0))
			part(n, cyl(0.11, 0.035), gold, Vector3(0, 0.18, 0.003), Vector3(PI / 2, 0, 0))
			part(n, box(Vector3(0.05, 0.12, 0.04)), mat(Color(1.0, 0.55, 0.15)), Vector3(0, 0.18, 0.02))
		"note":
			part(n, box(Vector3(0.25, 0.01, 0.3)), mat(Color(0.98, 0.93, 0.78)), Vector3(0, 0.02, 0), Vector3(0, 0.3, 0.08))
			part(n, box(Vector3(0.18, 0.012, 0.02)), mat(Color(0.3, 0.25, 0.6)), Vector3(0, 0.03, -0.05), Vector3(0, 0.3, 0.08))
			part(n, box(Vector3(0.14, 0.012, 0.02)), mat(Color(0.3, 0.25, 0.6)), Vector3(0, 0.03, 0.02), Vector3(0, 0.3, 0.08))
		"tree":
			part(n, cyl(0.0, 0.25, 0.0), mat(Color(0.2, 0.7, 0.3)), Vector3.ZERO)
			var cone := cyl(0.12, 0.25, 0.0)
			part(n, cone, mat(Color(0.2, 0.7, 0.3)), Vector3(0, 0.2, 0))
			part(n, cone, mat(Color(0.25, 0.8, 0.35)), Vector3(0, 0.32, 0), Vector3.ZERO, Vector3(0.75, 0.75, 0.75))
		"bird":
			var glass := mat(Color(0.3, 0.9, 0.8, 1.0), 0.3, 0.05, 0.4)
			part(n, sphere(0.08), glass, Vector3(0, 0.18, 0), Vector3.ZERO, Vector3(1.4, 0.9, 0.9))
			part(n, sphere(0.05), glass, Vector3(0.1, 0.24, 0))
			part(n, cyl(0.008, 0.12, 0.002), mat(Color(0.2, 0.2, 0.2)), Vector3(0.2, 0.24, 0), Vector3(0, 0, PI / 2))
			part(n, box(Vector3(0.05, 0.01, 0.2)), glass, Vector3(0, 0.22, 0), Vector3(0.3, 0, 0))
			part(n, cyl(0.06, 0.04), mat(Color(0.45, 0.35, 0.25)), Vector3(0, 0.02, 0))
		_:
			part(n, sphere(0.12), gold, Vector3(0, 0.12, 0))
	return n
