class_name GameHUD
extends Control
## Minimal first-person HUD.
## Top-left money · top-centre progress + mission timer · top-right pause ·
## centre crosshair (colour = what the tool is aimed at) · compact objectives
## · tool / mode / bag chip · saving indicator · completion banner · tool picker.

var main
var player: Player
var runner: ContractRunner
var map: MapBase
var touch: TouchControls
var progress_bar: ProgressBar
var progress_label: Label
var timer_label: Label
var coin_label: Label
var earned_label: Label
var objective_rows: Array = []
var objectives_panel: PanelContainer
var tool_chip: PanelContainer
var tool_icon: TextureRect
var tool_name: Label
var mode_label: Label
var bag_bar: ProgressBar
var bag_label: Label
var hint_label: Label
var saving_label: Label
var crosshair: Control
var banner: Control
var picker: PanelContainer
var _hint_tween: Tween
var _save_tween: Tween
var _last_pct := -1
var _session_earned := 0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	player = main.player
	runner = main.runner
	map = main.current_map
	_build()
	runner.objectives_updated.connect(_on_objectives)
	runner.objective_completed.connect(func(_i, lbl):
		main.show_toast("Objective complete: " + lbl, "good")
		Audio.play("star"))
	runner.contract_completed.connect(_on_contract_completed)
	map.progress_updated.connect(_on_progress)
	map.coins_earned.connect(func(n, _src):
		_session_earned += n
		earned_label.text = "+%s" % UIKit.fmt(_session_earned))
	map.discovery_found.connect(func(d, coins):
		main.show_toast("Found: %s  +%d" % [d.def.get("name", "?"), coins], "unlock"))
	player.tool.hint.connect(show_hint)
	player.tool.load_changed.connect(_on_load)
	player.tool.mode_changed.connect(func(_n): refresh_tool())
	player.tool_changed.connect(func(_id): refresh_tool())
	Game.coins_changed.connect(func(_c): _refresh_coins())
	Game.saved.connect(func(_s): _show_saving())
	refresh_tool()
	_on_progress(map.snapshot)
	show_hint(String(runner.def.get("title", "")) + " — " + String(runner.def.get("description", "")), 4.0)


func _glass(radius := 10) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := UIKit.flat(Color(0.03, 0.07, 0.12, 0.58), radius, 12)
	sb.border_color = Color(1, 1, 1, 0.08)
	sb.set_border_width_all(1)
	p.add_theme_stylebox_override("panel", sb)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return p


