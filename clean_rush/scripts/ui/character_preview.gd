class_name CharacterPreview
extends SubViewportContainer
## Live 3D preview of a CharacterModel in its own small world (studio lighting).
## Drag (finger or mouse) to rotate, pinch / mouse wheel to zoom.

signal rotated

var viewport: SubViewport
var model: CharacterModel
var cam: Camera3D
var pivot: Node3D
var yaw := PI + 0.45   # models face -Z; turn them toward the camera
var zoom := 1.4
var auto_rotate := false
var interactive := true
var _pending: Dictionary = {}
var _touches: Dictionary = {}
var _pinch_dist := 0.0


func _init() -> void:
	stretch = true
	mouse_filter = Control.MOUSE_FILTER_STOP


func _ready() -> void:
	viewport = SubViewport.new()
	viewport.own_world_3d = true
	viewport.transparent_bg = true
	viewport.msaa_3d = Viewport.MSAA_2X if Game.graphics_level() >= 1 else Viewport.MSAA_DISABLED
	viewport.render_target_update_mode = SubViewport.UPDATE_WHEN_VISIBLE
	add_child(viewport)
	var we := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_CLEAR_COLOR
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.75, 0.82, 0.95)
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	we.environment = env
	viewport.add_child(we)
	var key := DirectionalLight3D.new()
	key.light_energy = 1.1
	key.light_color = Color(1.0, 0.96, 0.9)
	key.rotation_degrees = Vector3(-35, 30, 0)
	viewport.add_child(key)
	var rim := DirectionalLight3D.new()
	rim.light_energy = 0.6
	rim.light_color = Color(0.6, 0.85, 1.0)
	rim.rotation_degrees = Vector3(-20, 200, 0)
	viewport.add_child(rim)
	# Pedestal.
	var disc := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.55
	cm.bottom_radius = 0.6
	cm.height = 0.06
	cm.radial_segments = 32
	disc.mesh = cm
	var dm := StandardMaterial3D.new()
	dm.albedo_color = Color("1fc8c8")
	dm.roughness = 0.4
	disc.material_override = dm
	disc.position.y = -0.03
	viewport.add_child(disc)
	pivot = Node3D.new()
	viewport.add_child(pivot)
	model = CharacterModel.new()
	model.appearance = _pending if not _pending.is_empty() else Game.appearance()
	pivot.add_child(model)
	cam = Camera3D.new()
	cam.fov = 32.0
	viewport.add_child(cam)
	_update_camera()


func set_appearance(a: Dictionary) -> void:
	if model:
		model.apply(a)
	else:
		_pending = a.duplicate()


func _update_camera() -> void:
	if cam == null:
		return
	var t := clampf((zoom - 0.5) / 1.5, 0.0, 1.0)
	var dist := lerpf(1.3, 5.6, t)
	var target := Vector3(0, lerpf(1.6, 0.95, t), 0)
	cam.position = target + Vector3(0, 0.15, dist)
	cam.look_at(target, Vector3.UP)


func _process(delta: float) -> void:
	if pivot == null:
		return
	if auto_rotate and _touches.is_empty():
		yaw += delta * 0.5
	pivot.rotation.y = yaw
	if model:
		model.animate(delta, 0.0, false, "")


func _gui_input(event: InputEvent) -> void:
	if not interactive:
		return
	if event is InputEventScreenTouch:
		if event.pressed:
			_touches[event.index] = event.position
		else:
			_touches.erase(event.index)
		_pinch_dist = 0.0
		accept_event()
	elif event is InputEventScreenDrag:
		_touches[event.index] = event.position
		if _touches.size() >= 2:
			var pts: Array = _touches.values()
			var d: float = (pts[0] as Vector2).distance_to(pts[1])
			if _pinch_dist > 0.0:
				zoom = clampf(zoom * _pinch_dist / maxf(d, 1.0), 0.5, 2.0)
				_update_camera()
			_pinch_dist = d
		else:
			yaw += event.relative.x * 0.012
			rotated.emit()
		accept_event()
	elif event is InputEventMouseMotion and event.button_mask & (MOUSE_BUTTON_MASK_LEFT | MOUSE_BUTTON_MASK_RIGHT):
		if not DisplayServer.is_touchscreen_available():
			yaw += event.relative.x * 0.012
			rotated.emit()
			accept_event()
	elif event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			zoom = clampf(zoom - 0.1, 0.5, 2.0)
			_update_camera()
			accept_event()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			zoom = clampf(zoom + 0.1, 0.5, 2.0)
			_update_camera()
			accept_event()
	elif event is InputEventMagnifyGesture:
		zoom = clampf(zoom / event.factor, 0.5, 2.0)
		_update_camera()
		accept_event()
