extends FloorBase
## FLOOR 2 — THE UNDERGROUND. Line 7's abandoned platform, the last train,
## maintenance tunnels, a forgotten shrine and a bricked-up room.
## Dark floor: the explorer's headlamp switches on automatically.

const C_TEAL := Color(0.3, 0.9, 0.85)
const C_AMBER := Color(1.0, 0.65, 0.3)
const C_RED := Color(1.0, 0.25, 0.3)

func build() -> void:
	display_name = "The Underground"
	ambience = "amb_cave"
	dark = true
	kill_y = -12.0
	setup_environment({"bg": Color(0.01, 0.015, 0.025), "ambient": Color(0.2, 0.3, 0.38), "ambient_energy": 0.32,
		"fog": Color(0.03, 0.07, 0.09), "fog_density": 0.035, "sun_energy": 0.0, "glow_strength": 1.1, "exposure": 1.1})
	sun.visible = false
	var tile := Mats.tiles(Color(0.72, 0.74, 0.7), Color(0.66, 0.68, 0.64), Color(0.25, 0.27, 0.25), 0.5, 0.45, 0.0, 0.6)
	var concrete := Mats.ground(Color(0.08, 0.09, 0.1), Color(0.12, 0.12, 0.13), 3.0, 0.25)
	var dark_m := Mats.std(Color(0.07, 0.08, 0.09), 0.9)
	_platform(tile, concrete, dark_m)
	_train()
	_tunnels(tile, concrete, dark_m)
	_shrine(concrete, dark_m)
	add_elevator(Vector3(-37, 0, -0.5), PI / 2, "2", C_TEAL)
	_pickups()
	FX.motes(self, Vector3(0, 2, 2), Vector3(30, 2, 6), Color(0.6, 0.8, 0.8), 50)

func _platform(tile: Material, concrete: Material, dark_m: Material) -> void:
	box(Vector3(-2.5, -0.65, -0.5), Vector3(65, 1.3, 7), concrete)          # platform x -35..30, z -4..3
	box(Vector3(-2.5, -1.55, 6.75), Vector3(65, 0.5, 7.5), Mats.ground(Color(0.05, 0.05, 0.06), Color(0.08, 0.07, 0.07), 2.0, 0.5))  # trench floor top -1.3
	box(Vector3(-2.5, 1.9, 10.75), Vector3(65, 6.8, 0.5), tile)             # far wall
	box(Vector3(-2.5, 5.2, 3.25), Vector3(65, 0.4, 15.5), dark_m)           # ceiling
	# back wall z = -4 with openings: staff room x -8..-5, tunnel x 26..30
	box(Vector3(-21.5, 2.5, -4.25), Vector3(27, 5, 0.5), tile)
	box(Vector3(10.5, 2.5, -4.25), Vector3(31, 5, 0.5), tile)
	box(Vector3(-6.5, 4.0, -4.25), Vector3(3, 2, 0.5), tile)
	box(Vector3(28, 4.25, -4.25), Vector3(4, 1.5, 0.5), tile)
	# ends
	box(Vector3(30.25, 1.6, 3.25), Vector3(0.5, 7, 15.5), tile)
	# west end wall just in front of the elevator cab, door opening z -1.8..0.8
	box(Vector3(-34.55, 2.5, -2.9), Vector3(0.5, 5, 2.2), tile)
	box(Vector3(-34.55, 1.9, 5.775), Vector3(0.5, 6.8, 9.95), tile)
	box(Vector3(-34.55, 4.15, -0.5), Vector3(0.5, 1.7, 2.6), tile)
	# platform edge warning strip
	box(Vector3(-2.5, 0.01, 2.75), Vector3(65, 0.02, 0.4), Mats.neon(Color(0.95, 0.8, 0.2), 0.7), false)
	# rails
	for z in [5.5, 7.5]:
		box(Vector3(-2.5, -1.2, z), Vector3(65, 0.15, 0.12), Mats.std(Color(0.4, 0.38, 0.36), 0.3, 0.9), false)
	# signage
	neon_text("LINE 7", Vector3(-20, 3.0, 10.45), PI, C_AMBER, 130, 0.012)
	neon_text("AFTERLIGHT CENTRAL", Vector3(14, 3.2, 10.45), PI, Color(0.9, 0.9, 0.85), 90, 0.012)
	neon_text("OUT OF SERVICE", Vector3(-6, 3.3, -3.95), 0.0, C_RED, 60, 0.01, true)
	# ceiling tubes (some flicker)
	for i in 8:
		var x := -30.0 + i * 8.0
		var m := neon_bar(Vector3(x, 4.9, 0), Vector3(3.0, 0.08, 0.2), Color(0.75, 1.0, 0.95), 2.2 if i % 3 != 1 else 0.4)
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for x in [-24.0, -2.0, 18.0]:
		omni(Vector3(x, 4.0, 0), Color(0.6, 0.95, 0.9), 1.0, 11)
	for x in [-28.0, -14.0, 0.0, 22.0]:
		prop_bench(Vector3(x, 0, -3.3), 0.0)
	for x in [-20.0, 8.0]:
		cyl(Vector3(x, 2.5, -1.0), 0.35, 5.0, tile, true, 10)
	add_location("ug_platform", Vector3(-8, 2, -0.5), Vector3(40, 4, 7))
	# staff room x -10..-3, z -10..-4.5
	box(Vector3(-6.5, -0.15, -7.25), Vector3(7, 0.3, 5.5), concrete)
	box(Vector3(-10.25, 2.5, -7.25), Vector3(0.5, 5, 5.5), tile)
	box(Vector3(-2.75, 2.5, -7.25), Vector3(0.5, 5, 5.5), tile)
	box(Vector3(-6.5, 2.5, -10.25), Vector3(8, 5, 0.5), tile)
	box(Vector3(-6.5, 5.2, -7.25), Vector3(8, 0.4, 6), dark_m)
	box(Vector3(-6.5, 0.4, -9.2), Vector3(3, 0.8, 1.2), Mats.std(Color(0.35, 0.3, 0.25), 0.8))
	omni(Vector3(-6.5, 3.5, -7), C_AMBER, 0.7, 6)

