extends Node
## Two-process persistence test (real application restart).
##   Phase 1:  godot --path . -- --savetest=write   (plays, then quits WITHOUT calling save_game)
##   Phase 2:  godot --path . -- --savetest=verify  (fresh boot, checks everything came back)
## Phase 1 relies only on the game's automatic saving (events + lifecycle).

var main
var mode := ""
const EXPECT := "user://savetest_expected.json"
const SLOT := 1   # slot 2


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
		_verify()


func _write() -> void:
	Game.delete_slot(SLOT)
	Game.new_slot(SLOT, "Relaunch Tester")              # 1. start a new save
	Game.add_coins(1234)                                 # 2. earn money
	main.start_contract("autumn_garden", "ag_path")     # 3. complete a contract
	await get_tree().create_timer(0.6).timeout
	for s in main.current_map.surfaces:
		while not s.done:
			s.clean_at(s.global_position, 999.0, 999.0, {s.current_type(): 1.0})
	for f in main.current_map.fields:
		for k in f.count:
			if f.alive[k] == 1:
				f._collect_piece(k, f.pos[k])
	await get_tree().create_timer(0.6).timeout
	main.finish_contract()
	await get_tree().create_timer(0.5).timeout
	Game.add_coins(2000)
	var ok_up := Game.buy_upgrade("rake", "power")       # 4. buy an upgrade
	var look := Appearance.defaults()                    # 5. change appearance
	look["hair_style"] = "curly"
	look["hair_color"] = "#dcbc7a"
	look["eye_color"] = "blue"
	look["skin"] = 6
	look["top"] = "sweatshirt"
	look["top_color"] = "#8a4be0"
	look["hat"] = "beanie"
	look["glasses"] = "sunglasses"
	look["shoes"] = "sneakers"
	Game.set_appearance(look)
	main.start_contract("power_wash_patio", "pw_spring")   # change map
	await get_tree().create_timer(0.6).timeout
	Game.add_coins(77)                                   # progress made on the other map
	main.goto("menu")
	await get_tree().create_timer(1.5).timeout          # debounced autosave fires
	var expected := {"slot": SLOT, "coins": Game.coins(), "xp": Game.xp(), "contract": Game.is_contract_completed("ag_path"),
		"upgrade": Game.upgrade_level("rake", "power"), "appearance": Game.appearance(), "upgrade_bought": ok_up,
		"name": Game.profile_name(), "map_best": Game.map_completion("autumn_garden")}
	var f := FileAccess.open(EXPECT, FileAccess.WRITE)
	f.store_string(JSON.stringify(expected))
	f.close()
	print("SAVETEST WRITE DONE coins=%d" % Game.coins())
	# 6. close the game (normal quit request -> lifecycle save)
	get_tree().root.propagate_notification(NOTIFICATION_WM_CLOSE_REQUEST)
	get_tree().quit()


func _verify() -> void:
	var e = JSON.parse_string(FileAccess.get_file_as_string(EXPECT))
	var fails := 0
	var checks := [
		["active slot restored after relaunch", Game.current_slot == int(e["slot"])],
		["profile name", Game.profile_name() == e["name"]],
		["coins (%d)" % Game.coins(), Game.coins() == int(e["coins"])],
		["experience", Game.xp() == int(e["xp"])],
		["completed contract", Game.is_contract_completed("ag_path") == bool(e["contract"])],
		["upgrade level", Game.upgrade_level("rake", "power") == int(e["upgrade"]) and int(e["upgrade"]) == 1],
		["map completion", absf(Game.map_completion("autumn_garden") - float(e["map_best"])) < 0.001],
		["character appearance identical", str(Game.appearance()) == str(Appearance.sanitize(e["appearance"]))],
		["playtime recorded", float(Game.state.get("playtime", 0.0)) > 0.0],
	]
	for c in checks:
		print(("PASS  " if c[1] else "FAIL  ") + "relaunch: " + c[0])
		if not c[1]:
			fails += 1
	# The in-game model reflects the reloaded appearance.
	main.start_contract("autumn_garden", "ag_path")
	await get_tree().create_timer(0.6).timeout
	var same: bool = str(main.player.model.appearance) == str(Game.appearance())
	print(("PASS  " if same else "FAIL  ") + "relaunch: player model rebuilt from saved appearance")
	if not same:
		fails += 1
	print("SAVETEST VERIFY DONE: %d failures" % fails)
	get_tree().quit(1 if fails > 0 else 0)
