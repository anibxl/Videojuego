class_name ContractSelectScreen
extends Control
## Contract list for a location: objectives, reward, best result, and the
## recommended tools (with ownership state).

var main
var arg


func _ready() -> void:
	var map_id: String = arg if arg != null else "autumn_garden"
	var d := Data.map_def(map_id)
	add_child(UIKit.backdrop(0.6))
	var v := UIKit.vbox(14)
	add_child(UIKit.fill_screen(v, 24))
	v.add_child(UIKit.header(String(d.get("name", "")) + " — Contracts", func(): main.goto("maps")))
	var tools_row := UIKit.hbox(10)
	tools_row.add_child(UIKit.label("Recommended tools:", 18, Color(1, 1, 1, 0.8)))
	for t in d.get("recommended_tools", []):
		var chip := UIKit.panel(Color(0, 0, 0, 0.35) if Game.owns_tool(t) else Color(0.4, 0.15, 0.1, 0.6), 18)
		var h := UIKit.hbox(6)
		h.add_child(UIKit.icon_rect(Data.tool_icon(t), 30))
		h.add_child(UIKit.label(String(Data.tool_def(t).get("name", t)) + ("" if Game.owns_tool(t) else " (shop)"), 16, UIKit.WHITE))
		chip.add_child(h)
		tools_row.add_child(chip)
	v.add_child(tools_row)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	v.add_child(scroll)
	var list := UIKit.vbox(12)
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(list)
	for c in d.get("contracts", []):
		list.add_child(_row(map_id, c))


func _row(map_id: String, c: Dictionary) -> Control:
	var rec := Game.contract_record(c["id"])
	var done := bool(rec.get("completed", false))
	var p := UIKit.panel(Color(UIKit.BLUE, 0.92), 22)
	var h := UIKit.hbox(18)
	p.add_child(h)
	var info := UIKit.vbox(6)
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(info)
	var title := UIKit.hbox(10)
	title.add_child(UIKit.label(String(c["title"]), 28, UIKit.WHITE))
	if done:
		title.add_child(UIKit.label("✔ Completed", 18, UIKit.GREEN))
	info.add_child(title)
	info.add_child(UIKit.wrap_label(String(c.get("description", "")), 18, Color(1, 1, 1, 0.85), 500))
	for o in c.get("objectives", []):
		info.add_child(UIKit.label("•  " + String(o.get("label", "")) + "  (%d%%)" % int(round(float(o.get("target", 1)) * 100)), 18, UIKit.TURQ))
	var right := UIKit.vbox(8)
	right.custom_minimum_size.x = 280
	h.add_child(right)
	right.add_child(UIKit.stars_row(int(rec.get("stars", 0)), 40))
	var reward := int(c.get("reward", 0))
	var rh := UIKit.hbox(6)
	rh.add_child(UIKit.money_chip(reward if not done else reward / 2, 24))
	rh.add_child(UIKit.label("+%d XP" % (int(c.get("xp", 0)) if not done else int(c.get("xp", 0)) / 2), 20, UIKit.TURQ))
	right.add_child(rh)
	right.add_child(UIKit.label("Par time %s" % UIKit.time_str(float(c.get("par_time", 120))), 16, Color(1, 1, 1, 0.75)))
	if float(rec.get("best_time", 0.0)) > 0.0:
		right.add_child(UIKit.label("Personal best %s" % UIKit.time_str(float(rec["best_time"])), 16, UIKit.GOLD))
	right.add_child(UIKit.button("Replay" if done else "Start", UIKit.ORANGE if not done else UIKit.GREEN.darkened(0.15), Vector2(260, 68), 26,
		func(): main.start_contract(map_id, c["id"])))
	return p
