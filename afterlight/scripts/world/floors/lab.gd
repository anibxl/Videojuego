extends FloorBase
## FLOOR 3 — HALCYON LABORATORY. Reception, specimen hall, the grid control
## room (power-sequence puzzle) and the sealed cold storage.
## Lighting reacts to the puzzle: red emergency light until the grid is back.

const C_TEAL := Color(0.3, 1.0, 0.85)
const C_CYAN := Color(0.2, 0.85, 1.0)
const C_YELLOW := Color(1.0, 0.85, 0.2)
const C_RED := Color(1.0, 0.22, 0.25)
const C_VIOLET := Color(0.6, 0.3, 1.0)
const H := 4.5

var power_lights: Array[OmniLight3D] = []
var ceiling_panels: Array[MeshInstance3D] = []
var cold_door: SlidingDoor
var grid_label: Label3D
var puzzle: SequencePuzzle
var _tanks: Array[Node3D] = []
var _t := 0.0

func build() -> void:
	display_name = "Halcyon Laboratory"
	ambience = "amb_cave"
	kill_y = -10.0
	setup_environment({"bg": Color(0.02, 0.03, 0.04), "ambient": Color(0.55, 0.65, 0.7), "ambient_energy": 0.55,
		"fog": Color(0.05, 0.08, 0.1), "fog_density": 0.012, "sun_energy": 0.0, "glow_strength": 0.9})
	sun.visible = false
	var floor_m := Mats.tiles(Color(0.82, 0.86, 0.88), Color(0.76, 0.8, 0.83), Color(0.45, 0.55, 0.6), 1.2, 0.2, 1.0, 0.12)
	var wall := Mats.std(Color(0.78, 0.82, 0.85), 0.6)
	var trim := Mats.std(Color(0.2, 0.26, 0.3), 0.4, 0.5)
	box(Vector3(0, -0.25, -6), Vector3(52, 0.5, 54), floor_m)
	box(Vector3(0, H + 0.2, -6), Vector3(52, 0.4, 54), Mats.std(Color(0.6, 0.64, 0.68), 0.8))
	_walls(wall)
	_reception(trim)
	_specimen_hall(trim)
	_control_room(trim)
	_cold_storage(trim)
	add_elevator(Vector3(0, 0, 23), PI, "3", C_TEAL)
	# ceiling light panels + main lights (switch with grid power)
	for p in [Vector3(0, H - 0.02, 14), Vector3(0, H - 0.02, 2), Vector3(0, H - 0.02, -12), Vector3(14, H - 0.02, -4), Vector3(-14, H - 0.02, -4), Vector3(0, H - 0.02, -26)]:
		var m := box(p, Vector3(3, 0.04, 1.2), Mats.neon(Color.WHITE, 2.0), false)
		ceiling_panels.append(m)
		power_lights.append(omni(p + Vector3(0, -0.6, 0), Color.WHITE, 1.2, 12))
	_pickups()
	_apply_power(WorldState.has_flag("lab_grid_restored"), false)

func _walls(wall: Material) -> void:
	# reception x -10..10, z 8..20.6
	box(Vector3(-6.25, H / 2, 20.3), Vector3(8.1, H, 0.6), wall)
	box(Vector3(6.25, H / 2, 20.3), Vector3(8.1, H, 0.6), wall)
	box(Vector3(0, H - 0.6, 20.3), Vector3(4.4, 1.2, 0.6), wall)
	box(Vector3(-10.3, H / 2, 14.2), Vector3(0.6, H, 12.8), wall)
	box(Vector3(10.3, H / 2, 14.2), Vector3(0.6, H, 12.8), wall)
	box(Vector3(-6.65, H / 2, 7.7), Vector3(7.3, H, 0.6), wall)
	box(Vector3(6.65, H / 2, 7.7), Vector3(7.3, H, 0.6), wall)
	# corridor x -3..3, z -20..7.4 — side openings z -6..0
	for s in [-1.0, 1.0]:
		box(Vector3(s * 3.2, H / 2, -13.0), Vector3(0.4, H, 14.0), wall)
		box(Vector3(s * 3.2, H / 2, 3.7), Vector3(0.4, H, 7.4), wall)
	# control room x -25..-3.4, z -12..4 ; specimen hall x 3.4..25, z -12..4
	for s in [-1.0, 1.0]:
		box(Vector3(s * 14.3, H / 2, -12.2), Vector3(22.2, H, 0.4), wall)
		box(Vector3(s * 14.3, H / 2, 4.2), Vector3(22.2, H, 0.4), wall)
		box(Vector3(s * 25.2, H / 2, -4), Vector3(0.4, H, 16.8), wall)
	# cold storage x -8..8, z -32..-20.4
	box(Vector3(-8.2, H / 2, -26.2), Vector3(0.4, H, 12.2), wall)
	box(Vector3(8.2, H / 2, -26.2), Vector3(0.4, H, 12.2), wall)
	box(Vector3(0, H / 2, -32.2), Vector3(16.8, H, 0.4), wall)
	box(Vector3(-5.1, H / 2, -20.2), Vector3(6.2, H, 0.4), wall)
	box(Vector3(5.1, H / 2, -20.2), Vector3(6.2, H, 0.4), wall)
	box(Vector3(0, H - 0.5, -20.2), Vector3(4, 1.0, 0.4), wall)

