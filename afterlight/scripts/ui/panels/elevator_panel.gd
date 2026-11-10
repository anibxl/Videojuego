extends BasePanel
## The elevator's floor selector, styled as the physical brass-and-neon
## panel inside the cab. Locked floors explain exactly what they need.

func _init() -> void:
	super()
	title_text = "Central Tower Elevator"
	subtitle_text = "Select a floor"
	max_size = Vector2(820, 680)

func build(c: VBoxContainer) -> void:
	var list := scroll_area(c)
	var cur: String = WorldState.current_floor
	for f in GameDB.FLOORS:
		list.add_child(_floor_row(f, cur))

func _floor_row(f: Dictionary, cur: String) -> Control:
	var reason := WorldState.floor_lock_reason(f.id)
	var locked := reason != ""
	var here: bool = f.id == cur
	var accent := UIKit.CYAN if not locked else Color(0.4, 0.42, 0.6)
	if here:
		accent = UIKit.WARN
	var b := Button.new()
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(0, 92)
	var bg := Color(0.08, 0.08, 0.18, 0.95)
	b.add_theme_stylebox_override("normal", UIKit.box(bg, 18, Color(accent.r, accent.g, accent.b, 0.45), 1, 14))
	b.add_theme_stylebox_override("hover", UIKit.box(bg.lightened(0.06), 18, accent, 1, 14))
	b.add_theme_stylebox_override("pressed", UIKit.box(Color(0.25, 0.2, 0.55), 18, accent, 2, 14))
	b.add_theme_stylebox_override("disabled", UIKit.box(Color(0.05, 0.05, 0.1, 0.9), 18, Color(0.3, 0.3, 0.45, 0.4), 1, 14))
	b.disabled = locked or here
	b.pressed.connect(func():
		Audio.play("puzzle_ok", -6.0)
		var target: String = f.id
		close()
		if hud and hud.game:
			hud.game.travel_to(target))
	var h := HBoxContainer.new()
	h.set_anchors_preset(Control.PRESET_FULL_RECT)
	h.offset_left = 14; h.offset_right = -16
	h.add_theme_constant_override("separation", 18)
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(h)
	var btn := PanelContainer.new()
	btn.custom_minimum_size = Vector2(70, 70)
	btn.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	btn.add_theme_stylebox_override("panel", UIKit.box(Color(accent.r, accent.g, accent.b, 0.18), 35, accent, 3, 0))
	btn.mouse_filter = Control.MOUSE_FILTER_IGNORE
	h.add_child(btn)
	if locked:
		var lk := IconDraw.new()
		lk.icon = "lock"
		lk.color = accent
		lk.custom_minimum_size = Vector2(30, 30)
		lk.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		lk.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		btn.add_child(lk)
	else:
		var l := UIKit.label(f.label, 30 if f.label.length() < 3 else 22, accent.lerp(Color.WHITE, 0.3), UIKit.font_bold)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		btn.add_child(l)
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 0)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	h.add_child(v)
	var name_txt: String = ("FLOOR %s · " % f.label if f.label != "APT" else "") + f.name
	v.add_child(UIKit.label(name_txt, 24, Color.WHITE if not locked else UIKit.TEXT_DIM, UIKit.font_bold))
	var sub := UIKit.label("YOU ARE HERE" if here else (("LOCKED — " + reason) if locked else f.subtitle), 17, UIKit.WARN if here else (UIKit.BAD.lightened(0.3) if locked else UIKit.TEXT_DIM), UIKit.font_semi)
	sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(sub)
	return b
