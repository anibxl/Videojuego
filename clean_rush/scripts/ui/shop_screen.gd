class_name ShopScreen
extends Control
## Equipment shop + upgrade screen. Buy tools and gear, and upgrade each tool's
## power, range, width and capacity, showing current vs next performance.

var main
var arg
var owned_only := false
var selected := ""
var tab := "tools"
var list_box: Container
var detail: VBoxContainer
var root_v: VBoxContainer


func _ready() -> void:
	add_child(UIKit.backdrop(0.65))
	selected = String(Game.state.get("selected_tool", "rake"))
	if owned_only:
		tab = "owned"
	_rebuild()


func _rebuild() -> void:
	if root_v:
		root_v.get_parent().queue_free()
	root_v = UIKit.vbox(14)
	add_child(UIKit.fill_screen(root_v, 24))
	root_v.add_child(UIKit.header("Equipment & Upgrades" if tab == "owned" else "Shop", func(): main.goto("menu")))
	var tabs := UIKit.hbox(10)
	tabs.add_child(_tab_button("My Tools", "owned"))
	tabs.add_child(_tab_button("All Tools", "tools"))
	tabs.add_child(_tab_button("Gear", "gear"))
	root_v.add_child(tabs)
	var body := UIKit.hbox(18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_v.add_child(body)
	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	body.add_child(scroll)
	var detail_panel := UIKit.panel(Color(UIKit.BLUE, 0.94), 24)
	detail_panel.custom_minimum_size.x = 470
	body.add_child(detail_panel)
	detail = UIKit.vbox(10)
	detail_panel.add_child(detail)
	if tab == "gear":
		var gv := UIKit.vbox(12)
		gv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		scroll.add_child(gv)
		for g in Data.gear.keys():
			gv.add_child(_gear_row(g))
		_gear_info()
		return
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	scroll.add_child(grid)
	for t in Data.tool_order:
		if tab == "owned" and not Game.owns_tool(t):
			continue
		grid.add_child(_tool_card(t))
	_show_detail()


func _tab_button(text: String, id: String) -> Button:
	var b := UIKit.button(text, UIKit.ORANGE if tab == id else UIKit.BLUE2, Vector2(170, 56), 22, func():
		tab = id
		_rebuild())
	return b


func _tool_card(t: String) -> Control:
	var d := Data.tool_def(t)
	var owned := Game.owns_tool(t)
	var col := Data.arr_color(d.get("color", [0.2, 0.6, 0.9]))
	var b := UIKit.button("", col.darkened(0.35) if t != selected else UIKit.GOLD.darkened(0.15), Vector2(200, 170), 17, func():
		selected = t
		_rebuild())
	var v := UIKit.vbox(4)
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(v)
	var ic := UIKit.icon_rect(Data.tool_icon(t), 76)
	ic.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(ic)
	var n := UIKit.label(String(d.get("name", t)), 17, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER)
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(n)
	var status: Label
	if owned:
		status = UIKit.label("Owned" + (" • Equipped" if t == Game.state["selected_tool"] else ""), 15, UIKit.GREEN, HORIZONTAL_ALIGNMENT_CENTER)
	else:
		status = UIKit.label("%s coins" % UIKit.fmt(int(d.get("price", 0))), 16, UIKit.GOLD, HORIZONTAL_ALIGNMENT_CENTER)
	status.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_child(status)
	return b


func _stat_line(name: String, cur: float, nxt: float, fmt := "%.1f") -> HBoxContainer:
	var h := UIKit.hbox(8)
	var l := UIKit.label(name, 19, Color(1, 1, 1, 0.85))
	l.custom_minimum_size.x = 110
	h.add_child(l)
	h.add_child(UIKit.label(fmt % cur, 19, UIKit.WHITE))
	if nxt > cur + 0.0001:
		h.add_child(UIKit.label("→ " + fmt % nxt, 19, UIKit.GREEN))
	return h


func _show_detail() -> void:
	for c in detail.get_children():
		c.queue_free()
	var t := selected
	var d := Data.tool_def(t)
	if d.is_empty():
		return
	var top := UIKit.hbox(12)
	top.add_child(UIKit.icon_rect(Data.tool_icon(t), 84))
	var tv := UIKit.vbox(2)
	tv.add_child(UIKit.label(String(d.get("name", t)), 28, UIKit.WHITE))
	tv.add_child(UIKit.label(String(d.get("category", "")).capitalize() + " tool", 16, UIKit.TURQ))
	top.add_child(tv)
	detail.add_child(top)
	detail.add_child(UIKit.wrap_label(String(d.get("description", "")), 17, Color(1, 1, 1, 0.85), 420))
	# What it cleans.
	var cleans := []
	var types: Dictionary = d.get("surface", {}).get("types", {})
	for k in types.keys():
		if float(types[k]) >= 0.8:
			cleans.append(String(Data.dirt_def(k).get("name", k)))
	for k in d.get("debris", {}).get("kinds", []):
		cleans.append({"leaf": "Leaves", "trash": "Rubbish", "floating": "Floating debris"}.get(k, k))
	if not cleans.is_empty():
		detail.add_child(UIKit.wrap_label("Best on: " + ", ".join(cleans), 16, UIKit.GOLD, 420))
	var owned := Game.owns_tool(t)
	if not owned:
		var price := int(d.get("price", 0))
		var buy := UIKit.button("Buy  %s" % UIKit.fmt(price), UIKit.GREEN.darkened(0.1), Vector2(420, 72), 26, func():
			if Game.buy_tool(t):
				Audio.play("purchase")
				main.show_toast("%s purchased!" % d.get("name", t), "good")
				_rebuild()
			else:
				Audio.play("error")
				main.show_toast("Not enough coins", "warn"))
		buy.disabled = Game.coins() < price
		detail.add_child(buy)
		_stats_preview(t, false)
		return
	if Game.state["selected_tool"] != t:
		detail.add_child(UIKit.button("Equip", UIKit.TURQ.darkened(0.1), Vector2(420, 60), 22, func():
			Game.state["selected_tool"] = t
			Game.queue_save()
			_rebuild()))
	detail.add_child(UIKit.label("Upgrades", 24, UIKit.WHITE))
	_stats_preview(t, true)


func _stats_preview(t: String, with_buttons: bool) -> void:
	var d := Data.tool_def(t)
	var section := "surface" if d.has("surface") else "debris"
	for stat in d.get("upgrades", []):
		var lvl := Game.upgrade_level(t, stat)
		var mx := Game.upgrade_max(stat)
		var row := UIKit.panel(Color(0, 0, 0, 0.28), 16)
		var h := UIKit.hbox(10)
		row.add_child(h)
		var info := UIKit.vbox(2)
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(info)
		var name: String = Data.upgrade_effects.get(stat, {}).get("name", stat)
		var lv := UIKit.hbox(4)
		lv.add_child(UIKit.label("%s  Lv %d/%d" % [name, lvl + 1, mx + 1], 18, UIKit.WHITE))
		info.add_child(lv)
		var cur := 0.0
		var nxt := 0.0
		match stat:
			"capacity":
				cur = Game.tool_capacity(t)
				nxt = Game.tool_capacity(t, mini(lvl + 1, mx))
				info.add_child(_stat_line("Holds", cur, nxt, "%d"))
			"range":
				var key := "range" if section == "surface" else "reach"
				cur = Game.tool_param(t, section, key)
				nxt = Game.tool_param(t, section, key, mini(lvl + 1, mx))
				info.add_child(_stat_line("Reach (m)", cur, nxt))
			"radius":
				cur = Game.tool_param(t, section, "radius")
				nxt = Game.tool_param(t, section, "radius", mini(lvl + 1, mx))
				info.add_child(_stat_line("Width (m)", cur * 2.0, nxt * 2.0))
			_:
				cur = Game.tool_param(t, section, "power")
				nxt = Game.tool_param(t, section, "power", mini(lvl + 1, mx))
				info.add_child(_stat_line("Power", cur, nxt))
		var pips := UIKit.hbox(4)
		for i in mx + 1:
			var pip := ColorRect.new()
			pip.custom_minimum_size = Vector2(26, 8)
			pip.color = UIKit.GREEN if i <= lvl else Color(1, 1, 1, 0.2)
			pips.add_child(pip)
		info.add_child(pips)
		if with_buttons:
			if lvl >= mx:
				h.add_child(UIKit.label("MAX", 22, UIKit.GOLD))
			else:
				var cost := Game.upgrade_cost(t, stat)
				var st: String = stat
				var b := UIKit.button(UIKit.fmt(cost), UIKit.ORANGE, Vector2(130, 60), 20, func():
					if Game.buy_upgrade(t, st):
						Audio.play("purchase")
						main.show_toast("%s upgraded!" % name, "good")
						_rebuild()
					else:
						Audio.play("error"))
				b.icon = Data.ui_icon("coin")
				b.expand_icon = true
				b.add_theme_constant_override("icon_max_width", 26)
				b.disabled = Game.coins() < cost
				h.add_child(b)
		detail.add_child(row)


func _gear_row(g: String) -> Control:
	var d: Dictionary = Data.gear[g]
	var lvl := Game.gear_level(g)
	var mx := int(d.get("max", 3))
	var p := UIKit.panel(Color(UIKit.BLUE, 0.92), 20)
	var h := UIKit.hbox(14)
	p.add_child(h)
	h.add_child(UIKit.icon_rect(Data.ui_icon("gear_" + g), 72))
	var v := UIKit.vbox(4)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(v)
	v.add_child(UIKit.label("%s  (Lv %d/%d)" % [d.get("name", g), lvl, mx], 24, UIKit.WHITE))
	v.add_child(UIKit.wrap_label(String(d.get("description", "")), 17, Color(1, 1, 1, 0.8), 300))
	var per := float(d.get("per_level", 0.1))
	var unit := "+%d%%" % int(per * 100) if g != "magnet" else "+%.1f m" % per
	v.add_child(UIKit.label("Each level: " + unit, 16, UIKit.TURQ))
	if lvl >= mx:
		h.add_child(UIKit.label("MAX", 24, UIKit.GOLD))
	else:
		var cost := Game.gear_cost(g)
		var b := UIKit.button(UIKit.fmt(cost), UIKit.ORANGE, Vector2(150, 64), 22, func():
			if Game.buy_gear(g):
				Audio.play("purchase")
				_rebuild()
			else:
				Audio.play("error"))
		b.disabled = Game.coins() < cost
		h.add_child(b)
	return p


func _gear_info() -> void:
	detail.add_child(UIKit.label("Gear", 28, UIKit.WHITE))
	detail.add_child(UIKit.wrap_label("Gear upgrades apply to every job and every tool. Running Shoes make you faster, the Treasure Magnet grabs discoveries from further away, and Big Bags let vacuums, nets and pickers hold more before emptying.", 18, Color(1, 1, 1, 0.85), 420))
	detail.add_child(UIKit.wrap_label("No real-money purchases: everything is earned by cleaning.", 16, UIKit.TURQ, 420))
