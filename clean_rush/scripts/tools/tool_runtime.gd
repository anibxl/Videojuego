class_name ToolRuntime
extends Node3D
## Runs the equipped tool in FIRST PERSON: aims exactly where the camera
## (crosshair) points, cleans surfaces with per-pixel accuracy, pushes /
## sucks / rakes / collects debris at the looked-at spot, handles bag capacity,
## tool modes (blower power, washer nozzles), FX and sound.

signal hint(text: String)
signal load_changed(load: int, capacity: int)
signal cleaned_area(m2: float)
signal mode_changed(name: String)

## Global tuning so contracts stay short and satisfying on mobile.
const SURFACE_POWER_SCALE := 1.6
const DEFAULT_NOZZLES := [{"name": "Wide fan", "radius": 1.35, "power": 0.75}, {"name": "Narrow jet", "radius": 0.6, "power": 1.7}]

var player: Node3D
var map: MapBase
var view: FirstPersonView
var camera: Camera3D
var tool_id := ""
var def: Dictionary = {}
var surf: Dictionary = {}
var deb: Dictionary = {}
var model: Node3D
var nozzle: Marker3D
var spinner: Node3D
var mode_index := 0
var bag_load := 0
var capacity := 0
var active := false
var aim_point := Vector3.ZERO
var has_aim := false
var aim_surface: CleanSurface = null
var aim_state := "none"   # dirt | clean | wrong | debris | none  (crosshair feedback)
var _sound_t := 0.0
var _hint_t := 0.0
var _area_accum := 0.0
var _suck_fx_t := 0.0

# FX nodes
var beam: MeshInstance3D
var stream_fx: CPUParticles3D
var splash_fx: CPUParticles3D
var mist_fx: CPUParticles3D
var cone_fx: CPUParticles3D
var suction_fx: CPUParticles3D


func setup(p: Node3D, m: MapBase, v: FirstPersonView, cam: Camera3D) -> void:
	player = p
	map = m
	view = v
	camera = cam


func _ready() -> void:
	beam = MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.018
	cm.bottom_radius = 0.035
	cm.height = 1.0
	cm.radial_segments = 6
	cm.rings = 1
	beam.mesh = cm
	var bm := StandardMaterial3D.new()
	bm.albedo_color = Color(0.8, 0.95, 1.0, 0.5)
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
		id = "leaf_blower"
	stop()
	tool_id = id
	def = Data.tool_def(id)
	surf = def.get("surface", {})
	deb = def.get("debris", {})
	capacity = Game.tool_capacity(id)
	bag_load = 0
	mode_index = 0
	model = view.set_tool(id)
	nozzle = model.get_node("Nozzle")
	spinner = model.get_node_or_null("Spinner")
	_rebuild_fx()
	load_changed.emit(bag_load, capacity)
	mode_changed.emit(mode_name())


func _rebuild_fx() -> void:
	for n in [stream_fx, cone_fx, suction_fx]:
		if n and is_instance_valid(n):
			n.queue_free()
	stream_fx = null
	cone_fx = null
	suction_fx = null
	match String(def.get("fx", "")):
		"water":
			stream_fx = Fx.stream(Color(0.85, 0.95, 1.0, 0.7))
		"foam":
			stream_fx = Fx.stream(Color(0.98, 0.98, 1.0, 0.9), 0.16)
		"bubbles":
			stream_fx = Fx.stream(Color(0.7, 0.95, 1.0, 0.5), 0.07)
		"air":
			cone_fx = Fx.cone(Color(0.95, 0.98, 1.0, 0.3), 9.0, 16.0, 0.22)
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


# ------------------------------------------------------------------ modes ---

func modes() -> Array:
	if def.has("modes"):
		return def["modes"]
	if surf.get("nozzles", false):
		return DEFAULT_NOZZLES
	return []


func has_modes() -> bool:
	return not modes().is_empty()


func mode_name() -> String:
	var m := modes()
	return String(m[mode_index]["name"]) if not m.is_empty() else ""


func cycle_mode() -> bool:
	var m := modes()
	if m.is_empty():
		return false
	mode_index = (mode_index + 1) % m.size()
	Audio.play("ui_click", -4.0)
	hint.emit(mode_name())
	mode_changed.emit(mode_name())
	return true


