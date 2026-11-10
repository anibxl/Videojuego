extends Node
## AFTERLIGHT automated end-to-end test.
## Plays the whole first chapter headlessly: movement, pickups, the Tower
## Core, every elevator floor, all three challenges, secrets, the finale,
## the apartment, every menu, settings, and a save -> reset -> load cycle.
##
## Run:  godot --headless --fixed-fps 60 res://tests/test_runner.tscn

var fails := 0
var passes := 0
var game: Game

func _ready() -> void:
	await get_tree().process_frame
	await run()
	print("\n==== RESULT: %d passed, %d failed ====" % [passes, fails])
	get_tree().quit(1 if fails > 0 else 0)

func check(cond: bool, msg: String) -> void:
	if cond:
		passes += 1
		print("  PASS  ", msg)
	else:
		fails += 1
		print("  FAIL  ", msg)

func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame

func secs(s: float) -> void:
	await get_tree().create_timer(s, true, false, true).timeout

func find_interactable(prefix: String) -> Interactable:
	for n in get_tree().get_nodes_in_group("interactable"):
		var it := n as Interactable
		if it and it.is_inside_tree() and it.get_prompt().begins_with(prefix):
			return it
	return null

func put_player(pos: Vector3) -> void:
	game.player.teleport(Transform3D(Basis(), pos))
	await frames(6)

