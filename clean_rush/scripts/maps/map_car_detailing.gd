extends MapBase
## MAP 5 — Car Detailing: a classic convertible in an open-air wash bay.
## Mud -> polish on the body, foam residue, smudged glass, dirty wheels and a
## dusty interior.

const PAINT_A := Color(0.05, 0.42, 0.85)
const PAINT_B := Color(0.03, 0.32, 0.7)


func build() -> void:
	setup_environment(Color(0.3, 0.55, 0.95), Color(0.9, 0.92, 0.95), Color(0.45, 0.45, 0.45), Vector3(-0.4, -1.0, -0.6), Color(1.0, 0.97, 0.92), 1.2, 0.7)
	boundary_walls(Rect2(-8.5, -6.5, 17, 13))
	ground_plane(Rect2(-40, -40, 80, 80), ground_material(Color(0.45, 0.66, 0.3), Color(0.35, 0.56, 0.22), Color(0.55, 0.72, 0.35), 0.3))
	var bay := {"a": Color(0.7, 0.72, 0.75), "b": Color(0.6, 0.62, 0.65), "pattern": 1, "roughness": 0.6, "scale": 0.5}
	box(Vector3(0, 0.025, 0), Vector3(18, 0.05, 14), mat(Color(0.72, 0.74, 0.76), 0.7))
	floor_grid("Wash bay floor", "floor", Rect2(-6, -4.5, 12, 9), 0.05, 3, 2, ["mud"], bay, {"coverage": 0.6})
	# Drain grate and yellow bay lines.
	box(Vector3(0, 0.07, 3.6), Vector3(5, 0.02, 0.3), mat(Color(0.2, 0.2, 0.22), 0.4, 0.7), false)
	var yellow := mat(Color(1.0, 0.8, 0.1), 0.6)
	for x in [-6.1, 6.1]:
		box(Vector3(x, 0.06, 0), Vector3(0.15, 0.02, 9), yellow, false)
	# Back wall with shelves, tools and a canopy.
	box(Vector3(0, 2.0, -6.8), Vector3(18, 4.0, 0.4), mat(Color(0.95, 0.95, 0.95), 0.8))
	box(Vector3(0, 3.0, -6.55), Vector3(16, 0.6, 0.1), mat(Color("1550b8"), 0.6), false)
	box(Vector3(0, 3.0, -6.49), Vector3(6, 0.35, 0.05), mat(Color(0.97, 0.97, 0.97)), false)
	for sx in [-5.5, 5.5]:
		for sy in [1.0, 1.8]:
			box(Vector3(sx, sy, -6.35), Vector3(3, 0.06, 0.5), mat(Color(0.5, 0.35, 0.2)), false)
			for k in 4:
				box(Vector3(sx - 1.1 + k * 0.7, sy + 0.18, -6.35), Vector3(0.25, 0.3, 0.25), mat([Color("1fc8c8"), Color("ff8c2a"), Color("5bd66b"), Color(0.95, 0.95, 0.95)][k]), false)
	for x in [-8.0, 8.0]:
		cyl(Vector3(x, 2.5, -5.0), 0.12, 5.0, mat(Color(0.3, 0.32, 0.35), 0.4, 0.6), true)
	box(Vector3(0, 5.05, -5.8), Vector3(17, 0.15, 2.4), mat(Color("1fc8c8"), 0.6), false)
	# Equipment props: pressure washer cart and hose reel.
	box(Vector3(-7.0, 0.5, -3.5), Vector3(0.8, 0.8, 0.6), mat(Color(0.95, 0.75, 0.1)), true)
	cyl(Vector3(-7.0, 0.15, -3.2), 0.15, 0.1, mat(Color(0.1, 0.1, 0.1)), false).rotation_degrees.z = 90
	var reel := cyl(Vector3(7.2, 0.7, -3.0), 0.5, 0.25, mat(Color(0.15, 0.55, 0.3)), true)
	reel.rotation_degrees.x = 90
	tree(Vector3(-11, 0, 4), [Color(0.3, 0.6, 0.25), Color(0.25, 0.5, 0.2)], 1.1)
	tree(Vector3(11, 0, 3), [Color(0.35, 0.65, 0.3), Color(0.28, 0.55, 0.22)], 1.0)
	for i in 4:
		bush(Vector3(-7.5 + i * 5, 0, 7.3), Color(0.25, 0.5, 0.22), 0.8)
	_build_car()
	add_bin(Vector3(7.0, 0.05, 3.5), "wheelie", -90)
	# A few leaves blew into the bay.
	debris({"tag": "leaves", "kind": "leaf", "count": 60, "y": 0.06, "spawn": [Rect2(-6, -4.5, 12, 9)],
		"bounds": Rect2(-8, -6.2, 16, 12.4), "zones": {"bay": [Rect2(-6, -4.5, 12, 9)]}, "obstacles": [Rect2(-2.3, -1.05, 4.6, 2.1)],
		"colors": [Color(0.9, 0.55, 0.15), Color(0.75, 0.35, 0.1)], "seed": 51})


