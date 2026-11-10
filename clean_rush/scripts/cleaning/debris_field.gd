class_name DebrisField
extends Node3D
## Hundreds of loose debris pieces (leaves, litter, floating leaves) rendered
## with a single MultiMesh. Pieces can be pushed (blowers), sucked (vacuums) or
## collected (rakes, nets, pickers). Only moving pieces are simulated.

signal collected(field: DebrisField, count: int)
signal pile_bagged(field: DebrisField, at: Vector3, count: int)

const LEAF_TYPES := 8
const PILE_CELL := 0.75
const PILE_SIZE := 14

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
var attractors: Array = []  # natural accumulation: [{p|a,b, r, w}]
var piles: Array = []       # dense starting piles: [{p, r, n}]
var uniform_frac := 1.0     # share of pieces scattered uniformly (rest accumulate)
var variants: Array = []    # allowed leaf atlas cells (empty = all)
var spin := PackedFloat32Array()
var raked := PackedByteArray()
var _pile_t := 0.0
var _any_raked := false

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
	scale_range = cfg.get("scale", Vector2(0.85, 1.6) if mesh_style == "leaf" else Vector2(1.4, 2.1))
	piece_weight = cfg.get("weight", 0.12)
	attractors = cfg.get("attractors", [])
	piles = cfg.get("piles", [])
	uniform_frac = cfg.get("uniform", 1.0 if attractors.is_empty() else 0.35)
	variants = cfg.get("variants", [])
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
	spin.resize(count)
	raked.resize(count)
	var pile_total := 0
	for pl in piles:
		pile_total += int(pl.get("n", 40))
	var att_w := 0.0
	for a in attractors:
		att_w += float(a.get("w", 1.0))
	for i in count:
		var p := Vector3.ZERO
		var placed := false
		if i < points.size():
			p = points[i]
			placed = true
		elif i - points.size() < pile_total and not piles.is_empty():
			# Dense hand-placed piles (against fences, under trees...).
			var k := i - points.size()
			for pl in piles:
				var pn := int(pl.get("n", 40))
				if k < pn:
					var c: Vector3 = pl["p"]
					var pr := float(pl.get("r", 0.8))
					var a0 := rng.randf() * TAU
					var d0 := pr * sqrt(rng.randf()) * (0.4 + 0.6 * rng.randf())
					p = c + Vector3(cos(a0) * d0, 0, sin(a0) * d0)
					placed = true
					break
				k -= pn
		elif att_w > 0.0 and rng.randf() > uniform_frac:
			# Natural accumulation around trees, fences, path edges, corners...
			var pick2 := rng.randf() * att_w
			var at: Dictionary = attractors[0]
			for a in attractors:
				pick2 -= float(a.get("w", 1.0))
				if pick2 <= 0.0:
					at = a
					break
			var r := float(at.get("r", 1.0))
			var off := absf(rng.randfn(0.0, 0.55)) * r
			var ang := rng.randf() * TAU
			var c2: Vector3 = at["p"] if at.has("p") else (at["a"] as Vector3).lerp(at["b"], rng.randf())
			p = c2 + Vector3(cos(ang) * off, 0, sin(ang) * off)
			placed = not _in_obstacle(p) and bounds.has_point(Vector2(p.x, p.z))
		if not placed:
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
		spin[i] = 0.0
		raked[i] = 0
		vel[i] = Vector3.ZERO
		yaw[i] = rng.randf() * TAU
		tilt[i] = Vector2(rng.randf_range(-0.25, 0.25), rng.randf_range(-0.25, 0.25))
		scl[i] = rng.randf_range(scale_range.x, scale_range.y)
		lift[i] = 0.0
		alive[i] = 1
	alive_count = count
	if mesh_style == "leaf":
		_stack_leaves(rng)
	# Initial zone population (pieces that count as "dirty").
	for zname in zones.keys():
		zone_initial[zname] = _count_in_zone(zname)
	dirty_initial = _count_dirty()


## Leaves on top of other leaves sit higher and tilt more: piles get volume.
func _stack_leaves(rng: RandomNumberGenerator) -> void:
	var grid := {}
	for i in count:
		var key := Vector2i(int(floor(pos[i].x / 0.32)), int(floor(pos[i].z / 0.32)))
		var n: int = grid.get(key, 0)
		grid[key] = n + 1
		var h := minf(0.22, n * 0.0075) * rng.randf_range(0.6, 1.0)
		pos[i].y = base_y + 0.012 + h + rng.randf() * 0.02
		if n > 3:
			tilt[i] = Vector2(rng.randf_range(-0.7, 0.7), rng.randf_range(-0.7, 0.7))


func _ready() -> void:
	var realistic := mesh_style == "leaf"
	mm = MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.use_custom_data = realistic
	mm.mesh = DebrisMeshes.get_mesh(mesh_style)
	mm.instance_count = count
	var rng := RandomNumberGenerator.new()
	rng.seed = count * 13 + int(base_y * 100)
	for i in count:
		if realistic:
			# Atlas leaf: natural texture colour, only a slight tint from the palette.
			var v: int = variants[rng.randi() % variants.size()] if not variants.is_empty() else rng.randi() % LEAF_TYPES
			var tint: Color = Color.WHITE.lerp(colors[rng.randi() % colors.size()], 0.22)
			if kind == "floating":
				tint = tint * Color(0.85, 0.82, 0.7)
			mm.set_instance_color(i, tint)
			mm.set_instance_custom_data(i, Color((v + 0.01) / float(LEAF_TYPES), rng.randf(), 0, 0))
		else:
			mm.set_instance_color(i, colors[rng.randi() % colors.size()] * rng.randf_range(0.85, 1.1))
		_update_transform(i)
	mmi = MultiMeshInstance3D.new()
	mmi.multimesh = mm
	if realistic:
		mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if Game.graphics_level() >= 2 else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mmi.material_override = DebrisMeshes.leaf_material()
	else:
		mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
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
		spin[i] = clampf(spin[i] + _push_jitter.randf_range(-1.0, 1.0) * power * delta * 4.0, -14.0, 14.0)
		var sp := vel[i].length()
		var max_sp := power * 1.4
		if sp > max_sp:
			vel[i] = vel[i] / sp * max_sp
		active[i] = true
		if kind == "leaf":
			raked[i] = 1   # blown leaves can also gather into piles that get bagged
		moved += 1
	if moved > 0:
		touched = true
		if kind == "leaf":
			_any_raked = true
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


