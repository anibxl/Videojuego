class_name DebrisField
extends Node3D
## Hundreds of loose debris pieces (leaves, litter, floating leaves) rendered
## with a single MultiMesh. Pieces can be pushed (blowers), sucked (vacuums) or
## collected (rakes, nets, pickers). Only moving pieces are simulated.

signal collected(field: DebrisField, count: int)

var tag := "leaves"
var kind := "leaf"          # leaf | trash | floating
var mesh_style := "leaf"    # leaf | can | paper | bag | twig | shard
var base_y := 0.0
var bounds := Rect2(-10, -10, 20, 20)
var zones: Dictionary = {}  # name -> Array[Rect2]
var obstacles: Array = []   # Array[Rect2] (XZ)
var drop_zones: Array = []  # Array[Rect2]
var colors: Array = []
var scale_range := Vector2(1.4, 2.1)
var piece_weight := 0.12    # m² equivalent used for overall progress

var count := 0
var pos := PackedVector3Array()
var vel := PackedVector3Array()
var yaw := PackedFloat32Array()
var tilt := PackedVector2Array()
var scl := PackedFloat32Array()
var lift := PackedFloat32Array()
var alive := PackedByteArray()
var active: Dictionary = {}
var dying: Array = []
var zone_initial: Dictionary = {}
var dirty_initial := 0
var alive_count := 0
var mm: MultiMesh
var mmi: MultiMeshInstance3D
var _collect_accum := 0.0
var _time := 0.0
var _push_jitter := RandomNumberGenerator.new()


## cfg: tag, kind, mesh, count, spawn (Array of Rect2 or {rect, weight}), bounds,
## zones, obstacles, drop_zones, colors (Array[Color]), y, scale, weight, seed
func setup(cfg: Dictionary) -> DebrisField:
	tag = cfg.get("tag", "leaves")
	kind = cfg.get("kind", "leaf")
	mesh_style = cfg.get("mesh", "leaf")
	base_y = cfg.get("y", 0.0)
	bounds = cfg.get("bounds", Rect2(-10, -10, 20, 20))
	zones = cfg.get("zones", {})
	obstacles = cfg.get("obstacles", [])
	drop_zones = cfg.get("drop_zones", [])
	colors = cfg.get("colors", [Color(0.9, 0.45, 0.1), Color(0.95, 0.7, 0.15), Color(0.75, 0.2, 0.08)])
	scale_range = cfg.get("scale", Vector2(1.4, 2.1))
	piece_weight = cfg.get("weight", 0.12)
	var rng := RandomNumberGenerator.new()
	rng.seed = cfg.get("seed", 42)
	_spawn(rng, int(cfg.get("count", 200)), cfg.get("spawn", [bounds]), cfg.get("points", []))
	return self


func _spawn(rng: RandomNumberGenerator, n: int, spawn: Array, points: Array) -> void:
	var areas := []
	var total_w := 0.0
	for s in spawn:
		var r: Rect2 = s if s is Rect2 else s["rect"]
		var w: float = r.get_area() if s is Rect2 else float(s.get("weight", 1.0)) * r.get_area()
		areas.append([r, w])
		total_w += w
	count = n + points.size()
	pos.resize(count)
	vel.resize(count)
	yaw.resize(count)
	tilt.resize(count)
	scl.resize(count)
	lift.resize(count)
	alive.resize(count)
	for i in count:
		var p := Vector3.ZERO
		if i < points.size():
			p = points[i]
		else:
			var pick := rng.randf() * total_w
			var area: Rect2 = areas[0][0]
			for a in areas:
				pick -= a[1]
				if pick <= 0.0:
					area = a[0]
					break
			for attempt in 6:
				p = Vector3(rng.randf_range(area.position.x, area.end.x), 0, rng.randf_range(area.position.y, area.end.y))
				if not _in_obstacle(p):
					break
		pos[i] = Vector3(p.x, base_y + 0.012 + rng.randf() * 0.03, p.z)
		vel[i] = Vector3.ZERO
		yaw[i] = rng.randf() * TAU
		tilt[i] = Vector2(rng.randf_range(-0.25, 0.25), rng.randf_range(-0.25, 0.25))
		scl[i] = rng.randf_range(scale_range.x, scale_range.y)
		lift[i] = 0.0
		alive[i] = 1
	alive_count = count
	# Initial zone population (pieces that count as "dirty").
	for zname in zones.keys():
		zone_initial[zname] = _count_in_zone(zname)
	dirty_initial = _count_dirty()


func _ready() -> void:
	mm = MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = DebrisMeshes.get_mesh(mesh_style)
	mm.instance_count = count
	var rng := RandomNumberGenerator.new()
	rng.seed = count * 13 + int(base_y * 100)
	for i in count:
		mm.set_instance_color(i, colors[rng.randi() % colors.size()] * rng.randf_range(0.85, 1.1))
		_update_transform(i)
	mmi = MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if kind != "trash" else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	mmi.material_override = DebrisMeshes.material()
	add_child(mmi)
	if kind == "floating":
		for i in count:
			active[i] = true


