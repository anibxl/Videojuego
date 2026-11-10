extends FloorBase
## FLOOR 4 — THE ROOFTOPS. A vertical chain of rooftops high above the
## city, ending at the Summit antenna. Hosts the Skyrunner parkour run, the
## hidden pigeon coop and the water tower that hides the last Prism Shard.
## All gaps are tuned to the player's jump (rise <= 1.2 m, gap <= 3 m).

const C_PINK := Color(1.0, 0.45, 0.75)
const C_CYAN := Color(0.4, 0.92, 1.0)
const C_AMBER := Color(1.0, 0.7, 0.35)
const C_RED := Color(1.0, 0.2, 0.25)

var parkour: ParkourChallenge
var beacons: Array[MeshInstance3D] = []
var _t := 0.0

func build() -> void:
	display_name = "The Rooftops"
	ambience = "amb_city"
	kill_y = -8.0
	setup_environment({"top": Color(0.02, 0.02, 0.08), "horizon": Color(0.3, 0.12, 0.38), "glow": Color(0.15, 0.4, 0.7),
		"ambient": Color(0.38, 0.33, 0.65), "ambient_energy": 0.6, "fog": Color(0.16, 0.09, 0.28), "fog_density": 0.016,
		"fog_sky": 0.15, "sun_energy": 0.55, "sun_dir": Vector3(-35, 60, 0), "aurora": 1.6})
	# rooftops: x0, x1, z0, z1, top, seed
	var roofs := [
		[-8, 8, 8, 24, 0.0, 1], [-6, 6, -6.5, 5.5, 0.8, 2], [-16.5, -8.5, -12, -4, 2.0, 3], [-16, -8, -23, -14.5, 3.2, 4],
		[-6, 6, -34, -24, 4.4, 5], [-5, 5, -46, -37, 5.0, 6], [-4, 4, -60, -49, 6.0, 7], [-3, 3, -66, -60, 10.0, 0],
		[10, 20, -20, -10, 1.6, 1],
	]
	for r in roofs:
		_roof(Rect2(r[0], r[2], r[1] - r[0], r[3] - r[2]), r[4], r[5])
	map_bounds = Rect2(-24, -70, 50, 98)
	add_elevator(Vector3(0, 0, 20), PI, "4", C_PINK)
	# elevator housing on the start roof
	box(Vector3(0, 1.8, 22.6), Vector3(5.4, 3.6, 0.6), Mats.std(Color(0.12, 0.11, 0.2), 0.7))
	box(Vector3(0, 3.7, 20), Vector3(5.4, 0.3, 5.6), Mats.std(Color(0.12, 0.11, 0.2), 0.7))
	neon_text("ROOF ACCESS", Vector3(0, 4.3, 17.7), PI, C_CYAN, 70, 0.01)
	add_location("roof_access", Vector3(0, 1.5, 14), Vector3(16, 3, 10))
	_water_tower()
	_summit()
	_coop()
	_dressing()
	_city_below()
	parkour = ParkourChallenge.new()
	parkour.flag = "challenge_parkour"
	parkour.reward_item = "e_compass"
	parkour.time_limit = 45.0
	parkour.start_pos = Vector3(4.5, 0, 12)
	parkour.finish_pos = Vector3(0, 10, -63)
	add_child(parkour)
	parkour.setup(self)
	_pickups()

func on_player_fell(player: Node) -> bool:
	return parkour.on_fall(player)

func _roof(r: Rect2, top: float, seed_v: int) -> void:
	var c := r.get_center()
	var depth := 60.0
	var body := box(Vector3(c.x, top - depth / 2 - 0.3, c.y), Vector3(r.size.x, depth, r.size.y), Mats.building(seed_v, Color(0.07, 0.07, 0.14), 0.25))
	body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	box(Vector3(c.x, top - 0.15, c.y), Vector3(r.size.x, 0.3, r.size.y), Mats.tiles(Color(0.2, 0.19, 0.25), Color(0.17, 0.16, 0.22), Color(0.08, 0.08, 0.1), 1.5, 0.8, 1.0, 0.35))
	# low lip (visual only, so it never blocks a jump)
	var lip := Mats.std(Color(0.28, 0.27, 0.34), 0.7)
	box(Vector3(c.x, top + 0.07, r.position.y + 0.1), Vector3(r.size.x, 0.14, 0.2), lip, false)
	box(Vector3(c.x, top + 0.07, r.end.y - 0.1), Vector3(r.size.x, 0.14, 0.2), lip, false)
	box(Vector3(r.position.x + 0.1, top + 0.07, c.y), Vector3(0.2, 0.14, r.size.y), lip, false)
	box(Vector3(r.end.x - 0.1, top + 0.07, c.y), Vector3(0.2, 0.14, r.size.y), lip, false)
	neon_bar(Vector3(c.x, top - 0.35, r.end.y + 0.02), Vector3(r.size.x, 0.08, 0.04), [C_PINK, C_CYAN, C_AMBER][seed_v % 3], 2.0)

