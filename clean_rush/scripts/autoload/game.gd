extends Node
## Persistent player state: economy, progression, equipment, character,
## collections, achievements, daily missions and settings.
## Storage: 3 local save slots via SaveStore (checksummed, atomic, backed up),
## global settings file, autosave on every important change, every 30 s and
## whenever the app is paused / backgrounded / closed.

signal coins_changed(coins: int)
signal xp_changed(xp: int, level: int)
signal toast(text: String, kind: String)
signal achievement_unlocked(def: Dictionary)
signal settings_changed
signal slot_changed(slot: int)
signal saved(slot: int)
## Emitted right before the slot is written: the gameplay scene uses it to
## persist the current location's restoration state at the same moment.
signal about_to_save
signal map_reset(map_id: String)

const SAVE_VERSION := 3
const AUTOSAVE_INTERVAL := 30.0
## Kept for the smoke test / tooling: path of the active slot file.
var SAVE_PATH: String:
	get:
		return SaveStore.slot_path(maxi(current_slot, 0))
const STARTER_TOOLS := ["leaf_blower", "sponge"]
const STAR_MULT := [0.0, 1.0, 1.25, 1.6]

var state: Dictionary = {}
var settings: Dictionary = {}
var current_slot := -1
var session: Dictionary = {}   # transient: current map/contract selection
var last_load_info: Dictionary = {}
var _save_queued := false
var _dirty := false
var _autosave_t := 0.0
var _settings_queued := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	boot()
	apply_settings()


## Loads settings, migrates a 1.x save into slot 1 if present, then resumes the
## last used slot. If no slot exists yet, state stays at defaults (slot -1) and
## the main scene opens the save-slot screen.
func boot() -> void:
	settings = default_settings()
	var legacy_settings := SaveStore.migrate_legacy()
	var stored := SaveStore.read_settings()
	if stored.is_empty() and not legacy_settings.is_empty():
		stored = legacy_settings
	_merge_settings(stored)
	state = default_state()
	current_slot = -1
	var last := int(settings.get("last_slot", -1))
	if last >= 0 and SaveStore.slot_exists(last) and load_slot(last):
		return
	# Settings missing/damaged or last slot unreadable: resume the most recently
	# saved slot instead of silently showing an empty game.
	var best := -1
	var best_t := -1
	for i in SaveStore.SLOTS:
		if i == last or not SaveStore.slot_exists(i):
			continue
		var r := SaveStore.read_slot(i)
		if r["ok"] and int(r["data"].get("saved_at", 0)) > best_t:
			best_t = int(r["data"].get("saved_at", 0))
			best = i
	if best >= 0:
		load_slot(best)


func _merge_settings(stored: Dictionary) -> void:
	for k in settings.keys():
		if stored.has(k) and typeof(stored[k]) in [typeof(settings[k]), TYPE_INT, TYPE_FLOAT, TYPE_BOOL]:
			settings[k] = stored[k]
	if typeof(settings.get("graphics")) == TYPE_STRING:
		settings["graphics"] = maxi(0, ["low", "medium", "high"].find(settings["graphics"]))


func has_active_slot() -> bool:
	return current_slot >= 0


func load_slot(i: int) -> bool:
	var r := SaveStore.read_slot(i)
	last_load_info = r
	if not r["ok"]:
		push_warning("Slot %d could not be loaded: %s" % [i + 1, r.get("error", "?")])
		return false
	state = _sanitize(_migrate(r["data"]))
	current_slot = i
	settings["last_slot"] = i
	_write_settings()
	ensure_daily()
	refresh_unlocks(false)
	if r.get("recovered", false):
		call_deferred("emit_signal", "toast", "Your save was damaged and has been restored from the backup.", "warn")
	coins_changed.emit(coins())
	xp_changed.emit(xp(), level())
	slot_changed.emit(i)
	return true


func new_slot(i: int, profile_name := "") -> void:
	state = default_state()
	state["created_at"] = int(Time.get_unix_time_from_system())
	state["profile_name"] = profile_name if profile_name != "" else "Cleaner %d" % (i + 1)
	current_slot = i
	settings["last_slot"] = i
	_write_settings()
	ensure_daily()
	save_game()
	coins_changed.emit(coins())
	xp_changed.emit(xp(), level())
	slot_changed.emit(i)


