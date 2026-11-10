extends FloorBase
## FLOOR 0 — AFTERLIGHT CITY. The hub: plaza with the Tower Core, the
## Central Tower and its elevator, avenues, shops, the overpass, the arcade
## roof garden, Noodle Alley (+ the Glyph Vault secret) and the sealed subway.

var tower_neon: Array[MeshInstance3D] = []
var core_orb: MeshInstance3D
var core_light: OmniLight3D
var tower_beam: MeshInstance3D
var vault_door: SlidingDoor
var glyph_nodes := {}

const C_PINK := Color(1.0, 0.32, 0.68)
const C_CYAN := Color(0.35, 0.92, 1.0)
const C_VIOLET := Color(0.62, 0.42, 1.0)
const C_AMBER := Color(1.0, 0.68, 0.3)
const C_GREEN := Color(0.35, 1.0, 0.6)

func build() -> void:
	display_name = "Afterlight City"
	ambience = "amb_city"
	kill_y = -20.0
	setup_environment({"top": Color(0.015, 0.015, 0.06), "horizon": Color(0.26, 0.09, 0.34), "glow": Color(0.1, 0.3, 0.6),
		"ambient": Color(0.38, 0.33, 0.7), "ambient_energy": 0.85, "fog": Color(0.14, 0.09, 0.26), "fog_density": 0.009, "exposure": 1.15,
		"sun_color": Color(0.55, 0.55, 0.95), "sun_energy": 0.4, "sun_dir": Vector3(-48, 30, 0)})
	_ground()
	_plaza()
	_tower()
	_streets_and_props()
	_buildings()
	_arcade_and_garden()
	_overpass()
	_noodle_alley()
	_subway()
	_skyline()
	_pickups()
	# world boundary
	for w in [[Vector3(0, 10, -77), Vector3(160, 30, 2)], [Vector3(0, 10, 77), Vector3(160, 30, 2)], [Vector3(-77, 10, 0), Vector3(2, 30, 160)], [Vector3(77, 10, 0), Vector3(2, 30, 160)]]:
		add_invisible_wall(w[0], w[1])
	FX.motes(self, Vector3(0, 3, 0), Vector3(30, 3, 30), Color(0.5, 0.8, 1.0), 70)
	Events.flag_set.connect(_on_flag)
	_refresh_tower(false)

# ------------------------------------------------------------------ ground
func _ground() -> void:
	var g := Mats.ground(Color(0.1, 0.1, 0.16), Color(0.16, 0.15, 0.24), 4.0, 0.5)
	var hole := Rect2(48, 28, 6, 16)   # subway stairwell (x, z, w, d)
	box(Vector3((-80 + hole.position.x) / 2, -0.5, 0), Vector3(hole.position.x + 80, 1, 160), g)
	box(Vector3((hole.end.x + 80) / 2, -0.5, 0), Vector3(80 - hole.end.x, 1, 160), g)
	box(Vector3(hole.get_center().x, -0.5, (-80 + hole.position.y) / 2), Vector3(hole.size.x, 1, hole.position.y + 80), g)
	box(Vector3(hole.get_center().x, -0.5, (hole.end.y + 80) / 2), Vector3(hole.size.x, 1, 80 - hole.end.y), g)
	map_bounds = Rect2(-76, -76, 152, 152)
	# avenue markings + sidewalks
	var line := Mats.std(Color(0.55, 0.52, 0.45), 0.7)
	for i in range(-7, 8):
		if absi(i) <= 1:
			continue
		box(Vector3(0, 0.01, i * 10), Vector3(0.25, 0.02, 4), line, false)
		box(Vector3(i * 10, 0.01, 0), Vector3(4, 0.02, 0.25), line, false)
	var walk := Mats.tiles(Color(0.12, 0.11, 0.18), Color(0.1, 0.1, 0.16), Color(0.05, 0.05, 0.08), 1.5, 0.6, 0.0, 0.3)
	for s in [-1, 1]:
		box(Vector3(s * 9.5, 0.02, -45), Vector3(3, 0.04, 62), walk, false)
		box(Vector3(s * 9.5, 0.02, 45), Vector3(3, 0.04, 62), walk, false)
		box(Vector3(-45, 0.02, s * 9.5), Vector3(62, 0.04, 3), walk, false)
		box(Vector3(45, 0.02, s * 9.5), Vector3(62, 0.04, 3), walk, false)

