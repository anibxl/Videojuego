class_name PauseMenu
extends Control
## Pause overlay: resume, restart, tool shop shortcut is intentionally absent
## (no mid-job purchases); settings and quit to map.

var main


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(UIKit.backdrop(0.7))
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var p := UIKit.panel(Color(UIKit.BLUE, 0.96), 28)
	p.custom_minimum_size = Vector2(460, 0)
	center.add_child(p)
	var v := UIKit.vbox(14)
	p.add_child(v)
	v.add_child(UIKit.label("Paused", 40, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER))
	if main.runner:
		var c: Dictionary = main.runner.def
		v.add_child(UIKit.label(String(c.get("title", "")), 22, UIKit.GOLD, HORIZONTAL_ALIGNMENT_CENTER))
		v.add_child(UIKit.label("Location %d%% clean  •  %s" % [int(main.current_map.overall() * 100), UIKit.time_str(main.runner.elapsed)], 18, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER))
	var bs := Vector2(400, 70)
	v.add_child(UIKit.button("Resume", UIKit.GREEN.darkened(0.1), bs, 28, func(): main.resume_game()))
	v.add_child(UIKit.button("Restart contract", UIKit.ORANGE, bs, 24, func(): main.restart_contract()))
	v.add_child(UIKit.button("Settings", UIKit.BLUE2, bs, 24, func():
		var s := SettingsScreen.new()
		s.main = main
		s.as_overlay = true
		s.set_anchors_preset(Control.PRESET_FULL_RECT)
		add_child(s)))
	v.add_child(UIKit.button("Quit to map", Color(0.35, 0.4, 0.5), bs, 24, func():
		var m: String = main.session_map
		main.goto("contracts", m)))
	v.add_child(UIKit.label("Quitting keeps your best cleaning %, but the contract reward needs completion.", 14, Color(1, 1, 1, 0.6), HORIZONTAL_ALIGNMENT_CENTER))
