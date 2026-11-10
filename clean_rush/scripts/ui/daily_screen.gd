class_name DailyScreen
extends Control
## Optional daily missions (no timers, no penalties — just bonus coins).

var main
var arg


func _ready() -> void:
	_build()


func _build() -> void:
	for c in get_children():
		c.queue_free()
	Game.ensure_daily()
	var list := MiscScreens.list_screen(self, "Daily Missions", func(): main.goto("profile"))
	list.add_child(UIKit.wrap_label("Three optional missions every day. Progress counts from any contract. Missing a day never costs you anything.", 18, Color(1, 1, 1, 0.85), 900))
	var missions: Array = Game.state["daily"]["missions"]
	for i in missions.size():
		var m: Dictionary = missions[i]
		var prog := Game.daily_progress(m)
		var p := UIKit.panel(Color(UIKit.BLUE, 0.92), 22)
		var h := UIKit.hbox(14)
		p.add_child(h)
		h.add_child(UIKit.icon_rect(Data.ui_icon("calendar"), 64))
		var v := UIKit.vbox(6)
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(v)
		v.add_child(UIKit.label(String(m["text"]), 24, UIKit.WHITE))
		v.add_child(UIKit.progress(prog, UIKit.GREEN, 16))
		var cur := mini(int(Game.get_stat(m["stat"]) - float(m["base"])), int(m["target"]))
		v.add_child(UIKit.label("%d / %d" % [maxi(cur, 0), int(m["target"])], 18, UIKit.TURQ))
		var idx := i
		if m["claimed"]:
			h.add_child(UIKit.label("Claimed ✔", 22, UIKit.GREEN))
		else:
			var b := UIKit.button("Claim %d" % int(m["reward"]), UIKit.ORANGE, Vector2(200, 68), 22, func():
				if Game.claim_daily(idx):
					Audio.play("coin")
					main.show_toast("+%d coins" % int(m["reward"]), "good")
					_build())
			b.disabled = prog < 1.0
			h.add_child(b)
		list.add_child(p)
