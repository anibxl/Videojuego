extends FloorBase
## YOUR APARTMENT — the personal room. Decorations bought with fragments,
## display stands for artifacts, a home terminal, and a bed to rest (save).

const C_WARM := Color(1.0, 0.75, 0.5)
const C_PINK := Color(1.0, 0.45, 0.72)
const C_CYAN := Color(0.4, 0.92, 1.0)

var decor_nodes := {}
var stand_nodes: Array[Node3D] = []
var _t := 0.0

func build() -> void:
	display_name = "Your Apartment"
	ambience = "amb_city"
	kill_y = -10.0
	setup_environment({"top": Color(0.02, 0.02, 0.07), "horizon": Color(0.3, 0.12, 0.35), "ambient": Color(0.6, 0.45, 0.5),
		"ambient_energy": 0.9, "fog": Color(0.15, 0.08, 0.2), "fog_density": 0.004, "sun_energy": 0.35, "sun_dir": Vector3(-30, 180, 0)})
	var floor_m := Mats.tiles(Color(0.36, 0.25, 0.2), Color(0.33, 0.23, 0.18), Color(0.2, 0.13, 0.1), 0.6, 0.55, 0.0, 0.1)
	var wall := Mats.std(Color(0.28, 0.24, 0.36), 0.85)
	var H := 3.6
	box(Vector3(0, -0.25, 1), Vector3(15, 0.5, 15), floor_m)
	box(Vector3(0, H + 0.2, 0), Vector3(15, 0.4, 13), Mats.std(Color(0.2, 0.18, 0.26), 0.9))
	box(Vector3(-7.2, H / 2, 0), Vector3(0.4, H, 12.4), wall)
	box(Vector3(7.2, H / 2, 0), Vector3(0.4, H, 12.4), wall)
	# north wall with a big window (x -4..4, y 0.9..3.0)
	box(Vector3(-5.6, H / 2, -6.2), Vector3(3.2, H, 0.4), wall)
	box(Vector3(5.6, H / 2, -6.2), Vector3(3.2, H, 0.4), wall)
	box(Vector3(0, 0.45, -6.2), Vector3(8, 0.9, 0.4), wall)
	box(Vector3(0, 3.3, -6.2), Vector3(8, 0.6, 0.4), wall)
	box(Vector3(0, 1.95, -6.25), Vector3(8, 2.1, 0.05), Mats.glass(Color(0.4, 0.5, 0.8, 0.1)))
	box(Vector3(0, 1.95, -6.2), Vector3(0.08, 2.1, 0.12), Mats.std(Color(0.1, 0.1, 0.12)), false)
	# south wall with door to the elevator hallway
	box(Vector3(-4.3, H / 2, 6.2), Vector3(5.8, H, 0.4), wall)
	box(Vector3(4.3, H / 2, 6.2), Vector3(5.8, H, 0.4), wall)
	box(Vector3(0, 3.2, 6.2), Vector3(2.8, 0.8, 0.4), wall)
	box(Vector3(-1.8, H / 2, 7.1), Vector3(0.4, H, 1.8), wall)
	box(Vector3(1.8, H / 2, 7.1), Vector3(0.4, H, 1.8), wall)
	box(Vector3(0, H + 0.2, 7.1), Vector3(4, 0.4, 2), wall)
	add_elevator(Vector3(0, 0, 10), PI, "APT", C_WARM)
	# view: skyline outside the window
	for i in 14:
		var x := -60.0 + i * 9.0 + randf_range(-2, 2)
		building(Vector3(x, -30, -40 - randf_range(0, 40)), Vector3(8 + randf() * 6, 50 + randf() * 50, 10), i, Color(0.06, 0.06, 0.12), 0.25, false)
	neon_text("AFTERLIGHT", Vector3(-10, 30, -70), 0.0, C_PINK, 200, 0.03)
	# furniture
	var wood := Mats.std(Color(0.4, 0.27, 0.2), 0.7)
	box(Vector3(-5.3, 0.3, -3.5), Vector3(2.6, 0.6, 3.2), wood)
	box(Vector3(-5.3, 0.65, -3.4), Vector3(2.4, 0.15, 3.0), Mats.std(Color(0.35, 0.3, 0.6), 0.9), false)
	box(Vector3(-5.3, 0.8, -4.7), Vector3(1.8, 0.2, 0.5), Mats.std(Color(0.9, 0.88, 0.85), 0.9), false)
	box(Vector3(6.2, 0.75, -4.0), Vector3(1.4, 0.08, 2.6), wood)
	for z in [-5.0, -3.0]:
		box(Vector3(6.2, 0.37, z), Vector3(1.2, 0.74, 0.1), wood, false)
	box(Vector3(6.4, 1.25, -4.0), Vector3(0.1, 0.8, 1.3), Mats.neon(C_CYAN, 1.2), false)
	box(Vector3(5.0, 0.35, -4.0), Vector3(0.6, 0.7, 0.6), Mats.std(Color(0.2, 0.2, 0.3), 0.7))
	# couch facing the window
	box(Vector3(0, 0.25, 1.2), Vector3(3.6, 0.5, 1.1), Mats.std(Color(0.5, 0.25, 0.4), 0.9))
	box(Vector3(0, 0.7, 1.7), Vector3(3.6, 0.9, 0.3), Mats.std(Color(0.5, 0.25, 0.4), 0.9), false)
	var lamp := omni(Vector3(0, 3.0, 0), C_WARM, 2.2, 14)
	lamp.shadow_enabled = false
	box(Vector3(0, H - 0.02, 0), Vector3(1.2, 0.04, 1.2), Mats.neon(C_WARM, 2.0), false)
	add_location("apt_home", Vector3(0, 1.5, 0), Vector3(13, 3, 11))
	# interactions
	add_interactable(Vector3(5.6, 1.1, -4.0), "Home Terminal", func(_p): Events.request_panel.emit("room", {"tab": 0}), 2.0)
	add_interactable(Vector3(-4.0, 0.9, -3.0), "Rest (Save Game)", func(_p):
		if SaveSystem.save_game():
			Audio.play("success", -6.0)
			Events.notify("You rest for a moment. Progress saved.", UIKit.GOOD), 1.8)
	_stands()
	_decor()
	Events.decor_changed.connect(_refresh)
	Events.item_acquired.connect(func(_a, _b): _refresh())
	_refresh()

