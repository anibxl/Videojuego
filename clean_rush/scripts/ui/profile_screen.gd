class_name ProfileScreen
extends Control
## Player profile: 3D character (drag to rotate), level/XP, money, stars,
## playtime and statistics, plus access to Achievements, Collection, Daily
## missions, Save slots and the Character editor.

var main
var arg


func _ready() -> void:
	add_child(UIKit.backdrop(0.72))
	var v := UIKit.vbox(14)
	add_child(UIKit.fill_screen(v, 22))
	v.add_child(UIKit.header("Profile", func(): main.goto("menu")))
	var body := UIKit.hbox(18)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(body)
	var left := UIKit.panel(Color(UIKit.BLUE, 0.82), 12)
	left.custom_minimum_size.x = 380
	body.add_child(left)
	var lv := UIKit.vbox(8)
	left.add_child(lv)
	var pv := CharacterPreview.new()
	pv.custom_minimum_size = Vector2(340, 380)
	pv.size_flags_vertical = Control.SIZE_EXPAND_FILL
	lv.add_child(pv)
	lv.add_child(UIKit.label(Game.profile_name() if Game.profile_name() != "" else "Cleaner", 22, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER))
	lv.add_child(UIKit.button("Edit character", UIKit.BLUE2, Vector2(330, 52), 17, func(): main.goto("creator", {"mode": "edit", "return_to": "profile"})))
	var right := UIKit.vbox(12)
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(right)
	var stats := UIKit.panel(Color(UIKit.BLUE, 0.82), 12)
	right.add_child(stats)
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 40)
	grid.add_theme_constant_override("v_separation", 8)
	stats.add_child(grid)
	var m := int(float(Game.state.get("playtime", 0.0)) / 60.0)
	var rows := [
		["Level", str(Game.level())], ["Experience", UIKit.fmt(Game.xp()) + " XP"], ["Coins", UIKit.fmt(Game.coins())],
		["Stars", "%d / %d" % [Game.total_stars(), Data.all_contracts().size() * 3]],
		["Contracts", "%d / %d" % [Game.contracts_completed_count(), Data.all_contracts().size()]],
		["Discoveries", "%d / %d" % [Game.state["discoveries"].size(), Data.all_discoveries().size()]],
		["Tools owned", "%d / %d" % [Game.state["tools_owned"].size(), Data.tools.size()]],
		["Leaves cleared", UIKit.fmt(int(Game.get_stat("leaves_cleared")))],
		["Surface cleaned", "%d m²" % int(Game.get_stat("area_cleaned"))],
		["Playtime", "%dh %02dm" % [m / 60, m % 60]],
	]
	for r in rows:
		grid.add_child(UIKit.label(r[0], 15, UIKit.GREY))
		grid.add_child(UIKit.label(r[1], 15, UIKit.WHITE))
	var nav := GridContainer.new()
	nav.columns = 2
	nav.add_theme_constant_override("h_separation", 10)
	nav.add_theme_constant_override("v_separation", 10)
	right.add_child(nav)
	var daily := "Daily missions" + (" (%d ready)" % Game.dailies_ready() if Game.dailies_ready() > 0 else "")
	for e in [["Achievements", "achievements"], ["Collection", "collection"], [daily, "daily"], ["Save slots", "slots"]]:
		var target: String = e[1]
		var b := UIKit.button(e[0], UIKit.ORANGE if target == "daily" and Game.dailies_ready() > 0 else UIKit.BLUE2, Vector2(300, 60), 18, func(): main.goto(target))
		b.custom_minimum_size = Vector2(280, 52)
		nav.add_child(b)
