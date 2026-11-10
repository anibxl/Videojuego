extends FloorBase
## FLOOR 1 — THE FORGOTTEN MALL (Lumen Galleria). Two-level atrium with a dead
## fountain, escalators, shops, a food court, the hidden Nightfall Cinema and
## the Staff Only corridor behind a vending machine. Hosts Lost & Found.

const C_PINK := Color(1.0, 0.4, 0.7)
const C_CYAN := Color(0.4, 0.92, 1.0)
const C_AMBER := Color(1.0, 0.72, 0.35)
const C_MINT := Color(0.4, 1.0, 0.7)
const GAL := 5.0     # gallery height

var koi: Array[Node3D] = []
var _t := 0.0
var lost_found: HiddenObjectChallenge

func build() -> void:
	display_name = "The Forgotten Mall"
	ambience = "amb_city"
	kill_y = -10.0
	setup_environment({"top": Color(0.02, 0.02, 0.07), "horizon": Color(0.2, 0.1, 0.3), "ambient": Color(0.5, 0.4, 0.65),
		"ambient_energy": 0.7, "fog": Color(0.2, 0.13, 0.28), "fog_density": 0.018, "sun_energy": 0.55, "sun_dir": Vector3(-70, 20, 0), "glow_strength": 1.0})
	var floor_m := Mats.tiles(Color(0.78, 0.74, 0.8), Color(0.66, 0.62, 0.72), Color(0.35, 0.3, 0.45), 2.0, 0.18, 1.0, 0.35)
	var wall := Mats.std(Color(0.42, 0.36, 0.5), 0.8)
	var trim := Mats.std(Color(0.22, 0.2, 0.3), 0.5, 0.3)
	# shell
	box(Vector3(0, -0.25, 0), Vector3(60, 0.5, 40), floor_m)
	box(Vector3(0, 5.5, -20.3), Vector3(61, 11, 0.6), wall)
	box(Vector3(30.3, 5.5, 0), Vector3(0.6, 11, 40), wall)
	# west wall with openings (cinema at z -3..3, staff corridor at z 14..17, both at gallery level)
	box(Vector3(-30.3, 2.5, 0), Vector3(0.6, 5, 40), wall)
	box(Vector3(-30.3, 8, -11.5), Vector3(0.6, 6, 17), wall)
	box(Vector3(-30.3, 8, 8.5), Vector3(0.6, 6, 11), wall)
	box(Vector3(-30.3, 8, 18.5), Vector3(0.6, 6, 3), wall)
	box(Vector3(-30.3, 10, 0), Vector3(0.6, 2, 6), wall)
	box(Vector3(-30.3, 9.5, 15.5), Vector3(0.6, 3, 3), wall)
	# south wall with elevator opening
	box(Vector3(-16.1, 5.5, 20.3), Vector3(27.8, 11, 0.6), wall)
	box(Vector3(16.1, 5.5, 20.3), Vector3(27.8, 11, 0.6), wall)
	box(Vector3(0, 7.0, 20.3), Vector3(4.4, 8, 0.6), wall)
	# ceiling with skylight
	var ceil_m := Mats.std(Color(0.2, 0.18, 0.28), 0.9)
	box(Vector3(0, 11.2, -13), Vector3(60, 0.4, 14), ceil_m)
	box(Vector3(0, 11.2, 13), Vector3(60, 0.4, 14), ceil_m)
	box(Vector3(-21, 11.2, 0), Vector3(18, 0.4, 12), ceil_m)
	box(Vector3(21, 11.2, 0), Vector3(18, 0.4, 12), ceil_m)
	for x in range(-12, 13, 4):
		box(Vector3(x, 11.1, 0), Vector3(0.15, 0.2, 12), trim, false)
	box(Vector3(0, 11.05, 0), Vector3(24, 0.04, 12), Mats.glass(Color(0.4, 0.5, 0.9, 0.12)), false)
	neon_bar(Vector3(0, 10.9, -6), Vector3(24, 0.12, 0.12), C_CYAN, 2.0)
	neon_bar(Vector3(0, 10.9, 6), Vector3(24, 0.12, 0.12), C_CYAN, 2.0)
	_gallery(floor_m, trim)
	_escalators(trim)
	_shops(trim)
	_atrium()
	_food_court()
	_cinema()
	_staff()
	_lost_and_found()
	add_elevator(Vector3(0, 0, 23), PI, "1", C_PINK)
	_pickups()
	omni(Vector3(0, 9, 0), Color(0.6, 0.6, 1.0), 1.4, 18)
	FX.motes(self, Vector3(0, 5, 0), Vector3(14, 5, 8), Color(0.8, 0.8, 1.0), 60)
	add_location("mall_atrium", Vector3(0, 3, 0), Vector3(24, 6, 18))