func _update_transform(i: int) -> void:
	if alive[i] == 0:
		mm.set_instance_transform(i, Transform3D(Basis().scaled(Vector3.ZERO), pos[i]))
		return
	var b := Basis(Vector3.UP, yaw[i]) * Basis(Vector3(1, 0, 0), tilt[i].x + lift[i] * 1.5) * Basis(Vector3(0, 0, 1), tilt[i].y)
	mm.set_instance_transform(i, Transform3D(b.scaled(Vector3.ONE * scl[i]), pos[i] + Vector3(0, lift[i], 0)))


# ---------------------------------------------------------------- queries ---

func _in_rects(p: Vector3, rects: Array) -> bool:
	for r in rects:
		var rr: Rect2 = r
		if p.x >= rr.position.x and p.x <= rr.end.x and p.z >= rr.position.y and p.z <= rr.end.y:
			return true
	return false


func _in_obstacle(p: Vector3) -> bool:
	return _in_rects(p, obstacles)


func _count_in_zone(zname: String) -> int:
	var rects: Array = zones.get(zname, [])
	var n := 0
	for i in count:
		if alive[i] == 1 and _in_rects(pos[i], rects):
			n += 1
	return n


func _is_dirty(i: int) -> bool:
	if alive[i] == 0:
		return false
	if zones.is_empty():
		return true
	for zname in zones.keys():
		if _in_rects(pos[i], zones[zname]):
			return true
	return false


func _count_dirty() -> int:
	var n := 0
	for i in count:
		if _is_dirty(i):
			n += 1
	return n


func progress_zone(zname: String) -> float:
	var init := int(zone_initial.get(zname, 0))
	if init <= 0:
		return 1.0
	return clampf(1.0 - float(_count_in_zone(zname)) / init, 0.0, 1.0)


func progress_total() -> float:
	if dirty_initial <= 0:
		return 1.0
	return clampf(1.0 - float(_count_dirty()) / dirty_initial, 0.0, 1.0)


func cleared_count() -> int:
	return dirty_initial - _count_dirty()


func count_near(p: Vector3, radius: float) -> int:
	var n := 0
	var r2 := radius * radius
	for i in count:
		if alive[i] == 1:
			var d := pos[i] - p
			if d.x * d.x + d.z * d.z < r2:
				n += 1
	return n


func has_kind(kinds: Array) -> bool:
	return kinds.has(kind)


# ------------------------------------------------------------ interactions --

## Blower-style push in a widening cone.
func push(origin: Vector3, dir: Vector3, reach: float, width: float, power: float, delta: float) -> int:
	var d2 := Vector3(dir.x, 0, dir.z).normalized()
	var side := Vector3(-d2.z, 0, d2.x)
	var moved := 0
	var water_drag := 0.35 if kind == "floating" else 1.0
	for i in count:
		if alive[i] == 0:
			continue
		var rel := pos[i] - origin
		var along := rel.x * d2.x + rel.z * d2.z
		if along < -0.2 or along > reach:
			continue
		var lat := rel.x * side.x + rel.z * side.z
		var half := width * (0.35 + 0.65 * along / reach)
		if absf(lat) > half:
			continue
		var falloff := 1.0 - along / reach * 0.6
		var push_dir := (d2 + side * signf(lat) * 0.35 * absf(lat) / maxf(half, 0.01)).normalized()
		var j := _push_jitter.randf_range(0.75, 1.25)
		vel[i] += push_dir * power * falloff * j * delta * 6.0 * water_drag
		var sp := vel[i].length()
		var max_sp := power * 1.4
		if sp > max_sp:
			vel[i] = vel[i] / sp * max_sp
		active[i] = true
		moved += 1
	return moved


## Vacuum: pulls pieces in the radius toward the nozzle and collects those that
## reach it. Returns the number collected (bounded by max_collect).
func suck(center: Vector3, radius: float, nozzle: Vector3, power: float, delta: float, max_collect: int) -> int:
	var got := 0
	var r2 := radius * radius
	for i in count:
		if alive[i] == 0:
			continue
		var rel := pos[i] - center
		if rel.x * rel.x + rel.z * rel.z > r2:
			continue
		var to_n := Vector3(nozzle.x - pos[i].x, 0, nozzle.z - pos[i].z)
		var dist := to_n.length()
		if dist < 0.55 + radius * 0.35 and got < max_collect:
			_collect_piece(i, nozzle)
			got += 1
			continue
		vel[i] = vel[i].lerp(to_n.normalized() * power * 0.35, clampf(delta * 8.0, 0.0, 1.0))
		active[i] = true
	if got > 0:
		collected.emit(self, got)
	return got


