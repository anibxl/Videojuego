class_name ShopScreen
extends Control
## Professional equipment inventory / shop.
## Categories: Leaf equipment · Surface cleaning · Pool cleaning · Accessories · Upgrades
## Filters: All · Owned · Available · Locked
## Left: scrollable vertical item list. Right: 3D preview, stats, upgrades,
## skins and Buy / Equip actions. Every purchase is saved immediately.

var main
var arg
var owned_only := false
var category := "leaf"
var filter := "all"
var selected := ""
var _list: VBoxContainer
var _detail: VBoxContainer
var _preview: ToolPreview
var _root: VBoxContainer

const STAT_MAX := {"power": 30.0, "range": 9.0, "radius": 3.5, "capacity": 220.0, "surface_power": 6.0}


func _ready() -> void:
	add_child(UIKit.backdrop(0.72))
	selected = String(Game.state.get("selected_tool", "leaf_blower"))
	category = String(Data.tool_def(selected).get("shop", "leaf"))
	if owned_only:
		filter = "owned"
	_rebuild()


func _rebuild() -> void:
	if _root:
		_root.get_parent().queue_free()
	_root = UIKit.vbox(12)
	add_child(UIKit.fill_screen(_root, 22))
	_root.add_child(UIKit.header("Equipment", func(): main.goto("menu")))
	# Category tabs + filters.
	var bar := UIKit.hbox(6)
	for c in Data.tools_categories():
		var cid: String = c["id"]
		var b := UIKit.button(String(c["name"]), UIKit.GOLD if cid == category else UIKit.BLUE2, Vector2(170, 50), 17, func():
			category = cid
			selected = ""
			_rebuild())
		b.custom_minimum_size = Vector2(0, 44)
		bar.add_child(b)
	bar.add_child(UIKit.spacer())
	if category not in ["accessories", "upgrades"]:
		for f in [["all", "All"], ["owned", "Owned"], ["available", "Available"], ["locked", "Locked"]]:
			var fid: String = f[0]
			var fb := UIKit.button(f[1], UIKit.GOLD if fid == filter else UIKit.BLUE2, Vector2(100, 44), 15, func():
				filter = fid
				_rebuild())
			fb.custom_minimum_size = Vector2(0, 40)
			bar.add_child(fb)
	_root.add_child(bar)
	var body := UIKit.hbox(16)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_root.add_child(body)
	var list_panel := UIKit.panel(Color(UIKit.BLUE, 0.82), 12)
	list_panel.custom_minimum_size.x = 470
	body.add_child(list_panel)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	list_panel.add_child(scroll)
	_list = UIKit.vbox(6)
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_list)
	var detail_panel := UIKit.panel(Color(UIKit.BLUE, 0.82), 12)
	detail_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(detail_panel)
	var dscroll := ScrollContainer.new()
	dscroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	detail_panel.add_child(dscroll)
	_detail = UIKit.vbox(10)
	_detail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	dscroll.add_child(_detail)
	match category:
		"accessories":
			_fill_accessories()
		"upgrades":
			_fill_tools(true)
		_:
			_fill_tools(false)


# ------------------------------------------------------------------ list ---

func _status(t: String) -> String:
	if Game.owns_tool(t):
		return "equipped" if Game.state["selected_tool"] == t else "owned"
	return "locked" if Game.tool_locked(t) else "available"


func _fill_tools(upgrades_view: bool) -> void:
	var items := []
	for t in Data.tool_order:
		var d := Data.tool_def(t)
		if upgrades_view:
			if Game.owns_tool(t) and not d.get("upgrades", []).is_empty():
				items.append(t)
			continue
		if String(d.get("shop", "leaf")) != category:
			continue
		var st := _status(t)
		if filter == "owned" and not st in ["owned", "equipped"]:
			continue
		if filter == "available" and st != "available":
			continue
		if filter == "locked" and st != "locked":
			continue
		items.append(t)
	if items.is_empty():
		_list.add_child(UIKit.wrap_label("No equipment matches this filter.", 15, UIKit.GREY, 400))
		_detail.add_child(UIKit.wrap_label("Try another category or filter.", 16, UIKit.GREY, 400))
		return
	if selected == "" or not items.has(selected):
		selected = items[0]
	for t in items:
		_list.add_child(_tool_row(t))
	_show_tool_detail(selected, upgrades_view)


