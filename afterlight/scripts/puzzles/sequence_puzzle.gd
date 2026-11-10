class_name SequencePuzzle
extends Node3D
## Environmental puzzle: activate consoles in the correct order.
## A wrong console resets the sequence with a buzz; the right order (hinted
## by a note found elsewhere on the floor) completes it.

signal solved

var flag := ""
var order: Array = []            # console ids in the correct order
var consoles := {}               # id -> {screen: MeshInstance3D, color: Color}
var _progress: Array = []

func is_done() -> bool:
	return WorldState.has_flag(flag)

func add_console(id: String, parent: FloorBase, pos: Vector3, col: Color, rot_y := 0.0) -> void:
	var root := Node3D.new()
	root.position = pos
	root.rotation.y = rot_y
	parent.add_child(root)
	parent.box(Vector3(0, 0.5, 0), Vector3(1.2, 1.0, 0.8), Mats.std(Color(0.2, 0.22, 0.28), 0.4, 0.6), true, 0.0, root)
	var screen := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(1.0, 0.6, 0.06)
	screen.mesh = bm
	screen.position = Vector3(0, 1.35, -0.1)
	screen.rotation.x = -0.35
	root.add_child(screen)
	var stripe := MeshInstance3D.new()
	var sm := BoxMesh.new()
	sm.size = Vector3(1.22, 0.08, 0.82)
	stripe.mesh = sm
	stripe.position.y = 1.0
	stripe.material_override = Mats.neon(col, 2.5)
	root.add_child(stripe)
	consoles[id] = {"screen": screen, "color": col}
	var it := Interactable.new()
	it.position = Vector3(0, 1.0, 0.6)
	it.radius = 1.9
	it.prompt_func = func() -> String: return "" if is_done() or _progress.has(id) else "Activate Console"
	it.action = func(_p): press(id)
	root.add_child(it)
	_refresh(id)

func press(id: String) -> void:
	if is_done() or _progress.has(id):
		return
	var expected: String = order[_progress.size()]
	if id != expected:
		_progress.clear()
		Audio.play("puzzle_fail", 0.0)
		Events.notify("SEQUENCE REJECTED — grid reset.", UIKit.BAD)
		for c in consoles:
			_refresh(c)
		return
	_progress.append(id)
	Audio.play("puzzle_ok", 0.0)
	_refresh(id)
	if _progress.size() == order.size():
		Audio.play("success", 0.0)
		WorldState.set_flag(flag)
		Progression.stats.challenges = int(Progression.stats.get("challenges", 0)) + 1
		for c in consoles:
			_refresh(c)
		solved.emit()

func _refresh(id: String) -> void:
	var c: Dictionary = consoles[id]
	var on := is_done() or _progress.has(id)
	c.screen.material_override = Mats.neon(c.color, 4.0 if on else 0.35)