func _gallery(floor_m: Material, trim: Material) -> void:
	var t := 0.4
	box(Vector3(0, GAL - t / 2, -16.5), Vector3(60, t, 7), floor_m)
	box(Vector3(0, GAL - t / 2, 16.5), Vector3(60, t, 7), floor_m)
	box(Vector3(-26, GAL - t / 2, 0), Vector3(8, t, 26), floor_m)
	box(Vector3(26, GAL - t / 2, 0), Vector3(8, t, 26), floor_m)
	var glass := Mats.glass(Color(0.5, 0.75, 1.0, 0.18))
	# railings (gaps where escalators arrive: north at x 10..13, south at x -13..-10)
	box(Vector3(-11, GAL + 0.55, -13.05), Vector3(38, 1.1, 0.1), glass)
	box(Vector3(21.5, GAL + 0.55, -13.05), Vector3(17, 1.1, 0.1), glass)
	box(Vector3(11, GAL + 0.55, 13.05), Vector3(38, 1.1, 0.1), glass)
	box(Vector3(-21.5, GAL + 0.55, 13.05), Vector3(17, 1.1, 0.1), glass)
	box(Vector3(-22.05, GAL + 0.55, 0), Vector3(0.1, 1.1, 26), glass)
	box(Vector3(22.05, GAL + 0.55, 0), Vector3(0.1, 1.1, 26), glass)
	for p in [[Vector3(0, GAL + 1.12, -13.05), Vector3(60, 0.06, 0.1)], [Vector3(0, GAL + 1.12, 13.05), Vector3(60, 0.06, 0.1)],
			[Vector3(-22.05, GAL + 1.12, 0), Vector3(0.1, 0.06, 26)], [Vector3(22.05, GAL + 1.12, 0), Vector3(0.1, 0.06, 26)]]:
		neon_bar(p[0], p[1], C_PINK, 2.0)
	# gallery edge light strips underneath
	neon_bar(Vector3(0, GAL - 0.45, -13.0), Vector3(60, 0.06, 0.06), C_CYAN, 2.5)
	neon_bar(Vector3(0, GAL - 0.45, 13.0), Vector3(60, 0.06, 0.06), C_CYAN, 2.5)
	for x in [-22.0, 22.0]:
		for z in [-13.0, 13.0]:
			cyl(Vector3(x, GAL / 2, z), 0.4, GAL, trim, true, 12)

func _escalators(trim: Material) -> void:
	var step := Mats.std(Color(0.35, 0.36, 0.42), 0.4, 0.8)
	# east: x 10..13, from z = 8 (ground) up to z = -13 (gallery)
	slope(Vector3(11.5, 0, 8), Vector3(11.5, GAL, -13), 3.0, step)
	# west: x -13..-10, from z = -8 up to z = 13
	slope(Vector3(-11.5, 0, -8), Vector3(-11.5, GAL, 13), 3.0, step)
	for x in [10.0, 13.0, -10.0, -13.0]:
		var z0 := 8.0 if x > 0 else -8.0
		var z1 := -13.0 if x > 0 else 13.0
		var mid := Vector3(x, GAL / 2 + 0.6, (z0 + z1) / 2)
		var length := sqrt(pow(z1 - z0, 2) + GAL * GAL)
		var side := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.15, 1.1, length)
		side.mesh = bm
		side.material_override = trim
		side.position = mid
		side.rotation.x = atan2(GAL, absf(z1 - z0)) * (1.0 if x > 0 else -1.0)
		add_child(side)
		var strip := MeshInstance3D.new()
		var sm := BoxMesh.new()
		sm.size = Vector3(0.17, 0.06, length)
		strip.mesh = sm
		strip.material_override = Mats.neon(C_CYAN, 2.5)
		strip.position = mid + Vector3(0, 0.55, 0)
		strip.rotation.x = side.rotation.x
		add_child(strip)
		var sb := StaticBody3D.new()
		var cs := CollisionShape3D.new()
		var bs := BoxShape3D.new()
		bs.size = bm.size
		cs.shape = bs
		sb.add_child(cs)
		side.add_child(sb)

