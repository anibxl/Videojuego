extends Node
## Global signal bus. Systems emit here; UI and world listen.
## Keeping cross-system communication in one place makes it easy to later
## route the same events over the network for multiplayer.

signal toast(text: String, color: Color)
signal item_acquired(id: String, is_new: bool)
signal fragments_changed(total: int, delta: int)
signal xp_gained(amount: int, reason: String)
signal level_up(new_level: int)
signal location_discovered(id: String)
signal mission_completed(id: String)
signal missions_changed()
signal achievement_unlocked(id: String)
signal flag_set(flag: String)
signal floor_entered(id: String)
signal decor_changed()
signal equipment_changed()
signal settings_changed()
signal interact_prompt_changed(text: String)
signal challenge_hud(text: String)         # "" hides the challenge banner
signal request_panel(panel: String, data: Dictionary)
signal note_opened(id: String)
signal game_saved()

func _ready() -> void:
	InputSetup.setup()

func notify(text: String, color: Color = Color(0.5, 0.95, 1.0)) -> void:
	toast.emit(text, color)
