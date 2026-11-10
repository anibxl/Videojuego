extends Node
## Persistent player state: economy, progression, equipment, collections,
## achievements, daily missions and settings. Saves versioned JSON locally.

signal coins_changed(coins: int)
signal xp_changed(xp: int, level: int)
signal toast(text: String, kind: String)
signal achievement_unlocked(def: Dictionary)
signal settings_changed

const SAVE_VERSION := 2
const SAVE_PATH := "user://clean_rush_save.json"
const BACKUP_PATH := "user://clean_rush_save.bak"
const STARTER_TOOLS := ["rake", "broom", "sponge"]
const STAR_MULT := [0.0, 1.0, 1.25, 1.6]

var state: Dictionary = {}
var session: Dictionary = {}   # transient: current map/contract selection
var _save_queued := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	load_game()
	ensure_daily()
	refresh_unlocks(false)
	apply_settings()


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		save_game()


# ---------------------------------------------------------------- defaults ---

func default_state() -> Dictionary:
	return {
		"version": SAVE_VERSION,
		"coins": 200,
		"xp": 0,
		"tools_owned": STARTER_TOOLS.duplicate(),
		"tool_upgrades": {},
		"gear": {},
		"selected_tool": "rake",
		"contracts": {},
		"map_best": {},
		"discoveries": [],
		"achievements": [],
		"unlocked_maps": ["autumn_garden"],
		"stats": {},
		"daily": {},
		"tutorial_done": false,
		"settings": default_settings(),
	}


func default_settings() -> Dictionary:
	return {
		"music": 0.55,
		"sfx": 0.8,
		"graphics": 1,
		"touch": 0,
		"auto_aim": true,
		"cam_sens": 1.0,
	}


# -------------------------------------------------------------- save / load ---

func load_game() -> void:
	var data = _read_save(SAVE_PATH)
	if data == null:
		data = _read_save(BACKUP_PATH)
		if data != null:
			push_warning("Main save invalid, restored from backup.")
	if data == null:
		state = default_state()
		return
	state = _sanitize(_migrate(data))


func _read_save(path: String):
	if not FileAccess.file_exists(path):
		return null
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return null
	var parsed = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY or not parsed.has("version"):
		return null
	return parsed


func _migrate(data: Dictionary) -> Dictionary:
	var v := int(data.get("version", 1))
	if v < 2:
		# v1 stored settings.graphics as a string.
		var s: Dictionary = data.get("settings", {})
		if typeof(s.get("graphics", 1)) == TYPE_STRING:
			s["graphics"] = ["low", "medium", "high"].find(s["graphics"])
		data["settings"] = s
	data["version"] = SAVE_VERSION
	return data


func _sanitize(data: Dictionary) -> Dictionary:
	var d := default_state()
	for key in d.keys():
		if data.has(key) and typeof(data[key]) == typeof(d[key]):
			d[key] = data[key]
		elif data.has(key) and typeof(d[key]) in [TYPE_INT, TYPE_FLOAT] and typeof(data[key]) in [TYPE_INT, TYPE_FLOAT]:
			d[key] = data[key]
	var s := default_settings()
	for key in s.keys():
		if d["settings"].has(key) and typeof(d["settings"][key]) in [typeof(s[key]), TYPE_INT, TYPE_FLOAT]:
			s[key] = d["settings"][key]
	d["settings"] = s
	d["coins"] = maxi(0, int(d["coins"]))
	d["xp"] = maxi(0, int(d["xp"]))
	# Remove unknown tools, guarantee starters.
	var owned := []
	for t in d["tools_owned"]:
		if Data.tools.has(t) and not owned.has(t):
			owned.append(t)
	for t in STARTER_TOOLS:
		if not owned.has(t):
			owned.append(t)
	d["tools_owned"] = owned
	if not owned.has(d["selected_tool"]):
		d["selected_tool"] = "rake"
	if not d["unlocked_maps"].has("autumn_garden"):
		d["unlocked_maps"].append("autumn_garden")
	return d