# ------------------------------------------------------------------ plaza
func _plaza() -> void:
	var tile := Mats.tiles(Color(0.16, 0.15, 0.26), Color(0.13, 0.12, 0.22), Color(0.35, 0.3, 0.7), 2.0, 0.3, 1.0, 0.2)
	var disc := cyl(Vector3(0, 0.015, 0), 15.0, 0.03, tile, false, 48)
	disc.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var ring := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 14.8
	tm.outer_radius = 15.1
	tm.rings = 64
	tm.ring_segments = 4
	ring.mesh = tm
	ring.material_override = Mats.neon(C_VIOLET, 2.0)
	ring.scale = Vector3(1, 0.1, 1)
	ring.position.y = 0.03
	add_child(ring)
	# fountain basin + Tower Core pedestal
	var stone := Mats.std(Color(0.2, 0.19, 0.3), 0.5, 0.2)
	for i in 16:
		var a := i * TAU / 16.0
		var mi := box(Vector3(cos(a) * 3.2, 0.2, sin(a) * 3.2), Vector3(1.4, 0.4, 0.5), stone, true, -a + PI / 2)
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	cyl(Vector3(0, 0.05, 0), 3.0, 0.1, Mats.std(Color(0.05, 0.06, 0.12), 0.05, 0.4), false, 32)
	cyl(Vector3(0, 0.6, 0), 0.7, 1.2, stone, true, 12)
	cyl(Vector3(0, 1.25, 0), 0.9, 0.1, Mats.neon(C_CYAN, 1.5), false, 16)
	core_orb = sphere(Vector3(0, 1.85, 0), 0.5, Mats.neon(Color(1.0, 0.25, 0.3), 1.0))
	core_light = omni(Vector3(0, 2.2, 0), Color(1.0, 0.3, 0.35), 1.6, 9.0)
	for i in 3:
		var a := i * TAU / 3.0
		var arm := box(Vector3(cos(a) * 0.75, 1.8, sin(a) * 0.75), Vector3(0.12, 1.2, 0.12), Mats.std(Color(0.5, 0.5, 0.6), 0.3, 0.9), false)
		arm.rotation.z = 0.3 * cos(a)
		arm.rotation.x = -0.3 * sin(a)
	var core := add_interactable(Vector3(0, 1.4, 0), "Tower Core", _use_core, 4.2)
	core.prompt_func = func() -> String:
		if WorldState.has_flag("tower_powered"):
			return ""
		if Inventory.fragments >= GameDB.FRAGMENTS_FOR_TOWER:
			return "Channel %d Fragments" % GameDB.FRAGMENTS_FOR_TOWER
		return "Tower Core  %d/%d" % [Inventory.fragments, GameDB.FRAGMENTS_FOR_TOWER]
	neon_text("TOWER CORE", Vector3(0, 3.0, 0), 0.0, C_CYAN, 64, 0.008)
	neon_text("TOWER CORE", Vector3(0, 3.0, 0), PI, C_CYAN, 64, 0.008)
	# benches, planters, lamps around the plaza
	for i in 8:
		var a := i * TAU / 8.0 + PI / 8
		prop_bench(Vector3(cos(a) * 11.0, 0, sin(a) * 11.0), -a - PI / 2)
	for i in 4:
		var a := i * TAU / 4.0 + PI / 4
		prop_planter(Vector3(cos(a) * 13.0, 0, sin(a) * 13.0), Color(0.25, 0.5, 0.55))
	for i in 4:
		var a := i * TAU / 4.0
		prop_lamp(Vector3(cos(a) * 15.5, 0, sin(a) * 15.5), C_AMBER, i % 2 == 0)
	add_location("city_plaza", Vector3(0, 2, 0), Vector3(26, 6, 26))
	# holographic city sign floating above the plaza
	neon_text("AFTERLIGHT", Vector3(0, 9.0, -14), 0.0, C_PINK, 220, 0.012)

func _use_core(_p: Node) -> void:
	if WorldState.has_flag("tower_powered"):
		return
	if Inventory.fragments < GameDB.FRAGMENTS_FOR_TOWER:
		Audio.play("puzzle_fail", -8.0)
		Events.notify("The core needs %d Energy Fragments. You have %d." % [GameDB.FRAGMENTS_FOR_TOWER, Inventory.fragments], UIKit.WARN)
		return
	Inventory.spend_fragments(GameDB.FRAGMENTS_FOR_TOWER)
	Audio.play("success", 0.0)
	FX.burst(self, Vector3(0, 1.9, 0), C_CYAN, 80, 9.0, 1.6)
	if game and game.cam:
		game.cam.add_trauma(0.5)
	WorldState.set_flag("tower_powered")
	Events.notify("The Central Tower hums back to life. The elevator can reach Floor 1!", UIKit.GOOD)

