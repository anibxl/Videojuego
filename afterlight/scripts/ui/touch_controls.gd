class_name TouchControls
extends Control
## Mobile controls. Multi-touch aware:
##  * Left half: floating virtual joystick (appears where the thumb lands).
##    Pushing to the outer ring sprints.
##  * Right half: drag to orbit the camera.
##  * Buttons: Jump (large), contextual Interact (shows its prompt), Scan.

var _joy_index := -1
var _joy_origin := Vector2.ZERO
var _joy_pos := Vector2.ZERO
var _look_index := -1
var _look_last := Vector2.ZERO
var _btn_touches := {}          # touch index -> button name
var interact_text := ""
var _font: Font

const JOY_RADIUS := 90.0
const RUN_THRESHOLD := 0.88

var jump_btn := {"name": "jump", "icon": "jump", "r": 62.0}
var interact_btn := {"name": "interact", "icon": "interact", "r": 50.0}
var scan_btn := {"name": "scan", "icon": "scan", "r": 36.0}
var _pressed := {}

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_font = UIKit.font_bold
	resized.connect(queue_redraw)
	Events.interact_prompt_changed.connect(func(t): interact_text = t; queue_redraw())

func _btn_center(b: Dictionary) -> Vector2:
	var s := size
	match b.name:
		"jump": return Vector2(s.x - 110, s.y - 120)
		"interact": return Vector2(s.x - 250, s.y - 90)
		"scan": return Vector2(s.x - 92, s.y - 270)
	return Vector2.ZERO

func _buttons() -> Array:
	var out := [jump_btn]
	if interact_text != "":
		out.append(interact_btn)
	if Progression.level >= GameDB.LEVEL_SCANNER:
		out.append(scan_btn)
	return out

func _hit_button(pos: Vector2) -> String:
	for b in _buttons():
		if pos.distance_to(_btn_center(b)) <= b.r * 1.25:
			return b.name
	return ""

func _input(event: InputEvent) -> void:
	if not visible or get_tree().paused:
		return
	if event is InputEventScreenTouch:
		_on_touch(event)
	elif event is InputEventScreenDrag:
		_on_drag(event)

## Returns true if the touch is over another UI control (HUD buttons).
func _over_ui(pos: Vector2) -> bool:
	var hud := get_parent()
	if hud and hud.has_method("is_point_on_buttons"):
		return hud.is_point_on_buttons(pos)
	return false

func _on_touch(e: InputEventScreenTouch) -> void:
	if e.pressed:
		var b := _hit_button(e.position)
		if b != "":
			_btn_touches[e.index] = b
			_pressed[b] = true
			match b:
				"jump": InputState.jump_pressed = true
				"interact": InputState.interact_pressed = true
				"scan": InputState.scan_pressed = true
			queue_redraw()
			get_viewport().set_input_as_handled()
			return
		if _over_ui(e.position):
			return
		if e.position.x < size.x * 0.45 and _joy_index == -1:
			_joy_index = e.index
			_joy_origin = e.position
			_joy_pos = e.position
			_update_joy()
		elif _look_index == -1:
			_look_index = e.index
			_look_last = e.position
	else:
		if _btn_touches.has(e.index):
			_pressed.erase(_btn_touches[e.index])
			_btn_touches.erase(e.index)
		if e.index == _joy_index:
			_joy_index = -1
			InputState.move = Vector2.ZERO
			InputState.run_held = false
		if e.index == _look_index:
			_look_index = -1
	queue_redraw()

func _on_drag(e: InputEventScreenDrag) -> void:
	if e.index == _joy_index:
		_joy_pos = e.position
		_update_joy()
		queue_redraw()
	elif e.index == _look_index:
		InputState.look += e.position - _look_last
		_look_last = e.position

func _update_joy() -> void:
	var v := (_joy_pos - _joy_origin) / JOY_RADIUS
	if v.length() > 1.0:
		# drag the origin along so the stick never "sticks" at the edge
		_joy_origin = _joy_pos - v.normalized() * JOY_RADIUS
		v = v.normalized()
	InputState.move = v if v.length() > 0.12 else Vector2.ZERO
	InputState.run_held = v.length() >= RUN_THRESHOLD

