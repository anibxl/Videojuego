class_name InputState
extends RefCounted
## Shared state written by the on-screen touch controls and read by the
## player / camera. Keyboard, mouse and gamepad use the InputMap directly.

static var move := Vector2.ZERO        # joystick, -1..1 (y = forward is negative)
static var look := Vector2.ZERO        # accumulated camera drag in pixels
static var run_held := false           # joystick pushed to the edge
static var jump_pressed := false
static var interact_pressed := false
static var scan_pressed := false

static func consume_look() -> Vector2:
	var l := look
	look = Vector2.ZERO
	return l

static func reset() -> void:
	move = Vector2.ZERO
	look = Vector2.ZERO
	run_held = false
	jump_pressed = false
	interact_pressed = false
	scan_pressed = false
