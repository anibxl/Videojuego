class_name MapSelectScreen
extends Control
## Location selection: cards with image, description, difficulty, completion,
## contracts and unlock requirements.

var main
var arg


func _ready() -> void:
	add_child(UIKit.backdrop(0.55))
	var v := UIKit.vbox(16)
	add_child(UIKit.fill_screen(v, 24))
	v.add_child(UIKit.header("Choose a Location", func(): main.goto("menu")))
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	v.add_child(scroll)
	var row := UIKit.hbox(18)
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.add_child(row)
	for map_id in Data.map_order:
		row.add_child(_card(map_id))


func _card(map_id: String) -> Control:
	var d := Data.map_def(map_id)
	var unlocked := Game.is_map_unlocked(map_id)
	var p := UIKit.panel(Color(UIKit.BLUE, 0.92), 24)
	p.custom_minimum_size = Vector2(330, 540)
	var v := UIKit.vbox(8)
	p.add_child(v)
	var img_holder := Control.new()
	img_holder.custom_minimum_size = Vector2(290, 170)
	v.add_child(img_holder)
	var img := UIKit.icon_rect(Data.icon(String(d.get("thumbnail", ""))), 170)
	img.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	img.set_anchors_preset(Control.PRESET_FULL_RECT)
	if not unlocked:
		img.modulate = Color(0.35, 0.35, 0.45)
	img_holder.add_child(img)
	if not unlocked:
		var lock := UIKit.icon_rect(Data.ui_icon("lock"), 72)
		lock.set_anchors_preset(Control.PRESET_CENTER)
		lock.position -= Vector2(36, 36)
		img_holder.add_child(lock)
	v.add_child(UIKit.label(String(d.get("name", map_id)), 28, UIKit.WHITE))
	var dh := UIKit.hbox(6)
	dh.add_child(UIKit.label("Difficulty", 16, Color(1, 1, 1, 0.7)))
	for i in 4:
		dh.add_child(UIKit.icon_rect(Data.ui_icon("drop" if i < int(d.get("difficulty", 1)) else "drop_empty"), 20))
	v.add_child(dh)
	var desc := UIKit.wrap_label(String(d.get("description", "")), 17, Color(1, 1, 1, 0.85), 290)
	desc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(desc)
	if unlocked:
		var comp := Game.map_completion(map_id)
		v.add_child(UIKit.label("Best clean: %d%%" % int(comp * 100.0), 18, UIKit.TURQ))
		v.add_child(UIKit.progress(comp, UIKit.TURQ, 12))
		var total: int = d.get("contracts", []).size()
		var done := Game.contracts_completed_count(map_id)
		var stars := 0
		for c in d.get("contracts", []):
			stars += int(Game.contract_record(c["id"]).get("stars", 0))
		var sh := UIKit.hbox(6)
		sh.add_child(UIKit.label("Contracts %d/%d" % [done, total], 18, UIKit.WHITE))
		sh.add_child(UIKit.spacer())
		sh.add_child(UIKit.icon_rect(Data.ui_icon("star"), 22))
		sh.add_child(UIKit.label("%d/%d" % [stars, total * 3], 18, UIKit.GOLD))
		v.add_child(sh)
		var found := 0
		for disc in d.get("discoveries", []):
			if Game.has_discovery(map_id, disc["id"]):
				found += 1
		v.add_child(UIKit.label("Discoveries %d/%d" % [found, d.get("discoveries", []).size()], 16, Color(1, 1, 1, 0.75)))
		v.add_child(UIKit.button("Select", UIKit.ORANGE, Vector2(290, 66), 26, func(): main.goto("contracts", map_id)))
	else:
		v.add_child(UIKit.label("LOCKED", 20, UIKit.ORANGE))
		v.add_child(UIKit.wrap_label(String(d.get("unlock", {}).get("text", "")), 18, UIKit.WHITE, 290))
		var prog := Game.unlock_progress_text(map_id)
		if prog != "":
			v.add_child(UIKit.label(prog, 18, UIKit.TURQ))
		var b := UIKit.button("Locked", Color(0.3, 0.35, 0.45), Vector2(290, 66), 24)
		b.disabled = true
		v.add_child(b)
	return p