func _build() -> void:
	var touch_on := Game.use_touch_controls()
	touch = TouchControls.new()
	touch.player = player
	touch.visible = touch_on
	touch.open_picker.connect(_toggle_picker)
	add_child(touch)
	# Crosshair.
	crosshair = Control.new()
	crosshair.set_anchors_preset(Control.PRESET_CENTER)
	crosshair.mouse_filter = Control.MOUSE_FILTER_IGNORE
	crosshair.draw.connect(_draw_crosshair)
	add_child(crosshair)
	# ---- Top-left: money ----
	var money := _glass()
	money.position = Vector2(16, 14)
	var mh := UIKit.hbox(8)
	mh.add_child(UIKit.icon_rect(Data.ui_icon("coin"), 24))
	coin_label = UIKit.label("0", 20, UIKit.WHITE)
	mh.add_child(coin_label)
	earned_label = UIKit.label("", 15, UIKit.TURQ)
	mh.add_child(earned_label)
	money.add_child(mh)
	add_child(money)
	saving_label = UIKit.label("Saving…", 13, UIKit.GREY)
	saving_label.position = Vector2(22, 58)
	saving_label.modulate.a = 0.0
	saving_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(saving_label)
	# ---- Top-centre: progress + timer ----
	var top := _glass()
	top.set_anchors_preset(Control.PRESET_CENTER_TOP)
	top.custom_minimum_size = Vector2(420, 0)
	top.position = Vector2(-210, 14)
	var tv := UIKit.hbox(10)
	var title := UIKit.label(String(map.def.get("name", "")).to_upper(), 12, UIKit.GREY)
	tv.add_child(title)
	progress_bar = UIKit.progress(0.0, UIKit.TURQ, 12)
	progress_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	progress_bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	tv.add_child(progress_bar)
	progress_label = UIKit.label("0%", 16, UIKit.WHITE)
	progress_label.custom_minimum_size.x = 44
	tv.add_child(progress_label)
	timer_label = UIKit.label("0:00", 16, UIKit.WHITE)
	tv.add_child(timer_label)
	top.add_child(tv)
	add_child(top)
	# ---- Top-right: pause ----
	var pause_btn := UIKit.icon_button(Data.ui_icon("pause"), UIKit.BLUE2, 52, func(): main.pause_game())
	pause_btn.custom_minimum_size = Vector2(52, 52)
	pause_btn.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	pause_btn.offset_left = -68
	pause_btn.offset_top = 12
	pause_btn.add_to_group("hud_button")
	add_child(pause_btn)
	# ---- Objectives (compact) ----
	objectives_panel = _glass()
	objectives_panel.position = Vector2(16, 84)
	objectives_panel.custom_minimum_size = Vector2(300, 0)
	var ov := UIKit.vbox(5)
	objectives_panel.add_child(ov)
	ov.add_child(UIKit.label(String(runner.def.get("title", "")), 15, UIKit.WHITE))
	for o in runner.def.get("objectives", []):
		var lh := UIKit.hbox(6)
		var check := UIKit.label("•", 15, UIKit.GREY)
		lh.add_child(check)
		var l := UIKit.label(String(o.get("label", "")), 13, Color(1, 1, 1, 0.85))
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		lh.add_child(l)
		var pct := UIKit.label("0%", 13, UIKit.TURQ)
		lh.add_child(pct)
		ov.add_child(lh)
		objective_rows.append({"check": check, "pct": pct, "label": l})
	add_child(objectives_panel)
	# ---- Tool chip (desktop) / bag meter ----
	tool_chip = _glass()
	tool_chip.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	tool_chip.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	tool_chip.grow_vertical = Control.GROW_DIRECTION_BEGIN
	tool_chip.offset_right = -16
	tool_chip.offset_bottom = -16
	var th := UIKit.hbox(10)
	tool_icon = UIKit.icon_rect(null, 40)
	th.add_child(tool_icon)
	var tvv := UIKit.vbox(2)
	tool_name = UIKit.label("", 15, UIKit.WHITE)
	tvv.add_child(tool_name)
	mode_label = UIKit.label("", 12, UIKit.TURQ)
	tvv.add_child(mode_label)
	bag_label = UIKit.label("", 12, UIKit.GREY)
	tvv.add_child(bag_label)
	bag_bar = UIKit.progress(0.0, UIKit.ORANGE, 8)
	bag_bar.custom_minimum_size.x = 140
	tvv.add_child(bag_bar)
	th.add_child(tvv)
	tool_chip.add_child(th)
	tool_chip.visible = not touch_on
	add_child(tool_chip)
	# Touch layout: small bag meter above the tool chip drawn by TouchControls.
	# ---- Hint ----
	hint_label = UIKit.wrap_label("", 17, UIKit.WHITE, 560)
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint_label.set_anchors_preset(Control.PRESET_CENTER)
	hint_label.position = Vector2(-280, 60)
	hint_label.size = Vector2(560, 60)
	hint_label.add_theme_constant_override("outline_size", 6)
	hint_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	hint_label.modulate.a = 0.0
	hint_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(hint_label)
	if not touch_on:
		var help := UIKit.label("WASD move · Mouse look · Left click clean · Shift run · E use · R mode · Q/Tab/1-9 tools · Esc pause", 12, Color(1, 1, 1, 0.55))
		help.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
		help.position = Vector2(16, -28)
		help.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(help)
	_refresh_coins()


func _process(_delta: float) -> void:
	if runner:
		timer_label.text = UIKit.time_str(runner.elapsed)
		var par := float(runner.def.get("par_time", 120))
		timer_label.add_theme_color_override("font_color", UIKit.WHITE if runner.elapsed <= par else UIKit.ORANGE)
	crosshair.queue_redraw()


func _draw_crosshair() -> void:
	if picker or banner:
		return
	var state := player.tool.aim_state if player and player.tool else "none"
	var col := Color(1, 1, 1, 0.55)
	match state:
		"dirt":
			col = UIKit.TURQ
		"wrong":
			col = UIKit.RED
		"debris":
			col = Color(1, 0.75, 0.4, 0.9)
		"clean":
			col = Color(1, 1, 1, 0.75)
	var r := 9.0 if state == "dirt" else 6.0
	crosshair.draw_arc(Vector2.ZERO, r, 0, TAU, 32, Color(0, 0, 0, 0.35), 3.5, true)
	crosshair.draw_arc(Vector2.ZERO, r, 0, TAU, 32, col, 2.0, true)
	crosshair.draw_circle(Vector2.ZERO, 1.6, col)


func _refresh_coins() -> void:
	coin_label.text = UIKit.fmt(Game.coins())


func refresh_tool() -> void:
	var t := player.tool
	var d := Data.tool_def(t.tool_id)
	tool_icon.texture = Data.tool_icon(t.tool_id)
	tool_name.text = String(d.get("name", ""))
	mode_label.text = ("Mode: " + t.mode_name()) if t.has_modes() else ""
	_on_load(t.bag_load, t.capacity)


func _on_load(load_v: int, cap: int) -> void:
	bag_bar.visible = cap > 0
	bag_label.visible = cap > 0
	if cap > 0:
		bag_bar.value = float(load_v) / cap
		bag_label.text = "Bag %d / %d" % [load_v, cap]
		bag_bar.add_theme_stylebox_override("fill", UIKit.flat(UIKit.RED if load_v >= cap else UIKit.ORANGE, 4))
		if Game.use_touch_controls() and load_v >= cap:
			show_hint("Bag full! Walk to a bin (glowing ring) and press USE.")


