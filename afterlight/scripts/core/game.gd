class_name Game
extends Node3D
## Root of gameplay. Owns the player, camera, HUD and the current floor, and
## runs the elevator travel sequence. Floors are built on demand so only one
## area is ever in memory (important on mobile).

const FLOOR_SCRIPTS := {
	"city": preload("res://scripts/world/floors/city.gd"),
	"mall": preload("res://scripts/world/floors/mall.gd"),
	"underground": preload("res://scripts/world/floors/underground.gd"),
	"lab": preload("res://scripts/world/floors/lab.gd"),
	"rooftops": preload("res://scripts/world/floors/rooftops.gd"),
	"core": preload("res://scripts/world/floors/core.gd"),
	"apartment": preload("res://scripts/world/floors/apartment.gd"),
}

var player: Player
var cam: CameraRig
var hud: HUD
var current_floor: FloorBase
var traveling := false

func _ready() -> void:
	InputState.reset()
	player = Player.new()
	add_child(player)
	cam = CameraRig.new()
	add_child(cam)
	cam.target = player
	player.cam = cam
	hud = HUD.new()
	hud.game = self
	add_child(hud)
	Events.request_panel.connect(_on_request_panel)
	Events.settings_changed.connect(apply_graphics)
	Events.level_up.connect(func(_l): player.model.refresh_cosmetics())
	SaveSystem.before_save.connect(_capture_state)
	SaveSystem.in_game = true
	var start_floor := WorldState.current_floor
	if not start_floor in GameDB.PLAYABLE_FLOORS or not WorldState.is_floor_unlocked(start_floor):
		start_floor = "city"
	var saved_pos := WorldState.player_position
	_load_floor(start_floor)
	if saved_pos != Vector3.INF and saved_pos.y > current_floor.kill_y + 2.0:
		var t := Transform3D(Basis(Vector3.UP, WorldState.player_yaw), saved_pos + Vector3.UP * 0.2)
		player.teleport(t)
	Missions.refresh()
	Progression.check_achievements()
	Audio.play_music("music_theme", -9.0)
	_update_mouse_mode()
	if not WorldState.has_flag("intro_seen"):
		WorldState.set_flag("intro_seen")
		hud.show_intro()

func _exit_tree() -> void:
	SaveSystem.in_game = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

# ---------------------------------------------------------------- floors
func _load_floor(id: String) -> void:
	if current_floor:
		current_floor.queue_free()
		remove_child(current_floor)
		current_floor = null
	var f: FloorBase = FLOOR_SCRIPTS[id].new()
	f.floor_id = id
	f.game = self
	f.name = "Floor_" + id
	add_child(f)
	f.build()
	current_floor = f
	f.apply_graphics(Settings.graphics)
	apply_graphics()
	player.model.set_lamp(f.dark)
	if f.elevator:
		player.teleport(f.elevator.spawn_transform())
		f.elevator.set_doors_instant(true)
	WorldState.visit_floor(id)
	Audio.play_ambience(f.ambience, -8.0 if f.ambience != "amb_cave" else -4.0)
	Events.floor_entered.emit(id)
	f.on_enter()

