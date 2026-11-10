extends Node
## Two-process persistence test with a REAL application restart.
##   Phase 1:  godot --path . -- --savetest=write
##   Phase 2:  godot --path . -- --savetest=verify
## Phase 1 starts a map, cleans ~45 % of the contract objective, earns coins,
## buys equipment, changes the character and then closes the application
## WHILE STILL ON THE MAP (no menu, no explicit save call): only the game's
## automatic / lifecycle saving can preserve the progress.

var main
var mode := ""
const EXPECT := "user://savetest_expected.json"
const SLOT := 1   # slot 2
const MAP := "power_wash_patio"
const CONTRACT := "pw_spring"   # objective: clean 80 % of the patio floor


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--savetest="):
			mode = a.substr(11)
	_run.call_deferred()


func _run() -> void:
	await get_tree().create_timer(0.8).timeout
	if mode == "write":
		await _write()
	else:
		await _verify()


static func surface_hash(s: CleanSurface) -> String:
	var q := PackedByteArray()
	q.resize(s.data.size())
	for i in s.data.size():
		q[i] = int(round(s.data[i] * 255.0))
	return str(s.layer_index) + ":" + str(s.done) + ":" + q.hex_encode().sha256_text()


func _write() -> void:
	Game.delete_slot(SLOT)
	Game.new_slot(SLOT, "Relaunch Tester")              # 1. new save / launch
	await _start(MAP, CONTRACT)                  # 2. start a map
	await get_tree().create_timer(1.0).timeout
	var pl: Player = main.player
	var m: MapBase = main.current_map
	# Really use the starter equipment for a moment (first-person bot).
	pl.select_tool("sponge")
	pl.pitch = -0.7
	pl.clean_held = true
	await get_tree().create_timer(1.0).timeout
	pl.clean_held = false
	# 3. Clean until ~45 % of the floor objective is done: wash whole tiles plus
	#    half of another one (partially clean surface keeps its exact pixels).
	var floor_tiles := []
	for s in m.surfaces:
		if s.group == "floor":
			floor_tiles.append(s)
	var target := 0.45 * 0.8
	var k := 0
	while m.group_progress("floor") < target - 0.04 and k < floor_tiles.size():
		var s: CleanSurface = floor_tiles[k]
		while not s.done:
			s.clean_at(s.global_position, 999.0, 999.0, {s.current_type(): 1.0})
		k += 1
	var partial: CleanSurface = floor_tiles[k]
	for x in 8:
		partial.clean_at(partial.global_position + partial.global_transform.basis.x * (x * 0.2 - 0.8), 0.6, 2.0, {partial.current_type(): 1.0}, true)
	await get_tree().create_timer(0.6).timeout          # live dirt coins get paid
	var coins_from_cleaning := Game.coins() - 200
	Game.add_coins(900)                                  # 4. earn coins (contract-style income)
	var bought := Game.buy_tool("pressure_washer")       # 5. buy equipment (saves)
	pl.select_tool("pressure_washer")
	var look := Appearance.defaults()                    # change the character
	look["hair_style"] = "curly"
	look["hair_color"] = "#dcbc7a"
	look["eye_color"] = "blue"
	look["skin"] = 6
	look["top"] = "sweatshirt"
	look["top_color"] = "#8a4be0"
	look["hat"] = "beanie"
	Game.set_appearance(look)
	await get_tree().create_timer(0.5).timeout
	var expected := {"slot": SLOT, "coins": Game.coins(), "xp": Game.xp(), "bought": bought, "coins_from_cleaning": coins_from_cleaning,
		"floor": m.group_progress("floor"), "overall": m.overall(), "objective_pct": m.group_progress("floor") / 0.8,
		"partial_index": m.surfaces.find(partial), "partial_hash": surface_hash(partial), "partial_progress": partial.progress(),
		"done_tiles": k, "appearance": Game.appearance(), "name": Game.profile_name(), "selected": "pressure_washer",
		"elapsed": main.runner.elapsed}
	var f := FileAccess.open(EXPECT, FileAccess.WRITE)
	f.store_string(JSON.stringify(expected))
	f.close()
	print("SAVETEST WRITE: objective %.0f%%, floor %.1f%%, coins %d (+%d from cleaning), washer bought=%s" % [expected["objective_pct"] * 100, expected["floor"] * 100, expected["coins"], coins_from_cleaning, str(bought)])
	# 6-7. Close the application completely while still on the map.
	get_tree().root.propagate_notification(NOTIFICATION_WM_CLOSE_REQUEST)
	print("SAVETEST WRITE DONE")
	get_tree().quit()


