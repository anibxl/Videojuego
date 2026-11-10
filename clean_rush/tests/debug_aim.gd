extends Node
## Developer debug helper (run with -- --debug-aim): prints HUD/touch state.
var main
func _ready() -> void:
	_run.call_deferred()
func _run() -> void:
	Game.state["settings"]["touch"] = 1
	main.start_contract("city_cleanup", "cc_litter")
	await get_tree().create_timer(0.5).timeout
	var t: TouchControls = main.hud.touch
	print("touch visible=", t.visible, " size=", t.size, " pos=", t.global_position, " in_tree=", t.is_visible_in_tree(), " hud size=", main.hud.size)
	get_tree().quit()
