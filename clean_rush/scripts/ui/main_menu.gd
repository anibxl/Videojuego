class_name MainMenuScreen
extends Control
## Professional main menu over the live 3D garden (slow cinematic camera).
## Essentials only: CONTINUE / PLAY, Maps, Equipment, Character, Settings, and a
## compact player panel (tap it for the Profile: achievements, collection,
## daily missions, save slots).

var main
var arg
var _t := 0.0
var _items: Array = []


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Soft vignette on the left so text stays readable over the scene.
	var grad := TextureRect.new()
	grad.set_anchors_preset(Control.PRESET_FULL_RECT)
	var g := Gradient.new()
	g.set_color(0, Color(UIKit.INK, 0.9))
	g.add_point(0.45, Color(UIKit.INK, 0.55))
	g.set_color(g.get_point_count() - 1, Color(UIKit.INK, 0.0))
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill_from = Vector2(0, 0)
	gt.fill_to = Vector2(0.8, 0)
	grad.texture = gt
	grad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(grad)
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	# ---- Left column ----
	var col := UIKit.vbox(10)
	col.position = Vector2(64, 56)
	col.custom_minimum_size = Vector2(340, 0)
	root.add_child(col)
	var logo := UIKit.icon_rect(Data.icon("res://assets/icons/ui/logo.png"), 0)
	logo.custom_minimum_size = Vector2(300, 140)
	logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT
	col.add_child(logo)
	col.add_child(UIKit.label("PROFESSIONAL CLEANING SIMULATOR", 12, UIKit.TURQ))
	var spacer := Control.new()
	spacer.custom_minimum_size.y = 18
	col.add_child(spacer)
	var job: Dictionary = Game.state.get("active_job", {})
	var goal := Game.next_goal()
	var cont_text := "CONTINUE" if not job.is_empty() else "PLAY"
	var play := UIKit.button(cont_text, UIKit.ORANGE, Vector2(372, 76), 26, func(): _continue())
	play.custom_minimum_size = Vector2(340, 60)
	col.add_child(play)
	_items.append(play)
	var sub := ""
	if not job.is_empty():
		var mname := String(Data.map_def(job.get("map", "")).get("name", ""))
		var c := Data.contract_def(job.get("map", ""), job.get("contract", ""))
		sub = "%s · %s · %d%% restored" % [mname, c.get("title", ""), int(Game.map_state_overall(job.get("map", "")) * 100)]
	else:
		sub = "Next: " + String(goal["text"])
	var sl := UIKit.wrap_label(sub, 13, UIKit.GREY, 340)
	col.add_child(sl)
	var sp2 := Control.new()
	sp2.custom_minimum_size.y = 10
	col.add_child(sp2)
	for entry in [["Maps", "maps"], ["Equipment", "shop"], ["Character", "creator"], ["Settings", "settings"]]:
		var target: String = entry[1]
		var b := UIKit.button(entry[0], UIKit.BLUE2, Vector2(372, 64), 20, func():
			if target == "creator":
				main.goto("creator", {"mode": "edit", "return_to": "menu"})
			else:
				main.goto(target))
		b.custom_minimum_size = Vector2(340, 52)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		col.add_child(b)
		_items.append(b)
	# Staggered entrance animation.
	for i in _items.size():
		var it: Control = _items[i]
		it.modulate.a = 0.0
		var tw := it.create_tween()
		tw.tween_interval(0.05 * i)
		tw.tween_property(it, "modulate:a", 1.0, 0.25)
	# ---- Player panel (top right) ----
	var card := Button.new()
	card.focus_mode = Control.FOCUS_NONE
	card.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	card.offset_left = -360
	card.offset_right = -32
	card.offset_top = 32
	card.offset_bottom = 182
	var sb := UIKit.flat(Color(UIKit.BLUE, 0.72), 12, 14)
	sb.border_color = UIKit.BORDER
	sb.set_border_width_all(1)
	var sbh := sb.duplicate() as StyleBoxFlat
	sbh.border_color = UIKit.TURQ
	for st in ["normal", "pressed", "focus"]:
		card.add_theme_stylebox_override(st, sb)
	card.add_theme_stylebox_override("hover", sbh)
	card.pressed.connect(func():
		Audio.play("ui_click", -6.0)
		main.goto("profile"))
	root.add_child(card)
	var ch := UIKit.hbox(12)
	ch.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ch.offset_left = 12
	ch.offset_right = -14
	ch.offset_top = 10
	ch.offset_bottom = -10
	ch.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(ch)
	var pv := CharacterPreview.new()
	pv.custom_minimum_size = Vector2(96, 128)
	pv.auto_rotate = true
	pv.interactive = false
	pv.zoom = 1.2
	pv.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ch.add_child(pv)
	var info := UIKit.vbox(4)
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ch.add_child(info)
	info.add_child(UIKit.label(Game.profile_name() if Game.profile_name() != "" else "Cleaner", 18, UIKit.WHITE))
	var lvl := Game.level()
	var lo := Game.xp_for_level(lvl)
	var hi := Game.xp_for_level(lvl + 1)
	info.add_child(UIKit.label("Level %d  ·  %d / %d XP" % [lvl, Game.xp() - lo, hi - lo], 13, UIKit.GREY))
	info.add_child(UIKit.progress(float(Game.xp() - lo) / maxf(1.0, hi - lo), UIKit.TURQ, 8))
	var row := UIKit.hbox(14)
	row.add_child(UIKit.money_chip(Game.coins(), 16))
	var st2 := UIKit.hbox(4)
	st2.add_child(UIKit.icon_rect(Data.ui_icon("star"), 18))
	st2.add_child(UIKit.label(str(Game.total_stars()), 16, UIKit.GOLD))
	row.add_child(st2)
	info.add_child(row)
	info.add_child(UIKit.label("Profile ›", 12, UIKit.TURQ))
	for c2 in info.get_children():
		if c2 is Control:
			c2.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Daily missions ready indicator.
	if Game.dailies_ready() > 0:
		var dl := UIKit.label("%d daily reward(s) ready in your Profile" % Game.dailies_ready(), 13, UIKit.ORANGE)
		dl.set_anchors_preset(Control.PRESET_TOP_RIGHT)
		dl.position = Vector2(-360, 190)
		root.add_child(dl)
	# ---- Footer ----
	var foot := UIKit.label("v%s  ·  Slot %d  ·  Saved locally" % [ProjectSettings.get_setting("application/config/version", ""), Game.current_slot + 1], 12, Color(1, 1, 1, 0.45))
	foot.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	foot.position = Vector2(64, -36)
	root.add_child(foot)
	if OS.get_name() not in ["Android", "iOS", "Web"]:
		var q := UIKit.button("Quit", UIKit.BLUE2, Vector2(130, 48), 15, func():
			Game.save_game()
			get_tree().quit())
		q.custom_minimum_size = Vector2(110, 40)
		q.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
		q.position = Vector2(-142, -60)
		root.add_child(q)


func _continue() -> void:
	var job: Dictionary = Game.state.get("active_job", {})
	if not job.is_empty() and Data.maps.has(job.get("map", "")) and Game.is_map_unlocked(job.get("map", "")):
		main.start_contract(job["map"], job["contract"])
		return
	var g := Game.next_goal()
	if g["contract"] != "":
		main.goto("contracts", g["map"])
	else:
		main.goto("maps")
