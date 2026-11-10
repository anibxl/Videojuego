class_name MainMenuScreen
extends Control
## Premium main menu over the animated 3D garden background.

var main
var arg
var _logo: Control
var _bubbles: Array = []
var _t := 0.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var grad := TextureRect.new()
	grad.set_anchors_preset(Control.PRESET_FULL_RECT)
	var g := Gradient.new()
	g.set_color(0, Color(UIKit.BLUE, 0.85))
	g.set_color(1, Color(UIKit.BLUE, 0.0))
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill_from = Vector2(0, 0)
	gt.fill_to = Vector2(0.75, 0)
	grad.texture = gt
	grad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(grad)
	for i in 14:
		var b := TextureRect.new()
		b.texture = Data.ui_icon("bubble")
		b.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		var s := randf_range(24, 70)
		b.size = Vector2(s, s)
		b.position = Vector2(randf_range(0, 1280), randf_range(0, 720))
		b.modulate.a = randf_range(0.3, 0.7)
		b.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(b)
		_bubbles.append([b, randf_range(20, 60), randf() * TAU])
	var root := UIKit.hbox(24)
	add_child(UIKit.fill_screen(root, 32))
	var left := UIKit.vbox(14)
	left.custom_minimum_size.x = 470
	root.add_child(left)
	_logo = UIKit.icon_rect(Data.icon("res://assets/icons/ui/logo.png"), 0)
	_logo.custom_minimum_size = Vector2(460, 200)
	left.add_child(_logo)
	left.add_child(UIKit.label("Clean it. Upgrade it. Unlock everything.", 22, UIKit.WHITE))
	var goal := Game.next_goal()
	var play := UIKit.button("▶  PLAY", UIKit.ORANGE, Vector2(460, 96), 40, func():
		var g2 := Game.next_goal()
		if g2["contract"] != "":
			main.goto("contracts", g2["map"])
		else:
			main.goto("maps"))
	left.add_child(play)
	var goal_l := UIKit.wrap_label("Next: " + String(goal["text"]), 18, Color(1, 1, 1, 0.85), 460)
	left.add_child(goal_l)
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	left.add_child(grid)
	var bsize := Vector2(224, 70)
	grid.add_child(UIKit.button("Maps", UIKit.TURQ.darkened(0.1), bsize, 26, func(): main.goto("maps")))
	grid.add_child(UIKit.button("Equipment", UIKit.BLUE2, bsize, 26, func(): main.goto("equipment")))
	grid.add_child(UIKit.button("Shop", UIKit.GREEN.darkened(0.15), bsize, 26, func(): main.goto("shop")))
	var daily_text := "Daily" + (" (%d!)" % Game.dailies_ready() if Game.dailies_ready() > 0 else "")
	grid.add_child(UIKit.button(daily_text, Color("8a4be0"), bsize, 26, func(): main.goto("daily")))
	grid.add_child(UIKit.button("Collection", UIKit.BLUE2, bsize, 26, func(): main.goto("collection")))
	grid.add_child(UIKit.button("Achievements", UIKit.BLUE2, bsize, 24, func(): main.goto("achievements")))
	root.add_child(UIKit.spacer())
	# Right: player card
	var right := UIKit.vbox(12)
	right.alignment = BoxContainer.ALIGNMENT_BEGIN
	root.add_child(right)
	var card := UIKit.panel(Color(UIKit.BLUE, 0.85), 26)
	card.custom_minimum_size.x = 330
	right.add_child(card)
	var cv := UIKit.vbox(10)
	card.add_child(cv)
	cv.add_child(UIKit.money_chip(Game.coins(), 30))
	var lvl := Game.level()
	var lo := Game.xp_for_level(lvl)
	var hi := Game.xp_for_level(lvl + 1)
	cv.add_child(UIKit.label("Level %d Cleaner" % lvl, 26, UIKit.WHITE))
	cv.add_child(UIKit.progress(float(Game.xp() - lo) / maxf(1.0, hi - lo), UIKit.TURQ, 16))
	cv.add_child(UIKit.label("%d / %d XP" % [Game.xp() - lo, hi - lo], 16, Color(1, 1, 1, 0.8)))
	var sh := UIKit.hbox(8)
	sh.add_child(UIKit.icon_rect(Data.ui_icon("star"), 32))
	sh.add_child(UIKit.label("%d stars" % Game.total_stars(), 22, UIKit.GOLD))
	cv.add_child(sh)
	cv.add_child(UIKit.label("%d / %d contracts" % [Game.contracts_completed_count(), Data.all_contracts().size()], 18, UIKit.WHITE))
	cv.add_child(UIKit.label("%d / %d discoveries" % [Game.state["discoveries"].size(), Data.all_discoveries().size()], 18, UIKit.WHITE))
	right.add_child(UIKit.button("Settings", UIKit.BLUE2, Vector2(330, 64), 24, func(): main.goto("settings")))
	if OS.get_name() not in ["Android", "iOS", "Web"]:
		right.add_child(UIKit.button("Quit", Color(0.35, 0.4, 0.5), Vector2(330, 56), 22, func():
			Game.save_game()
			get_tree().quit()))


func _process(delta: float) -> void:
	_t += delta
	if _logo:
		_logo.pivot_offset = _logo.size / 2
		_logo.scale = Vector2.ONE * (1.0 + sin(_t * 1.6) * 0.015)
	for b in _bubbles:
		var r: TextureRect = b[0]
		r.position.y -= b[1] * delta
		r.position.x += sin(_t + b[2]) * 0.4
		if r.position.y < -80:
			r.position.y = size.y + 20
			r.position.x = randf_range(0, size.x)