func _shops(trim: Material) -> void:
	var block := Mats.std(Color(0.3, 0.26, 0.38), 0.8)
	var h := GAL - 0.4
	# north ground block (z -20..-14) with an open toy shop at x -8..0
	box(Vector3(-19, h / 2, -17), Vector3(22, h, 6), block)
	box(Vector3(15, h / 2, -17), Vector3(30, h, 6), block)
	prop_shopfront(Vector3(-22, 0, -13.95), 0.0, "VELVET THREADS", C_PINK, 12)
	prop_shopfront(Vector3(18, 0, -13.95), 0.0, "CHROMA PHONES", C_CYAN, 12)
	prop_shopfront(Vector3(6, 0, -13.95), 0.0, "STARLIGHT BOOKS", C_AMBER, 8)
	neon_text("LUMEN TOYS", Vector3(-4, 3.9, -13.8), 0.0, C_MINT, 100, 0.01)
	box(Vector3(-4, 0.02, -17), Vector3(8, 0.04, 6), Mats.tiles(Color(0.3, 0.5, 0.45), Color(0.25, 0.42, 0.4), Color(0.1, 0.2, 0.2), 1.0, 0.4, 1.0, 0.2), false)
	for x in [-7.0, -1.0]:
		box(Vector3(x, 1.2, -19.3), Vector3(1.6, 2.4, 0.8), Mats.std(Color(0.2, 0.35, 0.35), 0.7))
	box(Vector3(-4, 0.5, -16.5), Vector3(2.4, 1.0, 1.2), Mats.std(Color(0.5, 0.3, 0.35), 0.7))
	omni(Vector3(-4, 3.5, -16), C_MINT, 0.9, 6)
	# south ground block (z 14..20) with the elevator corridor x -3..3
	box(Vector3(-16.5, h / 2, 17), Vector3(27, h, 6), block)
	box(Vector3(16.5, h / 2, 17), Vector3(27, h, 6), block)
	prop_shopfront(Vector3(-18, 0, 13.95), PI, "MOONBEAN CAFE", C_AMBER, 12)
	prop_shopfront(Vector3(18, 0, 13.95), PI, "ORBIT SPORTS", C_MINT, 12)
	neon_text("LUMEN GALLERIA", Vector3(0, 4.0, 13.9), PI, C_PINK, 90, 0.01)
	box(Vector3(-2.9, h / 2, 17), Vector3(0.2, h, 6), trim)
	box(Vector3(2.9, h / 2, 17), Vector3(0.2, h, 6), trim)
	# west ground block (x -30..-23)
	box(Vector3(-26.5, h / 2, 0), Vector3(7, h, 26), block)
	prop_shopfront(Vector3(-22.95, 0, -6), PI / 2, "PRISM OPTICS", C_CYAN, 10)
	prop_shopfront(Vector3(-22.95, 0, 6), PI / 2, "NOVA BEAUTY", C_PINK, 10)
	# upper-level shop signs on the outer walls
	neon_text("ARCADIA", Vector3(29.9, 8.5, 0), -PI / 2, C_PINK, 130, 0.012, true)
	neon_text("SKY FOOD HALL", Vector3(10, 8.5, -19.9), 0.0, C_AMBER, 110, 0.012)
	neon_text("FASHION", Vector3(-12, 8.5, -19.9), 0.0, C_CYAN, 110, 0.012)
	for x in [-20, -4, 12]:
		prop_shopfront(Vector3(x, GAL, -19.9), 0.0, "", C_CYAN.lerp(C_PINK, randf()), 8)