func save_game() -> void:
	_save_queued = false
	state["version"] = SAVE_VERSION
	var text := JSON.stringify(state, "\t")
	var tmp := SAVE_PATH + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		push_error("Cannot write save file: %s" % FileAccess.get_open_error())
		return
	f.store_string(text)
	f.close()
	var dir := DirAccess.open("user://")
	if dir == null:
		return
	if dir.file_exists(SAVE_PATH.get_file()):
		if dir.file_exists(BACKUP_PATH.get_file()):
			dir.remove(BACKUP_PATH.get_file())
		dir.rename(SAVE_PATH.get_file(), BACKUP_PATH.get_file())
	dir.rename(tmp.get_file(), SAVE_PATH.get_file())


func queue_save() -> void:
	if _save_queued:
		return
	_save_queued = true
	get_tree().create_timer(1.0, true).timeout.connect(save_game)


func reset_progress() -> void:
	var keep: Dictionary = state.get("settings", default_settings())
	state = default_state()
	state["settings"] = keep
	ensure_daily()
	save_game()
	coins_changed.emit(coins())
	xp_changed.emit(xp(), level())


# ----------------------------------------------------------------- economy ---

func coins() -> int:
	return int(state["coins"])


func add_coins(amount: int, earned := true) -> void:
	if amount <= 0:
		return
	state["coins"] = coins() + amount
	if earned:
		add_stat("coins_earned", amount)
	coins_changed.emit(coins())
	queue_save()


func spend(amount: int) -> bool:
	if amount > coins():
		return false
	state["coins"] = coins() - amount
	coins_changed.emit(coins())
	queue_save()
	return true


func xp() -> int:
	return int(state["xp"])


static func xp_for_level(lvl: int) -> int:
	# Total XP required to reach `lvl` (level 1 = 0 XP).
	var total := 0
	for i in range(1, lvl):
		total += int(80 + 40 * i + 6 * i * i)
	return total


func level() -> int:
	var lvl := 1
	while xp() >= xp_for_level(lvl + 1):
		lvl += 1
	return lvl


## Adds XP and returns how many levels were gained (each grants a coin bonus).
func add_xp(amount: int) -> int:
	var before := level()
	state["xp"] = xp() + amount
	var after := level()
	for l in range(before + 1, after + 1):
		add_coins(50 * l)
	xp_changed.emit(xp(), after)
	queue_save()
	return after - before


# ------------------------------------------------------------------- stats ---

func get_stat(name: String) -> float:
	match name:
		"stars":
			return total_stars()
		"discoveries":
			return state["discoveries"].size()
		"tools_owned":
			return state["tools_owned"].size()
		"maps_unlocked":
			return state["unlocked_maps"].size()
	return float(state["stats"].get(name, 0))


func add_stat(name: String, amount: float) -> void:
	state["stats"][name] = float(state["stats"].get(name, 0)) + amount
	if name in ["coins_earned", "contracts_completed", "three_star_count", "upgrades_bought", "speed_runs", "dailies_claimed"]:
		check_achievements()


func check_achievements() -> Array:
	var unlocked := []
	for a in Data.achievements:
		if state["achievements"].has(a["id"]):
			continue
		if get_stat(a["stat"]) >= float(a["target"]):
			state["achievements"].append(a["id"])
			unlocked.append(a)
			add_coins(int(a.get("reward", 0)))
			achievement_unlocked.emit(a)
			Audio.play("achievement")
	if not unlocked.is_empty():
		queue_save()
	return unlocked


# ------------------------------------------------------------------- tools ---

func owns_tool(tool_id: String) -> bool:
	return state["tools_owned"].has(tool_id)


func buy_tool(tool_id: String) -> bool:
	if owns_tool(tool_id):
		return false
	var price := int(Data.tool_def(tool_id).get("price", 0))
	if not spend(price):
		return false
	state["tools_owned"].append(tool_id)
	state["selected_tool"] = tool_id
	check_achievements()
	refresh_unlocks(true)
	save_game()
	return true


func upgrade_level(tool_id: String, stat: String) -> int:
	return int(state["tool_upgrades"].get(tool_id, {}).get(stat, 0))


func upgrade_max(stat: String) -> int:
	return int(Data.upgrade_effects.get(stat, {}).get("max", 4))


