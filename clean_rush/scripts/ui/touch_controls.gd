class_name TouchControls
extends Control
## First-person multi-touch controls.
## - Movement: floating virtual joystick (left side, or right when left-handed).
## - Look: drag anywhere else on the opposite side.
## - Buttons: CLEAN (hold), RUN (toggle), INTERACT (bins / pick-up / mode),
##   MODE (blower power, nozzle), tool chip with < > quick switching (tap the
##   icon to open the tool picker).
## Joystick size, button scale and handedness come from Settings.

signal open_picker

var player: Player
var rig: CameraRig   # unused (first person)
var _joy_finger := -1
var _joy_center := Vector2.ZERO
var _joy_vec := Vector2.ZERO
var _clean_finger := -1
var _look_finger := -1
var _run_on := false
var _pulse := 0.0
var _flash := {}
const MOUSE_ID := 99


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func _s() -> float:
	return float(Game.setting("button_scale"))


func _left_handed() -> bool:
	return int(Game.setting("layout")) == 1


func _mx(x: float) -> float:
	return size.x - x if _left_handed() else x


func joy_radius() -> float:
	return 84.0 * float(Game.setting("joystick_size"))


func joy_home() -> Vector2:
	return Vector2(_mx(170.0 * float(Game.setting("joystick_size"))), size.y - 160.0 * float(Game.setting("joystick_size")))


func clean_center() -> Vector2:
	return Vector2(_mx(size.x - 128 * _s()), size.y - 150 * _s())


func clean_radius() -> float:
	return 72.0 * _s()


func run_center() -> Vector2:
	return Vector2(_mx(size.x - 268 * _s()), size.y - 86 * _s())


func interact_center() -> Vector2:
	return Vector2(_mx(size.x - 250 * _s()), size.y - 220 * _s())


func mode_center() -> Vector2:
	return Vector2(_mx(size.x - 118 * _s()), size.y - 300 * _s())


func tool_rect() -> Rect2:
	var w := 190.0 * _s()
	var h := 54.0 * _s()
	var cx := _mx(size.x - 128 * _s())
	return Rect2(cx - w / 2, size.y - 268 * _s() - h / 2 - (70 * _s() if player and player.tool.has_modes() else 0.0), w, h)


func _process(delta: float) -> void:
	_pulse += delta
	for k in _flash.keys():
		_flash[k] = maxf(0.0, _flash[k] - delta * 3.0)
	if player and visible:
		player.move_input = _joy_vec
		player.clean_held = _clean_finger != -1
		player.run_toggle = _run_on
	queue_redraw()


func _input(event: InputEvent) -> void:
	if not is_visible_in_tree() or player == null or get_tree().paused:
		return
	if event is InputEventScreenTouch:
		if _touch(event.index, event.position, event.pressed):
			get_viewport().set_input_as_handled()
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
	for c in get_tree().get_nodes_in_group("hud_button"):
		var ctl := c as Control
		if ctl.is_visible_in_tree() and ctl.get_global_rect().has_point(p):
			return true
	return false


func _touch(id: int, p: Vector2, pressed: bool) -> bool:
	if pressed:
		if _blocked_by_ui(p):
			return false
		if p.distance_to(clean_center()) < clean_radius() + 16 and _clean_finger == -1:
			_clean_finger = id
			return true
		if p.distance_to(run_center()) < 46 * _s():
			_run_on = not _run_on
			_flash["run"] = 1.0
			Audio.play("ui_click", -6.0)
			return true
		if p.distance_to(interact_center()) < 46 * _s():
			player.interact()
			_flash["interact"] = 1.0
			return true
		if player.tool.has_modes() and p.distance_to(mode_center()) < 42 * _s():
			player.tool.cycle_mode()
			_flash["mode"] = 1.0
			return true
		var tr := tool_rect()
		if tr.has_point(p):
			var third := tr.size.x / 3.0
			if p.x < tr.position.x + third * 0.8:
				_cycle(-1)
			elif p.x > tr.end.x - third * 0.8:
				_cycle(1)
			else:
				open_picker.emit()
			return true
		var on_move_side := p.x > size.x * 0.55 if _left_handed() else p.x < size.x * 0.45
		if on_move_side and _joy_finger == -1:
			_joy_finger = id
			_joy_center = p
			_joy_vec = Vector2.ZERO
			return true
		if _look_finger == -1:
			_look_finger = id
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
		if id == _look_finger:
			_look_finger = -1
			handled = true
		return handled
	return false


