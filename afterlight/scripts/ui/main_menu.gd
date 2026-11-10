extends Node3D
## Main menu: the real city rendered behind the UI with a slow cinematic
## orbit, the AFTERLIGHT logo, save summary and collection preview.

var _cam: Camera3D
var _t := 0.0
var _ui: CanvasLayer
var _root: Control
var _logo: Label
var _panel_layer: Control
var _bg_floor: FloorBase

func _ready() -> void:
	get_tree().paused = false
	SaveSystem.in_game = false
	SaveSystem.load_game()
	# background: the actual city
	_bg_floor = load("res://scripts/world/floors/city.gd").new()
	_bg_floor.floor_id = "menu_bg"
	add_child(_bg_floor)
	_bg_floor.build()
	_bg_floor.apply_graphics(Settings.graphics)
	_cam = Camera3D.new()
	_cam.fov = 60
	_cam.far = 400
	add_child(_cam)
	_cam.current = true
	_build_ui()
	Audio.play_music("music_theme", -6.0)
	Audio.play_ambience("amb_city", -14.0)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	get_viewport().scaling_3d_scale = [0.7, 0.85, 1.0][Settings.graphics]

func _process(delta: float) -> void:
	_t += delta
	var a := _t * 0.05 + 0.6
	_cam.position = Vector3(cos(a) * 34, 9 + sin(_t * 0.2) * 1.5, sin(a) * 34)
	_cam.look_at(Vector3(0, 14 + sin(_t * 0.15) * 2, -30), Vector3.UP)
	if _logo:
		var g := 0.85 + 0.15 * sin(_t * 1.6)
		_logo.add_theme_color_override("font_shadow_color", Color(UIKit.CYAN.r, UIKit.CYAN.g, UIKit.CYAN.b, 0.35 * g))

func _build_ui() -> void:
	_ui = CanvasLayer.new()
	_ui.layer = 5
	add_child(_ui)
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.theme = UIKit.theme()
	_ui.add_child(_root)
	# left gradient for readability
	var grad := TextureRect.new()
	var gt := GradientTexture2D.new()
	var g := Gradient.new()
	g.set_color(0, Color(0.02, 0.02, 0.07, 0.92))
	g.set_color(1, Color(0.02, 0.02, 0.07, 0.0))
	gt.gradient = g
	gt.fill_to = Vector2(1, 0)
	gt.width = 256
	gt.height = 4
	grad.texture = gt
	grad.stretch_mode = TextureRect.STRETCH_SCALE
	grad.set_anchors_preset(Control.PRESET_LEFT_WIDE)
	grad.offset_right = 760
	grad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(grad)
	var left := VBoxContainer.new()
	left.set_anchors_preset(Control.PRESET_LEFT_WIDE)
	left.offset_left = 64
	left.offset_right = 520
	left.offset_top = 40
	left.offset_bottom = -30
	left.alignment = BoxContainer.ALIGNMENT_CENTER
	left.add_theme_constant_override("separation", 12)
	_root.add_child(left)
	_logo = UIKit.title("AFTERLIGHT", 96)
	_logo.add_theme_color_override("font_color", Color(0.85, 0.97, 1.0))
	_logo.add_theme_constant_override("shadow_offset_x", 0)
	_logo.add_theme_constant_override("shadow_offset_y", 0)
	_logo.add_theme_constant_override("shadow_outline_size", 28)
	left.add_child(_logo)
	var tag := UIKit.label("EXPLORE THE UNKNOWN.  BUILD YOUR LEGACY.", 22, UIKit.CYAN, UIKit.font_semi)
	left.add_child(tag)
	left.add_child(UIKit.spacer(18))
	var has_save := SaveSystem.has_save()
	if has_save:
		var cont := UIKit.accent_button("CONTINUE", _continue, Vector2(380, 66))
		left.add_child(cont)
		var s := SaveSystem.summary()
		if not s.is_empty():
			var f := GameDB.floor_def(s.floor)
			left.add_child(UIKit.label("Level %d  ·  %d discoveries  ·  %s  ·  %s" % [s.level, s.discovered, UIKit.format_time(s.play_time), f.get("name", "")], 17, UIKit.TEXT_DIM, UIKit.font_med))
	var ng := UIKit.button("NEW GAME", _new_game, Vector2(380, 58)) if has_save else UIKit.accent_button("PLAY", _new_game, Vector2(380, 66))
	left.add_child(ng)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	left.add_child(row)
	for e in [["COLLECTION", "collection"], ["PROFILE", "profile"], ["SETTINGS", "settings"]]:
		var key: String = e[1]
		var b := UIKit.button(e[0], func(): _open(key), Vector2(120, 54))
		b.add_theme_font_size_override("font_size", 18)
		row.add_child(b)
	if not OS.has_feature("mobile") and not OS.has_feature("web"):
		var q := UIKit.button("QUIT", func(): get_tree().quit(), Vector2(380, 50))
		q.add_theme_color_override("font_color", UIKit.TEXT_DIM)
		left.add_child(q)
	left.add_child(UIKit.spacer(10))
	var foot := UIKit.label("v%s  ·  Offline single-player  ·  Online features planned for a future update" % ProjectSettings.get_setting("application/config/version", "0.1.0"), 15, UIKit.TEXT_DIM, UIKit.font_med)
	left.add_child(foot)
	_build_collection_preview()
	_panel_layer = Control.new()
	_panel_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	_panel_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(_panel_layer)
	# entrance animation
	left.modulate.a = 0.0
	left.position.x -= 30
	var tw := create_tween().set_parallel().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(left, "modulate:a", 1.0, 1.0).set_delay(0.3)
	tw.tween_property(left, "position:x", left.position.x + 30, 1.0).set_delay(0.3)

