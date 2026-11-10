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
var model: Node3D
var body_pivot: Node3D
var arm_r: Node3D
var arm_l: Node3D
var leg_l: Node3D
var leg_r: Node3D
var _walk_t := 0.0
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
	tool.setup(self, map, arm_r.get_node("Hand"))
	add_child(tool)
	tool.equip(String(Game.state.get("selected_tool", "rake")))


func _mat(c: Color, rough := 0.6) -> StandardMaterial3D:
	return ItemModels.mat(c, 0.0, rough)


func _build_model() -> void:
	model = Node3D.new()
	add_child(model)
	body_pivot = Node3D.new()
	model.add_child(body_pivot)
	var overalls := _mat(Color("1550b8"))
	var shirt := _mat(Color(0.97, 0.97, 0.97))
	var skin := _mat(Color(1.0, 0.8, 0.65))
	var accent := _mat(Color("ff8c2a"))
	var boots := _mat(Color(0.15, 0.17, 0.22))
	# Legs
	leg_l = Node3D.new()
	leg_l.position = Vector3(-0.14, 0.8, 0)
	body_pivot.add_child(leg_l)
	ItemModels.part(leg_l, ItemModels.cyl(0.11, 0.7, 0.1), overalls, Vector3(0, -0.38, 0))
	ItemModels.part(leg_l, ItemModels.box(Vector3(0.2, 0.12, 0.3)), boots, Vector3(0, -0.76, -0.04))
	leg_r = Node3D.new()
	leg_r.position = Vector3(0.14, 0.8, 0)
	body_pivot.add_child(leg_r)
	ItemModels.part(leg_r, ItemModels.cyl(0.11, 0.7, 0.1), overalls, Vector3(0, -0.38, 0))
	ItemModels.part(leg_r, ItemModels.box(Vector3(0.2, 0.12, 0.3)), boots, Vector3(0, -0.76, -0.04))
	# Torso
	var torso := CapsuleMesh.new()
	torso.radius = 0.26
	torso.height = 0.75
	ItemModels.part(body_pivot, torso, shirt, Vector3(0, 1.12, 0))
	ItemModels.part(body_pivot, ItemModels.box(Vector3(0.5, 0.45, 0.52)), overalls, Vector3(0, 0.98, 0))
	ItemModels.part(body_pivot, ItemModels.box(Vector3(0.06, 0.4, 0.04)), overalls, Vector3(-0.15, 1.25, -0.25))
	ItemModels.part(body_pivot, ItemModels.box(Vector3(0.06, 0.4, 0.04)), overalls, Vector3(0.15, 1.25, -0.25))
	# Backpack tank with logo color
	ItemModels.part(body_pivot, ItemModels.box(Vector3(0.36, 0.45, 0.18)), accent, Vector3(0, 1.15, 0.3))
	ItemModels.part(body_pivot, ItemModels.box(Vector3(0.2, 0.08, 0.02)), _mat(Color("1fc8c8")), Vector3(0, 1.22, 0.4))
	# Head
	ItemModels.part(body_pivot, ItemModels.sphere(0.22), skin, Vector3(0, 1.68, 0))
	ItemModels.part(body_pivot, ItemModels.sphere(0.035), _mat(Color(0.1, 0.1, 0.15)), Vector3(-0.08, 1.71, -0.2))
	ItemModels.part(body_pivot, ItemModels.sphere(0.035), _mat(Color(0.1, 0.1, 0.15)), Vector3(0.08, 1.71, -0.2))
	# Cap
	ItemModels.part(body_pivot, ItemModels.sphere(0.235), accent, Vector3(0, 1.75, 0), Vector3.ZERO, Vector3(1, 0.6, 1))
	ItemModels.part(body_pivot, ItemModels.box(Vector3(0.3, 0.03, 0.2)), accent, Vector3(0, 1.79, -0.24))
	# Arms
	arm_l = Node3D.new()
	arm_l.position = Vector3(-0.33, 1.38, 0)
	body_pivot.add_child(arm_l)
	ItemModels.part(arm_l, ItemModels.cyl(0.075, 0.55, 0.065), shirt, Vector3(0, -0.27, 0))
	ItemModels.part(arm_l, ItemModels.sphere(0.075), skin, Vector3(0, -0.57, 0))
	arm_r = Node3D.new()
	arm_r.position = Vector3(0.33, 1.38, 0)
	body_pivot.add_child(arm_r)
	ItemModels.part(arm_r, ItemModels.cyl(0.075, 0.55, 0.065), shirt, Vector3(0, -0.27, 0))
	ItemModels.part(arm_r, ItemModels.sphere(0.075), skin, Vector3(0, -0.57, 0))
	arm_r.rotation.x = -0.9
	var hand := Node3D.new()
	hand.name = "Hand"
	hand.position = Vector3(-0.1, -0.55, 0)
	hand.rotation.x = 0.9   # keep the tool level relative to the body
	arm_r.add_child(hand)


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
	if speed > 0.3:
		_walk_t += delta * speed * 2.2
		var s := sin(_walk_t)
		leg_l.rotation.x = s * 0.6
		leg_r.rotation.x = -s * 0.6
		arm_l.rotation.x = -s * 0.5
		body_pivot.position.y = absf(cos(_walk_t)) * 0.05
		_step_t -= delta * speed
		if _step_t <= 0.0:
			_step_t = 2.4
			Audio.play("footstep", -16.0, 0.2)
	else:
		leg_l.rotation.x = lerpf(leg_l.rotation.x, 0.0, delta * 10.0)
		leg_r.rotation.x = lerpf(leg_r.rotation.x, 0.0, delta * 10.0)
		arm_l.rotation.x = lerpf(arm_l.rotation.x, 0.0, delta * 10.0)
		body_pivot.position.y = lerpf(body_pivot.position.y, sin(Time.get_ticks_msec() / 500.0) * 0.01, delta * 8.0)
	arm_r.rotation.x = lerpf(arm_r.rotation.x, -1.1 if cleaning else -0.9, delta * 8.0)
	if cleaning:
		arm_l.rotation.x = lerpf(arm_l.rotation.x, -0.9, delta * 8.0)


func select_tool(id: String) -> void:
	if not Game.owns_tool(id):
		return
	Game.state["selected_tool"] = id
	Game.queue_save()
	tool.equip(id)
	Audio.play("ui_click")
	tool_changed.emit(id)
