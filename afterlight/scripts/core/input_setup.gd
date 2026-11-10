class_name InputSetup
extends RefCounted
## Registers input actions at startup (keyboard, mouse and gamepad), so the
## project needs no hand-edited InputMap. Touch controls feed InputState.

static func setup() -> void:
	_key("move_forward", [KEY_W, KEY_UP, KEY_Z])
	_key("move_back", [KEY_S, KEY_DOWN])
	_key("move_left", [KEY_A, KEY_LEFT, KEY_Q])
	_key("move_right", [KEY_D, KEY_RIGHT])
	_key("jump", [KEY_SPACE])
	_key("run", [KEY_SHIFT])
	_key("interact", [KEY_E, KEY_F])
	_key("scan", [KEY_R])
	_key("pause", [KEY_ESCAPE, KEY_P])
	_key("inventory", [KEY_I, KEY_TAB])
	_key("map", [KEY_M])
	_key("missions", [KEY_J])
	_key("collection", [KEY_B])
	_joy_axis("move_left", JOY_AXIS_LEFT_X, -1.0)
	_joy_axis("move_right", JOY_AXIS_LEFT_X, 1.0)
	_joy_axis("move_forward", JOY_AXIS_LEFT_Y, -1.0)
	_joy_axis("move_back", JOY_AXIS_LEFT_Y, 1.0)
	_joy_axis("look_left", JOY_AXIS_RIGHT_X, -1.0)
	_joy_axis("look_right", JOY_AXIS_RIGHT_X, 1.0)
	_joy_axis("look_up", JOY_AXIS_RIGHT_Y, -1.0)
	_joy_axis("look_down", JOY_AXIS_RIGHT_Y, 1.0)
	_joy_btn("jump", JOY_BUTTON_A)
	_joy_btn("interact", JOY_BUTTON_X)
	_joy_btn("run", JOY_BUTTON_LEFT_STICK)
	_joy_btn("scan", JOY_BUTTON_Y)
	_joy_btn("pause", JOY_BUTTON_START)
	_joy_btn("inventory", JOY_BUTTON_BACK)

static func _ensure(action: String) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action, 0.25)

static func _key(action: String, keys: Array) -> void:
	_ensure(action)
	for k in keys:
		var e := InputEventKey.new()
		e.physical_keycode = k
		InputMap.action_add_event(action, e)

static func _joy_axis(action: String, axis: int, dir: float) -> void:
	_ensure(action)
	var e := InputEventJoypadMotion.new()
	e.axis = axis
	e.axis_value = dir
	InputMap.action_add_event(action, e)

static func _joy_btn(action: String, btn: int) -> void:
	_ensure(action)
	var e := InputEventJoypadButton.new()
	e.button_index = btn
	InputMap.action_add_event(action, e)