func release_all() -> void:
	_joy_index = -1
	_look_index = -1
	_btn_touches.clear()
	_pressed.clear()
	InputState.reset()
	queue_redraw()

func _process(_d: float) -> void:
	if _joy_index != -1 or not _pressed.is_empty():
		queue_redraw()

func _draw() -> void:
	var a := Settings.controls_opacity
	# joystick
	var base := _joy_origin if _joy_index != -1 else Vector2(170, size.y - 150)
	var knob := _joy_pos if _joy_index != -1 else base
	if knob.distance_to(base) > JOY_RADIUS:
		knob = base + (knob - base).normalized() * JOY_RADIUS
	var active := _joy_index != -1
	draw_circle(base, JOY_RADIUS, Color(0.05, 0.06, 0.15, 0.35 * a))
	draw_arc(base, JOY_RADIUS, 0, TAU, 48, Color(0.5, 0.6, 1.0, (0.55 if active else 0.3) * a), 2.0, true)
	if InputState.run_held:
		draw_arc(base, JOY_RADIUS + 8, 0, TAU, 48, Color(0.42, 0.96, 1.0, 0.8 * a), 3.0, true)
	draw_circle(knob, 38, Color(0.42, 0.96, 1.0, (0.55 if active else 0.3) * a))
	draw_circle(knob, 28, Color(0.9, 0.95, 1.0, (0.85 if active else 0.45) * a))
	# buttons
	for b in _buttons():
		var c := _btn_center(b)
		var pressed := _pressed.has(b.name)
		var col := Color(0.42, 0.96, 1.0) if b.name != "interact" else Color(1.0, 0.8, 0.4)
		if b.name == "scan" and get_tree().get_first_node_in_group("player") and get_tree().get_first_node_in_group("player").scan_cooldown > 0.0:
			col = Color(0.4, 0.42, 0.6)
		draw_circle(c, b.r, Color(0.05, 0.06, 0.15, (0.7 if pressed else 0.45) * a))
		draw_arc(c, b.r, 0, TAU, 40, Color(col.r, col.g, col.b, 0.85 * a), 3.0 if pressed else 2.0, true)
		_draw_icon(b.icon, c, b.r * 0.5, Color(col.r, col.g, col.b, a))
	if interact_text != "":
		var c2 := _btn_center(interact_btn)
		var txt := interact_text.to_upper()
		var fs := 20
		var w := _font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		var rect := Rect2(c2.x - w / 2 - 14, c2.y - interact_btn.r - 44, w + 28, 32)
		draw_style_box(UIKit.box(Color(0.06, 0.06, 0.15, 0.85 * a), 10, Color(1.0, 0.8, 0.4, 0.6 * a), 1, 0), rect)
		draw_string(_font, Vector2(rect.position.x + 14, rect.position.y + 23), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 0.95, 0.85, a))

func _draw_icon(icon: String, c: Vector2, r: float, col: Color) -> void:
	match icon:
		"jump":
			draw_colored_polygon(PackedVector2Array([c + Vector2(0, -r), c + Vector2(r * 0.85, 0), c + Vector2(r * 0.35, 0), c + Vector2(r * 0.35, r * 0.85), c + Vector2(-r * 0.35, r * 0.85), c + Vector2(-r * 0.35, 0), c + Vector2(-r * 0.85, 0)]), col)
		"interact":
			draw_arc(c, r * 0.8, 0, TAU, 28, col, 3.0, true)
			draw_circle(c, r * 0.32, col)
		"scan":
			draw_arc(c, r * 0.85, 0, TAU, 28, col, 2.0, true)
			draw_arc(c, r * 0.45, 0, TAU, 20, col, 2.0, true)
			draw_line(c, c + Vector2(r * 0.7, -r * 0.6), col, 2.5, true)