func _on_flag(f: String) -> void:
	if f == "tower_powered":
		_refresh_tower(true)
	elif f.begins_with("glyph_"):
		_refresh_glyphs(true)

func _refresh_tower(animate: bool) -> void:
	var on := WorldState.has_flag("tower_powered")
	var mat := Mats.neon(C_CYAN, 3.5) if on else Mats.neon(Color(0.9, 0.2, 0.3), 0.6)
	for m in tower_neon:
		m.material_override = mat
	core_orb.material_override = Mats.neon(C_CYAN if on else Color(1.0, 0.25, 0.3), 5.0 if on else 1.0)
	core_light.light_color = C_CYAN if on else Color(1.0, 0.3, 0.35)
	core_light.light_energy = 2.5 if on else 1.2
	tower_beam.visible = on
	if animate and on:
		tower_beam.scale = Vector3(0.1, 1, 0.1)
		var tw := create_tween()
		tw.tween_property(tower_beam, "scale", Vector3.ONE, 1.5).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)

# ------------------------------------------------------------------ central tower
func _tower() -> void:
	var cx := 0.0
	var cz := -40.0
	var wall := Mats.std(Color(0.09, 0.08, 0.16), 0.4, 0.5)
	var dark := Mats.std(Color(0.05, 0.05, 0.1), 0.6, 0.3)
	# lobby shell (18 x 18, 8 high) with a 6 m wide entrance on the south face
	box(Vector3(cx, 4, cz - 9), Vector3(18, 8, 0.6), wall)
	box(Vector3(cx - 9, 4, cz), Vector3(0.6, 8, 18), wall)
	box(Vector3(cx + 9, 4, cz), Vector3(0.6, 8, 18), wall)
	box(Vector3(cx - 6, 4, cz + 9), Vector3(6, 8, 0.6), wall)
	box(Vector3(cx + 6, 4, cz + 9), Vector3(6, 8, 0.6), wall)
	box(Vector3(cx, 7, cz + 9), Vector3(6, 2, 0.6), wall)
	box(Vector3(cx, 0.02, cz), Vector3(17.4, 0.04, 17.4), Mats.tiles(Color(0.1, 0.09, 0.18), Color(0.08, 0.07, 0.15), Color(0.4, 0.3, 0.9), 1.5, 0.15, 1.0, 0.05), false)
	box(Vector3(cx, 8.1, cz), Vector3(18, 0.3, 18), dark)
	# the tower body above the lobby (visual + collision)
	box(Vector3(cx, 8.3 + 41, cz), Vector3(14, 82, 14), Mats.building(5, Color(0.06, 0.06, 0.12), 0.12))
	for y in [20.0, 40.0, 60.0, 80.0]:
		box(Vector3(cx, y, cz), Vector3(15, 0.6, 15), dark, false)
	# vertical neon spines (state = tower power)
	for p in [Vector3(-7.1, 49, -7.1), Vector3(7.1, 49, -7.1), Vector3(-7.1, 49, 7.1), Vector3(7.1, 49, 7.1)]:
		var m := box(Vector3(cx + p.x, p.y, cz + p.z), Vector3(0.3, 82, 0.3), Mats.neon(C_CYAN), false)
		tower_neon.append(m)
	var crown := box(Vector3(cx, 91, cz), Vector3(10, 1.2, 10), Mats.neon(C_CYAN), false)
	tower_neon.append(crown)
	var entrance := box(Vector3(cx, 6.1, cz + 9.35), Vector3(6.4, 0.15, 0.1), Mats.neon(C_CYAN), false)
	tower_neon.append(entrance)
	neon_text("CENTRAL TOWER", Vector3(cx, 7.0, cz + 9.4), 0.0, C_CYAN, 80, 0.01)
	tower_beam = MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 2.5
	cm.bottom_radius = 1.2
	cm.height = 160
	cm.cap_top = false
	cm.cap_bottom = false
	cm.radial_segments = 16
	tower_beam.mesh = cm
	tower_beam.material_override = Mats.beam(C_CYAN, 0.35)
	tower_beam.position = Vector3(cx, 92 + 80, cz)
	tower_beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(tower_beam)
	# lobby interior
	omni(Vector3(cx, 6, cz + 2), Color(0.6, 0.7, 1.0), 1.4, 12)
	for s in [-1, 1]:
		box(Vector3(cx + s * 8.6, 3, cz), Vector3(0.1, 5, 0.15), Mats.neon(C_VIOLET, 2.0), false)
		prop_planter(Vector3(cx + s * 6.5, 0, cz + 6), Color(0.2, 0.45, 0.5))
	add_elevator(Vector3(cx, 0, cz - 5.6), 0.0, "0")
	add_location("city_tower", Vector3(cx, 2, cz + 1), Vector3(16, 6, 12))

