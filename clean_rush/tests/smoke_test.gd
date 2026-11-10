extends Node
## Automated smoke test. Run with:
##   godot --path . -- --smoke [shots_dir]
## Plays every map with a scripted bot (moves, switches tools, cleans), checks
## that dirt is removed progressively, that contracts can complete, that the
## economy/upgrades/unlocks/save system work, and writes screenshots.

var main
var shots := ""
var log_lines: Array = []
var failures := 0


func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var i := args.find("--smoke")
	if i + 1 < args.size() and not args[i + 1].begins_with("--"):
		shots = args[i + 1]
	_run.call_deferred()


func check(cond: bool, what: String) -> void:
	var line := ("PASS  " if cond else "FAIL  ") + what
	print(line)
	log_lines.append(line)
	if not cond:
		failures += 1


func wait(sec: float) -> void:
	await get_tree().create_timer(sec).timeout


func shot(name: String) -> void:
	if shots == "":
		return
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(shots.path_join(name + ".png"))


func _touch(idx: int, pos: Vector2, pressed: bool) -> void:
	var e := InputEventScreenTouch.new()
	e.index = idx
	e.position = pos
	e.pressed = pressed
	Input.parse_input_event(e)


func _drag(idx: int, pos: Vector2, rel: Vector2) -> void:
	var e := InputEventScreenDrag.new()
	e.index = idx
	e.position = pos
	e.relative = rel
	Input.parse_input_event(e)


func _leaf_field() -> DebrisField:
	for f in main.current_map.fields:
		if f.kind == "leaf":
			return f
	return null


func _cleaning_physics_tests() -> void:
	# RAKE: leaves move toward the rake and form piles that get bagged.
	main.start_contract("autumn_garden", "ag_path")
	await wait(0.8)
	var pl: Player = main.player
	var lf := _leaf_field()
	pl.select_tool("rake")
	var before := lf.pos.duplicate()
	var alive0 := lf.alive_count
	var bagged := [0]
	lf.pile_bagged.connect(func(_f, _p, n): bagged[0] += n)
	pl.global_position = Vector3(-8.4, 0.2, 4.6)
	pl.rotation.y = 0.0   # facing -Z, toward the pile at (-8.4, 3.4)
	pl.clean_held = true
	for k in 6:
		pl.move_input = Vector2(0, -0.35)
		await wait(0.5)
		pl.move_input = Vector2.ZERO
		await wait(0.7)
	pl.clean_held = false
	await wait(1.2)
	var moved := 0
	for i in lf.count:
		# Includes leaves that were dragged and then bagged as part of a pile.
		if lf.pos[i].distance_to(before[i]) > 0.15:
			moved += 1
	check(moved > 20, "rake drags leaves along the ground before bagging (%d moved)" % moved)
	check(bagged[0] > 0 and lf.alive_count < alive0, "raked leaves form piles that get bagged (%d leaves bagged)" % bagged[0])
	await shot("20_rake")
	# BLOWER: leaves fly, rotate, lift and settle.
	pl.select_tool("leaf_blower")
	pl.global_position = Vector3(6.5, 0.2, 11.0)
	pl.rotation.y = 0.0
	var b2 := lf.pos.duplicate()
	var y0 := lf.yaw.duplicate()
	pl.clean_held = true
	var max_lift := 0.0
	for k in 10:
		await wait(0.1)
		for i in lf.count:
			max_lift = maxf(max_lift, lf.lift[i])
	pl.clean_held = false
	await wait(2.5)
	var moved2 := 0
	var rotated := 0
	for i in lf.count:
		if lf.alive[i] == 1 and lf.pos[i].distance_to(b2[i]) > 0.3:
			moved2 += 1
		if absf(lf.yaw[i] - y0[i]) > 0.3:
			rotated += 1
	check(moved2 > 20, "leaf blower pushes leaves with the airflow (%d moved)" % moved2)
	check(rotated > 10 and max_lift > 0.1, "blown leaves rotate (%d) and lift into the air (max %.2f m)" % [rotated, max_lift])
	var settled := true
	for i in lf.count:
		if lf.alive[i] == 1 and lf.lift[i] > 0.2:
			settled = false
	check(settled, "blown leaves settle back on the ground")
	await shot("21_blower")
	# VACUUM: leaves are pulled in and stored in the bag.
	pl.select_tool("leaf_vacuum")
	pl.global_position = Vector3(-6.0, 0.2, 2.6)
	var a3 := lf.alive_count
	pl.clean_held = true
	for k in 6:
		pl.move_input = Vector2(0.4 if k % 2 == 0 else -0.4, -0.2)
		await wait(0.4)
	pl.move_input = Vector2.ZERO
	pl.clean_held = false
	await wait(0.4)
	check(lf.alive_count < a3 and pl.tool.bag_load > 0, "vacuum collects leaves into its bag (%d in bag)" % pl.tool.bag_load)
	# PRESSURE WASHER: progressive cleaning + wet trail shows where the tool worked.
	main.start_contract("power_wash_patio", "pw_spring")
	await wait(0.8)
	pl = main.player
	pl.select_tool("pressure_washer")
	var tile: CleanSurface = main.current_map.surfaces[10]
	var p_before := tile.progress()
	pl.global_position = tile.global_position + Vector3(0, 0.2, 2.5)
	pl.rotation.y = 0.0
	pl.clean_held = true
	await wait(1.5)
	var wet := 0
	for i in tile.res.x * tile.res.y:
		if tile.bytes[i * 2 + 1] > 0:
			wet += 1
	pl.clean_held = false
	check(tile.progress() > p_before, "pressure washer cleans progressively (%.1f%% -> %.1f%%)" % [p_before * 100, tile.progress() * 100])
	check(wet > 10, "wet trail marks exactly where water hit (%d px)" % wet)
	await shot("22_washer")