func _atrium() -> void:
	var stone := Mats.std(Color(0.55, 0.5, 0.62), 0.4)
	for i in 20:
		var a := i * TAU / 20.0
		box(Vector3(cos(a) * 4.2, 0.22, sin(a) * 4.2), Vector3(1.4, 0.44, 0.45), stone, true, -a + PI / 2)
	cyl(Vector3(0, 0.03, 0), 4.0, 0.06, Mats.std(Color(0.1, 0.12, 0.2), 0.1, 0.3), false, 32)
	cyl(Vector3(0, 0.9, 0), 0.5, 1.8, stone, true, 12)
	sphere(Vector3(0, 2.0, 0), 0.6, Mats.glass(Color(0.4, 0.8, 1.0, 0.3)))
	# Holo koi swimming in the dry basin
	for i in 3:
		var k := Node3D.new()
		add_child(k)
		var body := MeshInstance3D.new()
		var cap := CapsuleMesh.new()
		cap.radius = 0.12
		cap.height = 0.55
		body.mesh = cap
		body.rotation.z = PI / 2
		body.material_override = Mats.holo(Color(1.0, 0.5, 0.3, 0.9), 1.4)
		k.add_child(body)
		var tail := MeshInstance3D.new()
		var pm := PrismMesh.new()
		pm.size = Vector3(0.25, 0.22, 0.04)
		tail.mesh = pm
		tail.position = Vector3(-0.35, 0, 0)
		tail.rotation.z = PI / 2
		tail.material_override = body.material_override
		k.add_child(tail)
		koi.append(k)
	neon_text("PLEASE DO NOT FEED THE KOI", Vector3(0, 0.75, 4.45), 0.0, C_CYAN, 32, 0.008)
	for p in [Vector3(-7, 0, -8), Vector3(7, 0, 8), Vector3(-7, 0, 8), Vector3(7, 0, -8)]:
		prop_planter(p, Color(0.3, 0.55, 0.45))
	prop_bench(Vector3(-6, 0, 0), PI / 2)
	prop_bench(Vector3(6, 0, 0), -PI / 2)

func _process(delta: float) -> void:
	_t += delta
	for i in koi.size():
		var a := _t * (0.5 + i * 0.12) + i * TAU / 3.0
		var r := 2.4 + sin(_t * 0.7 + i) * 0.5
		koi[i].position = Vector3(cos(a) * r, 0.35 + sin(_t * 2.0 + i) * 0.08, sin(a) * r)
		koi[i].rotation.y = -a - PI / 2

func _food_court() -> void:
	var counter := Mats.std(Color(0.35, 0.22, 0.3), 0.6)
	box(Vector3(28.5, 0.55, -6), Vector3(2.4, 1.1, 8), counter)
	box(Vector3(28.5, 0.55, 6), Vector3(2.4, 1.1, 8), counter)
	neon_text("NOODLE BAR", Vector3(29.9, 3.6, -6), -PI / 2, C_PINK, 100, 0.01, true)
	neon_text("PIZZA ORBIT", Vector3(29.9, 3.6, 6), -PI / 2, C_AMBER, 100, 0.01)
	var table := Mats.std(Color(0.85, 0.85, 0.9), 0.3)
	var chair := Mats.std(Color(0.9, 0.4, 0.5), 0.6)
	for p in [Vector3(17, 0, -8), Vector3(21, 0, -3), Vector3(17, 0, 3), Vector3(21, 0, 8), Vector3(24, 0, -9), Vector3(24, 0, 2)]:
		cyl(p + Vector3(0, 0.72, 0), 0.8, 0.06, table, true, 16)
		cyl(p + Vector3(0, 0.36, 0), 0.08, 0.72, table, false, 6)
		for k in 3:
			var a: float = k * TAU / 3.0 + p.x
			var c := box(p + Vector3(cos(a) * 1.2, 0.25, sin(a) * 1.2), Vector3(0.45, 0.5, 0.45), chair, false)
			prop(c)
	omni(Vector3(22, 4, 0), C_AMBER, 1.3, 11)
	add_location("mall_food", Vector3(22, 2, 0), Vector3(14, 4, 24))