func _stands() -> void:
	for i in GameDB.DISPLAY_SLOTS:
		var p := Vector3(-6.3, 0, -0.6 + i * 1.4)
		cyl(p + Vector3(0, 0.5, 0), 0.4, 1.0, Mats.std(Color(0.15, 0.13, 0.22), 0.3, 0.5), true, 16)
		cyl(p + Vector3(0, 1.02, 0), 0.42, 0.04, Mats.neon(C_CYAN, 1.5), false, 16)
		var holder := Node3D.new()
		holder.position = p + Vector3(0, 1.55, 0)
		add_child(holder)
		stand_nodes.append(holder)
		var idx := i
		add_interactable(p + Vector3(0.8, 1.0, 0), "Display Stand %d" % (i + 1), func(_pl): Events.request_panel.emit("room", {"tab": 1, "slot": idx}), 1.3)
	spot(Vector3(-4.5, 3.4, 2.2), Vector3(-6.3, 1.2, 2.2), C_WARM, 2.0, 8.0, 50.0)

func _decor_root(id: String, pos: Vector3) -> Node3D:
	var n := Node3D.new()
	n.position = pos
	add_child(n)
	decor_nodes[id] = n
	return n

func _decor() -> void:
	var r: Node3D
	r = _decor_root("d_plant", Vector3(6.3, 0, 5.2))
	box(Vector3(0, 0.3, 0), Vector3(0.6, 0.6, 0.6), Mats.std(Color(0.8, 0.8, 0.85), 0.5), true, 0.0, r)
	for k in 3:
		var leaf := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.35 - k * 0.07
		sm.height = sm.radius * 2
		leaf.mesh = sm
		leaf.position = Vector3(0, 0.9 + k * 0.35, 0)
		leaf.material_override = Mats.std(Color(0.2, 0.6, 0.5).lerp(Color(0.4, 0.9, 0.8), k / 2.0), 0.7)
		r.add_child(leaf)
	r = _decor_root("d_rug", Vector3(0, 0.01, -1.0))
	var rug := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 2.0; cm.bottom_radius = 2.0; cm.height = 0.02; cm.radial_segments = 32
	rug.mesh = cm
	rug.material_override = Mats.neon(Color(0.4, 0.3, 0.8), 0.35)
	r.add_child(rug)
	r = _decor_root("d_lamp", Vector3(-5.3, 0, -1.4))
	box(Vector3(0, 0.6, 0), Vector3(0.08, 1.2, 0.08), Mats.std(Color(0.2, 0.2, 0.2)), false, 0.0, r)
	var orb := MeshInstance3D.new()
	var om := SphereMesh.new()
	om.radius = 0.28; om.height = 0.56
	orb.mesh = om
	orb.position.y = 1.35
	orb.material_override = Mats.neon(C_WARM, 3.0)
	r.add_child(orb)
	var ol := OmniLight3D.new()
	ol.light_color = C_WARM; ol.light_energy = 0.8; ol.omni_range = 4.0; ol.position.y = 1.35
	r.add_child(ol)
	r = _decor_root("d_poster", Vector3(6.98, 1.9, 1.5))
	box(Vector3.ZERO, Vector3(0.04, 1.4, 1.0), Mats.neon(Color(0.9, 0.35, 0.6), 0.9), false, 0.0, r)
	box(Vector3(-0.01, -0.2, 0), Vector3(0.04, 0.6, 0.9), Mats.neon(Color(0.3, 0.5, 1.0), 1.2), false, 0.0, r)
	r = _decor_root("d_neon", Vector3(0, 3.0, -5.95))
	var lbl := Label3D.new()
	lbl.text = "HOME"
	lbl.font = load("res://assets/fonts/Rajdhani-Bold.ttf")
	lbl.font_size = 96
	lbl.pixel_size = 0.006
	lbl.modulate = Color(C_PINK.r * 2.2, C_PINK.g * 2.2, C_PINK.b * 2.2)
	lbl.shaded = false
	r.add_child(lbl)
	r = _decor_root("d_record", Vector3(6.2, 0, 3.2))
	box(Vector3(0, 0.35, 0), Vector3(0.9, 0.7, 0.7), Mats.std(Color(0.35, 0.22, 0.16), 0.6), true, 0.0, r)
	var disc := MeshInstance3D.new()
	var dm := CylinderMesh.new()
	dm.top_radius = 0.3; dm.bottom_radius = 0.3; dm.height = 0.02
	disc.mesh = dm
	disc.position.y = 0.72
	disc.material_override = Mats.std(Color(0.05, 0.05, 0.05), 0.2)
	disc.name = "Disc"
	r.add_child(disc)
	r = _decor_root("d_lantern", Vector3(-3.2, 0, -5.4))
	var lm := MeshInstance3D.new()
	lm.mesh = Mats.shape_mesh("lantern")
	lm.position.y = 0.2
	lm.material_override = Mats.neon(Color(1.0, 0.7, 0.3), 2.5)
	r.add_child(lm)
	r = _decor_root("d_aquarium", Vector3(3.4, 0, -5.3))
	box(Vector3(0, 0.4, 0), Vector3(1.8, 0.8, 0.7), Mats.std(Color(0.1, 0.1, 0.15)), true, 0.0, r)
	box(Vector3(0, 1.2, 0), Vector3(1.8, 0.8, 0.7), Mats.glass(Color(0.3, 0.7, 1.0, 0.25)), false, 0.0, r)
	var fish := MeshInstance3D.new()
	fish.mesh = Mats.shape_mesh("fish")
	fish.rotation.z = PI / 2
	fish.position.y = 1.2
	fish.material_override = Mats.holo(Color(1.0, 0.5, 0.3, 0.9), 1.4)
	fish.name = "Fish"
	r.add_child(fish)
	r = _decor_root("d_arcade", Vector3(6.4, 0, -1.2))
	box(Vector3(0, 0.95, 0), Vector3(0.8, 1.9, 0.9), Mats.std(Color(0.15, 0.08, 0.25), 0.5), true, 0.0, r)
	box(Vector3(-0.41, 1.35, 0), Vector3(0.02, 0.55, 0.65), Mats.neon(C_CYAN, 2.0), false, 0.0, r)
	box(Vector3(-0.41, 1.8, 0), Vector3(0.03, 0.15, 0.85), Mats.neon(C_PINK, 2.5), false, 0.0, r)
	r = _decor_root("d_telescope", Vector3(-1.4, 0, -5.0))
	var tube := MeshInstance3D.new()
	tube.mesh = Mats.shape_mesh("lantern")
	tube.scale = Vector3(0.5, 3.0, 0.5)
	tube.rotation.x = -0.9
	tube.position.y = 1.3
	tube.material_override = Mats.std(Color(0.75, 0.7, 0.55), 0.3, 0.9)
	r.add_child(tube)
	for k in 3:
		var a := k * TAU / 3.0
		box(Vector3(cos(a) * 0.3, 0.6, sin(a) * 0.3), Vector3(0.05, 1.2, 0.05), Mats.std(Color(0.2, 0.2, 0.2)), false, 0.0, r)

