class_name Player
extends CharacterBody3D

signal tool_changed(tool_id: String)
## The cleaner. Camera-relative movement (joystick or WASD), running, facing,
## procedural character model with simple animations, and tool usage.

const WALK_SPEED := 4.4
const RUN_SPEED := 7.0

var map: MapBase
var rig: CameraRig
var tool: ToolRuntime
var move_input := Vector2.ZERO     # from the virtual joystick
var run_toggle := false            # from the touch run button
var clean_held := false            # from the touch clean button
var mouse_cleaning := false        # desktop: left mouse held over the world
var controls_enabled := true
var model: CharacterModel
var _step_t := 0.0
var _pickup_t := 0.0


func setup(m: MapBase, camera_rig: CameraRig) -> void:
	map = m
	rig = camera_rig


func _ready() -> void:
	collision_layer = 4
	collision_mask = 1 | 8
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.35
	cap.height = 1.7
	cs.shape = cap
	cs.position.y = 0.85
	add_child(cs)
	_build_model()
	tool = ToolRuntime.new()
	tool.setup(self, map, model.tool_mount)
	add_child(tool)
	tool.equip(String(Game.state.get("selected_tool", "rake")))


func refresh_appearance() -> void:
	model.apply(Game.appearance())
	# The tool mount is recreated with the model: re-attach the tool.
	tool.hand = model.tool_mount
	tool.equip(tool.tool_id if tool.tool_id != "" else String(Game.state.get("selected_tool", "rake")))


func _build_model() -> void:
	# Modular character built from the player's saved appearance.
	model = CharacterModel.new()
	model.appearance = Game.appearance()
	add_child(model)


func keyboard_vector() -> Vector2:
	return Input.get_vector("move_left", "move_right", "move_forward", "move_back")


func is_cleaning() -> bool:
	return controls_enabled and (clean_held or mouse_cleaning or Input.is_action_pressed("clean"))


func _physics_process(delta: float) -> void:
	var input := move_input
	if input.length() < 0.1:
		input = keyboard_vector()
	if not controls_enabled:
		input = Vector2.ZERO
	var running := run_toggle or Input.is_action_pressed("run")
	var speed := (RUN_SPEED if running else WALK_SPEED) * (1.0 + Game.gear_value("shoes"))
	var cleaning := is_cleaning()
	if cleaning:
		speed *= 0.75
	var yaw := rig.yaw if rig else 0.0
	var dir := Vector3(input.x, 0, input.y).rotated(Vector3.UP, yaw)
	if dir.length() > 1.0:
		dir = dir.normalized()
	var target_vel := dir * speed
	velocity.x = lerpf(velocity.x, target_vel.x, clampf(delta * 12.0, 0.0, 1.0))
	velocity.z = lerpf(velocity.z, target_vel.z, clampf(delta * 12.0, 0.0, 1.0))
	if not is_on_floor():
		velocity.y -= 20.0 * delta
	else:
		velocity.y = -0.5
	move_and_slide()
	# Facing
	var face_dir := Vector3.ZERO
	if cleaning and tool.mouse_target != null:
		var mt: Vector3 = tool.mouse_target
		face_dir = Vector3(mt.x - global_position.x, 0, mt.z - global_position.z)
	elif dir.length() > 0.1:
		face_dir = dir
	if face_dir.length() > 0.05:
		var target_yaw := atan2(-face_dir.x, -face_dir.z)
		rotation.y = lerp_angle(rotation.y, target_yaw, clampf(delta * (14.0 if cleaning else 10.0), 0.0, 1.0))
	elif cleaning and tool.has_aim and tool.aim_surface != null and bool(Game.setting("auto_aim")):
		# Auto-aim assistance: gently turn toward the dirt being cleaned.
		var to := tool.aim_point - global_position
		to.y = 0
		if to.length() > 0.5:
			rotation.y = lerp_angle(rotation.y, atan2(-to.x, -to.z), clampf(delta * 2.5, 0.0, 1.0))
	tool.process_tool(delta, cleaning)
	_animate(delta, Vector2(velocity.x, velocity.z).length(), cleaning)
	_pickup_t -= delta
	if _pickup_t <= 0.0 and map:
		_pickup_t = 0.15
		map.check_pickups(global_position)


func _animate(delta: float, speed: float, cleaning: bool) -> void:
	model.animate(delta, speed, cleaning, String(tool.def.get("anim", "aim")) if cleaning else "")
	if speed > 0.3:
		_step_t -= delta * speed
		if _step_t <= 0.0:
			_step_t = 2.4
			Audio.play("footstep", -16.0, 0.2)


func select_tool(id: String) -> void:
	if not Game.owns_tool(id):
		return
	Game.state["selected_tool"] = id
	Game.queue_save()
	tool.equip(id)
	Audio.play("ui_click")
	tool_changed.emit(id)