func _row_base(is_sel: bool) -> Button:
	var b := Button.new()
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(0, 74)
	var sb := UIKit.flat(Color(UIKit.TURQ.darkened(0.6), 0.6) if is_sel else Color(1, 1, 1, 0.03), 10, 10)
	sb.border_color = UIKit.TURQ if is_sel else Color(1, 1, 1, 0.07)
	sb.set_border_width_all(1)
	var hover := sb.duplicate() as StyleBoxFlat
	hover.bg_color = Color(1, 1, 1, 0.07) if not is_sel else sb.bg_color
	for st in ["normal", "pressed", "focus"]:
		b.add_theme_stylebox_override(st, sb)
	b.add_theme_stylebox_override("hover", hover)
	return b


func _tool_row(t: String) -> Control:
	var d := Data.tool_def(t)
	var st := _status(t)
	var b := _row_base(t == selected)
	b.pressed.connect(func():
		Audio.play("ui_click", -8.0)
		selected = t
		_rebuild())
	var h := UIKit.hbox(12)
	h.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	h.offset_left = 10
	h.offset_right = -20
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(h)
	var ic := UIKit.icon_rect(Data.tool_icon(t), 50)
	if st == "locked":
		ic.modulate = Color(0.5, 0.5, 0.55)
	h.add_child(ic)
	var v := UIKit.vbox(2)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var nm := UIKit.label(String(d.get("name", t)), 16, UIKit.WHITE if st != "locked" else UIKit.GREY)
	nm.mouse_filter = Control.MOUSE_FILTER_IGNORE
	nm.clip_text = true
	v.add_child(nm)
	var desc := String(d.get("description", "")).split(".")[0]
	var dl := UIKit.label(desc if desc.length() < 40 else desc.substr(0, 38) + "…", 12, UIKit.GREY)
	if UIKit.regular_font():
		dl.add_theme_font_override("font", UIKit.regular_font())
	dl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	dl.clip_text = true
	v.add_child(dl)
	v.custom_minimum_size.x = 10
	h.add_child(v)
	var right := UIKit.vbox(2)
	right.alignment = BoxContainer.ALIGNMENT_CENTER
	right.mouse_filter = Control.MOUSE_FILTER_IGNORE
	match st:
		"equipped":
			right.add_child(_badge("EQUIPPED", UIKit.TURQ))
		"owned":
			right.add_child(_badge("OWNED", UIKit.GREY))
		"locked":
			right.add_child(_badge("LEVEL %d" % Game.tool_unlock_level(t), UIKit.ORANGE))
		_:
			var price := int(d.get("price", 0))
			var pc := UIKit.money_chip(price, 15)
			pc.mouse_filter = Control.MOUSE_FILTER_IGNORE
			right.add_child(pc)
	h.add_child(right)
	return b


func _badge(text: String, c: Color) -> Control:
	var p := PanelContainer.new()
	var sb := UIKit.flat(Color(c, 0.14), 6, 8)
	sb.border_color = Color(c, 0.6)
	sb.set_border_width_all(1)
	p.add_theme_stylebox_override("panel", sb)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var l := UIKit.label(text, 11, c)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_child(l)
	return p


# ---------------------------------------------------------------- detail ---

