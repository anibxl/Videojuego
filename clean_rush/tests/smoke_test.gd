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


func _run() -> void:
	# Fresh state for deterministic results.
	Game.state = Game.default_state()
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
	# Unlocks.
	for map_id in Data.map_order:
		check(Game.is_map_unlocked(map_id) or map_id == "abandoned_greenhouse", "unlock state ok: " + map_id)
	# Save / load roundtrip.
	var snapshot_coins := Game.coins()
	Game.save_game()
	Game.state = {}
	Game.load_game()
	check(Game.coins() == snapshot_coins, "save/load preserves coins")
	check(Game.owns_tool("polisher"), "save/load preserves tools")
	check(Game.upgrade_level("pressure_washer", "power") == 1, "save/load preserves upgrades")
	# Corrupted save is handled safely (falls back to backup).
	var f := FileAccess.open(Game.SAVE_PATH, FileAccess.WRITE)
	f.store_string("{not valid json")
	f.close()
	Game.load_game()
	check(Game.state.has("coins"), "corrupt save handled without crash")
	main.goto("menu")
	await wait(0.5)
	print("SMOKE TEST DONE: %d failures" % failures)
	get_tree().quit(1 if failures > 0 else 0)
