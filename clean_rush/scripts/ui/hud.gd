class_name GameHUD
extends Control
## In-game HUD: progress, objectives, money, timer, tool selection, bag
## capacity, nozzle toggle, hints, completion banner and pause.

var main
var player: Player
var runner: ContractRunner
var map: MapBase
var touch: TouchControls
var progress_bar: ProgressBar
var progress_label: Label
var timer_label: Label
var coin_label: Label
var pending_label: Label
var objectives_box: VBoxContainer
var objective_rows: Array = []
var tool_button: Button
var tool_name: Label
var nozzle_button: Button
var bag_box: VBoxContainer
var bag_bar: ProgressBar
var bag_label: Label
var hint_label: Label
var banner: PanelContainer
var picker: PanelContainer
var _hint_tween: Tween
var _last_pct := -1


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	player = main.player
	runner = main.runner
	map = main.current_map
	_build()
	runner.objectives_updated.connect(_on_objectives)
	runner.objective_completed.connect(func(_i, lbl):
		main.show_toast("✓ " + lbl, "good")
		Audio.play("star"))
	runner.contract_completed.connect(_on_contract_completed)
	map.progress_updated.connect(_on_progress)
	map.discovery_found.connect(func(d, coins):
		main.show_toast("Found: %s! +%d" % [d.def.get("name", "?"), coins], "unlock"))
	player.tool.hint.connect(show_hint)
	player.tool.load_changed.connect(_on_load)
	player.tool_changed.connect(func(_id): refresh_tool())
	Game.coins_changed.connect(func(_c): _refresh_coins())
	refresh_tool()
	_on_progress(map.snapshot)
	var c: Dictionary = runner.def
	show_hint(c.get("title", "") + " — " + c.get("description", ""), 4.0)


