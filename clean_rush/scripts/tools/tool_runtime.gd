class_name ToolRuntime
extends Node3D
## Runs the currently equipped tool: aiming (with optional auto-aim), surface
## cleaning, debris pushing / suction / collection, bag capacity, FX and sound.

signal hint(text: String)
signal load_changed(load: int, capacity: int)
signal cleaned_area(m2: float)

const AIM_YAWS := [0.0, -18.0, 18.0, -36.0, 36.0]
## Global tuning so contracts stay short and satisfying on mobile.
const SURFACE_POWER_SCALE := 1.6

var player: Node3D
var map: MapBase
var tool_id := ""
var def: Dictionary = {}
var surf: Dictionary = {}
var deb: Dictionary = {}
var model: Node3D
var nozzle: Marker3D
var spinner: Node3D
var hand: Node3D
var nozzle_narrow := false
var bag_load := 0
var capacity := 0
var active := false
var aim_point := Vector3.ZERO
var has_aim := false
var aim_surface: CleanSurface = null
var mouse_target = null   # Vector3 or null (desktop mouse aiming)
var _anim_t := 0.0
var _sound_t := 0.0
var _hint_t := 0.0
var _area_accum := 0.0
var _foam_t := 0.0

# FX nodes
var beam: MeshInstance3D
var stream_fx: CPUParticles3D
var splash_fx: CPUParticles3D
var mist_fx: CPUParticles3D
var cone_fx: CPUParticles3D
var suction_fx: CPUParticles3D


func setup(p: Node3D, m: MapBase, hand_node: Node3D) -> void:
	player = p
	map = m
	hand = hand_node


func _ready() -> void:
	beam = MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.03
	cm.bottom_radius = 0.05
	cm.height = 1.0
	cm.radial_segments = 6
	cm.rings = 1
	beam.mesh = cm
	var bm := StandardMaterial3D.new()
	bm.albedo_color = Color(0.8, 0.95, 1.0, 0.55)
	bm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	bm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	beam.material_override = bm
	beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	beam.top_level = true
	beam.visible = false
	add_child(beam)
	splash_fx = Fx.splash()
	splash_fx.emitting = false
	splash_fx.top_level = true
	add_child(splash_fx)
	mist_fx = Fx.mist(Color(0.9, 0.95, 1.0, 0.35))
	mist_fx.emitting = false
	mist_fx.top_level = true
	add_child(mist_fx)


func equip(id: String) -> void:
	if not Data.tools.has(id):
		id = "rake"
	stop()
	tool_id = id
	def = Data.tool_def(id)
	surf = def.get("surface", {})
	deb = def.get("debris", {})
	capacity = Game.tool_capacity(id)
	bag_load = 0
	if model:
		model.queue_free()
	model = ToolModels.build(id)
	hand.add_child(model)
	nozzle = model.get_node("Nozzle")
	spinner = model.get_node_or_null("Spinner")
	_rebuild_fx()
	load_changed.emit(bag_load, capacity)


func _rebuild_fx() -> void:
	for n in [stream_fx, cone_fx, suction_fx]:
		if n:
			n.queue_free()
	stream_fx = null
	cone_fx = null
	suction_fx = null
	var fx := String(def.get("fx", ""))
	match fx:
		"water":
			stream_fx = Fx.stream(Color(0.85, 0.95, 1.0, 0.7))
		"foam":
			stream_fx = Fx.stream(Color(0.98, 0.98, 1.0, 0.9), 0.16)
		"bubbles":
			stream_fx = Fx.stream(Color(0.7, 0.95, 1.0, 0.5), 0.07)
		"air":
			cone_fx = Fx.cone(Color(0.95, 0.98, 1.0, 0.35), 9.0, 18.0, 0.25)
		"suck":
			suction_fx = Fx.suction(Color(0.95, 0.9, 0.8, 0.5))
	for n in [stream_fx, cone_fx]:
		if n:
			n.emitting = false
			nozzle.add_child(n)
	if suction_fx:
		suction_fx.emitting = false
		suction_fx.top_level = true
		add_child(suction_fx)


func toggle_nozzle() -> bool:
	if not surf.get("nozzles", false):
		return false
	nozzle_narrow = not nozzle_narrow
	hint.emit("Narrow jet: more power" if nozzle_narrow else "Wide fan: covers more area")
	return true


func has_nozzles() -> bool:
	return surf.get("nozzles", false)


func stop() -> void:
	if not active:
		return
	active = false
	beam.visible = false
	splash_fx.emitting = false
	mist_fx.emitting = false
	for n in [stream_fx, cone_fx, suction_fx]:
		if n:
			n.emitting = false
	Audio.loop_stop("tool")
	if model:
		model.position = Vector3.ZERO
		model.rotation = Vector3.ZERO


# ------------------------------------------------------------------- main ---

