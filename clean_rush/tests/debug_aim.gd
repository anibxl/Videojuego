extends Node
var main
func _ready() -> void:
	_run.call_deferred()
func _run() -> void:
	Game.state = Game.default_state()
	Game.state["tools_owned"].append("pressure_washer")
	main.start_contract("power_wash_patio", "pw_spring")
	await get_tree().create_timer(0.5).timeout
	var p: Player = main.player
	p.select_tool("pressure_washer")
	var t := p.tool
	print("player pos ", p.global_position, " nozzle ", t.nozzle.global_position, " fwd ", -p.global_transform.basis.z)
	var fwd := -p.global_transform.basis.z
	var hit := t._find_target(t.nozzle.global_position, fwd, 6.5, "spray", Data.tool_def("pressure_washer")["surface"]["types"])
	print("hit ", hit)
	var r := t._raycast(t.nozzle.global_position, t.nozzle.global_position + Vector3(0, -3, -2))
	print("raw ray ", r)
	var s: CleanSurface = main.current_map.surfaces[10]
	print("surface10 pos ", s.global_position, " progress ", s.progress(), " type ", s.current_type(), " init ", s.initial_sum)
	var got := s.clean_at(s.global_position, 0.6, 1.6 * 0.016, {"mud": 1.0})
	print("direct clean removed m2 ", got, " progress ", s.progress())
	p.clean_held = true
	await get_tree().create_timer(3.0).timeout
	print("after 3s overall ", main.current_map.overall(), " group floor ", main.current_map.group_progress("floor"), " has_aim ", t.has_aim, " aim_surface ", t.aim_surface)
	get_tree().quit()
