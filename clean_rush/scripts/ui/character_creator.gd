class_name CharacterCreatorScreen
extends Control
## Character creator / wardrobe. Large live 3D preview (drag to rotate, pinch or
## wheel to zoom), categories, option buttons, colour swatches, sliders,
## Randomize / Reset / Cancel / Confirm. Every change updates the real
## CharacterModel immediately; Confirm saves it to the active save slot.

var main
var arg   # {"mode": "new" | "edit", "return_to": "menu"}
var edit: Dictionary = {}
var original: Dictionary = {}
var category := "skin"
var preview: CharacterPreview
var content: VBoxContainer
var tabs: HFlowContainer
var name_edit: LineEdit
var _rng := RandomNumberGenerator.new()

const CATEGORIES := [
	["skin", "Skin"], ["hair", "Hair"], ["eyes", "Eyes"], ["face", "Face"], ["body", "Body"],
	["top", "Tops"], ["bottom", "Bottoms"], ["shoes", "Shoes"], ["hat", "Hats"], ["extras", "Extras"],
]


func _ready() -> void:
	_rng.randomize()
	original = Game.appearance()
	edit = original.duplicate()
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(UIKit.INK, 0.82)
	add_child(bg)
	var root := UIKit.hbox(18)
	add_child(UIKit.fill_screen(root, 20))
	# ---------------- Left: preview ----------------
	var left := UIKit.vbox(10)
	left.custom_minimum_size.x = 500
	root.add_child(left)
	var title := UIKit.label("Create your cleaner" if _mode() == "new" else "Wardrobe", 34, UIKit.WHITE)
	left.add_child(title)
	var pv_panel := UIKit.panel(Color(0.05, 0.16, 0.33, 0.9), 26)
	pv_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	left.add_child(pv_panel)
	preview = CharacterPreview.new()
	preview.size_flags_vertical = Control.SIZE_EXPAND_FILL
	preview.custom_minimum_size = Vector2(460, 420)
	preview.set_appearance(edit)
	pv_panel.add_child(preview)
	left.add_child(UIKit.label("Drag to rotate · pinch or wheel to zoom", 16, Color(1, 1, 1, 0.65), HORIZONTAL_ALIGNMENT_CENTER))
	var lb := UIKit.hbox(10)
	lb.alignment = BoxContainer.ALIGNMENT_CENTER
	lb.add_child(UIKit.button("Randomize", UIKit.BLUE2, Vector2(160, 60), 20, _randomize))
	lb.add_child(UIKit.button("Reset", UIKit.BLUE2, Vector2(130, 60), 20, _reset))
	lb.add_child(UIKit.button("Zoom face", UIKit.BLUE2, Vector2(150, 60), 18, func():
		preview.zoom = 0.6 if preview.zoom > 1.0 else 1.4
		preview._update_camera()))
	left.add_child(lb)
	# ---------------- Right: options ----------------
	var right := UIKit.vbox(10)
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.add_child(right)
	var nh := UIKit.hbox(10)
	nh.add_child(UIKit.label("Name", 20, UIKit.WHITE))
	name_edit = LineEdit.new()
	name_edit.text = Game.profile_name()
	name_edit.placeholder_text = "Your cleaner's name"
	name_edit.max_length = 18
	name_edit.custom_minimum_size = Vector2(300, 52)
	name_edit.add_theme_font_size_override("font_size", 22)
	name_edit.add_theme_stylebox_override("normal", UIKit.flat(Color(0, 0, 0, 0.35), 14))
	name_edit.add_theme_stylebox_override("focus", UIKit.flat(Color(0, 0, 0, 0.45), 14))
	name_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	nh.add_child(name_edit)
	var chip := UIKit.panel(Color(0, 0, 0, 0.35), 24)
	chip.add_child(UIKit.money_chip(Game.coins(), 22))
	nh.add_child(chip)
	right.add_child(nh)
	tabs = HFlowContainer.new()
	tabs.add_theme_constant_override("h_separation", 8)
	tabs.add_theme_constant_override("v_separation", 8)
	right.add_child(tabs)
	var panel := UIKit.panel(Color(UIKit.BLUE, 0.92), 22)
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_child(panel)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	panel.add_child(scroll)
	content = UIKit.vbox(10)
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(content)
	var bottom := UIKit.hbox(12)
	bottom.alignment = BoxContainer.ALIGNMENT_END
	bottom.add_child(UIKit.button("Cancel", Color(0.35, 0.4, 0.5), Vector2(180, 66), 22, _cancel))
	bottom.add_child(UIKit.button("Confirm", UIKit.GREEN.darkened(0.1), Vector2(240, 66), 26, _confirm))
	right.add_child(bottom)
	_build_tabs()
	_build_content()


