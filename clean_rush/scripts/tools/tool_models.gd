class_name ToolModels
extends RefCounted
## Procedural held-tool models. Each model has a "Nozzle" Marker3D at its
## working end (pointing along local -Z).

static func _m(c: Color, metal := 0.0, rough := 0.5) -> StandardMaterial3D:
	return ItemModels.mat(c, metal, rough)


static func build(tool_id: String) -> Node3D:
	var n := Node3D.new()
	var def := Data.tool_def(tool_id)
	var accent := Data.arr_color(def.get("color", [0.2, 0.6, 0.9]))
	# Cosmetic tool skin (earned through gameplay) recolours the tool body.
	var skin_col := String(Game.tool_skin_def(Game.tool_skin(tool_id)).get("color", ""))
	if skin_col != "" and Color.html_is_valid(skin_col):
		accent = Color(skin_col)
	var dark := _m(Color(0.15, 0.17, 0.2), 0.3, 0.5)
	var wood := _m(Color(0.7, 0.5, 0.3), 0.0, 0.8)
	var metal := _m(Color(0.75, 0.78, 0.8), 0.8, 0.3)
	var acc := _m(accent, 0.1, 0.4)
	var tip := Vector3(0, 0, -0.6)
	match tool_id:
		"rake", "broom", "pool_net", "trash_picker":
			var pole_len := 1.8 if tool_id != "pool_net" else 2.8
			if tool_id == "trash_picker":
				pole_len = 1.0
			ItemModels.part(n, ItemModels.cyl(0.022, pole_len), wood if tool_id != "pool_net" else metal, Vector3(0, -0.15 - sin(0.45) * pole_len / 2, -cos(0.45) * pole_len / 2), Vector3(-PI / 2 - 0.45, 0, 0))
			tip = Vector3(0, -0.15 - sin(0.45) * pole_len, -cos(0.45) * pole_len)
			match tool_id:
				"rake":
					ItemModels.part(n, ItemModels.box(Vector3(0.5, 0.04, 0.05)), acc, tip)
					for i in 7:
						ItemModels.part(n, ItemModels.box(Vector3(0.015, 0.12, 0.015)), dark, tip + Vector3(-0.22 + i * 0.073, -0.06, 0.02))
				"broom":
					ItemModels.part(n, ItemModels.box(Vector3(0.45, 0.08, 0.1)), acc, tip)
					ItemModels.part(n, ItemModels.box(Vector3(0.42, 0.12, 0.08)), _m(Color(0.85, 0.7, 0.35)), tip + Vector3(0, -0.09, 0))
				"pool_net":
					var ring := TorusMesh.new()
					ring.inner_radius = 0.26
					ring.outer_radius = 0.3
					ItemModels.part(n, ring, acc, tip)
					ItemModels.part(n, ItemModels.sphere(0.26), _m(Color(0.9, 0.95, 1.0, 0.6), 0.0, 0.8), tip + Vector3(0, -0.1, 0), Vector3.ZERO, Vector3(1, 0.5, 1))
				"trash_picker":
					ItemModels.part(n, ItemModels.box(Vector3(0.03, 0.12, 0.03)), acc, tip + Vector3(0.03, 0, 0))
					ItemModels.part(n, ItemModels.box(Vector3(0.03, 0.12, 0.03)), acc, tip + Vector3(-0.03, 0, 0))
					ItemModels.part(n, ItemModels.box(Vector3(0.08, 0.14, 0.06)), acc, Vector3(0, 0, 0.05))
		"sponge":
			ItemModels.part(n, ItemModels.box(Vector3(0.18, 0.08, 0.12)), acc, Vector3(0, 0, -0.12))
			ItemModels.part(n, ItemModels.box(Vector3(0.18, 0.03, 0.12)), _m(Color(0.3, 0.75, 0.35)), Vector3(0, -0.055, -0.12))
			tip = Vector3(0, -0.06, -0.15)
		"leaf_blower", "leaf_vacuum", "pro_blower", "garden_vacuum":
			ItemModels.part(n, ItemModels.box(Vector3(0.2, 0.25, 0.4)), acc, Vector3(0, 0, 0.05))
			ItemModels.part(n, ItemModels.box(Vector3(0.05, 0.12, 0.2)), dark, Vector3(0, 0.17, 0.05))
			var tube_r := 0.06 if tool_id in ["leaf_blower", "pro_blower"] else 0.09
			ItemModels.part(n, ItemModels.cyl(tube_r, 1.0, tube_r * 0.8), dark, Vector3(0, -0.2 - sin(0.35) * 0.5, -0.05 - cos(0.35) * 0.5), Vector3(-PI / 2 - 0.35, 0, 0))
			tip = Vector3(0, -0.2 - sin(0.35), -0.05 - cos(0.35))
			if tool_id == "pro_blower":
				ItemModels.part(n, ItemModels.box(Vector3(0.3, 0.32, 0.18)), dark, Vector3(0, 0.05, 0.25))
			if tool_id in ["leaf_vacuum", "garden_vacuum"]:
				ItemModels.part(n, ItemModels.sphere(0.22), _m(Color(0.25, 0.3, 0.35)), Vector3(0.2, -0.2, 0.25), Vector3.ZERO, Vector3(0.8, 1.2, 1))
		"pressure_washer", "turbo_nozzle", "foam_sprayer":
			ItemModels.part(n, ItemModels.box(Vector3(0.06, 0.18, 0.08)), dark, Vector3(0, -0.06, 0.05))
			ItemModels.part(n, ItemModels.box(Vector3(0.08, 0.08, 0.3)), acc, Vector3(0, 0.03, -0.1))
			ItemModels.part(n, ItemModels.cyl(0.018, 0.7), metal, Vector3(0, 0.03, -0.6), Vector3(-PI / 2, 0, 0))
			if tool_id == "turbo_nozzle":
				ItemModels.part(n, ItemModels.cyl(0.04, 0.12, 0.025), _m(Color(0.95, 0.25, 0.3)), Vector3(0, 0.03, -0.98), Vector3(-PI / 2, 0, 0))
			if tool_id == "foam_sprayer":
				ItemModels.part(n, ItemModels.cyl(0.09, 0.22), _m(Color(0.95, 0.95, 1.0, 0.85)), Vector3(0, 0.18, -0.12))
			tip = Vector3(0, 0.03, -1.0)
		"pool_vacuum":
			ItemModels.part(n, ItemModels.cyl(0.025, 3.0), metal, Vector3(0, -0.15 - sin(0.55) * 1.5, -cos(0.55) * 1.5), Vector3(-PI / 2 - 0.55, 0, 0))
			tip = Vector3(0, -0.15 - sin(0.55) * 3.0, -cos(0.55) * 3.0)
			ItemModels.part(n, ItemModels.box(Vector3(0.45, 0.06, 0.2)), acc, tip)
		"scrubber", "polisher":
			ItemModels.part(n, ItemModels.box(Vector3(0.14, 0.14, 0.26)), acc, Vector3(0, 0, -0.05))
			ItemModels.part(n, ItemModels.cyl(0.03, 0.4), dark, Vector3(0, 0, -0.35), Vector3(-PI / 2, 0, 0))
			var head := ItemModels.part(n, ItemModels.cyl(0.18, 0.08), _m(Color(0.95, 0.95, 0.95)) if tool_id == "polisher" else _m(Color(0.3, 0.25, 0.2)), Vector3(0, 0, -0.6), Vector3(-PI / 2, 0, 0))
			head.name = "Spinner"
			tip = Vector3(0, 0, -0.66)
		_:
			ItemModels.part(n, ItemModels.box(Vector3(0.1, 0.1, 0.5)), acc, Vector3(0, 0, -0.25))
	var nozzle := Marker3D.new()
	nozzle.name = "Nozzle"
	nozzle.position = tip
	n.add_child(nozzle)
	return n