func delete_slot(i: int) -> void:
	SaveStore.delete_slot(i)
	if i == current_slot:
		current_slot = -1
		state = default_state()
		settings["last_slot"] = -1
		_write_settings()
		slot_changed.emit(-1)


## Lightweight info for the slot screen (does not change the active slot).
func slot_summary(i: int) -> Dictionary:
	if not SaveStore.slot_exists(i):
		return {"exists": false}
	var r := SaveStore.read_slot(i)
	if not r["ok"]:
		return {"exists": true, "damaged": true}
	var d: Dictionary = r["data"]
	var xp_v := int(d.get("xp", 0))
	var lvl := 1
	while xp_v >= xp_for_level(lvl + 1):
		lvl += 1
	return {"exists": true, "damaged": false, "name": String(d.get("profile_name", "Cleaner %d" % (i + 1))),
		"level": lvl, "coins": int(d.get("coins", 0)), "playtime": float(d.get("playtime", 0.0)),
		"saved_at": int(d.get("saved_at", 0)), "progress": progress_of(d),
		"appearance": Appearance.sanitize(d.get("appearance", {})), "recovered": r.get("recovered", false)}


## Overall completion %: contracts, stars, discoveries and maps.
func progress_of(d: Dictionary) -> float:
	var total_c := Data.all_contracts().size()
	var done := 0
	var stars := 0
	var contracts: Dictionary = d.get("contracts", {}) if typeof(d.get("contracts", {})) == TYPE_DICTIONARY else {}
	for c in contracts.values():
		if typeof(c) == TYPE_DICTIONARY and c.get("completed", false):
			done += 1
			stars += int(c.get("stars", 0))
	var disc: int = d.get("discoveries", []).size() if typeof(d.get("discoveries", [])) == TYPE_ARRAY else 0
	var maps: int = d.get("unlocked_maps", []).size() if typeof(d.get("unlocked_maps", [])) == TYPE_ARRAY else 1
	var p := 0.4 * done / maxf(1, total_c) + 0.3 * stars / maxf(1, total_c * 3) + 0.15 * disc / maxf(1, Data.all_discoveries().size()) + 0.15 * maps / maxf(1, Data.map_order.size())
	return clampf(p, 0.0, 1.0)


func _process(delta: float) -> void:
	if current_slot < 0:
		return
	if not get_tree().paused:
		state["playtime"] = float(state.get("playtime", 0.0)) + delta
	_autosave_t += delta
	if _autosave_t >= AUTOSAVE_INTERVAL:
		_autosave_t = 0.0
		save_game()   # periodic autosave (also stores playtime)


func _notification(what: int) -> void:
	# Mobile OSes may kill a backgrounded app without warning: save on every
	# lifecycle transition, not only on quit.
	if what in [NOTIFICATION_WM_CLOSE_REQUEST, NOTIFICATION_APPLICATION_PAUSED, NOTIFICATION_APPLICATION_FOCUS_OUT, NOTIFICATION_WM_GO_BACK_REQUEST, NOTIFICATION_PREDELETE]:
		if current_slot >= 0 and not state.is_empty():
			save_game()
		_write_settings()


# ---------------------------------------------------------------- defaults ---

func default_state() -> Dictionary:
	return {
		"version": SAVE_VERSION,
		"coins": 200,
		"xp": 0,
		"tools_owned": STARTER_TOOLS.duplicate(),
		"tool_upgrades": {},
		"gear": {},
		"selected_tool": "leaf_blower",
		"contracts": {},
		"map_best": {},
		"discoveries": [],
		"achievements": [],
		"unlocked_maps": ["autumn_garden"],
		"stats": {},
		"daily": {},
		"tutorial_done": false,
		"profile_name": "",
		"appearance": Appearance.defaults(),
		"cosmetics_owned": [],
		"tool_skins": {},
		"playtime": 0.0,
		"created_at": 0,
		"saved_at": 0,
		"save_count": 0,
		"maps": {},          # per location: {dirt_paid, overall, saved_at}
		"active_job": {},    # contract in progress: {map, contract, elapsed}
	}