func _show_tool_detail(t: String, upgrades_view: bool) -> void:
	var d := Data.tool_def(t)
	var st := _status(t)
	var top := UIKit.hbox(14)
	_preview = ToolPreview.new()
	_preview.custom_minimum_size = Vector2(250, 200)
	_preview.tool_id = t
	top.add_child(_preview)
	var tv := UIKit.vbox(6)
	tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tv.add_child(UIKit.label(Data.category_name(String(d.get("shop", "leaf"))).to_upper(), 12, UIKit.TURQ))
	tv.add_child(UIKit.label(String(d.get("name", t)), 24, UIKit.WHITE))
	tv.add_child(UIKit.wrap_label(String(d.get("description", "")), 14, Color(1, 1, 1, 0.78), 330))
	var actions := UIKit.hbox(8)
	match st:
		"available":
			var price := int(d.get("price", 0))
			var buy := UIKit.button("Buy  ·  %s" % UIKit.fmt(price), UIKit.ORANGE, Vector2(220, 56), 18, func(): _buy(t))
			buy.disabled = Game.coins() < price
			actions.add_child(buy)
		"locked":
			actions.add_child(UIKit.label("Unlocks at player level %d (you are level %d)" % [Game.tool_unlock_level(t), Game.level()], 14, UIKit.ORANGE))
		"owned":
			actions.add_child(UIKit.button("Equip", UIKit.GREEN, Vector2(180, 56), 18, func():
				Game.state["selected_tool"] = t
				Game.save_game()
				Audio.play("purchase", -6.0)
				_rebuild()))
		"equipped":
			actions.add_child(_badge("EQUIPPED", UIKit.TURQ))
	tv.add_child(actions)
	top.add_child(tv)
	_detail.add_child(top)
	_detail.add_child(_sep())
	_detail.add_child(UIKit.label("PERFORMANCE", 12, UIKit.GREY))
	_stats(t)
	if not d.get("upgrades", []).is_empty():
		_detail.add_child(_sep())
		_detail.add_child(UIKit.label("UPGRADES" + ("" if Game.owns_tool(t) else "  (buy the tool first)"), 12, UIKit.GREY))
		_upgrades(t)
	if Game.owns_tool(t) and not upgrades_view:
		_detail.add_child(_sep())
		_detail.add_child(UIKit.label("TOOL SKIN", 12, UIKit.GREY))
		_skins_row(t)


func _sep() -> Control:
	var c := ColorRect.new()
	c.color = Color(1, 1, 1, 0.07)
	c.custom_minimum_size.y = 1
	return c


func _stat_bar(label: String, value: float, maxv: float, text: String, next_value := -1.0) -> void:
	var h := UIKit.hbox(10)
	var l := UIKit.label(label, 14, Color(1, 1, 1, 0.8))
	l.custom_minimum_size.x = 140
	h.add_child(l)
	var bar := UIKit.progress(clampf(value / maxv, 0.0, 1.0), UIKit.TURQ, 10)
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	h.add_child(bar)
	var vt := UIKit.label(text, 14, UIKit.WHITE)
	vt.custom_minimum_size.x = 90
	vt.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	h.add_child(vt)
	_detail.add_child(h)


func _stats(t: String) -> void:
	var d := Data.tool_def(t)
	if d.has("surface"):
		var p := Game.tool_param(t, "surface", "power")
		_stat_bar("Cleaning power", p, STAT_MAX["surface_power"], "%.1f" % p)
		var r := Game.tool_param(t, "surface", "range")
		_stat_bar("Cleaning range", r, STAT_MAX["range"], "%.1f m" % r)
		var w := Game.tool_param(t, "surface", "radius") * 2.0
		_stat_bar("Spray width", w, STAT_MAX["radius"], "%.1f m" % w)
		var types: Dictionary = d["surface"].get("types", {})
		var effs := types.values()
		effs.sort()
		effs.reverse()
		var top3 := 0.0
		for i in mini(3, effs.size()):
			top3 += float(effs[i])
		var eff := top3 / maxf(1.0, mini(3, effs.size()))
		_stat_bar("Efficiency", eff, 1.5, "%d%%" % int(eff * 100))
	if d.has("debris"):
		var dp := Game.tool_param(t, "debris", "power")
		_stat_bar("Airflow / pull" if d["debris"].get("mode", "") in ["push", "suck"] else "Collection rate", dp, STAT_MAX["power"], "%.0f" % dp)
		var dr := Game.tool_param(t, "debris", "reach")
		_stat_bar("Reach", dr, STAT_MAX["range"], "%.1f m" % dr)
		var cap := Game.tool_capacity(t)
		if cap > 0:
			_stat_bar("Capacity", cap, STAT_MAX["capacity"], "%d" % cap)
	var best := []
	for k in d.get("surface", {}).get("types", {}).keys():
		if float(d["surface"]["types"][k]) >= 0.9:
			best.append(String(Data.dirt_def(k).get("name", k)))
	for k in d.get("debris", {}).get("kinds", []):
		best.append({"leaf": "Leaves", "trash": "Litter", "floating": "Floating debris"}.get(k, k))
	if not best.is_empty():
		_detail.add_child(UIKit.wrap_label("Best on: " + ", ".join(best), 13, UIKit.GREY, 500))


