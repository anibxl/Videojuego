extends BasePanel
## Reading a note found in the world.

func _init() -> void:
	super()
	max_size = Vector2(720, 460)

func _ready() -> void:
	var def := GameDB.item(data.get("id", ""))
	title_text = def.get("name", "Note")
	subtitle_text = "Note added to your Collection Book"
	super()

func build(c: VBoxContainer) -> void:
	var def := GameDB.item(data.get("id", ""))
	var paper := PanelContainer.new()
	paper.add_theme_stylebox_override("panel", UIKit.box(Color(0.93, 0.9, 0.82), 10, Color(0.6, 0.55, 0.45), 1, 28))
	paper.size_flags_vertical = Control.SIZE_EXPAND_FILL
	c.add_child(paper)
	var l := UIKit.wrap_label(def.get("desc", ""), 26, Color(0.15, 0.13, 0.2))
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	paper.add_child(l)
	c.add_child(UIKit.accent_button("Close", close, Vector2(0, 56)))
