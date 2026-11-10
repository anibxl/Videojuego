extends BasePanel
## Player profile: level, stats, abilities and achievements.

func _init() -> void:
	super()
	title_text = "Explorer Profile"
	subtitle_text = "Your legacy in Afterlight"

func build(c: VBoxContainer) -> void:
	var h := HBoxContainer.new()
	h.size_flags_vertical = Control.SIZE_EXPAND_FILL
	h.add_theme_constant_override("separation", 18)
	c.add_child(h)
	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.add_theme_constant_override("separation", 8)
	h.add_child(left)
	var lv := HBoxContainer.new()
	lv.add_theme_constant_override("separation", 16)
	left.add_child(lv)
	var badge := PanelContainer.new()
	badge.add_theme_stylebox_override("panel", UIKit.box(Color(0.3, 0.22, 0.85), 40, UIKit.CYAN, 3, 0))
	badge.custom_minimum_size = Vector2(80, 80)
	lv.add_child(badge)
	var ln := UIKit.title(str(Progression.level), 44)
	ln.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ln.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	badge.add_child(ln)
	var lvv := VBoxContainer.new()
	lvv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	lvv.alignment = BoxContainer.ALIGNMENT_CENTER
	lv.add_child(lvv)
	lvv.add_child(UIKit.label("EXPLORER LEVEL %d" % Progression.level, 24, Color.WHITE, UIKit.font_bold))
	var bar := UIKit.progress_bar(Progression.xp_ratio(), UIKit.CYAN, 10)
	lvv.add_child(bar)
	var nxt := "MAX LEVEL" if Progression.level >= GameDB.MAX_LEVEL else "%d / %d XP to Level %d" % [Progression.xp, GameDB.xp_to_next(Progression.level), Progression.level + 1]
	lvv.add_child(UIKit.label(nxt, 17, UIKit.TEXT_DIM, UIKit.font_med))
	left.add_child(UIKit.hsep())
	var stats := GridContainer.new()
	stats.columns = 2
	stats.add_theme_constant_override("h_separation", 24)
	left.add_child(stats)
	var unlocked := 0
	for f in ["mall", "underground", "lab", "rooftops", "core"]:
		if WorldState.is_floor_unlocked(f): unlocked += 1
	var cp := Inventory.collection_progress()
	var rows := [
		["Total XP", str(Progression.total_xp)],
		["Play time", UIKit.format_time(float(Progression.stats.get("play_time", 0.0)))],
		["Fragments collected", str(int(Progression.stats.get("fragments_total", 0)))],
		["Collection", "%d / %d" % [cp.x, cp.y]],
		["Locations discovered", "%d / %d" % [WorldState.discovered_locations.size(), GameDB.LOCATIONS.size()]],
		["Hidden places found", str(WorldState.hidden_locations_found())],
		["Floors unlocked", "%d / 5" % unlocked],
		["Missions completed", "%d / %d" % [Missions.completed.size(), GameDB.MISSIONS.size()]],
	]
	for r in rows:
		stats.add_child(UIKit.label(r[0], 19, UIKit.TEXT_DIM, UIKit.font_med))
		stats.add_child(UIKit.label(r[1], 19, Color.WHITE, UIKit.font_bold))
	left.add_child(UIKit.hsep())
	left.add_child(UIKit.label("ABILITIES", 18, UIKit.CYAN, UIKit.font_bold))
	for a in [[GameDB.LEVEL_SCANNER, "Pulse Scanner", "Reveal nearby collectibles"], [GameDB.LEVEL_DOUBLE_JUMP, "Light Step", "Double jump"], [GameDB.LEVEL_TRAIL, "Neon Trail", "Cosmetic trail"], [GameDB.LEVEL_MAGNET, "Fragment Magnet", "Fragments drift to you"]]:
		var have := Progression.level >= int(a[0])
		left.add_child(UIKit.label(("UNLOCKED · " if have else "Lv %d · " % a[0]) + "%s — %s" % [a[1], a[2]], 18, UIKit.GOOD if have else UIKit.TEXT_DIM, UIKit.font_semi))
	var right := VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(right)
	right.add_child(UIKit.label("ACHIEVEMENTS  %d / %d" % [Progression.achievements.size(), GameDB.ACHIEVEMENTS.size()], 18, UIKit.CYAN, UIKit.font_bold))
	var list := scroll_area(right)
	for id in GameDB.ACHIEVEMENTS:
		var a: Dictionary = GameDB.ACHIEVEMENTS[id]
		var got := Progression.achievements.has(id)
		var row := PanelContainer.new()
		row.add_theme_stylebox_override("panel", UIKit.box(Color(0.1, 0.1, 0.22, 0.9) if got else Color(0.06, 0.06, 0.13, 0.8), 12, Color(1.0, 0.75, 0.3, 0.5) if got else Color(0, 0, 0, 0), 1, 12))
		var rh := HBoxContainer.new()
		rh.add_theme_constant_override("separation", 12)
		row.add_child(rh)
		var ic := IconDraw.new()
		ic.icon = "trophy" if got else "lock"
		ic.color = UIKit.WARN if got else Color(0.35, 0.37, 0.55)
		ic.custom_minimum_size = Vector2(32, 32)
		rh.add_child(ic)
		var tv := VBoxContainer.new()
		tv.add_theme_constant_override("separation", -2)
		rh.add_child(tv)
		tv.add_child(UIKit.label(a.name, 20, Color.WHITE if got else UIKit.TEXT_DIM, UIKit.font_bold))
		tv.add_child(UIKit.label(a.desc, 16, UIKit.TEXT_DIM, UIKit.font_med))
		list.add_child(row)
	list.add_child(UIKit.spacer(6))
	list.add_child(UIKit.wrap_label("Friends, home visits and trading are planned online features — not available in this version.", 15))
