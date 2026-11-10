class_name SaveStore
extends RefCounted
## Professional local save storage: 3 slots, versioned files with a SHA-256
## checksum header, atomic writes with verification, automatic backup files,
## corruption detection and recovery, global settings file, and migration of
## the 1.x single-file save into slot 1.
##
## File layout (one per slot):
##   line 1: {"format":"cleanrush-save","version":N,"checksum":"<sha256 of body>","saved_at":T}
##   line 2+: the JSON body (player data)

const FORMAT := "cleanrush-save"
const SLOTS := 3
const DIR := "user://saves"
const SETTINGS_PATH := "user://saves/settings.json"
const LEGACY_PATH := "user://clean_rush_save.json"
const LEGACY_BACKUP := "user://clean_rush_save.bak"

static var backend: SaveBackend = SaveBackend.new()


static func slot_path(i: int) -> String:
	return "%s/slot_%d.sav" % [DIR, i + 1]


static func backup_path(i: int) -> String:
	return slot_path(i) + ".bak"


static func encode(data: Dictionary, version: int) -> String:
	var body := JSON.stringify(data, "\t")
	var header := {"format": FORMAT, "version": version, "checksum": body.sha256_text(), "saved_at": int(Time.get_unix_time_from_system())}
	return JSON.stringify(header) + "\n" + body


## Returns {ok, data, error}. Accepts the current format and the legacy raw JSON.
static func decode(text: String) -> Dictionary:
	if text.strip_edges() == "":
		return {"ok": false, "error": "empty"}
	var nl := text.find("\n")
	if nl > 0:
		var header = JSON.parse_string(text.substr(0, nl))
		if typeof(header) == TYPE_DICTIONARY and header.get("format", "") == FORMAT:
			var body := text.substr(nl + 1)
			if body.sha256_text() != String(header.get("checksum", "")):
				return {"ok": false, "error": "checksum mismatch"}
			var data = JSON.parse_string(body)
			if typeof(data) != TYPE_DICTIONARY:
				return {"ok": false, "error": "invalid body"}
			return {"ok": true, "data": data, "header": header}
	# Legacy 1.x format: the whole file is the JSON state.
	var legacy = JSON.parse_string(text)
	if typeof(legacy) == TYPE_DICTIONARY and legacy.has("version"):
		return {"ok": true, "data": legacy, "header": {"version": legacy.get("version", 1)}}
	return {"ok": false, "error": "unreadable"}


static func write_slot(i: int, data: Dictionary, version: int) -> bool:
	backend.ensure_dir(DIR)
	return backend.write_text_atomic(slot_path(i), encode(data, version), backup_path(i))


## Returns {ok, data, source: "main"|"backup", recovered: bool, error}
static func read_slot(i: int) -> Dictionary:
	var main := decode(backend.read_text(slot_path(i))) if backend.exists(slot_path(i)) else {"ok": false, "error": "missing"}
	if main["ok"]:
		main["source"] = "main"
		main["recovered"] = false
		return main
	if backend.exists(backup_path(i)):
		var bak := decode(backend.read_text(backup_path(i)))
		if bak["ok"]:
			# Keep the damaged file for inspection, restore the backup as main.
			if backend.exists(slot_path(i)):
				backend.rename(slot_path(i), slot_path(i) + ".corrupt")
			backend.write_text_atomic(slot_path(i), encode(bak["data"], int(bak["header"].get("version", 1))))
			bak["source"] = "backup"
			bak["recovered"] = true
			return bak
	return {"ok": false, "error": main.get("error", "missing"), "damaged": backend.exists(slot_path(i))}


# ------------------------------------------------------------ map states ---
# Each slot keeps one file per location with the exact restoration state
# (per-pixel dirt of every surface, every leaf/litter piece, found items), so a
# 45 % clean garden is still 45 % clean - with the same clean areas - next time.

static func map_state_path(i: int, map_id: String) -> String:
	return "%s/slot_%d_map_%s.sav" % [DIR, i + 1, map_id]


static func write_map_state(i: int, map_id: String, data: Dictionary) -> bool:
	backend.ensure_dir(DIR)
	return backend.write_text_atomic(map_state_path(i, map_id), encode(data, 1), map_state_path(i, map_id) + ".bak")


static func read_map_state(i: int, map_id: String) -> Dictionary:
	var p := map_state_path(i, map_id)
	for path in [p, p + ".bak"]:
		if backend.exists(path):
			var r := decode(backend.read_text(path))
			if r["ok"]:
				return r["data"]
	return {}


static func delete_map_state(i: int, map_id: String) -> void:
	var p := map_state_path(i, map_id)
	for path in [p, p + ".bak", p + ".tmp"]:
		backend.remove(path)


static func slot_exists(i: int) -> bool:
	return backend.exists(slot_path(i)) or backend.exists(backup_path(i))


static func delete_slot(i: int) -> void:
	for p in [slot_path(i), backup_path(i), slot_path(i) + ".tmp", slot_path(i) + ".corrupt"]:
		backend.remove(p)
	for map_id in Data.map_order:
		delete_map_state(i, map_id)


# --------------------------------------------------------------- settings ---

static func read_settings() -> Dictionary:
	var r := decode(backend.read_text(SETTINGS_PATH)) if backend.exists(SETTINGS_PATH) else {"ok": false}
	if not r["ok"] and backend.exists(SETTINGS_PATH + ".bak"):
		r = decode(backend.read_text(SETTINGS_PATH + ".bak"))
	return r["data"] if r["ok"] else {}


static func write_settings(s: Dictionary) -> bool:
	backend.ensure_dir(DIR)
	return backend.write_text_atomic(SETTINGS_PATH, encode(s, 1), SETTINGS_PATH + ".bak")


# --------------------------------------------------------------- migration ---

## Moves a 1.x save (single file) into slot 1. Never deletes the old file: it is
## renamed to *.migrated. Returns the legacy settings (or {}).
static func migrate_legacy() -> Dictionary:
	if not backend.exists(LEGACY_PATH) and not backend.exists(LEGACY_BACKUP):
		return {}
	for i in SLOTS:
		if slot_exists(i):
			return {}
	var r := decode(backend.read_text(LEGACY_PATH))
	if not r["ok"]:
		r = decode(backend.read_text(LEGACY_BACKUP))
	if not r["ok"]:
		return {}
	var data: Dictionary = r["data"]
	var settings: Dictionary = data.get("settings", {}) if typeof(data.get("settings", {})) == TYPE_DICTIONARY else {}
	data["migrated_from"] = int(data.get("version", 1))
	if write_slot(0, data, int(data.get("version", 1))):
		backend.rename(LEGACY_PATH, LEGACY_PATH + ".migrated")
		backend.rename(LEGACY_BACKUP, LEGACY_BACKUP + ".migrated")
	return settings
