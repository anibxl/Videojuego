class_name IconDraw
extends Control
## Resolution-independent vector icons drawn at runtime (no bitmap assets),
## so they stay crisp on every phone DPI. Covers both UI icons and the
## collectible "shapes" shown in the inventory and collection book.

@export var icon := "star"
@export var color := Color(0.93, 0.95, 1.0)
@export var silhouette := false     # unknown collectibles render as a dark shape
@export var glow := false

func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func set_icon(i: String, c: Color = color) -> void:
	icon = i
	color = c
	queue_redraw()

func _draw() -> void:
	var s := minf(size.x, size.y)
	if s <= 1.0:
		return
	var o := (size - Vector2(s, s)) / 2.0
	var c := Color(0.16, 0.17, 0.3) if silhouette else color
	if glow and not silhouette:
		draw_circle(o + Vector2(s, s) / 2, s * 0.5, Color(c.r, c.g, c.b, 0.12))
		draw_circle(o + Vector2(s, s) / 2, s * 0.38, Color(c.r, c.g, c.b, 0.12))
	var w := maxf(2.0, s * 0.09)
	var P := func(x: float, y: float) -> Vector2: return o + Vector2(x, y) * s
	match icon:
		# ---------------- UI ICONS
		"pause":
			draw_rect(Rect2(P.call(0.22, 0.15), Vector2(0.2, 0.7) * s), c)
			draw_rect(Rect2(P.call(0.58, 0.15), Vector2(0.2, 0.7) * s), c)
		"map":
			var pts := PackedVector2Array([P.call(0.05, 0.2), P.call(0.35, 0.08), P.call(0.65, 0.2), P.call(0.95, 0.08),
				P.call(0.95, 0.8), P.call(0.65, 0.92), P.call(0.35, 0.8), P.call(0.05, 0.92), P.call(0.05, 0.2)])
			draw_polyline(pts, c, w, true)
			draw_line(P.call(0.35, 0.08), P.call(0.35, 0.8), c, w * 0.7, true)
			draw_line(P.call(0.65, 0.2), P.call(0.65, 0.92), c, w * 0.7, true)
		"bag":
			draw_rect(Rect2(P.call(0.12, 0.32), Vector2(0.76, 0.6) * s), c, false, w)
			draw_arc(P.call(0.5, 0.32), s * 0.2, PI, TAU, 16, c, w, true)
			draw_line(P.call(0.12, 0.52), P.call(0.88, 0.52), c, w * 0.7, true)
		"missions":
			for i in 3:
				var y := 0.2 + i * 0.3
				draw_circle(P.call(0.14, y), s * 0.07, c)
				draw_line(P.call(0.32, y), P.call(0.92, y), c, w, true)
		"book":
			draw_rect(Rect2(P.call(0.12, 0.1), Vector2(0.76, 0.8) * s), c, false, w)
			draw_line(P.call(0.3, 0.1), P.call(0.3, 0.9), c, w * 0.8, true)
			draw_line(P.call(0.45, 0.35), P.call(0.75, 0.35), c, w * 0.6, true)
			draw_line(P.call(0.45, 0.5), P.call(0.75, 0.5), c, w * 0.6, true)
		"profile":
			draw_circle(P.call(0.5, 0.3), s * 0.18, c)
			draw_arc(P.call(0.5, 0.95), s * 0.38, PI, TAU, 20, c, w * 1.6, true)
		"gear":
			draw_arc(P.call(0.5, 0.5), s * 0.24, 0, TAU, 24, c, w * 1.2, true)
			for i in 8:
				var a := i * TAU / 8.0
				draw_line(P.call(0.5, 0.5) + Vector2(cos(a), sin(a)) * s * 0.3, P.call(0.5, 0.5) + Vector2(cos(a), sin(a)) * s * 0.45, c, w * 1.4, true)
		"jump":
			draw_colored_polygon(PackedVector2Array([P.call(0.5, 0.08), P.call(0.9, 0.5), P.call(0.65, 0.5), P.call(0.65, 0.9), P.call(0.35, 0.9), P.call(0.35, 0.5), P.call(0.1, 0.5)]), c)
		"hand", "interact":
			draw_arc(P.call(0.5, 0.5), s * 0.42, 0, TAU, 28, c, w, true)
			draw_circle(P.call(0.5, 0.5), s * 0.16, c)
		"scan":
			draw_arc(P.call(0.5, 0.5), s * 0.42, 0, TAU, 28, c, w * 0.8, true)
			draw_arc(P.call(0.5, 0.5), s * 0.25, 0, TAU, 24, c, w * 0.8, true)
			draw_line(P.call(0.5, 0.5), P.call(0.85, 0.2), c, w, true)
			draw_circle(P.call(0.5, 0.5), s * 0.06, c)
		"run":
			draw_colored_polygon(PackedVector2Array([P.call(0.1, 0.2), P.call(0.45, 0.5), P.call(0.1, 0.8)]), c)
			draw_colored_polygon(PackedVector2Array([P.call(0.5, 0.2), P.call(0.85, 0.5), P.call(0.5, 0.8)]), c)
		"close":
			draw_line(P.call(0.18, 0.18), P.call(0.82, 0.82), c, w * 1.2, true)
			draw_line(P.call(0.82, 0.18), P.call(0.18, 0.82), c, w * 1.2, true)
		"back":
			draw_polyline(PackedVector2Array([P.call(0.6, 0.15), P.call(0.25, 0.5), P.call(0.6, 0.85)]), c, w * 1.3, true)
		"lock":
			draw_rect(Rect2(P.call(0.18, 0.45), Vector2(0.64, 0.48) * s), c)
			draw_arc(P.call(0.5, 0.45), s * 0.2, PI, TAU, 16, c, w * 1.2, true)
		"check":
			draw_polyline(PackedVector2Array([P.call(0.15, 0.52), P.call(0.4, 0.78), P.call(0.88, 0.22)]), c, w * 1.4, true)
		"home":
			draw_polyline(PackedVector2Array([P.call(0.1, 0.5), P.call(0.5, 0.12), P.call(0.9, 0.5)]), c, w * 1.2, true)
			draw_rect(Rect2(P.call(0.22, 0.48), Vector2(0.56, 0.42) * s), c, false, w)
		"elevator":
			draw_rect(Rect2(P.call(0.15, 0.08), Vector2(0.7, 0.84) * s), c, false, w)
			draw_colored_polygon(PackedVector2Array([P.call(0.5, 0.22), P.call(0.68, 0.42), P.call(0.32, 0.42)]), c)
			draw_colored_polygon(PackedVector2Array([P.call(0.5, 0.78), P.call(0.68, 0.58), P.call(0.32, 0.58)]), c)
		"fragment":
			_diamond(P.call(0.5, 0.5), s * 0.42, s * 0.3, c)
			_diamond(P.call(0.5, 0.45), s * 0.18, s * 0.12, Color(1, 1, 1, 0.7))
		"trophy":
			draw_rect(Rect2(P.call(0.28, 0.12), Vector2(0.44, 0.36) * s), c)
			draw_arc(P.call(0.5, 0.48), s * 0.22, 0, PI, 16, c, w * 2.2, true)
			draw_rect(Rect2(P.call(0.44, 0.6), Vector2(0.12, 0.18) * s), c)
			draw_rect(Rect2(P.call(0.28, 0.78), Vector2(0.44, 0.1) * s), c)
		# ---------------- COLLECTIBLE SHAPES
		"coin":
			draw_circle(P.call(0.5, 0.5), s * 0.4, c)
			draw_arc(P.call(0.5, 0.5), s * 0.28, 0, TAU, 24, c.darkened(0.35), w * 0.8, true)
		"pyramid":
			draw_colored_polygon(PackedVector2Array([P.call(0.5, 0.12), P.call(0.92, 0.85), P.call(0.08, 0.85)]), c)
			draw_colored_polygon(PackedVector2Array([P.call(0.5, 0.12), P.call(0.92, 0.85), P.call(0.55, 0.85)]), c.darkened(0.25))
		"orb":
			draw_circle(P.call(0.5, 0.5), s * 0.4, c)
			draw_circle(P.call(0.38, 0.38), s * 0.12, Color(1, 1, 1, 0.55 if not silhouette else 0.0))
		"crown":
			draw_colored_polygon(PackedVector2Array([P.call(0.1, 0.8), P.call(0.1, 0.3), P.call(0.3, 0.55), P.call(0.5, 0.2), P.call(0.7, 0.55), P.call(0.9, 0.3), P.call(0.9, 0.8)]), c)
		"card":
			draw_rect(Rect2(P.call(0.12, 0.25), Vector2(0.76, 0.5) * s), c)
			draw_rect(Rect2(P.call(0.2, 0.36), Vector2(0.22, 0.16) * s), c.darkened(0.4))
		"star":
			var pts := PackedVector2Array()
			for i in 10:
				var a := -PI / 2 + i * TAU / 10.0
				var r := 0.44 if i % 2 == 0 else 0.19
				pts.append(P.call(0.5, 0.53) + Vector2(cos(a), sin(a)) * s * r)
			draw_colored_polygon(pts, c)
		"fish":
			var body := PackedVector2Array()
			for i in 20:
				var a := i * TAU / 20.0
				body.append(P.call(0.42, 0.5) + Vector2(cos(a) * 0.32, sin(a) * 0.18) * s)
			draw_colored_polygon(body, c)
			draw_colored_polygon(PackedVector2Array([P.call(0.7, 0.5), P.call(0.95, 0.25), P.call(0.95, 0.75)]), c)
		"crystal":
			draw_colored_polygon(PackedVector2Array([P.call(0.5, 0.05), P.call(0.78, 0.35), P.call(0.62, 0.95), P.call(0.38, 0.95), P.call(0.22, 0.35)]), c)
			draw_colored_polygon(PackedVector2Array([P.call(0.5, 0.05), P.call(0.78, 0.35), P.call(0.62, 0.95), P.call(0.5, 0.95)]), c.lightened(0.25))
		"lantern":
			draw_rect(Rect2(P.call(0.3, 0.28), Vector2(0.4, 0.55) * s), c)
			draw_rect(Rect2(P.call(0.24, 0.22), Vector2(0.52, 0.08) * s), c.darkened(0.3))
			draw_rect(Rect2(P.call(0.24, 0.82), Vector2(0.52, 0.08) * s), c.darkened(0.3))
			draw_arc(P.call(0.5, 0.2), s * 0.12, PI, TAU, 12, c.darkened(0.3), w, true)
		"cube":
			draw_colored_polygon(PackedVector2Array([P.call(0.5, 0.1), P.call(0.88, 0.3), P.call(0.5, 0.5), P.call(0.12, 0.3)]), c.lightened(0.2))
			draw_colored_polygon(PackedVector2Array([P.call(0.12, 0.3), P.call(0.5, 0.5), P.call(0.5, 0.92), P.call(0.12, 0.72)]), c)
			draw_colored_polygon(PackedVector2Array([P.call(0.88, 0.3), P.call(0.5, 0.5), P.call(0.5, 0.92), P.call(0.88, 0.72)]), c.darkened(0.25))
		"clock":
			draw_circle(P.call(0.5, 0.5), s * 0.42, c)
			var inner := Color(0.1, 0.1, 0.2) if not silhouette else c
			draw_circle(P.call(0.5, 0.5), s * 0.34, inner)
			draw_line(P.call(0.5, 0.5), P.call(0.5, 0.24), c, w, true)
			draw_line(P.call(0.5, 0.5), P.call(0.47, 0.32), c, w, true)
		"feather":
			draw_colored_polygon(PackedVector2Array([P.call(0.8, 0.08), P.call(0.6, 0.55), P.call(0.25, 0.85), P.call(0.35, 0.45)]), c)
			draw_line(P.call(0.8, 0.08), P.call(0.15, 0.95), c.darkened(0.3), w * 0.6, true)
		"sun":
			for i in 12:
				var a := i * TAU / 12.0
				draw_line(P.call(0.5, 0.5) + Vector2(cos(a), sin(a)) * s * 0.3, P.call(0.5, 0.5) + Vector2(cos(a), sin(a)) * s * 0.47, c, w, true)
			draw_circle(P.call(0.5, 0.5), s * 0.26, c)
		"note":
			draw_rect(Rect2(P.call(0.2, 0.1), Vector2(0.6, 0.8) * s), c)
			var lc := c.darkened(0.5)
			for i in 4:
				draw_line(P.call(0.3, 0.28 + i * 0.15), P.call(0.7, 0.28 + i * 0.15), lc, w * 0.5, true)
		_:
			draw_circle(P.call(0.5, 0.5), s * 0.35, c)

func _diamond(center: Vector2, h: float, wdt: float, c: Color) -> void:
	draw_colored_polygon(PackedVector2Array([center + Vector2(0, -h), center + Vector2(wdt, 0), center + Vector2(0, h), center + Vector2(-wdt, 0)]), c)