func _refresh() -> void:
	for id in decor_nodes:
		decor_nodes[id].visible = WorldState.placed_decor.has(id)
		for c in decor_nodes[id].find_children("*", "StaticBody3D", true, false):
			(c as StaticBody3D).collision_layer = 1 if decor_nodes[id].visible else 0
	for i in stand_nodes.size():
		for c in stand_nodes[i].get_children():
			c.queue_free()
		var id: String = WorldState.display_slots[i]
		if id == "" or not Inventory.has_item(id):
			continue
		var def := GameDB.item(id)
		var mi := MeshInstance3D.new()
		mi.mesh = Mats.shape_mesh(def.shape)
		mi.material_override = Mats.neon(def.color, 1.5 + def.rarity * 0.5)
		if def.shape in ["coin", "clock"]:
			mi.rotation.x = PI / 2
		stand_nodes[i].add_child(mi)
		var l := Label3D.new()
		l.text = def.name
		l.font = load("res://assets/fonts/Rajdhani-Bold.ttf")
		l.font_size = 40
		l.pixel_size = 0.004
		l.position = Vector3(0, -0.35, 0)
		l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		l.modulate = GameDB.rarity_color(def.rarity)
		l.outline_size = 8
		stand_nodes[i].add_child(l)

func _process(delta: float) -> void:
	_t += delta
	for h in stand_nodes:
		for c in h.get_children():
			if c is MeshInstance3D:
				c.rotation.y += delta * 0.8
	var rec: Node3D = decor_nodes.get("d_record")
	if rec and rec.visible:
		rec.get_node("Disc").rotation.y += delta * 3.0
	var aq: Node3D = decor_nodes.get("d_aquarium")
	if aq and aq.visible:
		aq.get_node("Fish").position = Vector3(sin(_t * 0.7) * 0.6, 1.2 + sin(_t * 1.3) * 0.1, 0)
		aq.get_node("Fish").rotation.y = PI if cos(_t * 0.7) < 0 else 0.0
