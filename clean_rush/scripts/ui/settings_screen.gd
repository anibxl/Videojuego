class_name SettingsScreen
extends Control
## Settings: music/SFX volume, graphics quality, touch controls, auto-aim,
## camera sensitivity, reset progress. Works as a screen or a pause overlay.

var main
var arg
var as_overlay := false
var _confirm_reset := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_build()


func _build() -> void:
	for c in get_children():
		c.queue_free()
	add_child(UIKit.backdrop(0.75))
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var p := UIKit.panel(Color(UIKit.BLUE, 0.96), 28)
	p.custom_minimum_size = Vector2(900, 0)
	center.add_child(p)
	var v := UIKit.vbox(9)
	p.add_child(v)
	v.add_child(UIKit.label("Settings", 34, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(_slider("Music", "music"))
	v.add_child(_slider("Sound effects", "sfx"))
	v.add_child(_choice("Graphics", "graphics", ["Low", "Medium", "High"]))
	v.add_child(_choice("Touch controls", "touch", ["Auto", "On", "Off"]))
	v.add_child(_choice("Auto-aim assist", "auto_aim", ["Off", "On"], true))
	var cam := _slider("Camera speed", "cam_sens", 0.3, 2.0)
	v.add_child(cam)
	v.add_child(_choice("Time of day", "time_of_day", ["Auto", "Morning", "Day", "Evening"]))
	v.add_child(_choice("Weather", "weather", ["Auto", "Sunny", "Cloudy", "Windy", "Rain"]))
	v.add_child(UIKit.label("Graphics changes apply fully when the next location loads.", 15, Color(1, 1, 1, 0.65), HORIZONTAL_ALIGNMENT_CENTER))
	var h := UIKit.hbox(12)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	h.add_child(UIKit.button("Save now", UIKit.TURQ.darkened(0.15), Vector2(170, 62), 20, func():
		if Game.save_game():
			main.show_toast("Saved to slot %d" % (Game.current_slot + 1), "good")
		else:
			main.show_toast("No active save slot", "warn")))
	if not as_overlay:
		h.add_child(UIKit.button("Save slots", UIKit.BLUE2, Vector2(170, 62), 20, func(): main.goto("slots")))
	var reset := UIKit.button("Tap again to confirm" if _confirm_reset else "Reset this save", UIKit.RED.darkened(0.2), Vector2(280, 62), 20, func():
		if _confirm_reset:
			Game.reset_progress()
			main.show_toast("Progress reset", "warn")
			_confirm_reset = false
			if not as_overlay:
				main.goto("menu")
				return
		else:
			_confirm_reset = true
		_build())
	reset.disabled = as_overlay
	h.add_child(reset)
	h.add_child(UIKit.button("Done", UIKit.GREEN.darkened(0.1), Vector2(240, 62), 24, func():
		Game.save_game()
		if as_overlay:
			queue_free()
		else:
			main.goto("menu")))
	v.add_child(h)
	v.add_child(UIKit.label("CLEAN RUSH v%s • No ads, no tracking, offline saves" % ProjectSettings.get_setting("application/config/version", "1.0.0"), 14, Color(1, 1, 1, 0.5), HORIZONTAL_ALIGNMENT_CENTER))


func _slider(text: String, key: String, lo := 0.0, hi := 1.0) -> HBoxContainer:
	var h := UIKit.hbox(14)
	var l := UIKit.label(text, 22, UIKit.WHITE)
	l.custom_minimum_size.x = 240
	h.add_child(l)
	var s := HSlider.new()
	s.min_value = lo
	s.max_value = hi
	s.step = 0.05
	s.value = float(Game.setting(key))
	s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	s.custom_minimum_size.y = 40
	var val := UIKit.label("%d%%" % int(s.value * 100), 20, UIKit.TURQ)
	val.custom_minimum_size.x = 70
	s.value_changed.connect(func(x):
		val.text = "%d%%" % int(x * 100)
		Game.set_setting(key, x))
	h.add_child(s)
	h.add_child(val)
	return h


func _choice(text: String, key: String, options: Array, boolean := false) -> HBoxContainer:
	var h := UIKit.hbox(10)
	var l := UIKit.label(text, 22, UIKit.WHITE)
	l.custom_minimum_size.x = 240
	h.add_child(l)
	var cur = Game.setting(key)
	for i in options.size():
		var selected: bool = (bool(cur) == (i == 1)) if boolean else int(cur) == i
		var idx := i
		h.add_child(UIKit.button(String(options[i]), UIKit.ORANGE if selected else UIKit.BLUE2, Vector2(120 if options.size() > 4 else 140, 50), 18, func():
			Game.set_setting(key, (idx == 1) if boolean else idx)
			_build()))
	return h