func _build() -> void:
	var touch_on := Game.use_touch_controls()
	touch = TouchControls.new()
	touch.player = player
	touch.rig = main.rig
	touch.visible = touch_on
	add_child(touch)
	# ---- Top bar ----
	var top := UIKit.hbox(14)
	top.set_anchors_preset(Control.PRESET_TOP_WIDE)
	top.offset_left = 16
	top.offset_right = -16
	top.offset_top = 12
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(top)
	var money := UIKit.panel(Color(0, 0, 0, 0.4), 28)
	var mh := UIKit.hbox(8)
	mh.add_child(UIKit.icon_rect(Data.ui_icon("coin"), 34))
	coin_label = UIKit.label("0", 26, UIKit.GOLD)
	mh.add_child(coin_label)
	pending_label = UIKit.label("", 20, UIKit.GREEN)
	mh.add_child(pending_label)
	money.add_child(mh)
	top.add_child(money)
	var mid := UIKit.panel(Color(0, 0, 0, 0.4), 28)
	mid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var pv := UIKit.hbox(12)
	progress_label = UIKit.label("0%", 26, UIKit.WHITE)
	progress_label.custom_minimum_size.x = 84
	pv.add_child(UIKit.icon_rect(Data.ui_icon("sparkle"), 34))
	progress_bar = UIKit.progress(0.0, UIKit.TURQ, 26)
	progress_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	progress_bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	pv.add_child(progress_bar)
	pv.add_child(progress_label)
	timer_label = UIKit.label("0:00", 24, UIKit.WHITE)
	pv.add_child(timer_label)
	mid.add_child(pv)
	top.add_child(mid)
	var pause_btn := UIKit.icon_button(Data.ui_icon("pause"), UIKit.BLUE2, 68, func(): main.pause_game())
	pause_btn.add_to_group("hud_button")
	top.add_child(pause_btn)
	# ---- Objectives (left) ----
	var obj_panel := UIKit.panel(Color(0.04, 0.12, 0.25, 0.72), 22)
	obj_panel.position = Vector2(16, 104)
	obj_panel.custom_minimum_size = Vector2(380, 0)
	obj_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(obj_panel)
	objectives_box = UIKit.vbox(6)
	obj_panel.add_child(objectives_box)
	objectives_box.add_child(UIKit.label(String(runner.def.get("title", "")), 22, UIKit.GOLD))
	for o in runner.def.get("objectives", []):
		var row := UIKit.vbox(2)
		var lh := UIKit.hbox(6)
		var check := UIKit.label("○", 20, UIKit.WHITE)
		lh.add_child(check)
		var l := UIKit.label(String(o.get("label", "")), 18, UIKit.WHITE)
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		lh.add_child(l)
		var pct := UIKit.label("0%", 18, UIKit.TURQ)
		lh.add_child(pct)
		row.add_child(lh)
		var pb := UIKit.progress(0.0, UIKit.GREEN, 10)
		row.add_child(pb)
		objectives_box.add_child(row)
		objective_rows.append({"check": check, "pct": pct, "bar": pb, "label": l})
	# ---- Tool area (bottom right / bottom center on desktop) ----
	var tools := UIKit.vbox(8)
	tools.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	tools.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	tools.grow_vertical = Control.GROW_DIRECTION_BEGIN
	tools.offset_right = -(270 if touch_on else 20)
	tools.offset_bottom = -(190 if touch_on else 20)
	tools.alignment = BoxContainer.ALIGNMENT_END
	add_child(tools)
	bag_box = UIKit.vbox(2)
	bag_label = UIKit.label("Bag", 16, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER)
	bag_box.add_child(bag_label)
	bag_bar = UIKit.progress(0.0, UIKit.ORANGE, 14)
	bag_bar.custom_minimum_size.x = 150
	bag_box.add_child(bag_bar)
	tools.add_child(bag_box)
	var th := UIKit.hbox(10)
	th.alignment = BoxContainer.ALIGNMENT_END
	tools.add_child(th)
	nozzle_button = UIKit.button("Wide", UIKit.BLUE2, Vector2(110, 84), 20, func():
		player.tool.toggle_nozzle()
		_refresh_nozzle())
	nozzle_button.add_to_group("hud_button")
	th.add_child(nozzle_button)
	tool_button = UIKit.icon_button(null, UIKit.TURQ, 96, _toggle_picker)
	tool_button.add_to_group("hud_button")
	th.add_child(tool_button)
	tool_name = UIKit.label("", 18, UIKit.WHITE, HORIZONTAL_ALIGNMENT_RIGHT)
	tools.add_child(tool_name)
	# ---- Hint / help ----
	hint_label = UIKit.wrap_label("", 22, UIKit.WHITE, 640)
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	hint_label.position = Vector2(-320, -150)
	hint_label.size = Vector2(640, 80)
	hint_label.grow_vertical = Control.GROW_DIRECTION_BEGIN
	hint_label.add_theme_constant_override("outline_size", 8)
	hint_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.6))
	hint_label.modulate.a = 0.0
	hint_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(hint_label)
	if not touch_on:
		var help := UIKit.label("WASD move · Shift run · Space / Left-click clean · Tab or 1-9 tools · R nozzle · Q/E or right-drag camera · Esc pause", 16, Color(1, 1, 1, 0.8))
		help.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
		help.position = Vector2(16, -36)
		help.grow_vertical = Control.GROW_DIRECTION_BEGIN
		help.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(help)
	_refresh_coins()


func _process(_delta: float) -> void:
	if runner:
		timer_label.text = UIKit.time_str(runner.elapsed)
		var par := float(runner.def.get("par_time", 120))
		timer_label.add_theme_color_override("font_color", UIKit.WHITE if runner.elapsed <= par else UIKit.ORANGE)
		pending_label.text = "+%d" % runner.dirt_coins() if runner.dirt_coins() > 0 else ""


func _refresh_coins() -> void:
	coin_label.text = UIKit.fmt(Game.coins())


func refresh_tool() -> void:
	var t := player.tool
	tool_button.icon = Data.tool_icon(t.tool_id)
	var d := Data.tool_def(t.tool_id)
	tool_name.text = String(d.get("name", ""))
	tool_button.add_theme_stylebox_override("normal", UIKit.flat(Data.arr_color(d.get("color", [0.1, 0.7, 0.7])).darkened(0.1), 20))
	nozzle_button.visible = t.has_nozzles()
	_refresh_nozzle()
	_on_load(t.bag_load, t.capacity)


func _refresh_nozzle() -> void:
	nozzle_button.text = "Narrow" if player.tool.nozzle_narrow else "Wide"


func _on_load(load_v: int, cap: int) -> void:
	bag_box.visible = cap > 0
	if cap > 0:
		bag_bar.value = float(load_v) / cap
		bag_label.text = "Bag %d / %d" % [load_v, cap]
		bag_bar.add_theme_stylebox_override("fill", UIKit.flat(UIKit.RED if load_v >= cap else UIKit.ORANGE, 7))


