extends Node
## Safe, versioned local save system.
##
## * JSON on disk (user://), human-readable and easy to migrate.
## * Atomic write: data -> .tmp, verified, previous save kept as .bak, then
##   renamed into place. A crash mid-write never corrupts the main save.
## * Falls back to the .bak file if the main file is unreadable.
## * Autosaves on important events (debounced), every 45 s while playing,
##   and when the app is paused / backgrounded / closed (critical on mobile).

const SAVE_VERSION := 1
const PATH := "user://afterlight_save.json"
const TMP_PATH := "user://afterlight_save.json.tmp"
const BAK_PATH := "user://afterlight_save.json.bak"
const AUTOSAVE_INTERVAL := 45.0

signal before_save          # gameplay code captures transient state (player position)

var in_game := false
var _pending := false
var _timer := 0.0
var last_save_unix := 0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	# Event-driven autosave: anything meaningful triggers a debounced save.
	Events.item_acquired.connect(func(_a, _b): request_save())
	Events.location_discovered.connect(func(_a): request_save())
	Events.mission_completed.connect(func(_a): request_save())
	Events.level_up.connect(func(_a): request_save())
	Events.flag_set.connect(func(_a): request_save())
	Events.decor_changed.connect(request_save)
	Events.equipment_changed.connect(request_save)

func _process(delta: float) -> void:
	if not in_game:
		return
	_timer += delta
	if _pending or _timer >= AUTOSAVE_INTERVAL:
		save_game()

func request_save() -> void:
	if in_game:
		_pending = true

func _notification(what: int) -> void:
	match what:
		NOTIFICATION_WM_CLOSE_REQUEST:
			if in_game:
				save_game()
			get_tree().quit()
		NOTIFICATION_APPLICATION_PAUSED, NOTIFICATION_APPLICATION_FOCUS_OUT, NOTIFICATION_WM_GO_BACK_REQUEST:
			if in_game:
				save_game()

func has_save() -> bool:
	return FileAccess.file_exists(PATH) or FileAccess.file_exists(BAK_PATH)

func build_save_dict() -> Dictionary:
	before_save.emit()
	return {
		"version": SAVE_VERSION,
		"saved_at": int(Time.get_unix_time_from_system()),
		"progression": Progression.to_dict(),
		"inventory": Inventory.to_dict(),
		"world": WorldState.to_dict(),
		"missions": Missions.to_dict(),
	}

func save_game() -> bool:
	_pending = false
	_timer = 0.0
	var data := build_save_dict()
	var text := JSON.stringify(data, "\t")
	var f := FileAccess.open(TMP_PATH, FileAccess.WRITE)
	if f == null:
		push_error("Save failed: cannot open temp file (%s)" % error_string(FileAccess.get_open_error()))
		return false
	f.store_string(text)
	f.close()
	# Verify what we wrote parses before replacing the real save.
	if _read_file(TMP_PATH).is_empty():
		push_error("Save failed: verification of temp file failed")
		return false
	var dir := DirAccess.open("user://")
	if dir == null:
		return false
	if dir.file_exists(PATH.get_file()):
		if dir.file_exists(BAK_PATH.get_file()):
			dir.remove(BAK_PATH.get_file())
		dir.rename(PATH.get_file(), BAK_PATH.get_file())
	var err := dir.rename(TMP_PATH.get_file(), PATH.get_file())
	if err != OK:
		push_error("Save failed: rename error %s" % error_string(err))
		return false
	last_save_unix = int(data.saved_at)
	Events.game_saved.emit()
	return true

func _read_file(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return {}
	var parsed = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY or not parsed.has("version"):
		return {}
	return parsed

## Loads the save into all systems. Returns false if no valid save exists
## (systems are then reset to a fresh game).
func load_game() -> bool:
	var data := _read_file(PATH)
	if data.is_empty():
		data = _read_file(BAK_PATH)
		if not data.is_empty():
			push_warning("Main save unreadable — restored from backup.")
	if data.is_empty():
		reset_all()
		return false
	data = migrate(data)
	Progression.from_dict(data.get("progression", {}))
	Inventory.from_dict(data.get("inventory", {}))
	WorldState.from_dict(data.get("world", {}))
	Missions.from_dict(data.get("missions", {}))
	last_save_unix = int(data.get("saved_at", 0))
	return true

## Upgrades older save formats. Add a step per version bump.
func migrate(data: Dictionary) -> Dictionary:
	var v := int(data.get("version", 1))
	# Example for the future:
	# if v < 2:
	#     data.world["new_field"] = default
	#     v = 2
	data.version = maxi(v, SAVE_VERSION)
	return data

func reset_all() -> void:
	Progression.reset()
	Inventory.reset()
	WorldState.reset()
	Missions.reset()

func delete_save() -> void:
	var dir := DirAccess.open("user://")
	if dir == null:
		return
	for p in [PATH, TMP_PATH, BAK_PATH]:
		if dir.file_exists(p.get_file()):
			dir.remove(p.get_file())
	reset_all()

## Short summary for the main menu ("Level 4 · 12/29 discovered").
func summary() -> Dictionary:
	var data := _read_file(PATH)
	if data.is_empty():
		data = _read_file(BAK_PATH)
	if data.is_empty():
		return {}
	var prog: Dictionary = data.get("progression", {})
	var inv: Dictionary = data.get("inventory", {})
	return {"level": int(prog.get("level", 1)), "discovered": inv.get("discovered", {}).size(),
		"play_time": float(prog.get("stats", {}).get("play_time", 0.0)), "floor": str(data.get("world", {}).get("current_floor", "city"))}