func run() -> void:
	print("== Fresh start")
	SaveSystem.delete_save()
	check(not SaveSystem.has_save(), "save deleted")
	game = load("res://scenes/main/game.tscn").instantiate()
	get_tree().root.add_child(game)
	await secs(0.5)
	check(game.current_floor != null and game.current_floor.floor_id == "city", "game starts in the city")
	check(game.current_floor.elevator != null, "city has an elevator")
	check(game.player.is_inside_tree(), "player spawned")
	await frames(30)
	check(game.player.is_on_floor(), "player stands on the floor (collision works)")

	print("== Movement")
	var p0 := game.player.global_position
	Input.action_press("move_forward")
	await frames(60)
	Input.action_release("move_forward")
	await frames(10)
	check(game.player.global_position.distance_to(p0) > 2.0, "player walks forward (%.2f m)" % game.player.global_position.distance_to(p0))
	InputState.move = Vector2(0, -1)
	InputState.run_held = true
	p0 = game.player.global_position
	await frames(30)
	InputState.move = Vector2.ZERO
	InputState.run_held = false
	check(game.player.global_position.distance_to(p0) > 2.0, "touch joystick + run moves the player")
	await put_player(Vector3(0, 0.1, 20))
	var y0 := game.player.global_position.y
	InputState.jump_pressed = true
	await frames(15)
	check(game.player.global_position.y > y0 + 0.8, "jump works")
	await frames(60)
	check(game.player.is_on_floor(), "player lands")

	print("== Fragments & Tower Core")
	var frag: Node3D = get_tree().get_first_node_in_group("fragments")
	var before := Inventory.fragments
	var xp_before := Progression.total_xp
	await put_player(frag.global_position - Vector3(0, 0.4, 0))
	check(Inventory.fragments == before + 1, "touching a fragment collects it")
	check(Progression.total_xp > xp_before, "fragment awards XP")
	check(WorldState.collected.size() >= 1, "collected fragment is remembered")
	check(Missions.tracked == "m_spark", "first main mission is tracked")
	Inventory.add_fragments(9)
	await put_player(Vector3(0, 0.1, 4.0))
	var core := find_interactable("Channel")
	check(core != null, "Tower Core offers to channel fragments")
	if core:
		core.interact(game.player)
	await frames(5)
	check(WorldState.has_flag("tower_powered"), "tower powered")
	check(Missions.is_completed("m_spark"), "mission Spark of Life completed")
	check(WorldState.is_floor_unlocked("mall"), "Floor 1 unlocked")
	check(not WorldState.is_floor_unlocked("lab"), "Floor 3 still locked")
	check(WorldState.floor_lock_reason("lab") != "", "locked floor explains its requirement")

	print("== City secrets")
	await put_player(Vector3(-44, 0.1, 0))
	check(WorldState.discovered_locations.has("city_overpass"), "hidden location: under the overpass")
	var glyph := find_interactable("Touch the Glyph")
	check(glyph != null, "glyph found under the overpass")
	if glyph: glyph.interact(game.player)
	await frames(2)
	var lit := 0
	for g in ["glyph_1", "glyph_2", "glyph_3"]:
		if WorldState.has_flag(g): lit += 1
	check(lit == 1, "touching a glyph lights it")
	for g in ["glyph_1", "glyph_2", "glyph_3"]:
		WorldState.set_flag(g)
	await secs(1.2)
	check(Missions.is_completed("s_glyphs"), "Neon Glyphs side mission completed")
	await put_player(Vector3(32, 0.1, 30))
	check(WorldState.discovered_locations.has("city_noodle_alley"), "hidden location: noodle alley")
	await put_player(Vector3(32, 0.1, 44))
	check(WorldState.discovered_locations.has("city_glyph_vault"), "secret glyph vault reachable (door opened)")
	await put_player(Vector3(32, 0.1, 45))
	check(Inventory.has_item("e_neon_crown"), "Epic Neon Crown collected")
	Inventory.equip("hat", "e_neon_crown")
	await frames(2)
	check(game.player.model.hat_socket.get_child_count() > 0, "cosmetic crown appears on the player")
	await put_player(Vector3(51, -4.9, 40))
	check(WorldState.discovered_locations.has("city_subway"), "hidden location: subway stairs")

	print("== Elevator -> Floor 1 Mall")
	await put_player(game.current_floor.elevator.spawn_transform().origin)
	await game.travel_to("mall")
	await secs(0.5)
	check(game.current_floor.floor_id == "mall", "arrived at the Mall")
	check(game.current_floor.elevator.door_l.is_open, "elevator doors opened on arrival")
	check(game.player.controls_enabled, "controls restored after travel")
	await put_player(Vector3(6, 0.1, 3))
	check(Missions.is_completed("m_mall"), "Echoes of Commerce completed")
	var lf := find_interactable("Start Lost & Found")
	check(lf != null, "Lost & Found desk available")
	if lf:
		lf.interact(game.player)
		await frames(3)
		for p in game.current_floor.lost_found.spots:
			await put_player(p + Vector3(0, 0.1, 0))
		await frames(5)
	check(WorldState.has_flag("challenge_lostfound"), "Lost & Found challenge completed")
	check(Inventory.has_item("r_lumi_plush"), "challenge reward granted")
	await put_player(Vector3(-27.5, 5.1, 15.5))
	var vm := find_interactable("Push the Vending Machine")
	check(vm != null, "vending machine secret interactable")
	if vm: vm.interact(game.player)
	await secs(1.5)
	await put_player(Vector3(-35, 5.1, 15.5))
	await put_player(Vector3(-44, 5.1, 16))
	check(WorldState.discovered_locations.has("mall_staff"), "staff corridor reachable after pushing the machine")
	check(Inventory.has_item("l_prism_dawn"), "Legendary Prism Shard Dawn collected")

	print("== Progression gating")
	Progression.add_xp(800, "test")
	check(Progression.level >= 3, "levelled up to %d" % Progression.level)
	check(WorldState.is_floor_unlocked("underground"), "Floor 2 unlocked by level")

	print("== Floor 2 Underground")
	await put_player(game.current_floor.elevator.spawn_transform().origin)
	await game.travel_to("underground")
	await secs(0.5)
	check(game.current_floor.floor_id == "underground", "arrived Underground")
	check(game.player.model.lamp.visible, "headlamp enabled on dark floor")
	await put_player(Vector3(13.5, 0.1, 7.5))
	check(Inventory.has_item("r_lab_keycard"), "Lab Keycard found in the last train")
	check(Missions.is_completed("m_keycard"), "Into the Dark completed")
	await put_player(Vector3(11.5, 0.1, -34))
	var bricks := find_interactable("Inspect Loose Bricks")
	check(bricks != null, "loose bricks found at the shrine")
	if bricks: bricks.interact(game.player)
	await frames(5)
	await put_player(Vector3(4, 0.1, -35))
	check(WorldState.discovered_locations.has("ug_walled"), "walled room reachable after breaking bricks")
	check(Inventory.has_item("l_prism_dusk"), "Prism Shard Dusk collected")

	print("== Floor 3 Laboratory")
	await put_player(game.current_floor.elevator.spawn_transform().origin)
	await game.travel_to("lab")
	await secs(0.5)
	check(game.current_floor.floor_id == "lab", "arrived at the Lab")
	var pz: SequencePuzzle = game.current_floor.puzzle
	pz.press("red")
	check(pz._progress.is_empty(), "wrong console resets the sequence")
	for id in ["cyan", "yellow", "red", "violet"]:
		pz.press(id)
	await secs(1.2)
	check(WorldState.has_flag("lab_grid_restored"), "power grid puzzle solved")
	check(game.current_floor.cold_door.is_open, "cold storage door opened")
	await put_player(Vector3(0, 0.1, -25))
	check(Inventory.has_item("e_stopped_clock"), "Epic Stopped Clock collected")
	check(WorldState.is_floor_unlocked("rooftops"), "Floor 4 unlocked")

	print("== Floor 4 Rooftops")
	await put_player(game.current_floor.elevator.spawn_transform().origin)
	await game.travel_to("rooftops")
	await secs(0.5)
	check(game.current_floor.floor_id == "rooftops", "arrived on the Rooftops")
	var pk: ParkourChallenge = game.current_floor.parkour
	pk.start()
	await put_player(Vector3(0, -20, 0))
	await frames(5)
	check(not pk.active, "falling fails the parkour run")
	await secs(0.6)
	check(game.player.global_position.y > -2.0, "player respawned after falling")
	pk.start()
	await put_player(Vector3(0, 10.1, -63))
	check(WorldState.has_flag("challenge_parkour"), "Skyrunner completed")
	check(Inventory.has_item("e_compass"), "parkour reward granted")
	check(Missions.is_completed("m_summit"), "Above It All completed (summit reached)")
	await put_player(Vector3(-3.7, 11.5, -29))
	check(Inventory.has_item("l_prism_night"), "Prism Shard Night collected on the water tower")
	check(WorldState.is_floor_unlocked("core"), "Floor 5 unlocked")

	print("== Floor 5 Core")
	await put_player(game.current_floor.elevator.spawn_transform().origin)
	await game.travel_to("core")
	await secs(0.5)
	check(game.current_floor.floor_id == "core", "arrived at the Core")
	await put_player(Vector3(0, 0.1, 2.5))
	var ped := find_interactable("Place the Prism Shards")
	check(ped != null, "pedestal accepts the shards")
	if ped: ped.interact(game.player)
	await secs(3.5)
	check(WorldState.has_flag("core_awakened"), "the Core awakened")
	await put_player(Vector3(0, 0.6, 0.3))
	await put_player(Vector3(0, 1.3, 0.8))
	check(Inventory.has_item("m_afterlight"), "Mythic The Afterlight collected")
	check(Missions.is_completed("m_afterlight"), "final main mission completed")

	print("== Apartment")
	await put_player(game.current_floor.elevator.spawn_transform().origin)
	await game.travel_to("apartment")
	await secs(0.5)
	check(game.current_floor.floor_id == "apartment", "arrived home")
	Inventory.add_fragments(30)
	for d in ["d_plant", "d_rug", "d_lamp"]:
		check(WorldState.unlock_decor(d), "unlocked decoration " + d)
		WorldState.set_decor_placed(d, true)
	await frames(2)
	check(game.current_floor.decor_nodes["d_plant"].visible, "placed decoration is visible")
	check(Missions.is_completed("c_home"), "Home Sweet Home completed")
	WorldState.set_display_slot(0, "m_afterlight")
	await frames(2)
	check(game.current_floor.stand_nodes[0].get_child_count() > 0, "artifact shown on display stand")

	print("== Menus")
	for pname in ["pause", "settings", "inventory", "collection", "missions", "profile", "map", "elevator", "room"]:
		game.hud.open_panel(pname)
		await get_tree().process_frame
		await get_tree().process_frame
		check(game.hud.has_open_panel() and get_tree().paused, "panel '%s' opens and pauses" % pname)
		game.hud._open_panel.close()
		await secs(0.3)
		check(not game.hud.has_open_panel() and not get_tree().paused, "panel '%s' closes and resumes" % pname)
	game.hud.open_panel("note", {"id": "n_last_shift"})
	await get_tree().process_frame
	check(game.hud.has_open_panel(), "note panel opens")
	game.hud._open_panel.close()
	await secs(0.3)

	print("== Settings")
	for g in [0, 2, 1]:
		Settings.graphics = g
		Settings.apply()
		await frames(2)
	check(is_equal_approx(get_viewport().scaling_3d_scale, 0.85), "graphics preset applied (medium = 0.85 scale)")
	Settings.music_volume = 0.3
	Settings.apply()
	check(absf(db_to_linear(AudioServer.get_bus_volume_db(AudioServer.get_bus_index("Music"))) - 0.3) < 0.01, "music volume applied to bus")
	var s2 := ConfigFile.new()
	check(s2.load(Settings.PATH) == OK and absf(float(s2.get_value("audio", "music")) - 0.3) < 0.001, "settings persisted to disk")

	print("== Save / Load")
	check(SaveSystem.save_game(), "save_game succeeded")
	check(FileAccess.file_exists(SaveSystem.PATH), "save file exists")
	var before_d := SaveSystem.build_save_dict()
	SaveSystem.reset_all()
	check(Progression.level == 1 and Inventory.items.is_empty(), "state reset (simulated app restart)")
	check(SaveSystem.load_game(), "load_game succeeded")
	var after_d := SaveSystem.build_save_dict()
	for k in ["progression", "inventory", "missions"]:
		check(JSON.stringify(before_d[k]) == JSON.stringify(after_d[k]), "'%s' identical after reload" % k)
	check(JSON.stringify(before_d.world.flags) == JSON.stringify(after_d.world.flags), "world flags identical after reload")
	check(after_d.version == SaveSystem.SAVE_VERSION, "save has version field")
	# corrupted main save -> backup is used
	SaveSystem.save_game()
	var f := FileAccess.open(SaveSystem.PATH, FileAccess.WRITE)
	f.store_string("{corrupt")
	f.close()
	SaveSystem.reset_all()
	check(SaveSystem.load_game() and Progression.level > 1, "corrupted save recovers from backup")

	print("== Totals")
	check(GameDB.items_by_category(["artifact", "key", "cosmetic"]).size() >= 15, "at least 15 collectibles (%d)" % GameDB.items_by_category(["artifact", "key", "cosmetic"]).size())
	var hidden := 0
	for id in GameDB.LOCATIONS:
		if GameDB.LOCATIONS[id].hidden: hidden += 1
	check(hidden >= 5, "at least 5 hidden discoveries (%d)" % hidden)
	print("  info: level %d, %d/%d collection, %d/%d missions, %d locations, %d achievements" % [Progression.level,
		Inventory.collection_progress().x, Inventory.collection_progress().y, Missions.completed.size(), GameDB.MISSIONS.size(),
		WorldState.discovered_locations.size(), Progression.achievements.size()])
	print("== Main menu")
	SaveSystem.save_game()
	SaveSystem.in_game = false
	game.queue_free()
	await frames(2)
	var menu: Node = load("res://scenes/main/main_menu.tscn").instantiate()
	add_child(menu)
	await secs(0.5)
	check(menu._logo != null and menu._logo.text == "AFTERLIGHT", "main menu builds with logo")
	check(SaveSystem.has_save(), "menu sees the save (Continue available)")
	menu._open("collection")
	await get_tree().process_frame
	check(menu._panel_layer.get_child_count() == 1, "menu opens the collection book")
	menu.queue_free()
	await frames(2)
	SaveSystem.delete_save()
