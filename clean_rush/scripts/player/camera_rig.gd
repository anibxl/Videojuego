class_name CameraRig
extends Node3D
## Smooth third-person follow camera with a fixed comfortable pitch.
## Yaw can be rotated (drag / Q,E) and distance zoomed (wheel / pinch).

var target: Node3D
var yaw := 0.0
var target_yaw := 0.0
var pitch := deg_to_rad(-50.0)
var distance := 9.5
var target_distance := 9.5
var min_distance := 5.5
var max_distance := 15.0
var camera: Camera3D
var orbit_speed := 0.0   # used by the main menu background


func _ready() -> void:
	camera = Camera3D.new()
	camera.fov = 55.0
	camera.near = 0.1
	camera.far = 200.0
	add_child(camera)
	camera.current = true
	_apply(1.0)


func rotate_yaw(amount: float) -> void:
	target_yaw += amount


func zoom(amount: float) -> void:
	target_distance = clampf(target_distance + amount, min_distance, max_distance)


func snap() -> void:
	if target:
		global_position = target.global_position
	yaw = target_yaw
	distance = target_distance
	_apply(1.0)


func _process(delta: float) -> void:
	if orbit_speed != 0.0:
		target_yaw += orbit_speed * delta
	var t := clampf(delta * 6.0, 0.0, 1.0)
	if target:
		global_position = global_position.lerp(target.global_position + Vector3(0, 0.8, 0), clampf(delta * 5.0, 0.0, 1.0))
	yaw = lerp_angle(yaw, target_yaw, t)
	distance = lerpf(distance, target_distance, t)
	_apply(t)


func _apply(_t: float) -> void:
	if camera == null:
		return
	var offset := Vector3(0, 0, distance).rotated(Vector3.RIGHT, pitch).rotated(Vector3.UP, yaw)
	camera.position = offset
	camera.look_at(global_position, Vector3.UP)