func _reception(trim: Material) -> void:
	box(Vector3(0, 0.55, 12), Vector3(5, 1.1, 1.2), Mats.std(Color(0.9, 0.92, 0.95), 0.3))
	box(Vector3(0, 1.12, 12), Vector3(5.1, 0.05, 1.3), Mats.neon(C_TEAL, 2.0), false)
	neon_text("HALCYON RESEARCH", Vector3(0, 3.1, 8.05), 0.0, C_TEAL, 110, 0.01)
	neon_text("Every light has a source.", Vector3(0, 2.4, 8.05), 0.0, Color(0.7, 0.8, 0.85), 40, 0.01)
	for x in [-8.0, 8.0]:
		prop_planter(Vector3(x, 0, 18.5), Color(0.25, 0.55, 0.45))
		prop_bench(Vector3(x, 0, 13), PI / 2 if x < 0 else -PI / 2)
	box(Vector3(-9.95, 2.4, 14), Vector3(0.05, 1.6, 3.0), Mats.neon(Color(0.4, 0.6, 0.7), 0.8), false)
	add_location("lab_lobby", Vector3(0, 2, 14), Vector3(18, 4, 11))

func _specimen_hall(trim: Material) -> void:
	for i in 6:
		var x := 7.0 + (i % 3) * 7.0
		var z := -8.5 if i < 3 else 0.5
		var broken := i == 4
		cyl(Vector3(x, 0.25, z), 1.1, 0.5, trim, true, 16)
		cyl(Vector3(x, H - 0.3, z), 1.1, 0.6, trim, false, 16)
		if not broken:
			var glass := cyl(Vector3(x, 2.0, z), 1.0, 3.0, Mats.glass(Color(0.3, 1.0, 0.8, 0.18)), true, 16)
			glass.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			var creature := Node3D.new()
			creature.position = Vector3(x, 2.0, z)
			add_child(creature)
			var mi := MeshInstance3D.new()
			mi.mesh = Mats.shape_mesh(["orb", "crystal", "fish", "star", "cube"][i % 5])
			mi.material_override = Mats.holo(Color(0.3, 1.0, 0.7, 0.8), 1.2)
			mi.scale = Vector3.ONE * 1.6
			creature.add_child(mi)
			_tanks.append(creature)
		else:
			for k in 5:
				var shard := box(Vector3(x + randf_range(-1.2, 1.2), 0.55, z + randf_range(-1.2, 1.2)), Vector3(0.3, 0.05, 0.2), Mats.glass(Color(0.3, 1.0, 0.8, 0.4)), false, randf() * TAU)
				prop(shard)
	omni(Vector3(14, 3, -4), C_TEAL, 1.0, 14)
	neon_text("SPECIMEN HALL", Vector3(14, 3.4, -11.95), 0.0, C_TEAL, 80, 0.01)
	# whiteboard with the clue note
	box(Vector3(24.95, 2.0, -4), Vector3(0.1, 1.6, 3.2), Mats.std(Color(0.95, 0.95, 0.95), 0.4), false)
	add_location("lab_specimen", Vector3(14, 2, -4), Vector3(20, 4, 14))

