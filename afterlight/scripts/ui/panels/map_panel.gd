extends BasePanel
## Location overview: top-down map of the current floor (generated from the
## floor's real geometry) with the player, the elevator and discovered
## places, plus a list of floors and their status.

func _init() -> void:
	super()
	title_text = "Map"

func _ready() -> void:
	var f := GameDB.floor_def(WorldState.current_floor)
	subtitle_text = "%s  ·  %s" % [f.get("name", ""), f.get("subtitle", "")]
	super()

func build(c: VBoxContainer) -> void:
	var h := HBoxContainer.new()
	h.size_flags_vertical = Control.SIZE_EXPAND_FILL
	h.add_theme_constant_override("separation", 18)
	c.add_child(h)
	var map := MapView.new()
	map.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	map.size_flags_stretch_ratio = 1.8
	if hud and hud.game:
		map.floor_node = hud.game.current_floor
		map.player = hud.game.player
	h.add_child(map)
	var right := VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 6)
	h.add_child(right)
	right.add_child(UIKit.label("PLACES ON THIS FLOOR", 17, UIKit.CYAN, UIKit.font_bold))
	var places := scroll_area(right)
	var total := 0
	var found := 0
	for id in GameDB.LOCATIONS:
		var l: Dictionary = GameDB.LOCATIONS[id]
		if l.floor != WorldState.current_floor:
			continue
		total += 1
		var known := WorldState.discovered_locations.has(id)
		if known: found += 1
		var txt: String = l.name if known else ("???  (hidden)" if l.hidden else "???")
		places.add_child(UIKit.label(("•  " if known else "-  ") + txt, 19, Color.WHITE if known else UIKit.TEXT_DIM, UIKit.font_semi))
	places.add_child(UIKit.label("%d / %d discovered" % [found, total], 16, UIKit.TEXT_DIM, UIKit.font_med))
	places.add_child(UIKit.spacer(6))
	places.add_child(UIKit.label("FLOORS", 17, UIKit.CYAN, UIKit.font_bold))
	for f in GameDB.FLOORS:
		var unlocked := WorldState.is_floor_unlocked(f.id)
		var col := UIKit.WARN if f.id == WorldState.current_floor else (UIKit.TEXT if unlocked else UIKit.TEXT_DIM)
		places.add_child(UIKit.label("%s  %s%s" % [f.label, f.name, "" if unlocked else "  (locked)"], 18, col, UIKit.font_semi))

class MapView extends Control:
	var floor_node: Node
	var player: Node3D
	var _t := 0.0

	func _ready() -> void:
		custom_minimum_size = Vector2(300, 300)
		clip_contents = true

	func _process(d: float) -> void:
		_t += d
		queue_redraw()

	func _draw() -> void:
		draw_style_box(UIKit.box(Color(0.03, 0.035, 0.09, 1.0), 18, Color(0.5, 0.55, 1.0, 0.2), 1, 0), Rect2(Vector2.ZERO, size))
		if floor_node == null or not is_instance_valid(floor_node):
			return
		var b: Rect2 = floor_node.map_bounds
		if b.size.x < 1.0:
			return
		b = b.grow(4.0)
		var pad := 16.0
		var sc := minf((size.x - pad * 2) / b.size.x, (size.y - pad * 2) / b.size.y)
		var off := (size - b.size * sc) / 2.0
		var tf := func(p: Vector2) -> Vector2: return off + (p - b.position) * sc
		# grid
		for i in 12:
			var x := size.x * i / 12.0
			draw_line(Vector2(x, 0), Vector2(x, size.y), Color(0.3, 0.4, 0.8, 0.05), 1.0)
			var y := size.y * i / 12.0
			draw_line(Vector2(0, y), Vector2(size.x, y), Color(0.3, 0.4, 0.8, 0.05), 1.0)
		for r in floor_node.map_rects:
			var rr: Rect2 = r.r
			var p0: Vector2 = tf.call(rr.position)
			var rect := Rect2(p0, rr.size * sc)
			var col: Color = r.c
			draw_rect(rect, Color(col.r, col.g, col.b, col.a * 0.55))
			if r.has("elevator"):
				draw_rect(rect, UIKit.CYAN, false, 2.0)
		# discovered locations
		for z in floor_node.get_children():
			if z is DiscoveryZone and WorldState.discovered_locations.has(z.location_id):
				var p: Vector2 = tf.call(Vector2(z.global_position.x, z.global_position.z))
				var hidden: bool = GameDB.LOCATIONS[z.location_id].hidden
				var col2 := UIKit.WARN if hidden else UIKit.CYAN
				draw_circle(p, 6, col2)
				draw_string(UIKit.font_bold, p + Vector2(10, 6), GameDB.LOCATIONS[z.location_id].name, HORIZONTAL_ALIGNMENT_LEFT, -1, 16, col2.lerp(Color.WHITE, 0.4))
		# player arrow
		if player and is_instance_valid(player):
			var pp: Vector2 = tf.call(Vector2(player.global_position.x, player.global_position.z))
			var yaw: float = player.model.rotation.y
			var fwd := Vector2(-sin(yaw), -cos(yaw))
			var side := Vector2(fwd.y, -fwd.x)
			var pulse := 1.0 + sin(_t * 4.0) * 0.15
			draw_circle(pp, 14 * pulse, Color(1.0, 0.45, 0.7, 0.2))
			draw_colored_polygon(PackedVector2Array([pp + fwd * 12, pp - fwd * 7 + side * 8, pp - fwd * 3, pp - fwd * 7 - side * 8]), Color(1.0, 0.5, 0.75))
