extends MapBase
## MAP 2 — Power Wash Patio: a grand two-level stone terrace with stairs,
## retaining walls, low garden walls and furniture caked in mud and moss.


func build() -> void:
	setup_environment(Color(0.3, 0.55, 0.95), Color(0.85, 0.92, 1.0), Color(0.45, 0.5, 0.4), Vector3(0.6, -1.0, -0.5), Color(1.0, 0.97, 0.9), 1.2)
	boundary_walls(Rect2(-8.6, -11.0, 17.2, 18.2))
	ground_plane(Rect2(-30, -30, 60, 60), ground_material(Color(0.4, 0.62, 0.25), Color(0.3, 0.5, 0.18), Color(0.5, 0.68, 0.3), 0.3))
	var pavers := {"a": Color(0.72, 0.67, 0.58), "b": Color(0.58, 0.53, 0.45), "pattern": 3, "roughness": 0.8, "scale": 1.0}
	var granite := {"a": Color(0.78, 0.78, 0.8), "b": Color(0.66, 0.66, 0.7), "pattern": 1, "roughness": 0.7, "scale": 1.0}
	var wall_look := {"a": Color(0.88, 0.8, 0.68), "b": Color(0.74, 0.66, 0.55), "pattern": 4, "roughness": 0.85, "scale": 1.0}
	# Lower terrace base + dirty floor tiles.
	box(Vector3(0, 0.05, 0.5), Vector3(16.4, 0.1, 11.8), mat(Color(0.8, 0.76, 0.7)))
	floor_grid("Patio tile", "floor", Rect2(-8, -5.2, 16, 11.2), 0.1, 4, 3, ["mud"], pavers, {"coverage": 0.95})
	# Upper terrace.
	box(Vector3(0, 0.6, -9.6), Vector3(16.4, 1.2, 5.2), mat(Color(0.82, 0.78, 0.7)))
	floor_grid("Upper terrace", "upper", Rect2(-8, -12, 16, 4.8), 1.2, 3, 1, ["grime"], granite, {"coverage": 0.8})
	house_facade(Vector3(0, 1.2, -12.1), 18, 4.0, Color(0.95, 0.92, 0.86), Color(0.25, 0.32, 0.45))
	# Retaining wall faces (mossy) on both sides of the stairs.
	var rw_l := wall_surface("Left retaining wall", "moss", Vector3(-5.0, 0.6, -7.2), 6.0, 1.2, 0, ["moss"], wall_look, {"coverage": 0.9})
	wall_surface("Right retaining wall", "moss", Vector3(5.0, 0.6, -7.2), 6.0, 1.2, 0, ["moss"], wall_look, {"coverage": 0.9})
	# Stairs: visual steps + invisible ramp for smooth walking.
	var step_m := mat(Color(0.85, 0.83, 0.8), 0.7)
	for i in 4:
		var h := 0.3 * (i + 1)
		var z := -5.4 - 0.4 * i - 0.2
		box(Vector3(0, 0.1 + h / 2, z), Vector3(4, h, 0.4), step_m, false)
		floor_surface("Step %d" % (i + 1), "stairs", Rect2(-2, z - 0.2, 4, 0.4), 0.1 + h, ["mud"], granite, {"coverage": 1.0})
		wall_surface("", "stairs", Vector3(0, 0.1 + h - 0.15, z + 0.2), 4, 0.3, 0, ["mud"], granite, {"coverage": 1.0})
	var ramp := Node3D.new()
	ramp.position = Vector3(0, 0.7, -6.2)
	ramp.rotation.x = atan2(1.2, 1.6)
	add_child(ramp)
	var rs := BoxShape3D.new()
	rs.size = Vector3(4, 0.1, 2.1)
	_add_collider(ramp, rs)
	# Low garden walls on the sides.
	for side in [-1, 1]:
		var x: float = side * 8.3
		box(Vector3(x, 0.45, 0.5), Vector3(0.5, 0.9, 11.8), mat(Color(0.86, 0.8, 0.7), 0.9))
		wall_surface("Garden wall", "moss", Vector3(x - side * 0.25, 0.45, 0.5), 11.8, 0.9, 270.0 if side > 0 else 90.0, ["moss"], wall_look, {"coverage": 0.7})
		box(Vector3(x, 0.93, 0.5), Vector3(0.6, 0.06, 12), mat(Color(0.95, 0.92, 0.86)), false)
	# Front edge planting.
	for i in 7:
		bush(Vector3(-7.5 + i * 2.5, 0, 7.8), Color(0.25, 0.5, 0.22).lightened((i % 2) * 0.06), 0.8)
	tree(Vector3(-11, 0, -2), [Color(0.3, 0.6, 0.25), Color(0.25, 0.5, 0.2)], 1.2)
	tree(Vector3(11, 0, 1), [Color(0.35, 0.65, 0.28), Color(0.28, 0.55, 0.22)], 1.1)
	tree(Vector3(-10, 1.2, -10), [Color(0.3, 0.6, 0.25)], 0.9, "pine")
	# Furniture.
	table_set(Vector3(-4.5, 0.1, 1.5), 15, "furniture", Color(0.6, 0.62, 0.66), ["grime"], "Patio table")
	parasol(Vector3(-4.5, 0.1, 1.5), Color(1.0, 0.55, 0.15))
	park_bench(Vector3(4.8, 0.1, 3.8), -90, "furniture", ["grime"], Color(0.55, 0.38, 0.22))
	planter(Vector3(5.5, 0.1, -3.4), Vector3(2.0, 0.6, 0.8), "furniture", ["grime"], Color(0.82, 0.74, 0.62), Color(0.3, 0.6, 0.25), 0.7)
	planter(Vector3(-5.5, 0.1, -3.4), Vector3(2.0, 0.6, 0.8), "furniture", ["grime"], Color(0.82, 0.74, 0.62), Color(0.3, 0.6, 0.25), 0.7)
	pot(Vector3(-3, 1.2, -8.5), Color(0.25, 0.5, 0.75), Color(0.3, 0.6, 0.25))
	pot(Vector3(3, 1.2, -8.5), Color(0.25, 0.5, 0.75), Color(0.3, 0.6, 0.25))
	lamp_post(Vector3(-2.6, 0.1, -5.0))
	lamp_post(Vector3(2.6, 0.1, -5.0))
	# A few loose leaves for the blower crowd.
	debris({"tag": "leaves", "kind": "leaf", "count": 120, "y": 0.11, "spawn": [Rect2(-7.8, -5, 15.6, 10.8)],
		"bounds": Rect2(-8, -5.2, 16, 11.4), "zones": {"floor": [Rect2(-8, -5.2, 16, 11.4)]},
		"colors": [Color(0.55, 0.45, 0.2), Color(0.45, 0.38, 0.18), Color(0.65, 0.5, 0.2)], "seed": 21,
		"drop_zones": []})
	add_bin(Vector3(7.2, 0.1, 6.0), "wheelie", 180)
	# Discoveries.
	discovery(0, Vector3(-4.2, 0.6, -7.18), rw_l)
	var key_tile: CleanSurface = surfaces[5]
	discovery(1, key_tile.position + Vector3(0.6, 0.0, 0.3), key_tile)
	var upper: CleanSurface = surfaces[13]
	discovery(2, upper.position + Vector3(1.0, 0.0, 0.5), upper)
	# Restoration bloom: flowers in the front bed once the terrace shines.
	add_bloom(flowers(Rect2(-8, 7.2, 16, 1.2), 90, [Color(1, 0.35, 0.5), Color(1, 0.9, 0.3), Color(1, 1, 1)], 0.0), 0.8)
