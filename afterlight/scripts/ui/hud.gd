class_name HUD
extends CanvasLayer
## In-game HUD: compact status card, tracked objective, menu buttons,
## toasts, floor banner, interaction prompt, challenge timer, discovery and
## level-up presentations, and the panel stack. Designed to leave the centre
## of the screen free for the 3D world.

var game: Node
var root: Control
var touch: TouchControls
var panel_layer: Control
var _open_panel: BasePanel
var _level_lbl: Label
var _xp_bar: Panel
var _xp_fill: Panel
var _frag_lbl: Label
var _obj_box: PanelContainer
var _obj_title: Label
var _obj_progress: Label
var _obj_desc: Label
var _buttons: HBoxContainer
var _toasts: VBoxContainer
var _banner: VBoxContainer
var _prompt: PanelContainer
var _prompt_lbl: Label
var _challenge: PanelContainer
var _challenge_lbl: Label
var _fps: Label
var _popup_queue: Array = []
var _popup_busy := false
var _xp_float: Label

const PANELS := {
	"pause": preload("res://scripts/ui/panels/pause_panel.gd"),
	"settings": preload("res://scripts/ui/panels/settings_panel.gd"),
	"inventory": preload("res://scripts/ui/panels/inventory_panel.gd"),
	"collection": preload("res://scripts/ui/panels/collection_panel.gd"),
	"missions": preload("res://scripts/ui/panels/missions_panel.gd"),
	"profile": preload("res://scripts/ui/panels/profile_panel.gd"),
	"map": preload("res://scripts/ui/panels/map_panel.gd"),
	"elevator": preload("res://scripts/ui/panels/elevator_panel.gd"),
	"room": preload("res://scripts/ui/panels/room_panel.gd"),
	"note": preload("res://scripts/ui/panels/note_panel.gd"),
}

func _ready() -> void:
	layer = 10
	process_mode = Node.PROCESS_MODE_ALWAYS
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.theme = UIKit.theme()
	add_child(root)
	_build_status()
	_build_objective()
	_build_buttons()
	_build_toasts()
	_build_banner()
	_build_prompt()
	_build_challenge()
	touch = TouchControls.new()
	root.add_child(touch)
	panel_layer = Control.new()
	panel_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(panel_layer)
	_fps = UIKit.label("", 16, UIKit.TEXT_DIM)
	_place(_fps, Control.PRESET_BOTTOM_LEFT, 12, -26, 120, -4)
	# events
	Events.fragments_changed.connect(_on_fragments)
	Events.xp_gained.connect(_on_xp)
	Events.level_up.connect(_on_level_up)
	Events.toast.connect(toast)
	Events.missions_changed.connect(_refresh_objective)
	Events.mission_completed.connect(_on_mission_completed)
	Events.item_acquired.connect(_on_item)
	Events.location_discovered.connect(_on_location)
	Events.achievement_unlocked.connect(_on_achievement)
	Events.interact_prompt_changed.connect(_on_prompt)
	Events.challenge_hud.connect(_on_challenge)
	Events.note_opened.connect(func(id): open_panel("note", {"id": id}))
	Events.settings_changed.connect(_apply_settings)
	_apply_settings()
	_refresh_status()
	_refresh_objective()

func _process(_d: float) -> void:
	if _fps.visible:
		_fps.text = "%d FPS" % Engine.get_frames_per_second()

func _apply_settings() -> void:
	touch.visible = Settings.use_touch_controls()
	_fps.visible = Settings.show_fps
	if game:
		game.call("on_pause_changed", get_tree().paused)

# ================================================================ BUILD
## Adds `c` to the HUD root anchored by `preset`, then applies offsets
## (left, top, right, bottom) relative to those anchors.
func _place(c: Control, preset: int, l: float, t: float, r: float, b: float) -> void:
	if c.get_parent() == null:
		root.add_child(c)
	c.set_anchors_and_offsets_preset(preset)
	c.offset_left = l
	c.offset_top = t
	c.offset_right = r
	c.offset_bottom = b

func _card(pos: Vector2, _anchor: int) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UIKit.box(Color(0.04, 0.045, 0.11, 0.62), 16, Color(0.5, 0.55, 1.0, 0.18), 1, 14))
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_place(p, Control.PRESET_TOP_LEFT, pos.x, pos.y, pos.x, pos.y)
	return p

