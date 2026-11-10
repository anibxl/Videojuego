extends BasePanel
## Missions: active and completed, with progress, rewards and tracking.

var _tab := 0
const TYPE_COLORS := {"main": Color(1.0, 0.75, 0.3), "side": Color(0.42, 0.96, 1.0), "exploration": Color(0.4, 1.0, 0.65), "collection": Color(0.75, 0.5, 1.0)}

func _init() -> void:
	super()
	title_text = "Missions"
	subtitle_text = "Tap a mission to track it on screen"

func build(c: VBoxContainer) -> void:
	var active := Missions.active_missions()
	var done := []
	for id in GameDB.MISSION_ORDER:
		if Missions.is_completed(id):
			done.append(id)
	tabs(c, ["Active (%d)" % active.size(), "Completed (%d)" % done.size()], _tab, func(i): _tab = i; rebuild())
	var list := scroll_area(c)
	var ids: Array = active if _tab == 0 else done
	if ids.is_empty():
		list.add_child(UIKit.wrap_label("Nothing here yet." if _tab == 1 else "Every available mission is complete. New ones appear as you progress.", 20))
	for id in ids:
		list.add_child(_card(id))
	if _tab == 0:
		var locked := 0
		for id in GameDB.MISSION_ORDER:
			if not Missions.is_completed(id) and not Missions.is_available(id):
				locked += 1
		if locked > 0:
			list.add_child(UIKit.label("+ %d more missions unlock as you progress" % locked, 18, UIKit.TEXT_DIM, UIKit.font_med))

func _card(id: String) -> Control:
	var m: Dictionary = GameDB.MISSIONS[id]
	var col: Color = TYPE_COLORS.get(m.type, UIKit.CYAN)
	var tracked: bool = Missions.tracked == id
	var done := Missions.is_completed(id)
	var b := Button.new()
	b.focus_mode = Control.FOCUS_NONE
	var bg := Color(0.09, 0.09, 0.2, 0.95) if not tracked else Color(0.16, 0.13, 0.36, 1.0)
	b.add_theme_stylebox_override("normal", UIKit.box(bg, 16, Color(col.r, col.g, col.b, 0.7 if tracked else 0.25), 2 if tracked else 1, 16))
	b.add_theme_stylebox_override("hover", UIKit.box(bg.lightened(0.05), 16, Color(col.r, col.g, col.b, 0.6), 1, 16))
	b.add_theme_stylebox_override("pressed", UIKit.box(bg.lightened(0.1), 16, col, 2, 16))
	if not done:
		b.pressed.connect(func(): Missions.set_tracked(id); Audio.ui_click(); rebuild())
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.offset_left = 18; v.offset_right = -18; v.offset_top = 12; v.offset_bottom = -12
	b.add_child(v)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 10)
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(top)
	top.add_child(UIKit.chip(m.type, col, 14))
	var n := UIKit.label(m.name, 24, Color.WHITE, UIKit.font_bold)
	n.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(n)
	if tracked:
		top.add_child(UIKit.label("TRACKING", 15, col, UIKit.font_bold))
	if done:
		var ck := IconDraw.new()
		ck.icon = "check"
		ck.color = UIKit.GOOD
		ck.custom_minimum_size = Vector2(26, 26)
		top.add_child(ck)
	var d := UIKit.wrap_label(m.desc, 18)
	d.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(d)
	var p := Missions.progress(id)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(row)
	var bar := UIKit.progress_bar(float(p.x) / maxf(1.0, p.y), col, 8)
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(bar)
	row.add_child(UIKit.label("%d / %d" % [p.x, p.y], 18, col, UIKit.font_bold))
	var rew := "Reward: %d XP" % int(m.xp)
	if int(m.fragments) > 0:
		rew += "  ·  %d Fragments" % int(m.fragments)
	v.add_child(UIKit.label(rew, 16, UIKit.TEXT_DIM, UIKit.font_med))
	b.custom_minimum_size = Vector2(0, 150)
	return b
