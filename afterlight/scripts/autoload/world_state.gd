extends Node
## Persistent state of the world: flags, discovered locations, picked-up
## world objects, unlocked floors and the personal room.
## (Kept separate from the player's own data so a future multiplayer layer
## can distinguish shared world state from per-player state.)

var flags := {}
var discovered_locations := {}
var visited_floors := {}
var collected := {}            # world pickup uid -> true (each pickup exists once)
var unlocked_decor := {}
var placed_decor := {}
var display_slots: Array = []
var current_floor := "city"
var player_position := Vector3.INF
var player_yaw := 0.0

func reset() -> void:
	flags = {}
	discovered_locations = {}
	visited_floors = {}
	collected = {}
	unlocked_decor = {}
	placed_decor = {}
	display_slots = []
	for i in GameDB.DISPLAY_SLOTS:
		display_slots.append("")
	current_floor = "city"
	player_position = Vector3.INF
	player_yaw = 0.0

func _ready() -> void:
	reset()

# ---------------------------------------------------------------- flags
func has_flag(f: String) -> bool:
	return flags.has(f)

func set_flag(f: String) -> void:
	if flags.has(f):
		return
	flags[f] = true
	Events.flag_set.emit(f)
	Progression.check_achievements()
	Missions.refresh()

# ---------------------------------------------------------------- pickups
func is_collected(uid: String) -> bool:
	return collected.has(uid)

func mark_collected(uid: String) -> void:
	collected[uid] = true

# ---------------------------------------------------------------- locations
func discover_location(id: String) -> bool:
	if discovered_locations.has(id) or not GameDB.LOCATIONS.has(id):
		return false
	discovered_locations[id] = true
	var def: Dictionary = GameDB.LOCATIONS[id]
	Events.location_discovered.emit(id)
	Progression.add_xp(GameDB.XP_HIDDEN_LOCATION if def.hidden else GameDB.XP_LOCATION, def.name)
	Progression.check_achievements()
	Missions.refresh()
	return true

func hidden_locations_found() -> int:
	var n := 0
	for id in discovered_locations:
		if GameDB.LOCATIONS.get(id, {}).get("hidden", false):
			n += 1
	return n

# ---------------------------------------------------------------- floors
func visit_floor(id: String) -> void:
	current_floor = id
	if not visited_floors.has(id):
		visited_floors[id] = true
		Progression.check_achievements()

func is_floor_unlocked(id: String) -> bool:
	return floor_lock_reason(id) == ""

## Returns "" when unlocked, otherwise a human-readable requirement.
func floor_lock_reason(id: String) -> String:
	var def := GameDB.floor_def(id)
	if def.is_empty():
		return "Unknown floor."
	var req: Dictionary = def.req
	if req.has("future"):
		return def.req_text
	if req.has("flag") and not has_flag(req.flag):
		return def.req_text
	if req.has("level") and Progression.level < int(req.level):
		return "%s (You are Level %d.)" % [def.req_text, Progression.level]
	if req.has("item") and not Inventory.has_item(req.item):
		return def.req_text
	if req.has("items"):
		var have := 0
		for it in req.items:
			if Inventory.has_item(it):
				have += 1
		if have < req.items.size():
			return "%s (%d / %d)" % [def.req_text, have, req.items.size()]
	return ""

# ---------------------------------------------------------------- personal room
func is_decor_unlocked(id: String) -> bool:
	return unlocked_decor.has(id)

func decor_lock_reason(id: String) -> String:
	var req: Dictionary = GameDB.DECOR[id].req
	if req.has("level") and Progression.level < int(req.level):
		return "Requires Level %d" % int(req.level)
	if req.has("item") and not Inventory.has_item(req.item):
		return "Requires: " + GameDB.item(req.item).name
	return ""

## Unlocks (buys) a decoration. Returns true on success.
func unlock_decor(id: String) -> bool:
	if is_decor_unlocked(id):
		return true
	if decor_lock_reason(id) != "":
		return false
	if not Inventory.spend_fragments(int(GameDB.DECOR[id].cost)):
		return false
	unlocked_decor[id] = true
	return true

func set_decor_placed(id: String, placed: bool) -> void:
	if placed and not is_decor_unlocked(id):
		return
	if placed:
		placed_decor[id] = true
	else:
		placed_decor.erase(id)
	Events.decor_changed.emit()
	Progression.check_achievements()
	Missions.refresh()

func placed_decor_count() -> int:
	return placed_decor.size()

func set_display_slot(i: int, item_id: String) -> void:
	if i < 0 or i >= display_slots.size():
		return
	if item_id != "":
		# an item can only be displayed in one slot
		for j in display_slots.size():
			if display_slots[j] == item_id:
				display_slots[j] = ""
	display_slots[i] = item_id
	Events.decor_changed.emit()

# ---------------------------------------------------------------- persistence
func to_dict() -> Dictionary:
	var pos := []
	if player_position != Vector3.INF:
		pos = [player_position.x, player_position.y, player_position.z]
	return {
		"flags": flags.keys(), "locations": discovered_locations.keys(), "visited": visited_floors.keys(),
		"collected": collected.keys(), "unlocked_decor": unlocked_decor.keys(), "placed_decor": placed_decor.keys(),
		"display_slots": display_slots, "current_floor": current_floor, "player_position": pos, "player_yaw": player_yaw,
	}

func from_dict(d: Dictionary) -> void:
	reset()
	for f in d.get("flags", []): flags[str(f)] = true
	for f in d.get("locations", []):
		if GameDB.LOCATIONS.has(f): discovered_locations[str(f)] = true
	for f in d.get("visited", []): visited_floors[str(f)] = true
	for f in d.get("collected", []): collected[str(f)] = true
	for f in d.get("unlocked_decor", []):
		if GameDB.DECOR.has(f): unlocked_decor[str(f)] = true
	for f in d.get("placed_decor", []):
		if unlocked_decor.has(f): placed_decor[str(f)] = true
	var ds: Array = d.get("display_slots", [])
	for i in mini(ds.size(), display_slots.size()):
		var id := str(ds[i])
		display_slots[i] = id if GameDB.ITEMS.has(id) else ""
	var cf := str(d.get("current_floor", "city"))
	current_floor = cf if cf in GameDB.PLAYABLE_FLOORS else "city"
	var p: Array = d.get("player_position", [])
	if p.size() == 3:
		player_position = Vector3(float(p[0]), float(p[1]), float(p[2]))
	player_yaw = float(d.get("player_yaw", 0.0))
