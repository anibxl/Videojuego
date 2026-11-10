class_name ContractRunner
extends Node
## Evaluates a contract's objectives against live map progress, tracks time,
## dirt earnings and discoveries, and computes stars when the job is done.

signal objectives_updated(states: Array)
signal objective_completed(index: int, label: String)
signal contract_completed

var map: MapBase
var map_id := ""
var def: Dictionary = {}
var elapsed := 0.0
var running := false
var completed := false
var states: Array = []
var discovery_coins := 0
var session_dirt_coins := 0   # already paid live by the map; shown on the reward screen
var found_ids: Array = []


func setup(m: MapBase, map_identifier: String, contract: Dictionary) -> void:
	map = m
	map_id = map_identifier
	def = contract
	for o in def.get("objectives", []):
		states.append({"label": o.get("label", ""), "progress": 0.0, "target": float(o.get("target", 1.0)), "done": false})
	map.progress_updated.connect(_on_progress)
	map.discovery_found.connect(_on_discovery)
	map.coins_earned.connect(func(n, src):
		if src == "dirt":
			session_dirt_coins += n)
	running = true


func _process(delta: float) -> void:
	if running and not completed:
		elapsed += delta


func objective_value(o: Dictionary) -> float:
	match String(o.get("type", "overall")):
		"surfaces":
			return map.group_progress(o.get("group", ""), o.get("layer", ""))
		"debris":
			return map.debris_progress(o.get("tag", ""), o.get("zone", ""))
		"water":
			return map.water_clarity()
		"discoveries":
			return float(found_ids.size()) / maxf(1.0, float(o.get("target", 1)))
	return map.overall()


func _on_progress(_snap: Dictionary) -> void:
	if not running:
		return
	var objs: Array = def.get("objectives", [])
	var all_done := true
	for i in objs.size():
		var o: Dictionary = objs[i]
		var v := objective_value(o)
		var target := float(o.get("target", 1.0))
		if o.get("type", "") == "discoveries":
			target = 1.0
		states[i]["progress"] = clampf(v / target, 0.0, 1.0)
		states[i]["raw"] = v
		if not states[i]["done"] and v >= target - 0.0001:
			states[i]["done"] = true
			objective_completed.emit(i, states[i]["label"])
		if not states[i]["done"]:
			all_done = false
	objectives_updated.emit(states)
	if all_done and not completed:
		completed = true
		contract_completed.emit()


func _on_discovery(d: Discovery, coins: int) -> void:
	discovery_coins += coins
	found_ids.append(d.disc_id)


func dirt_coins() -> int:
	return session_dirt_coins


func star_breakdown() -> Array:
	var par := float(def.get("par_time", 120))
	var perfect := float(def.get("perfect", 0.95))
	return [
		{"text": "Contract complete", "ok": completed},
		{"text": "Finish under %s" % UIKit.time_str(par), "ok": completed and elapsed <= par},
		{"text": "Location %d%% clean" % int(round(perfect * 100)), "ok": completed and map.overall() >= perfect - 0.0001},
	]


func stars() -> int:
	var n := 0
	for s in star_breakdown():
		if s["ok"]:
			n += 1
	return n


func result() -> Dictionary:
	return {"stars": stars(), "time": elapsed, "overall": map.overall(), "dirt_coins": dirt_coins(),
		"discovery_coins": discovery_coins, "found": found_ids.duplicate()}