func default_settings() -> Dictionary:
	return {
		"music": 0.55,
		"sfx": 0.8,
		"graphics": 1,
		"touch": 0,
		"auto_aim": true,
		"cam_sens": 1.0,
		"time_of_day": 0,
		"weather": 0,
		"last_slot": -1,
		"head_bob": 1.0,       # 0 = off, 1 = normal
		"invert_y": false,
		"fov": 72.0,
		"joystick_size": 1.0,
		"button_scale": 1.0,
		"layout": 0,           # 0 = right-handed, 1 = left-handed (mirrored)
	}


# -------------------------------------------------------------- save / load ---

## Reloads the active slot from disk (used by tests and after external changes).
func load_game() -> void:
	if current_slot >= 0:
		if not load_slot(current_slot):
			state = default_state()
	else:
		boot()


func _read_save(path: String):
	var r := SaveStore.decode(SaveStore.backend.read_text(path))
	return r["data"] if r["ok"] else null


func _migrate(data: Dictionary) -> Dictionary:
	var v := int(data.get("version", 1))
	if v < 2:
		# v1 stored settings.graphics as a string.
		var s: Dictionary = data.get("settings", {})
		if typeof(s.get("graphics", 1)) == TYPE_STRING:
			s["graphics"] = ["low", "medium", "high"].find(s["graphics"])
		data["settings"] = s
	if v < 3:
		# v3 (CLEAN RUSH 2.0): character, cosmetics, playtime. Settings moved to a
		# global file (migrated in boot()). Nothing is reset.
		if not data.has("appearance"):
			data["appearance"] = Appearance.defaults()
		if not data.has("playtime"):
			data["playtime"] = 0.0
	data["version"] = SAVE_VERSION
	return data


func _sanitize(data: Dictionary) -> Dictionary:
	var d := default_state()
	for key in d.keys():
		if data.has(key) and typeof(data[key]) == typeof(d[key]):
			d[key] = data[key]
		elif data.has(key) and typeof(d[key]) in [TYPE_INT, TYPE_FLOAT] and typeof(data[key]) in [TYPE_INT, TYPE_FLOAT]:
			d[key] = data[key]
	d["appearance"] = Appearance.sanitize(d["appearance"])
	d["playtime"] = maxf(0.0, float(d["playtime"]))
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
		d["selected_tool"] = "leaf_blower"
	if not d["unlocked_maps"].has("autumn_garden"):
		d["unlocked_maps"].append("autumn_garden")
	return d


func save_game() -> bool:
	_save_queued = false
	if current_slot < 0 or state.is_empty():
		return false
	about_to_save.emit()
	state["version"] = SAVE_VERSION
	state["saved_at"] = int(Time.get_unix_time_from_system())
	state["save_count"] = int(state.get("save_count", 0)) + 1
	var ok := SaveStore.write_slot(current_slot, state, SAVE_VERSION)
	if ok:
		_dirty = false
		_autosave_t = 0.0
		saved.emit(current_slot)
	return ok


func queue_save() -> void:
	_dirty = true
	if _save_queued:
		return
	_save_queued = true
	get_tree().create_timer(1.0, true).timeout.connect(save_game)


## Resets the ACTIVE slot only (other slots and settings are untouched).
func reset_progress() -> void:
	var name_keep := String(state.get("profile_name", ""))
	var look := appearance()
	state = default_state()
	state["profile_name"] = name_keep
	state["appearance"] = look
	ensure_daily()
	save_game()
	coins_changed.emit(coins())
	xp_changed.emit(xp(), level())


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
	if level() < tool_unlock_level(tool_id):
		return false
	if not spend(price):
		return false
	state["tools_owned"].append(tool_id)
	state["selected_tool"] = tool_id
	check_achievements()
	refresh_unlocks(true)
	save_game()
	return true


func tool_unlock_level(tool_id: String) -> int:
	return int(Data.tool_def(tool_id).get("unlock_level", 1))


