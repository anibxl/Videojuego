class_name DiscoveryPopup
extends Control
## Cinematic card for Rare+ discoveries and level-ups: rotating light rays,
## rarity-coloured glow, scaling icon and a rarity-specific sound.
## Does not pause the game; tap to dismiss or it fades out by itself.

signal finished

var info := {}
var _t := 0.0
var _col := Color.WHITE
var _rays := 12
var _done := false
var _card: VBoxContainer
var _icon: IconDraw
var _duration := 3.8

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	_card = VBoxContainer.new()
	_card.alignment = BoxContainer.ALIGNMENT_CENTER
	_card.add_theme_constant_override("separation", 6)
	_card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_card)
	_card.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_card.offset_bottom = -60
	if info.type == "item":
		var def := GameDB.item(info.id)
		_col = GameDB.rarity_color(def.rarity)
		_rays = 8 + def.rarity * 3
		_duration = 3.2 + def.rarity * 0.4
		var top := UIKit.label(("%s DISCOVERY" % GameDB.rarity_name(def.rarity)).to_upper(), 24, _col, UIKit.font_bold)
		top.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_card.add_child(top)
		_icon = IconDraw.new()
		_icon.icon = def.shape
		_icon.color = def.color
		_icon.glow = true
		_icon.custom_minimum_size = Vector2(150, 150)
		_icon.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		_card.add_child(_icon)
		var n := UIKit.title(def.name, 48)
		n.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_card.add_child(n)
		var d := UIKit.wrap_label(def.desc, 20, UIKit.TEXT)
		d.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		d.custom_minimum_size = Vector2(620, 0)
		_card.add_child(d)
		var xp := UIKit.label("+%d XP  ·  Added to your Collection" % GameDB.RARITY_XP[def.rarity], 18, UIKit.GOOD, UIKit.font_bold)
		xp.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_card.add_child(xp)
		match def.rarity:
			GameDB.Rarity.RARE: Audio.play("discover_rare", -2.0)
			GameDB.Rarity.EPIC: Audio.play("discover_epic", -1.0)
			_: Audio.play("discover_legendary", 0.0)
	else:
		_col = UIKit.CYAN
		_rays = 16
		var top2 := UIKit.label("LEVEL UP", 28, UIKit.CYAN, UIKit.font_bold)
		top2.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_card.add_child(top2)
		var lv := UIKit.title(str(info.level), 120)
		lv.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_card.add_child(lv)
		var reward: String = GameDB.LEVEL_REWARDS.get(int(info.level), "Your explorer rank grows. Keep discovering.")
		var r := UIKit.wrap_label(reward, 24, UIKit.TEXT)
		r.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		r.custom_minimum_size = Vector2(620, 0)
		_card.add_child(r)
		Audio.play("level_up", -2.0)
	var tap := UIKit.label("tap to continue", 16, UIKit.TEXT_DIM, UIKit.font_med)
	tap.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_card.add_child(tap)
	modulate.a = 0.0
	_card.pivot_offset = get_viewport_rect().size / 2
	_card.scale = Vector2(0.7, 0.7)
	var tw := create_tween().set_parallel().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(self, "modulate:a", 1.0, 0.25)
	tw.tween_property(_card, "scale", Vector2.ONE, 0.45)

func _process(delta: float) -> void:
	_t += delta
	queue_redraw()
	if _icon:
		_icon.rotation = sin(_t * 2.0) * 0.06
	if _t > _duration:
		_dismiss()

func _gui_input(event: InputEvent) -> void:
	if (event is InputEventMouseButton and event.pressed) or (event is InputEventScreenTouch and event.pressed):
		if _t > 0.5:
			_dismiss()

func _draw() -> void:
	var c := size / 2 + Vector2(0, -90)
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.01, 0.01, 0.05, 0.55))
	var r := maxf(size.x, size.y)
	for i in _rays:
		var a := _t * 0.25 + i * TAU / _rays
		var w := 0.09
		var pts := PackedVector2Array([c, c + Vector2(cos(a - w), sin(a - w)) * r, c + Vector2(cos(a + w), sin(a + w)) * r])
		draw_colored_polygon(pts, Color(_col.r, _col.g, _col.b, 0.07))
	for k in 5:
		draw_circle(c, 60 + k * 26 + sin(_t * 3.0) * 6, Color(_col.r, _col.g, _col.b, 0.05))

func _dismiss() -> void:
	if _done:
		return
	_done = true
	var tw := create_tween()
	tw.tween_property(self, "modulate:a", 0.0, 0.35)
	await tw.finished
	finished.emit()
	queue_free()