# ------------------------------------------------------------------ streets
func _streets_and_props() -> void:
	prop_car(Vector3(5.5, 0, 26), 0.05, Color(0.5, 0.15, 0.25))
	prop_car(Vector3(-5.5, 0, -22), PI + 0.1, Color(0.15, 0.2, 0.45))
	prop_car(Vector3(32, 0, 5.2), PI / 2, Color(0.2, 0.2, 0.25))
	prop_car(Vector3(-36, 0, -5.4), -PI / 2 + 0.2, Color(0.55, 0.45, 0.2))
	prop_car(Vector3(58, 0, -5.4), -PI / 2, Color(0.1, 0.35, 0.35))
	for x in [-60, -28, 24, 56]:
		prop_lamp(Vector3(x, 0, -10.8), C_AMBER)
		prop_lamp(Vector3(x + 8, 0, 10.8), C_AMBER)
	for z in [-60, 24, 50]:
		prop_lamp(Vector3(-10.8, 0, z), C_AMBER)
		prop_lamp(Vector3(10.8, 0, z + 6), C_AMBER)
	for p in [Vector3(14, 0, -40), Vector3(-14, 0, 40), Vector3(40, 0, -12)]:
		prop_barrier(p, randf() * 0.4)
	prop_vending(Vector3(12.2, 0, 14.5), PI / 2, C_PINK)
	prop_vending(Vector3(-12.2, 0, -14.5), -PI / 2, C_CYAN)

# ------------------------------------------------------------------ buildings
func _buildings() -> void:
	var lots := [
		# x, z, w, d, h, seed
		[-56, -24, 14, 14, 40, 1], [-30, -46, 22, 18, 55, 2], [-58, -52, 18, 22, 30, 3], [-22, -64, 14, 14, 48, 4],
		[24, -22, 16, 14, 34, 6], [48, -24, 20, 16, 46, 7], [30, -50, 20, 20, 60, 0], [60, -55, 16, 22, 38, 1], [22, -67, 14, 12, 30, 2],
		[21, 38, 14, 20, 24, 3], [45, 17, 22, 10, 28, 4], [40, 32, 12, 16, 20, 5], [64, 22, 14, 16, 36, 6], [64, 56, 20, 18, 44, 7], [32, 63, 22, 14, 30, 0],
		[-24, 22, 16, 14, 26, 1], [-30, 50, 22, 18, 40, 2], [-62, 26, 14, 18, 50, 3], [-62, 58, 18, 20, 30, 4]
	]
	for l in lots:
		if l[2] == 0:
			continue
		building(Vector3(l[0], 0, l[1]), Vector3(l[2], l[4], l[3]), l[5])
	# Noodle 24 building (shop on its north face)
	building(Vector3(22, 0, 19), Vector3(16, 18, 14), 5, Color(0.08, 0.06, 0.12), 0.3)
	prop_shopfront(Vector3(22, 0, 11.9), PI, "NOODLE 24", C_PINK, 12)
	prop_shopfront(Vector3(-24, 0, 14.9), PI, "ECHO RECORDS", C_GREEN, 12)
	prop_shopfront(Vector3(24, 0, -14.9), 0.0, "LUNA PHARMACY", C_CYAN, 12)
	prop_shopfront(Vector3(48, 0, -15.9), 0.0, "KIOSK 7", C_AMBER, 10)
	prop_shopfront(Vector3(-56, 0, -16.9), 0.0, "HOTEL ORBIT", C_VIOLET, 10)
	prop_shopfront(Vector3(45, 0, 11.9), PI, "MIDNIGHT LAUNDRY", C_CYAN, 14)
	prop_shopfront(Vector3(-30, 0, 40.9), PI, "STAR CINEMA", C_PINK, 14)
	# billboard neon on tall facades
	neon_text("HALCYON", Vector3(-30, 30, -36.9), 0.0, C_CYAN, 200, 0.02, true)
	neon_text("NIGHT", Vector3(48, 26, -15.9), 0.0, C_PINK, 200, 0.02)
	neon_text("OPEN 24/7", Vector3(64, 18, 13.9), PI, C_AMBER, 140, 0.015, true)
	neon_text("DREAM", Vector3(-62, 32, 16.9), PI, C_VIOLET, 200, 0.02)
	for b in [[Vector3(-48.9, 10, -24), PI / 2], [Vector3(14.9, 9, 38), -PI / 2], [Vector3(55.9, 12, 17), -PI / 2]]:
		neon_bar(b[0], Vector3(0.1, 8, 1.6), [C_PINK, C_CYAN, C_VIOLET][randi() % 3], 2.5)
	for p in [Vector3(-48.6, 4, -20), Vector3(-48.6, 7, -26), Vector3(14.6, 5, 33), Vector3(14.6, 8, 42), Vector3(51.6, 6, 30)]:
		prop_ac(p, PI / 2)

