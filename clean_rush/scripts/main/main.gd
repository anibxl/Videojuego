extends Node
## Root of the game: input setup, screen routing, menu background scene and the
## gameplay session (map + player + camera + contract + HUD).

var world: Node3D
var ui_layer: CanvasLayer
var ui_root: Control
var screen: Control
var overlay: Control
var toast_box: VBoxContainer

var current_map: MapBase
var player: Player
var rig: CameraRig
var runner: ContractRunner
var hud: GameHUD
var playing := false
var session_map := ""
var session_contract := ""
var _rmb_drag := false
var _map_save_t := 0.0
var _loading: Control


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_setup_input()
	world = Node3D.new()
	world.name = "World"
	world.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(world)
	ui_layer = CanvasLayer.new()
	ui_layer.layer = 10
	add_child(ui_layer)
	ui_root = Control.new()
	ui_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui_root.theme = UIKit.theme()
	ui_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_layer.add_child(ui_root)
	toast_box = UIKit.vbox(8)
	toast_box.set_anchors_preset(Control.PRESET_CENTER_TOP)
	toast_box.position = Vector2(-300, 12)
	toast_box.custom_minimum_size = Vector2(600, 0)
	toast_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_layer.add_child(toast_box)
	Game.toast.connect(show_toast)
	Game.about_to_save.connect(save_location_state)
	Game.map_reset.connect(func(id):
		if playing and session_map == id:
			playing = false)
	Game.achievement_unlocked.connect(func(a): show_toast("Achievement: %s  (+%d)" % [a["name"], int(a.get("reward", 0))], "achievement"))
	Audio.play_music()
	var args := OS.get_cmdline_user_args()
	_dev_args(args)
	var pi := args.find("--play")
	if pi >= 0 and pi + 1 < args.size() and Data.maps.has(args[pi + 1]):
		var mid := args[pi + 1]
		var cid: String = args[pi + 2] if pi + 2 < args.size() and not args[pi + 2].begins_with("--") else Data.map_def(mid)["contracts"][0]["id"]
		start_contract(mid, cid)
	elif not Game.has_active_slot():
		goto("slots")
	else:
		goto("menu")
	for a2 in args:
		if a2.begins_with("--screen="):
			goto(a2.substr(9), {"mode": "edit", "return_to": "menu"} if a2.ends_with("creator") else null)
			if a2.ends_with("creator") and args.has("--face"):
				screen.preview.zoom = 0.55
				screen.preview.call_deferred("_update_camera")


## Developer hooks (only active with user args after "--"):
##   --shot <png> <seconds>   save a screenshot then quit
##   --touch                  force the touch layout (desktop testing)
##   --smoke                  run the automated smoke test (tests/smoke_test.gd)
func _dev_args(args: PackedStringArray) -> void:
	var i := args.find("--shot")
	if i >= 0 and i + 2 < args.size():
		var path := args[i + 1]
		var secs := float(args[i + 2])
		get_tree().create_timer(secs, true).timeout.connect(func():
			get_viewport().get_texture().get_image().save_png(path)
			get_tree().quit())
	for a in args:
		if a.begins_with("--time="):
			Game.forced_time = a.substr(7)
		elif a.begins_with("--weather="):
			Game.forced_weather = a.substr(10)
	if args.has("--desktop"):
		Game.settings["touch"] = 2
	if args.has("--touch"):
		Game.settings["touch"] = 1
	for a3 in args:
		if a3.begins_with("--savetest=") and ResourceLoader.exists("res://tests/save_relaunch_test.gd"):
			var st: Node = load("res://tests/save_relaunch_test.gd").new()
			st.set("main", self)
			add_child(st)
	if args.has("--debug-aim"):
		var d: Node = load("res://tests/debug_aim.gd").new()
		d.set("main", self)
		add_child(d)
	if args.has("--smoke") and ResourceLoader.exists("res://tests/smoke_test.gd"):
		var t: Node = load("res://tests/smoke_test.gd").new()
		t.set("main", self)
		add_child(t)


