class_name HiddenObjectChallenge
extends Node3D
## Timed hidden-object challenge: find every lost item before time runs out.
## Start at a terminal; items appear at fixed hand-placed spots; success
## grants a reward item + flag, failure clears them so the player can retry.

var flag := ""
var title := "Lost & Found"
var spots: Array = []          # Array[Vector3] (local to parent floor)
var time_limit := 90.0
var reward_item := ""
var item_color := Color(1.0, 0.8, 0.4)
var active := false
var _left := 0.0
var _found := 0
var _items: Array = []
var _tick := 0.0

func is_done() -> bool:
	return WorldState.has_flag(flag)

func start() -> void:
	if active or is_done():
		return
	active = true
	_found = 0
	_left = time_limit
	Audio.play("ui_open", 0.0)
	Events.notify("%s: find %d lost toys in %d seconds!" % [title, spots.size(), int(time_limit)], item_color)
	for p in spots:
		var a := Area3D.new()
		a.collision_layer = 0
		a.collision_mask = 2
		a.monitorable = false
		var cs := CollisionShape3D.new()
		var sh := SphereShape3D.new()
		sh.radius = 0.9
		cs.shape = sh
		a.add_child(cs)
		var mi := MeshInstance3D.new()
		var pm := PrismMesh.new()
		pm.size = Vector3(0.4, 0.45, 0.2)
		mi.mesh = pm
		mi.material_override = Mats.neon(item_color, 3.0)
		mi.position.y = 0.6
		a.add_child(mi)
		var beam := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.25; cm.bottom_radius = 0.35; cm.height = 6.0; cm.cap_top = false; cm.cap_bottom = false
		beam.mesh = cm
		beam.material_override = Mats.beam(item_color, 0.45)
		beam.position.y = 3.0
		a.add_child(beam)
		get_parent().add_child(a)
		a.position = p
		a.body_entered.connect(_on_found.bind(a))
		_items.append(a)
	_update_hud()

func _process(delta: float) -> void:
	if not active:
		return
	for a in _items:
		if is_instance_valid(a):
			a.get_child(1).rotation.y += delta * 2.0
	_left -= delta
	_tick -= delta
	if _left <= 10.0 and _tick <= 0.0:
		_tick = 1.0
		Audio.play("tick", -2.0)
	_update_hud()
	if _left <= 0.0:
		_fail()

func _update_hud() -> void:
	Events.challenge_hud.emit("%s  ·  %d / %d  ·  %ds" % [title.to_upper(), _found, spots.size(), ceili(maxf(_left, 0.0))])

func _on_found(body: Node, a: Area3D) -> void:
	if not active or not body.is_in_group("player") or not is_instance_valid(a):
		return
	_found += 1
	Audio.play("puzzle_ok", -2.0)
	FX.burst(get_parent(), a.global_position + Vector3.UP * 0.6, item_color, 20, 3.0)
	_items.erase(a)
	a.queue_free()
	if _found >= spots.size():
		_succeed()

func _clear() -> void:
	for a in _items:
		if is_instance_valid(a):
			a.queue_free()
	_items.clear()
	active = false
	Events.challenge_hud.emit("")

func _succeed() -> void:
	_clear()
	Events.notify("Every toy is home. Challenge complete!", UIKit.GOOD)
	if reward_item != "" and not Inventory.has_item(reward_item):
		WorldState.mark_collected("item_" + reward_item)
		Inventory.add_item(reward_item)
	WorldState.set_flag(flag)
	Progression.stats.challenges = int(Progression.stats.get("challenges", 0)) + 1

func _fail() -> void:
	_clear()
	Audio.play("puzzle_fail", 0.0)
	Events.notify("Time's up! Talk to the desk to try again.", UIKit.BAD)

func _exit_tree() -> void:
	if active:
		Events.challenge_hud.emit("")