func travel_to(id: String) -> void:
	if traveling or current_floor == null:
		return
	if id == current_floor.floor_id:
		return
	if not WorldState.is_floor_unlocked(id):
		return
	traveling = true
	player.controls_enabled = false
	var el := current_floor.elevator
	var def := GameDB.floor_def(id)
	# 1) doors close
	await el.close_doors()
	# 2) cab moves: hum, shake, indicator counts toward the target
	Audio.start_loop("elevator_move", -4.0)
	cam.add_trauma(0.35)
	var from_i := _floor_index(current_floor.floor_id)
	var to_i := _floor_index(id)
	var arrow := "UP" if to_i < from_i else "DOWN"
	el.set_indicator(GameDB.floor_def(current_floor.floor_id).label, arrow)
	await get_tree().create_timer(0.7).timeout
	cam.add_trauma(0.25)
	# 3) transition
	await Router.show_loading("%s — %s" % [def.label, def.name], 0.5)
	_load_floor(id)
	var nel := current_floor.elevator
	nel.set_doors_instant(false)
	nel.set_indicator(def.label, arrow)
	player.controls_enabled = false
	await get_tree().create_timer(0.35).timeout
	SaveSystem.save_game()
	Router.hide_loading(0.6)
	await get_tree().create_timer(0.5).timeout
	Audio.stop_loop()
	Audio.play("elevator_ding", -3.0)
	nel.set_indicator(def.label)
	hud.show_floor_banner(def.label, def.name, def.subtitle)
	await nel.open_doors()
	player.controls_enabled = true
	traveling = false

func _floor_index(id: String) -> int:
	for i in GameDB.FLOORS.size():
		if GameDB.FLOORS[i].id == id:
			return i
	return 0

# ---------------------------------------------------------------- loop
func _physics_process(_delta: float) -> void:
	if current_floor and player.global_position.y < current_floor.kill_y:
		if not current_floor.on_player_fell(player):
			respawn_player(player.last_safe_position)

func respawn_player(pos: Vector3) -> void:
	Router.show_loading("", 0.15)
	player.teleport(Transform3D(Basis(Vector3.UP, player.model.rotation.y), pos + Vector3.UP * 0.5))
	await get_tree().create_timer(0.2).timeout
	Router.hide_loading(0.35)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		hud.toggle_pause()
	elif event.is_action_pressed("inventory"):
		hud.open_panel("inventory")
	elif event.is_action_pressed("map"):
		hud.open_panel("map")
	elif event.is_action_pressed("missions"):
		hud.open_panel("missions")
	elif event.is_action_pressed("collection"):
		hud.open_panel("collection")
	elif event is InputEventMouseButton and event.pressed and not Settings.use_touch_controls() and not OS.has_feature("web"):
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED and not get_tree().paused:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _notification(what: int) -> void:
	if not is_inside_tree() or hud == null:
		return
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and not get_tree().paused:
		hud.toggle_pause()
	elif what == NOTIFICATION_WM_GO_BACK_REQUEST:
		hud.toggle_pause()      # Android back button

func _update_mouse_mode() -> void:
	if Settings.use_touch_controls() or get_tree().paused or OS.has_feature("web"):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	else:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func on_pause_changed(paused: bool) -> void:
	if paused:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	else:
		_update_mouse_mode()

func _on_request_panel(panel: String, data: Dictionary) -> void:
	if traveling:
		return
	hud.open_panel(panel, data)

func _capture_state() -> void:
	if current_floor and player:
		WorldState.current_floor = current_floor.floor_id
		# don't save a mid-air position; use the last safe ground position
		WorldState.player_position = player.global_position if player.is_on_floor() else player.last_safe_position
		WorldState.player_yaw = player.model.rotation.y

# ---------------------------------------------------------------- graphics
func apply_graphics() -> void:
	var p := Settings.graphics
	var vp := get_viewport()
	FX.particle_scale = [0.4, 0.8, 1.0][p]
	vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
	vp.scaling_3d_scale = [0.7, 0.85, 1.0][p]
	vp.msaa_3d = Viewport.MSAA_DISABLED if p < 2 else Viewport.MSAA_2X
	vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_DISABLED if p == 0 else Viewport.SCREEN_SPACE_AA_FXAA
	Engine.max_fps = 60 if p >= 1 else 45
	if current_floor:
		current_floor.apply_graphics(p)
	if cam and cam.camera:
		cam.camera.far = [140.0, 260.0, 400.0][p]

func quit_to_menu() -> void:
	SaveSystem.save_game()
	SaveSystem.in_game = false
	get_tree().paused = false
	Router.go_to("res://scenes/main/main_menu.tscn")