func _build_status() -> void:
	var c := _card(Vector2(16, 14), Control.PRESET_TOP_LEFT)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 12)
	c.add_child(h)
	var badge := PanelContainer.new()
	badge.add_theme_stylebox_override("panel", UIKit.box(Color(0.3, 0.22, 0.85), 22, UIKit.CYAN, 2, 0))
	badge.custom_minimum_size = Vector2(44, 44)
	h.add_child(badge)
	_level_lbl = UIKit.label("1", 24, Color.WHITE, UIKit.font_bold)
	_level_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_level_lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	badge.add_child(_level_lbl)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	h.add_child(v)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	v.add_child(row)
	row.add_child(UIKit.label("EXPLORER", 16, UIKit.TEXT_DIM, UIKit.font_bold))
	var fr := HBoxContainer.new()
	fr.add_theme_constant_override("separation", 4)
	row.add_child(fr)
	var ic := IconDraw.new()
	ic.icon = "fragment"
	ic.color = UIKit.CYAN
	ic.custom_minimum_size = Vector2(18, 18)
	fr.add_child(ic)
	_frag_lbl = UIKit.label("0", 18, UIKit.CYAN, UIKit.font_bold)
	fr.add_child(_frag_lbl)
	_xp_bar = Panel.new()
	_xp_bar.custom_minimum_size = Vector2(150, 6)
	_xp_bar.add_theme_stylebox_override("panel", UIKit.box(Color(1, 1, 1, 0.1), 3, Color(), 0, 0))
	v.add_child(_xp_bar)
	_xp_fill = Panel.new()
	_xp_fill.add_theme_stylebox_override("panel", UIKit.box(UIKit.CYAN, 3, Color(), 0, 0))
	_xp_fill.anchor_bottom = 1.0
	_xp_bar.add_child(_xp_fill)
	_xp_float = UIKit.label("", 18, UIKit.GOOD, UIKit.font_bold)
	_xp_float.modulate.a = 0.0
	_place(_xp_float, Control.PRESET_TOP_LEFT, 80, 76, 200, 96)

func _build_objective() -> void:
	_obj_box = _card(Vector2(16, 88), Control.PRESET_TOP_LEFT)
	_obj_box.mouse_filter = Control.MOUSE_FILTER_STOP
	_obj_box.custom_minimum_size = Vector2(300, 0)
	_obj_box.gui_input.connect(func(e):
		if (e is InputEventMouseButton and e.pressed) or (e is InputEventScreenTouch and e.pressed):
			open_panel("missions"))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 0)
	_obj_box.add_child(v)
	var h := HBoxContainer.new()
	v.add_child(h)
	_obj_title = UIKit.label("", 20, Color.WHITE, UIKit.font_bold)
	_obj_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(_obj_title)
	_obj_progress = UIKit.label("", 18, UIKit.CYAN, UIKit.font_bold)
	h.add_child(_obj_progress)
	_obj_desc = UIKit.wrap_label("", 16, UIKit.TEXT_DIM)
	_obj_desc.custom_minimum_size = Vector2(300, 0)
	_obj_desc.max_lines_visible = 2
	v.add_child(_obj_desc)

func _build_buttons() -> void:
	_buttons = HBoxContainer.new()
	_buttons.add_theme_constant_override("separation", 10)
	_buttons.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	_buttons.alignment = BoxContainer.ALIGNMENT_END
	_place(_buttons, Control.PRESET_TOP_RIGHT, -400, 14, -16, 70)
	_buttons.add_child(UIKit.icon_button("map", func(): open_panel("map"), 56, "Map (M)"))
	_buttons.add_child(UIKit.icon_button("missions", func(): open_panel("missions"), 56, "Missions (J)"))
	_buttons.add_child(UIKit.icon_button("bag", func(): open_panel("inventory"), 56, "Inventory (I)"))
	_buttons.add_child(UIKit.icon_button("book", func(): open_panel("collection"), 56, "Collection (B)"))
	_buttons.add_child(UIKit.icon_button("pause", toggle_pause, 56, "Pause (Esc)"))

func is_point_on_buttons(p: Vector2) -> bool:
	return _buttons.get_global_rect().grow(8).has_point(p) or _obj_box.get_global_rect().has_point(p)

func _build_toasts() -> void:
	_toasts = VBoxContainer.new()
	_toasts.alignment = BoxContainer.ALIGNMENT_BEGIN
	_toasts.add_theme_constant_override("separation", 6)
	_toasts.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_place(_toasts, Control.PRESET_CENTER_TOP, -230, 84, 230, 300)

func _build_banner() -> void:
	_banner = VBoxContainer.new()
	_banner.alignment = BoxContainer.ALIGNMENT_CENTER
	_banner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_banner.modulate.a = 0.0
	_place(_banner, Control.PRESET_CENTER, -420, -150, 420, 10)