func upgrade_cost(tool_id: String, stat: String) -> int:
	var price := float(Data.tool_def(tool_id).get("price", 0))
	var base := maxf(90.0, price * 0.3)
	var lvl := upgrade_level(tool_id, stat)
	return int(round(base * pow(lvl + 1, 1.45) / 10.0) * 10)


func buy_upgrade(tool_id: String, stat: String) -> bool:
	if not owns_tool(tool_id) or upgrade_level(tool_id, stat) >= upgrade_max(stat):
		return false
	if not spend(upgrade_cost(tool_id, stat)):
		return false
	var ups: Dictionary = state["tool_upgrades"].get(tool_id, {})
	ups[stat] = upgrade_level(tool_id, stat) + 1
	state["tool_upgrades"][tool_id] = ups
	add_stat("upgrades_bought", 1)
	save_game()
	return true


func stat_multiplier(tool_id: String, stat: String, level_override := -1) -> float:
	var lvl := upgrade_level(tool_id, stat) if level_override < 0 else level_override
	var per := float(Data.upgrade_effects.get(stat, {}).get("per_level", 0.0))
	return 1.0 + per * lvl


## Effective tool parameters with upgrades applied. `section` is "surface" or "debris".
func tool_param(tool_id: String, section: String, field: String, level_override := -1) -> float:
	var sec: Dictionary = Data.tool_def(tool_id).get(section, {})
	var base := float(sec.get(field, 0.0))
	match field:
		"power":
			return base * stat_multiplier(tool_id, "power", level_override)
		"range", "reach":
			return base * stat_multiplier(tool_id, "range", level_override)
		"radius":
			return base * stat_multiplier(tool_id, "radius", level_override)
	return base


func tool_capacity(tool_id: String, level_override := -1) -> int:
	var base := int(Data.tool_def(tool_id).get("debris", {}).get("capacity", 0))
	if base <= 0:
		return 0
	return int(base * stat_multiplier(tool_id, "capacity", level_override) * (1.0 + gear_value("bags")))


# -------------------------------------------------------------------- gear ---

func gear_level(gear_id: String) -> int:
	return int(state["gear"].get(gear_id, 0))


func gear_cost(gear_id: String) -> int:
	var g: Dictionary = Data.gear.get(gear_id, {})
	return int(g.get("base_cost", 200)) * (gear_level(gear_id) + 1) * (gear_level(gear_id) + 1)


func gear_value(gear_id: String) -> float:
	return float(Data.gear.get(gear_id, {}).get("per_level", 0.0)) * gear_level(gear_id)


func buy_gear(gear_id: String) -> bool:
	var g: Dictionary = Data.gear.get(gear_id, {})
	if gear_level(gear_id) >= int(g.get("max", 3)):
		return false
	if not spend(gear_cost(gear_id)):
		return false
	state["gear"][gear_id] = gear_level(gear_id) + 1
	add_stat("upgrades_bought", 1)
	save_game()
	return true


# --------------------------------------------------------------- contracts ---

func contract_record(contract_id: String) -> Dictionary:
	return state["contracts"].get(contract_id, {})


func is_contract_completed(contract_id: String) -> bool:
	return bool(contract_record(contract_id).get("completed", false))


func total_stars() -> int:
	var t := 0
	for c in state["contracts"].values():
		t += int(c.get("stars", 0))
	return t


func contracts_completed_count(map_id := "") -> int:
	var n := 0
	for entry in Data.all_contracts():
		if map_id != "" and entry["map"] != map_id:
			continue
		if is_contract_completed(entry["contract"]["id"]):
			n += 1
	return n


func map_completion(map_id: String) -> float:
	return float(state["map_best"].get(map_id, 0.0))


