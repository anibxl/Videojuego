extends Node
## Static game database. Loads every JSON definition in res://data so new
## maps, tools, dirt types and achievements can be added without touching code.

const PALETTE := {
	"deep_blue": Color("0b2e66"),
	"blue": Color("1550b8"),
	"turquoise": Color("1fc8c8"),
	"green": Color("5bd66b"),
	"orange": Color("ff8c2a"),
	"white": Color("ffffff"),
	"ink": Color("0a1e3c"),
	"panel": Color("102f5e"),
	"gold": Color("ffc93c"),
	"red": Color("ff5a5a"),
}

var dirt_types: Dictionary = {}
var tools: Dictionary = {}
var tool_order: Array = []
var upgrade_effects: Dictionary = {}
var gear: Dictionary = {}
var maps: Dictionary = {}
var map_order: Array = []
var achievements: Array = []
var daily_templates: Array = []
var cosmetics: Dictionary = {}
var _icon_cache: Dictionary = {}


func _init() -> void:
	_load_all()


func _load_all() -> void:
	dirt_types = _read_json("res://data/dirt_types.json")
	var td: Dictionary = _read_json("res://data/tools.json")
	tools = td.get("tools", {})
	tool_order = td.get("order", tools.keys())
	upgrade_effects = td.get("upgrade_effects", {})
	gear = td.get("gear", {})
	var index: Dictionary = _read_json("res://data/maps/index.json")
	for map_id in index.get("maps", []):
		var m: Dictionary = _read_json("res://data/maps/%s.json" % map_id)
		if m.is_empty():
			push_error("Missing map definition: %s" % map_id)
			continue
		maps[map_id] = m
		map_order.append(map_id)
	var ad: Dictionary = _read_json("res://data/achievements.json")
	achievements = ad.get("achievements", [])
	daily_templates = ad.get("daily_templates", [])
	cosmetics = _read_json("res://data/cosmetics.json")


func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		push_error("Data file not found: " + path)
		return {}
	var f := FileAccess.open(path, FileAccess.READ)
	var parsed = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("Invalid JSON: " + path)
		return {}
	return parsed


func tool_def(tool_id: String) -> Dictionary:
	return tools.get(tool_id, {})


func map_def(map_id: String) -> Dictionary:
	return maps.get(map_id, {})


func contract_def(map_id: String, contract_id: String) -> Dictionary:
	for c in map_def(map_id).get("contracts", []):
		if c["id"] == contract_id:
			return c
	return {}


func all_contracts() -> Array:
	var out := []
	for map_id in map_order:
		for c in maps[map_id].get("contracts", []):
			out.append({"map": map_id, "contract": c})
	return out


func all_discoveries() -> Array:
	var out := []
	for map_id in map_order:
		for d in maps[map_id].get("discoveries", []):
			var e: Dictionary = d.duplicate()
			e["map"] = map_id
			out.append(e)
	return out


func discovery_def(map_id: String, disc_id: String) -> Dictionary:
	for d in map_def(map_id).get("discoveries", []):
		if d["id"] == disc_id:
			return d
	return {}


func dirt_def(dirt_id: String) -> Dictionary:
	return dirt_types.get(dirt_id, dirt_types.get("grime", {}))


static func arr_color(a, alpha := 1.0) -> Color:
	if a is Array and a.size() >= 3:
		return Color(a[0], a[1], a[2], alpha)
	return Color(1, 1, 1, alpha)


func icon(path: String) -> Texture2D:
	if _icon_cache.has(path):
		return _icon_cache[path]
	var tex: Texture2D = null
	if ResourceLoader.exists(path):
		tex = load(path)
	_icon_cache[path] = tex
	return tex


func tool_icon(tool_id: String) -> Texture2D:
	return icon("res://assets/icons/tools/%s.svg" % tool_id)


func item_icon(model: String) -> Texture2D:
	return icon("res://assets/icons/items/%s.svg" % model)


func ui_icon(name: String) -> Texture2D:
	return icon("res://assets/icons/ui/%s.svg" % name)
