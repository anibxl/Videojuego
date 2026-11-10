extends MapBase
## MAP 4 — City Cleanup: a small high street with shops, graffiti, grimy
## pavements, benches, a bus stop and plenty of litter.


func build() -> void:
	setup_environment(Color(0.35, 0.58, 0.9), Color(0.92, 0.88, 0.85), Color(0.4, 0.4, 0.42), Vector3(-0.3, -1.0, 0.5), Color(1.0, 0.94, 0.85), 1.15, 0.65)
	boundary_walls(Rect2(-15, -7.7, 30, 13.4))
	ground_plane(Rect2(-40, -40, 80, 80), ground_material(Color(0.3, 0.31, 0.33), Color(0.24, 0.25, 0.27), Color(0.36, 0.37, 0.39), 0.8))
	var concrete := {"a": Color(0.74, 0.74, 0.72), "b": Color(0.62, 0.62, 0.6), "pattern": 1, "roughness": 0.85, "scale": 0.6}
	var brick_cols := [[Color(0.75, 0.38, 0.28), Color(0.62, 0.3, 0.22)], [Color(0.95, 0.88, 0.72), Color(0.85, 0.76, 0.6)],
		[Color(0.55, 0.7, 0.8), Color(0.45, 0.6, 0.7)], [Color(0.9, 0.6, 0.45), Color(0.78, 0.5, 0.38)]]
	# Sidewalks (raised curbs) + road markings.
	var curb := mat(Color(0.75, 0.75, 0.73))
	box(Vector3(0, 0.075, -6.25), Vector3(40, 0.15, 3.5), curb)
	box(Vector3(0, 0.075, 4.25), Vector3(40, 0.15, 3.5), curb)
	floor_grid("Sidewalk", "sidewalk", Rect2(-15, -8, 30, 3.5), 0.15, 6, 1, ["grime"], concrete, {"coverage": 0.9})
	floor_grid("Sidewalk", "sidewalk", Rect2(-15, 2.5, 30, 3.5), 0.15, 6, 1, ["grime"], concrete, {"coverage": 0.9})
	var white := mat(Color(0.95, 0.95, 0.92), 0.6)
	for i in 10:
		box(Vector3(-14 + i * 3.2, 0.005, -1.0), Vector3(1.6, 0.01, 0.15), white, false)
	for i in 6:
		box(Vector3(6, 0.006, -3.9 + i * 1.15), Vector3(2.5, 0.01, 0.55), white, false)
	# Building row (north).
	var graffiti_surfs := []
	for b in 4:
		var cx := -11.25 + b * 7.5
		var cols: Array = brick_cols[b]
		var h := 7.0 + (b % 2) * 2.0
		box(Vector3(cx, h / 2, -10.5), Vector3(7.5, h, 5), mat(cols[0], 0.9))
		var brick := {"a": cols[0], "b": cols[1], "pattern": 4, "roughness": 0.9}
		var left_g := b % 2 == 0
		var s1 := wall_surface("Wall", "graffiti" if left_g else "walls", Vector3(cx - 2.5, 1.65, -8.0), 2.5, 3.0, 0, ["graffiti"] if left_g else ["grime"], brick, {"coverage": 0.85})
		var s2 := wall_surface("Wall", "walls" if left_g else "graffiti", Vector3(cx + 2.5, 1.65, -8.0), 2.5, 3.0, 0, ["grime"] if left_g else ["graffiti"], brick, {"coverage": 0.85})
		graffiti_surfs.append(s1 if left_g else s2)
		# Shop window + door + awning.
		var glass_look := {"a": Color(0.55, 0.75, 0.85), "b": Color(0.5, 0.7, 0.8), "alpha": 0.35}
		box(Vector3(cx, 1.65, -8.05), Vector3(2.5, 3.0, 0.1), mat(Color(0.2, 0.22, 0.25), 0.4, 0.5), false)
		wall_surface("Shop window", "walls", Vector3(cx, 1.9, -8.0), 2.2, 1.6, 0, ["smudge"], glass_look, {"glass": true, "coverage": 0.9})
		box(Vector3(cx, 3.35, -7.5), Vector3(3.0, 0.1, 1.2), mat([Color("1fc8c8"), Color("ff8c2a"), Color("5bd66b"), Color("1550b8")][b], 0.7), false, Vector3(15, 0, 0))
		# Upper windows.
		for fy in range(1, int(h / 3)):
			for wx in [-2.2, 0.0, 2.2]:
				box(Vector3(cx + wx, 1.6 + fy * 2.8, -7.98), Vector3(1.1, 1.4, 0.06), mat(Color(0.5, 0.7, 0.85), 0.15, 0.3), false)
				box(Vector3(cx + wx, 0.85 + fy * 2.8, -7.9), Vector3(1.3, 0.1, 0.2), white, false)
	# South side: low park wall with graffiti + trees behind.
	box(Vector3(0, 0.8, 6.3), Vector3(32, 1.6, 0.6), mat(Color(0.8, 0.76, 0.7), 0.9))
	var wall_look := {"a": Color(0.85, 0.8, 0.72), "b": Color(0.74, 0.69, 0.6), "pattern": 4, "roughness": 0.9}
	graffiti_surfs.append(wall_surface("Park wall", "graffiti", Vector3(-8, 0.95, 6.0), 5, 1.3, 180, ["graffiti"], wall_look, {"coverage": 0.85}))
	graffiti_surfs.append(wall_surface("Park wall", "graffiti", Vector3(9, 0.95, 6.0), 5, 1.3, 180, ["graffiti"], wall_look, {"coverage": 0.85}))
	wall_surface("Park wall", "walls", Vector3(0.5, 0.95, 6.0), 6, 1.3, 180, ["grime"], wall_look, {"coverage": 0.8})
	for i in 6:
		tree(Vector3(-13 + i * 5.2, 0, 9.0), [Color(0.3, 0.6, 0.25), Color(0.38, 0.68, 0.3)], 1.0)
	# Benches, bus stop, lamps, bins, bollards, planters.
	park_bench(Vector3(-11, 0.15, 4.6), 180, "benches", ["grime"])
	park_bench(Vector3(-2.5, 0.15, 4.6), 180, "benches", ["grime"])
	park_bench(Vector3(12, 0.15, -6.0), 0, "benches", ["grime"])
	var shelter := mat(Color(0.2, 0.25, 0.3), 0.4, 0.6)
	box(Vector3(4.0, 1.4, 5.3), Vector3(0.1, 2.5, 0.1), shelter, true)
	box(Vector3(7.0, 1.4, 5.3), Vector3(0.1, 2.5, 0.1), shelter, true)
	box(Vector3(5.5, 2.7, 4.8), Vector3(3.4, 0.1, 1.6), shelter, false)
	wall_surface("Bus shelter glass", "benches", Vector3(5.5, 1.4, 5.35), 2.9, 1.9, 180, ["smudge"], {"a": Color(0.6, 0.8, 0.9), "b": Color(0.55, 0.75, 0.85), "alpha": 0.25}, {"glass": true, "coverage": 0.9})
	box(Vector3(5.5, 0.6, 5.0), Vector3(2.4, 0.08, 0.5), mat(Color("ff8c2a"), 0.6), true)
	for x in [-13.0, -5.0, 3.0, 11.0]:
		lamp_post(Vector3(x, 0.15, -4.9))
		lamp_post(Vector3(x + 2, 0.15, 2.9))
	for x in [-1.5, 0.0, 1.5]:
		cyl(Vector3(x + 8.5, 0.55, -4.8), 0.1, 0.8, mat(Color(0.2, 0.2, 0.22), 0.4, 0.6), true)
	pot(Vector3(-7.0, 0.15, -5.0), Color(0.4, 0.42, 0.45), Color(0.3, 0.6, 0.28), 1.3)
	pot(Vector3(0.5, 0.15, -5.0), Color(0.4, 0.42, 0.45), Color(0.3, 0.6, 0.28), 1.3)
	# Parked car.
	box(Vector3(-6.5, 0.6, 1.5), Vector3(3.8, 0.8, 1.7), mat(Color(0.85, 0.2, 0.2), 0.3, 0.4))
	box(Vector3(-6.7, 1.25, 1.5), Vector3(2.0, 0.55, 1.5), mat(Color(0.5, 0.7, 0.85), 0.1, 0.3), false)
	for wx in [-7.7, -5.3]:
		for wz in [0.7, 2.3]:
			var wheel := cyl(Vector3(wx, 0.32, wz), 0.32, 0.25, mat(Color(0.1, 0.1, 0.1)), false)
			wheel.rotation_degrees.x = 90
	var bins_r := [add_bin(Vector3(-9.0, 0.15, -5.2), "street"), add_bin(Vector3(2.5, 0.15, 3.5), "street"),
		add_bin(Vector3(10.0, 0.15, 3.5), "street"), add_bin(Vector3(-13.5, 0.15, 3.5), "street")]
	# Litter.
	var area := [Rect2(-14.8, -7.8, 29.6, 3.3), Rect2(-14.8, 2.5, 29.6, 3.3), Rect2(-14.8, -4.5, 29.6, 7)]
	var bounds := Rect2(-15, -7.9, 30, 13.8)
	var obstacles := [Rect2(-8.5, 0.6, 4.0, 1.8)]
	var trash_specs := [["paper", 70, [Color(0.95, 0.95, 0.92), Color(0.85, 0.85, 0.75), Color(0.9, 0.8, 0.6)]],
		["can", 45, [Color(0.85, 0.15, 0.15), Color(0.2, 0.5, 0.9), Color(0.2, 0.75, 0.3), Color(0.85, 0.85, 0.88)]],
		["bottle", 25, [Color(0.3, 0.7, 0.4, 1), Color(0.5, 0.35, 0.2), Color(0.7, 0.85, 0.9)]],
		["bag", 14, [Color(0.12, 0.12, 0.14), Color(0.2, 0.25, 0.3)]]]
	var first_field: DebrisField = null
	var seed_i := 40
	for spec in trash_specs:
		seed_i += 1
		var f := debris({"tag": "trash", "kind": "trash", "mesh": spec[0], "count": spec[1], "y": 0.15,
			"spawn": [{"rect": area[0], "weight": 1.2}, {"rect": area[1], "weight": 1.2}, {"rect": area[2], "weight": 0.5}],
			"bounds": bounds, "obstacles": obstacles, "drop_zones": bins_r, "colors": spec[2], "seed": seed_i,
			"scale": Vector2(1.7, 2.3), "weight": 0.25,
			"points": [Vector3(-3.6, 0, 1.6), Vector3(-3.4, 0, 1.9), Vector3(-3.8, 0, 1.8)] if spec[0] == "paper" else []})
		if first_field == null:
			first_field = f
	debris({"tag": "leaves", "kind": "leaf", "count": 80, "y": 0.16, "spawn": [area[1]], "bounds": bounds,
		"zones": {"sidewalk": [area[0], area[1]]}, "drop_zones": bins_r, "seed": 49,
		"colors": [Color(0.75, 0.55, 0.2), Color(0.6, 0.45, 0.15)]})
	# Discoveries.
	var gs: CleanSurface = graffiti_surfs[0]
	discovery(0, gs.position + Vector3(0.3, -0.4, 0.02), gs)
	discovery(1, Vector3(9.5, 0.02, 2.2), null, first_field)
	discovery(2, Vector3(-3.6, 0.02, 1.75), null, first_field)
	# Restoration: hanging flower baskets appear on the lamps when the street shines.
	for x in [-13.0, -5.0, 3.0, 11.0]:
		var basket := Node3D.new()
		basket.position = Vector3(x, 2.6, -4.9)
		add_child(basket)
		sphere(Vector3.ZERO, 0.32, mat(Color(0.3, 0.6, 0.25), 0.9), Vector3(1, 0.8, 1), 8, basket)
		sphere(Vector3(0.15, 0.15, 0.1), 0.12, mat(Color(1, 0.35, 0.55)), Vector3.ONE, 6, basket)
		sphere(Vector3(-0.15, 0.12, -0.1), 0.12, mat(Color(1, 0.85, 0.2)), Vector3.ONE, 6, basket)
		add_bloom(basket, 0.75)