# ------------------------------------------------------------------ arcade + roof garden (hidden)
func _arcade_and_garden() -> void:
	var c := Vector3(-24, 0, -20)
	box(c + Vector3(0, 3, 0), Vector3(20, 6, 12), Mats.building(3, Color(0.1, 0.07, 0.16), 0.0))
	prop_shopfront(Vector3(-24, 0, -13.9), 0.0, "PIXEL ARCADE", C_VIOLET, 16)
	neon_bar(Vector3(-24, 5.6, -13.9), Vector3(20, 0.15, 0.15), C_PINK, 3.0)
	# fire escape on the east wall: platforms rising 1.2 m each
	var metal := Mats.std(Color(0.2, 0.2, 0.26), 0.5, 0.8)
	var rail := Mats.neon(Color(0.9, 0.5, 0.2), 1.2)
	for i in 4:
		var h := 1.2 * (i + 1)
		var z := -15.5 - i * 2.5
		box(Vector3(-13.3, h - 0.08, z), Vector3(1.4, 0.16, 2.2), metal)
		box(Vector3(-12.62, h + 0.45, z), Vector3(0.05, 0.05, 2.2), rail, false)
	prop_crate(Vector3(-12.6, 0, -12.6), 0.9)
	# roof: Rooftop Garden
	var roof_y := 6.0
	box(c + Vector3(0, roof_y + 0.02, 0), Vector3(19.6, 0.04, 11.6), Mats.tiles(Color(0.16, 0.14, 0.12), Color(0.13, 0.12, 0.1), Color(0.07, 0.06, 0.05), 1.0, 0.8, 1.0, 0.3), false)
	for x in [-31, -27, -21, -17]:
		prop_planter(Vector3(x, roof_y, -23.5), Color(0.25, 0.6, 0.4))
	prop_bench(Vector3(-24, roof_y, -17), PI)
	for i in 6:
		var x := -33.0 + i * 3.6
		var bulb := sphere(Vector3(x, roof_y + 2.4 + sin(i) * 0.15, -14.6), 0.09, Mats.neon(C_AMBER, 6.0))
		prop(bulb)
	box(Vector3(-24, roof_y + 2.4, -14.6), Vector3(18, 0.02, 0.02), Mats.std(Color(0.1, 0.1, 0.1)), false)
	omni(Vector3(-24, roof_y + 2, -19), C_AMBER, 1.0, 9.0)
	# billboard on the roof carrying Glyph 2
	box(Vector3(-32, roof_y + 2.5, -25.4), Vector3(5, 3.5, 0.3), Mats.std(Color(0.08, 0.08, 0.14), 0.7))
	_glyph("glyph_2", Vector3(-32, roof_y + 2.6, -25.2), 0.0, 2)
	add_location("city_garden", c + Vector3(0, roof_y + 1.5, 0), Vector3(18, 3, 10))