func _train() -> void:
	var body := Mats.std(Color(0.55, 0.57, 0.62), 0.35, 0.8)
	var inner := Mats.std(Color(0.2, 0.22, 0.28), 0.7)
	var x0 := 2.0
	var x1 := 24.0
	var cx := (x0 + x1) / 2
	var L := x1 - x0
	box(Vector3(cx, -0.65, 6.0), Vector3(L, 1.3, 5.4), body)                 # floor (top at 0)
	box(Vector3(cx, 2.9, 6.0), Vector3(L, 0.3, 5.4), body)                   # roof
	box(Vector3(cx, 1.4, 8.65), Vector3(L, 2.8, 0.15), body)                 # south wall
	box(Vector3(x0, 1.4, 6.0), Vector3(0.15, 2.8, 5.4), body)
	box(Vector3(x1, 1.4, 6.0), Vector3(0.15, 2.8, 5.4), body)
	# north wall with three door gaps (2 m) at x 6..8, 12..14, 18..20
	var segs := [[2.0, 6.0], [8.0, 12.0], [14.0, 18.0], [20.0, 24.0]]
	for s in segs:
		box(Vector3((s[0] + s[1]) / 2, 1.4, 3.35), Vector3(s[1] - s[0], 2.8, 0.15), body)
	for s in [[6.0, 8.0], [12.0, 14.0], [18.0, 20.0]]:
		box(Vector3((s[0] + s[1]) / 2, 2.55, 3.35), Vector3(2.0, 0.5, 0.15), body)
	box(Vector3(cx, 1.7, 3.26), Vector3(L, 0.6, 0.02), Mats.neon(Color(0.9, 0.95, 0.8), 0.25), false)
	box(Vector3(cx, 1.7, 8.74), Vector3(L, 0.6, 0.02), Mats.neon(Color(0.9, 0.95, 0.8), 0.25), false)
	box(Vector3(cx, 0.8, 3.2), Vector3(L, 0.12, 0.02), Mats.neon(C_TEAL, 1.5), false)
	for x in range(3, 24, 3):
		box(Vector3(x + 0.5, 0.25, 8.1), Vector3(2.0, 0.5, 0.9), inner)
	box(Vector3(cx, 2.7, 6.0), Vector3(L - 1, 0.05, 0.3), Mats.neon(Color(0.8, 1.0, 0.9), 1.0), false)
	omni(Vector3(cx, 2.2, 6.0), Color(0.7, 0.9, 1.0), 0.8, 9)
	neon_text("7", Vector3(x0 - 0.1, 2.2, 6.0), -PI / 2, C_AMBER, 140, 0.01)
	add_location("ug_train", Vector3(cx, 1.4, 6.0), Vector3(L - 1, 2.6, 4.6))

