class_name CameraRig
extends Node3D
## Smooth third-person camera: yaw -> pitch -> SpringArm (collision) -> Camera.
## Driven by mouse (captured), touch drag (InputState.look) and gamepad.

var target: Node3D
var yaw := 0.0
var pitch := -0.25
var camera: Camera3D
var arm: SpringArm3D
var _pitch_node: Node3D
var _trauma := 0.0
var _run_fov := 0.0
var input_enabled := true

const MOUSE_SENS := 0.0028
const TOUCH_SENS := 0.0055
const PAD_SENS := 2.6
const PITCH_MIN := -1.2
const PITCH_MAX := 0.55

func _ready() -> void:
	top_level = true
	_pitch_node = Node3D.new()
	add_child(_pitch_node)
	arm = SpringArm3D.new()
	arm.spring_length = Settings.camera_distance
	arm.collision_mask = 1
	arm.margin = 0.25
	var sh := SphereShape3D.new()
	sh.radius = 0.25
	arm.shape = sh
	_pitch_node.add_child(arm)
	camera = Camera3D.new()
	camera.fov = 70.0
	camera.near = 0.08
	camera.far = 400.0
	arm.add_child(camera)
	camera.position = Vector3(0, 0, Settings.camera_distance)
	Events.settings_changed.connect(func(): arm.spring_length = Settings.camera_distance)

func snap_to_target() -> void:
	if target:
		global_position = target.global_position + Vector3(0, 1.45, 0)
		yaw = target.rotation.y if target.has_method("get_yaw") == false else target.get_yaw()

func set_yaw(y: float) -> void:
	yaw = y

func add_trauma(t: float) -> void:
	_trauma = clampf(_trauma + t, 0.0, 1.0)

func _unhandled_input(event: InputEvent) -> void:
	if not input_enabled:
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_rotate(event.relative * MOUSE_SENS * Settings.sensitivity)

func _rotate(rel: Vector2) -> void:
	yaw -= rel.x
	pitch -= rel.y * (-1.0 if Settings.invert_y else 1.0)
	pitch = clampf(pitch, PITCH_MIN, PITCH_MAX)

func _process(delta: float) -> void:
	if input_enabled:
		var touch := InputState.consume_look()
		if touch != Vector2.ZERO:
			_rotate(touch * TOUCH_SENS * Settings.sensitivity)
		var pad := Input.get_vector("look_left", "look_right", "look_up", "look_down")
		if pad.length() > 0.05:
			_rotate(pad * PAD_SENS * delta * Settings.sensitivity * 60.0 * 0.016)
	else:
		InputState.consume_look()
	if target:
		var goal := target.global_position + Vector3(0, 1.45, 0)
		# Faster vertical catch-up when falling so the player never leaves frame.
		var k := 1.0 - exp(-delta * 14.0)
		global_position = global_position.lerp(goal, k)
	rotation = Vector3(0, yaw, 0)
	_pitch_node.rotation.x = pitch
	# FOV kick when sprinting
	var running: bool = target != null and target.get("is_running") == true
	_run_fov = lerpf(_run_fov, 7.0 if running else 0.0, 1.0 - exp(-delta * 4.0))
	camera.fov = 70.0 + _run_fov
	# shake
	if _trauma > 0.0:
		_trauma = maxf(0.0, _trauma - delta * 1.2)
		var s := _trauma * _trauma
		camera.h_offset = randf_range(-1, 1) * 0.12 * s
		camera.v_offset = randf_range(-1, 1) * 0.12 * s
	else:
		camera.h_offset = 0.0
		camera.v_offset = 0.0

## Forward direction on the ground plane (for camera-relative movement).
func flat_basis() -> Basis:
	return Basis(Vector3.UP, yaw)