# ------------------------------------------------------------------ overpass (hidden underside)
func _overpass() -> void:
	var x := -44.0
	var concrete := Mats.std(Color(0.16, 0.15, 0.22), 0.85)
	box(Vector3(x, 5.75, 0), Vector3(6, 0.5, 28), concrete)
	box(Vector3(x - 3.05, 6.6, 0), Vector3(0.1, 1.2, 28), Mats.glass(Color(0.4, 0.7, 1.0, 0.2)))
	box(Vector3(x + 3.05, 6.6, 0), Vector3(0.1, 1.2, 28), Mats.glass(Color(0.4, 0.7, 1.0, 0.2)))
	neon_bar(Vector3(x - 3.1, 5.45, 0), Vector3(0.1, 0.1, 28), C_CYAN, 2.5)
	neon_bar(Vector3(x + 3.1, 5.45, 0), Vector3(0.1, 0.1, 28), C_CYAN, 2.5)
	for z in [-9.0, 9.0]:
		cyl(Vector3(x - 2.0, 2.75, z), 0.5, 5.5, concrete, true, 10)
		cyl(Vector3(x + 2.0, 2.75, z), 0.5, 5.5, concrete, true, 10)
	# ramps at both ends (visual slab + collision slope)
	slope(Vector3(x, 0, 30), Vector3(x, 6.0, 14), 6.0, concrete)
	slope(Vector3(x, 0, -30), Vector3(x, 6.0, -14), 6.0, concrete)
	neon_text("SKYWALK 3", Vector3(x, 7.6, 14.2), 0.0, C_CYAN, 70, 0.01)
	# underside: dim, graffiti, Glyph 1 on the inner pillar face
	omni(Vector3(x, 3, 0), Color(0.4, 0.3, 0.9), 0.8, 7)
	prop_crate(Vector3(x - 1.5, 0, 3), 1.0, 0.3)
	prop_crate(Vector3(x + 1.2, 0, -4), 0.8, 0.8)
	_glyph("glyph_1", Vector3(x - 1.45, 2.0, -9.0), PI / 2, 1)
	add_location("city_overpass", Vector3(x, 2.2, 0), Vector3(5, 4.4, 16))

# ------------------------------------------------------------------ noodle alley + glyph vault
func _noodle_alley() -> void:
	var wall := Mats.building(6, Color(0.08, 0.06, 0.11), 0.05)
	# alley between x 30..34, z 12..40 — west side is the Noodle building / B2, east side B3/B4
	box(Vector3(36.0, 6, 23.0), Vector3(4, 12, 4.0), wall)   # closes gap between laundry block and B3
	box(Vector3(29.0, 5, 27.0), Vector3(2.0, 10, 2.0), wall)    # gap filler between noodle bldg and B2
	# Vault room x 28..36, z 40..48
	var vwall := Mats.std(Color(0.1, 0.08, 0.16), 0.6, 0.2)
	box(Vector3(36.3, 3, 44), Vector3(0.6, 6, 8.6), vwall)
	box(Vector3(32, 3, 48.3), Vector3(9, 6, 0.6), vwall)
	box(Vector3(27.7, 3, 44), Vector3(0.6, 6, 8.6), vwall)
	box(Vector3(29.0, 3, 40), Vector3(2.0, 6, 0.6), vwall)
	box(Vector3(35.0, 3, 40), Vector3(2.0, 6, 0.6), vwall)
	box(Vector3(32, 5, 40), Vector3(4, 2, 0.6), vwall)
	box(Vector3(32, 6.2, 44), Vector3(9, 0.4, 9), vwall)
	box(Vector3(32, 0.02, 44), Vector3(8, 0.04, 8), Mats.tiles(Color(0.1, 0.05, 0.16), Color(0.14, 0.06, 0.2), Color(0.8, 0.3, 1.0), 1.0, 0.2, 1.0, 0.0), false)
	vault_door = add_door(Vector3(32, 2.0, 40.0), Vector3(4, 4, 0.3), Mats.std(Color(0.2, 0.19, 0.24), 0.7, 0.6), Vector3(0, 3.9, 0))
	var grime := MeshInstance3D.new()
	var gm := BoxMesh.new()
	gm.size = Vector3(3.6, 0.08, 0.32)
	grime.mesh = gm
	grime.material_override = Mats.neon(Color(0.6, 0.3, 0.9), 0.8)
	grime.position.y = 1.2
	vault_door.add_detail(grime)
	# vault interior
	for i in 6:
		var a := i * TAU / 6.0
		neon_bar(Vector3(32 + cos(a) * 3.6, 3.0, 44 + sin(a) * 3.6), Vector3(0.08, 3.5, 0.08), C_VIOLET, 3.0)
	omni(Vector3(32, 4.5, 44), C_VIOLET, 1.6, 8)
	cyl(Vector3(32, 0.5, 45), 0.6, 1.0, Mats.std(Color(0.15, 0.1, 0.25), 0.3, 0.5))
	add_collectible("e_neon_crown", Vector3(32, 1.0, 45), true)
	add_location("city_glyph_vault", Vector3(32, 2.5, 44.5), Vector3(7, 5, 7))
	# alley dressing
	for z in [16.0, 24.0, 33.0]:
		prop_pipe(Vector3(30.1, 0.5, z), Vector3(30.1, 9, z), 0.12)
	box(Vector3(31.0, 0.7, 18), Vector3(1.6, 1.4, 2.6), Mats.std(Color(0.1, 0.25, 0.2), 0.7, 0.3))   # dumpster
	box(Vector3(33.2, 0.6, 30), Vector3(1.4, 1.2, 2.0), Mats.std(Color(0.25, 0.12, 0.1), 0.7, 0.3))
	prop_crate(Vector3(33, 0, 36), 0.9, 0.4)
	neon_text("24", Vector3(30.05, 4.0, 22), PI / 2, C_PINK, 160, 0.012, true)
	neon_text("NO EXIT", Vector3(32, 4.6, 39.65), PI, Color(1.0, 0.3, 0.3), 60, 0.01)
	omni(Vector3(32, 4, 20), C_PINK, 0.9, 8)
	omni(Vector3(32, 4, 34), Color(0.4, 0.3, 0.9), 0.7, 7)
	var steam := FX.motes(self, Vector3(31.2, 1.6, 18), Vector3(0.6, 0.6, 1.0), Color(0.7, 0.7, 0.8), 30)
	steam.gravity = Vector3(0, 0.4, 0)
	_glyph("glyph_3", Vector3(33.95, 2.2, 27.0), -PI / 2, 3)
	add_location("city_noodle_alley", Vector3(32, 2, 28), Vector3(4, 5, 18))
	_refresh_glyphs(false)

