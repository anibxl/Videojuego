extends Node
## Experience, levels, statistics and achievements.

var level := 1
var xp := 0                  # xp inside the current level
var total_xp := 0
var achievements := {}       # id -> true
var stats := {"fragments_total": 0, "play_time": 0.0, "challenges": 0}

func reset() -> void:
	level = 1
	xp = 0
	total_xp = 0
	achievements = {}
	stats = {"fragments_total": 0, "play_time": 0.0, "challenges": 0}

func _process(delta: float) -> void:
	if get_tree().paused:
		return
	stats.play_time = float(stats.get("play_time", 0.0)) + delta

func add_xp(amount: int, reason: String = "") -> void:
	if amount <= 0:
		return
	total_xp += amount
	xp += amount
	Events.xp_gained.emit(amount, reason)
	while level < GameDB.MAX_LEVEL and xp >= GameDB.xp_to_next(level):
		xp -= GameDB.xp_to_next(level)
		level += 1
		Events.level_up.emit(level)
		check_achievements()
	Missions.refresh()

func xp_ratio() -> float:
	if level >= GameDB.MAX_LEVEL:
		return 1.0
	return float(xp) / float(GameDB.xp_to_next(level))

func has_ability(min_level: int) -> bool:
	return level >= min_level

func unlock_achievement(id: String) -> void:
	if achievements.has(id) or not GameDB.ACHIEVEMENTS.has(id):
		return
	achievements[id] = true
	Events.achievement_unlocked.emit(id)

## Evaluates all achievement conditions from current state (idempotent).
func check_achievements() -> void:
	if WorldState.discovered_locations.size() >= 1:
		unlock_achievement("a_first_steps")
	if WorldState.has_flag("tower_powered"):
		unlock_achievement("a_lights_on")
	var best := Inventory.best_rarity_owned()
	if best >= GameDB.Rarity.RARE: unlock_achievement("a_rare")
	if best >= GameDB.Rarity.EPIC: unlock_achievement("a_epic")
	if best >= GameDB.Rarity.LEGENDARY: unlock_achievement("a_legendary")
	if best >= GameDB.Rarity.MYTHIC: unlock_achievement("a_mythic")
	var all_visited := true
	for f in ["city", "mall", "underground", "lab", "rooftops"]:
		if not WorldState.visited_floors.has(f):
			all_visited = false
	if all_visited: unlock_achievement("a_all_floors")
	if level >= 5: unlock_achievement("a_level5")
	if WorldState.has_flag("challenge_lostfound") and WorldState.has_flag("challenge_parkour") and WorldState.has_flag("lab_grid_restored"):
		unlock_achievement("a_challenges")
	if WorldState.placed_decor_count() >= 5: unlock_achievement("a_decorator")
	if int(stats.get("fragments_total", 0)) >= 40: unlock_achievement("a_fragments")
	if WorldState.hidden_locations_found() >= 8: unlock_achievement("a_secrets")

func to_dict() -> Dictionary:
	return {"level": level, "xp": xp, "total_xp": total_xp, "achievements": achievements.keys(), "stats": stats}

func from_dict(d: Dictionary) -> void:
	reset()
	level = clampi(int(d.get("level", 1)), 1, GameDB.MAX_LEVEL)
	xp = maxi(0, int(d.get("xp", 0)))
	total_xp = maxi(0, int(d.get("total_xp", 0)))
	for a in d.get("achievements", []):
		achievements[str(a)] = true
	var s: Dictionary = d.get("stats", {})
	for k in s:
		stats[k] = s[k]
