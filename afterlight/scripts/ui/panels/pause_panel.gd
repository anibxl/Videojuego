extends BasePanel
## Pause menu — every button leads somewhere real.

func _init() -> void:
	super()
	title_text = "Paused"
	subtitle_text = "Afterlight City waits for you."
	max_size = Vector2(760, 640)

func build(c: VBoxContainer) -> void:
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	c.add_child(grid)
	var resume := UIKit.accent_button("Resume", close)
	resume.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_child(resume)
	var save := UIKit.button("Save Game", func():
		if SaveSystem.save_game():
			Events.notify("Game saved.", UIKit.GOOD), Vector2(0, 64))
	save.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_child(save)
	for e in [["Missions", "missions"], ["Inventory", "inventory"], ["Collection Book", "collection"], ["Map", "map"], ["Profile", "profile"], ["Settings", "settings"]]:
		var target: String = e[1]
		var b := UIKit.button(e[0], func(): hud.open_panel(target), Vector2(0, 60))
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		grid.add_child(b)
	c.add_child(UIKit.spacer(4))
	var q := UIKit.button("Save & Quit to Main Menu", func():
		if hud and hud.game:
			hud.game.quit_to_menu(), Vector2(0, 56))
	q.add_theme_color_override("font_color", UIKit.BAD.lightened(0.3))
	c.add_child(q)
	var online := UIKit.label("Online features (friends, visits, shared exploration) are planned for a future update.", 16, UIKit.TEXT_DIM, UIKit.font_med)
	online.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	online.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	c.add_child(online)
