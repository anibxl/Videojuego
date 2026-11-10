class_name Player
extends CharacterBody3D
## The explorer. Camera-relative movement with acceleration, sprint,
## coyote-time + buffered jumps, optional double jump (Level 5),
## contextual interaction and the Pulse Scanner (Level 2).

const WALK_SPEED := 4.6
const RUN_SPEED := 8.2
const ACCEL := 40.0
const AIR_ACCEL := 14.0
const DECEL := 34.0
const GRAVITY := 22.0
const JUMP_VELOCITY := 8.2
const DOUBLE_JUMP_VELOCITY := 7.2
const COYOTE := 0.13
const JUMP_BUFFER := 0.14
const SCAN_COOLDOWN := 8.0
const SCAN_RADIUS := 32.0

var model: PlayerModel
var cam: CameraRig
var controls_enabled := true
var is_running := false
var _coyote := 0.0
var _jump_buf := 0.0
var _air_jumps := 0
var _was_on_floor := true
var _fall_speed := 0.0
var _step_t := 0.0
var _step_i := 0
var _interact_t := 0.0
var current_interactable: Interactable
var _last_prompt := ""
var scan_cooldown := 0.0
var last_safe_position := Vector3.ZERO
var _safe_t := 0.0

func _ready() -> void:
	add_to_group("player")
	collision_layer = 2
	collision_mask = 1
	floor_snap_length = 0.35
	floor_max_angle = deg_to_rad(50)
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.34
	cap.height = 1.75
	cs.shape = cap
	cs.position.y = 0.875
	add_child(cs)
	model = PlayerModel.new()
	add_child(model)
	last_safe_position = global_position

func get_yaw() -> float:
	return model.rotation.y

func teleport(t: Transform3D) -> void:
	global_position = t.origin
	velocity = Vector3.ZERO
	model.rotation.y = t.basis.get_euler().y
	last_safe_position = t.origin
	if cam:
		cam.global_position = t.origin + Vector3(0, 1.45, 0)
		cam.yaw = model.rotation.y

func _physics_process(delta: float) -> void:
	var input_dir := Vector2.ZERO
	var want_run := false
	if controls_enabled:
		input_dir = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
		if InputState.move.length() > 0.05:
			input_dir = InputState.move
		want_run = Input.is_action_pressed("run") or InputState.run_held
		if Input.is_action_just_pressed("jump") or InputState.jump_pressed:
			_jump_buf = JUMP_BUFFER
		if Input.is_action_just_pressed("interact") or InputState.interact_pressed:
			_try_interact()
		if Input.is_action_just_pressed("scan") or InputState.scan_pressed:
			scan()
	InputState.jump_pressed = false
	InputState.interact_pressed = false
	InputState.scan_pressed = false

	var on_floor := is_on_floor()
	if on_floor:
		_coyote = COYOTE
		_air_jumps = 1 if Progression.level >= GameDB.LEVEL_DOUBLE_JUMP else 0
	else:
		_coyote -= delta
	_jump_buf -= delta

	# gravity
	if not on_floor:
		velocity.y -= GRAVITY * delta
		velocity.y = maxf(velocity.y, -40.0)
		_fall_speed = maxf(_fall_speed, -velocity.y)

	# jumping
	if _jump_buf > 0.0:
		if _coyote > 0.0:
			velocity.y = JUMP_VELOCITY
			_coyote = 0.0
			_jump_buf = 0.0
			Audio.play("jump", -6.0, 0.08)
		elif _air_jumps > 0:
			_air_jumps -= 1
			velocity.y = DOUBLE_JUMP_VELOCITY
			_jump_buf = 0.0
			Audio.play("jump", -4.0, 0.05)
			FX.burst(get_parent(), global_position + Vector3.UP * 0.2, Color(0.6, 0.5, 1.0), 14, 2.5, 0.6)

	# horizontal movement relative to the camera
	var basis_flat := cam.flat_basis() if cam else Basis()
	var dir := basis_flat * Vector3(input_dir.x, 0, input_dir.y)
	dir.y = 0
	var strength := clampf(input_dir.length(), 0.0, 1.0)
	if dir.length() > 0.001:
		dir = dir.normalized()
	is_running = want_run and strength > 0.3
	var target_speed := (RUN_SPEED if is_running else WALK_SPEED) * strength
	var hv := Vector3(velocity.x, 0, velocity.z)
	var goal := dir * target_speed
	var rate := (ACCEL if on_floor else AIR_ACCEL) if strength > 0.01 else (DECEL if on_floor else AIR_ACCEL * 0.5)
	hv = hv.move_toward(goal, rate * delta)
	velocity.x = hv.x
	velocity.z = hv.z

	move_and_slide()

	# face movement direction smoothly
	if hv.length() > 0.3:
		var target_yaw := atan2(-hv.x, -hv.z)
		model.rotation.y = lerp_angle(model.rotation.y, target_yaw, 1.0 - exp(-delta * 12.0))

	var now_floor := is_on_floor()
	if now_floor and not _was_on_floor:
		if _fall_speed > 7.0:
			Audio.play("land", -6.0 + minf(_fall_speed - 7.0, 6.0), 0.08)
			model.land(_fall_speed / 16.0)
			if _fall_speed > 16.0 and cam:
				cam.add_trauma(0.35)
		else:
			_play_step()
		_fall_speed = 0.0
	_was_on_floor = now_floor

	var speed := hv.length()
	model.animate(delta, speed, is_running, now_floor, velocity.y)

	# footsteps synced to stride
	if now_floor and speed > 0.8:
		_step_t -= delta * (speed / (2.0 if is_running else 1.6))
		if _step_t <= 0.0:
			_step_t = 1.0
			_play_step()
	# remember a safe place to respawn if we fall out of the world
	_safe_t -= delta
	if now_floor and _safe_t <= 0.0:
		_safe_t = 0.5
		last_safe_position = global_position
	# nearest interactable (throttled)
	_interact_t -= delta
	if _interact_t <= 0.0:
		_interact_t = 0.1
		_update_interactable()
	scan_cooldown = maxf(0.0, scan_cooldown - delta)

