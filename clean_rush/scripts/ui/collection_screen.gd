class_name CollectionScreen
extends Control
## Collection book of hidden discoveries, grouped by location.

var main
var arg


func _ready() -> void:
	var all := Data.all_discoveries()
	var list := MiscScreens.list_screen(self, "Collection Book  %d / %d" % [Game.state["discoveries"].size(), all.size()], func(): main.goto("menu"))
	list.add_child(UIKit.wrap_label("Hidden treasures appear when you clean the dirt or leaves covering them. Walk over a sparkling item to collect it.", 18, Color(1, 1, 1, 0.85), 900))
	for map_id in Data.map_order:
		var d := Data.map_def(map_id)
		list.add_child(UIKit.label(String(d["name"]), 26, UIKit.TURQ))
		var row := UIKit.hbox(12)
		list.add_child(row)
		for disc in d.get("discoveries", []):
			var found := Game.has_discovery(map_id, disc["id"])
			var p := UIKit.panel(Color(UIKit.BLUE, 0.92) if found else Color(0.05, 0.1, 0.2, 0.85), 20)
			p.custom_minimum_size = Vector2(380, 150)
			var h := UIKit.hbox(12)
			p.add_child(h)
			var icon := UIKit.icon_rect(Data.item_icon(String(disc.get("model", "coin"))), 84)
			if not found:
				icon.modulate = Color(0, 0, 0, 0.7)
			h.add_child(icon)
			var v := UIKit.vbox(4)
			v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			h.add_child(v)
			v.add_child(UIKit.label(String(disc["name"]) if found else "???", 22, UIKit.GOLD if found else UIKit.WHITE))
			v.add_child(UIKit.wrap_label(String(disc.get("description", "")) if found else "Still hidden somewhere in %s." % d["name"], 16, Color(1, 1, 1, 0.8), 250))
			row.add_child(p)