## Rake: drags leaves in the area toward the rake line just in front of the
## player. Raked leaves accumulate into piles; dense resting piles get bagged.
func rake(center: Vector3, radius: float, gather: Vector3, power: float, delta: float) -> int:
	var r2 := radius * radius
	var moved := 0
	for i in count:
		if alive[i] == 0:
			continue
		var rel := pos[i] - center
		if rel.x * rel.x + rel.z * rel.z > r2:
			continue
		var to := Vector3(gather.x - pos[i].x, 0, gather.z - pos[i].z)
		var dist := to.length()
		if dist < 0.1:
			raked[i] = 1
			continue
		var target_v := to / dist * minf(power * 0.18, dist * 5.0)
		vel[i] = vel[i].lerp(target_v, clampf(delta * 10.0, 0.0, 1.0))
		raked[i] = 1
		active[i] = true
		moved += 1
	if moved > 0:
		_any_raked = true
		touched = true
	return moved


func _check_piles() -> void:
	var cells := {}
	for i in count:
		if alive[i] == 0 or raked[i] == 0 or active.has(i):
			continue
		var key := Vector2i(int(floor(pos[i].x / PILE_CELL)), int(floor(pos[i].z / PILE_CELL)))
		if cells.has(key):
			cells[key].append(i)
		else:
			cells[key] = [i]
	for key in cells.keys():
		var list: Array = cells[key]
		if list.size() < PILE_SIZE:
			continue
		var c := Vector3((key.x + 0.5) * PILE_CELL, base_y + 0.6, (key.y + 0.5) * PILE_CELL)
		for i in list:
			_collect_piece(i, c)
		pile_bagged.emit(self, c, list.size())
		collected.emit(self, list.size())


func _collect_piece(i: int, target: Vector3) -> void:
	touched = true
	alive[i] = 0
	alive_count -= 1
	active.erase(i)
	dying.append({"i": i, "t": 0.0, "from": pos[i] + Vector3(0, lift[i], 0), "to": target})


# -------------------------------------------------------------- simulation --

func _process(delta: float) -> void:
	_time += delta
	if not dying.is_empty():
		_update_dying(delta)
	if _any_raked:
		_pile_t += delta
		if _pile_t > 0.5:
			_pile_t = 0.0
			_check_piles()
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
			# Blown leaves flutter up, tumble and settle back down.
			lift[i] = lerpf(lift[i], minf(1.1, sp * 0.13) if kind == "leaf" else minf(0.1, sp * 0.02), clampf(delta * (5.0 if sp > 1.0 else 2.5), 0.0, 1.0))
			yaw[i] += (sp * (2.0 if kind == "leaf" else 0.8) * (1.0 if i % 2 == 0 else -1.0) + spin[i]) * delta
			spin[i] *= exp(-2.0 * delta)
			if kind == "leaf" and lift[i] > 0.05:
				tilt[i].x += spin[i] * delta * 0.6
			elif kind == "leaf":
				tilt[i].x = lerpf(tilt[i].x, clampf(tilt[i].x, -0.35, 0.35), clampf(delta * 3.0, 0.0, 1.0))
		pos[i] = p
		vel[i] = v
		if not drop_zones.is_empty() and _in_rects(p, drop_zones):
			_collect_piece(i, Vector3(p.x, base_y, p.z))
			collected.emit(self, 1)
			continue
		_update_transform(i)
		if sp < 0.04 and not floating and lift[i] < 0.03:
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


# ----------------------------------------------------------- persistence ---

var touched := false   # any piece moved or collected since the map was built


func export_state() -> Dictionary:
	if not touched and alive_count == count:
		return {}
	var xz := PackedFloat32Array()
	xz.resize(count * 2)
	for i in count:
		xz[i * 2] = pos[i].x
		xz[i * 2 + 1] = pos[i].z
	var pb := xz.to_byte_array()
	return {"c": count, "na": alive.size(), "a": Marshalls.raw_to_base64(alive.compress(FileAccess.COMPRESSION_DEFLATE)),
		"np": pb.size(), "p": Marshalls.raw_to_base64(pb.compress(FileAccess.COMPRESSION_DEFLATE))}


func import_state(s: Dictionary) -> void:
	if s.is_empty() or int(s.get("c", -1)) != count:
		return
	var a: PackedByteArray = Marshalls.base64_to_raw(String(s["a"])).decompress(int(s["na"]), FileAccess.COMPRESSION_DEFLATE)
	var xz: PackedFloat32Array = Marshalls.base64_to_raw(String(s["p"])).decompress(int(s["np"]), FileAccess.COMPRESSION_DEFLATE).to_float32_array()
	if a.size() != count or xz.size() != count * 2:
		return
	alive_count = 0
	for i in count:
		alive[i] = a[i]
		if alive[i] == 1:
			alive_count += 1
		pos[i] = Vector3(xz[i * 2], pos[i].y, xz[i * 2 + 1])
		vel[i] = Vector3.ZERO
		lift[i] = 0.0
		if kind != "floating":
			active.erase(i)
		if mm:
			_update_transform(i)
	touched = true