func _control_room(trim: Material) -> void:
	puzzle = SequencePuzzle.new()
	puzzle.flag = "lab_grid_restored"
	puzzle.order = ["cyan", "yellow", "red", "violet"]
	add_child(puzzle)
	# consoles deliberately placed out of order
	var layout := [["red", C_RED], ["cyan", C_CYAN], ["violet", C_VIOLET], ["yellow", C_YELLOW]]
	for i in 4:
		puzzle.add_console(layout[i][0], self, Vector3(-21 + i * 4.0, 0, -10.6), layout[i][1], 0.0)
	puzzle.solved.connect(_on_solved)
	# big wall screen
	box(Vector3(-14, 2.9, -11.95), Vector3(9, 2.2, 0.1), Mats.std(Color(0.02, 0.03, 0.05), 0.2), false)
	grid_label = neon_text("GRID OFFLINE", Vector3(-14, 2.9, -11.85), 0.0, C_RED, 110, 0.01, true)
	for p in [Vector3(-22, 0, 2), Vector3(-17, 0, 2), Vector3(-8, 0, 2)]:
		box(p + Vector3(0, 0.4, 0), Vector3(2.4, 0.8, 1.0), trim)
	neon_text("GRID CONTROL", Vector3(-3.05, 3.4, -3), PI / 2, C_TEAL, 60, 0.008)
	add_location("lab_control", Vector3(-14, 2, -4), Vector3(20, 4, 14))

func _cold_storage(trim: Material) -> void:
	cold_door = add_door(Vector3(0, 1.75, -20.2), Vector3(4, 3.5, 0.3), Mats.std(Color(0.6, 0.66, 0.72), 0.3, 0.8), Vector3(0, 3.3, 0))
	var stripe := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(4.02, 0.12, 0.32)
	stripe.mesh = bm
	stripe.material_override = Mats.neon(Color(0.5, 0.85, 1.0), 2.0)
	cold_door.add_detail(stripe)
	neon_text("COLD STORAGE", Vector3(0, 3.9, -19.95), 0.0, Color(0.6, 0.9, 1.0), 60, 0.008)
	for i in 4:
		var x := -6.0 + i * 4.0
		var pod := cyl(Vector3(x, 1.2, -30.5), 0.7, 2.4, Mats.glass(Color(0.6, 0.9, 1.0, 0.3)), true, 12)
		pod.rotation.x = 0.0
		cyl(Vector3(x, 0.1, -30.5), 0.8, 0.2, trim, false, 12)
	cyl(Vector3(0, 0.5, -25), 0.6, 1.0, trim)
	omni(Vector3(0, 3.5, -26), Color(0.6, 0.85, 1.0), 1.2, 10)
	FX.motes(self, Vector3(0, 2, -26), Vector3(7, 2, 5), Color(0.8, 0.95, 1.0), 40)
	add_location("lab_cold", Vector3(0, 2, -26), Vector3(15, 4, 10))

func _on_solved() -> void:
	_apply_power(true, true)
	if game and game.cam:
		game.cam.add_trauma(0.3)
	Events.notify("Power grid restored! Roof access is open: Floor 4.", UIKit.GOOD)

func _apply_power(on: bool, animate: bool) -> void:
	for l in power_lights:
		l.light_color = Color(0.85, 0.95, 1.0) if on else C_RED
		l.light_energy = 1.3 if on else 0.6
	for m in ceiling_panels:
		m.material_override = Mats.neon(Color(0.9, 0.97, 1.0), 2.2) if on else Mats.neon(C_RED, 0.9)
	if env:
		env.ambient_light_color = Color(0.6, 0.7, 0.75) if on else Color(0.5, 0.25, 0.3)
		env.ambient_light_energy = 0.6 if on else 0.35
	grid_label.text = "GRID ONLINE" if on else "GRID OFFLINE"
	grid_label.modulate = Color(C_TEAL.r * 2.2, C_TEAL.g * 2.2, C_TEAL.b * 2.2) if on else Color(C_RED.r * 2.2, C_RED.g * 2.2, C_RED.b * 2.2)
	if on and not cold_door.is_open:
		if animate:
			cold_door.open()
		else:
			cold_door.set_open_instant(true)

func _process(delta: float) -> void:
	_t += delta
	for i in _tanks.size():
		_tanks[i].position.y = 2.0 + sin(_t * 1.2 + i) * 0.25
		_tanks[i].rotation.y += delta * 0.4

func _pickups() -> void:
	var fr := [Vector3(-7, 0.4, 16), Vector3(0, 0.4, -2), Vector3(0, 0.4, -16), Vector3(20, 0.4, -4), Vector3(10, 0.4, -4),
		Vector3(-22, 0.4, -4), Vector3(-6, 0.4, -27), Vector3(6, 0.4, -27)]
	for i in fr.size():
		add_fragment(fr[i], i)
	add_collectible("u_visitor_badge", Vector3(-1.5, 1.12, 12))
	add_collectible("r_specimen", Vector3(14, 0.5, 0.5))
	add_collectible("e_stopped_clock", Vector3(0, 1.0, -25))
	add_note("n_lab_log1", Vector3(1.5, 1.6, 12.2), PI)
	add_note("n_lab_clue", Vector3(24.85, 2.0, -4), -PI / 2)
