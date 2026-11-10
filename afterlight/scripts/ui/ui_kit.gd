class_name UIKit
extends RefCounted
## Shared visual identity: palette, fonts, theme and widget factories.
## Every screen is built from these so the UI stays consistent.

const BG := Color(0.027, 0.031, 0.075)
const NAVY := Color(0.055, 0.067, 0.149)
const PANEL := Color(0.07, 0.075, 0.17, 0.94)
const PANEL_LIGHT := Color(0.12, 0.12, 0.26, 0.95)
const PURPLE := Color(0.36, 0.24, 0.85)
const BLUE := Color(0.18, 0.45, 1.0)
const CYAN := Color(0.42, 0.96, 1.0)
const TEXT := Color(0.93, 0.95, 1.0)
const TEXT_DIM := Color(0.62, 0.66, 0.82)
const GOOD := Color(0.4, 1.0, 0.65)
const WARN := Color(1.0, 0.75, 0.3)
const BAD := Color(1.0, 0.4, 0.45)

static var _theme: Theme
static var font_bold: Font
static var font_semi: Font
static var font_med: Font

static func _load_fonts() -> void:
	if font_bold != null:
		return
	font_bold = load("res://assets/fonts/Rajdhani-Bold.ttf")
	font_semi = load("res://assets/fonts/Rajdhani-SemiBold.ttf")
	font_med = load("res://assets/fonts/Rajdhani-Medium.ttf")
	for f in [font_bold, font_semi, font_med]:
		if f is FontFile:
			f.antialiasing = TextServer.FONT_ANTIALIASING_GRAY
			f.hinting = TextServer.HINTING_LIGHT
			f.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_AUTO

static func box(bg: Color, radius := 14, border := Color(0, 0, 0, 0), border_w := 0, pad := 12.0) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(radius)
	if border_w > 0:
		s.border_color = border
		s.set_border_width_all(border_w)
	s.content_margin_left = pad
	s.content_margin_right = pad
	s.content_margin_top = pad * 0.6
	s.content_margin_bottom = pad * 0.6
	s.anti_aliasing = true
	return s

static func theme() -> Theme:
	if _theme != null:
		return _theme
	_load_fonts()
	var t := Theme.new()
	t.default_font = font_semi
	t.default_font_size = 22
	t.set_color("font_color", "Label", TEXT)
	# Buttons
	t.set_stylebox("normal", "Button", box(Color(0.11, 0.12, 0.27, 0.92), 12, Color(0.35, 0.4, 0.8, 0.5), 1, 16))
	t.set_stylebox("hover", "Button", box(Color(0.16, 0.17, 0.38, 0.95), 12, CYAN * Color(1, 1, 1, 0.7), 1, 16))
	t.set_stylebox("pressed", "Button", box(Color(0.25, 0.2, 0.6, 1.0), 12, CYAN, 2, 16))
	t.set_stylebox("focus", "Button", box(Color(0, 0, 0, 0), 12, CYAN * Color(1, 1, 1, 0.5), 1, 16))
	t.set_stylebox("disabled", "Button", box(Color(0.08, 0.08, 0.15, 0.8), 12, Color(0.2, 0.2, 0.3, 0.5), 1, 16))
	t.set_color("font_color", "Button", TEXT)
	t.set_color("font_hover_color", "Button", Color.WHITE)
	t.set_color("font_pressed_color", "Button", Color.WHITE)
	t.set_color("font_disabled_color", "Button", Color(0.45, 0.47, 0.6))
	t.set_font("font", "Button", font_bold)
	t.set_font_size("font_size", "Button", 22)
	# Panels
	t.set_stylebox("panel", "PanelContainer", box(PANEL, 20, Color(0.4, 0.45, 1.0, 0.25), 1, 20))
	t.set_stylebox("panel", "Panel", box(PANEL, 20, Color(0.4, 0.45, 1.0, 0.25), 1, 20))
	# Sliders
	var track := box(Color(0.15, 0.16, 0.32), 6, Color(), 0, 0)
	track.content_margin_top = 4
	track.content_margin_bottom = 4
	t.set_stylebox("slider", "HSlider", track)
	var fill := box(CYAN * Color(1, 1, 1, 0.85), 6, Color(), 0, 0)
	fill.content_margin_top = 4
	fill.content_margin_bottom = 4
	t.set_stylebox("grabber_area", "HSlider", fill)
	t.set_stylebox("grabber_area_highlight", "HSlider", fill)
	t.set_icon("grabber", "HSlider", _circle_tex(28, Color.WHITE))
	t.set_icon("grabber_highlight", "HSlider", _circle_tex(28, CYAN))
	# Scroll bars (thin)
	var sb := box(Color(1, 1, 1, 0.05), 4, Color(), 0, 0)
	var grab := box(Color(0.5, 0.6, 1.0, 0.4), 4, Color(), 0, 0)
	for o in ["VScrollBar", "HScrollBar"]:
		t.set_stylebox("scroll", o, sb)
		t.set_stylebox("grabber", o, grab)
		t.set_stylebox("grabber_highlight", o, grab)
		t.set_stylebox("grabber_pressed", o, grab)
	# Check buttons
	t.set_color("font_color", "CheckButton", TEXT)
	t.set_font_size("font_size", "CheckButton", 22)
	# Option button popup
	t.set_stylebox("panel", "PopupMenu", box(PANEL_LIGHT, 10, CYAN * Color(1, 1, 1, 0.3), 1, 10))
	t.set_font_size("font_size", "PopupMenu", 22)
	t.set_stylebox("panel", "TooltipPanel", box(PANEL_LIGHT, 8))
	_theme = t
	return t