func _upgrades(t: String) -> void:
	var d := Data.tool_def(t)
	var section := "surface" if d.has("surface") else "debris"
	for stat in d.get("upgrades", []):
		var lvl := Game.upgrade_level(t, stat)
		var mx := Game.upgrade_max(stat)
		var h := UIKit.hbox(10)
		var nm: String = Data.upgrade_effects.get(stat, {}).get("name", stat)
		var l := UIKit.label(nm, 14, UIKit.WHITE)
		l.custom_minimum_size.x = 100
		h.add_child(l)
		var pips := UIKit.hbox(3)
		for i in mx + 1:
			var pip := ColorRect.new()
			pip.custom_minimum_size = Vector2(18, 6)
			pip.color = UIKit.TURQ if i <= lvl else Color(1, 1, 1, 0.12)
			pip.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			pips.add_child(pip)
		h.add_child(pips)
		var cur := 0.0
		var nxt := 0.0
		var fmt := "%.1f"
		match stat:
			"capacity":
				cur = Game.tool_capacity(t)
				nxt = Game.tool_capacity(t, mini(lvl + 1, mx))
				fmt = "%d"
			"range":
				var key := "range" if section == "surface" else "reach"
				cur = Game.tool_param(t, section, key)
				nxt = Game.tool_param(t, section, key, mini(lvl + 1, mx))
			"radius":
				cur = Game.tool_param(t, section, "radius") * 2.0
				nxt = Game.tool_param(t, section, "radius", mini(lvl + 1, mx)) * 2.0
			_:
				cur = Game.tool_param(t, section, "power")
				nxt = Game.tool_param(t, section, "power", mini(lvl + 1, mx))
		var vt := UIKit.label((fmt % cur) + ((" → " + fmt % nxt) if lvl < mx else ""), 13, UIKit.GREY)
		vt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(vt)
		if lvl >= mx:
			h.add_child(_badge("MAX", UIKit.GOLD))
		else:
			var cost := Game.upgrade_cost(t, stat)
			var st: String = stat
			var b := UIKit.button(UIKit.fmt(cost), UIKit.ORANGE, Vector2(120, 46), 15, func():
				if Game.buy_upgrade(t, st):
					Audio.play("purchase")
					main.show_toast("%s upgraded" % nm, "good")
					_rebuild()
				else:
					Audio.play("error"))
			b.icon = Data.ui_icon("coin")
			b.expand_icon = true
			b.add_theme_constant_override("icon_max_width", 18)
			b.custom_minimum_size = Vector2(110, 42)
			b.disabled = Game.coins() < cost or not Game.owns_tool(t)
			h.add_child(b)
		_detail.add_child(h)


func _skins_row(t: String) -> void:
	var flow := HFlowContainer.new()
	flow.add_theme_constant_override("h_separation", 6)
	flow.add_theme_constant_override("v_separation", 6)
	_detail.add_child(flow)
	for sk in Data.cosmetics.get("tool_skins", []):
		var sid: String = sk["id"]
		var unlocked := Game.tool_skin_unlocked(sid)
		var rule: Dictionary = sk.get("unlock", {})
		var selected_skin := Game.tool_skin(t) == sid
		var label := String(sk["name"]) if unlocked else ("Buy " + UIKit.fmt(int(rule["value"])) if String(rule.get("type", "")) == "coins" else Appearance.rule_text(rule))
		var b := UIKit.button(label, UIKit.GOLD if selected_skin else UIKit.BLUE2, Vector2(130, 46), 13, func():
			if unlocked:
				Game.set_tool_skin(t, sid)
				_rebuild()
			elif String(rule.get("type", "")) == "coins":
				if Game.buy_tool_skin(sid):
					Audio.play("purchase")
					Game.set_tool_skin(t, sid)
					_rebuild()
				else:
					Audio.play("error")
			else:
				Audio.play("error")
				main.show_toast("Locked: " + Appearance.rule_text(rule), "warn"))
		b.custom_minimum_size = Vector2(120, 42)
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		if String(sk["color"]) != "":
			var dot := ColorRect.new()
			dot.color = Color(String(sk["color"]))
			dot.custom_minimum_size = Vector2(10, 10)
		flow.add_child(b)