func _build_prompt() -> void:
	_prompt = PanelContainer.new()
	_prompt.add_theme_stylebox_override("panel", UIKit.box(Color(0.05, 0.05, 0.13, 0.85), 22, Color(1.0, 0.8, 0.4, 0.6), 1, 18))
	_prompt.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_prompt.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_prompt.visible = false
	_place(_prompt, Control.PRESET_CENTER_BOTTOM, -10, -124, 10, -80)
	_prompt_lbl = UIKit.label("", 22, Color(1, 0.95, 0.85), UIKit.font_bold)
	_prompt_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_prompt.add_child(_prompt_lbl)

func _build_challenge() -> void:
	_challenge = PanelContainer.new()
	_challenge.add_theme_stylebox_override("panel", UIKit.box(Color(0.25, 0.08, 0.3, 0.85), 16, Color(1.0, 0.45, 0.75, 0.8), 2, 18))
	_challenge.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_challenge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_challenge.visible = false
	_place(_challenge, Control.PRESET_CENTER_TOP, -170, 16, 170, 60)
	_challenge_lbl = UIKit.label("", 24, Color.WHITE, UIKit.font_bold)
	_challenge_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_challenge.add_child(_challenge_lbl)

# ================================================================ STATUS
func _refresh_status() -> void:
	_level_lbl.text = str(Progression.level)
	_frag_lbl.text = str(Inventory.fragments)
	_xp_fill.anchor_right = Progression.xp_ratio()

func _on_fragments(_t: int, _d: int) -> void:
	_refresh_status()
	var tw := create_tween()
	_frag_lbl.pivot_offset = _frag_lbl.size / 2
	tw.tween_property(_frag_lbl, "scale", Vector2(1.3, 1.3), 0.08)
	tw.tween_property(_frag_lbl, "scale", Vector2.ONE, 0.15)

func _on_xp(amount: int, _reason: String) -> void:
	_refresh_status()
	_xp_float.text = "+%d XP" % amount
	_xp_float.modulate.a = 1.0
	_xp_float.position.y = 76
	var tw := create_tween().set_parallel()
	tw.tween_property(_xp_float, "position:y", 62.0, 1.2)
	tw.tween_property(_xp_float, "modulate:a", 0.0, 1.2).set_delay(0.5)

func _refresh_objective() -> void:
	var id: String = Missions.tracked
	if id == "":
		_obj_title.text = "All objectives complete"
		_obj_progress.text = ""
		_obj_desc.text = "Keep exploring — Afterlight still has secrets."
		return
	var m: Dictionary = GameDB.MISSIONS[id]
	var p := Missions.progress(id)
	_obj_title.text = m.name
	_obj_progress.text = "%d/%d" % [p.x, p.y] if p.y > 1 else ""
	var hint: String = m.desc
	if id == "m_spark" and Inventory.fragments >= GameDB.FRAGMENTS_FOR_TOWER:
		hint = "You have enough fragments! Use the Tower Core in the plaza."
	_obj_desc.text = hint

# ================================================================ TOASTS / POPUPS
func toast(text: String, col: Color = UIKit.CYAN) -> void:
	if _toasts.get_child_count() >= 3:
		_toasts.get_child(0).queue_free()
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UIKit.box(Color(0.04, 0.05, 0.12, 0.88), 14, Color(col.r, col.g, col.b, 0.55), 1, 16))
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var l := UIKit.label(text, 20, col.lerp(Color.WHITE, 0.35), UIKit.font_bold)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	p.add_child(l)
	_toasts.add_child(p)
	p.modulate.a = 0.0
	var tw := p.create_tween()
	tw.tween_property(p, "modulate:a", 1.0, 0.2)
	tw.tween_interval(2.8)
	tw.tween_property(p, "modulate:a", 0.0, 0.4)
	tw.tween_callback(p.queue_free)

func _on_item(id: String, is_new: bool) -> void:
	var def := GameDB.item(id)
	if def.category == "note":
		return
	if not is_new:
		toast("%s  (duplicate)" % def.name, UIKit.TEXT_DIM)
		return
	if def.rarity >= GameDB.Rarity.RARE:
		_queue_popup({"type": "item", "id": id})
	else:
		Audio.play("pickup", -4.0)
		toast("Found: %s  ·  %s" % [def.name, GameDB.rarity_name(def.rarity)], GameDB.rarity_color(def.rarity))

