extends MapBase
## MAP 6 — Abandoned Greenhouse: a Victorian glasshouse overgrown with moss,
## leaves and rubbish. Restoring it makes the plants bloom and the fountain clear.

const GH := Rect2(-8, -6, 16, 12)
const BASE_H := 0.4
const GLASS_H := 2.6


func build() -> void:
	setup_environment(Color(0.35, 0.6, 0.9), Color(0.95, 0.9, 0.8), Color(0.45, 0.5, 0.35), Vector3(0.5, -1.0, -0.3), Color(1.0, 0.93, 0.8), 1.15)
	boundary_walls(Rect2(-9.5, -7.5, 19, 17.5))
	ground_plane(Rect2(-40, -40, 80, 80), ground_material(Color(0.42, 0.66, 0.26), Color(0.32, 0.54, 0.2), Color(0.55, 0.72, 0.32), 0.3, true))
	var frame := mat(Color(0.12, 0.35, 0.28), 0.5, 0.4)
	var brick := mat(Color(0.7, 0.4, 0.3), 0.9)
	# Interior soil floor.
	box(Vector3(0, 0.02, 0), Vector3(GH.size.x, 0.04, GH.size.y), mat(Color(0.38, 0.28, 0.18), 1.0), false)
	# Low brick base + glass panels on every side (door gap on the south).
	var glass_look := {"a": Color(0.7, 0.88, 0.9), "b": Color(0.6, 0.8, 0.85), "alpha": 0.18}
	var glass_layers := ["moss", "smudge"]
	var sides := [
		[Vector3(0, 0, GH.position.y), 16.0, 0.0, 4],    # north wall, faces +Z (inward)
		[Vector3(GH.position.x, 0, 0), 12.0, 90.0, 3],   # west wall, faces +X
		[Vector3(GH.end.x, 0, 0), 12.0, 270.0, 3],       # east wall, faces -X
	]
	for sd in sides:
		var c: Vector3 = sd[0]
		var length: float = sd[1]
		var facing: float = sd[2]
		var n: int = sd[3]
		var along := Vector3(1, 0, 0) if facing == 0.0 else Vector3(0, 0, 1)
		var thick := Vector3(length, 0, 0.25) if facing == 0.0 else Vector3(0.25, 0, length)
		box(c + Vector3(0, BASE_H / 2, 0), thick + Vector3(0, BASE_H, 0), brick)
		blocker(c + Vector3(0, 2.0, 0), thick + Vector3(0, 4.0, 0))
		var pw := length / n
		for i in n:
			var pc := c + along * (-length / 2 + pw * (i + 0.5)) + Vector3(0, BASE_H + GLASS_H / 2, 0)
			var normal := Basis(Vector3.UP, deg_to_rad(facing)) * Vector3(0, 0, 1)
			wall_surface("Glass panel", "glass", pc + normal * 0.02, pw - 0.1, GLASS_H - 0.1, facing, glass_layers, glass_look, {"glass": true, "coverage": 0.9})
		for i in n + 1:
			var post := c + along * (-length / 2 + pw * i) + Vector3(0, BASE_H + GLASS_H / 2, 0)
			box(post, Vector3(0.1, GLASS_H, 0.1), frame, false)
		box(c + Vector3(0, BASE_H + GLASS_H, 0), Vector3(length, 0.1, 0.1) if facing == 0.0 else Vector3(0.1, 0.1, length), frame, false)
	# South wall in two halves around the door.
	for half in [-1, 1]:
		var cx: float = half * 4.5
		var c2 := Vector3(cx, 0, GH.end.y)
		box(c2 + Vector3(0, BASE_H / 2, 0), Vector3(7, BASE_H, 0.25), brick)
		blocker(c2 + Vector3(0, 2.0, 0), Vector3(7, 4.0, 0.25))
		for i in 2:
			var pc2 := c2 + Vector3(-1.75 + i * 3.5, BASE_H + GLASS_H / 2, -0.02)
			wall_surface("Glass panel", "glass", pc2, 3.4, GLASS_H - 0.1, 180, glass_layers, glass_look, {"glass": true, "coverage": 0.9})
		for i in 3:
			box(c2 + Vector3(-3.5 + i * 3.5, BASE_H + GLASS_H / 2, 0), Vector3(0.1, GLASS_H, 0.1), frame, false)
	box(Vector3(0, BASE_H + GLASS_H, GH.end.y), Vector3(2, 0.2, 0.15), frame, false)
	# Pitched glass roof (decorative, transparent) with ridge beams.
	var roof_glass := mat(Color(0.75, 0.9, 0.95, 0.15), 0.05)
	for s in [-1, 1]:
		box(Vector3(0, BASE_H + GLASS_H + 1.0, s * 3.0), Vector3(16, 0.04, 6.6), roof_glass, false, Vector3(s * -18.0, 0, 0))
	box(Vector3(0, BASE_H + GLASS_H + 2.0, 0), Vector3(16.2, 0.15, 0.15), frame, false)
	for i in 5:
		var x := -8.0 + i * 4.0
		for s in [-1, 1]:
			box(Vector3(x, BASE_H + GLASS_H + 1.0, s * 3.0), Vector3(0.08, 0.08, 6.4), frame, false, Vector3(s * -18.0, 0, 0))
	# Central stone path.
	var stone := {"a": Color(0.82, 0.8, 0.74), "b": Color(0.68, 0.66, 0.6), "pattern": 3, "roughness": 0.85}
	box(Vector3(0, 0.04, 1.0), Vector3(2.2, 0.04, 14), mat(Color(0.75, 0.73, 0.68)), false)
	var path_tiles := []
	for i in 7:
		path_tiles.append(floor_surface("Path", "path", Rect2(-1.1, -6 + i * 2.0, 2.2, 2.0), 0.06, ["moss"], stone, {"coverage": 0.85}))
	floor_surface("Doorstep", "path", Rect2(-1.1, 8.0, 2.2, 0.8), 0.06, ["mud"], stone, {"coverage": 0.9})
	# Raised planters with plants that bloom on restoration.
	var planter_idx := surfaces.size()
	planter(Vector3(-4.8, 0.04, -3.5), Vector3(4.5, 0.7, 1.4), "planters", ["moss"], Color(0.72, 0.45, 0.32), Color(0.25, 0.6, 0.25), 0.4)
	planter(Vector3(4.8, 0.04, -3.5), Vector3(4.5, 0.7, 1.4), "planters", ["moss"], Color(0.72, 0.45, 0.32), Color(0.3, 0.65, 0.28), 0.55)
	planter(Vector3(-4.8, 0.04, 1.5), Vector3(4.5, 0.7, 1.4), "planters", ["grime"], Color(0.72, 0.45, 0.32), Color(0.28, 0.62, 0.3), 0.7)
	planter(Vector3(4.8, 0.04, 1.5), Vector3(4.5, 0.7, 1.4), "planters", ["grime"], Color(0.72, 0.45, 0.32), Color(0.25, 0.58, 0.25), 0.85)
	# Wilted plants: visible from the start (dead brown shrubs).
	for p in [Vector3(-6.8, 0, 4.6), Vector3(6.8, 0, 4.6), Vector3(-6.8, 0, -5.2), Vector3(6.8, 0, -5.2)]:
		bush(p, Color(0.45, 0.38, 0.2), 0.7)
	# Furniture.
	park_bench(Vector3(-3.0, 0.04, 4.6), 90, "furniture", ["grime", "moss"], Color(0.7, 0.55, 0.35), Color(0.15, 0.3, 0.25))
	table_set(Vector3(4.2, 0.04, 4.4), 90, "furniture", Color(0.82, 0.82, 0.8), ["grime"], "Potting table")
	# Fountain at the far end.
	cyl(Vector3(0, 0.3, -4.6), 1.1, 0.5, mat(Color(0.85, 0.83, 0.78), 0.8), true, -1, 16)
	cyl(Vector3(0, 0.9, -4.6), 0.15, 1.2, mat(Color(0.85, 0.83, 0.78), 0.8), false, -1, 10)
	cyl(Vector3(0, 1.5, -4.6), 0.45, 0.12, mat(Color(0.85, 0.83, 0.78), 0.8), false, -1, 14)
	var wm := ShaderMaterial.new()
	wm.shader = load("res://shaders/water.gdshader")
	water_material = wm
	var disc := CylinderMesh.new()
	disc.top_radius = 1.0
	disc.bottom_radius = 1.0
	disc.height = 0.02
	disc.radial_segments = 20
	_mesh_node(disc, wm, Vector3(0, 0.5, -4.6))
	# Outside: front garden with hedges.
	for i in 4:
		bush(Vector3(-8 + i * 1.6, 0, 8.6), Color(0.25, 0.5, 0.22), 0.7)
		bush(Vector3(3.2 + i * 1.6, 0, 8.6), Color(0.25, 0.5, 0.22), 0.7)
	tree(Vector3(-12, 0, 2), [Color(0.95, 0.55, 0.15), Color(0.85, 0.3, 0.1)], 1.2)
	tree(Vector3(12, 0, -1), [Color(0.3, 0.6, 0.25), Color(0.4, 0.68, 0.3)], 1.1)
	var bin_rect := add_bin(Vector3(3.0, 0.04, 7.2), "compost")
	var outside_bin := bin_rect
	# Leaves (inside + doorway) and rubbish.
	var zones := {"path": [Rect2(-1.1, -6, 2.2, 14.8)], "beds": [Rect2(-7.8, -5.8, 6.6, 11.6), Rect2(1.2, -5.8, 6.6, 11.6)]}
	var obstacles := [Rect2(-7.05, -4.2, 4.5, 1.4), Rect2(2.55, -4.2, 4.5, 1.4), Rect2(-7.05, 0.8, 4.5, 1.4), Rect2(2.55, 0.8, 4.5, 1.4), Rect2(-1.1, -5.7, 2.2, 2.2)]
	var leaves := debris({"tag": "leaves", "kind": "leaf", "count": 650, "y": 0.06,
		"spawn": [{"rect": Rect2(-7.8, -5.8, 15.6, 11.6), "weight": 1.0}, {"rect": Rect2(-1.1, -6, 2.2, 14.8), "weight": 1.5}],
		"bounds": Rect2(-7.85, -5.85, 15.7, 15.0), "zones": zones, "obstacles": obstacles, "drop_zones": [outside_bin],
		"colors": [Color(0.75, 0.45, 0.15), Color(0.6, 0.35, 0.12), Color(0.85, 0.6, 0.2), Color(0.5, 0.4, 0.15)], "seed": 61})
	for spec in [["twig", 40, [Color(0.75, 0.38, 0.22), Color(0.55, 0.35, 0.2)]], ["bag", 10, [Color(0.15, 0.15, 0.17)]],
			["bottle", 18, [Color(0.3, 0.7, 0.4), Color(0.6, 0.8, 0.85)]], ["paper", 30, [Color(0.9, 0.88, 0.8)]]]:
		debris({"tag": "trash", "kind": "trash", "mesh": spec[0], "count": spec[1], "y": 0.06,
			"spawn": [Rect2(-7.8, -5.8, 15.6, 11.6)], "bounds": Rect2(-7.85, -5.85, 15.7, 15.0),
			"obstacles": obstacles, "drop_zones": [outside_bin], "colors": spec[2], "seed": 62 + int(spec[1]), "weight": 0.25})
	# Discoveries.
	discovery(0, Vector3(-6.5, 0.05, -1.2), null, leaves)
	var pt: CleanSurface = path_tiles[3]
	discovery(1, pt.position + Vector3(0.3, 0.0, 0.2), pt)
	var ps: CleanSurface = surfaces[planter_idx]
	discovery(2, ps.position + Vector3(0.8, -0.1, 0.03), ps)
	# Restoration blooms: hanging baskets and flowering beds.
	add_bloom(flowers(Rect2(-7.8, 3.0, 2.5, 2.5), 50, [Color(1, 0.4, 0.6), Color(1, 0.9, 0.3)], 0.04), 0.6)
	add_bloom(flowers(Rect2(5.3, -1.0, 2.5, 3.0), 50, [Color(0.8, 0.5, 1.0), Color(1, 1, 1)], 0.04), 0.75)
	add_bloom(flowers(Rect2(-9.0, 8.0, 18, 1.2), 90, [Color(1, 0.35, 0.5), Color(1, 0.85, 0.2), Color(0.6, 0.8, 1)], 0.0), 0.9)
	for x in [-4.0, 0.0, 4.0]:
		var basket := Node3D.new()
		basket.position = Vector3(x, 3.2, 0)
		add_child(basket)
		sphere(Vector3.ZERO, 0.35, mat(Color(0.3, 0.62, 0.28), 0.9), Vector3(1, 0.8, 1), 8, basket)
		sphere(Vector3(0.18, -0.15, 0.1), 0.13, mat(Color(1, 0.4, 0.6)), Vector3.ONE, 6, basket)
		sphere(Vector3(-0.15, -0.2, -0.1), 0.13, mat(Color(1, 0.9, 0.3)), Vector3.ONE, 6, basket)
		add_bloom(basket, 0.5 + x * 0.04 + 0.2)


func _water_clarity() -> float:
	return clampf(overall() * 1.15 - 0.05, 0.0, 1.0)
