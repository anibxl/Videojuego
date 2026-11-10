class_name AchievementsScreen
extends Control
## Achievements with live progress bars and coin rewards.

var main
var arg


func _ready() -> void:
	var list := MiscScreens.list_screen(self, "Achievements  %d / %d" % [Game.state["achievements"].size(), Data.achievements.size()], func(): main.goto("profile"))
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_child(grid)
	for a in Data.achievements:
		var got: bool = Game.state["achievements"].has(a["id"])
		var p := UIKit.panel(Color(0.12, 0.42, 0.3, 0.95) if got else Color(UIKit.BLUE, 0.92), 20)
		p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var h := UIKit.hbox(12)
		p.add_child(h)
		var icon := UIKit.icon_rect(Data.ui_icon("trophy"), 60)
		if not got:
			icon.modulate = Color(0.5, 0.5, 0.6, 0.8)
		h.add_child(icon)
		var v := UIKit.vbox(4)
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(v)
		v.add_child(UIKit.label(String(a["name"]), 22, UIKit.GOLD if got else UIKit.WHITE))
		v.add_child(UIKit.wrap_label(String(a["description"]), 16, Color(1, 1, 1, 0.8), 300))
		var cur := Game.get_stat(a["stat"])
		var target := float(a["target"])
		v.add_child(UIKit.progress(clampf(cur / target, 0, 1), UIKit.GREEN if got else UIKit.TURQ, 10))
		v.add_child(UIKit.label("%s / %s   •   reward %d coins" % [UIKit.fmt(int(minf(cur, target))), UIKit.fmt(int(target)), int(a.get("reward", 0))], 15, Color(1, 1, 1, 0.7)))
		grid.add_child(p)