func _build_collection_preview() -> void:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", UIKit.box(Color(0.04, 0.045, 0.11, 0.78), 20, Color(0.5, 0.55, 1.0, 0.25), 1, 18))
	card.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	card.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	card.grow_vertical = Control.GROW_DIRECTION_BEGIN
	card.offset_right = -32
	card.offset_bottom = -32
	_root.add_child(card)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	card.add_child(v)
	var p := Inventory.collection_progress()
	var h := HBoxContainer.new()
	v.add_child(h)
	var t := UIKit.label("COLLECTION", 18, UIKit.CYAN, UIKit.font_bold)
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(t)
	h.add_child(UIKit.label("%d / %d" % [p.x, p.y], 18, Color.WHITE, UIKit.font_bold))
	var icons := HBoxContainer.new()
	icons.add_theme_constant_override("separation", 8)
	v.add_child(icons)
	var showcase := ["m_afterlight", "l_prism_dawn", "l_prism_dusk", "l_prism_night", "e_neon_crown", "e_compass", "r_holo_koi"]
	for id in showcase:
		var def := GameDB.item(id)
		var ic := IconDraw.new()
		ic.icon = def.shape
		ic.color = def.color
		ic.silhouette = not Inventory.is_discovered(id)
		ic.glow = not ic.silhouette
		ic.custom_minimum_size = Vector2(44, 44)
		ic.tooltip_text = def.name if not ic.silhouette else "???"
		icons.add_child(ic)
	v.add_child(UIKit.progress_bar(float(p.x) / p.y, UIKit.CYAN, 6))
	var b := UIKit.button("Open Collection Book", func(): _open("collection"), Vector2(0, 44))
	b.add_theme_font_size_override("font_size", 18)
	v.add_child(b)

func _open(key: String) -> void:
	if _panel_layer.get_child_count() > 0:
		return
	var scripts := {"collection": "res://scripts/ui/panels/collection_panel.gd", "profile": "res://scripts/ui/panels/profile_panel.gd", "settings": "res://scripts/ui/panels/settings_panel.gd"}
	var p: BasePanel = load(scripts[key]).new()
	_panel_layer.add_child(p)

func _continue() -> void:
	SaveSystem.load_game()
	Router.go_to("res://scenes/main/game.tscn", "Entering Afterlight City")

func _new_game() -> void:
	if SaveSystem.has_save():
		var d := ConfirmationDialog.new()
		d.title = "Start a new game?"
		d.dialog_text = "Your current progress will be erased. Settings are kept."
		d.ok_button_text = "Start New Game"
		d.theme = UIKit.theme()
		_root.add_child(d)
		d.confirmed.connect(_start_fresh)
		d.popup_centered(Vector2i(560, 200))
	else:
		_start_fresh()

func _start_fresh() -> void:
	SaveSystem.delete_save()
	Router.go_to("res://scenes/main/game.tscn", "A city without light")
