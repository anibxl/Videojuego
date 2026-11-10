extends Node
## Renders preview screenshots of the menu and every floor (visual QA).
## Run: xvfb-run -s "-screen 0 1280x720x24" godot --rendering-driver opengl3 res://tests/screenshots.tscn
## Output: <project>/screenshots/*.png

var out_dir := ""

func _ready() -> void:
	out_dir = ProjectSettings.globalize_path("res://").path_join("screenshots")
	DirAccess.make_dir_recursive_absolute(out_dir)
	Settings.graphics = 2
	Settings.touch_controls = 1
	await run()
	get_tree().quit()

func shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(out_dir.path_join(name + ".png"))
	print("saved ", name)

func wait(s: float) -> void:
	await get_tree().create_timer(s, true, false, true).timeout

func run() -> void:
	SaveSystem.delete_save()
	var menu: Node = load("res://scenes/main/main_menu.tscn").instantiate()
	add_child(menu)
	await wait(9.0)
	await shot("01_main_menu")
	menu.queue_free()
	await wait(0.3)
	var game: Game = load("res://scenes/main/game.tscn").instantiate()
	add_child(game)
	await wait(1.0)
	game.hud._banner.modulate.a = 0.0
	var views := [
		["city", Vector3(0, 0.1, 22), PI, -0.12, "02_city_plaza"],
		["city", Vector3(-20, 0.1, 6), PI * 0.75, -0.2, "03_city_avenue"],
		["city", Vector3(32, 0.1, 20), PI, -0.1, "04_noodle_alley"],
		["city", Vector3(0, 0.1, -30), 0.0, -0.15, "05_tower_lobby"],
		["mall", Vector3(0, 0.1, 10), 0.0, -0.1, "06_mall_atrium"],
		["underground", Vector3(-20, 0.1, -1), -PI / 2, -0.12, "07_underground"],
		["lab", Vector3(0, 0.1, 15), 0.0, -0.1, "08_lab"],
		["rooftops", Vector3(0, 0.1, 12), 0.0, -0.05, "09_rooftops"],
		["core", Vector3(0, 0.1, 10), 0.0, -0.18, "10_core"],
		["apartment", Vector3(0, 0.1, 4), 0.0, -0.15, "11_apartment"],
	]
	for v in views:
		if game.current_floor.floor_id != v[0]:
			game._load_floor(v[0])
			await wait(0.8)
		game.player.teleport(Transform3D(Basis(Vector3.UP, v[2]), v[1]))
		game.cam.yaw = v[2]
		game.cam.pitch = v[3]
		await wait(1.2)
		await shot(v[4])
	game.hud.open_panel("elevator")
	await wait(0.6)
	await shot("12_elevator_panel")
	game.hud._open_panel.close()
	await wait(0.4)
	Inventory.add_item("r_holo_koi")
	await wait(1.2)
	await shot("13_discovery_popup")
	await wait(4.5)
	game.hud.open_panel("collection")
	await wait(0.6)
	await shot("14_collection")
	game.hud._open_panel.close()
	await wait(0.4)
	game.hud.open_panel("missions")
	await wait(0.6)
	await shot("15_missions")
	game.hud._open_panel.close()
	await wait(0.4)
	game.hud.open_panel("map")
	await wait(0.6)
	await shot("16_map")
	game.hud._open_panel.close()
	await wait(0.4)
	game.hud.open_panel("settings")
	await wait(0.6)
	await shot("17_settings")
	SaveSystem.delete_save()
