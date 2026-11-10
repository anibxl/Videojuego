extends Node
## Player settings, persisted separately from game progress so a corrupted
## save never wipes the player's preferences (and vice-versa).

const PATH := "user://settings.cfg"

var master_volume := 0.9
var music_volume := 0.6
var sfx_volume := 0.85
var sensitivity := 1.0          # camera sensitivity multiplier
var invert_y := false
var graphics := 1               # 0 Low, 1 Medium, 2 High
var show_fps := false
var touch_controls := 0         # 0 Auto, 1 Always, 2 Never
var controls_opacity := 0.75
var camera_distance := 5.0

const GRAPHICS_NAMES := ["Low", "Medium", "High"]

func _ready() -> void:
	load_settings()
	# Sensible default for phones on first launch.
	if not FileAccess.file_exists(PATH) and OS.has_feature("mobile"):
		graphics = 0

func load_settings() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		return
	master_volume = clampf(cfg.get_value("audio", "master", master_volume), 0.0, 1.0)
	music_volume = clampf(cfg.get_value("audio", "music", music_volume), 0.0, 1.0)
	sfx_volume = clampf(cfg.get_value("audio", "sfx", sfx_volume), 0.0, 1.0)
	sensitivity = clampf(cfg.get_value("controls", "sensitivity", sensitivity), 0.2, 3.0)
	invert_y = bool(cfg.get_value("controls", "invert_y", invert_y))
	touch_controls = clampi(cfg.get_value("controls", "touch", touch_controls), 0, 2)
	controls_opacity = clampf(cfg.get_value("controls", "opacity", controls_opacity), 0.2, 1.0)
	camera_distance = clampf(cfg.get_value("controls", "camera_distance", camera_distance), 3.0, 8.0)
	graphics = clampi(cfg.get_value("video", "graphics", graphics), 0, 2)
	show_fps = bool(cfg.get_value("video", "show_fps", show_fps))

func save_settings() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("audio", "master", master_volume)
	cfg.set_value("audio", "music", music_volume)
	cfg.set_value("audio", "sfx", sfx_volume)
	cfg.set_value("controls", "sensitivity", sensitivity)
	cfg.set_value("controls", "invert_y", invert_y)
	cfg.set_value("controls", "touch", touch_controls)
	cfg.set_value("controls", "opacity", controls_opacity)
	cfg.set_value("controls", "camera_distance", camera_distance)
	cfg.set_value("video", "graphics", graphics)
	cfg.set_value("video", "show_fps", show_fps)
	cfg.save(PATH)

## Call after changing any value. Persists and broadcasts.
func apply() -> void:
	save_settings()
	Events.settings_changed.emit()

func use_touch_controls() -> bool:
	match touch_controls:
		1: return true
		2: return false
	return DisplayServer.is_touchscreen_available() or OS.has_feature("mobile")
