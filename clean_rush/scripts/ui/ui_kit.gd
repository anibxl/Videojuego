class_name UIKit
extends RefCounted
## CLEAN RUSH UI toolkit: theme, rounded panels, chunky touch-friendly buttons,
## progress bars, labels and small layout helpers. Everything is code-built.

const BLUE := Color("0b2e66")
const BLUE2 := Color("1550b8")
const TURQ := Color("1fc8c8")
const GREEN := Color("5bd66b")
const ORANGE := Color("ff8c2a")
const GOLD := Color("ffc93c")
const WHITE := Color("ffffff")
const INK := Color("0a1e3c")
const RED := Color("ff5a5a")
const GREY := Color("8a97ab")

static var _theme: Theme


static func theme() -> Theme:
	if _theme:
		return _theme
	var t := Theme.new()
	t.default_font_size = 22
	if ResourceLoader.exists("res://assets/fonts/DejaVuSans-Bold.ttf"):
		t.default_font = load("res://assets/fonts/DejaVuSans-Bold.ttf")
	t.set_color("font_color", "Label", WHITE)
	t.set_color("font_outline_color", "Label", Color(0, 0, 0, 0.35))
	t.set_constant("outline_size", "Label", 4)
	t.set_color("font_color", "Button", WHITE)
	t.set_color("font_hover_color", "Button", WHITE)
	t.set_color("font_pressed_color", "Button", WHITE)
	t.set_color("font_disabled_color", "Button", Color(1, 1, 1, 0.5))
	t.set_color("font_outline_color", "Button", Color(0, 0, 0, 0.3))
	t.set_constant("outline_size", "Button", 4)
	t.set_font_size("font_size", "Button", 24)
	t.set_stylebox("panel", "PanelContainer", panel_style(Color(BLUE, 0.92)))
	var sb_bg := flat(Color(0, 0, 0, 0.35), 12)
	var sb_fill := flat(GREEN, 12)
	t.set_stylebox("background", "ProgressBar", sb_bg)
	t.set_stylebox("fill", "ProgressBar", sb_fill)
	t.set_stylebox("slider", "HSlider", flat(Color(0, 0, 0, 0.35), 8, 6))
	t.set_stylebox("grabber_area", "HSlider", flat(TURQ, 8, 6))
	t.set_stylebox("grabber_area_highlight", "HSlider", flat(TURQ, 8, 6))
	t.set_icon("grabber", "HSlider", _circle_icon(28, WHITE))
	t.set_icon("grabber_highlight", "HSlider", _circle_icon(30, WHITE))
	t.set_stylebox("panel", "ScrollContainer", StyleBoxEmpty.new())
	var sbv := flat(Color(1, 1, 1, 0.12), 6)
	t.set_stylebox("scroll", "VScrollBar", sbv)
	t.set_stylebox("grabber", "VScrollBar", flat(Color(1, 1, 1, 0.5), 6))
	t.set_stylebox("scroll", "HScrollBar", sbv)
	t.set_stylebox("grabber", "HScrollBar", flat(Color(1, 1, 1, 0.5), 6))
	_theme = t
	return t


static func _circle_icon(s: int, c: Color) -> ImageTexture:
	var img := Image.create(s, s, false, Image.FORMAT_RGBA8)
	for y in s:
		for x in s:
			var d := Vector2(x - s / 2.0 + 0.5, y - s / 2.0 + 0.5).length()
			img.set_pixel(x, y, Color(c, clampf(s / 2.0 - d, 0.0, 1.0)))
	return ImageTexture.create_from_image(img)


static func flat(c: Color, radius := 18, margin := 12) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = c
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = margin
	sb.content_margin_right = margin
	sb.content_margin_top = margin * 0.6
	sb.content_margin_bottom = margin * 0.6
	sb.anti_aliasing = true
	return sb


static func panel_style(c: Color, radius := 24, border := Color(1, 1, 1, 0.12)) -> StyleBoxFlat:
	var sb := flat(c, radius, 20)
	sb.border_color = border
	sb.set_border_width_all(2)
	sb.shadow_color = Color(0, 0, 0, 0.25)
	sb.shadow_size = 8
	sb.shadow_offset = Vector2(0, 4)
	return sb


static func button_styles(btn: Button, c: Color, radius := 20) -> void:
	var normal := flat(c, radius, 18)
	normal.border_color = c.darkened(0.3)
	normal.border_width_bottom = 6
	normal.shadow_color = Color(0, 0, 0, 0.2)
	normal.shadow_size = 4
	normal.shadow_offset = Vector2(0, 3)
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = c.lightened(0.1)
	var pressed := normal.duplicate() as StyleBoxFlat
	pressed.bg_color = c.darkened(0.08)
	pressed.border_width_bottom = 2
	pressed.content_margin_top += 4
	var disabled := normal.duplicate() as StyleBoxFlat
	disabled.bg_color = c.lerp(GREY, 0.7).darkened(0.2)
	disabled.border_color = disabled.bg_color.darkened(0.3)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("disabled", disabled)
	btn.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


