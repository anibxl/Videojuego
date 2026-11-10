extends MapBase
## MAP 3 — Pool Rescue: a swampy backyard pool. Skim floating leaves, vacuum
## silt and algae, scrub the tiles and coping until the water turns crystal clear.

const POOL := Rect2(-5, -2.5, 10, 5)
const DEPTH := 1.6


func build() -> void:
	setup_environment(Color(0.2, 0.55, 0.98), Color(0.8, 0.95, 1.0), Color(0.5, 0.55, 0.45), Vector3(0.4, -1.0, 0.6), Color(1.0, 0.96, 0.88), 1.25)
	boundary_walls(Rect2(-10.5, -8.5, 21, 17))
	# Ground with a hole for the pool.
	var gm := ground_material(Color(0.42, 0.66, 0.26), Color(0.32, 0.54, 0.2), Color(0.55, 0.72, 0.32), 0.3)
	ground_plane(Rect2(-40, -40, 80, 37), gm)
	ground_plane(Rect2(-40, 3, 80, 37), gm)
	ground_plane(Rect2(-40, -3, 34.5, 6), gm)
	ground_plane(Rect2(5.5, -3, 34.5, 6), gm)
	var wood := {"a": Color(0.78, 0.6, 0.42), "b": Color(0.62, 0.45, 0.3), "pattern": 2, "roughness": 0.7}
	var coping := {"a": Color(0.95, 0.93, 0.88), "b": Color(0.85, 0.83, 0.78), "pattern": 1, "roughness": 0.6}
	var plaster := {"a": Color(0.75, 0.92, 0.97), "b": Color(0.62, 0.85, 0.93), "pattern": 0, "roughness": 0.5}
	var tiles := {"a": Color(0.1, 0.62, 0.8), "b": Color(0.05, 0.45, 0.68), "pattern": 1, "roughness": 0.3, "scale": 2.0}
	# Deck slabs around the pool hole (top at y = 0.05).
	var deck_m := mat(Color(0.7, 0.55, 0.4))
	var deck_rects := [Rect2(-10, -8, 20, 5), Rect2(-10, 3, 20, 5), Rect2(-10, -3, 4.5, 6), Rect2(5.5, -3, 4.5, 6)]
	for r in deck_rects:
		var rr: Rect2 = r
		box(Vector3(rr.get_center().x, 0.0, rr.get_center().y), Vector3(rr.size.x, 0.1, rr.size.y), deck_m)
	floor_grid("Deck", "deck", Rect2(-10, -8, 20, 5), 0.05, 4, 1, ["dust"], wood, {"coverage": 0.8})
	floor_grid("Deck", "deck", Rect2(-10, 3, 20, 5), 0.05, 4, 1, ["dust"], wood, {"coverage": 0.8})
	floor_surface("Deck", "deck", Rect2(-10, -3, 4.5, 6), 0.05, ["dust"], wood, {"coverage": 0.8})
	floor_surface("Deck", "deck", Rect2(5.5, -3, 4.5, 6), 0.05, ["dust"], wood, {"coverage": 0.8})
	# Coping ring.
	var cm := mat(Color(0.92, 0.9, 0.85))
	var cop := [Rect2(-5.5, -3, 11, 0.5), Rect2(-5.5, 2.5, 11, 0.5), Rect2(-5.5, -2.5, 0.5, 5), Rect2(5, -2.5, 0.5, 5)]
	var names := ["North edge", "South edge", "West edge", "East edge"]
	for i in cop.size():
		var r2: Rect2 = cop[i]
		box(Vector3(r2.get_center().x, 0.04, r2.get_center().y), Vector3(r2.size.x, 0.12, r2.size.y), cm)
		floor_surface(names[i], "edges", r2, 0.1, ["grime", "algae"] if i % 2 == 0 else ["grime"], coping, {"coverage": 0.9})
	# Pool shell.
	var shell := mat(Color(0.6, 0.8, 0.85))
	box(Vector3(0, -DEPTH - 0.1, 0), Vector3(11, 0.2, 6), shell)
	box(Vector3(0, -DEPTH / 2, POOL.position.y - 0.25), Vector3(11, DEPTH, 0.5), shell)
	box(Vector3(0, -DEPTH / 2, POOL.end.y + 0.25), Vector3(11, DEPTH, 0.5), shell)
	box(Vector3(POOL.position.x - 0.25, -DEPTH / 2, 0), Vector3(0.5, DEPTH, 6), shell)
	box(Vector3(POOL.end.x + 0.25, -DEPTH / 2, 0), Vector3(0.5, DEPTH, 6), shell)
	var floor_s := floor_surface("Pool floor", "pool", Rect2(-5, -2.5, 5, 5), -DEPTH, ["algae", "silt"], plaster, {"coverage": 1.0})
	floor_surface("Pool floor", "pool", Rect2(0, -2.5, 5, 5), -DEPTH, ["silt", "algae"], plaster, {"coverage": 1.0})
	var wall_h := DEPTH - 0.4
	var wall_cy := -DEPTH + wall_h / 2
	wall_surface("Pool wall", "pool", Vector3(0, wall_cy, POOL.position.y), 10, wall_h, 0, ["algae"], plaster, {"coverage": 0.85})
	wall_surface("Pool wall", "pool", Vector3(0, wall_cy, POOL.end.y), 10, wall_h, 180, ["algae"], plaster, {"coverage": 0.85})
	wall_surface("Pool wall", "pool", Vector3(POOL.position.x, wall_cy, 0), 5, wall_h, 90, ["algae"], plaster, {"coverage": 0.85})
	wall_surface("Pool wall", "pool", Vector3(POOL.end.x, wall_cy, 0), 5, wall_h, 270, ["algae"], plaster, {"coverage": 0.85})
	var tile_cy := -0.2
	wall_surface("Waterline tiles", "tiles", Vector3(0, tile_cy, POOL.position.y), 10, 0.4, 0, ["algae"], tiles, {"coverage": 1.0})
	wall_surface("Waterline tiles", "tiles", Vector3(0, tile_cy, POOL.end.y), 10, 0.4, 180, ["algae"], tiles, {"coverage": 1.0})
	wall_surface("Waterline tiles", "tiles", Vector3(POOL.position.x, tile_cy, 0), 5, 0.4, 90, ["algae"], tiles, {"coverage": 1.0})
	wall_surface("Waterline tiles", "tiles", Vector3(POOL.end.x, tile_cy, 0), 5, 0.4, 270, ["algae"], tiles, {"coverage": 1.0})
	# Water.
	var wm := ShaderMaterial.new()
	wm.shader = load("res://shaders/water.gdshader")
	water_material = wm
	var plane := PlaneMesh.new()
	plane.size = POOL.size
	plane.subdivide_width = 20
	plane.subdivide_depth = 10
	var water := _mesh_node(plane, wm, Vector3(0, -0.15, 0))
	water.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# Player can't walk into the pool.
	blocker(Vector3(0, 0.6, 0), Vector3(POOL.size.x, 1.2, POOL.size.y))
	# Ladder + diving board.
	var chrome := mat(Color(0.85, 0.87, 0.9), 0.15, 0.9)
	for dz in [-0.25, 0.25]:
		cyl(Vector3(4.75, -0.4, 1.4 + dz), 0.03, 1.4, chrome, false)
	box(Vector3(-5.9, 0.35, 0), Vector3(0.6, 0.6, 0.6), mat(Color(0.2, 0.55, 0.8)))
	box(Vector3(-5.0, 0.68, 0), Vector3(2.4, 0.08, 0.5), mat(Color(0.97, 0.97, 0.97), 0.4), false)
	# Loungers, umbrella, palms, shed, fence.
	for i in 3:
		var lx := -3.0 + i * 3.0
		var root := Node3D.new()
		root.position = Vector3(lx, 0.05, -5.8)
		add_child(root)
		box(Vector3(0, 0.3, 0), Vector3(0.8, 0.12, 2.0), mat(Color(0.97, 0.97, 0.97), 0.5), true, Vector3.ZERO, root)
		box(Vector3(0, 0.55, -0.85), Vector3(0.8, 0.5, 0.12), mat(Color(0.97, 0.97, 0.97), 0.5), false, Vector3(-30, 0, 0), root)
		var cushion := CleanSurface.new()
		cushion.setup({"name": "Lounger", "group": "furniture", "size": Vector2(0.7, 1.6), "layers": ["grime"],
			"look": {"a": Color("1fc8c8"), "b": Color("17a6a6"), "pattern": 8, "roughness": 0.9}, "seed": 300 + i})
		cushion.position = Vector3(0, 0.37, 0.15)
		root.add_child(cushion)
		surfaces.append(cushion)
	parasol(Vector3(4.5, 0.05, -6.0), Color(1.0, 0.55, 0.15))
	tree(Vector3(-8.5, 0, -6.5), [Color(0.2, 0.6, 0.25), Color(0.3, 0.7, 0.3)], 1.0, "palm")
	tree(Vector3(8.5, 0, 6.5), [Color(0.2, 0.6, 0.25), Color(0.3, 0.7, 0.3)], 1.1, "palm")
	tree(Vector3(-8.8, 0, 6.0), [Color(0.95, 0.6, 0.15), Color(0.85, 0.35, 0.1)], 0.9)
	box(Vector3(8.0, 1.2, -6.2), Vector3(3, 2.4, 2.6), mat(Color(0.95, 0.95, 0.92)))
	box(Vector3(8.0, 2.5, -6.2), Vector3(3.3, 0.2, 2.9), mat(Color(0.12, 0.45, 0.7)), false)
	box(Vector3(6.48, 1.0, -6.2), Vector3(0.05, 2.0, 1.0), mat(Color(0.12, 0.45, 0.7)), false)
	for i in 5:
		bush(Vector3(-9.0 + i * 4.5, 0, 8.6), Color(0.25, 0.5, 0.22), 0.9)
	fence(Vector3(-10.3, 0, -8.3), Vector3(10.3, 0, -8.3), Color(0.95, 0.95, 0.95), 1.2)
	pot(Vector3(-6.5, 0.05, 3.6), Color(0.9, 0.5, 0.3), Color(0.3, 0.65, 0.3))
	pot(Vector3(6.5, 0.05, 3.6), Color(0.9, 0.5, 0.3), Color(0.3, 0.65, 0.3))
	var bin_rect := add_bin(Vector3(-8.5, 0.05, -2.0), "wheelie", 90)
	# Floating leaves + deck leaves.
	var floating := debris({"tag": "floating", "kind": "floating", "count": 170, "y": -0.07,
		"spawn": [Rect2(-4.7, -2.2, 9.4, 4.4)], "bounds": Rect2(-4.8, -2.3, 9.6, 4.6),
		"colors": [Color(0.95, 0.55, 0.12), Color(0.85, 0.35, 0.1), Color(0.95, 0.75, 0.2), Color(0.75, 0.5, 0.15)], "seed": 31,
		"scale": Vector2(1.7, 2.5)})
	var deck_zone := {"deck": [Rect2(-10, -8, 20, 5), Rect2(-10, 3, 20, 5), Rect2(-10, -3, 4.5, 6), Rect2(5.5, -3, 4.5, 6)]}
	var leaves := debris({"tag": "leaves", "kind": "leaf", "count": 140, "y": 0.06,
		"spawn": deck_zone["deck"], "bounds": Rect2(-10.3, -8.2, 20.6, 16.4), "zones": deck_zone,
		"obstacles": [Rect2(-5.5, -3, 11, 6), Rect2(6.5, -7.5, 3, 2.6)], "drop_zones": [bin_rect],
		"colors": [Color(0.95, 0.6, 0.15), Color(0.85, 0.35, 0.1), Color(0.7, 0.55, 0.2)], "seed": 32})
	# Discoveries.
	discovery(0, Vector3(4.3, -0.1, 1.9), null, floating)
	discovery(1, Vector3(-4.4, -DEPTH + 0.02, -1.9), floor_s)
	discovery(2, Vector3(-7.5, 0.06, 5.5), null, leaves)
	# Restoration: flowers along the fence when the pool is sparkling.
	add_bloom(flowers(Rect2(-9.5, -7.9, 19, 0.8), 80, [Color(1, 0.4, 0.6), Color(1, 0.9, 0.3), Color(0.6, 0.85, 1)], 0.0), 0.85)