func _play_step() -> void:
	_step_i = (_step_i + 1) % 2
	Audio.play("footstep_1" if _step_i == 0 else "footstep_2", -12.0 if not is_running else -9.0, 0.1)

func _update_interactable() -> void:
	var best: Interactable = null
	var best_d := INF
	if controls_enabled:
		for n in get_tree().get_nodes_in_group("interactable"):
			var it := n as Interactable
			if it == null or not it.is_visible_in_tree() or it.get_prompt() == "":
				continue
			var d := it.global_position.distance_to(global_position + Vector3.UP * 0.9)
			if d < it.radius and d < best_d:
				best = it
				best_d = d
	current_interactable = best
	var p := best.get_prompt() if best else ""
	if p != _last_prompt:
		_last_prompt = p
		Events.interact_prompt_changed.emit(p)

func _try_interact() -> void:
	_update_interactable()
	if current_interactable:
		current_interactable.interact(self)
		_interact_t = 0.0

func scan() -> void:
	if Progression.level < GameDB.LEVEL_SCANNER:
		Events.notify("Pulse Scanner unlocks at Explorer Level %d." % GameDB.LEVEL_SCANNER, UIKit.TEXT_DIM)
		return
	if scan_cooldown > 0.0:
		return
	scan_cooldown = SCAN_COOLDOWN
	Audio.play("scan", -4.0)
	_scan_ring()
	var found := 0
	for n in get_tree().get_nodes_in_group("scannable"):
		if n is Node3D and n.global_position.distance_to(global_position) < SCAN_RADIUS:
			n.reveal()
			found += 1
	for n in get_tree().get_nodes_in_group("scannable_static"):
		if n is Node3D and n.global_position.distance_to(global_position) < SCAN_RADIUS:
			FX.burst(n.get_parent(), n.global_position + Vector3.UP * 0.3, Color(1.0, 0.9, 0.6), 10, 1.5, 1.5)
			found += 1
	Events.notify("Pulse: %d signal%s nearby" % [found, "" if found == 1 else "s"], UIKit.CYAN)

func _scan_ring() -> void:
	var ring := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 1.0
	sm.height = 2.0
	sm.radial_segments = 24
	sm.rings = 12
	ring.mesh = sm
	ring.material_override = Mats.holo(Color(0.4, 0.95, 1.0, 0.5), 0.8)
	ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	get_parent().add_child(ring)
	ring.global_position = global_position + Vector3.UP
	ring.scale = Vector3.ONE * 0.5
	var tw := ring.create_tween()
	tw.tween_property(ring, "scale", Vector3.ONE * SCAN_RADIUS, 1.1).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tw.tween_callback(ring.queue_free)
