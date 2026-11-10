class_name TouchControls
extends Control
## Multi-touch gameplay controls: floating virtual joystick on the left half,
## a big CLEAN hold button and RUN toggle on the right, and camera drag on the
## remaining right-side area. Handles each finger independently.

var player: Player
var rig: CameraRig
var _joy_finger := -1
var _joy_center := Vector2.ZERO
var _joy_vec := Vector2.ZERO
var _clean_finger := -1
var _cam_finger := -1
var _cam_last := Vector2.ZERO
var _run_on := false
var _pulse := 0.0
const JOY_RADIUS := 90.0
const MOUSE_ID := 99


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func clean_center() -> Vector2:
	return Vector2(size.x - 150, size.y - 160)


func clean_radius() -> float:
	return 92.0


func run_center() -> Vector2:
	return Vector2(size.x - 300, size.y - 90)


func joy_home() -> Vector2:
	return Vector2(190, size.y - 170)


func _process(delta: float) -> void:
	_pulse += delta
	if player and visible:
		player.move_input = _joy_vec
		player.clean_held = _clean_finger != -1
		player.run_toggle = _run_on
	queue_redraw()


func _input(event: InputEvent) -> void:
	if not is_visible_in_tree() or player == null or get_tree().paused:
		return
	if event is InputEventScreenTouch:
		_touch(event.index, event.position, event.pressed)
	elif event is InputEventScreenDrag:
		_drag(event.index, event.position, event.relative)
	elif not DisplayServer.is_touchscreen_available():
		# Desktop testing of the touch layout with the mouse.
		if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
			if _touch(MOUSE_ID, event.position, event.pressed):
				get_viewport().set_input_as_handled()
		elif event is InputEventMouseMotion and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
			_drag(MOUSE_ID, event.position, event.relative)


func _blocked_by_ui(p: Vector2) -> bool:
	# Leave room for HUD buttons (top bar, objectives, tool buttons).
	if p.y < 110:
		return true
	for c in get_tree().get_nodes_in_group("hud_button"):
		var ctl := c as Control
		if ctl.is_visible_in_tree() and ctl.get_global_rect().has_point(p):
			return true
	return false


func _touch(id: int, p: Vector2, pressed: bool) -> bool:
	if pressed:
		if _blocked_by_ui(p):
			return false
		if p.distance_to(clean_center()) < clean_radius() + 20 and _clean_finger == -1:
			_clean_finger = id
			return true
		if p.distance_to(run_center()) < 60:
			_run_on = not _run_on
			Audio.play("ui_click")
			return true
		if p.x < size.x * 0.45 and _joy_finger == -1:
			_joy_finger = id
			_joy_center = p
			_joy_vec = Vector2.ZERO
			return true
		if _cam_finger == -1:
			_cam_finger = id
			_cam_last = p
			return true
	else:
		var handled := false
		if id == _joy_finger:
			_joy_finger = -1
			_joy_vec = Vector2.ZERO
			handled = true
		if id == _clean_finger:
			_clean_finger = -1
			handled = true
		if id == _cam_finger:
			_cam_finger = -1
			handled = true
		return handled
	return false


func _drag(id: int, p: Vector2, rel: Vector2) -> void:
	if id == _joy_finger:
		var d := p - _joy_center
		if d.length() > JOY_RADIUS:
			# Floating joystick follows the finger for comfort.
			_joy_center = p - d.normalized() * JOY_RADIUS
			d = p - _joy_center
		_joy_vec = d / JOY_RADIUS
		if _joy_vec.length() < 0.12:
			_joy_vec = Vector2.ZERO
	elif id == _cam_finger and rig:
		rig.rotate_yaw(-rel.x * 0.007 * float(Game.setting("cam_sens")))
		rig.zoom(rel.y * 0.01)


func _draw() -> void:
	var font := get_theme_default_font()
	# Joystick
	var jc := _joy_center if _joy_finger != -1 else joy_home()
	draw_circle(jc, JOY_RADIUS, Color(0.04, 0.12, 0.25, 0.35))
	draw_arc(jc, JOY_RADIUS, 0, TAU, 48, Color(1, 1, 1, 0.5), 4.0, true)
	draw_circle(jc + _joy_vec * JOY_RADIUS, 42, Color(1, 1, 1, 0.85 if _joy_finger != -1 else 0.55))
	draw_circle(jc + _joy_vec * JOY_RADIUS, 34, Color(UIKit.TURQ, 0.9 if _joy_finger != -1 else 0.6))
	# Clean button
	var cc := clean_center()
	var pressed := _clean_finger != -1
	var r := clean_radius() * (0.94 if pressed else 1.0 + sin(_pulse * 3.0) * 0.015)
	draw_circle(cc + Vector2(0, 7), r, Color(0, 0, 0, 0.25))
	draw_circle(cc, r, UIKit.ORANGE.darkened(0.25))
	draw_circle(cc - Vector2(0, 0 if pressed else 5), r - 6, UIKit.ORANGE if not pressed else UIKit.ORANGE.lightened(0.15))
	var icon := Data.tool_icon(player.tool.tool_id) if player else null
	if icon:
		draw_texture_rect(icon, Rect2(cc - Vector2(40, 52), Vector2(80, 80)), false)
	draw_string(font, cc + Vector2(-60, 52), "CLEAN", HORIZONTAL_ALIGNMENT_CENTER, 120, 26, Color.WHITE)
	# Run toggle
	var rc := run_center()
	draw_circle(rc, 54, Color(0, 0, 0, 0.3))
	draw_circle(rc, 50, UIKit.GREEN if _run_on else Color(0.1, 0.25, 0.5, 0.85))
	draw_string(font, rc + Vector2(-50, 9), "RUN", HORIZONTAL_ALIGNMENT_CENTER, 100, 24, Color.WHITE)