## Applies the results of a finished contract and returns a reward breakdown.
func complete_contract(map_id: String, contract_id: String, result: Dictionary) -> Dictionary:
	var def := Data.contract_def(map_id, contract_id)
	var rec := contract_record(contract_id)
	var first_time := not bool(rec.get("completed", false))
	var stars := int(result.get("stars", 1))
	var base := int(def.get("reward", 100))
	if not first_time:
		base = int(base * 0.5)
	var star_bonus := int(base * (STAR_MULT[stars] - 1.0))
	var dirt_coins := int(result.get("dirt_coins", 0))
	var disc_coins := int(result.get("discovery_coins", 0))
	var total := base + star_bonus + dirt_coins + disc_coins
	var xp_gain := int(def.get("xp", 50)) + stars * 10
	if not first_time:
		xp_gain = int(xp_gain * 0.5)
	var prev_stars := int(rec.get("stars", 0))
	var time := float(result.get("time", 0.0))
	rec["completed"] = true
	rec["stars"] = maxi(prev_stars, stars)
	rec["plays"] = int(rec.get("plays", 0)) + 1
	var prev_best := float(rec.get("best_time", 0.0))
	var new_record := prev_best <= 0.0 or time < prev_best
	if new_record:
		rec["best_time"] = time
	state["contracts"][contract_id] = rec
	state["map_best"][map_id] = maxf(map_completion(map_id), float(result.get("overall", 0.0)))
	add_stat("contracts_completed", 1)
	add_stat("stars_earned", stars)
	if stars >= 3:
		add_stat("three_star_count", 1)
	if time > 0.0 and time <= float(def.get("par_time", 60)) * 0.5:
		add_stat("speed_runs", 1)
	add_coins(total)
	var levels := add_xp(xp_gain)
	var new_maps := refresh_unlocks(true)
	check_achievements()
	save_game()
	return {
		"base": base, "star_bonus": star_bonus, "dirt_coins": dirt_coins, "discovery_coins": disc_coins,
		"total": total, "xp": xp_gain, "levels": levels, "first_time": first_time,
		"new_record": new_record and not first_time, "new_maps": new_maps, "stars": stars,
		"prev_stars": prev_stars, "time": time,
	}


func record_map_progress(map_id: String, pct: float) -> void:
	if pct > map_completion(map_id):
		state["map_best"][map_id] = pct
		queue_save()


# ------------------------------------------------------------- discoveries ---

func has_discovery(map_id: String, disc_id: String) -> bool:
	return state["discoveries"].has(map_id + ":" + disc_id)


## Returns coins granted (full reward first time, small bonus on replays).
func add_discovery(map_id: String, disc_id: String) -> int:
	var key := map_id + ":" + disc_id
	var def := Data.discovery_def(map_id, disc_id)
	if state["discoveries"].has(key):
		return 10
	state["discoveries"].append(key)
	check_achievements()
	queue_save()
	return int(def.get("coins", 50))


# --------------------------------------------------------------- map locks ---

func is_map_unlocked(map_id: String) -> bool:
	return state["unlocked_maps"].has(map_id) or _unlock_condition_met(map_id)


func _unlock_condition_met(map_id: String) -> bool:
	var u: Dictionary = Data.map_def(map_id).get("unlock", {})
	match String(u.get("type", "none")):
		"none":
			return true
		"map_contracts":
			return contracts_completed_count(u.get("map", "")) >= int(u.get("count", 1))
		"coins_earned":
			return get_stat("coins_earned") >= float(u.get("amount", 0))
		"contracts":
			return contracts_completed_count() >= int(u.get("count", 1))
		"tool_owned":
			for t in u.get("tools", []):
				if owns_tool(t):
					return true
			return false
		"stars":
			return total_stars() >= int(u.get("count", 1))
	return false


func unlock_progress_text(map_id: String) -> String:
	var u: Dictionary = Data.map_def(map_id).get("unlock", {})
	match String(u.get("type", "none")):
		"map_contracts":
			return "%d / %d" % [contracts_completed_count(u.get("map", "")), int(u.get("count", 1))]
		"coins_earned":
			return "%d / %d" % [int(get_stat("coins_earned")), int(u.get("amount", 0))]
		"contracts":
			return "%d / %d" % [contracts_completed_count(), int(u.get("count", 1))]
		"stars":
			return "%d / %d" % [total_stars(), int(u.get("count", 1))]
	return ""


## Returns the list of map ids that became unlocked during this call.
func refresh_unlocks(notify: bool) -> Array:
	var newly := []
	for map_id in Data.map_order:
		if not state["unlocked_maps"].has(map_id) and _unlock_condition_met(map_id):
			state["unlocked_maps"].append(map_id)
			newly.append(map_id)
			if notify:
				toast.emit("New location unlocked: %s!" % Data.map_def(map_id).get("name", map_id), "unlock")
	if not newly.is_empty():
		check_achievements()
	return newly


