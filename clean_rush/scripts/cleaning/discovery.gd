class_name Discovery
extends Node3D
## A hidden collectible. It stays hidden (or unreachable) until the dirt or
## debris covering it is cleaned, then sparkles until the player picks it up.

signal revealed(d: Discovery)
signal found(d: Discovery)

var disc_id := ""
var def: Dictionary = {}
var cover_surface: CleanSurface = null
var cover_field: DebrisField = null
var is_revealed := false
var is_found := false
var model: Node3D
var sparkle: CPUParticles3D
var ring: MeshInstance3D
var _t := 0.0


func setup(id: String, definition: Dictionary, surface: CleanSurface = null, field: DebrisField = null) -> Discovery:
	disc_id = id
	def = definition
	cover_surface = surface
	cover_field = field
	return self


func _ready() -> void:
	model = ItemModels.build(String(def.get("model", "coin")))
	add_child(model)
	if cover_surface != null:
		# Fully hidden under paint/grime: only appears when revealed.
		model.visible = false
	ring = MeshInstance3D.new()
	var t := TorusMesh.new()
	t.inner_radius = 0.32
	t.outer_radius = 0.38
	t.rings = 24
	t.ring_segments = 6
	ring.mesh = t
	ring.scale = Vector3(1, 0.15, 1)
	ring.position.y = 0.03
	var rm := StandardMaterial3D.new()
	rm.albedo_color = Color(1.0, 0.85, 0.25)
	rm.emission_enabled = true
	rm.emission = Color(1.0, 0.8, 0.2)
	rm.emission_energy_multiplier = 1.5
	rm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ring.material_override = rm
	ring.visible = false
	add_child(ring)
	sparkle = Fx.sparkles(Color(1.0, 0.9, 0.4))
	sparkle.emitting = false
	add_child(sparkle)


func check_reveal() -> bool:
	if is_revealed or is_found:
		return false
	var covered := false
	if cover_surface != null:
		covered = cover_surface.dirt_at(global_position) > 0.15
	if cover_field != null:
		covered = covered or cover_field.count_near(global_position, 0.7) > 1
	if not covered:
		reveal()
		return true
	return false


func reveal() -> void:
	is_revealed = true
	model.visible = true
	ring.visible = true
	sparkle.emitting = true
	model.scale = Vector3.ONE * 0.2
	var tw := create_tween()
	tw.tween_property(model, "scale", Vector3.ONE * 1.6, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	revealed.emit(self)


func try_pickup(player_pos: Vector3, radius: float) -> bool:
	if not is_revealed or is_found:
		return false
	var d := player_pos - global_position
	d.y = 0
	if d.length() > radius:
		return false
	is_found = true
	ring.visible = false
	sparkle.emitting = false
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(model, "position:y", 2.2, 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(model, "rotation:y", TAU * 2, 0.5)
	tw.chain().tween_property(model, "scale", Vector3.ZERO, 0.25)
	found.emit(self)
	return true


func _process(delta: float) -> void:
	if is_revealed and not is_found:
		_t += delta
		model.rotation.y += delta * 1.5
		model.position.y = 0.08 + sin(_t * 3.0) * 0.06
		ring.rotation.y -= delta
		var s := 1.0 + sin(_t * 4.0) * 0.08
		ring.scale = Vector3(s, 0.15, s)
