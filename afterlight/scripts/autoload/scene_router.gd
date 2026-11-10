extends CanvasLayer
## Scene transitions + loading screen. Lives above everything (layer 100).

var _overlay: ColorRect
var _logo: Label
var _sub: Label
var _tip: Label
var _bar_bg: Panel
var _bar: Panel
var _busy := false
var _t := 0.0

func _ready() -> void:
	layer = 100
	process_mode = Node.PROCESS_MODE_ALWAYS
	_overlay = ColorRect.new()
	_overlay.color = UIKit.BG
	_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_overlay.modulate.a = 0.0
	add_child(_overlay)
	var center := VBoxContainer.new()
	center.set_anchors_preset(Control.PRESET_CENTER)
	center.grow_horizontal = Control.GROW_DIRECTION_BOTH
	center.grow_vertical = Control.GROW_DIRECTION_BOTH
	center.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_theme_constant_override("separation", 10)
	_overlay.add_child(center)
	_logo = UIKit.title("AFTERLIGHT", 64)
	_logo.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_logo.add_theme_color_override("font_color", UIKit.CYAN)
	center.add_child(_logo)
	_sub = UIKit.label("", 26, UIKit.TEXT, UIKit.font_semi)
	_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center.add_child(_sub)
	_bar_bg = Panel.new()
	_bar_bg.custom_minimum_size = Vector2(320, 4)
	_bar_bg.add_theme_stylebox_override("panel", UIKit.box(Color(1, 1, 1, 0.08), 2, Color(), 0, 0))
	center.add_child(_bar_bg)
	_bar = Panel.new()
	_bar.add_theme_stylebox_override("panel", UIKit.box(UIKit.CYAN, 2, Color(), 0, 0))
	_bar.size = Vector2(80, 4)
	_bar_bg.add_child(_bar)
	_tip = UIKit.wrap_label("", 20)
	_tip.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_tip.custom_minimum_size = Vector2(560, 0)
	center.add_child(UIKit.spacer(16))
	center.add_child(_tip)

func _process(delta: float) -> void:
	if _overlay.modulate.a > 0.01:
		_t += delta
		_bar.position.x = (sin(_t * 2.4) * 0.5 + 0.5) * (320 - 80)
		_logo.modulate.a = 0.75 + 0.25 * sin(_t * 3.0)

## Fades to the loading screen. `subtitle` "" = plain black fade.
func show_loading(subtitle := "", duration := 0.45) -> void:
	_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	var full := subtitle != ""
	_logo.visible = full
	_bar_bg.visible = full
	_tip.visible = full
	_sub.text = subtitle
	if full:
		_tip.text = GameDB.TIPS[randi() % GameDB.TIPS.size()]
	var tw := create_tween()
	tw.tween_property(_overlay, "modulate:a", 1.0, duration)
	await tw.finished

func hide_loading(duration := 0.6) -> void:
	var tw := create_tween()
	tw.tween_property(_overlay, "modulate:a", 0.0, duration)
	await tw.finished
	_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE

func go_to(path: String, subtitle := "") -> void:
	if _busy:
		return
	_busy = true
	await show_loading(subtitle)
	get_tree().paused = false
	get_tree().change_scene_to_file(path)
	# give the new scene a couple of frames to build its world
	await get_tree().process_frame
	await get_tree().process_frame
	await get_tree().create_timer(0.25).timeout
	_busy = false
	await hide_loading()

func is_busy() -> bool:
	return _busy