func _glyph(flag: String, pos: Vector3, rot_y: float, n: int) -> void:
	var root := Node3D.new()
	root.position = pos
	root.rotation.y = rot_y
	add_child(root)
	var ring := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.42
	tm.outer_radius = 0.5
	tm.rings = 24
	tm.ring_segments = 6
	ring.mesh = tm
	ring.rotation.x = PI / 2
	root.add_child(ring)
	var core := MeshInstance3D.new()
	var pm := PrismMesh.new()
	pm.size = Vector3(0.45, 0.5, 0.05)
	core.mesh = pm
	core.rotation.z = PI if n == 2 else 0.0
	root.add_child(core)
	for i in n:
		var dot := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.05
		sm.height = 0.1
		dot.mesh = sm
		dot.position = Vector3(-0.15 + i * 0.15, -0.7, 0)
		root.add_child(dot)
	glyph_nodes[flag] = root
	var it := Interactable.new()
	it.radius = 2.4
	it.prompt_func = func() -> String: return "" if WorldState.has_flag(flag) else "Touch the Glyph"
	it.action = func(_p):
		if WorldState.has_flag(flag):
			return
		Audio.play("puzzle_ok", -2.0)
		FX.burst(self, root.global_position, C_VIOLET, 30, 4.0)
		var count := 0
		for g in ["glyph_1", "glyph_2", "glyph_3"]:
			if WorldState.has_flag(g) or g == flag:
				count += 1
		Events.notify("Glyph %d of 3 awakened." % count if count < 3 else "All three glyphs glow. Somewhere, a door unlocks...", C_VIOLET)
		WorldState.set_flag(flag)
	root.add_child(it)
	root.add_to_group("scannable_static")

func _refresh_glyphs(animate: bool) -> void:
	for flag in glyph_nodes:
		var on := WorldState.has_flag(flag)
		var mat := Mats.neon(C_VIOLET if on else Color(0.35, 0.25, 0.6), 4.0 if on else 0.9)
		for c in glyph_nodes[flag].get_children():
			if c is MeshInstance3D:
				c.material_override = mat
	var all := WorldState.has_flag("glyph_1") and WorldState.has_flag("glyph_2") and WorldState.has_flag("glyph_3")
	if vault_door and all and not vault_door.is_open:
		if animate:
			vault_door.open()
		else:
			vault_door.set_open_instant(true)