func _on_location(id: String) -> void:
	var def: Dictionary = GameDB.LOCATIONS[id]
	if def.hidden:
		Audio.play("discover_rare", -6.0)
		_show_banner("SECRET DISCOVERED", def.name, "", UIKit.WARN)
	else:
		toast("Discovered: " + def.name, UIKit.CYAN)

func _on_mission_completed(id: String) -> void:
	var m: Dictionary = GameDB.MISSIONS[id]
	Audio.play("success", -4.0)
	var rew := "+%d XP" % int(m.xp)
	if int(m.fragments) > 0:
		rew += "  ·  +%d Fragments" % int(m.fragments)
	toast("Mission complete: %s   %s" % [m.name, rew], UIKit.GOOD)

func _on_achievement(id: String) -> void:
	toast("Achievement: " + GameDB.ACHIEVEMENTS[id].name, UIKit.WARN)

func _on_level_up(lvl: int) -> void:
	_refresh_status()
	_queue_popup({"type": "level", "level": lvl})

func _queue_popup(p: Dictionary) -> void:
	_popup_queue.append(p)
	if not _popup_busy:
		_next_popup()

func _next_popup() -> void:
	if _popup_queue.is_empty():
		_popup_busy = false
		return
	_popup_busy = true
	# never cover an open menu: wait until the player closes it
	while has_open_panel():
		await get_tree().create_timer(0.3, true).timeout
	var p: Dictionary = _popup_queue.pop_front()
	var pop := DiscoveryPopup.new()
	pop.info = p
	root.add_child(pop)
	await pop.finished
	_next_popup()

func _show_banner(top: String, main: String, sub: String, col := UIKit.CYAN) -> void:
	for c in _banner.get_children():
		c.queue_free()
	var t := UIKit.label(top, 22, col, UIKit.font_bold)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner.add_child(t)
	var m := UIKit.title(main, 54)
	m.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner.add_child(m)
	if sub != "":
		var s := UIKit.label(sub, 22, UIKit.TEXT_DIM, UIKit.font_med)
		s.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_banner.add_child(s)
	var tw := create_tween()
	tw.tween_property(_banner, "modulate:a", 1.0, 0.4)
	tw.tween_interval(2.2)
	tw.tween_property(_banner, "modulate:a", 0.0, 0.7)

func show_floor_banner(label: String, name_: String, sub: String) -> void:
	_show_banner("FLOOR " + label if label != "APT" else "APARTMENT", name_, sub)

func show_intro() -> void:
	await get_tree().create_timer(1.0).timeout
	_show_banner("AFTERLIGHT CITY", "Explore the Unknown", "The city is dark. Find what's left of the light.")
	await get_tree().create_timer(3.6).timeout
	if Settings.use_touch_controls():
		toast("Left thumb: move  ·  Right thumb: look  ·  Push the stick to the edge to run", UIKit.TEXT)
	else:
		toast("WASD move · Mouse look · Shift run · Space jump · E interact", UIKit.TEXT)
	await get_tree().create_timer(3.4).timeout
	toast("Collect Energy Fragments (blue crystals) to power the Tower.", UIKit.CYAN)

func _on_prompt(text: String) -> void:
	if Settings.use_touch_controls() or text == "":
		_prompt.visible = false
		return
	_prompt.visible = true
	_prompt_lbl.text = "[E]  " + text.to_upper()

func _on_challenge(text: String) -> void:
	_challenge.visible = text != ""
	_challenge_lbl.text = text

# ================================================================ PANELS
func open_panel(name_: String, data := {}) -> void:
	if not PANELS.has(name_):
		return
	if _open_panel != null:
		if name_ == "settings" or name_ == "profile" or name_ == "collection" or name_ == "inventory" or name_ == "missions" or name_ == "map":
			_open_panel.queue_free()   # switch directly between menus
			_open_panel = null
		else:
			return
	var p: BasePanel = PANELS[name_].new()
	p.data = data
	p.set("hud", self)
	_open_panel = p
	panel_layer.add_child(p)
	p.closed.connect(_on_panel_closed.bind(p))
	touch.release_all()
	_set_paused(true)

func _on_panel_closed(p: BasePanel) -> void:
	if _open_panel == p:
		_open_panel = null
		_set_paused(false)

func has_open_panel() -> bool:
	return _open_panel != null

func toggle_pause() -> void:
	if _open_panel != null:
		_open_panel.close()
	else:
		open_panel("pause")

func _set_paused(v: bool) -> void:
	get_tree().paused = v
	if game:
		game.call("on_pause_changed", v)