func process_tool(delta: float, cleaning: bool) -> void:
	if model == null:
		return
	_hint_t -= delta
	# Empty bags at any bin automatically.
	if bag_load > 0 and map.in_bin(player.global_position):
		bag_load = 0
		Audio.play("empty_bag")
		hint.emit("Bag emptied!")
		load_changed.emit(bag_load, capacity)
	if not cleaning:
		stop()
		return
	if not active:
		active = true
		var snd := String(def.get("sound", ""))
		if snd in Audio.LOOP_SOUNDS:
			Audio.loop_start("tool", snd, -6.0)
	_animate(delta)
	var fwd := -player.global_transform.basis.z
	fwd.y = 0
	fwd = fwd.normalized()
	if not surf.is_empty():
		_do_surface(delta, fwd)
	if not deb.is_empty():
		_do_debris(delta, fwd)
	if not String(def.get("sound", "")) in Audio.LOOP_SOUNDS:
		_sound_t -= delta
		if _sound_t <= 0.0:
			_sound_t = 0.42
			Audio.play(String(def.get("sound", "rake")), -6.0, 0.12)


func _animate(delta: float) -> void:
	_anim_t += delta
	match String(def.get("anim", "aim")):
		"sweep":
			model.rotation.y = sin(_anim_t * 7.0) * 0.45
			model.position.x = sin(_anim_t * 7.0) * 0.08
		"scrub":
			model.position = Vector3(cos(_anim_t * 14.0) * 0.04, sin(_anim_t * 14.0) * 0.04, 0)
		_:
			model.position = Vector3(randf_range(-0.006, 0.006), randf_range(-0.006, 0.006), 0)
	if spinner:
		spinner.rotate_object_local(Vector3.UP, delta * 30.0)


# ---------------------------------------------------------------- surface ---

func _do_surface(delta: float, fwd: Vector3) -> void:
	var mode := String(surf.get("mode", "spray"))
	var rng := Game.tool_param(tool_id, "surface", "range")
	var radius := Game.tool_param(tool_id, "surface", "radius")
	var power := Game.tool_param(tool_id, "surface", "power") * SURFACE_POWER_SCALE
	if has_nozzles():
		if nozzle_narrow:
			radius *= 0.6
			power *= 1.7
		else:
			radius *= 1.35
			power *= 0.75
	var types: Dictionary = surf.get("types", {})
	var origin := nozzle.global_position if mode == "spray" else player.global_position + Vector3(0, 1.1, 0)
	var hit := _find_target(origin, fwd, rng, mode, types)
	has_aim = not hit.is_empty()
	aim_surface = null
	var spray := mode == "spray"
	if has_aim:
		aim_point = hit["position"]
		var s: CleanSurface = hit["surface"]
		aim_surface = s
		if s != null:
			var removed := s.clean_at(aim_point, radius, power * delta, types)
			if removed < 0.0 and deb.is_empty():
				_show_hint("%s can't clean %s. Try another tool!" % [def.get("name", ""), Data.dirt_def(s.current_type()).get("name", "this")])
			elif removed > 0.0:
				_area_accum += removed
				if _area_accum > 0.5:
					Game.add_stat("area_cleaned", _area_accum)
					cleaned_area.emit(_area_accum)
					_area_accum = 0.0
			if surf.get("foam", false):
				_foam_t += delta
				s.add_foam(delta * 1.2)
	# FX
	if spray and has_aim:
		_place_beam(nozzle.global_position, aim_point)
		splash_fx.global_position = aim_point
		splash_fx.emitting = String(def.get("fx", "")) in ["water", "foam", "bubbles"]
		mist_fx.global_position = aim_point
		mist_fx.emitting = true
		if stream_fx:
			stream_fx.emitting = true
			stream_fx.look_at(aim_point, Vector3.UP if absf((aim_point - stream_fx.global_position).normalized().y) < 0.98 else Vector3.FORWARD)
	elif spray:
		beam.visible = false
		splash_fx.emitting = false
		mist_fx.emitting = false
		if stream_fx:
			stream_fx.emitting = true
			stream_fx.rotation = Vector3.ZERO
	else:
		beam.visible = false
		splash_fx.emitting = false
		mist_fx.emitting = has_aim
		if has_aim:
			mist_fx.global_position = aim_point
	if cone_fx:
		cone_fx.emitting = true


func _place_beam(a: Vector3, b: Vector3) -> void:
	if String(def.get("fx", "")) == "air":
		beam.visible = false
		return
	var d := b - a
	var length := d.length()
	if length < 0.05:
		beam.visible = false
		return
	beam.visible = true
	var up := d / length
	var x := up.cross(Vector3.FORWARD if absf(up.dot(Vector3.FORWARD)) < 0.95 else Vector3.RIGHT).normalized()
	var z := x.cross(up).normalized()
	beam.global_transform = Transform3D(Basis(x, up * length, z), (a + b) * 0.5)
	var m := beam.material_override as StandardMaterial3D
	match String(def.get("fx", "")):
		"foam":
			m.albedo_color = Color(1, 1, 1, 0.75)
		"bubbles":
			m.albedo_color = Color(0.4, 0.5, 0.6, 0.9)
		_:
			m.albedo_color = Color(0.8, 0.95, 1.0, 0.5)


