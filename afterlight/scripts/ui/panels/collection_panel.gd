extends BasePanel
## COLLECTION BOOK — every collectible in the game. Unknown entries are shown
## as silhouettes so players can see what remains to be found.

var _tab := 0
var _selected := ""

func _init() -> void:
	super()
	title_text = "Collection Book"

func _ready() -> void:
	var p := Inventory.collection_progress()
	subtitle_text = "%d of %d discovered" % [p.x, p.y]
	super()

func build(c: VBoxContainer) -> void:
	tabs(c, ["Artifacts", "Notes"], _tab, func(i): _tab = i; _selected = ""; rebuild())
	var cats := ["artifact", "key", "cosmetic"] if _tab == 0 else ["note"]
	var ids := GameDB.items_by_category(cats)
	ids.sort_custom(func(a, b): return GameDB.ITEMS[a].rarity < GameDB.ITEMS[b].rarity if GameDB.ITEMS[a].rarity != GameDB.ITEMS[b].rarity else a < b)
	var known_n := 0
	for id in ids:
		if Inventory.is_discovered(id): known_n += 1
	var prog := HBoxContainer.new()
	prog.add_theme_constant_override("separation", 12)
	c.add_child(prog)
	var bar := UIKit.progress_bar(float(known_n) / maxf(1.0, ids.size()), UIKit.CYAN, 10)
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	prog.add_child(bar)
	prog.add_child(UIKit.label("%d / %d" % [known_n, ids.size()], 20, UIKit.CYAN, UIKit.font_bold))
	var h := HBoxContainer.new()
	h.size_flags_vertical = Control.SIZE_EXPAND_FILL
	h.add_theme_constant_override("separation", 18)
	c.add_child(h)
	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_stretch_ratio = 1.5
	h.add_child(left)
	var list := scroll_area(left)
	var g := ItemWidgets.grid(4)
	list.add_child(g)
	for id in ids:
		var iid: String = id
		g.add_child(ItemWidgets.tile(iid, Inventory.is_discovered(iid), iid == _selected, func(): _selected = iid; rebuild()))
	var right := PanelContainer.new()
	right.add_theme_stylebox_override("panel", UIKit.box(Color(0.05, 0.05, 0.13, 0.9), 18, Color(0.5, 0.55, 1.0, 0.2), 1, 18))
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(right)
	var rs := ScrollContainer.new()
	rs.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	right.add_child(rs)
	var rv := VBoxContainer.new()
	rv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rs.add_child(rv)
	if _selected == "":
		var legend := VBoxContainer.new()
		legend.add_theme_constant_override("separation", 6)
		legend.add_child(UIKit.label("RARITY", 18, UIKit.CYAN, UIKit.font_bold))
		for r in 6:
			var row := HBoxContainer.new()
			row.add_theme_constant_override("separation", 10)
			var dot := IconDraw.new()
			dot.icon = "orb"
			dot.color = GameDB.rarity_color(r)
			dot.custom_minimum_size = Vector2(20, 20)
			row.add_child(dot)
			row.add_child(UIKit.label(GameDB.rarity_name(r), 20, GameDB.rarity_color(r), UIKit.font_bold))
			legend.add_child(row)
		legend.add_child(UIKit.spacer(8))
		legend.add_child(UIKit.wrap_label("Discoveries are never random. Rarer objects are hidden deeper, behind puzzles, secrets and challenges.", 17))
		rv.add_child(legend)
	else:
		rv.add_child(ItemWidgets.detail(_selected, Inventory.is_discovered(_selected)))