func _mode_mult(key: String) -> float:
	var m := modes()
	return float(m[mode_index].get(key, 1.0)) if not m.is_empty() else 1.0


# Back-compat for older callers.
func toggle_nozzle() -> bool:
	return cycle_mode()


func has_nozzles() -> bool:
	return has_modes()


func stop() -> void:
	if not active:
		return
	active = false
	beam.visible = false
	splash_fx.emitting = false
	mist_fx.emitting = false
	for n in [stream_fx, cone_fx, suction_fx]:
		if n and is_instance_valid(n):
			n.emitting = false
	Audio.loop_stop("tool")


# ------------------------------------------------------------------- main ---

func empty_bag_if_near_bin() -> bool:
	if bag_load > 0 and map.in_bin(player.global_position):
		bag_load = 0
		Audio.play("empty_bag")
		hint.emit("Bag emptied!")
		load_changed.emit(bag_load, capacity)
		return true
	return false


func process_tool(delta: float, cleaning: bool) -> void:
	if model == null:
		return
	_hint_t -= delta
	empty_bag_if_near_bin()
	var fwd := -camera.global_transform.basis.z
	var fwd_h := Vector3(fwd.x, 0, fwd.z)
	fwd_h = fwd_h.normalized() if fwd_h.length() > 0.01 else -player.global_transform.basis.z
	_update_aim(fwd)
	view.set_using(cleaning, String(def.get("anim", "aim")), bag_load / float(maxi(capacity, 1)) if capacity > 0 else -1.0)
	if not cleaning:
		stop()
		return
	if not active:
		active = true
		var snd := String(def.get("sound", ""))
		if snd in Audio.LOOP_SOUNDS:
			Audio.loop_start("tool", snd, -6.0, 1.15 if _mode_mult("power") > 1.0 else 1.0)
	if spinner:
		spinner.rotate_object_local(Vector3.UP, delta * 30.0)
	if not surf.is_empty():
		_do_surface(delta, fwd)
	if not deb.is_empty():
		_do_debris(delta, fwd_h)
	if not String(def.get("sound", "")) in Audio.LOOP_SOUNDS:
		_sound_t -= delta
		if _sound_t <= 0.0:
			_sound_t = 0.42
			Audio.play(String(def.get("sound", "rake")), -6.0, 0.12)


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


func surface_range() -> float:
	# Eye-to-target reach: tool range plus the distance from the eye to the hands.
	return Game.tool_param(tool_id, "surface", "range") + 0.6


## Crosshair feedback, computed every frame.
func _update_aim(fwd: Vector3) -> void:
	var origin := camera.global_position
	var rng := surface_range() if not surf.is_empty() else Game.tool_param(tool_id, "debris", "reach") * 1.6 + 1.6
	var hit := _raycast(origin, origin + fwd * rng)
	has_aim = not hit.is_empty()
	aim_surface = null
	aim_state = "none"
	if not has_aim:
		return
	aim_point = hit["position"]
	var s: CleanSurface = hit["surface"]
	if s != null and not surf.is_empty():
		aim_surface = s
		if s.done or s.dirt_at(aim_point) <= 0.02:
			aim_state = "clean"
		elif s.efficiency_for(surf.get("types", {})) <= 0.0 or (surf.get("floor_only", false) and not s.is_floor):
			aim_state = "wrong"
		else:
			aim_state = "dirt"
	elif not deb.is_empty():
		aim_state = "debris"


# ---------------------------------------------------------------- surface ---

