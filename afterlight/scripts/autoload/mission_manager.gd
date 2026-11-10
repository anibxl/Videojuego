extends Node
## Mission system. Progress is *derived* from game state every refresh
## (rather than incremented by scattered calls), which makes it robust to
## save/load and impossible to desync.

var completed := {}         # id -> true
var tracked := ""           # mission shown on the HUD
var _refreshing := false
var _dirty := false

func reset() -> void:
	completed = {}
	tracked = ""

func is_completed(id: String) -> bool:
	return completed.has(id)

func is_available(id: String) -> bool:
	var pre: String = GameDB.MISSIONS[id].prereq
	return pre == "" or completed.has(pre)

func active_missions() -> Array:
	var out := []
	for id in GameDB.MISSION_ORDER:
		if not completed.has(id) and is_available(id):
			out.append(id)
	return out

## Returns Vector2i(current, goal).
func progress(id: String) -> Vector2i:
	var m: Dictionary = GameDB.MISSIONS[id]
	var goal := int(m.goal)
	if completed.has(id):
		return Vector2i(goal, goal)
	var cur := 0
	match m.kind:
		"tower":
			cur = goal if WorldState.has_flag("tower_powered") else mini(Inventory.fragments, goal)
		"flag":
			if m.has("progress_items"):
				# show shard progress but only complete on the flag
				var n := 0
				for it in m.progress_items:
					if Inventory.has_item(it): n += 1
				goal = m.progress_items.size()
				cur = goal if WorldState.has_flag(m.target) else mini(n, goal)
				return Vector2i(cur, goal)
			cur = 1 if WorldState.has_flag(m.target) else 0
		"flags":
			for f in m.targets:
				if WorldState.has_flag(f): cur += 1
		"location":
			cur = 1 if WorldState.discovered_locations.has(m.target) else 0
		"locations":
			for l in m.targets:
				if WorldState.discovered_locations.has(l): cur += 1
		"items":
			for it in m.targets:
				if Inventory.has_item(it): cur += 1
		"level":
			cur = Progression.level
		"rarity_min":
			cur = Inventory.count_rarity_min(int(m.rarity))
		"notes":
			cur = Inventory.notes_read()
		"locations_count":
			cur = WorldState.discovered_locations.size()
		"hidden_count":
			cur = WorldState.hidden_locations_found()
		"decor":
			cur = WorldState.placed_decor_count()
	return Vector2i(mini(cur, goal), goal)

func _is_done(id: String) -> bool:
	var m: Dictionary = GameDB.MISSIONS[id]
	match m.kind:
		"tower": return WorldState.has_flag("tower_powered")
		"flag": return WorldState.has_flag(m.target)
	var p := progress(id)
	return p.x >= p.y

## Re-evaluates every available mission and awards completions.
## Safe to call often; re-entrant calls are coalesced.
func refresh() -> void:
	if _refreshing:
		_dirty = true
		return
	_refreshing = true
	var changed := true
	while changed:
		changed = false
		_dirty = false
		for id in GameDB.MISSION_ORDER:
			if completed.has(id) or not is_available(id):
				continue
			if _is_done(id):
				_complete(id)
				changed = true
		if _dirty:
			changed = true
	_refreshing = false
	if tracked == "" or completed.has(tracked) or not is_available(tracked):
		tracked = _default_tracked()
	Events.missions_changed.emit()

func _complete(id: String) -> void:
	completed[id] = true
	var m: Dictionary = GameDB.MISSIONS[id]
	Events.mission_completed.emit(id)
	if int(m.fragments) > 0:
		Inventory.add_fragments(int(m.fragments), false)
	Progression.add_xp(int(m.xp), "Mission: " + m.name)

func _default_tracked() -> String:
	var act := active_missions()
	for id in act:
		if GameDB.MISSIONS[id].type == "main":
			return id
	return act[0] if not act.is_empty() else ""

func set_tracked(id: String) -> void:
	tracked = id
	Events.missions_changed.emit()

func to_dict() -> Dictionary:
	return {"completed": completed.keys(), "tracked": tracked}

func from_dict(d: Dictionary) -> void:
	reset()
	for id in d.get("completed", []):
		if GameDB.MISSIONS.has(id):
			completed[str(id)] = true
	tracked = str(d.get("tracked", ""))
	if not GameDB.MISSIONS.has(tracked):
		tracked = ""