static func _circle_tex(size: int, col: Color) -> ImageTexture:
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	var c := (size - 1) / 2.0
	for y in size:
		for x in size:
			var d := Vector2(x - c, y - c).length()
			var a := clampf(c - d + 0.5, 0.0, 1.0)
			img.set_pixel(x, y, Color(col.r, col.g, col.b, a))
	return ImageTexture.create_from_image(img)

# ------------------------------------------------------------------ factories
static func label(text: String, size := 22, col := TEXT, font: Font = null) -> Label:
	_load_fonts()
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	if font != null:
		l.add_theme_font_override("font", font)
	return l

static func title(text: String, size := 40) -> Label:
	_load_fonts()
	var l := label(text, size, TEXT, font_bold)
	return l

static func wrap_label(text: String, size := 20, col := TEXT_DIM) -> Label:
	var l := label(text, size, col, font_med)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size.x = 120
	return l

static func button(text: String, cb: Callable = Callable(), min_size := Vector2(0, 56)) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = min_size
	b.focus_mode = Control.FOCUS_NONE
	b.mouse_filter = Control.MOUSE_FILTER_STOP
	if cb.is_valid():
		b.pressed.connect(cb)
	b.pressed.connect(func(): Audio.ui_click())
	return b

static func accent_button(text: String, cb: Callable = Callable(), min_size := Vector2(0, 64)) -> Button:
	var b := button(text, cb, min_size)
	b.add_theme_stylebox_override("normal", box(Color(0.3, 0.22, 0.85), 14, CYAN * Color(1, 1, 1, 0.7), 2, 22))
	b.add_theme_stylebox_override("hover", box(Color(0.38, 0.3, 0.95), 14, CYAN, 2, 22))
	b.add_theme_stylebox_override("pressed", box(Color(0.2, 0.55, 0.95), 14, Color.WHITE, 2, 22))
	b.add_theme_font_size_override("font_size", 28)
	return b

static func icon_button(icon: String, cb: Callable, size := 64.0, tip := "") -> Button:
	var b := button("", cb, Vector2(size, size))
	b.tooltip_text = tip
	b.add_theme_stylebox_override("normal", box(Color(0.06, 0.07, 0.16, 0.72), int(size / 2), Color(0.5, 0.55, 1.0, 0.35), 1, 4))
	b.add_theme_stylebox_override("hover", box(Color(0.12, 0.13, 0.3, 0.85), int(size / 2), CYAN * Color(1, 1, 1, 0.7), 1, 4))
	b.add_theme_stylebox_override("pressed", box(Color(0.25, 0.2, 0.6, 0.95), int(size / 2), CYAN, 2, 4))
	var ic := IconDraw.new()
	ic.icon = icon
	ic.set_anchors_preset(Control.PRESET_FULL_RECT)
	ic.offset_left = size * 0.24
	ic.offset_top = size * 0.24
	ic.offset_right = -size * 0.24
	ic.offset_bottom = -size * 0.24
	ic.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(ic)
	return b

static func hsep(alpha := 0.15) -> Control:
	var c := ColorRect.new()
	c.color = Color(0.6, 0.7, 1.0, alpha)
	c.custom_minimum_size = Vector2(0, 1)
	return c

static func spacer(h := 8.0, w := 0.0) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(w, h)
	return c

static func progress_bar(ratio: float, col := CYAN, height := 8.0) -> Control:
	var bg := Panel.new()
	bg.custom_minimum_size = Vector2(60, height)
	bg.add_theme_stylebox_override("panel", box(Color(1, 1, 1, 0.08), int(height / 2), Color(), 0, 0))
	var fg := Panel.new()
	fg.add_theme_stylebox_override("panel", box(col, int(height / 2), Color(), 0, 0))
	fg.anchor_bottom = 1.0
	fg.anchor_right = clampf(ratio, 0.0, 1.0)
	bg.add_child(fg)
	return bg

static func chip(text: String, col: Color, size := 16) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", box(Color(col.r, col.g, col.b, 0.16), 8, Color(col.r, col.g, col.b, 0.6), 1, 8))
	var l := label(text.to_upper(), size, col, font_bold)
	p.add_child(l)
	p.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	return p

static func format_time(sec: float) -> String:
	var s := int(sec)
	if s >= 3600:
		return "%dh %02dm" % [s / 3600, (s % 3600) / 60]
	return "%dm %02ds" % [s / 60, s % 60]
