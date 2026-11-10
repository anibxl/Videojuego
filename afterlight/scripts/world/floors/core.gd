extends FloorBase
## FLOOR 5 — THE AFTERLIGHT CORE. A floating chamber in a starfield. Placing
## the three Prism Shards on the pedestal awakens the Core and releases the
## Mythic discovery: The Afterlight. (End of the first chapter.)

const C_PINK := Color(1.0, 0.45, 0.72)
const SHARDS := ["l_prism_dawn", "l_prism_dusk", "l_prism_night"]

var rings: Array[Node3D] = []
var sockets: Array[MeshInstance3D] = []
var pillar: MeshInstance3D
var _t := 0.0
var _busy := false

func build() -> void:
	display_name = "The Afterlight Core"
	ambience = ""
	kill_y = -15.0
	setup_environment({"top": Color(0.01, 0.0, 0.03), "horizon": Color(0.12, 0.03, 0.16), "glow": Color(0.4, 0.1, 0.3),
		"ambient": Color(0.5, 0.35, 0.6), "ambient_energy": 0.6, "fog": Color(0.1, 0.03, 0.12), "fog_density": 0.01,
		"stars": 3.0, "aurora": 2.0, "sun_energy": 0.3, "glow_strength": 1.2})
	var floor_m := Mats.tiles(Color(0.12, 0.08, 0.16), Color(0.1, 0.06, 0.13), Color(0.9, 0.4, 0.7), 2.0, 0.1, 1.0, 0.0)
	cyl(Vector3(0, -0.25, 0), 14.0, 0.5, floor_m, true, 48)
	box(Vector3(0, -0.25, 17), Vector3(6, 0.5, 8), floor_m)
	map_bounds = Rect2(-15, -15, 30, 36)
	for i in 36:
		var a := i * TAU / 36.0
		if absf(wrapf(a - PI / 2, -PI, PI)) < 0.3:
			continue   # opening for the bridge (+Z)
		box(Vector3(cos(a) * 13.8, 0.5, sin(a) * 13.8), Vector3(2.5, 1.0, 0.25), Mats.neon(C_PINK, 1.2), true, -a + PI / 2)
	for s in [-1, 1]:
		box(Vector3(s * 2.95, 0.5, 17), Vector3(0.1, 1.0, 8), Mats.neon(C_PINK, 1.5))
	add_elevator(Vector3(0, 0, 23), PI, "5", C_PINK)
	# pedestal
	cyl(Vector3(0, 0.6, 0), 1.6, 1.2, Mats.std(Color(0.2, 0.15, 0.25), 0.3, 0.6), true, 24)
	cyl(Vector3(0, 1.22, 0), 1.7, 0.05, Mats.neon(C_PINK, 2.0), false, 24)
	for i in 3:
		var a := i * TAU / 3.0 - PI / 2
		var sock := MeshInstance3D.new()
		var pm := PrismMesh.new()
		pm.size = Vector3(0.35, 0.8, 0.35)
		sock.mesh = pm
		sock.position = Vector3(cos(a) * 1.0, 1.7, sin(a) * 1.0)
		add_child(sock)
		sockets.append(sock)
	for i in 3:
		var ring := Node3D.new()
		ring.position.y = 4.0
		add_child(ring)
		var mi := MeshInstance3D.new()
		var tm := TorusMesh.new()
		tm.inner_radius = 3.0 + i * 1.4
		tm.outer_radius = 3.12 + i * 1.4
		tm.rings = 48
		tm.ring_segments = 4
		mi.mesh = tm
		mi.material_override = Mats.neon(C_PINK.lerp(Color(0.5, 0.6, 1.0), i / 2.0), 2.5)
		ring.add_child(mi)
		rings.append(ring)
	pillar = MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 1.6
	cm.bottom_radius = 1.0
	cm.height = 120
	cm.cap_top = false
	cm.cap_bottom = false
	pillar.mesh = cm
	pillar.material_override = Mats.beam(C_PINK, 0.6)
	pillar.position.y = 60
	pillar.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(pillar)
	omni(Vector3(0, 4, 0), C_PINK, 2.0, 16)
	var it := add_interactable(Vector3(0, 1.5, 0), "", _place_shards, 3.2)
	it.prompt_func = func() -> String:
		if WorldState.has_flag("core_awakened") or _busy:
			return ""
		var n := _owned()
		return "Place the Prism Shards" if n == 3 else "Prism Pedestal  %d/3" % n
	FX.motes(self, Vector3(0, 6, 0), Vector3(14, 6, 14), Color(1.0, 0.6, 0.85), 90)
	add_location("core_chamber", Vector3(0, 2, 0), Vector3(24, 4, 24))
	_refresh()

func _owned() -> int:
	var n := 0
	for s in SHARDS:
		if Inventory.has_item(s): n += 1
	return n

func _refresh() -> void:
	var awake := WorldState.has_flag("core_awakened")
	for i in 3:
		var def := GameDB.item(SHARDS[i])
		var has := Inventory.has_item(SHARDS[i])
		sockets[i].material_override = Mats.neon(def.color, 4.0) if awake else (Mats.neon(def.color, 0.8) if has else Mats.std(Color(0.15, 0.12, 0.2), 0.5))
	pillar.visible = awake
	if awake and not Inventory.has_item("m_afterlight"):
		add_collectible("m_afterlight", Vector3(0, 1.2, 0), true)

func _place_shards(_p: Node) -> void:
	if _busy or WorldState.has_flag("core_awakened"):
		return
	if _owned() < 3:
		Audio.play("puzzle_fail", -6.0)
		Events.notify("The pedestal has three empty sockets. Find all Prism Shards.", UIKit.WARN)
		return
	_busy = true
	if game:
		game.player.controls_enabled = false
	Audio.play("discover_legendary", 0.0)
	for i in 3:
		var tw := create_tween()
		tw.tween_property(sockets[i], "position:y", 4.0, 1.6).set_trans(Tween.TRANS_SINE)
		sockets[i].material_override = Mats.neon(GameDB.item(SHARDS[i]).color, 5.0)
	await get_tree().create_timer(1.8).timeout
	FX.burst(self, Vector3(0, 4, 0), C_PINK, 120, 10.0, 2.0)
	if game:
		game.cam.add_trauma(0.7)
	for i in 3:
		var tw2 := create_tween()
		tw2.tween_property(sockets[i], "position:y", 1.7, 0.8)
	WorldState.set_flag("core_awakened")
	_refresh()
	pillar.scale = Vector3(0.05, 1, 0.05)
	var tw3 := create_tween()
	tw3.tween_property(pillar, "scale", Vector3.ONE, 1.4).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	Events.notify("THE AFTERLIGHT AWAKENS", C_PINK)
	await get_tree().create_timer(1.0).timeout
	if game:
		game.player.controls_enabled = true
		game.hud.toast("Thank you for playing AFTERLIGHT — Chapter One. Secrets still remain...", UIKit.TEXT)
	_busy = false

func _process(delta: float) -> void:
	_t += delta
	for i in rings.size():
		rings[i].rotation = Vector3(sin(_t * 0.3 + i) * 0.6, _t * (0.2 + i * 0.1), cos(_t * 0.25 + i) * 0.4)
	for i in sockets.size():
		sockets[i].rotation.y += delta * 1.5
