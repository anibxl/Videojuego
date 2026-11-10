class_name RewardScreen
extends Control
## End-of-contract reward screen: animated stars, coin breakdown, XP, records,
## new unlocks and next actions.

var main
var data: Dictionary = {}
var _star_nodes: Array = []


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(UIKit.backdrop(0.7))
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.offset_top = 150   # leave room for toasts (achievements / unlocks)
	add_child(center)
	var p := UIKit.panel(Color(UIKit.BLUE, 0.97), 30)
	p.custom_minimum_size = Vector2(820, 0)
	center.add_child(p)
	var v := UIKit.vbox(10)
	p.add_child(v)
	var c := Data.contract_def(data["map"], data["contract"])
	var r: Dictionary = data["rewards"]
	var res: Dictionary = data["result"]
	var stars := int(r["stars"])
	v.add_child(UIKit.label(("PERFECT CLEAN!" if stars == 3 else "JOB DONE!") + "  " + String(c.get("title", "")), 32, UIKit.GOLD, HORIZONTAL_ALIGNMENT_CENTER))
	var sr := UIKit.hbox(18)
	sr.alignment = BoxContainer.ALIGNMENT_CENTER
	for i in 3:
		var s := UIKit.icon_rect(Data.ui_icon("star_empty"), 64)
		s.pivot_offset = Vector2(32, 32)
		sr.add_child(s)
		_star_nodes.append(s)
	v.add_child(sr)
	var body := UIKit.hbox(24)
	v.add_child(body)
	var left := UIKit.vbox(6)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(left)
	for b in data["breakdown"]:
		left.add_child(UIKit.label(("★ " if b["ok"] else "☆ ") + String(b["text"]), 19, UIKit.GOLD if b["ok"] else Color(1, 1, 1, 0.55)))
	left.add_child(UIKit.label("Time %s%s" % [UIKit.time_str(float(res["time"])), "   NEW RECORD!" if r.get("new_record", false) else ""], 19, UIKit.TURQ))
	left.add_child(UIKit.label("Location %d%% clean" % int(float(res["overall"]) * 100), 19, UIKit.WHITE))
	if not res.get("found", []).is_empty():
		left.add_child(UIKit.label("Discoveries found: %d" % res["found"].size(), 19, UIKit.ORANGE))
	var right := UIKit.vbox(6)
	right.custom_minimum_size.x = 340
	body.add_child(right)
	right.add_child(_line("Contract reward" + ("" if r["first_time"] else " (replay)"), r["base"]))
	right.add_child(_line("Star bonus", r["star_bonus"]))
	right.add_child(_line("Dirt removed", r["dirt_coins"]))
	right.add_child(_line("Discoveries", r["discovery_coins"]))
	var tot := UIKit.hbox(8)
	tot.add_child(UIKit.label("TOTAL", 26, UIKit.WHITE))
	tot.add_child(UIKit.spacer())
	tot.add_child(UIKit.money_chip(int(r["total"]), 28))
	right.add_child(tot)
	right.add_child(UIKit.label("+%d XP%s" % [int(r["xp"]), ("   LEVEL UP!" if int(r["levels"]) > 0 else "")], 22, UIKit.TURQ))
	for cosm in r.get("new_cosmetics", []):
		v.add_child(UIKit.label("NEW COSMETIC UNLOCKED: %s" % cosm, 20, UIKit.TURQ, HORIZONTAL_ALIGNMENT_CENTER))
	for m in r.get("new_maps", []):
		v.add_child(UIKit.label("NEW LOCATION UNLOCKED: %s" % Data.map_def(m)["name"], 22, UIKit.ORANGE, HORIZONTAL_ALIGNMENT_CENTER))
	var next: Dictionary = main.next_contract_after(data["map"], data["contract"])
	var h := UIKit.hbox(14)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	h.add_child(UIKit.button("Replay", UIKit.BLUE2, Vector2(200, 70), 24, func(): main.restart_contract()))
	h.add_child(UIKit.button("Contracts", UIKit.BLUE2, Vector2(200, 70), 24, func(): main.goto("contracts", data["map"])))
	if not next.is_empty():
		h.add_child(UIKit.button("Next job ▶", UIKit.ORANGE, Vector2(240, 70), 26, func(): main.start_contract(next["map"], next["contract"])))
	h.add_child(UIKit.button("Menu", Color(0.35, 0.4, 0.5), Vector2(160, 70), 24, func(): main.goto("menu")))
	v.add_child(h)
	_animate_stars(stars)
	if int(r["levels"]) > 0:
		Audio.play("level_up")


func _line(text: String, value: int) -> HBoxContainer:
	var h := UIKit.hbox(8)
	h.add_child(UIKit.label(text, 19, Color(1, 1, 1, 0.85)))
	h.add_child(UIKit.spacer())
	h.add_child(UIKit.label("+" + UIKit.fmt(value), 19, UIKit.GOLD))
	return h


func _animate_stars(n: int) -> void:
	var tw := create_tween()
	for i in n:
		var s: TextureRect = _star_nodes[i]
		tw.tween_interval(0.25)
		tw.tween_callback(func():
			s.texture = Data.ui_icon("star")
			s.scale = Vector2(1.6, 1.6)
			Audio.play("star"))
		tw.tween_property(s, "scale", Vector2.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