func _water_tower() -> void:
	var cx := 0.0
	var cz := -29.0
	var base := 4.4
	var metal := Mats.std(Color(0.3, 0.26, 0.24), 0.6, 0.5)
	var wood := Mats.std(Color(0.35, 0.24, 0.18), 0.8)
	for p in [Vector2(-2.2, -2.2), Vector2(2.2, -2.2), Vector2(-2.2, 2.2), Vector2(2.2, 2.2)]:
		cyl(Vector3(cx + p.x, base + 3.35, cz + p.y), 0.18, 6.7, metal, true, 8)
	cyl(Vector3(cx, base + 6.85, cz), 4.4, 0.3, metal, true, 24)                 # catwalk disc, top at 11.4
	cyl(Vector3(cx, base + 9.5, cz), 3.0, 5.0, wood, true, 20)                   # tank
	var roof := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.1
	cm.bottom_radius = 3.3
	cm.height = 1.6
	cm.radial_segments = 20
	roof.mesh = cm
	roof.material_override = metal
	roof.position = Vector3(cx, base + 12.8, cz)
	add_child(roof)
	neon_text("DRINK THE NIGHT", Vector3(cx, base + 9.6, cz + 3.05), 0.0, C_AMBER, 70, 0.012)
	# climbing route on the east side: crates/vents rising 1.2 m each
	var steps := [Vector3(6.0, 5.6, -25.5), Vector3(6.0, 6.8, -28.0), Vector3(6.0, 8.0, -30.5), Vector3(6.0, 9.2, -33.0), Vector3(3.5, 10.4, -35.5)]
	for s in steps:
		var h: float = s.y - base
		box(Vector3(s.x, base + h / 2, s.z), Vector3(1.4, h, 1.4), Mats.std(Color(0.4, 0.38, 0.42), 0.6, 0.4))
		box(Vector3(s.x, s.y + 0.01, s.z), Vector3(1.42, 0.03, 1.42), Mats.neon(C_AMBER, 0.8), false)
	add_location("roof_watertower", Vector3(cx, base + 8.0, cz), Vector3(9, 3, 9))

func _summit() -> void:
	var g_top := 6.0
	slope(Vector3(0, g_top, -50), Vector3(0, 10.0, -60), 2.6, Mats.std(Color(0.3, 0.3, 0.36), 0.5, 0.6))
	var rail := Mats.neon(C_CYAN, 1.5)
	box(Vector3(-1.4, 8.6, -55), Vector3(0.06, 0.06, 10.8), rail, false)
	box(Vector3(1.4, 8.6, -55), Vector3(0.06, 0.06, 10.8), rail, false)
	var mast := Mats.std(Color(0.35, 0.35, 0.4), 0.4, 0.8)
	box(Vector3(0, 17, -64.5), Vector3(0.35, 14, 0.35), mast, true)
	for i in 4:
		var y := 12.0 + i * 3.0
		box(Vector3(0, y, -64.5), Vector3(2.0 - i * 0.4, 0.1, 0.1), mast, false)
	for y in [16.0, 24.0]:
		var b := sphere(Vector3(0, y, -64.5), 0.25, Mats.neon(C_RED, 6.0))
		beacons.append(b)
	neon_text("THE SUMMIT", Vector3(0, 11.6, -60.2), 0.0, C_PINK, 70, 0.01)
	omni(Vector3(0, 12, -63), C_PINK, 1.0, 8)
	add_location("roof_summit", Vector3(0, 11.5, -63), Vector3(6, 3, 6))