func tool_locked(tool_id: String) -> bool:
	return not owns_tool(tool_id) and level() < tool_unlock_level(tool_id)


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
	# Dirt and discovery coins were already paid while cleaning (and saved).
	var total := base + star_bonus + dirt_coins + disc_coins
	var pay_now := base + star_bonus
	var xp_gain := int(def.get("xp", 50)) + stars * 10
	if not first_time:
		xp_gain = int(xp_gain * 0.5)
	var prev_stars := int(rec.get("stars", 0))
	var cosmetics_before := earned_cosmetics()
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
	add_coins(pay_now)
	state["active_job"] = {}
	var levels := add_xp(xp_gain)
	var new_maps := refresh_unlocks(true)
	check_achievements()
	var new_cosmetics := []
	for c in earned_cosmetics():
		if not cosmetics_before.has(c):
			new_cosmetics.append(c)
	save_game()
	return {
		"new_cosmetics": new_cosmetics,
		"base": base, "star_bonus": star_bonus, "dirt_coins": dirt_coins, "discovery_coins": disc_coins,
		"total": total, "xp": xp_gain, "levels": levels, "first_time": first_time,
		"new_record": new_record and not first_time, "new_maps": new_maps, "stars": stars,
		"prev_stars": prev_stars, "time": time,
	}


# ------------------------------------------------------ location states ---

func map_entry(map_id: String) -> Dictionary:
	var maps: Dictionary = state.get("maps", {})
	if not maps.has(map_id) or typeof(maps[map_id]) != TYPE_DICTIONARY:
		maps[map_id] = {"dirt_paid": 0, "overall": 0.0, "saved_at": 0}
		state["maps"] = maps
	return maps[map_id]


func map_dirt_paid(map_id: String) -> int:
	return int(map_entry(map_id).get("dirt_paid", 0))


func pay_map_dirt(map_id: String, amount: int) -> void:
	var e := map_entry(map_id)
	e["dirt_paid"] = int(e.get("dirt_paid", 0)) + amount
	add_coins(amount)


## Current restoration % of a location (persists between sessions).
func map_state_overall(map_id: String) -> float:
	return float(map_entry(map_id).get("overall", 0.0))


func store_map_state(map_id: String, data: Dictionary) -> bool:
	if current_slot < 0:
		return false
	var e := map_entry(map_id)
	e["overall"] = float(data.get("overall", 0.0))
	e["saved_at"] = int(Time.get_unix_time_from_system())
	record_map_progress(map_id, e["overall"])
	return SaveStore.write_map_state(current_slot, map_id, data)


func load_map_state(map_id: String) -> Dictionary:
	if current_slot < 0:
		return {}
	return SaveStore.read_map_state(current_slot, map_id)


## Makes the location dirty again (used to replay finished contracts).
func reset_map(map_id: String) -> void:
	map_reset.emit(map_id)   # gameplay stops persisting the old session first
	if current_slot >= 0:
		SaveStore.delete_map_state(current_slot, map_id)
	state["maps"][map_id] = {"dirt_paid": 0, "overall": 0.0, "saved_at": 0}
	if state.get("active_job", {}).get("map", "") == map_id:
		state["active_job"] = {}
	save_game()


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


# ------------------------------------------------------ character / cosmetics ---

func appearance() -> Dictionary:
	return Appearance.sanitize(state.get("appearance", {}))


func set_appearance(a: Dictionary) -> void:
	state["appearance"] = Appearance.sanitize(a)
	save_game()


func profile_name() -> String:
	return String(state.get("profile_name", ""))


func cosmetic_owned(key: String) -> bool:
	return state.get("cosmetics_owned", []).has(key)


## Buys a coin-priced cosmetic (field:id) with in-game coins only.
func buy_cosmetic(field: String, id: String) -> bool:
	var rule := Appearance.unlock_rule(field, id)
	if String(rule.get("type", "")) != "coins" or cosmetic_owned(field + ":" + id):
		return false
	if not spend(int(rule["value"])):
		return false
	state["cosmetics_owned"].append(field + ":" + id)
	save_game()
	return true


