extends BasePanel
## INVENTORY — what the player owns right now. Cosmetics can be equipped
## from here. (The Collection Book is a separate record of discoveries.)

var _selected := ""

func _init() -> void:
	super()
	title_text = "Inventory"
	subtitle_text = "Items you are carrying"

func _ready() -> void:
	super()
	var frag := HBoxContainer.new()
	frag.add_theme_constant_override("separation", 6)
	var ic := IconDraw.new()
	ic.icon = "fragment"
	ic.color = UIKit.CYAN
	ic.custom_minimum_size = Vector2(26, 26)
	frag.add_child(ic)
	frag.add_child(UIKit.label("%d Energy Fragments" % Inventory.fragments, 22, UIKit.CYAN, UIKit.font_bold))
	header_extra.add_child(frag)

func build(c: VBoxContainer) -> void:
	var owned := Inventory.owned_ids(["artifact", "key", "cosmetic"])
	if _selected == "" and not owned.is_empty():
		_selected = owned[0]
	var h := HBoxContainer.new()
	h.size_flags_vertical = Control.SIZE_EXPAND_FILL
	h.add_theme_constant_override("separation", 18)
	c.add_child(h)
	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_stretch_ratio = 1.5
	h.add_child(left)
	var list := scroll_area(left)
	if owned.is_empty():
		list.add_child(UIKit.wrap_label("Your bag is empty. Artifacts you find in Afterlight will appear here.", 20))
	var g := ItemWidgets.grid(4)
	list.add_child(g)
	for id in owned:
		var iid: String = id
		g.add_child(ItemWidgets.tile(iid, true, iid == _selected, func(): _selected = iid; rebuild(), int(Inventory.items[iid])))
	# Neon trail (level reward cosmetic)
	if Progression.level >= GameDB.LEVEL_TRAIL:
		var t := UIKit.button("Neon Trail: %s" % ("ON" if Inventory.equipped.get("trail", false) else "OFF"), func():
			Inventory.equip("trail", not Inventory.equipped.get("trail", false))
			rebuild(), Vector2(0, 50))
		list.add_child(t)
	var right := PanelContainer.new()
	right.add_theme_stylebox_override("panel", UIKit.box(Color(0.05, 0.05, 0.13, 0.9), 18, Color(0.5, 0.55, 1.0, 0.2), 1, 18))
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(right)
	var rv := VBoxContainer.new()
	rv.add_theme_constant_override("separation", 10)
	right.add_child(rv)
	if _selected == "":
		rv.add_child(UIKit.wrap_label("Select an item to inspect it.", 20))
		return
	rv.add_child(ItemWidgets.detail(_selected, true))
	var def := GameDB.item(_selected)
	if def.category == "cosmetic":
		var slot: String = def.slot
		var on: bool = Inventory.equipped.get(slot, "") == _selected
		rv.add_child(UIKit.accent_button("Unequip" if on else "Equip", func():
			Inventory.equip(slot, "" if on else _selected)
			rebuild(), Vector2(0, 56)))
	elif def.category == "key":
		rv.add_child(UIKit.wrap_label("Key item — used automatically where it's needed.", 17, UIKit.WARN))
	else:
		rv.add_child(UIKit.wrap_label("Tip: show this artifact on a display stand in your apartment.", 17, UIKit.TEXT_DIM))
