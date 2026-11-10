extends Node
## Items currently owned by the player, the currency (Energy Fragments),
## the collection book record and equipped cosmetics.
##
## INVENTORY  = `items` (what you own now) + `fragments`.
## COLLECTION = `discovered` (everything you have ever discovered).

var fragments := 0
var items := {}          # id -> count
var discovered := {}     # id -> unix time of first discovery
var equipped := {"hat": "", "feather": "", "trail": false}

func reset() -> void:
	fragments = 0
	items = {}
	discovered = {}
	equipped = {"hat": "", "feather": "", "trail": false}

func has_item(id: String) -> bool:
	return int(items.get(id, 0)) > 0

func is_discovered(id: String) -> bool:
	return discovered.has(id)

## Adds an item. Returns true if it was a brand-new discovery.
func add_item(id: String) -> bool:
	var def := GameDB.item(id)
	if def.is_empty():
		push_warning("Unknown item " + id)
		return false
	var is_new := not discovered.has(id)
	items[id] = int(items.get(id, 0)) + 1
	if is_new:
		discovered[id] = int(Time.get_unix_time_from_system())
		Progression.add_xp(GameDB.XP_NOTE if def.category == "note" else GameDB.RARITY_XP[def.rarity], def.name)
	Events.item_acquired.emit(id, is_new)
	Progression.check_achievements()
	Missions.refresh()
	return is_new

func add_fragments(n: int, count_stat := true) -> void:
	fragments = maxi(0, fragments + n)
	if n > 0 and count_stat:
		Progression.stats.fragments_total = int(Progression.stats.get("fragments_total", 0)) + n
	Events.fragments_changed.emit(fragments, n)
	Missions.refresh()

func spend_fragments(n: int) -> bool:
	if fragments < n:
		return false
	add_fragments(-n, false)
	return true

func owned_ids(categories: Array = []) -> Array:
	var out := []
	for id in GameDB.ITEMS:
		if has_item(id) and (categories.is_empty() or GameDB.ITEMS[id].category in categories):
			out.append(id)
	return out

func best_rarity_owned() -> int:
	var best := -1
	for id in items:
		var def := GameDB.item(id)
		if not def.is_empty() and def.category != "note":
			best = maxi(best, def.rarity)
	return best

func count_rarity_min(r: int) -> int:
	var n := 0
	for id in discovered:
		var def := GameDB.item(id)
		if not def.is_empty() and def.category != "note" and def.rarity >= r:
			n += 1
	return n

func notes_read() -> int:
	var n := 0
	for id in discovered:
		if GameDB.item(id).get("category", "") == "note":
			n += 1
	return n

func collection_progress() -> Vector2i:
	return Vector2i(discovered.size(), GameDB.ITEMS.size())

func equip(slot: String, value) -> void:
	equipped[slot] = value
	Events.equipment_changed.emit()

func to_dict() -> Dictionary:
	return {"fragments": fragments, "items": items, "discovered": discovered, "equipped": equipped}

func from_dict(d: Dictionary) -> void:
	reset()
	fragments = maxi(0, int(d.get("fragments", 0)))
	var it: Dictionary = d.get("items", {})
	for k in it:
		if GameDB.ITEMS.has(k):
			items[k] = int(it[k])
	var di: Dictionary = d.get("discovered", {})
	for k in di:
		if GameDB.ITEMS.has(k):
			discovered[k] = int(di[k])
	var eq: Dictionary = d.get("equipped", {})
	for k in eq:
		equipped[k] = eq[k]
