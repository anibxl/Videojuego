class_name ToolPreview
extends SubViewportContainer
## Rotating 3D preview of a tool model (with its equipped skin) in a small
## studio scene. Drag to rotate.

var viewport: SubViewport
var pivot: Node3D
var cam: Camera3D
var tool_id := ""
var _model: Node3D
var _yaw := 0.6
var _dragging := false


func _init() -> void:
	stretch = true
	mouse_filter = Control.MOUSE_FILTER_STOP


func _ready() -> void:
	viewport = SubViewport.new()
	viewport.own_world_3d = true
	viewport.transparent_bg = true
	viewport.msaa_3d = Viewport.MSAA_2X if Game.graphics_level() >= 1 else Viewport.MSAA_DISABLED
	add_child(viewport)
	var we := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_CLEAR_COLOR
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.7, 0.78, 0.9)
	env.ambient_light_energy = 0.6
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	we.environment = env
	viewport.add_child(we)
	var key := DirectionalLight3D.new()
	key.light_energy = 1.2
	key.rotation_degrees = Vector3(-40, 35, 0)
	viewport.add_child(key)
	var rim := DirectionalLight3D.new()
	rim.light_energy = 0.7
	rim.light_color = Color(0.55, 0.85, 1.0)
	rim.rotation_degrees = Vector3(-15, 210, 0)
	viewport.add_child(rim)
	pivot = Node3D.new()
	viewport.add_child(pivot)
	cam = Camera3D.new()
	cam.fov = 30.0
	viewport.add_child(cam)
	if tool_id != "":
		show_tool(tool_id)


func show_tool(id: String) -> void:
	tool_id = id
	if pivot == null:
		return
	if _model:
		_model.queue_free()
	_model = ToolModels.build(id)
	pivot.add_child(_model)
	# Fit the camera to the model's bounds.
	var aabb := AABB()
	var first := true
	for mi in _model.find_children("*", "MeshInstance3D", true, false):
		var m := mi as MeshInstance3D
		var b: AABB = m.transform * m.get_aabb()
		var node := m.get_parent() as Node3D
		while node and node != _model:
			b = node.transform * b
			node = node.get_parent() as Node3D
		aabb = b if first else aabb.merge(b)
		first = false
	var center := aabb.get_center()
	_model.position = -center
	var radius := maxf(aabb.size.length() * 0.5, 0.2)
	cam.position = Vector3(0, radius * 0.35, radius * 3.4)
	cam.look_at(Vector3.ZERO, Vector3.UP)


func _process(delta: float) -> void:
	if pivot:
		if not _dragging:
			_yaw += delta * 0.5
		pivot.rotation.y = _yaw


func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenDrag or (event is InputEventMouseMotion and event.button_mask & MOUSE_BUTTON_MASK_LEFT):
		_yaw += event.relative.x * 0.012
		_dragging = true
		accept_event()
	elif event is InputEventScreenTouch or event is InputEventMouseButton:
		_dragging = event.pressed