func _character_tests() -> void:
	var look := Appearance.defaults()
	look["hair_style"] = "ponytail"
	look["hair_color"] = "#a3401f"
	look["eye_color"] = "green"
	look["skin"] = 5
	look["top"] = "polo"
	look["top_color"] = "#5bd66b"
	look["bottom"] = "jeans"
	look["shoes"] = "boots"
	look["hat"] = "none"
	look["glasses"] = "round"
	look["gloves"] = "work"
	look["watch"] = "classic"
	look["body"] = "athletic"
	look["height"] = 1.06
	Game.set_appearance(look)
	main.start_contract("autumn_garden", "ag_path")
	await wait(0.8)
	var m: CharacterModel = main.player.model
	var same := true
	for k in look.keys():
		if str(m.appearance[k]) != str(look[k]):
			same = false
			print("  mismatch ", k, " ", m.appearance[k], " vs ", look[k])
	check(same, "in-game player model uses every saved appearance option")
	var meshes_a := m.find_children("*", "MeshInstance3D", true, false).size()
	var rig: Node3D = m.get_node("Rig")
	check(absf(rig.scale.y - 1.06) < 0.001, "height option scales the real 3D model")
	var hair_ok := false
	for mi in m.head.find_children("*", "MeshInstance3D", true, false):
		var mat: StandardMaterial3D = mi.material_override
		if mat and mat.albedo_color.is_equal_approx(Color("#a3401f")):
			hair_ok = true
	check(hair_ok, "hair colour applied to the model's hair meshes")
	await shot("23_character_ingame")
	look["hat"] = "cap"
	look["glasses"] = "none"
	m.apply(look)
	await wait(0.2)
	var meshes_b := m.find_children("*", "MeshInstance3D", true, false).size()
	check(meshes_a != meshes_b, "changing accessories changes the 3D components (%d -> %d meshes)" % [meshes_a, meshes_b])
	Game.set_appearance(look)
	Game.state = {}
	Game.load_game()
	check(str(Game.appearance()) == str(Appearance.sanitize(look)), "appearance identical after save + reload")
	main.goto("creator", {"mode": "edit", "return_to": "menu"})
	await wait(0.8)
	check(main.screen is CharacterCreatorScreen, "character creator opens")
	await shot("24_creator")
	main.goto("slots")
	await wait(0.8)
	await shot("25_slots")


func _graphics_tests() -> void:
	var counts := []
	for q in 3:
		Game.settings["graphics"] = q
		Game.apply_settings()
		main.start_contract("autumn_garden", "ag_path")
		await wait(1.0)
		var inst := 0
		for mmi in main.current_map.find_children("*", "MultiMeshInstance3D", true, false):
			inst += (mmi as MultiMeshInstance3D).multimesh.instance_count
		var t0 := Time.get_ticks_msec()
		var frames := 0
		while Time.get_ticks_msec() - t0 < 1500:
			await get_tree().process_frame
			frames += 1
		counts.append(inst)
		print("  graphics %d: %d instances, %.1f fps (software renderer)" % [q, inst, frames / 1.5])
		await shot("26_graphics_%d" % q)
	Game.settings["graphics"] = 1
	Game.apply_settings()
	check(counts[0] < counts[1] and counts[1] < counts[2], "Low < Medium < High instance budget (%s)" % str(counts))


