class_name Interactable
extends Node3D
## Generic interactable. The player looks for the nearest enabled
## Interactable in range and shows its prompt on the contextual button.
## Behaviour is injected as Callables so floors can define puzzles,
## doors and terminals without one script per object.

@export var prompt := "Interact"
@export var radius := 2.3
var enabled := true
var action: Callable              # func(player) -> void
var prompt_func: Callable         # optional: func() -> String ("" = not available)

func _ready() -> void:
	add_to_group("interactable")

func get_prompt() -> String:
	if not enabled:
		return ""
	if prompt_func.is_valid():
		return prompt_func.call()
	return prompt

func interact(player: Node) -> void:
	if enabled and action.is_valid():
		action.call(player)