func _tunnels(tile: Material, concrete: Material, dark_m: Material) -> void:
	var brick := Mats.tiles(Color(0.3, 0.17, 0.14), Color(0.27, 0.15, 0.12), Color(0.12, 0.1, 0.1), 0.4, 0.9, 0.0, 0.4)
	# corridor north x 26..30, z -28..-4.5
	box(Vector3(28, -0.15, -16.25), Vector3(4, 0.3, 23.5), concrete)
	box(Vector3(25.75, 1.75, -16.25), Vector3(0.5, 3.5, 23.5), brick)
	box(Vector3(30.25, 1.75, -9.25), Vector3(0.5, 3.5, 9.5), brick)
	box(Vector3(30.25, 1.75, -23.0), Vector3(0.5, 3.5, 10), brick)
	box(Vector3(28, 3.7, -16.25), Vector3(4.5, 0.4, 23.5), dark_m)
	# alcove x 30..33, z -18..-14 (lantern)
	box(Vector3(31.75, -0.15, -16), Vector3(3, 0.3, 4), concrete)
	box(Vector3(33.25, 1.75, -16), Vector3(0.5, 3.5, 4), brick)
	box(Vector3(31.75, 1.75, -18.25), Vector3(3, 3.5, 0.5), brick)
	box(Vector3(31.75, 1.75, -13.75), Vector3(3, 3.5, 0.5), brick)
	box(Vector3(31.75, 3.7, -16), Vector3(3.5, 0.4, 4.5), dark_m)
	for z in [-10.0, -20.0]:
		var l := omni(Vector3(28, 3.0, z), C_AMBER, 0.8, 7)
		var tw := create_tween().set_loops()
		tw.tween_interval(randf_range(1.5, 4.0))
		tw.tween_property(l, "light_energy", 0.15, 0.06)
		tw.tween_property(l, "light_energy", 0.8, 0.12)
	prop_pipe(Vector3(26.2, 3.0, -5), Vector3(26.2, 3.0, -27), 0.15)
	prop_pipe(Vector3(26.2, 2.6, -5), Vector3(26.2, 2.6, -27), 0.1, Color(0.4, 0.2, 0.15))
	neon_text("MAINTENANCE", Vector3(28, 2.8, -4.05), 0.0, C_AMBER, 50, 0.008)