func tool_skin_def(skin_id: String) -> Dictionary:
	for s in Data.cosmetics.get("tool_skins", []):
		if s["id"] == skin_id:
			return s
	return {}


func tool_skin_unlocked(skin_id: String) -> bool:
	var rule: Dictionary = tool_skin_def(skin_id).get("unlock", {})
	if rule.is_empty():
		return true
	if String(rule.get("type", "")) == "coins":
		return cosmetic_owned("tool_skin:" + skin_id)
	return Appearance.rule_met(rule)


func buy_tool_skin(skin_id: String) -> bool:
	var rule: Dictionary = tool_skin_def(skin_id).get("unlock", {})
	if String(rule.get("type", "")) != "coins" or tool_skin_unlocked(skin_id):
		return false
	if not spend(int(rule["value"])):
		return false
	state["cosmetics_owned"].append("tool_skin:" + skin_id)
	save_game()
	return true


func tool_skin(tool_id: String) -> String:
	var s := String(state.get("tool_skins", {}).get(tool_id, "default"))
	return s if tool_skin_unlocked(s) else "default"


func set_tool_skin(tool_id: String, skin_id: String) -> void:
	if not tool_skin_unlocked(skin_id):
		return
	state["tool_skins"][tool_id] = skin_id
	save_game()


## All unlock-by-progress cosmetics currently earned (for "new unlock" notices).
func earned_cosmetics() -> Array:
	var out := []
	for field in Appearance.FIELD_CATEGORY.keys():
		for o in Appearance.options(field):
			var rule: Dictionary = o.get("unlock", {})
			if not rule.is_empty() and String(rule.get("type", "")) != "coins" and Appearance.rule_met(rule):
				out.append(String(o.get("name", o["id"])))
	for sk in Data.cosmetics.get("tool_skins", []):
		var r2: Dictionary = sk.get("unlock", {})
		if not r2.is_empty() and String(r2.get("type", "")) != "coins" and Appearance.rule_met(r2):
			out.append("Tool skin: " + String(sk["name"]))
	return out


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
	return settings.get(key, default_settings().get(key))


func set_setting(key: String, value) -> void:
	settings[key] = value
	apply_settings()
	if _settings_queued:
		return
	_settings_queued = true
	get_tree().create_timer(0.5, true).timeout.connect(_write_settings)


func _write_settings() -> void:
	_settings_queued = false
	SaveStore.write_settings(settings)


func apply_settings() -> void:
	Audio.set_volumes(float(setting("music")), float(setting("sfx")))
	var g := int(setting("graphics"))
	var vp := get_viewport()
	if vp:
		vp.msaa_3d = [Viewport.MSAA_DISABLED, Viewport.MSAA_2X, Viewport.MSAA_4X][clampi(g, 0, 2)]
		vp.scaling_3d_scale = [0.75, 1.0, 1.0][clampi(g, 0, 2)]
	settings_changed.emit()


const TIMES_OF_DAY := ["auto", "morning", "afternoon", "evening"]
const WEATHERS := ["auto", "sunny", "cloudy", "windy", "rain"]

## Session override (set by the developer/test hooks); otherwise from settings.
var forced_time := ""
var forced_weather := ""


func resolve_time_of_day(map_id: String) -> String:
	if forced_time != "":
		return forced_time
	var idx := int(setting("time_of_day"))
	if idx > 0 and idx < TIMES_OF_DAY.size():
		return TIMES_OF_DAY[idx]
	# Auto: varies with the job so places feel alive, deterministic per session.
	var h := absi(hash(map_id + str(session.get("visit", 0))))
	return ["morning", "afternoon", "afternoon", "evening"][h % 4]


func resolve_weather(map_id: String) -> String:
	if forced_weather != "":
		return forced_weather
	var idx := int(setting("weather"))
	if idx > 0 and idx < WEATHERS.size():
		return WEATHERS[idx]
	var h := absi(hash(map_id + "w" + str(session.get("visit", 0))))
	return ["sunny", "sunny", "sunny", "sunny", "cloudy", "windy", "sunny", "rain", "sunny", "cloudy"][h % 10]


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
