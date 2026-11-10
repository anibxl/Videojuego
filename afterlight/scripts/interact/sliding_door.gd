class_name SlidingDoor
extends Node3D
## A physical door panel that slides (sideways, up or down) with collision.
## Used for secret doors, shop shutters and the elevator.

signal opened
signal closed

var is_open := false
var _body: AnimatableBody3D
var _open_offset := Vector3.ZERO
var _tween: Tween
var duration := 0.9

func setup(size: Vector3, mat: Material, open_offset: Vector3, start_open := false) -> void:
	_open_offset = open_offset
	_body = AnimatableBody3D.new()
	_body.sync_to_physics = false
	add_child(_body)
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	_body.add_child(mi)
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = size
	cs.shape = bs
	_body.add_child(cs)
	if start_open:
		is_open = true
		_body.position = _open_offset

func add_detail(node: Node3D) -> void:
	_body.add_child(node)

func open(silent := false) -> void:
	if is_open:
		return
	is_open = true
	if not silent:
		Audio.play("door", -4.0, 0.05)
	_animate(_open_offset)
	await _tween.finished
	opened.emit()

func close(silent := false) -> void:
	if not is_open:
		return
	is_open = false
	if not silent:
		Audio.play("door", -4.0, 0.05)
	_animate(Vector3.ZERO)
	await _tween.finished
	closed.emit()

func set_open_instant(v: bool) -> void:
	is_open = v
	_body.position = _open_offset if v else Vector3.ZERO

func _animate(target: Vector3) -> void:
	if _tween:
		_tween.kill()
	_tween = create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	_tween.tween_property(_body, "position", target, duration)
