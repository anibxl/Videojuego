extends MapBase
## MAP 1 — Autumn Garden: lawn, path, patio, flower beds and furniture buried
## under fallen leaves.

const LEAF_COLORS := [Color(0.95, 0.45, 0.08), Color(0.98, 0.72, 0.12), Color(0.82, 0.22, 0.08), Color(0.7, 0.4, 0.12), Color(0.9, 0.58, 0.1)]


func build() -> void:
	setup_environment(Color(0.35, 0.6, 0.92), Color(0.95, 0.85, 0.7), Color(0.4, 0.5, 0.3), Vector3(-0.5, -1.0, -0.35), Color(1.0, 0.9, 0.75), 1.15)
	var area := Rect2(-14, -14, 28, 28)
	boundary_walls(Rect2(-13.5, -11.5, 27, 25))
	# Ground: lawn everywhere, then hardscape on top.
	ground_plane(Rect2(-30, -30, 60, 60), ground_material(Color(0.42, 0.66, 0.24), Color(0.3, 0.52, 0.17), Color(0.55, 0.72, 0.3), 0.3, true))
	var stone := {"a": Color(0.8, 0.76, 0.68), "b": Color(0.66, 0.61, 0.54), "pattern": 3, "roughness": 0.85}
	# Patio (decorative, debris covers it) and path.
	box(Vector3(0, 0.02, -9), Vector3(12, 0.04, 6), mat(Color(0.8, 0.76, 0.68)), false)
	floor_grid("Patio", "patio_stone", Rect2(-6, -12, 12, 6), 0.04, 3, 2, ["litter"], stone, {"coverage": 0.45})
	box(Vector3(0, 0.015, 3.5), Vector3(2.4, 0.03, 19), mat(Color(0.8, 0.76, 0.68)), false)
	for i in 10:
		floor_surface("", "path_stone", Rect2(-1.2, -6 + i * 1.9, 2.4, 1.9), 0.03, ["litter"], stone, {"coverage": 0.35})
	# House
	house_facade(Vector3(0, 0, -12.2), 20, 4.5, Color(0.97, 0.93, 0.85), Color(0.72, 0.28, 0.2))
	# Flower beds (with soil and flowers) on both sides.
	var soil := mat(Color(0.35, 0.24, 0.15), 1.0)
	for side in [-1, 1]:
		var bx: float = side * 11.0
		box(Vector3(bx, 0.06, 3), Vector3(3.2, 0.12, 13), soil, false)
		for e in [-1, 1]:
			box(Vector3(bx + e * 1.65, 0.12, 3), Vector3(0.12, 0.24, 13.2), mat(Color(0.6, 0.55, 0.5)), false)
		flowers(Rect2(bx - 1.4, -3.3, 2.8, 12.6), 140, [Color(1, 0.3, 0.45), Color(1, 0.85, 0.2), Color(0.85, 0.5, 1.0), Color(1, 1, 1)], 0.1)
		bush(Vector3(bx, 0, -2.5), Color(0.25, 0.5, 0.2), 0.9)
		bush(Vector3(bx, 0, 8.5), Color(0.3, 0.55, 0.22), 0.8)
	# Hedges, fence and gate at the front.
	hedge(Rect2(-14, -11, 0.9, 24), 1.4, Color(0.22, 0.45, 0.2))
	hedge(Rect2(13.1, -11, 0.9, 24), 1.4, Color(0.22, 0.45, 0.2))
	fence(Vector3(-13, 0, 13.2), Vector3(-1.6, 0, 13.2), Color(0.95, 0.95, 0.92))
	fence(Vector3(1.6, 0, 13.2), Vector3(13, 0, 13.2), Color(0.95, 0.95, 0.92))
	# Autumn trees (the leaf culprits).
	tree(Vector3(-7, 0, 1), [Color(0.95, 0.5, 0.1), Color(0.85, 0.3, 0.1), Color(1.0, 0.7, 0.2)], 1.1)
	tree(Vector3(7.5, 0, -2), [Color(0.95, 0.75, 0.15), Color(0.9, 0.55, 0.12)], 1.0)
	tree(Vector3(-6, 0, 10), [Color(0.8, 0.25, 0.1), Color(0.95, 0.5, 0.15)], 0.9)
	tree(Vector3(6.5, 0, 8.5), [Color(0.98, 0.65, 0.2), Color(0.85, 0.4, 0.1)], 1.05)
	# Patio furniture.
	table_set(Vector3(-2.5, 0.04, -9.2), 0, "furniture", Color(0.72, 0.5, 0.3), ["litter"], "Garden table")
	parasol(Vector3(-2.5, 0.04, -9.2), Color(0.1, 0.75, 0.75))
	park_bench(Vector3(3.8, 0.04, -10.6), 180, "furniture", ["litter", "dust"], Color(0.95, 0.95, 0.92), Color(0.2, 0.3, 0.4))
	pot(Vector3(5.5, 0.04, -7), Color(0.8, 0.4, 0.25), Color(0.3, 0.6, 0.25))
	pot(Vector3(-5.5, 0.04, -7), Color(0.8, 0.4, 0.25), Color(0.3, 0.6, 0.25))
	lamp_post(Vector3(1.8, 0, 11))
	grass_tufts(Rect2(-13, -6, 26, 19), 900, Color(0.35, 0.6, 0.22), [Rect2(-1.3, -6, 2.6, 20)])
	# Compost bin in the corner (leaf drop-off).
	var bin_rect := add_bin(Vector3(10.8, 0, 11.3), "compost")
	# Leaf tarp in the other corner: blow or rake leaves onto it.
	box(Vector3(-11.0, 0.01, 11.2), Vector3(3.0, 0.02, 2.6), mat(Color(0.15, 0.55, 0.35), 0.7), false)
	var tarp := Rect2(-12.5, 9.9, 3.0, 2.6)
	bins.append(tarp)
	# Leaves!
	var lawn := [Rect2(-12.5, -5.8, 25, 18.6)]
	var zones := {
		"path": [Rect2(-1.25, -6, 2.5, 19)],
		"patio": [Rect2(-6, -12, 12, 6)],
		"beds": [Rect2(-12.6, -3.5, 3.2, 13), Rect2(9.4, -3.5, 3.2, 13)],
		"lawn": [Rect2(-11.4, -5.8, 22.8, 17.8)],
	}
	var leaves := debris({
		"tag": "leaves", "kind": "leaf", "mesh": "leaf", "count": 1100, "y": 0.03,
		"spawn": [{"rect": Rect2(-12.5, -5.8, 25, 18.6), "weight": 1.0}, {"rect": Rect2(-6, -12, 12, 6), "weight": 1.3},
			{"rect": Rect2(-1.25, -6, 2.5, 19), "weight": 1.5}],
		"bounds": Rect2(-13.3, -11.8, 26.6, 24.8), "zones": zones,
		"obstacles": [Rect2(-11, -14.5, 22, 2.4)],
		# Leaves blown into the hedges / under the front fence are tucked away.
		"drop_zones": [bin_rect, tarp, Rect2(-14.5, -11, 1.4, 24), Rect2(13.1, -11, 1.4, 24), Rect2(-13.5, 12.75, 27, 1.0)],
		"colors": LEAF_COLORS, "seed": 11,
	})
	# Discoveries.
	discovery(0, Vector3(-11.2, 0.12, 5.5), null, leaves)
	discovery(1, Vector3(4.5, 0.02, 4.0), null, leaves)
	discovery(2, Vector3(2.8, 0.05, -8.0), null, leaves)
	var _a := area