func _on_progress(snap: Dictionary) -> void:
	var o := float(snap.get("overall", 0.0))
	progress_bar.value = o
	var pct := int(floor(o * 100.0))
	if pct != _last_pct:
		_last_pct = pct
		progress_label.text = "%d%%" % pct
		if pct > 0 and pct % 25 == 0:
			Audio.play("coin", -6.0)


func _on_objectives(states: Array) -> void:
	for i in mini(states.size(), objective_rows.size()):
		var s: Dictionary = states[i]
		var r: Dictionary = objective_rows[i]
		r["bar"].value = s["progress"]
		r["pct"].text = "%d%%" % int(floor(float(s.get("raw", 0.0)) * 100.0))
		if s["done"]:
			r["check"].text = "✔"
			r["check"].add_theme_color_override("font_color", UIKit.GREEN)
			r["label"].add_theme_color_override("font_color", UIKit.GREEN)
		r["pct"].text = r["pct"].text + " / %d%%" % int(round(float(s["target"]) * 100.0))


func show_hint(text: String, duration := 2.5) -> void:
	hint_label.text = text
	if _hint_tween:
		_hint_tween.kill()
	_hint_tween = create_tween()
	_hint_tween.tween_property(hint_label, "modulate:a", 1.0, 0.15)
	_hint_tween.tween_interval(duration)
	_hint_tween.tween_property(hint_label, "modulate:a", 0.0, 0.5)


func _on_contract_completed() -> void:
	Audio.play("complete")
	banner = UIKit.panel(Color(UIKit.BLUE, 0.95), 28)
	banner.set_anchors_preset(Control.PRESET_CENTER_TOP)
	banner.grow_horizontal = Control.GROW_DIRECTION_BOTH
	banner.position.y = 120
	var v := UIKit.vbox(10)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	banner.add_child(v)
	v.add_child(UIKit.label("CONTRACT COMPLETE!", 36, UIKit.GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	var stars_now := runner.stars()
	v.add_child(UIKit.label("Keep cleaning for more stars, or finish the job.", 20, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER))
	var h := UIKit.hbox(16)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	var keep := UIKit.button("Keep cleaning", UIKit.BLUE2, Vector2(240, 70), 22, func(): banner.visible = false)
	var fin := UIKit.button("Finish ★", UIKit.GREEN.darkened(0.1), Vector2(240, 70), 24, func(): main.finish_contract())
	keep.add_to_group("hud_button")
	fin.add_to_group("hud_button")
	h.add_child(keep)
	h.add_child(fin)
	v.add_child(h)
	add_child(banner)
	banner.position.x = -banner.size.x / 2
	var _s := stars_now
	# A persistent finish button stays available after the banner is hidden.
	var finish_small := UIKit.button("Finish ★", UIKit.GREEN.darkened(0.1), Vector2(180, 64), 22, func(): main.finish_contract())
	finish_small.add_to_group("hud_button")
	finish_small.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	finish_small.position = Vector2(-280, 100)
	add_child(finish_small)


func _toggle_picker() -> void:
	if picker and is_instance_valid(picker):
		picker.queue_free()
		picker = null
		return
	picker = UIKit.panel(Color(UIKit.BLUE, 0.95), 26)
	picker.set_anchors_preset(Control.PRESET_CENTER)
	var v := UIKit.vbox(10)
	picker.add_child(v)
	v.add_child(UIKit.label("Choose a tool", 28, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER))
	var grid := GridContainer.new()
	grid.columns = 5
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	v.add_child(grid)
	for t in Data.tool_order:
		if not Game.owns_tool(t):
			continue
		var d := Data.tool_def(t)
		var tid: String = t
		var b := UIKit.button("", Data.arr_color(d.get("color", [0.2, 0.6, 0.9])).darkened(0.15), Vector2(130, 120), 15, func():
			player.select_tool(tid)
			refresh_tool()
			_toggle_picker())
		b.icon = Data.tool_icon(t)
		b.expand_icon = true
		b.add_theme_constant_override("icon_max_width", 64)
		b.text = String(d.get("name", t))
		b.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
		b.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		b.add_to_group("hud_button")
		if t == player.tool.tool_id:
			var st := UIKit.flat(UIKit.GOLD, 20)
			b.add_theme_stylebox_override("normal", st)
		grid.add_child(b)
	var close := UIKit.button("Close", UIKit.BLUE2, Vector2(200, 60), 22, _toggle_picker)
	close.add_to_group("hud_button")
	v.add_child(close)
	picker.add_to_group("hud_button")
	add_child(picker)
	picker.position = (size - picker.get_combined_minimum_size()) / 2
