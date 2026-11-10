class_name ItemWidgets
extends RefCounted
## Shared item tiles and detail views used by Inventory, Collection and
## the personal room.

static func tile(id: String, known: bool, selected: bool, on_click: Callable, count := 0) -> Button:
	var def := GameDB.item(id)
	var rc := GameDB.rarity_color(def.rarity) if known else Color(0.3, 0.32, 0.5)
	var b := Button.new()
	b.custom_minimum_size = Vector2(132, 150)
	b.focus_mode = Control.FOCUS_NONE
	var bg := Color(0.09, 0.09, 0.2, 0.95) if not selected else Color(0.18, 0.15, 0.4, 1.0)
	b.add_theme_stylebox_override("normal", UIKit.box(bg, 16, Color(rc.r, rc.g, rc.b, 0.75 if selected else 0.35), 2 if selected else 1, 8))
	b.add_theme_stylebox_override("hover", UIKit.box(bg.lightened(0.06), 16, Color(rc.r, rc.g, rc.b, 0.8), 1, 8))
	b.add_theme_stylebox_override("pressed", UIKit.box(bg.lightened(0.12), 16, rc, 2, 8))
	b.pressed.connect(on_click)
	b.pressed.connect(func(): Audio.ui_click())
	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.offset_left = 8; v.offset_right = -8; v.offset_top = 10; v.offset_bottom = -8
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	b.add_child(v)
	var ic := IconDraw.new()
	ic.icon = def.shape
	ic.color = def.color
	ic.silhouette = not known
	ic.glow = known and def.rarity >= GameDB.Rarity.RARE
	ic.custom_minimum_size = Vector2(70, 70)
	ic.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(ic)
	var n := UIKit.label(def.name if known else "???", 16, UIKit.TEXT if known else UIKit.TEXT_DIM, UIKit.font_bold)
	n.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	n.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	n.custom_minimum_size.x = 110
	n.max_lines_visible = 2
	v.add_child(n)
	var r := UIKit.label(GameDB.rarity_name(def.rarity).to_upper() if known else "UNDISCOVERED", 13, rc, UIKit.font_bold)
	r.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(r)
	if count > 1:
		var c := UIKit.label("x%d" % count, 16, UIKit.CYAN, UIKit.font_bold)
		c.position = Vector2(10, 6)
		b.add_child(c)
	return b

static func detail(id: String, known: bool) -> VBoxContainer:
	var def := GameDB.item(id)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	var ic := IconDraw.new()
	ic.icon = def.shape
	ic.color = def.color
	ic.silhouette = not known
	ic.glow = known
	ic.custom_minimum_size = Vector2(140, 140)
	ic.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(ic)
	var n := UIKit.title(def.name if known else "Undiscovered", 32)
	n.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	n.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(n)
	var chips := HBoxContainer.new()
	chips.alignment = BoxContainer.ALIGNMENT_CENTER
	chips.add_theme_constant_override("separation", 8)
	v.add_child(chips)
	if known:
		chips.add_child(UIKit.chip(GameDB.rarity_name(def.rarity), GameDB.rarity_color(def.rarity)))
		chips.add_child(UIKit.chip(def.category, UIKit.TEXT_DIM))
		var fl := GameDB.floor_def(def.floor)
		chips.add_child(UIKit.chip(fl.get("name", ""), UIKit.TEXT_DIM, 14))
	var d := UIKit.wrap_label(def.desc if known else "Somewhere in %s. Keep exploring." % GameDB.floor_def(def.floor).get("name", "Afterlight"), 19, UIKit.TEXT if known else UIKit.TEXT_DIM)
	d.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(d)
	if known and Inventory.discovered.has(id):
		var dt := Time.get_datetime_string_from_unix_time(int(Inventory.discovered[id]), true)
		var when := UIKit.label("Discovered " + dt.substr(0, 16), 15, UIKit.TEXT_DIM, UIKit.font_med)
		when.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(when)
	return v

static func grid(cols := 4) -> GridContainer:
	var g := GridContainer.new()
	g.columns = cols
	g.add_theme_constant_override("h_separation", 10)
	g.add_theme_constant_override("v_separation", 10)
	return g
