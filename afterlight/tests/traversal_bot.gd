extends Node
## Traversal QA bot: drives the real player with joystick input + jumps
## (no teleporting mid-route) to prove every required jump is physically
## possible with the game's movement values.
## Run: godot --headless --fixed-fps 60 res://tests/traversal_bot.tscn

var game: Game
var fails := 0
var passes := 0

func _ready() -> void:
	SaveSystem.delete_save()
	WorldState.set_flag("intro_seen")
	# unlock every floor so the bot can ride the elevator
	WorldState.set_flag("tower_powered")
	WorldState.set_flag("lab_grid_restored")
	game = load("res://scenes/main/game.tscn").instantiate()
	add_child(game)
	await get_tree().create_timer(0.5).timeout
	await run()
	print("\n==== TRAVERSAL: %d passed, %d failed ====" % [passes, fails])
	SaveSystem.delete_save()
	get_tree().quit(1 if fails > 0 else 0)

func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame

## Runs toward `dir` from `start`, jumps after `run_up` metres, optionally
## releases the stick `release` seconds after take-off, and checks the
## landing height.
func attempt(label: String, start: Vector3, dir: Vector2, run_up: float, expect_top: float, run := true, release := -1.0) -> void:
	var p := game.player
	p.teleport(Transform3D(Basis(), start + Vector3(0, 0.05, 0)))
	await frames(12)
	var d := Vector3(dir.x, 0, dir.y).normalized()
	game.cam.yaw = atan2(-d.x, -d.z)
	InputState.move = Vector2(0, -1)
	InputState.run_held = run
	var origin := p.global_position
	var jumped := false
	var t_air := 0.0
	for i in 300:
		await get_tree().physics_frame
		game.cam.yaw = atan2(-d.x, -d.z)
		var trav := Vector2(p.global_position.x - origin.x, p.global_position.z - origin.z).length()
		if not jumped and trav >= run_up:
			InputState.jump_pressed = true
			jumped = true
		if jumped:
			t_air += 1.0 / 60.0
			if release > 0.0 and t_air >= release:
				InputState.move = Vector2.ZERO
			if t_air > 0.25 and p.is_on_floor():
				break
	InputState.move = Vector2.ZERO
	InputState.run_held = false
	await frames(20)
	var y := p.global_position.y
	var ok := absf(y - expect_top) < 0.3
	if ok: passes += 1
	else: fails += 1
	print("  %s  %-34s landed y=%.2f (expected %.2f)" % ["PASS" if ok else "FAIL", label, y, expect_top])

func walk(label: String, start: Vector3, dir: Vector2, distance: float, expect_y: float) -> void:
	var p := game.player
	p.teleport(Transform3D(Basis(), start + Vector3(0, 0.05, 0)))
	await frames(12)
	var d := Vector3(dir.x, 0, dir.y).normalized()
	var origin := p.global_position
	InputState.move = Vector2(0, -1)
	for i in 400:
		game.cam.yaw = atan2(-d.x, -d.z)
		await get_tree().physics_frame
		if Vector2(p.global_position.x - origin.x, p.global_position.z - origin.z).length() >= distance:
			break
	InputState.move = Vector2.ZERO
	await frames(20)
	var ok := absf(p.global_position.y - expect_y) < 0.3
	if ok: passes += 1
	else: fails += 1
	print("  %s  %-34s reached y=%.2f (expected %.2f)" % ["PASS" if ok else "FAIL", label, p.global_position.y, expect_y])

func run() -> void:
	print("== City: arcade fire escape -> Rooftop Garden")
	await attempt("ground -> fire escape 1", Vector3(-10.6, 0, -15.5), Vector2(-1, 0), 0.2, 1.2, false, 0.32)
	await attempt("fire escape 1 -> 2", Vector3(-13.3, 1.2, -15.0), Vector2(0, -1), 0.3, 2.4, false, 0.2)
	await attempt("fire escape 2 -> 3", Vector3(-13.3, 2.4, -17.5), Vector2(0, -1), 0.3, 3.6, false, 0.2)
	await attempt("fire escape 3 -> 4", Vector3(-13.3, 3.6, -20.0), Vector2(0, -1), 0.3, 4.8, false, 0.2)
	await attempt("fire escape 4 -> roof garden", Vector3(-13.0, 4.8, -23.0), Vector2(-1, 0), 0.2, 6.0, false, 0.3)
	await walk("overpass ramp up", Vector3(-44, 0, 31), Vector2(0, -1), 18.0, 6.0)
	await walk("subway stairs down", Vector3(51, 0, 27), Vector2(0, 1), 13.0, -5.0)
	print("== Mall: escalators")
	await game.travel_to("mall")
	print("  floor: ", game.current_floor.floor_id)
	await walk("east escalator up", Vector3(11.5, 0, 10), Vector2(0, -1), 25.0, 5.0)
	await walk("west escalator up", Vector3(-11.5, 0, -10), Vector2(0, 1), 25.0, 5.0)
	await attempt("jump into fountain basin", Vector3(0, 0, 6.5), Vector2(0, -1), 1.2, 0.06, false, 0.3)
	print("== Rooftops: Skyrunner route")
	await game.travel_to("rooftops")
	print("  floor: ", game.current_floor.floor_id)
	await attempt("A -> B", Vector3(0, 0, 11), Vector2(0, -1), 2.7, 0.8)
	await attempt("B -> C", Vector3(3, 0.8, -5), Vector2(-1, 0), 8.7, 2.0)
	await attempt("C -> D", Vector3(-10, 2.0, -5), Vector2(0, -1), 6.7, 3.2)
	await attempt("D -> E", Vector3(-4.5, 3.2, -14), Vector2(0, -1), 7.2, 4.4)
	await attempt("E -> F", Vector3(-3.5, 4.4, -25), Vector2(0, -1), 8.7, 5.0)
	await attempt("F -> G", Vector3(-2, 5.0, -38), Vector2(0, -1), 7.7, 6.0)
	await walk("G -> Summit ramp", Vector3(0, 6.0, -49.6), Vector2(0, -1), 13.0, 10.0)
	await attempt("B -> pigeon coop roof (hard)", Vector3(0, 0.8, -2.5), Vector2(1, 0), 5.7, 1.6)
	print("== Rooftops: water tower climb")
	await attempt("E -> step 1", Vector3(3.6, 4.4, -25.5), Vector2(1, 0), 0.4, 5.6, false, 0.25)
	await attempt("step 1 -> 2", Vector3(6, 5.6, -25.0), Vector2(0, -1), 0.3, 6.8, false, 0.3)
	await attempt("step 2 -> 3", Vector3(6, 6.8, -27.5), Vector2(0, -1), 0.3, 8.0, false, 0.3)
	await attempt("step 3 -> 4", Vector3(6, 8.0, -30.0), Vector2(0, -1), 0.3, 9.2, false, 0.3)
	await attempt("step 4 -> 5", Vector3(6, 9.2, -33.3), Vector2(-0.78, -0.62), 0.2, 10.4, false, 0.35)
	await attempt("step 5 -> water tower catwalk", Vector3(3.5, 10.4, -35.3), Vector2(-0.47, 0.88), 0.3, 11.4, false, 0.4)
	print("  info: player at ", game.player.global_position, " shard collected: ", Inventory.has_item("l_prism_night") or WorldState.is_collected("item_l_prism_night"))