## The next thing the player should do — keeps a clear goal visible at all times.
func next_goal() -> Dictionary:
	for map_id in Data.map_order:
		if not is_map_unlocked(map_id):
			continue
		for c in Data.map_def(map_id).get("contracts", []):
			if not is_contract_completed(c["id"]):
				return {"map": map_id, "contract": c["id"], "text": "%s — %s" % [Data.map_def(map_id)["name"], c["title"]]}
	for map_id in Data.map_order:
		if not is_map_unlocked(map_id):
			return {"map": "", "contract": "", "text": "Unlock %s: %s" % [Data.map_def(map_id)["name"], Data.map_def(map_id)["unlock"].get("text", "")]}
	for entry in Data.all_contracts():
		if int(contract_record(entry["contract"]["id"]).get("stars", 0)) < 3:
			return {"map": entry["map"], "contract": entry["contract"]["id"], "text": "Go for 3 stars: %s" % entry["contract"]["title"]}
	return {"map": "", "contract": "", "text": "Everything is spotless. You are a cleaning legend!"}


# ----------------------------------------------------------- daily missions ---

func today_string() -> String:
	var d := Time.get_date_dict_from_system()
	return "%04d-%02d-%02d" % [d["year"], d["month"], d["day"]]


func ensure_daily() -> void:
	var today := today_string()
	var daily: Dictionary = state.get("daily", {})
	if daily.get("date", "") == today and daily.get("missions", []) is Array and daily["missions"].size() == 3:
		return
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(today)
	var pool := range(Data.daily_templates.size())
	var missions := []
	for i in 3:
		if pool.is_empty():
			break
		var idx: int = pool.pop_at(rng.randi_range(0, pool.size() - 1))
		var t: Dictionary = Data.daily_templates[idx]
		var targets: Array = t.get("targets", [1])
		var target: int = targets[rng.randi_range(0, targets.size() - 1)]
		missions.append({"template": t["id"], "stat": t["stat"], "target": target,
			"base": get_stat(t["stat"]), "reward": int(t.get("reward", 100)), "claimed": false,
			"text": String(t["text"]) % target})
	state["daily"] = {"date": today, "missions": missions}
	queue_save()


func daily_progress(m: Dictionary) -> float:
	return clampf((get_stat(m["stat"]) - float(m["base"])) / float(m["target"]), 0.0, 1.0)


func claim_daily(index: int) -> bool:
	ensure_daily()
	var missions: Array = state["daily"]["missions"]
	if index < 0 or index >= missions.size():
		return false
	var m: Dictionary = missions[index]
	if m["claimed"] or daily_progress(m) < 1.0:
		return false
	m["claimed"] = true
	add_coins(int(m["reward"]))
	add_stat("dailies_claimed", 1)
	save_game()
	return true


func dailies_ready() -> int:
	ensure_daily()
	var n := 0
	for m in state["daily"]["missions"]:
		if not m["claimed"] and daily_progress(m) >= 1.0:
			n += 1
	return n


# ---------------------------------------------------------------- settings ---

func setting(key: String):
	return state["settings"].get(key, default_settings().get(key))


func set_setting(key: String, value) -> void:
	state["settings"][key] = value
	apply_settings()
	queue_save()


func apply_settings() -> void:
	Audio.set_volumes(float(setting("music")), float(setting("sfx")))
	var g := int(setting("graphics"))
	var vp := get_viewport()
	if vp:
		vp.msaa_3d = [Viewport.MSAA_DISABLED, Viewport.MSAA_2X, Viewport.MSAA_4X][clampi(g, 0, 2)]
		vp.scaling_3d_scale = [0.75, 1.0, 1.0][clampi(g, 0, 2)]
	settings_changed.emit()


func graphics_level() -> int:
	return clampi(int(setting("graphics")), 0, 2)


## Debris density multiplier for the current graphics level (fewer leaves on Low).
func density() -> float:
	return [0.6, 0.85, 1.0][graphics_level()]


func use_touch_controls() -> bool:
	match int(setting("touch")):
		1:
			return true
		2:
			return false
	return DisplayServer.is_touchscreen_available() or OS.has_feature("mobile")