func _mode() -> String:
	return String(arg.get("mode", "edit")) if typeof(arg) == TYPE_DICTIONARY else "edit"


func _build_tabs() -> void:
	for c in tabs.get_children():
		c.queue_free()
	for cat in CATEGORIES:
		var id: String = cat[0]
		tabs.add_child(UIKit.button(cat[1], UIKit.ORANGE if id == category else UIKit.BLUE2, Vector2(108, 52), 18, func():
			category = id
			_build_tabs()
			_build_content()))


func _apply() -> void:
	preview.set_appearance(edit)


# -------------------------------------------------------------- content ---

func _build_content() -> void:
	for c in content.get_children():
		c.queue_free()
	match category:
		"skin":
			_section("Skin tone")
			var tones: Array = Data.cosmetics.get("skin_tones", [])
			var cols := []
			for i in tones.size():
				cols.append([Color(tones[i]), i])
			_swatches(cols, func(v): edit["skin"] = v, int(edit["skin"]))
		"hair":
			_section("Hairstyle")
			_options("hair_style")
			_section("Hair colour")
			var hc := []
			for h in Data.cosmetics.get("hair_colors", []):
				hc.append([Color(h["color"]), h["color"]])
			_swatches(hc, func(v): edit["hair_color"] = v, edit["hair_color"])
			_section("Custom colour")
			var cur := Color(String(edit["hair_color"]))
			_slider("Hue", cur.h, 0.0, 1.0, func(v):
				var c := Color(String(edit["hair_color"]))
				edit["hair_color"] = "#" + Color.from_hsv(v, maxf(c.s, 0.45), maxf(c.v, 0.25)).to_html(false))
			_slider("Lightness", cur.v, 0.08, 0.95, func(v):
				var c := Color(String(edit["hair_color"]))
				edit["hair_color"] = "#" + Color.from_hsv(c.h, c.s, v).to_html(false))
		"eyes":
			_section("Eye colour")
			var ec := []
			for e in Data.cosmetics.get("eye_colors", []):
				ec.append([Color(e["color"]), e["id"]])
			_swatches(ec, func(v): edit["eye_color"] = v, edit["eye_color"])
			_section("Eye shape")
			_options("eyes")
			_section("Eyebrows")
			_options("brows")
		"face":
			_section("Face shape")
			_options("face")
			_section("Nose")
			_options("nose")
			_section("Mouth")
			_options("mouth")
		"body":
			_section("Body type")
			_options("body")
			_section("Proportions")
			_slider("Height", float(edit["height"]), 0.92, 1.08, func(v): edit["height"] = snappedf(v, 0.01))
			_slider("Build", float(edit["build"]), 0.9, 1.12, func(v): edit["build"] = snappedf(v, 0.01))
		"top":
			_section("Tops & uniforms")
			_options("top")
			_section("Colour")
			_color_choice("top_color")
		"bottom":
			_section("Bottoms")
			_options("bottom")
			_section("Colour")
			_color_choice("bottom_color")
		"shoes":
			_section("Shoes")
			_options("shoes")
			_section("Colour")
			_color_choice("shoes_color")
		"hat":
			_section("Hats & caps")
			_options("hat")
			_section("Colour")
			_color_choice("hat_color")
		"extras":
			_section("Glasses")
			_options("glasses")
			_section("Gloves")
			_options("gloves")
			_section("Watch")
			_options("watch")


func _section(text: String) -> void:
	content.add_child(UIKit.label(text, 22, UIKit.GOLD))


