class_name SaveSlotsScreen
extends Control
## Three local save slots with character preview, level, money, playtime, last
## save date and progress. Create / continue / delete (with confirmation).
## A new game can only be created in an EMPTY slot, so nothing is overwritten.

var main
var arg
var _confirm_box: Control


func _ready() -> void:
	_build()


func _build() -> void:
	for c in get_children():
		c.queue_free()
	add_child(UIKit.backdrop(0.72))
	var v := UIKit.vbox(16)
	add_child(UIKit.fill_screen(v, 24))
	var h := UIKit.hbox(16)
	if Game.has_active_slot():
		h.add_child(UIKit.icon_button(Data.ui_icon("back"), UIKit.BLUE2, 68, func(): main.goto("menu")))
	var t := UIKit.label("Save Slots", 40, UIKit.WHITE)
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(t)
	h.add_child(UIKit.label("Progress is saved automatically on this device", 17, Color(1, 1, 1, 0.7)))
	v.add_child(h)
	var row := UIKit.hbox(18)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(row)
	for i in SaveStore.SLOTS:
		row.add_child(_card(i))
	v.add_child(UIKit.label("Local saves only: cloud sync is not available in this version.", 15, Color(1, 1, 1, 0.5), HORIZONTAL_ALIGNMENT_CENTER))


func _fmt_time(sec: float) -> String:
	var m := int(sec / 60.0)
	if m < 60:
		return "%d min" % m
	return "%dh %02dm" % [m / 60, m % 60]


func _fmt_date(unix: int) -> String:
	if unix <= 0:
		return "—"
	var bias := int(Time.get_time_zone_from_system().get("bias", 0)) * 60
	var d := Time.get_datetime_dict_from_unix_time(unix + bias)
	return "%04d-%02d-%02d %02d:%02d" % [d["year"], d["month"], d["day"], d["hour"], d["minute"]]


func _card(i: int) -> Control:
	var info := Game.slot_summary(i)
	var active := Game.current_slot == i
	var p := UIKit.panel(Color(UIKit.BLUE, 0.94) if not active else Color(0.06, 0.32, 0.42, 0.96), 26)
	p.custom_minimum_size = Vector2(380, 560)
	var c := UIKit.vbox(8)
	p.add_child(c)
	var head := UIKit.hbox(8)
	head.add_child(UIKit.label("SLOT %d" % (i + 1), 20, UIKit.TURQ))
	if active:
		head.add_child(UIKit.spacer())
		head.add_child(UIKit.label("ACTIVE", 18, UIKit.GOLD))
	c.add_child(head)
	if not info["exists"]:
		var empty := UIKit.vbox(10)
		empty.size_flags_vertical = Control.SIZE_EXPAND_FILL
		empty.alignment = BoxContainer.ALIGNMENT_CENTER
		empty.add_child(UIKit.label("Empty slot", 28, Color(1, 1, 1, 0.8), HORIZONTAL_ALIGNMENT_CENTER))
		empty.add_child(UIKit.wrap_label("Start a new career, create your character and get cleaning!", 17, Color(1, 1, 1, 0.65), 320))
		c.add_child(empty)
		c.add_child(UIKit.button("New game", UIKit.ORANGE, Vector2(340, 72), 26, func():
			Game.new_slot(i)
			main.goto("creator", {"mode": "new", "return_to": "menu"})))
		return p
	if info.get("damaged", false):
		c.add_child(UIKit.label("Damaged save", 26, UIKit.RED))
		c.add_child(UIKit.wrap_label("This save and its backup could not be read. The damaged file is kept; you can delete it to free the slot.", 17, UIKit.WHITE, 320))
		c.add_child(UIKit.spacer())
		c.add_child(UIKit.button("Delete", UIKit.RED.darkened(0.2), Vector2(340, 64), 22, func(): _ask_delete(i, "Damaged save")))
		return p
	var pv := CharacterPreview.new()
	pv.custom_minimum_size = Vector2(340, 230)
	pv.auto_rotate = true
	pv.interactive = false
	pv.zoom = 1.3
	pv.set_appearance(info["appearance"])
	c.add_child(pv)
	c.add_child(UIKit.label(String(info["name"]), 26, UIKit.WHITE))
	var r1 := UIKit.hbox(14)
	r1.add_child(UIKit.label("Level %d" % int(info["level"]), 20, UIKit.TURQ))
	r1.add_child(UIKit.money_chip(int(info["coins"]), 20))
	c.add_child(r1)
	c.add_child(UIKit.label("Playtime: " + _fmt_time(float(info["playtime"])), 17, Color(1, 1, 1, 0.85)))
	c.add_child(UIKit.label("Last saved: " + _fmt_date(int(info["saved_at"])), 17, Color(1, 1, 1, 0.85)))
	var pr := UIKit.hbox(8)
	pr.add_child(UIKit.label("Progress %d%%" % int(round(float(info["progress"]) * 100)), 17, UIKit.GOLD))
	c.add_child(pr)
	c.add_child(UIKit.progress(float(info["progress"]), UIKit.GOLD, 12))
	if info.get("recovered", false):
		c.add_child(UIKit.label("Restored from backup", 15, UIKit.ORANGE))
	c.add_child(UIKit.spacer())
	var b := UIKit.hbox(10)
	b.add_child(UIKit.button("Continue" if not active else "Play", UIKit.GREEN.darkened(0.1), Vector2(220, 66), 24, func():
		if not active:
			Game.save_game()
			if not Game.load_slot(i):
				main.show_toast("This save could not be loaded", "warn")
				_build()
				return
		main.goto("menu")))
	b.add_child(UIKit.button("Delete", UIKit.RED.darkened(0.25), Vector2(110, 66), 18, func(): _ask_delete(i, String(info["name"]))))
	c.add_child(b)
	return p


func _ask_delete(i: int, name: String) -> void:
	if _confirm_box:
		_confirm_box.queue_free()
	_confirm_box = Control.new()
	_confirm_box.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_confirm_box)
	_confirm_box.add_child(UIKit.backdrop(0.6))
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_confirm_box.add_child(center)
	var p := UIKit.panel(Color(UIKit.BLUE, 0.98), 26)
	p.custom_minimum_size = Vector2(560, 0)
	center.add_child(p)
	var v := UIKit.vbox(14)
	p.add_child(v)
	v.add_child(UIKit.label("Delete slot %d?" % (i + 1), 32, UIKit.WHITE, HORIZONTAL_ALIGNMENT_CENTER))
	v.add_child(UIKit.wrap_label("\"%s\" and its backup will be permanently deleted. This cannot be undone." % name, 19, Color(1, 1, 1, 0.85), 500))
	var h := UIKit.hbox(14)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	h.add_child(UIKit.button("Keep it", UIKit.BLUE2, Vector2(200, 66), 22, func():
		_confirm_box.queue_free()
		_confirm_box = null))
	h.add_child(UIKit.button("Delete forever", UIKit.RED.darkened(0.2), Vector2(240, 66), 22, func():
		Game.delete_slot(i)
		Audio.play("ui_back")
		main.show_toast("Slot %d deleted" % (i + 1), "warn")
		_build()))
	v.add_child(h)
