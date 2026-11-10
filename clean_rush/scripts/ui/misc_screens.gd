class_name MiscScreens
extends RefCounted
## Shared helpers for the smaller list screens.

static func list_screen(owner: Control, title: String, back: Callable) -> VBoxContainer:
	owner.add_child(UIKit.backdrop(0.65))
	var v := UIKit.vbox(14)
	owner.add_child(UIKit.fill_screen(v, 24))
	v.add_child(UIKit.header(title, back))
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	v.add_child(scroll)
	var list := UIKit.vbox(10)
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(list)
	return list
