class_name DiscoveryZone
extends Area3D
## Invisible volume that discovers a named location when the player enters.

var location_id := ""

func setup(id: String, size: Vector3) -> void:
	location_id = id
	collision_layer = 0
	collision_mask = 2
	monitorable = false
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = size
	cs.shape = bs
	add_child(cs)
	body_entered.connect(_on_body)

func _on_body(body: Node) -> void:
	if body.is_in_group("player"):
		WorldState.discover_location(location_id)