static func button(text: String, c: Color = TURQ, min_size := Vector2(200, 72), font_size := 26, cb: Callable = Callable()) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = min_size
	b.add_theme_font_size_override("font_size", font_size)
	b.focus_mode = Control.FOCUS_NONE
	button_styles(b, c)
	b.pressed.connect(func(): Audio.play("ui_click", -2.0))
	if cb.is_valid():
		b.pressed.connect(cb)
	_add_press_bounce(b)
	return b


static func icon_button(icon: Texture2D, c: Color, size := 72, cb: Callable = Callable(), text := "") -> Button:
	var b := button(text, c, Vector2(size, size), 22, cb)
	b.icon = icon
	b.expand_icon = true
	b.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
	b.vertical_icon_alignment = VERTICAL_ALIGNMENT_CENTER
	b.add_theme_constant_override("icon_max_width", int(size * 0.62))
	return b


static func _add_press_bounce(b: Button) -> void:
	b.button_down.connect(func():
		b.pivot_offset = b.size / 2
		var tw := b.create_tween()
		tw.tween_property(b, "scale", Vector2(0.94, 0.94), 0.06))
	b.button_up.connect(func():
		var tw := b.create_tween()
		tw.tween_property(b, "scale", Vector2.ONE, 0.12).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT))


static func label(text: String, size := 22, color := WHITE, align := HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.horizontal_alignment = align
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return l


static func wrap_label(text: String, size := 20, color := WHITE, min_width := 200.0) -> Label:
	var l := label(text, size, color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size.x = min_width
	return l


static func panel(c: Color = Color(BLUE, 0.92), radius := 24) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", panel_style(c, radius))
	return p


static func progress(value: float, fill: Color = GREEN, height := 22.0) -> ProgressBar:
	var pb := ProgressBar.new()
	pb.min_value = 0
	pb.max_value = 1
	pb.step = 0.001
	pb.value = value
	pb.show_percentage = false
	pb.custom_minimum_size.y = height
	pb.add_theme_stylebox_override("fill", flat(fill, int(height / 2)))
	pb.add_theme_stylebox_override("background", flat(Color(0, 0, 0, 0.35), int(height / 2)))
	return pb


static func icon_rect(tex: Texture2D, size := 48.0) -> TextureRect:
	var r := TextureRect.new()
	r.texture = tex
	r.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	r.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	r.custom_minimum_size = Vector2(size, size)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return r


static func hbox(sep := 12) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", sep)
	return h


static func vbox(sep := 12) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", sep)
	return v


static func spacer(expand := true) -> Control:
	var c := Control.new()
	if expand:
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		c.size_flags_vertical = Control.SIZE_EXPAND_FILL
	return c


static func stars_row(count: int, size := 34.0, max_stars := 3) -> HBoxContainer:
	var h := hbox(2)
	for i in max_stars:
		var r := icon_rect(Data.ui_icon("star" if i < count else "star_empty"), size)
		h.add_child(r)
	return h


static func money_chip(value: int, size := 24) -> HBoxContainer:
	var h := hbox(6)
	h.add_child(icon_rect(Data.ui_icon("coin"), size * 1.3))
	h.add_child(label(fmt(value), size, GOLD))
	return h


static func fmt(n: int) -> String:
	var s := str(absi(n))
	var out := ""
	while s.length() > 3:
		out = "," + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return ("-" if n < 0 else "") + s + out


static func time_str(sec: float) -> String:
	var s := int(round(sec))
	return "%d:%02d" % [s / 60, s % 60]


## Full-screen dark backdrop with a gradient for menus.
static func backdrop(alpha := 0.55) -> ColorRect:
	var r := ColorRect.new()
	r.color = Color(INK, alpha)
	r.set_anchors_preset(Control.PRESET_FULL_RECT)
	return r


## Standard screen header: back button, title and the player's coins.
static func header(title: String, on_back: Callable) -> HBoxContainer:
	var h := hbox(16)
	h.add_child(icon_button(Data.ui_icon("back"), BLUE2, 68, on_back))
	var t := label(title, 40, WHITE)
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(t)
	var chip := panel(Color(0, 0, 0, 0.35), 30)
	chip.add_child(money_chip(Game.coins(), 26))
	h.add_child(chip)
	return h


static func fill_screen(c: Control, margin := 24) -> MarginContainer:
	var m := MarginContainer.new()
	m.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		m.add_theme_constant_override("margin_" + side, margin)
	m.add_child(c)
	return m