## Rake / net / picker: collects the nearest pieces in the area at `rate`/s.
func collect(center: Vector3, radius: float, rate: float, delta: float, target: Vector3, max_collect: int) -> int:
	_collect_accum += rate * delta
	var budget := mini(int(_collect_accum), max_collect)
	if budget <= 0:
		return 0
	var r2 := radius * radius
	var candidates := []
	for i in count:
		if alive[i] == 0:
			continue
		var rel := pos[i] - center
		var dd := rel.x * rel.x + rel.z * rel.z
		if dd <= r2:
			candidates.append([dd, i])
	if candidates.is_empty():
		_collect_accum = minf(_collect_accum, 1.0)
		return 0
	candidates.sort_custom(func(a, b): return a[0] < b[0])
	var got := 0
	for c in candidates:
		if got >= budget:
			break
		_collect_piece(c[1], target)
		got += 1
	_collect_accum -= got
	if got > 0:
		collected.emit(self, got)
	return got


func _collect_piece(i: int, target: Vector3) -> void:
	alive[i] = 0
	alive_count -= 1
	active.erase(i)
	dying.append({"i": i, "t": 0.0, "from": pos[i] + Vector3(0, lift[i], 0), "to": target})


# -------------------------------------------------------------- simulation --

func _process(delta: float) -> void:
	_time += delta
	if not dying.is_empty():
		_update_dying(delta)
	if active.is_empty():
		return
	var floating := kind == "floating"
	var damp := 1.6 if floating else (2.2 if kind == "leaf" else 3.5)
	var decay := exp(-damp * delta)
	var to_remove := []
	for key in active.keys():
		var i: int = key
		if alive[i] == 0:
			to_remove.append(i)
			continue
		var v := vel[i]
		if floating:
			# Gentle water current so the surface always feels alive.
			v += Vector3(sin(_time * 0.3 + i * 1.7), 0, cos(_time * 0.27 + i * 2.3)) * 0.06 * delta
		var p := pos[i] + v * delta
		v *= decay
		# Bounds (bounce softly).
		if p.x < bounds.position.x:
			p.x = bounds.position.x
			v.x = absf(v.x) * 0.4
		elif p.x > bounds.end.x:
			p.x = bounds.end.x
			v.x = -absf(v.x) * 0.4
		if p.z < bounds.position.y:
			p.z = bounds.position.y
			v.z = absf(v.z) * 0.4
		elif p.z > bounds.end.y:
			p.z = bounds.end.y
			v.z = -absf(v.z) * 0.4
		for r in obstacles:
			var rr: Rect2 = r
			if p.x > rr.position.x and p.x < rr.end.x and p.z > rr.position.y and p.z < rr.end.y:
				var dl := p.x - rr.position.x
				var dr := rr.end.x - p.x
				var dt := p.z - rr.position.y
				var db := rr.end.y - p.z
				var m := minf(minf(dl, dr), minf(dt, db))
				if m == dl:
					p.x = rr.position.x - 0.01
					v.x = -absf(v.x) * 0.3
				elif m == dr:
					p.x = rr.end.x + 0.01
					v.x = absf(v.x) * 0.3
				elif m == dt:
					p.z = rr.position.y - 0.01
					v.z = -absf(v.z) * 0.3
				else:
					p.z = rr.end.y + 0.01
					v.z = absf(v.z) * 0.3
		var sp := v.length()
		if floating:
			p.y = base_y + sin(_time * 1.6 + i) * 0.015
			lift[i] = 0.0
		else:
			lift[i] = lerpf(lift[i], minf(0.7, sp * 0.09) if kind == "leaf" else minf(0.1, sp * 0.02), clampf(delta * 6.0, 0.0, 1.0))
			yaw[i] += sp * delta * (2.5 if kind == "leaf" else 1.0) * (1.0 if i % 2 == 0 else -1.0)
		pos[i] = p
		vel[i] = v
		if not drop_zones.is_empty() and _in_rects(p, drop_zones):
			_collect_piece(i, Vector3(p.x, base_y, p.z))
			collected.emit(self, 1)
			continue
		_update_transform(i)
		if sp < 0.04 and not floating:
			lift[i] = 0.0
			_update_transform(i)
			to_remove.append(i)
	for i in to_remove:
		active.erase(i)


func _update_dying(delta: float) -> void:
	var keep := []
	for d in dying:
		d["t"] += delta / 0.28
		var i: int = d["i"]
		var t: float = minf(d["t"], 1.0)
		var p: Vector3 = d["from"].lerp(d["to"], t * t) + Vector3(0, sin(t * PI) * 0.5, 0)
		var s := scl[i] * (1.0 - t)
		if t >= 1.0:
			mm.set_instance_transform(i, Transform3D(Basis().scaled(Vector3.ZERO), p))
		else:
			mm.set_instance_transform(i, Transform3D(Basis(Vector3.UP, yaw[i] + t * 8.0).scaled(Vector3.ONE * maxf(s, 0.001)), p))
			keep.append(d)
	dying = keep
