extends BasePanel
## Personal room terminal: unlock & place decorations (spending fragments)
## and choose which artifacts appear on the display stands.

var _tab := 0

func _init() -> void:
	super()
	title_text = "Home Terminal"
	subtitle_text = "Decorate your apartment and show off your finds"

func _ready() -> void:
	_tab = int(data.get("tab", 0))
	super()

func build(c: VBoxContainer) -> void:
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 12)
	c.add_child(top)
	var t := tabs(top, ["Decorations", "Display Stands"], _tab, func(i): _tab = i; rebuild())
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(UIKit.label("%d Fragments" % Inventory.fragments, 22, UIKit.CYAN, UIKit.font_bold))
	var list := scroll_area(c)
	if _tab == 0:
		for id in GameDB.DECOR_ORDER:
			list.add_child(_decor_row(id))
	else:
		var owned := Inventory.owned_ids(["artifact", "key", "cosmetic"])
		if owned.is_empty():
			list.add_child(UIKit.wrap_label("Find artifacts in Afterlight to display them here.", 20))
		for i in GameDB.DISPLAY_SLOTS:
			list.add_child(_slot_row(i, owned))

func _decor_row(id: String) -> Control:
	var d: Dictionary = GameDB.DECOR[id]
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UIKit.box(Color(0.09, 0.09, 0.2, 0.95), 14, Color(0.5, 0.55, 1.0, 0.2), 1, 14))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 14)
	p.add_child(h)
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 0)
	h.add_child(v)
	v.add_child(UIKit.label(d.name, 22, Color.WHITE, UIKit.font_bold))
	v.add_child(UIKit.label(d.desc, 17, UIKit.TEXT_DIM, UIKit.font_med))
	var unlocked := WorldState.is_decor_unlocked(id)
	var reason := WorldState.decor_lock_reason(id)
	if unlocked:
		var placed := WorldState.placed_decor.has(id)
		h.add_child(UIKit.button("Remove" if placed else "Place", func():
			WorldState.set_decor_placed(id, not placed)
			Audio.play("puzzle_ok", -6.0)
			rebuild(), Vector2(130, 50)))
	elif reason != "":
		h.add_child(UIKit.label(reason, 17, UIKit.BAD.lightened(0.3), UIKit.font_semi))
	else:
		var cost := int(d.cost)
		var b := UIKit.accent_button("Unlock · %d" % cost if cost > 0 else "Unlock · Free", func():
			if WorldState.unlock_decor(id):
				WorldState.set_decor_placed(id, true)
				Audio.play("success", -6.0)
				Events.notify("Unlocked: " + d.name, UIKit.GOOD)
			rebuild(), Vector2(170, 50))
		b.disabled = Inventory.fragments < cost
		h.add_child(b)
	return p

func _slot_row(i: int, owned: Array) -> Control:
	var cur: String = WorldState.display_slots[i]
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UIKit.box(Color(0.09, 0.09, 0.2, 0.95), 14, Color(0.5, 0.55, 1.0, 0.2), 1, 12))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 12)
	p.add_child(h)
	h.add_child(UIKit.label("Stand %d" % (i + 1), 20, UIKit.TEXT_DIM, UIKit.font_bold))
	var ic := IconDraw.new()
	ic.custom_minimum_size = Vector2(44, 44)
	if cur != "":
		ic.icon = GameDB.item(cur).shape
		ic.color = GameDB.item(cur).color
	else:
		ic.icon = "orb"
		ic.silhouette = true
	h.add_child(ic)
	var n := UIKit.label(GameDB.item(cur).name if cur != "" else "Empty", 21, Color.WHITE if cur != "" else UIKit.TEXT_DIM, UIKit.font_bold)
	n.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(n)
	if owned.is_empty():
		return p
	var idx := owned.find(cur)
	h.add_child(UIKit.button("<", func():
		var j := (idx - 1 + owned.size() + 1) % (owned.size() + 1) - 1 if idx >= 0 else owned.size() - 1
		WorldState.set_display_slot(i, owned[j] if j >= 0 else "")
		rebuild(), Vector2(56, 50)))
	h.add_child(UIKit.button(">", func():
		var j := idx + 1
		WorldState.set_display_slot(i, owned[j] if j < owned.size() else "")
		rebuild(), Vector2(56, 50)))
	return p