func _cinema() -> void:
	# room x -46..-30, z -10..10, floor at gallery height
	var dark := Mats.std(Color(0.08, 0.05, 0.08), 0.9)
	var carpet := Mats.tiles(Color(0.25, 0.05, 0.1), Color(0.22, 0.04, 0.09), Color(0.15, 0.02, 0.05), 0.8, 0.95, 1.0, 0.1)
	box(Vector3(-38, GAL - 0.2, 0), Vector3(16, 0.4, 20), carpet)
	box(Vector3(-38, GAL + 7.2, 0), Vector3(16, 0.4, 20), dark)
	box(Vector3(-46.3, GAL + 3.5, 0), Vector3(0.6, 7, 20), dark)
	box(Vector3(-38, GAL + 3.5, -10.3), Vector3(16, 7, 0.6), dark)
	box(Vector3(-38, GAL + 3.5, 10.3), Vector3(16, 7, 0.6), dark)
	var screen := box(Vector3(-45.9, GAL + 3.4, 0), Vector3(0.1, 4.2, 12), Mats.neon(Color(0.55, 0.6, 0.75), 0.9), false)
	screen.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var seat := Mats.std(Color(0.45, 0.08, 0.15), 0.8)
	for row in 4:
		for s in 7:
			var mi := box(Vector3(-41.0 + row * 2.5, GAL + 0.45, -6 + s * 2.0), Vector3(0.9, 0.9, 0.9), seat, row == 0, 0.0)
			prop(mi)
	neon_text("NIGHTFALL", Vector3(-30.0, GAL + 5.0, 0), PI / 2, Color(0.5, 0.25, 0.3), 90, 0.01, true)
	omni(Vector3(-40, GAL + 4, 0), Color(0.6, 0.6, 0.9), 0.8, 10)
	add_location("mall_cinema", Vector3(-38, GAL + 2, 0), Vector3(14, 4, 18))

func _staff() -> void:
	var grey := Mats.std(Color(0.3, 0.32, 0.36), 0.8)
	# corridor x -40..-30, z 14..17 at gallery height
	box(Vector3(-35, GAL - 0.2, 15.5), Vector3(10, 0.4, 3), grey)
	box(Vector3(-35, GAL + 1.8, 13.8), Vector3(10, 3.6, 0.4), grey)
	box(Vector3(-35, GAL + 1.8, 17.2), Vector3(10, 3.6, 0.4), grey)
	box(Vector3(-35, GAL + 3.7, 15.5), Vector3(10, 0.4, 3.8), grey)
	# staff room x -48..-40, z 10..20
	box(Vector3(-44, GAL - 0.2, 15), Vector3(8, 0.4, 10), grey)
	box(Vector3(-48.2, GAL + 1.8, 15), Vector3(0.4, 3.6, 10), grey)
	box(Vector3(-44, GAL + 1.8, 20.2), Vector3(8.8, 3.6, 0.4), grey)
	box(Vector3(-44, GAL + 1.8, 10.6), Vector3(8.8, 3.6, 0.4), grey)
	box(Vector3(-40.0, GAL + 1.8, 12.0), Vector3(0.4, 3.6, 2.4), grey)
	box(Vector3(-40.0, GAL + 1.8, 18.6), Vector3(0.4, 3.6, 2.8), grey)
	box(Vector3(-44, GAL + 3.7, 15), Vector3(8.8, 0.4, 10), grey)
	for i in 4:
		box(Vector3(-47.5, GAL + 1.0, 12 + i * 1.2), Vector3(0.8, 2.0, 1.0), Mats.std(Color(0.3, 0.4, 0.6), 0.5, 0.6))
	box(Vector3(-44, GAL + 0.4, 16), Vector3(2.0, 0.8, 1.2), Mats.std(Color(0.4, 0.3, 0.25), 0.7))
	var l := omni(Vector3(-44, GAL + 3, 15), Color(0.9, 0.9, 0.7), 1.0, 7)
	var tw := create_tween().set_loops()
	tw.tween_interval(3.0)
	tw.tween_property(l, "light_energy", 0.1, 0.05)
	tw.tween_property(l, "light_energy", 1.0, 0.1)
	neon_text("STAFF ONLY", Vector3(-31.0, GAL + 3.0, 15.5), PI / 2, Color(0.9, 0.9, 0.9), 50, 0.008)
	add_location("mall_staff", Vector3(-41, GAL + 1.5, 15), Vector3(14, 3, 8))
	# the blue vending machine hiding the corridor (slides aside when pushed)
	var vm := prop_vending(Vector3(-29.4, GAL, 15.5), PI / 2, Color(0.25, 0.5, 1.0))
	# two extra machines either side so the whole 3 m opening is blocked
	for side in [-1.0, 1.0]:
		box(Vector3(side * 1.0, 1.0, 0), Vector3(0.9, 2.0, 0.8), Mats.std(Color(0.2, 0.2, 0.3), 0.5, 0.3), true, 0.0, vm)
		box(Vector3(side * 1.0, 1.2, 0.41), Vector3(0.75, 1.3, 0.02), Mats.neon(C_PINK if side < 0 else C_MINT, 1.2), false, 0.0, vm)
	var moved := WorldState.has_flag("mall_vending_moved")
	if moved:
		vm.position.z = 18.7
	var it := Interactable.new()
	it.position = Vector3(0, 1.2, 0.9)
	it.radius = 2.4
	it.prompt_func = func() -> String: return "" if WorldState.has_flag("mall_vending_moved") else "Push the Vending Machine"
	it.action = func(_p):
		if WorldState.has_flag("mall_vending_moved"):
			return
		Audio.play("door", 0.0)
		var tw2 := create_tween()
		tw2.tween_property(vm, "position:z", 18.7, 1.2).set_trans(Tween.TRANS_SINE)
		WorldState.set_flag("mall_vending_moved")
	vm.add_child(it)