# ------------------------------------------------------------------ subway stairwell (hidden)
func _subway() -> void:
	var tile := Mats.tiles(Color(0.7, 0.72, 0.78), Color(0.6, 0.62, 0.7), Color(0.2, 0.2, 0.25), 0.6, 0.4, 0.0, 0.5)
	var dark := Mats.std(Color(0.12, 0.12, 0.16), 0.8)
	# walls around the hole x 48..54, z 28..44, down to y = -5
	box(Vector3(47.8, -2.5, 36), Vector3(0.4, 5, 16), tile)
	box(Vector3(54.2, -2.5, 36), Vector3(0.4, 5, 16), tile)
	box(Vector3(51, -2.5, 44.2), Vector3(6.8, 5, 0.4), dark)
	box(Vector3(51, -5.25, 41), Vector3(6, 0.5, 6), Mats.tiles(Color(0.2, 0.2, 0.24), Color(0.17, 0.17, 0.2), Color(0.1, 0.1, 0.12), 1.0, 0.6, 1.0, 0.5))
	stairs(Vector3(51, -5.0, 38), Vector3(0, 0, -1), 10, 0.5, 1.0, 5.9, dark)
	# railings on three sides at street level (open to the north)
	var rail := Mats.std(Color(0.3, 0.3, 0.35), 0.4, 0.8)
	box(Vector3(47.7, 0.55, 36), Vector3(0.08, 1.1, 16), rail)
	box(Vector3(54.3, 0.55, 36), Vector3(0.08, 1.1, 16), rail)
	box(Vector3(51, 0.55, 44.3), Vector3(6.6, 1.1, 0.08), rail)
	neon_text("LINE 7", Vector3(51, 3.0, 27.6), PI, Color(0.95, 0.8, 0.2), 110, 0.012)
	box(Vector3(51, 2.0, 27.7), Vector3(0.12, 4.0, 0.12), rail, false)
	# sealed gate at the bottom
	for i in 8:
		box(Vector3(48.6 + i * 0.7, -2.6, 43.9), Vector3(0.08, 4.8, 0.08), rail, false)
	neon_text("CLOSED", Vector3(51, -1.8, 43.8), PI, Color(1.0, 0.25, 0.3), 70, 0.01, true)
	omni(Vector3(51, -2.5, 40), Color(0.9, 0.85, 0.6), 0.9, 7)
	add_location("city_subway", Vector3(51, -3.0, 40), Vector3(6, 4, 7))

# ------------------------------------------------------------------ distant skyline (no collision)
func _skyline() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 77
	for i in 34:
		var a := i * TAU / 34.0 + rng.randf() * 0.1
		var r := rng.randf_range(100, 150)
		var h := rng.randf_range(30, 110)
		var w := rng.randf_range(14, 26)
		building(Vector3(cos(a) * r, 0, sin(a) * r), Vector3(w, h, w), i, Color(0.06, 0.06, 0.12), 0.18, false)

# ------------------------------------------------------------------ pickups
func _pickups() -> void:
	var fr := [
		Vector3(0, 0.4, 9), Vector3(0, 0.4, -21), Vector3(30, 0.4, 0), Vector3(-28, 0.4, 0), Vector3(0, 0.4, 30),
		Vector3(-44, 6.4, -6), Vector3(-44, 6.4, 6), Vector3(-44, 0.4, 0), Vector3(-13.3, 5.3, -23.0), Vector3(-28, 6.4, -20),
		Vector3(32, 0.4, 26), Vector3(51, -4.6, 41), Vector3(0, 0.4, -58), Vector3(60, 0.4, 0), Vector3(-60, 0.4, 0), Vector3(0, 0.4, 60),
	]
	for i in fr.size():
		add_fragment(fr[i], i)
	add_collectible("c_paper_crane", Vector3(-9.5, 0, 5.5))
	add_collectible("c_transit_token", Vector3(51, -5.0, 42.5))
	add_collectible("u_snowglobe", Vector3(-24, 6.0, -21.5), false)
	add_note("n_last_shift", Vector3(4.2, 0.9, -1.5), PI * 0.35)
	add_note("n_glyph_rumor", Vector3(-44, 6.9, 0), PI / 2)