func _show_hint(text: String) -> void:
	if _hint_t > 0.0:
		return
	_hint_t = 3.0
	hint.emit(text)


func _raycast(from: Vector3, to: Vector3) -> Dictionary:
	var space := player.get_world_3d().direct_space_state
	var q := PhysicsRayQueryParameters3D.create(from, to, 1 | 2)
	q.exclude = [player.get_rid()]
	var r := space.intersect_ray(q)
	if r.is_empty():
		return {}
	var col: Object = r["collider"]
	var s: CleanSurface = null
	if col and col.has_meta("surface"):
		s = col.get_meta("surface")
	return {"position": r["position"], "surface": s, "normal": r["normal"]}


func _find_target(origin: Vector3, fwd: Vector3, rng: float, mode: String, types: Dictionary) -> Dictionary:
	var floor_only: bool = surf.get("floor_only", false)
	# Desktop mouse aim: aim directly at the clicked point.
	if mouse_target != null:
		var target: Vector3 = mouse_target
		var dir := (target - origin)
		var dist := dir.length()
		if dist < 0.01:
			return {}
		dir /= dist
		var hit := _raycast(origin, origin + dir * minf(rng, dist + 0.5))
		if not hit.is_empty() and floor_only and hit["surface"] != null and not hit["surface"].is_floor:
			hit["surface"] = null
		return hit
	var pitches: Array
	if mode == "spray":
		pitches = [-60.0, -45.0, -30.0, -18.0, -8.0] if surf.get("prefer_down", false) else [-8.0, -20.0, -32.0, -48.0, 0.0]
	else:
		pitches = [-40.0, -25.0, -60.0, -10.0, 5.0]
	var yaws: Array = AIM_YAWS if bool(Game.setting("auto_aim")) else [0.0]
	var fallback := {}
	for y in yaws:
		var dir_h := fwd.rotated(Vector3.UP, deg_to_rad(y))
		var side := dir_h.cross(Vector3.UP).normalized()
		for p in pitches:
			var dir: Vector3 = dir_h.rotated(side, deg_to_rad(p))
			var hit := _raycast(origin, origin + dir * rng)
			if hit.is_empty():
				continue
			if fallback.is_empty() and y == 0.0:
				fallback = hit
			var s: CleanSurface = hit["surface"]
			if s == null or s.done:
				continue
			if floor_only and not s.is_floor:
				continue
			if s.efficiency_for(types) <= 0.0 and y != 0.0:
				continue
			if s.dirt_at(hit["position"]) > 0.02 or _dirt_nearby(s, hit["position"]):
				return hit
	if not fallback.is_empty() and fallback["surface"] != null and floor_only and not fallback["surface"].is_floor:
		fallback["surface"] = null
	return fallback


func _dirt_nearby(s: CleanSurface, p: Vector3) -> bool:
	var r := Game.tool_param(tool_id, "surface", "radius") * 0.7
	var b := s.global_transform.basis
	for o in [b.x.normalized() * r, -b.x.normalized() * r, b.z.normalized() * r, -b.z.normalized() * r]:
		if s.dirt_at(p + o) > 0.05:
			return true
	return false


# ----------------------------------------------------------------- debris ---

func _do_debris(delta: float, fwd: Vector3) -> void:
	var mode := String(deb.get("mode", "collect"))
	var kinds: Array = deb.get("kinds", [])
	var reach := Game.tool_param(tool_id, "debris", "reach")
	var radius := Game.tool_param(tool_id, "debris", "radius")
	var power := Game.tool_param(tool_id, "debris", "power")
	var ppos := player.global_position
	var dir := fwd
	if mouse_target != null:
		var mt: Vector3 = mouse_target
		var d := Vector3(mt.x - ppos.x, 0, mt.z - ppos.z)
		if d.length() > 0.2:
			dir = d.normalized()
	var free_space := 999999 if capacity <= 0 else capacity - bag_load
	if mode != "push" and free_space <= 0:
		_show_hint("Bag full! Empty it at a bin (glowing ring).")
		if suction_fx:
			suction_fx.emitting = false
		return
	var got := 0
	match mode:
		"push":
			for f in map.fields:
				if f.has_kind(kinds):
					f.push(ppos, dir, reach, radius, power, delta)
		"suck":
			var center := ppos + dir * reach * 0.55
			var noz := ppos + dir * 0.7
			for f in map.fields:
				if f.has_kind(kinds):
					got += f.suck(center, radius, noz, power, delta, free_space - got)
			if suction_fx:
				suction_fx.global_position = center + Vector3(0, 0.3, 0)
				suction_fx.emitting = true
		"collect":
			var center2 := ppos + dir * reach * 0.7
			var target := ppos + Vector3(0, 0.8, 0)
			for f in map.fields:
				if f.has_kind(kinds):
					got += f.collect(center2, radius, power, delta, target, free_space - got)
	if got > 0 and capacity > 0:
		bag_load = mini(capacity, bag_load + got)
		load_changed.emit(bag_load, capacity)
		if bag_load >= capacity:
			_show_hint("Bag full! Empty it at a bin (glowing ring).")