func _verify() -> void:
	var e = JSON.parse_string(FileAccess.get_file_as_string(EXPECT))
	var fails := [0]
	var chk := func(name: String, ok: bool):
		print(("PASS  " if ok else "FAIL  ") + "relaunch: " + name)
		if not ok:
			fails[0] += 1
	# 8-9. Fresh process: the save is loaded automatically.
	chk.call("active slot restored after relaunch", Game.current_slot == int(e["slot"]))
	chk.call("profile name", Game.profile_name() == e["name"])
	chk.call("money unchanged (%d)" % Game.coins(), Game.coins() == int(e["coins"]))
	chk.call("coins earned by cleaning were kept (+%d)" % int(e["coins_from_cleaning"]), int(e["coins_from_cleaning"]) > 0)
	chk.call("experience unchanged", Game.xp() == int(e["xp"]))
	chk.call("purchased equipment kept", bool(e["bought"]) and Game.owns_tool("pressure_washer"))
	chk.call("equipped tool kept", String(Game.state["selected_tool"]) == e["selected"])
	chk.call("character appearance identical", str(Game.appearance()) == str(Appearance.sanitize(e["appearance"])))
	chk.call("playtime recorded", float(Game.state.get("playtime", 0.0)) > 0.0)
	var job: Dictionary = Game.state.get("active_job", {})
	chk.call("current mission remembered (%s)" % job.get("contract", "-"), job.get("map", "") == MAP and job.get("contract", "") == CONTRACT)
	chk.call("location percentage stored in the save (%.1f%%)" % (Game.map_state_overall(MAP) * 100), absf(Game.map_state_overall(MAP) - float(e["overall"])) < 0.01)
	# 10. Re-enter the map: the cleaned areas must still be clean.
	await _start(MAP, CONTRACT)
	await get_tree().create_timer(1.2).timeout
	var m: MapBase = main.current_map
	chk.call("location restored on load (not reset)", m.restored)
	chk.call("objective progress unchanged (%.1f%% of floor, expected %.1f%%)" % [m.group_progress("floor") * 100, float(e["floor"]) * 100], absf(m.group_progress("floor") - float(e["floor"])) < 0.005)
	var objective_pct: float = m.group_progress("floor") / 0.8
	chk.call("about 45%% of the objective is done (%.0f%%)" % (objective_pct * 100), objective_pct > 0.38 and objective_pct < 0.55)
	var partial: CleanSurface = m.surfaces[int(e["partial_index"])]
	chk.call("partially cleaned surface keeps its exact clean pixels", surface_hash(partial) == String(e["partial_hash"]))
	var still_done := true
	var n := 0
	for s in m.surfaces:
		if s.group == "floor" and n < int(e["done_tiles"]):
			still_done = still_done and s.done
			n += 1
	chk.call("fully cleaned tiles are still clean (%d tiles)" % n, still_done)
	chk.call("mission timer resumed (%.0fs)" % main.runner.elapsed, main.runner.elapsed >= float(e["elapsed"]) - 0.5)
	chk.call("first-person player equipped with the bought tool", main.player.tool.tool_id == "pressure_washer")
	chk.call("player model rebuilt from saved appearance", str(main.player.model.appearance) == str(Game.appearance()))
	print("SAVETEST VERIFY DONE: %d failures" % fails[0])
	get_tree().quit(1 if fails[0] > 0 else 0)

func _start(map_id: String, contract_id: String) -> void:
	main.start_contract(map_id, contract_id)
	var t0 := Time.get_ticks_msec()
	while Time.get_ticks_msec() - t0 < 20000:
		await get_tree().process_frame
		if main.playing and main.player != null and main.current_map != null and not main.current_map.menu_mode and main.session_map == map_id:
			break
	await get_tree().create_timer(0.3).timeout