func _setup_input() -> void:
	var binds := {
		"move_left": [KEY_A, KEY_LEFT], "move_right": [KEY_D, KEY_RIGHT],
		"move_forward": [KEY_W, KEY_UP], "move_back": [KEY_S, KEY_DOWN],
		"run": [KEY_SHIFT], "clean": [KEY_SPACE], "next_tool": [KEY_TAB],
		"nozzle": [KEY_R], "pause": [KEY_ESCAPE, KEY_P], "interact": [KEY_E, KEY_F], "prev_tool": [KEY_Q],
	}
	for action in binds.keys():
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for k in binds[action]:
			var ev := InputEventKey.new()
			ev.physical_keycode = k
			InputMap.action_add_event(action, ev)
	for i in 9:
		var a := "tool_%d" % (i + 1)
		if not InputMap.has_action(a):
			InputMap.add_action(a)
			var ev := InputEventKey.new()
			ev.physical_keycode = KEY_1 + i
			InputMap.action_add_event(a, ev)


# ================================================================ screens ===

func goto(screen_name: String, arg = null) -> void:
	close_overlay()
	if playing:
		_end_session()
	_ensure_menu_background()
	if screen:
		screen.queue_free()
	var s: Control
	match screen_name:
		"maps":
			s = MapSelectScreen.new()
		"contracts":
			s = ContractSelectScreen.new()
		"shop":
			s = ShopScreen.new()
		"equipment":
			s = ShopScreen.new()
			s.set("owned_only", true)
		"achievements":
			s = AchievementsScreen.new()
		"collection":
			s = CollectionScreen.new()
		"daily":
			s = DailyScreen.new()
		"settings":
			s = SettingsScreen.new()
		"creator":
			s = CharacterCreatorScreen.new()
		"slots":
			s = SaveSlotsScreen.new()
		"profile":
			s = ProfileScreen.new()
		_:
			s = MainMenuScreen.new()
	s.set("main", self)
	s.set("arg", arg)
	screen = s
	ui_root.add_child(s)
	s.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui_root.move_child(s, 0)


func open_overlay(c: Control) -> void:
	close_overlay()
	overlay = c
	c.set("main", self)
	ui_root.add_child(c)
	c.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func close_overlay() -> void:
	if overlay and is_instance_valid(overlay):
		overlay.queue_free()
	overlay = null


func show_toast(text: String, kind := "info") -> void:
	var colors := {"info": UIKit.BLUE2, "good": UIKit.GREEN.darkened(0.2), "unlock": UIKit.ORANGE, "achievement": Color("8a4be0"), "warn": UIKit.RED}
	var p := UIKit.panel(Color(colors.get(kind, UIKit.BLUE2), 0.95), 26)
	var l := UIKit.label(text, 20, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER)
	p.add_child(l)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	toast_box.add_child(p)
	p.modulate.a = 0.0
	var tw := p.create_tween()
	tw.tween_property(p, "modulate:a", 1.0, 0.2)
	tw.tween_interval(2.4)
	tw.tween_property(p, "modulate:a", 0.0, 0.4)
	tw.tween_callback(p.queue_free)
	while toast_box.get_child_count() > 3:
		toast_box.get_child(0).queue_free()
		toast_box.remove_child(toast_box.get_child(0))


func _ensure_menu_background() -> void:
	if current_map != null and current_map.menu_mode:
		return
	_clear_world()
	var script: GDScript = load(Data.map_def("autumn_garden")["builder"])
	var m: MapBase = script.new()
	m.map_id = "autumn_garden"
	m.menu_mode = true
	world.add_child(m)
	current_map = m
	rig = CameraRig.new()
	# Slow, low cinematic camera over the garden.
	rig.pitch = deg_to_rad(-11.0)
	rig.target_distance = 12.0
	rig.distance = 12.0
	rig.orbit_speed = 0.0   # gentle sway driven in _process (never drifts into trees)
	rig.target_yaw = 0.0
	rig.yaw = 0.0
	world.add_child(rig)
	rig.global_position = Vector3(0.5, 1.4, 1.5)
	# Gentle breeze keeps the leaves moving in the background.
	var breeze := Timer.new()
	breeze.wait_time = 2.5
	breeze.autostart = true
	breeze.timeout.connect(func():
		if current_map and current_map.menu_mode:
			var a := randf() * TAU
			var dir := Vector3(cos(a), 0, sin(a))
			var o := Vector3(randf_range(-8, 8), 0, randf_range(-6, 8))
			for f in current_map.fields:
				f.push(o, dir, 6.0, 3.0, 4.0, 0.15))
	m.add_child(breeze)
	Audio.loop_start("ambience", "ambience_garden", -18.0)


