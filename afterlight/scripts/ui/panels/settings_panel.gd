extends BasePanel
## Settings: audio, controls, graphics. Every change applies immediately and
## is saved to user://settings.cfg.

func _init() -> void:
	super()
	title_text = "Settings"
	subtitle_text = "Changes are saved automatically"
	max_size = Vector2(900, 680)

func build(c: VBoxContainer) -> void:
	var v := scroll_area(c)
	_section(v, "AUDIO")
	_slider(v, "Master Volume", Settings.master_volume, 0.0, 1.0, func(x): Settings.master_volume = x)
	_slider(v, "Music Volume", Settings.music_volume, 0.0, 1.0, func(x): Settings.music_volume = x)
	_slider(v, "Sound Effects", Settings.sfx_volume, 0.0, 1.0, func(x): Settings.sfx_volume = x; Audio.play("ui_click", -4.0))
	_section(v, "CONTROLS")
	_slider(v, "Camera Sensitivity", Settings.sensitivity, 0.2, 3.0, func(x): Settings.sensitivity = x)
	_slider(v, "Camera Distance", Settings.camera_distance, 3.0, 8.0, func(x): Settings.camera_distance = x)
	_toggle(v, "Invert Camera Y", Settings.invert_y, func(b): Settings.invert_y = b)
	_choice(v, "Touch Controls", ["Auto", "Always", "Never"], Settings.touch_controls, func(i): Settings.touch_controls = i)
	_slider(v, "Touch Controls Opacity", Settings.controls_opacity, 0.2, 1.0, func(x): Settings.controls_opacity = x)
	_section(v, "GRAPHICS")
	_choice(v, "Quality Preset", Settings.GRAPHICS_NAMES, Settings.graphics, func(i): Settings.graphics = i)
	var hint := UIKit.wrap_label("Low: 70% render scale, no shadows/glow, fewer particles — best for older phones.  Medium: balanced.  High: full resolution, shadows, anti-aliasing.", 16)
	v.add_child(hint)
	_toggle(v, "Show FPS Counter", Settings.show_fps, func(b): Settings.show_fps = b)
	_section(v, "DATA")
	var del := UIKit.button("Delete Save Data…", _confirm_delete, Vector2(0, 52))
	del.add_theme_color_override("font_color", UIKit.BAD.lightened(0.3))
	v.add_child(del)
	var ver := UIKit.label("AFTERLIGHT v%s  ·  Save format v%d" % [ProjectSettings.get_setting("application/config/version", "0.1.0"), SaveSystem.SAVE_VERSION], 16, UIKit.TEXT_DIM)
	v.add_child(ver)

func _section(v: VBoxContainer, t: String) -> void:
	v.add_child(UIKit.spacer(6))
	v.add_child(UIKit.label(t, 18, UIKit.CYAN, UIKit.font_bold))

func _row(v: VBoxContainer, label: String) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 16)
	h.custom_minimum_size.y = 48
	var l := UIKit.label(label, 22)
	l.custom_minimum_size.x = 280
	h.add_child(l)
	v.add_child(h)
	return h

func _slider(v: VBoxContainer, label: String, value: float, mn: float, mx: float, setter: Callable) -> void:
	var h := _row(v, label)
	var s := HSlider.new()
	s.min_value = mn
	s.max_value = mx
	s.step = 0.01
	s.value = value
	s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	s.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	s.custom_minimum_size.y = 36
	var val := UIKit.label("%d%%" % int(value * 100) if mx <= 1.0 else "%.1f" % value, 20, UIKit.TEXT_DIM)
	val.custom_minimum_size.x = 64
	s.value_changed.connect(func(x):
		setter.call(x)
		val.text = "%d%%" % int(x * 100) if mx <= 1.0 else "%.1f" % x
		Settings.apply())
	h.add_child(s)
	h.add_child(val)

func _toggle(v: VBoxContainer, label: String, value: bool, setter: Callable) -> void:
	var h := _row(v, label)
	var cb := CheckButton.new()
	cb.button_pressed = value
	cb.focus_mode = Control.FOCUS_NONE
	cb.toggled.connect(func(b): setter.call(b); Settings.apply(); Audio.ui_click())
	h.add_child(cb)

func _choice(v: VBoxContainer, label: String, options: Array, current: int, setter: Callable) -> void:
	var h := _row(v, label)
	var group: Array[Button] = []
	for i in options.size():
		var b := UIKit.button(options[i], Callable(), Vector2(120, 46))
		b.toggle_mode = true
		b.button_pressed = i == current
		b.add_theme_stylebox_override("pressed", UIKit.box(Color(0.3, 0.22, 0.85), 12, UIKit.CYAN, 2, 16))
		group.append(b)
		h.add_child(b)
	for i in group.size():
		group[i].pressed.connect(func():
			for j in group.size():
				group[j].button_pressed = j == i
			setter.call(i)
			Settings.apply())

func _confirm_delete() -> void:
	var d := ConfirmationDialog.new()
	d.title = "Delete save data?"
	d.dialog_text = "This permanently erases all progress (settings are kept)."
	d.ok_button_text = "Delete"
	d.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(d)
	d.confirmed.connect(func():
		SaveSystem.in_game = false
		SaveSystem.delete_save()
		get_tree().paused = false
		Router.go_to("res://scenes/main/main_menu.tscn"))
	d.popup_centered()