func _coop() -> void:
	var c := Vector3(16, 1.6, -16)
	var wire := Mats.glass(Color(0.7, 0.75, 0.8, 0.12))
	var wood := Mats.std(Color(0.4, 0.28, 0.2), 0.85)
	box(c + Vector3(0, 1.3, -1.5), Vector3(3.2, 2.6, 0.08), wire)
	box(c + Vector3(-1.6, 1.3, 0), Vector3(0.08, 2.6, 3.0), wire)
	box(c + Vector3(1.6, 1.3, 0), Vector3(0.08, 2.6, 3.0), wire)
	box(c + Vector3(0, 2.65, 0), Vector3(3.4, 0.1, 3.2), wood, false)
	box(c + Vector3(0, 0.6, -1.2), Vector3(3.0, 0.1, 0.5), wood, false)
	# the last pigeon
	var bird := Node3D.new()
	bird.position = c + Vector3(0.6, 0.72, -1.2)
	add_child(bird)
	var bm := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.16
	sm.height = 0.3
	bm.mesh = sm
	bm.material_override = Mats.std(Color(0.55, 0.57, 0.65), 0.7)
	bird.add_child(bm)
	var head := MeshInstance3D.new()
	var hm := SphereMesh.new()
	hm.radius = 0.08
	hm.height = 0.16
	head.mesh = hm
	head.position = Vector3(0.12, 0.14, 0)
	head.material_override = Mats.std(Color(0.3, 0.45, 0.45), 0.6)
	bird.add_child(head)
	add_location("roof_coop", c + Vector3(0, 1.2, 0), Vector3(8, 3, 8))

func _dressing() -> void:
	# string lights between start roof and roof B
	for i in 10:
		var z := 8.5 - i * 1.4
		prop(sphere(Vector3(-5.5, 3.0 + sin(i * 0.6) * 0.2, z + 3), 0.08, Mats.neon(C_AMBER, 6.0)))
		prop(sphere(Vector3(5.5, 3.0 + cos(i * 0.6) * 0.2, z + 3), 0.08, Mats.neon(C_AMBER, 6.0)))
	for p in [Vector3(-6, 0, 12), Vector3(-4, 0.8, -4), Vector3(-14, 2.0, -6), Vector3(3, 5.0, -44), Vector3(-2.5, 6.0, -58)]:
		prop_ac(p + Vector3(0, 0.35, 0))
	for p in [Vector3(6.5, 0, 16), Vector3(-10, 3.2, -22)]:
		cyl(p + Vector3(0, 0.75, 0), 0.6, 1.5, Mats.std(Color(0.3, 0.32, 0.38), 0.5, 0.6), true, 12)
	neon_text("SKY", Vector3(-8.1, 1.5, 15), -PI / 2, C_PINK, 200, 0.02, true)
	neon_text("HOTEL", Vector3(-16.6, 0.5, -8), -PI / 2, C_CYAN, 120, 0.015)
	box(Vector3(-6.5, 1.25, 22), Vector3(0.1, 2.5, 0.1), Mats.std(Color(0.3, 0.3, 0.35), 0.5, 0.7), false)
	FX.motes(self, Vector3(0, 6, -20), Vector3(20, 6, 40), Color(0.7, 0.8, 1.0), 60)

func _city_below() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 404
	for i in 40:
		var x := rng.randf_range(-110, 110)
		var z := rng.randf_range(-150, 90)
		if absf(x) < 26 and z > -72 and z < 30:
			continue
		var h := rng.randf_range(30, 80)
		var top := rng.randf_range(-40, -10)
		var w := rng.randf_range(12, 26)
		building(Vector3(x, top - h, z), Vector3(w, h, w), i, Color(0.06, 0.06, 0.12), 0.22, false)
	# a few skyscrapers that tower above the rooftops
	for p in [Vector3(-60, -40, -40), Vector3(55, -40, -80), Vector3(70, -40, 10), Vector3(-45, -40, 40)]:
		building(p, Vector3(18, 100, 18), int(p.x) & 7, Color(0.06, 0.06, 0.12), 0.18, false)
	# street glow far below
	var glow := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(400, 400)
	glow.mesh = pm
	glow.material_override = Mats.unshaded(Color(0.2, 0.08, 0.3))
	glow.position.y = -45
	add_child(glow)

func _process(delta: float) -> void:
	_t += delta
	var on := fmod(_t, 1.6) < 0.8
	for b in beacons:
		b.visible = on

func _pickups() -> void:
	var fr := [Vector3(0, 0.4, 10), Vector3(0, 1.2, 0), Vector3(-12.5, 2.4, -8), Vector3(-12, 3.6, -19), Vector3(4, 4.8, -26),
		Vector3(0, 5.4, -42), Vector3(0, 6.4, -52), Vector3(15, 2.0, -12), Vector3(6.0, 7.2, -28.0), Vector3(-3.7, 11.8, -26)]
	for i in fr.size():
		add_fragment(fr[i], i)
	add_collectible("u_wind_chime", Vector3(-6.5, 0, 20.5))
	add_collectible("r_silver_feather", Vector3(16, 1.6, -15.5))
	add_collectible("l_prism_night", Vector3(-3.7, 11.4, -29), false)
	add_note("n_rooftop_letter", Vector3(2.6, 6.6, -51), 0.0)