func _clear_world() -> void:
	for c in world.get_children():
		c.queue_free()
	current_map = null
	player = null
	rig = null
	runner = null


# =============================================================== gameplay ===

func start_contract(map_id: String, contract_id: String) -> void:
	# Leaving a running session: persist it before tearing it down.
	if playing:
		save_location_state()
		Game.save_game()
	playing = false
	get_tree().paused = false
	close_overlay()
	if screen:
		screen.queue_free()
		screen = null
	if hud:
		hud.queue_free()
		hud = null
	_clear_world()
	Audio.stop_all_loops()
	session_map = map_id
	session_contract = contract_id
	Game.session["visit"] = int(Game.session.get("visit", 0)) + 1
	# Loading feedback while the location is generated.
	_show_loading(String(Data.map_def(map_id).get("name", "")))
	await get_tree().process_frame
	await get_tree().process_frame
	if session_map != map_id or session_contract != contract_id:
		return   # another start was requested meanwhile
	var mdef := Data.map_def(map_id)
	var script: GDScript = load(mdef["builder"])
	var m: MapBase = script.new()
	m.map_id = map_id
	# Restore the saved restoration state of this location (cleaned areas stay clean).
	m.pending_state = Game.load_map_state(map_id)
	world.add_child(m)
	current_map = m
	rig = null
	player = Player.new()
	player.setup(m)
	world.add_child(player)
	player.global_position = m.spawn_point + Vector3(0, 0.2, 0)
	player.rotation.y = 0.0
	runner = ContractRunner.new()
	add_child(runner)
	runner.process_mode = Node.PROCESS_MODE_PAUSABLE
	runner.setup(m, map_id, Data.contract_def(map_id, contract_id))
	var job: Dictionary = Game.state.get("active_job", {})
	if job.get("map", "") == map_id and job.get("contract", "") == contract_id:
		runner.elapsed = float(job.get("elapsed", 0.0))   # resume the job timer
	Game.state["active_job"] = {"map": map_id, "contract": contract_id, "elapsed": runner.elapsed}
	hud = GameHUD.new()
	hud.set("main", self)
	ui_root.add_child(hud)
	hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui_root.move_child(hud, 0)
	playing = true
	m.message.connect(func(t, k): show_toast(t, k))
	_map_save_t = 0.0
	_capture_mouse(true)
	_hide_loading()
	for a4 in OS.get_cmdline_user_args():
		if a4.begins_with("--tool="):
			var tid := a4.substr(7)
			if not Game.owns_tool(tid):
				Game.state["tools_owned"].append(tid)
			player.select_tool(tid)
	if m.restored:
		show_toast("%s: %d%% restored so far" % [mdef.get("name", ""), int(m.overall() * 100)], "info")
	Audio.loop_start("ambience", "ambience_city" if map_id == "city_cleanup" else "ambience_garden", -14.0)