func _shrine(concrete: Material, dark_m: Material) -> void:
	var stone := Mats.tiles(Color(0.25, 0.24, 0.22), Color(0.22, 0.21, 0.2), Color(0.1, 0.1, 0.1), 1.0, 0.9, 0.0, 0.5)
	# shrine room x 10..30, z -40..-28
	box(Vector3(20, -0.15, -34), Vector3(20, 0.3, 12), concrete)
	box(Vector3(20, 4.2, -34), Vector3(20.5, 0.4, 12.5), dark_m)
	box(Vector3(20, 2.0, -40.25), Vector3(20.5, 4, 0.5), stone)
	box(Vector3(30.25, 2.0, -34), Vector3(0.5, 4, 12), stone)
	box(Vector3(17.75, 2.0, -27.75), Vector3(16.5, 4, 0.5), stone)          # north wall x 10..26 (corridor enters at 26..30)
	# west wall x = 10 with the loose-brick section at z -36..-32
	box(Vector3(9.75, 2.0, -38.0), Vector3(0.5, 4, 4), stone)
	box(Vector3(9.75, 2.0, -30.0), Vector3(0.5, 4, 4), stone)
	box(Vector3(9.75, 3.5, -34.0), Vector3(0.5, 1, 4), stone)
	var bricks: MeshInstance3D = null
	if not WorldState.has_flag("ug_bricks_broken"):
		bricks = box(Vector3(9.75, 1.5, -34.0), Vector3(0.5, 3, 4), Mats.tiles(Color(0.35, 0.2, 0.16), Color(0.3, 0.17, 0.14), Color(0.15, 0.12, 0.1), 0.35, 0.95, 0.0, 0.3))
		var it := add_interactable(Vector3(10.6, 1.2, -34), "Inspect Loose Bricks", func(_p): pass, 2.4)
		it.action = func(_p):
			if WorldState.has_flag("ug_bricks_broken"):
				return
			Audio.play("bricks", 0.0)
			FX.burst(self, Vector3(9.75, 1.5, -34), Color(0.6, 0.4, 0.3), 50, 5.0, 1.2)
			if game and game.cam:
				game.cam.add_trauma(0.4)
			bricks.queue_free()
			it.enabled = false
			WorldState.set_flag("ug_bricks_broken")
			Events.notify("The bricks give way...", C_AMBER)
	# shrine: arch, lanterns, offerings
	var red := Mats.std(Color(0.6, 0.12, 0.12), 0.6)
	box(Vector3(13.5, 1.6, -31.5), Vector3(0.35, 3.2, 0.35), red)
	box(Vector3(13.5, 1.6, -36.5), Vector3(0.35, 3.2, 0.35), red)
	box(Vector3(13.5, 3.3, -34), Vector3(0.5, 0.3, 6.2), red, false)
	box(Vector3(13.5, 2.8, -34), Vector3(0.3, 0.2, 5.2), red, false)
	box(Vector3(12.0, 0.4, -34), Vector3(1.4, 0.8, 3.0), stone)
	for i in 9:
		var p := Vector3(12.0 + randf_range(-0.5, 0.5), 0.8, -34 + (i - 4) * 0.35)
		var c := cyl(p + Vector3(0, 0.1, 0), 0.04, 0.2, Mats.std(Color(0.9, 0.85, 0.7)), false, 6)
		prop(c)
		var f := sphere(p + Vector3(0, 0.26, 0), 0.035, Mats.neon(C_AMBER, 6.0))
		prop(f)
	var lights := omni(Vector3(12.5, 1.6, -34), C_AMBER, 1.6, 9)
	var tw := create_tween().set_loops()
	tw.tween_property(lights, "light_energy", 1.2, 0.3)
	tw.tween_property(lights, "light_energy", 1.7, 0.4)
	for z in [-30.0, -38.0]:
		cyl(Vector3(16, 1.0, z), 0.25, 2.0, stone, true, 8)
		sphere(Vector3(16, 2.2, z), 0.22, Mats.neon(C_AMBER, 3.0))
	add_location("ug_shrine", Vector3(18, 2, -34), Vector3(14, 4, 10))
	# walled room x 0..10, z -40..-30
	box(Vector3(5, -0.15, -35), Vector3(10, 0.3, 10), concrete)
	box(Vector3(5, 4.2, -35), Vector3(10.5, 0.4, 10.5), dark_m)
	box(Vector3(-0.25, 2.0, -35), Vector3(0.5, 4, 10), stone)
	box(Vector3(5, 2.0, -40.25), Vector3(10.5, 4, 0.5), stone)
	box(Vector3(5, 2.0, -29.75), Vector3(10.5, 4, 0.5), stone)
	cyl(Vector3(4, 0.5, -35), 0.6, 1.0, Mats.std(Color(0.3, 0.2, 0.3), 0.4))
	omni(Vector3(4, 2.5, -35), Color(0.95, 0.4, 0.75), 0.9, 6)
	add_location("ug_walled", Vector3(5, 2, -35), Vector3(8, 4, 8))

func _pickups() -> void:
	var fr := [Vector3(-25, 0.4, 0), Vector3(-12, 0.4, -1), Vector3(5, 0.4, -1.5), Vector3(-15, -0.9, 6.5), Vector3(20, 0.4, 6),
		Vector3(28, 0.4, -12), Vector3(28, 0.4, -25), Vector3(22, 0.4, -36), Vector3(2, 0.4, -38), Vector3(-6.5, 0.4, -7)]
	for i in fr.size():
		add_fragment(fr[i], i)
	add_collectible("c_cassette", Vector3(-6.5, 0.8, -9.2))
	add_collectible("u_tunnel_lantern", Vector3(32, 0, -16))
	add_collectible("r_lab_keycard", Vector3(13.5, 0.5, 8.1))
	add_collectible("r_crystal_radio", Vector3(12.0, 0.8, -32.8))
	add_collectible("l_prism_dusk", Vector3(4, 1.0, -35), false)
	add_note("n_tunnel_scrawl", Vector3(20, 1.5, -39.9), 0.0)
