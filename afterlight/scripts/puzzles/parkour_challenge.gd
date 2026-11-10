class_name ParkourChallenge
extends Node3D
## Timed parkour run: touch the start beacon, reach the finish without
## falling. Falling (below the floor's kill plane) or running out of time
## fails the run and returns the player to the beacon.

var flag := ""
var title := "Skyrunner"
var time_limit := 45.0
var start_pos := Vector3.ZERO
var finish_pos := Vector3.ZERO
var reward_item := ""
var active := false
var _left := 0.0
var _tick := 0.0
var _finish: Area3D
var _floor: FloorBase

func is_done() -> bool:
	return WorldState.has_flag(flag)

func setup(floor_node: FloorBase) -> void:
	_floor = floor_node
	# start beacon
	var beacon := Node3D.new()
	beacon.position = start_pos
	floor_node.add_child(beacon)
	floor_node.cyl(start_pos + Vector3(0, 0.4, 0), 0.6, 0.8, Mats.std(Color(0.15, 0.15, 0.22), 0.4, 0.6))
	var orb := floor_node.sphere(start_pos + Vector3(0, 1.3, 0), 0.35, Mats.neon(Color(1.0, 0.45, 0.75), 4.0))
	orb.name = "BeaconOrb"
	floor_node.neon_text("SKYRUNNER", start_pos + Vector3(0, 2.3, 0), 0.0, Color(1.0, 0.45, 0.75), 60, 0.01)
	var it := Interactable.new()
	it.position = Vector3(0, 1.2, 0)
	it.radius = 2.4
	it.prompt_func = func() -> String:
		if active:
			return ""
		return "Start Skyrunner (again)" if is_done() else "Start Skyrunner"
	it.action = func(_p): start()
	beacon.add_child(it)
	# finish ring
	_finish = Area3D.new()
	_finish.collision_layer = 0
	_finish.collision_mask = 2
	_finish.monitorable = false
	var cs := CollisionShape3D.new()
	var sh := CylinderShape3D.new()
	sh.radius = 2.2
	sh.height = 3.0
	cs.shape = sh
	cs.position.y = 1.5
	_finish.add_child(cs)
	_finish.position = finish_pos
	floor_node.add_child(_finish)
	_finish.body_entered.connect(_on_finish)
	var ring := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 1.9
	tm.outer_radius = 2.1
	tm.rings = 32
	tm.ring_segments = 4
	ring.mesh = tm
	ring.material_override = Mats.neon(Color(1.0, 0.45, 0.75), 3.0)
	ring.position.y = 0.05
	_finish.add_child(ring)

func start() -> void:
	if active:
		return
	active = true
	_left = time_limit
	Audio.play("ui_open", 0.0)
	Events.notify("Skyrunner: reach the Summit antenna in %d seconds. Don't fall!" % int(time_limit), Color(1.0, 0.45, 0.75))

func _process(delta: float) -> void:
	if not active:
		return
	_left -= delta
	_tick -= delta
	if _left <= 10.0 and _tick <= 0.0:
		_tick = 1.0
		Audio.play("tick", -2.0)
	Events.challenge_hud.emit("%s  ·  %.1fs" % [title.to_upper(), maxf(_left, 0.0)])
	if _left <= 0.0:
		fail("Time's up!")

## Called by the floor when the player falls. Returns true if handled.
func on_fall(player: Node) -> bool:
	if not active:
		return false
	fail("You fell!")
	if _floor and _floor.game:
		_floor.game.respawn_player(start_pos + Vector3(0, 0, 2.0))
	return true

func fail(reason: String) -> void:
	active = false
	Events.challenge_hud.emit("")
	Audio.play("puzzle_fail", 0.0)
	Events.notify("%s Run failed — touch the beacon to retry." % reason, UIKit.BAD)

func _on_finish(body: Node) -> void:
	if not active or not body.is_in_group("player"):
		return
	active = false
	Events.challenge_hud.emit("")
	var time_used := time_limit - _left
	Events.notify("Skyrunner complete in %.1f s!" % time_used, UIKit.GOOD)
	FX.burst(_floor, finish_pos + Vector3.UP, Color(1.0, 0.45, 0.75), 60, 6.0)
	if not is_done():
		WorldState.set_flag(flag)
		Progression.stats.challenges = int(Progression.stats.get("challenges", 0)) + 1
		if reward_item != "" and not Inventory.has_item(reward_item):
			WorldState.mark_collected("item_" + reward_item)
			Inventory.add_item(reward_item)
	else:
		Audio.play("success", -2.0)

func _exit_tree() -> void:
	if active:
		Events.challenge_hud.emit("")