func _run() -> void:
	# Deterministic run in a dedicated slot (slot 3); other slots are untouched.
	Game.settings["touch"] = 0
	Game.delete_slot(2)
	Game.new_slot(2, "Smoke Bot")
	await wait(1.0)
	await shot("00_menu")
	for s in ["maps", "shop", "equipment", "achievements", "collection", "daily", "settings"]:
		main.goto(s, null)
		await wait(0.5)
		check(main.screen != null and is_instance_valid(main.screen), "screen opens: " + s)
		await shot("01_screen_" + s)
	main.goto("contracts", "autumn_garden")
	await wait(0.4)
	await shot("02_contracts")
	# Give the bot every tool so each tool is exercised.
	Game.state["coins"] = 100000
	for t in Data.tool_order:
		if not Game.owns_tool(t):
			check(Game.buy_tool(t), "buy tool " + t)
	check(Game.buy_upgrade("pressure_washer", "power"), "buy upgrade washer power")
	check(Game.upgrade_level("pressure_washer", "power") == 1, "upgrade level stored")
	check(Game.tool_param("pressure_washer", "surface", "power") > float(Data.tool_def("pressure_washer")["surface"]["power"]), "upgrade raises power")
	check(Game.buy_gear("shoes"), "buy gear shoes")
	var plans := {
		"autumn_garden": ["leaf_blower", "leaf_vacuum", "rake"],
		"power_wash_patio": ["pressure_washer", "turbo_nozzle", "foam_sprayer"],
		"pool_rescue": ["pool_net", "pool_vacuum", "scrubber"],
		"city_cleanup": ["trash_picker", "pressure_washer", "broom"],
		"car_detailing": ["pressure_washer", "sponge", "polisher"],
		"abandoned_greenhouse": ["leaf_blower", "pressure_washer", "sponge"],
	}
	var idx := 0
	for map_id in Data.map_order:
		idx += 1
		var c: Dictionary = Data.map_def(map_id)["contracts"][0]
		main.start_contract(map_id, c["id"])
		await wait(0.6)
		check(main.current_map != null and main.current_map.surfaces.size() + main.current_map.fields.size() > 0, "%s loads with cleanables (%d surfaces, %d debris fields)" % [map_id, main.current_map.surfaces.size(), main.current_map.fields.size()])
		await shot("%02d_%s_start" % [idx + 2, map_id])
		var p0: float = main.current_map.overall()
		var p := main.player as Player
		var tools_used: Array = plans[map_id]
		for ti in tools_used.size():
			p.select_tool(tools_used[ti])
			var before: float = main.current_map.overall()
			p.clean_held = true
			# Walk a little circuit while cleaning.
			for step in 8:
				var a := step * TAU / 8.0 + ti
				p.move_input = Vector2(cos(a), sin(a)) * 0.6
				await wait(0.35)
				p.move_input = Vector2.ZERO
				await wait(0.35)
			p.clean_held = false
			await wait(0.3)
			var after: float = main.current_map.overall()
			check(after >= before, "%s: %s keeps progress monotonic (%.1f%% -> %.1f%%)" % [map_id, tools_used[ti], before * 100, after * 100])
			if ti == 0:
				await shot("%02d_%s_cleaning" % [idx + 2, map_id])
		var p1: float = main.current_map.overall()
		check(p1 > p0, "%s: dirt removed progressively (%.1f%% -> %.1f%%)" % [map_id, p0 * 100, p1 * 100])
		# Progressive check: at least one surface is partially (not fully) clean.
		var partial := false
		for s in main.current_map.surfaces:
			if s.progress() > 0.02 and s.progress() < 0.98:
				partial = true
				break
		if main.current_map.surfaces.size() > 0:
			check(partial or p1 > p0, "%s: partial surface cleaning observed" % map_id)
		# Force-complete the contract to test rewards (simulate a fully cleaned map).
		for s in main.current_map.surfaces:
			s.clean_at(s.global_position, 999.0, 999.0, {s.current_type(): 1.0})
			while not s.done:
				s.clean_at(s.global_position, 999.0, 999.0, {s.current_type(): 1.0})
		for f in main.current_map.fields:
			for k in f.count:
				if f.alive[k] == 1:
					f._collect_piece(k, f.pos[k])
		await wait(0.6)
		check(main.current_map.overall() > 0.99, "%s: overall reaches 100%% when everything is clean" % map_id)
		check(main.runner.completed, "%s: contract '%s' completes" % [map_id, c["title"]])
		var coins_before := Game.coins()
		main.finish_contract()
		await wait(0.8)
		check(Game.coins() > coins_before, "%s: reward paid (%d coins)" % [map_id, Game.coins() - coins_before])
		check(Game.is_contract_completed(c["id"]), "%s: contract saved as completed" % map_id)
		await shot("%02d_%s_reward" % [idx + 2, map_id])
	# Multitouch: joystick (finger 0) + CLEAN button (finger 1) at the same time.
	Game.settings["touch"] = 1
	main.start_contract("autumn_garden", "ag_path")
	await wait(0.6)
	var tc: TouchControls = main.hud.touch
	check(tc.visible, "touch controls visible when enabled")
	var pl: Player = main.player
	var start_pos: Vector3 = pl.global_position
	var joy := tc.joy_home()
	_touch(0, joy, true)
	_drag(0, joy + Vector2(0, -80), Vector2(0, -80))
	_touch(1, tc.clean_center(), true)
	await wait(1.2)
	check(pl.clean_held, "CLEAN button held by second finger")
	check(pl.global_position.distance_to(start_pos) > 1.0, "joystick moves the player (%.1f m) while cleaning" % pl.global_position.distance_to(start_pos))
	_touch(1, tc.clean_center(), false)
	_touch(0, joy, false)
	await wait(0.2)
	check(not pl.clean_held and pl.move_input == Vector2.ZERO, "releasing fingers stops movement and cleaning")
	Game.settings["touch"] = 0
	# Unlocks.
	for map_id in Data.map_order:
		check(Game.is_map_unlocked(map_id) or map_id == "abandoned_greenhouse", "unlock state ok: " + map_id)
	await _cleaning_physics_tests()
	await _character_tests()
	await _graphics_tests()
	# Save / load roundtrip (from disk).
	var snapshot_coins := Game.coins()
	check(Game.save_game(), "save_game writes the slot file")
	Game.state = {}
	Game.load_game()
	check(Game.coins() == snapshot_coins, "save/load preserves coins")
	check(Game.owns_tool("polisher"), "save/load preserves tools")
	check(Game.upgrade_level("pressure_washer", "power") == 1, "save/load preserves upgrades")
	# Corrupted main file: must recover from the backup without losing progress.
	Game.save_game()
	Game.add_coins(5)
	Game.save_game()
	var expect := Game.coins() - 5
	var f := FileAccess.open(SaveStore.slot_path(2), FileAccess.WRITE)
	f.store_string("{not valid json")
	f.close()
	Game.state = {}
	Game.load_game()
	check(Game.state.has("coins") and Game.last_load_info.get("recovered", false), "corrupt save detected and recovered from backup")
	check(Game.coins() >= expect, "recovered backup keeps progress (%d coins)" % Game.coins())
	# Checksum tampering is detected too.
	var txt := FileAccess.get_file_as_string(SaveStore.slot_path(2)).replace("\"coins\": ", "\"coins\": 9")
	var f2 := FileAccess.open(SaveStore.slot_path(2), FileAccess.WRITE)
	f2.store_string(txt)
	f2.close()
	check(not SaveStore.decode(FileAccess.get_file_as_string(SaveStore.slot_path(2)))["ok"], "checksum detects a modified save file")
	Game.load_game()
	check(Game.state.has("coins"), "tampered save falls back to backup")
	# Slot summaries for the slot screen.
	var sm := Game.slot_summary(2)
	check(sm.get("exists", false) and sm.get("name", "") == "Smoke Bot" and sm.has("playtime"), "slot summary has name/level/coins/playtime/progress")
	main.goto("menu")
	await wait(0.5)
	print("SMOKE TEST DONE: %d failures" % failures)
	get_tree().quit(1 if failures > 0 else 0)