func _options(field: String) -> void:
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	content.add_child(grid)
	for o in Appearance.options(field):
		var id: String = o["id"]
		var unlocked := Appearance.is_unlocked(field, id)
		var selected: bool = String(edit.get(field, "")) == id
		var rule: Dictionary = o.get("unlock", {})
		var text := String(o.get("name", id))
		if not unlocked:
			text += "\n" + ("Buy " + UIKit.fmt(int(rule["value"])) if String(rule.get("type", "")) == "coins" else Appearance.rule_text(rule))
		var col := UIKit.ORANGE if selected else (UIKit.BLUE2 if unlocked else Color(0.25, 0.3, 0.4))
		var b := UIKit.button(text, col, Vector2(190, 64 if unlocked else 78), 16, func():
			if unlocked:
				edit[field] = id
				_apply()
				_build_content()
			elif String(rule.get("type", "")) == "coins":
				if Game.buy_cosmetic(field, id):
					Audio.play("purchase")
					main.show_toast("%s unlocked!" % o.get("name", id), "good")
					edit[field] = id
					_apply()
					_build_content()
				else:
					Audio.play("error")
					main.show_toast("Not enough coins", "warn")
			else:
				Audio.play("error")
				main.show_toast("Locked: " + Appearance.rule_text(rule), "warn"))
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		if not unlocked:
			b.icon = Data.ui_icon("lock")
			b.expand_icon = true
			b.add_theme_constant_override("icon_max_width", 22)
		grid.add_child(b)


func _swatches(list: Array, setter: Callable, current) -> void:
	var flow := HFlowContainer.new()
	flow.add_theme_constant_override("h_separation", 8)
	flow.add_theme_constant_override("v_separation", 8)
	content.add_child(flow)
	for entry in list:
		var c: Color = entry[0]
		var v = entry[1]
		var b := Button.new()
		b.custom_minimum_size = Vector2(58, 58)
		b.focus_mode = Control.FOCUS_NONE
		var sel: bool = typeof(current) == typeof(v) and current == v
		var sb := UIKit.flat(c, 29, 0)
		sb.border_color = UIKit.GOLD if sel else Color(1, 1, 1, 0.5)
		sb.set_border_width_all(5 if sel else 2)
		for st in ["normal", "hover", "pressed"]:
			b.add_theme_stylebox_override(st, sb)
		b.pressed.connect(func():
			Audio.play("ui_click", -4.0)
			setter.call(v)
			_apply()
			_build_content())
		flow.add_child(b)


func _color_choice(field: String) -> void:
	var cols := []
	for h in Data.cosmetics.get("outfit_colors", []):
		cols.append([Color(h), h])
	_swatches(cols, func(v): edit[field] = v, edit[field])


func _slider(label: String, value: float, lo: float, hi: float, setter: Callable) -> void:
	var h := UIKit.hbox(12)
	var l := UIKit.label(label, 19, UIKit.WHITE)
	l.custom_minimum_size.x = 130
	h.add_child(l)
	var s := HSlider.new()
	s.min_value = lo
	s.max_value = hi
	s.step = 0.005
	s.value = value
	s.custom_minimum_size = Vector2(300, 44)
	s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	s.value_changed.connect(func(v):
		setter.call(v)
		_apply())
	h.add_child(s)
	content.add_child(h)


# -------------------------------------------------------------- actions ---

func _randomize() -> void:
	edit = Appearance.randomized(_rng)
	_apply()
	_build_content()


func _reset() -> void:
	edit = Appearance.defaults() if _mode() == "new" else original.duplicate()
	_apply()
	_build_content()


func _cancel() -> void:
	Audio.play("ui_back")
	main.goto(String(arg.get("return_to", "menu")) if typeof(arg) == TYPE_DICTIONARY else "menu")


func _confirm() -> void:
	var nm := name_edit.text.strip_edges()
	if nm != "":
		Game.state["profile_name"] = nm
	Game.set_appearance(edit)   # saves the slot immediately
	Audio.play("purchase")
	main.show_toast("Appearance saved", "good")
	main.goto(String(arg.get("return_to", "menu")) if typeof(arg) == TYPE_DICTIONARY else "menu")