func _on_progress(snap: Dictionary) -> void:
	var o := float(snap.get("overall", 0.0))
	progress_bar.value = o
	var pct := int(floor(o * 100.0))
	if pct != _last_pct:
		_last_pct = pct
		progress_label.text = "%d%%" % pct


func _on_objectives(states: Array) -> void:
	for i in mini(states.size(), objective_rows.size()):
		var s: Dictionary = states[i]
		var r: Dictionary = objective_rows[i]
		r["pct"].text = "%d / %d%%" % [int(floor(float(s.get("raw", 0.0)) * 100.0)), int(round(float(s["target"]) * 100.0))]
		if s["done"]:
			r["check"].text = "✓"
			r["check"].add_theme_color_override("font_color", UIKit.TURQ)
			r["label"].add_theme_color_override("font_color", UIKit.TURQ)


func show_hint(text: String, duration := 2.5) -> void:
	hint_label.text = text
	if _hint_tween:
		_hint_tween.kill()
	_hint_tween = create_tween()
	_hint_tween.tween_property(hint_label, "modulate:a", 1.0, 0.15)
	_hint_tween.tween_interval(duration)
	_hint_tween.tween_property(hint_label, "modulate:a", 0.0, 0.5)


func _show_saving() -> void:
	if _save_tween:
		_save_tween.kill()
	_save_tween = create_tween()
	_save_tween.tween_property(saving_label, "modulate:a", 1.0, 0.15)
	_save_tween.tween_interval(0.8)
	_save_tween.tween_property(saving_label, "modulate:a", 0.0, 0.4)


func _on_contract_completed() -> void:
	Audio.play("complete")
	main._capture_mouse(false)
	banner = CenterContainer.new()
	banner.set_anchors_preset(Control.PRESET_TOP_WIDE)
	banner.offset_top = 150
	banner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var p := UIKit.panel(Color(UIKit.BLUE, 0.92), 14)
	banner.add_child(p)
	var v := UIKit.vbox(10)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	p.add_child(v)
	v.add_child(UIKit.label("CONTRACT COMPLETE", 26, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(UIKit.label("Keep cleaning for more stars, or finish the job.", 15, UIKit.GREY, HORIZONTAL_ALIGNMENT_CENTER))
	var h := UIKit.hbox(12)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	var keep := UIKit.button("Keep cleaning", UIKit.BLUE2, Vector2(220, 60), 20, func():
		banner.queue_free()
		banner = null
		main._capture_mouse(true))
	var fin := UIKit.button("Finish job", UIKit.ORANGE, Vector2(220, 60), 20, func(): main.finish_contract())
	keep.add_to_group("hud_button")
	fin.add_to_group("hud_button")
	h.add_child(keep)
	h.add_child(fin)
	v.add_child(h)
	add_child(banner)
	# A persistent finish button stays available after the banner is hidden.
	var finish_small := UIKit.button("Finish job", UIKit.ORANGE, Vector2(170, 52), 18, func(): main.finish_contract())
	finish_small.add_to_group("hud_button")
	finish_small.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	finish_small.offset_left = -250
	finish_small.offset_top = 12
	add_child(finish_small)


func _toggle_picker() -> void:
	if picker and is_instance_valid(picker):
		picker.queue_free()
		picker = null
		main._capture_mouse(true)
		return
	main._capture_mouse(false)
	picker = UIKit.panel(Color(UIKit.BLUE, 0.95), 14)
	picker.set_anchors_preset(Control.PRESET_CENTER)
	var v := UIKit.vbox(10)
	picker.add_child(v)
	v.add_child(UIKit.label("Equipment", 22, UIKit.WHITE))
	var grid := GridContainer.new()
	grid.columns = 5
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	v.add_child(grid)
	for t in Data.tool_order:
		if not Game.owns_tool(t):
			continue
		var d := Data.tool_def(t)
		var tid: String = t
		var b := UIKit.button(String(d.get("name", t)), UIKit.GOLD if t == player.tool.tool_id else UIKit.BLUE2, Vector2(150, 110), 15, func():
			player.select_tool(tid)
			_toggle_picker())
		b.custom_minimum_size = Vector2(140, 104)
		b.icon = Data.tool_icon(t)
		b.expand_icon = true
		b.add_theme_constant_override("icon_max_width", 48)
		b.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
		b.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		b.add_to_group("hud_button")
		grid.add_child(b)
	var close := UIKit.button("Close", UIKit.BLUE2, Vector2(180, 52), 18, _toggle_picker)
	close.add_to_group("hud_button")
	v.add_child(close)
	picker.add_to_group("hud_button")
	add_child(picker)
	picker.position = (size - picker.get_combined_minimum_size()) / 2