func _cycle(step: int) -> void:
	var owned: Array = []
	for t in Data.tool_order:
		if Game.owns_tool(t):
			owned.append(t)
	var idx := owned.find(player.tool.tool_id)
	player.select_tool(owned[(idx + step + owned.size()) % owned.size()])


func _drag(id: int, p: Vector2, rel: Vector2) -> void:
	if id == _joy_finger:
		var r := joy_radius()
		var d := p - _joy_center
		if d.length() > r:
			_joy_center = p - d.normalized() * r
			d = p - _joy_center
		_joy_vec = d / r
		if _joy_vec.length() < 0.1:
			_joy_vec = Vector2.ZERO
	elif id == _look_finger or (id == _clean_finger):
		# Look while dragging on the look side (also works while holding CLEAN).
		player.add_look(rel * 1.35)


func _draw() -> void:
	var font := get_theme_default_font()
	var glass := Color(0.05, 0.1, 0.16, 0.42)
	var line := Color(1, 1, 1, 0.55)
	# Joystick.
	var r := joy_radius()
	var jc := _joy_center if _joy_finger != -1 else joy_home()
	draw_circle(jc, r, glass)
	draw_arc(jc, r, 0, TAU, 48, line, 2.0, true)
	var knob := jc + _joy_vec * r
	draw_circle(knob, r * 0.42, Color(1, 1, 1, 0.85 if _joy_finger != -1 else 0.55))
	# CLEAN.
	var cc := clean_center()
	var pressed := _clean_finger != -1
	var cr := clean_radius() * (0.95 if pressed else 1.0)
	draw_circle(cc, cr, Color(UIKit.ORANGE, 0.92 if pressed else 0.78))
	draw_arc(cc, cr + 5, 0, TAU, 56, Color(1, 1, 1, 0.5 + 0.2 * sin(_pulse * 3.0)), 2.0, true)
	var icon := Data.tool_icon(player.tool.tool_id) if player else null
	if icon:
		draw_texture_rect(icon, Rect2(cc - Vector2(30, 40) * _s(), Vector2(60, 60) * _s()), false)
	draw_string(font, cc + Vector2(-60, 40) * _s(), "CLEAN", HORIZONTAL_ALIGNMENT_CENTER, 120 * _s(), int(17 * _s()), Color.WHITE)
	_round_button(run_center(), "RUN", _run_on, _flash.get("run", 0.0), font)
	_round_button(interact_center(), "USE", false, _flash.get("interact", 0.0), font)
	if player and player.tool.has_modes():
		_round_button(mode_center(), player.tool.mode_name().split(" ")[0].to_upper(), false, _flash.get("mode", 0.0), font, 40.0)
	# Tool chip with quick switch arrows.
	var tr := tool_rect()
	var sb := UIKit.flat(Color(0.05, 0.1, 0.16, 0.7), 10, 0)
	sb.border_color = Color(1, 1, 1, 0.15)
	sb.set_border_width_all(1)
	draw_style_box(sb, tr)
	draw_string(font, Vector2(tr.position.x + 8, tr.get_center().y + 7), "<", HORIZONTAL_ALIGNMENT_LEFT, -1, int(22 * _s()), Color(1, 1, 1, 0.8))
	draw_string(font, Vector2(tr.end.x - 22 * _s(), tr.get_center().y + 7), ">", HORIZONTAL_ALIGNMENT_LEFT, -1, int(22 * _s()), Color(1, 1, 1, 0.8))
	if player:
		var nm := String(Data.tool_def(player.tool.tool_id).get("name", ""))
		draw_string(font, Vector2(tr.position.x + 26 * _s(), tr.get_center().y + 6), nm, HORIZONTAL_ALIGNMENT_CENTER, tr.size.x - 52 * _s(), int(14 * _s()), Color.WHITE)


func _round_button(c: Vector2, text: String, on: bool, flash: float, font: Font, radius := 44.0) -> void:
	var r := radius * _s()
	draw_circle(c, r, Color(UIKit.TURQ.darkened(0.3), 0.85) if on else Color(0.05, 0.1, 0.16, 0.55 + flash * 0.3))
	draw_arc(c, r, 0, TAU, 40, Color(1, 1, 1, 0.45 + flash * 0.5), 2.0, true)
	draw_string(font, c + Vector2(-r, 6 * _s()), text, HORIZONTAL_ALIGNMENT_CENTER, r * 2, int(15 * _s()), Color.WHITE)