func _show_loading(title: String) -> void:
	_hide_loading()
	_loading = Control.new()
	_loading.set_anchors_preset(Control.PRESET_FULL_RECT)
	_loading.mouse_filter = Control.MOUSE_FILTER_STOP
	var bg := ColorRect.new()
	bg.color = UIKit.INK
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_loading.add_child(bg)
	var c := CenterContainer.new()
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	_loading.add_child(c)
	var v := UIKit.vbox(10)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_child(UIKit.label(title.to_upper(), 30, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(UIKit.label("Preparing the site…", 16, UIKit.GREY, HORIZONTAL_ALIGNMENT_CENTER))
	c.add_child(v)
	ui_layer.add_child(_loading)


func _hide_loading() -> void:
	if _loading and is_instance_valid(_loading):
		var l := _loading
		_loading = null
		var tw := l.create_tween()
		tw.tween_property(l, "modulate:a", 0.0, 0.35)
		tw.tween_callback(l.queue_free)


func _capture_mouse(on: bool) -> void:
	if Game.use_touch_controls() or DisplayServer.get_name() == "headless":
		return
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED if on else Input.MOUSE_MODE_VISIBLE


## Persists the current location's restoration state (called before every
## slot save, periodically, on exit and when the app is backgrounded).
func save_location_state() -> void:
	if not playing or current_map == null or current_map.menu_mode or not Game.has_active_slot():
		return
	Game.store_map_state(session_map, current_map.export_state())
	if runner and not runner.completed:
		Game.state["active_job"] = {"map": session_map, "contract": session_contract, "elapsed": runner.elapsed}


func _end_session() -> void:
	if playing and current_map and not current_map.menu_mode:
		save_location_state()
		Game.save_game()
	playing = false
	_capture_mouse(false)
	get_tree().paused = false
	Audio.stop_all_loops()
	if runner:
		runner.queue_free()
		runner = null
	if hud:
		hud.queue_free()
		hud = null
	_clear_world()


func finish_contract() -> void:
	if not playing or runner == null or not runner.completed:
		return
	var res := runner.result()
	var breakdown := runner.star_breakdown()
	save_location_state()
	var rewards := Game.complete_contract(session_map, session_contract, res)
	player.controls_enabled = false
	_capture_mouse(false)
	Audio.stop_all_loops()
	Audio.play("complete")
	Fx.spawn_burst(world, player.global_position + Vector3(0, 2, 0), Fx.confetti())
	var rs := RewardScreen.new()
	rs.set("data", {"map": session_map, "contract": session_contract, "result": res, "rewards": rewards, "breakdown": breakdown})
	open_overlay(rs)


func restart_contract() -> void:
	start_contract(session_map, session_contract)


func pause_game() -> void:
	if not playing or overlay != null:
		return
	save_location_state()
	Game.save_game()
	get_tree().paused = true
	Audio.stop_all_loops()
	_capture_mouse(false)
	open_overlay(PauseMenu.new())


func resume_game() -> void:
	close_overlay()
	get_tree().paused = false
	_capture_mouse(true)
	Audio.loop_start("ambience", "ambience_city" if session_map == "city_cleanup" else "ambience_garden", -14.0)


func next_contract_after(map_id: String, contract_id: String) -> Dictionary:
	var list: Array = Data.map_def(map_id).get("contracts", [])
	for i in list.size():
		if list[i]["id"] == contract_id and i + 1 < list.size():
			return {"map": map_id, "contract": list[i + 1]["id"]}
	var g := Game.next_goal()
	if g["contract"] != "":
		return {"map": g["map"], "contract": g["contract"]}
	return {}


# ================================================================== input ===

func _cycle_tool(step: int) -> void:
	var owned: Array = []
	for t in Data.tool_order:
		if Game.owns_tool(t):
			owned.append(t)
	var idx := owned.find(player.tool.tool_id)
	player.select_tool(owned[(idx + step + owned.size()) % owned.size()])


func _unhandled_input(event: InputEvent) -> void:
	if not playing or player == null:
		return
	if event.is_action_pressed("pause"):
		pause_game()
		return
	if get_tree().paused:
		return
	if event.is_action_pressed("next_tool"):
		_cycle_tool(1)
	if event.is_action_pressed("prev_tool"):
		_cycle_tool(-1)
	if event.is_action_pressed("nozzle"):
		player.tool.cycle_mode()
	if event.is_action_pressed("interact"):
		player.interact()
	for i in 9:
		if event.is_action_pressed("tool_%d" % (i + 1)):
			var owned2: Array = []
			for t in Data.tool_order:
				if Game.owns_tool(t):
					owned2.append(t)
			if i < owned2.size():
				player.select_tool(owned2[i])
	if hud and hud.touch and hud.touch.visible:
		return   # touch layout handles look / clean itself
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		player.add_look(event.relative)
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT:
			if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED and mb.pressed:
				_capture_mouse(true)
			player.mouse_cleaning = mb.pressed
		elif mb.button_index == MOUSE_BUTTON_RIGHT and mb.pressed:
			player.interact()
		elif mb.button_index == MOUSE_BUTTON_WHEEL_UP and mb.pressed:
			_cycle_tool(-1)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed:
			_cycle_tool(1)


func _process(delta: float) -> void:
	if not playing and rig and current_map and current_map.menu_mode:
		var t := Time.get_ticks_msec() / 1000.0
		rig.target_yaw = sin(t * 0.06) * 0.2
		rig.pitch = deg_to_rad(-11.0 + sin(t * 0.045) * 1.5)
	if not playing or player == null or get_tree().paused:
		return
	if player.mouse_cleaning and not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		player.mouse_cleaning = false
	if current_map:
		current_map.follow_camera(player.camera.global_position)
	# Periodic location autosave while playing.
	_map_save_t += delta
	if _map_save_t >= 15.0:
		_map_save_t = 0.0
		Game.save_game()   # emits about_to_save -> save_location_state()


