class_name Appearance
extends RefCounted
## Character appearance data (saved in the player's slot). Every field maps to
## real modular 3D components built by CharacterModel.

## category in cosmetics.json for each id-based field
const FIELD_CATEGORY := {
	"hair_style": "hair_styles", "face": "face_shapes", "brows": "eyebrows", "eyes": "eye_shapes",
	"nose": "noses", "mouth": "mouths", "body": "body_presets", "top": "tops", "bottom": "bottoms",
	"shoes": "shoes", "hat": "hats", "glasses": "glasses", "gloves": "gloves", "watch": "watches",
	"eye_color": "eye_colors",
}
const COLOR_FIELDS := ["hair_color", "top_color", "bottom_color", "shoes_color", "hat_color"]


static func defaults() -> Dictionary:
	return {
		"skin": 1, "hair_style": "short", "hair_color": "#6b4428", "eye_color": "brown",
		"face": "oval", "brows": "soft", "eyes": "almond", "nose": "small", "mouth": "smile",
		"body": "average", "height": 1.0, "build": 1.0,
		"top": "uniform", "top_color": "#1550b8", "bottom": "work_trousers", "bottom_color": "#2b2b30",
		"shoes": "work_shoes", "shoes_color": "#2b2b30", "hat": "cap", "hat_color": "#ff8c2a",
		"glasses": "none", "gloves": "none", "watch": "none",
	}


static func options(field: String) -> Array:
	return Data.cosmetics.get(FIELD_CATEGORY.get(field, field), [])


static func ids(field: String) -> Array:
	var out := []
	for o in options(field):
		out.append(o["id"])
	return out


static func option_def(field: String, id: String) -> Dictionary:
	for o in options(field):
		if o["id"] == id:
			return o
	return {}


## Ensures every field exists and is valid (protects against old/corrupt saves).
static func sanitize(a) -> Dictionary:
	var d := defaults()
	if typeof(a) != TYPE_DICTIONARY:
		return d
	for k in d.keys():
		if not a.has(k):
			continue
		var v = a[k]
		if FIELD_CATEGORY.has(k):
			if typeof(v) == TYPE_STRING and ids(k).has(v):
				d[k] = v
		elif k in COLOR_FIELDS:
			if typeof(v) == TYPE_STRING and Color.html_is_valid(v):
				d[k] = v
		elif k == "skin":
			if typeof(v) in [TYPE_INT, TYPE_FLOAT]:
				d[k] = clampi(int(v), 0, Data.cosmetics.get("skin_tones", [1]).size() - 1)
		elif k in ["height", "build"]:
			if typeof(v) in [TYPE_INT, TYPE_FLOAT]:
				d[k] = clampf(float(v), 0.92 if k == "height" else 0.9, 1.08 if k == "height" else 1.12)
	return d


static func skin_color(a: Dictionary) -> Color:
	var tones: Array = Data.cosmetics.get("skin_tones", ["#e2a882"])
	return Color(tones[clampi(int(a.get("skin", 1)), 0, tones.size() - 1)])


static func eye_color(a: Dictionary) -> Color:
	return Color(String(option_def("eye_color", String(a.get("eye_color", "brown"))).get("color", "#5a3a22")))


# -------------------------------------------------------------- unlocks ---

static func unlock_rule(field: String, id: String) -> Dictionary:
	return option_def(field, id).get("unlock", {})


static func rule_met(rule: Dictionary) -> bool:
	if rule.is_empty():
		return true
	match String(rule.get("type", "")):
		"level":
			return Game.level() >= int(rule["value"])
		"stars":
			return Game.total_stars() >= int(rule["value"])
		"contracts":
			return Game.contracts_completed_count() >= int(rule["value"])
		"achievement":
			return Game.state.get("achievements", []).has(rule["value"])
		"coins":
			return false   # must be bought (see Game.cosmetic_owned)
	return false


static func rule_text(rule: Dictionary) -> String:
	match String(rule.get("type", "")):
		"level":
			return "Reach level %d" % int(rule["value"])
		"stars":
			return "Earn %d stars" % int(rule["value"])
		"contracts":
			return "Complete %d contracts" % int(rule["value"])
		"achievement":
			for a in Data.achievements:
				if a["id"] == rule["value"]:
					return "Achievement: " + String(a["name"])
			return "Achievement"
		"coins":
			return "%d coins" % int(rule["value"])
	return ""


static func is_unlocked(field: String, id: String) -> bool:
	var rule := unlock_rule(field, id)
	if rule.is_empty():
		return true
	if String(rule.get("type", "")) == "coins":
		return Game.cosmetic_owned(field + ":" + id)
	return rule_met(rule)


## Random but coherent look using only unlocked items.
static func randomized(rng: RandomNumberGenerator) -> Dictionary:
	var a := defaults()
	for field in FIELD_CATEGORY.keys():
		var pool := []
		for id in ids(field):
			if is_unlocked(field, id):
				pool.append(id)
		if not pool.is_empty():
			a[field] = pool[rng.randi() % pool.size()]
	# Accessories: mostly none, sometimes something.
	for f in ["glasses", "gloves", "watch"]:
		if rng.randf() < 0.6:
			a[f] = "none"
	var hair: Array = Data.cosmetics.get("hair_colors", [])
	a["hair_color"] = hair[rng.randi() % hair.size()]["color"]
	var cols: Array = Data.cosmetics.get("outfit_colors", ["#1550b8"])
	for f in ["top_color", "bottom_color", "shoes_color", "hat_color"]:
		a[f] = cols[rng.randi() % cols.size()]
	a["skin"] = rng.randi() % Data.cosmetics.get("skin_tones", [1]).size()
	a["height"] = snappedf(rng.randf_range(0.94, 1.06), 0.01)
	a["build"] = snappedf(rng.randf_range(0.92, 1.08), 0.01)
	return a