func _do_surface(delta: float, fwd: Vector3) -> void:
	var radius := Game.tool_param(tool_id, "surface", "radius") * _mode_mult("radius")
	var power := Game.tool_param(tool_id, "surface", "power") * SURFACE_POWER_SCALE * _mode_mult("power")
	var types: Dictionary = surf.get("types", {})
	var spray := String(surf.get("mode", "spray")) == "spray"
	var s := aim_surface
	if has_aim and s != null:
		if surf.get("floor_only", false) and not s.is_floor:
			_show_hint("%s only works on floors." % def.get("name", ""))
		else:
			var removed := s.clean_at(aim_point, radius, power * delta, types, bool(def.get("wet", false)))
			if removed < 0.0 and deb.is_empty():
				_show_hint("%s can't clean %s. Try another tool!" % [def.get("name", ""), Data.dirt_def(s.current_type()).get("name", "this")])
			elif removed > 0.0:
				_area_accum += removed
				if _area_accum > 0.5:
					Game.add_stat("area_cleaned", _area_accum)
					cleaned_area.emit(_area_accum)
					_area_accum = 0.0
			if surf.get("foam", false):
				s.add_foam(delta * 1.2)
	# FX: stream from the visible nozzle to exactly where the crosshair hits.
	if spray and has_aim:
		_place_beam(nozzle.global_position, aim_point)
		splash_fx.global_position = aim_point
		splash_fx.emitting = String(def.get("fx", "")) in ["water", "foam", "bubbles"]
		mist_fx.global_position = aim_point
		mist_fx.emitting = true
		if stream_fx:
			stream_fx.emitting = true
			var dir := (aim_point - stream_fx.global_position)
			if dir.length() > 0.05:
				stream_fx.look_at(aim_point, Vector3.UP if absf(dir.normalized().y) < 0.98 else Vector3.FORWARD)
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
		mist_fx.emitting = has_aim and s != null and aim_point.distance_to(camera.global_position) < surface_range()
		if mist_fx.emitting:
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
			m.albedo_color = Color(0.8, 0.95, 1.0, 0.45)


func _show_hint(text: String) -> void:
	if _hint_t > 0.0:
		return
	_hint_t = 3.0
	hint.emit(text)


# ----------------------------------------------------------------- debris ---

## The ground point the player is looking at (clamped to the tool's reach).
func _work_point(fwd_h: Vector3, reach: float) -> Vector3:
	var ppos := player.global_position
	if has_aim:
		var d := Vector3(aim_point.x - ppos.x, 0, aim_point.z - ppos.z)
		if d.length() <= reach * 1.35:
			return Vector3(aim_point.x, ppos.y, aim_point.z)
	return ppos + fwd_h * reach * 0.75


func _do_debris(delta: float, fwd_h: Vector3) -> void:
	var mode := String(deb.get("mode", "collect"))
	var kinds: Array = deb.get("kinds", [])
	var reach := Game.tool_param(tool_id, "debris", "reach")
	var radius := Game.tool_param(tool_id, "debris", "radius") * _mode_mult("radius")
	var power := Game.tool_param(tool_id, "debris", "power") * _mode_mult("power")
	var ppos := player.global_position
	var free_space := 999999 if capacity <= 0 else capacity - bag_load
	if mode in ["suck", "collect"] and free_space <= 0:
		_show_hint("Bag full! Empty it at a bin (glowing ring) or press INTERACT there.")
		if suction_fx:
			suction_fx.emitting = false
		return
	var got := 0
	var center := _work_point(fwd_h, reach)
	match mode:
		"push":
			# Airflow starts at the nozzle and follows where you look.
			var origin := ppos + fwd_h * 0.3
			for f in map.fields:
				if f.has_kind(kinds):
					f.push(origin, fwd_h, reach * _mode_mult("reach"), radius, power, delta)
		"suck":
			var noz := ppos + fwd_h * 0.8
			for f in map.fields:
				if f.has_kind(kinds):
					got += f.suck(center, radius, noz, power, delta, free_space - got)
			if suction_fx:
				suction_fx.global_position = center + Vector3(0, 0.3, 0)
				suction_fx.emitting = true
		"rake":
			var gather := ppos + fwd_h * 0.8
			for f in map.fields:
				if f.has_kind(kinds):
					f.rake(center, radius, gather, power, delta)
		"collect":
			var target := camera.global_position + fwd_h * 0.4 - Vector3(0, 0.4, 0)
			for f in map.fields:
				if f.has_kind(kinds):
					got += f.collect(center, radius, power, delta, target, free_space - got)
	if got > 0 and mode == "suck":
		_suck_fx_t -= delta
		if _suck_fx_t <= 0.0:
			_suck_fx_t = 0.18
			Fx.spawn_burst(map, center + Vector3(0, 0.3, 0), Fx.burst(Color(0.9, 0.55, 0.2), 8, 1.2, 0.08))
	if got > 0 and capacity > 0:
		bag_load = mini(capacity, bag_load + got)
		load_changed.emit(bag_load, capacity)
		if bag_load >= capacity:
			_show_hint("Bag full! Empty it at a bin (glowing ring) or press INTERACT there.")
