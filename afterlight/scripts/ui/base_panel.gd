class_name BasePanel
extends Control
## Common frame for every full-screen menu: dimmed backdrop, rounded card,
## title bar with close button, animated open/close. Subclasses implement
## `build(content)` and may call `rebuild()` to refresh.

signal closed

var title_text := ""
var subtitle_text := ""
var data := {}
var hud: Node              # the HUD that opened this panel (null in main menu)
var card: PanelContainer
var content: VBoxContainer
var header_extra: HBoxContainer
var max_size := Vector2(1120, 660)
var _closing := false

func _init() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	theme = UIKit.theme()

func _ready() -> void:
	var dim := ColorRect.new()
	dim.color = Color(0.01, 0.01, 0.04, 0.72)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(dim)
	card = PanelContainer.new()
	card.add_theme_stylebox_override("panel", UIKit.box(UIKit.PANEL, 24, Color(0.45, 0.5, 1.0, 0.3), 1, 26))
	add_child(card)
	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 12)
	card.add_child(outer)
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 14)
	outer.add_child(head)
	var tbox := VBoxContainer.new()
	tbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tbox.add_theme_constant_override("separation", -4)
	head.add_child(tbox)
	var t := UIKit.title(title_text, 36)
	tbox.add_child(t)
	if subtitle_text != "":
		tbox.add_child(UIKit.label(subtitle_text, 18, UIKit.TEXT_DIM, UIKit.font_med))
	header_extra = HBoxContainer.new()
	header_extra.add_theme_constant_override("separation", 10)
	head.add_child(header_extra)
	head.add_child(UIKit.icon_button("close", close, 52.0, "Close"))
	outer.add_child(UIKit.hsep())
	content = VBoxContainer.new()
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 10)
	outer.add_child(content)
	build(content)
	_layout()
	get_viewport().size_changed.connect(_layout)
	# open animation
	card.pivot_offset = card.size / 2
	card.modulate.a = 0.0
	card.scale = Vector2(0.96, 0.96)
	var tw := create_tween().set_parallel().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(card, "modulate:a", 1.0, 0.18)
	tw.tween_property(card, "scale", Vector2.ONE, 0.22)
	Audio.play("ui_open", -6.0)

func _layout() -> void:
	var vs := get_viewport_rect().size
	var s := Vector2(minf(max_size.x, vs.x - 32), minf(max_size.y, vs.y - 24))
	card.custom_minimum_size = s
	card.size = s
	card.position = (vs - s) / 2
	card.pivot_offset = s / 2

func build(_c: VBoxContainer) -> void:
	pass

func rebuild() -> void:
	for ch in content.get_children():
		ch.queue_free()
	build(content)

func close() -> void:
	if _closing:
		return
	_closing = true
	Audio.play("ui_back", -6.0)
	var tw := create_tween().set_parallel()
	tw.tween_property(card, "modulate:a", 0.0, 0.12)
	tw.tween_property(card, "scale", Vector2(0.97, 0.97), 0.12)
	await tw.finished
	closed.emit()
	queue_free()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause") or event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		close()

## Scrollable area helper for long lists.
func scroll_area(parent: Control) -> VBoxContainer:
	var sc := ScrollContainer.new()
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	parent.add_child(sc)
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 10)
	sc.add_child(v)
	return v

## Tab strip helper: returns HBox of toggle buttons.
func tabs(parent: Control, names: Array, current: int, on_pick: Callable) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	parent.add_child(h)
	for i in names.size():
		var b := UIKit.button(names[i], func(): on_pick.call(i), Vector2(0, 46))
		if i == current:
			b.add_theme_stylebox_override("normal", UIKit.box(Color(0.3, 0.22, 0.85), 12, UIKit.CYAN, 1, 16))
		h.add_child(b)
	return h