func _buy(t: String) -> void:
	if Game.buy_tool(t):
		Audio.play("purchase")
		main.show_toast("%s purchased and equipped" % Data.tool_def(t).get("name", t), "good")
		_rebuild()
	else:
		Audio.play("error")
		main.show_toast("Not enough coins" if not Game.tool_locked(t) else "Locked: reach level %d" % Game.tool_unlock_level(t), "warn")


# ----------------------------------------------------------- accessories ---

func _fill_accessories() -> void:
	var gid := selected if Data.gear.has(selected) else String(Data.gear.keys()[0])
	selected = gid
	for g in Data.gear.keys():
		var d: Dictionary = Data.gear[g]
		var b := _row_base(g == gid)
		var gg: String = g
		b.pressed.connect(func():
			selected = gg
			_rebuild())
		var h := UIKit.hbox(12)
		h.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		h.offset_left = 10
		h.offset_right = -12
		h.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(h)
		h.add_child(UIKit.icon_rect(Data.ui_icon("gear_" + g), 46))
		var v := UIKit.vbox(2)
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.alignment = BoxContainer.ALIGNMENT_CENTER
		v.mouse_filter = Control.MOUSE_FILTER_IGNORE
		v.add_child(UIKit.label(String(d["name"]), 16, UIKit.WHITE))
		v.add_child(UIKit.label("Level %d / %d" % [Game.gear_level(g), int(d.get("max", 3))], 12, UIKit.GREY))
		h.add_child(v)
		_list.add_child(b)
	var d2: Dictionary = Data.gear[gid]
	var lvl := Game.gear_level(gid)
	var mx := int(d2.get("max", 3))
	_detail.add_child(UIKit.label("ACCESSORY", 12, UIKit.TURQ))
	var th := UIKit.hbox(12)
	th.add_child(UIKit.icon_rect(Data.ui_icon("gear_" + gid), 90))
	var tv := UIKit.vbox(4)
	tv.add_child(UIKit.label(String(d2["name"]), 24, UIKit.WHITE))
	tv.add_child(UIKit.wrap_label(String(d2.get("description", "")), 14, Color(1, 1, 1, 0.78), 380))
	th.add_child(tv)
	_detail.add_child(th)
	var per := float(d2.get("per_level", 0.1))
	var unit := "+%d%%" % int(per * 100) if gid != "magnet" else "+%.1f m" % per
	_stat_bar("Bonus", lvl * per, mx * per, ("%d%%" % int(lvl * per * 100)) if gid != "magnet" else "+%.1f m" % (lvl * per))
	_detail.add_child(UIKit.label("Each level: " + unit, 13, UIKit.GREY))
	if lvl >= mx:
		_detail.add_child(_badge("MAX LEVEL", UIKit.GOLD))
	else:
		var cost := Game.gear_cost(gid)
		var b2 := UIKit.button("Upgrade  ·  %s" % UIKit.fmt(cost), UIKit.ORANGE, Vector2(240, 56), 18, func():
			if Game.buy_gear(gid):
				Audio.play("purchase")
				_rebuild()
			else:
				Audio.play("error"))
		b2.disabled = Game.coins() < cost
		_detail.add_child(b2)
	_detail.add_child(_sep())
	_detail.add_child(UIKit.wrap_label("All equipment is earned by playing. There are no real-money purchases.", 13, UIKit.GREY, 420))