func _lost_and_found() -> void:
	var desk := Mats.std(Color(0.3, 0.25, 0.45), 0.6)
	box(Vector3(-5, 0.55, 9), Vector3(3.0, 1.1, 1.0), desk)
	neon_text("LOST & FOUND", Vector3(-5, 2.3, 9.1), 0.0, C_AMBER, 70, 0.01)
	lost_found = HiddenObjectChallenge.new()
	lost_found.flag = "challenge_lostfound"
	lost_found.title = "Lost & Found"
	lost_found.reward_item = "r_lumi_plush"
	lost_found.time_limit = 100.0
	lost_found.spots = [Vector3(-4, 0, -17.5), Vector3(26, GAL, -16), Vector3(20.5, 0, 10.5), Vector3(-26, GAL, -2), Vector3(14, GAL, 17)]
	add_child(lost_found)
	var it := add_interactable(Vector3(-5, 1.2, 10), "", func(_p): lost_found.start(), 2.6)
	it.prompt_func = func() -> String:
		if lost_found.is_done() or lost_found.active:
			return ""
		return "Start Lost & Found"

func _pickups() -> void:
	var fr := [Vector3(0, 0.4, -10), Vector3(-18, 0.4, -5), Vector3(18, 0.4, -11), Vector3(26, GAL + 0.4, -5), Vector3(-26, GAL + 0.4, -10),
		Vector3(0, GAL + 0.4, -16), Vector3(0, GAL + 0.4, 16.5), Vector3(-38, GAL + 0.4, 6), Vector3(-2, 0.4, -18), Vector3(11.5, 3.2, -5)]
	for i in fr.size():
		add_fragment(fr[i], i)
	add_collectible("c_mall_coupon", Vector3(21, 0.78, -3))
	add_collectible("u_mascot_pin", Vector3(-41, GAL + 0.9, -2))
	add_collectible("r_holo_koi", Vector3(0, 0.06, -2.6))
	add_collectible("l_prism_dawn", Vector3(-44, GAL + 0.8, 16), false)
	add_note("n_mall_memo", Vector3(28.5, 1.45, 1.5), -PI / 2)
