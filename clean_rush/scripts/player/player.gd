class_name Player
extends CharacterBody3D
## FIRST-PERSON cleaner. Body yaw + head pitch camera at eye height, WASD /
## joystick movement relative to where you look, running, comfortable head bob,
## first-person arms + tool viewmodel, and an invisible (shadow-casting) body
## built from the saved character so you still see your own shadow.

signal tool_changed(tool_id: String)

const WALK_SPEED := 3.7
const RUN_SPEED := 6.2
const PITCH_LIMIT := deg_to_rad(85.0)

var map: MapBase
var rig: CameraRig          # unused in first person (kept for API compatibility)
var tool: ToolRuntime
var head: Node3D
var camera: Camera3D
var view: FirstPersonView
var model: CharacterModel
var move_input := Vector2.ZERO     # virtual joystick
var look_input := Vector2.ZERO     # accumulated look delta (pixels) from touch/mouse this frame
var run_toggle := false
var clean_held := false
var mouse_cleaning := false
var controls_enabled := true
var pitch := -0.12
var eye_height := 1.62
var _bob_t := 0.0
var _step_t := 0.0
var _pickup_t := 0.0
var _last_look := Vector2.ZERO


func setup(m: MapBase, camera_rig: CameraRig = null) -> void:
	map = m
	rig = camera_rig


func _ready() -> void:
	collision_layer = 4
	collision_mask = 1 | 8
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.32
	cap.height = 1.7
	cs.shape = cap
	cs.position.y = 0.85
	add_child(cs)
	var a := Game.appearance()
	eye_height = 1.62 * float(a.get("height", 1.0))
	head = Node3D.new()
	head.position.y = eye_height
	add_child(head)
	camera = Camera3D.new()
	camera.fov = float(Game.setting("fov"))
	camera.near = 0.03
	camera.far = 220.0
	head.add_child(camera)
	camera.current = true
	view = FirstPersonView.new()
	view.appearance = a
	camera.add_child(view)
	_build_model(a)
	tool = ToolRuntime.new()
	tool.setup(self, map, view, camera)
	add_child(tool)
	var start_tool := String(Game.state.get("selected_tool", "leaf_blower"))
	tool.equip(start_tool if Game.owns_tool(start_tool) else "leaf_blower")
	head.rotation.x = pitch


func _build_model(a: Dictionary) -> void:
	model = CharacterModel.new()
	model.appearance = a
	add_child(model)
	call_deferred("_make_body_shadow_only")


## The body is not visible to the player's own camera, only its shadow.
func _make_body_shadow_only() -> void:
	for mi in model.find_children("*", "MeshInstance3D", true, false):
		(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_SHADOWS_ONLY


func refresh_appearance() -> void:
	var a := Game.appearance()
	model.apply(a)
	call_deferred("_make_body_shadow_only")
	view.refresh_appearance(a)
	tool.equip(tool.tool_id)


func keyboard_vector() -> Vector2:
	return Input.get_vector("move_left", "move_right", "move_forward", "move_back")


func is_cleaning() -> bool:
	return controls_enabled and (clean_held or mouse_cleaning or Input.is_action_pressed("clean"))


## Look by a pixel delta (touch drag or mouse motion).
func add_look(delta_px: Vector2) -> void:
	look_input += delta_px


func _physics_process(delta: float) -> void:
	# ---- Look ----
	var sens := 0.0032 * float(Game.setting("cam_sens"))
	var look := look_input
	look_input = Vector2.ZERO
	if not controls_enabled:
		look = Vector2.ZERO
	var inv := -1.0 if bool(Game.setting("invert_y")) else 1.0
	rotation.y -= look.x * sens
	pitch = clampf(pitch - look.y * sens * inv, -PITCH_LIMIT, PITCH_LIMIT)
	head.rotation.x = pitch
	_last_look = _last_look.lerp(look / maxf(delta * 60.0, 0.01), 0.5)
	# ---- Move ----
	var input := move_input
	if input.length() < 0.1:
		input = keyboard_vector()
	if not controls_enabled:
		input = Vector2.ZERO
	var running := (run_toggle or Input.is_action_pressed("run")) and input.y < 0.2
	var speed := (RUN_SPEED if running else WALK_SPEED) * (1.0 + Game.gear_value("shoes"))
	var cleaning := is_cleaning()
	if cleaning:
		speed *= 0.8
	var dir := (global_transform.basis * Vector3(input.x, 0, input.y))
	dir.y = 0
	if dir.length() > 1.0:
		dir = dir.normalized()
	var target_vel := dir * speed
	var accel := 10.0 if dir.length() > 0.05 else 14.0
	velocity.x = lerpf(velocity.x, target_vel.x, clampf(delta * accel, 0.0, 1.0))
	velocity.z = lerpf(velocity.z, target_vel.z, clampf(delta * accel, 0.0, 1.0))
	if not is_on_floor():
		velocity.y -= 20.0 * delta
	else:
		velocity.y = -0.5
	move_and_slide()
	var hspeed := Vector2(velocity.x, velocity.z).length()
	# ---- Comfortable head bob (can be disabled in Settings) ----
	var bob_scale := float(Game.setting("head_bob"))
	if hspeed > 0.3 and is_on_floor():
		_bob_t += delta * hspeed * 2.1
	var bob := sin(_bob_t * 2.0) * 0.028 * clampf(hspeed / RUN_SPEED, 0.0, 1.0) * bob_scale
	head.position.y = lerpf(head.position.y, eye_height + bob, clampf(delta * 12.0, 0.0, 1.0))
	camera.rotation.z = lerpf(camera.rotation.z, sin(_bob_t) * 0.006 * bob_scale - input.x * 0.012, clampf(delta * 6.0, 0.0, 1.0))
	# ---- Tool, viewmodel, body ----
	view.set_motion(hspeed, _last_look)
	tool.process_tool(delta, cleaning)
	model.animate(delta, hspeed, cleaning, String(tool.def.get("anim", "aim")) if cleaning else "")
	if hspeed > 0.4 and is_on_floor():
		_step_t -= delta * hspeed
		if _step_t <= 0.0:
			_step_t = 2.2
			Audio.play("footstep", -14.0, 0.2)
	_pickup_t -= delta
	if _pickup_t <= 0.0 and map:
		_pickup_t = 0.15
		map.check_pickups(global_position)


## Context action: empty the bag at a bin, pick up a sparkling discovery you
## look at, otherwise switch the tool mode (blower power / washer nozzle).
func interact() -> String:
	if tool.empty_bag_if_near_bin():
		return "bag"
	var fwd := -camera.global_transform.basis.z
	for d in map.discoveries:
		if d.is_revealed and not d.is_found:
			var to := d.global_position - camera.global_position
			if to.length() < 3.5 and to.normalized().dot(fwd) > 0.85:
				d.try_pickup(d.global_position, 1.0)
				return "pickup"
	if tool.cycle_mode():
		return "mode"
	return ""


func select_tool(id: String) -> void:
	if not Game.owns_tool(id):
		return
	Game.state["selected_tool"] = id
	Game.queue_save()
	tool.equip(id)
	Audio.play("ui_click")
	tool_changed.emit(id)