func _build_car() -> void:
	var car := Node3D.new()
	car.name = "Car"
	add_child(car)
	var paint_look := {"a": PAINT_A, "b": PAINT_B, "pattern": 6, "roughness": 0.12, "metallic": 0.35}
	var paint := mat(PAINT_A, 0.25, 0.3)
	var dark := mat(Color(0.1, 0.1, 0.12), 0.5)
	var chrome := mat(Color(0.9, 0.9, 0.92), 0.1, 1.0)
	var y0 := 0.05
	# Body pieces (visual only; one blocker keeps the player out).
	box(Vector3(0, y0 + 0.42, 0), Vector3(4.4, 0.15, 1.9), paint, false, Vector3.ZERO, car)          # floor pan
	box(Vector3(1.5, y0 + 0.72, 0), Vector3(1.4, 0.6, 1.9), paint, false, Vector3.ZERO, car)          # hood block
	box(Vector3(-1.7, y0 + 0.72, 0), Vector3(1.0, 0.6, 1.9), paint, false, Vector3.ZERO, car)         # trunk block
	for side in [-1, 1]:
		box(Vector3(-0.2, y0 + 0.72, side * 0.9), Vector3(2.0, 0.6, 0.1), paint, false, Vector3.ZERO, car)
	blocker(Vector3(0, 0.8, 0), Vector3(4.6, 1.6, 2.2))
	# Bumpers / grille / lights.
	box(Vector3(2.27, y0 + 0.45, 0), Vector3(0.14, 0.18, 2.0), chrome, false, Vector3.ZERO, car)
	box(Vector3(-2.27, y0 + 0.45, 0), Vector3(0.14, 0.18, 2.0), chrome, false, Vector3.ZERO, car)
	for side in [-0.65, 0.65]:
		sphere(Vector3(2.2, y0 + 0.8, side), 0.13, emissive(Color(1.0, 0.97, 0.85), 1.2), Vector3(0.5, 1, 1), 8, car)
		box(Vector3(-2.2, y0 + 0.8, side), Vector3(0.05, 0.12, 0.3), emissive(Color(0.95, 0.1, 0.1), 1.5), false, Vector3.ZERO, car)
	# Windshield frame.
	box(Vector3(0.75, y0 + 1.25, 0), Vector3(0.06, 0.06, 1.8), chrome, false, Vector3(0, 0, -30), car)
	# Wheels.
	for wx in [-1.4, 1.4]:
		for wz in [-0.92, 0.92]:
			var w := cyl(Vector3(wx, y0 + 0.36, wz), 0.36, 0.28, dark, false, -1, 16, car)
			w.rotation_degrees.x = 90
	# Interior (convertible = open cabin).
	var fabric := {"a": Color(0.85, 0.75, 0.6), "b": Color(0.75, 0.65, 0.5), "pattern": 8, "roughness": 0.9}
	var seat_m := mat(Color(0.82, 0.72, 0.58), 0.9)
	box(Vector3(-0.1, y0 + 0.62, -0.42), Vector3(0.6, 0.25, 0.6), seat_m, false, Vector3.ZERO, car)
	box(Vector3(-0.1, y0 + 0.62, 0.42), Vector3(0.6, 0.25, 0.6), seat_m, false, Vector3.ZERO, car)
	box(Vector3(-0.45, y0 + 0.95, -0.42), Vector3(0.12, 0.6, 0.6), seat_m, false, Vector3(0, 0, 10), car)
	box(Vector3(-0.45, y0 + 0.95, 0.42), Vector3(0.12, 0.6, 0.6), seat_m, false, Vector3(0, 0, 10), car)
	box(Vector3(0.65, y0 + 0.88, 0), Vector3(0.2, 0.25, 1.7), dark, false, Vector3.ZERO, car)
	var wheel_m := mat(Color(0.1, 0.1, 0.1), 0.4)
	var sw := cyl(Vector3(0.45, y0 + 1.0, -0.42), 0.17, 0.03, wheel_m, false, -1, 14, car)
	sw.rotation_degrees.z = 60
	# ---- Cleanable surfaces ----
	var hood := floor_surface("Hood", "body", Rect2(0.8, -0.95, 1.4, 1.9), y0 + 1.02, ["mud", "dull"], paint_look, {"coverage": 0.95})
	floor_surface("Trunk", "body", Rect2(-2.2, -0.95, 1.0, 1.9), y0 + 1.02, ["mud", "dull"], paint_look, {"coverage": 0.95})
	for side in [-1, 1]:
		var facing := 0.0 if side > 0 else 180.0
		wall_surface("Front panel", "body", Vector3(1.1, y0 + 0.72, side * 0.95), 2.2, 0.6, facing, ["mud", "dull"], paint_look, {"coverage": 1.0})
		wall_surface("Rear panel", "body", Vector3(-1.1, y0 + 0.72, side * 0.95), 2.2, 0.6, facing, ["mud", "dull"], paint_look, {"coverage": 1.0})
		wall_surface("Side skirt", "foam", Vector3(0, y0 + 0.36, side * 0.95), 2.2, 0.12, facing, ["foam"], paint_look, {"coverage": 1.0})
	wall_surface("Front bumper", "foam", Vector3(2.2, y0 + 0.66, 0), 1.9, 0.5, 90, ["foam"], paint_look, {"coverage": 1.0})
	wall_surface("Rear bumper", "foam", Vector3(-2.2, y0 + 0.66, 0), 1.9, 0.5, 270, ["foam"], paint_look, {"coverage": 1.0})
	# Windshield (glass, sloped).
	var ws_basis := Basis(Vector3.UP, PI / 2) * Basis(Vector3.RIGHT, deg_to_rad(60))
	surface("Windshield", "windows", Vector3(0.95, y0 + 1.25, 0), ws_basis, Vector2(1.8, 0.55), ["smudge"],
		{"a": Color(0.6, 0.8, 0.9), "b": Color(0.55, 0.75, 0.85), "alpha": 0.25}, {"glass": true, "coverage": 0.95})
	surface("Wind deflector", "windows", Vector3(-1.0, y0 + 1.25, 0), Basis(Vector3.UP, PI / 2) * Basis(Vector3.RIGHT, PI / 2), Vector2(1.6, 0.4), ["smudge"],
		{"a": Color(0.6, 0.8, 0.9), "b": Color(0.55, 0.75, 0.85), "alpha": 0.25}, {"glass": true, "coverage": 0.95})
	# Wheels (circular surfaces).
	var wheel_look := {"a": Color(0.85, 0.86, 0.88), "b": Color(0.6, 0.62, 0.65), "pattern": 0, "roughness": 0.15, "metallic": 0.9}
	for wx in [-1.4, 1.4]:
		for wz in [-1.07, 1.07]:
			wall_surface("Wheel", "wheels", Vector3(wx, y0 + 0.36, wz), 0.66, 0.66, 0.0 if wz > 0 else 180.0, ["mud", "grime"], wheel_look, {"circle": true, "coverage": 1.0})
	# Interior.
	var seat_l := floor_surface("Driver seat", "interior", Rect2(-0.4, -0.72, 0.6, 0.6), y0 + 0.75, ["dust"], fabric, {"coverage": 1.0})
	floor_surface("Passenger seat", "interior", Rect2(-0.4, 0.12, 0.6, 0.6), y0 + 0.75, ["dust"], fabric, {"coverage": 1.0})
	floor_surface("Footwell", "interior", Rect2(0.2, -0.85, 0.35, 1.7), y0 + 0.5, ["dust", "litter"], {"a": Color(0.25, 0.25, 0.28), "b": Color(0.2, 0.2, 0.22), "pattern": 8}, {"coverage": 1.0})
	floor_surface("Rear floor", "interior", Rect2(-1.15, -0.85, 0.6, 1.7), y0 + 0.5, ["dust", "litter"], {"a": Color(0.25, 0.25, 0.28), "b": Color(0.2, 0.2, 0.22), "pattern": 8}, {"coverage": 1.0})
	var dash := floor_surface("Dashboard", "interior", Rect2(0.55, -0.85, 0.2, 1.7), y0 + 1.01, ["dust"], {"a": Color(0.3, 0.3, 0.34), "b": Color(0.22, 0.22, 0.25)}, {"coverage": 1.0})
	discovery(0, Vector3(-0.15, y0 + 0.76, -0.45), seat_l)
	discovery(1, Vector3(0.65, y0 + 1.02, 0.5), dash)
	discovery(2, Vector3(1.6, y0 + 1.03, 0.2), hood)
