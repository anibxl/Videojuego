class_name GameDB
extends RefCounted
## Static, read-only game content database.
##
## All designer-facing content (rarities, collectibles, notes, floors,
## missions, locations, decorations, level rewards, achievements) lives here
## so gameplay systems stay data-driven. Runtime state lives in the autoload
## systems (Inventory, WorldState, Progression, Missions) — never here.

# ------------------------------------------------------------------ RARITY
enum Rarity { COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, MYTHIC }

const RARITY_NAMES := ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]
const RARITY_COLORS := [
	Color(0.78, 0.82, 0.90),  # common  – soft white
	Color(0.35, 0.95, 0.60),  # uncommon – mint
	Color(0.30, 0.70, 1.00),  # rare     – electric blue
	Color(0.72, 0.42, 1.00),  # epic     – violet
	Color(1.00, 0.72, 0.25),  # legendary – amber
	Color(1.00, 0.35, 0.62),  # mythic   – afterlight pink
]
const RARITY_XP := [15, 30, 60, 100, 200, 400]

static func rarity_color(r: int) -> Color:
	return RARITY_COLORS[clampi(r, 0, 5)]

static func rarity_name(r: int) -> String:
	return RARITY_NAMES[clampi(r, 0, 5)]

# ------------------------------------------------------------------ XP VALUES
const XP_FRAGMENT := 5
const XP_NOTE := 10
const XP_LOCATION := 25
const XP_HIDDEN_LOCATION := 45
const FRAGMENTS_FOR_TOWER := 8

# ------------------------------------------------------------------ COLLECTIBLES
## category: artifact | key | cosmetic | note
## shape: used for both the 3D pickup mesh and the 2D icon.
const ITEMS := {
	# --- THE CITY
	"c_transit_token": {"name": "Transit Token", "rarity": Rarity.COMMON, "category": "artifact", "shape": "coin", "color": Color(0.95, 0.75, 0.35), "floor": "city",
		"desc": "A brass token for a metro line that stopped running long ago. It is inexplicably warm."},
	"c_paper_crane": {"name": "Paper Crane", "rarity": Rarity.COMMON, "category": "artifact", "shape": "pyramid", "color": Color(0.9, 0.9, 1.0), "floor": "city",
		"desc": "Folded from a page of an old city map. One street on it does not exist anymore."},
	"u_snowglobe": {"name": "Snowless Globe", "rarity": Rarity.UNCOMMON, "category": "artifact", "shape": "orb", "color": Color(0.55, 0.85, 1.0), "floor": "city",
		"desc": "A tiny Afterlight City under glass. Shake it all you like — the snow never falls."},
	"e_neon_crown": {"name": "Neon Crown", "rarity": Rarity.EPIC, "category": "cosmetic", "slot": "hat", "shape": "crown", "color": Color(0.85, 0.45, 1.0), "floor": "city",
		"desc": "Hidden by whoever drew the glyphs. Wear it and the city's neon seems to lean toward you."},
	# --- THE FORGOTTEN MALL
	"c_mall_coupon": {"name": "Expired Coupon", "rarity": Rarity.COMMON, "category": "artifact", "shape": "card", "color": Color(1.0, 0.55, 0.6), "floor": "mall",
		"desc": "'Two for one — tonight only.' The date printed on it is tomorrow. Every day."},
	"u_mascot_pin": {"name": "Lumi Pin", "rarity": Rarity.UNCOMMON, "category": "artifact", "shape": "star", "color": Color(1.0, 0.85, 0.4), "floor": "mall",
		"desc": "An enamel pin of Lumi, the moth mascot of the Lumen Galleria. Its wings glow faintly."},
	"r_holo_koi": {"name": "Holo Koi", "rarity": Rarity.RARE, "category": "artifact", "shape": "fish", "color": Color(1.0, 0.5, 0.3), "floor": "mall",
		"desc": "A fish made of light that kept swimming after the fountain dried. Unlocks the Holo Aquarium."},
	"r_lumi_plush": {"name": "Lumi Plush", "rarity": Rarity.RARE, "category": "artifact", "shape": "star", "color": Color(0.7, 0.85, 1.0), "floor": "mall",
		"desc": "The Lost & Found's last unclaimed prize. Soft, slightly glowing, very loved."},
	"l_prism_dawn": {"name": "Prism Shard · Dawn", "rarity": Rarity.LEGENDARY, "category": "key", "shape": "crystal", "color": Color(1.0, 0.72, 0.4), "floor": "mall",
		"desc": "One of three shards of the Afterlight prism. It holds the colour of a sunrise nobody here has seen."},
	# --- THE UNDERGROUND
	"c_cassette": {"name": "Rewound Cassette", "rarity": Rarity.COMMON, "category": "artifact", "shape": "card", "color": Color(0.6, 0.6, 0.7), "floor": "underground",
		"desc": "Label: 'songs for the night shift'. Unlocks the Record Player decoration."},
	"u_tunnel_lantern": {"name": "Tunnel Lantern", "rarity": Rarity.UNCOMMON, "category": "artifact", "shape": "lantern", "color": Color(1.0, 0.7, 0.3), "floor": "underground",
		"desc": "A worker's lantern that relights itself. Unlocks the Lantern decoration."},
	"r_lab_keycard": {"name": "Lab Keycard", "rarity": Rarity.RARE, "category": "key", "shape": "card", "color": Color(0.3, 1.0, 0.85), "floor": "underground",
		"desc": "Halcyon Research — Level 3 clearance. Opens the elevator's path to the Laboratory."},
	"r_crystal_radio": {"name": "Crystal Radio", "rarity": Rarity.RARE, "category": "artifact", "shape": "cube", "color": Color(0.45, 0.8, 1.0), "floor": "underground",
		"desc": "Left as an offering at the shrine. Tuned to a station that broadcasts only static and, sometimes, laughter."},
	"l_prism_dusk": {"name": "Prism Shard · Dusk", "rarity": Rarity.LEGENDARY, "category": "key", "shape": "crystal", "color": Color(0.95, 0.4, 0.75), "floor": "underground",
		"desc": "The second shard, walled away in the dark. It hums when you hold it near the elevator."},
	# --- THE LABORATORY
	"u_visitor_badge": {"name": "Visitor Badge", "rarity": Rarity.UNCOMMON, "category": "artifact", "shape": "card", "color": Color(0.85, 0.95, 1.0), "floor": "lab",
		"desc": "HALCYON RESEARCH — VISITOR. The photo is blank, as if no one ever sat for it."},
	"r_specimen": {"name": "Specimen Zero", "rarity": Rarity.RARE, "category": "artifact", "shape": "orb", "color": Color(0.4, 1.0, 0.7), "floor": "lab",
		"desc": "A sealed jar of what the label calls 'bottled starlight'. It is very slightly heavier at night."},
	"e_stopped_clock": {"name": "Stopped Clock", "rarity": Rarity.EPIC, "category": "artifact", "shape": "clock", "color": Color(0.7, 0.85, 1.0), "floor": "lab",
		"desc": "Every clock in Afterlight stopped at 11:59. This one was stopped on purpose."},
	# --- THE ROOFTOPS
	"u_wind_chime": {"name": "Wind Chime", "rarity": Rarity.UNCOMMON, "category": "artifact", "shape": "lantern", "color": Color(0.6, 1.0, 0.9), "floor": "rooftops",
		"desc": "Rings even when there is no wind, always in the same three notes."},
	"r_silver_feather": {"name": "Silver Feather", "rarity": Rarity.RARE, "category": "cosmetic", "slot": "feather", "shape": "feather", "color": Color(0.85, 0.9, 1.0), "floor": "rooftops",
		"desc": "Dropped by the only pigeon left in the city. Wear it on your hood."},
	"e_compass": {"name": "Compass of Elsewhere", "rarity": Rarity.EPIC, "category": "artifact", "shape": "coin", "color": Color(0.6, 0.6, 1.0), "floor": "rooftops",
		"desc": "Awarded to Skyrunners. It never points north — it points to whatever you have not found yet."},
	"l_prism_night": {"name": "Prism Shard · Night", "rarity": Rarity.LEGENDARY, "category": "key", "shape": "crystal", "color": Color(0.45, 0.55, 1.0), "floor": "rooftops",
		"desc": "The last shard, kept closest to the sky. Three shards together will open the Core."},
	# --- THE CORE
	"m_afterlight": {"name": "The Afterlight", "rarity": Rarity.MYTHIC, "category": "artifact", "shape": "sun", "color": Color(1.0, 0.55, 0.75), "floor": "core",
		"desc": "The light that remained after everyone left. Holding it, the city feels less like it was abandoned, and more like it was waiting."},
	# --- NOTES (environmental storytelling)
	"n_last_shift": {"name": "Note: The Last Shift", "rarity": Rarity.COMMON, "category": "note", "shape": "note", "color": Color(0.9, 0.9, 0.8), "floor": "city",
		"desc": "\"Tower Core is running on fumes. If the lights go out tonight, use the fragments — eight should be enough to wake her up. — M.\""},
	"n_glyph_rumor": {"name": "Note: Glyph Rumour", "rarity": Rarity.COMMON, "category": "note", "shape": "note", "color": Color(0.9, 0.9, 0.8), "floor": "city",
		"desc": "\"Kids keep painting glowing symbols around town. One by the overpass, one above the arcade, one in the alley behind Noodle 24. Touch all three and something opens — or so they say.\""},
	"n_mall_memo": {"name": "Note: Staff Memo", "rarity": Rarity.COMMON, "category": "note", "shape": "note", "color": Color(0.9, 0.9, 0.8), "floor": "mall",
		"desc": "\"Reminder: the STAFF ONLY corridor is behind the blue vending machine by the cinema. Push it back into place when you leave!\""},
	"n_tunnel_scrawl": {"name": "Note: Tunnel Scrawl", "rarity": Rarity.COMMON, "category": "note", "shape": "note", "color": Color(0.9, 0.9, 0.8), "floor": "underground",
		"desc": "Scratched into a tile: \"We bricked up the room past the shrine. The bricks are loose. Don't let them find the shard.\""},
	"n_lab_log1": {"name": "Lab Log 117", "rarity": Rarity.COMMON, "category": "note", "shape": "note", "color": Color(0.9, 0.9, 0.8), "floor": "lab",
		"desc": "\"The prism split into three when we tried to measure it. Dawn, Dusk, Night. Director ordered them hidden across the city.\""},
	"n_lab_clue": {"name": "Lab Log 118 — Grid Restart", "rarity": Rarity.COMMON, "category": "note", "shape": "note", "color": Color(0.9, 0.9, 0.8), "floor": "lab",
		"desc": "\"Restart order for the power grid: first the colour of the sea, then the sun, then the colour of a warning, last the colour of the void between stars.\""},
	"n_rooftop_letter": {"name": "Note: Rooftop Letter", "rarity": Rarity.COMMON, "category": "note", "shape": "note", "color": Color(0.9, 0.9, 0.8), "floor": "rooftops",
		"desc": "\"If you are reading this, you made it all the way up. The water tower is taller than it looks. Look up. — M.\""},
}

static func item(id: String) -> Dictionary:
	return ITEMS.get(id, {})

static func items_by_category(cats: Array) -> Array:
	var out := []
	for id in ITEMS:
		if ITEMS[id].category in cats:
			out.append(id)
	return out

# ------------------------------------------------------------------ FLOORS
## Floor order matches the physical elevator panel (top to bottom on screen).
## req keys: none | mission | level | item | flag | items | future
const FLOORS := [
	{"id": "core", "label": "5", "name": "The Afterlight Core", "subtitle": "Where the light was kept",
		"req": {"items": ["l_prism_dawn", "l_prism_dusk", "l_prism_night"]}, "req_text": "Collect all three Prism Shards."},
	{"id": "rooftops", "label": "4", "name": "The Rooftops", "subtitle": "Closest to the sky",
		"req": {"flag": "lab_grid_restored"}, "req_text": "Restore the Laboratory power grid."},
	{"id": "lab", "label": "3", "name": "Halcyon Laboratory", "subtitle": "Research never sleeps",
		"req": {"item": "r_lab_keycard"}, "req_text": "Find the Lab Keycard in the Underground."},
	{"id": "underground", "label": "2", "name": "The Underground", "subtitle": "Line 7 — Out of service",
		"req": {"level": 3}, "req_text": "Reach Explorer Level 3."},
	{"id": "mall", "label": "1", "name": "The Forgotten Mall", "subtitle": "Lumen Galleria",
		"req": {"flag": "tower_powered"}, "req_text": "Power the Tower Core in the plaza."},
	{"id": "city", "label": "0", "name": "Afterlight City", "subtitle": "Ground level", "req": {}, "req_text": ""},
	{"id": "apartment", "label": "APT", "name": "Your Apartment", "subtitle": "Home, for now", "req": {}, "req_text": ""},
	{"id": "signal", "label": "6", "name": "Signal Lost", "subtitle": "???",
		"req": {"future": true}, "req_text": "This floor does not exist yet. (Arrives in a future update.)"},
]

static func floor_def(id: String) -> Dictionary:
	for f in FLOORS:
		if f.id == id:
			return f
	return {}

const PLAYABLE_FLOORS := ["city", "mall", "underground", "lab", "rooftops", "core", "apartment"]

# ------------------------------------------------------------------ LOCATIONS
const LOCATIONS := {
	"city_plaza": {"name": "Afterlight Plaza", "floor": "city", "hidden": false},
	"city_tower": {"name": "The Central Tower", "floor": "city", "hidden": false},
	"city_noodle_alley": {"name": "Noodle Alley", "floor": "city", "hidden": true},
	"city_glyph_vault": {"name": "The Glyph Vault", "floor": "city", "hidden": true},
	"city_subway": {"name": "Sealed Subway Stairs", "floor": "city", "hidden": true},
	"city_garden": {"name": "Rooftop Garden", "floor": "city", "hidden": true},
	"city_overpass": {"name": "Under the Overpass", "floor": "city", "hidden": true},
	"mall_atrium": {"name": "Galleria Atrium", "floor": "mall", "hidden": false},
	"mall_food": {"name": "Food Court", "floor": "mall", "hidden": false},
	"mall_cinema": {"name": "Nightfall Cinema", "floor": "mall", "hidden": true},
	"mall_staff": {"name": "Staff Only Corridor", "floor": "mall", "hidden": true},
	"ug_platform": {"name": "Line 7 Platform", "floor": "underground", "hidden": false},
	"ug_shrine": {"name": "The Forgotten Shrine", "floor": "underground", "hidden": true},
	"ug_walled": {"name": "The Walled Room", "floor": "underground", "hidden": true},
	"ug_train": {"name": "The Last Train", "floor": "underground", "hidden": false},
	"lab_lobby": {"name": "Halcyon Reception", "floor": "lab", "hidden": false},
	"lab_specimen": {"name": "Specimen Hall", "floor": "lab", "hidden": false},
	"lab_control": {"name": "Grid Control Room", "floor": "lab", "hidden": false},
	"lab_cold": {"name": "Cold Storage", "floor": "lab", "hidden": true},
	"roof_access": {"name": "Rooftop Access", "floor": "rooftops", "hidden": false},
	"roof_summit": {"name": "The Summit", "floor": "rooftops", "hidden": false},
	"roof_coop": {"name": "The Pigeon Coop", "floor": "rooftops", "hidden": true},
	"roof_watertower": {"name": "Top of the Water Tower", "floor": "rooftops", "hidden": true},
	"core_chamber": {"name": "The Afterlight Core", "floor": "core", "hidden": false},
	"apt_home": {"name": "Home", "floor": "apartment", "hidden": false},
}

# ------------------------------------------------------------------ MISSIONS
## kind: tower | flag | flags | location | locations | items | level | rarity_min | notes | locations_count | decor
const MISSIONS := {
	"m_spark": {"type": "main", "name": "Spark of Life", "prereq": "",
		"desc": "The Central Tower has lost its power. Collect 8 Energy Fragments around the city, then channel them into the Tower Core in the plaza.",
		"kind": "tower", "goal": 8, "xp": 150, "fragments": 0},
	"m_mall": {"type": "main", "name": "Echoes of Commerce", "prereq": "m_spark",
		"desc": "The elevator is awake. Ride it to Floor 1 and explore the atrium of the Forgotten Mall.",
		"kind": "location", "target": "mall_atrium", "goal": 1, "xp": 120, "fragments": 2},
	"m_level3": {"type": "main", "name": "Deeper Signals", "prereq": "m_mall",
		"desc": "The path to the Underground is unstable. Reach Explorer Level 3 by exploring, collecting and discovering.",
		"kind": "level", "goal": 3, "xp": 60, "fragments": 2},
	"m_keycard": {"type": "main", "name": "Into the Dark", "prereq": "m_level3",
		"desc": "Somewhere in the Underground lies a Halcyon Lab Keycard. Find it to open the way to the Laboratory.",
		"kind": "items", "targets": ["r_lab_keycard"], "goal": 1, "xp": 150, "fragments": 3},
	"m_grid": {"type": "main", "name": "Restore the Grid", "prereq": "m_keycard",
		"desc": "The Laboratory power grid is offline. Find the restart order and activate the four consoles in the Control Room.",
		"kind": "flag", "target": "lab_grid_restored", "goal": 1, "xp": 200, "fragments": 3},
	"m_summit": {"type": "main", "name": "Above It All", "prereq": "m_grid",
		"desc": "The roof is open. Climb to the Summit — the highest point in Afterlight.",
		"kind": "location", "target": "roof_summit", "goal": 1, "xp": 150, "fragments": 3},
	"m_afterlight": {"type": "main", "name": "The Afterlight", "prereq": "m_summit",
		"desc": "Find the three Prism Shards hidden in the Mall, the Underground and the Rooftops. Then ride to Floor 5 and awaken the Core.",
		"kind": "flag", "target": "core_awakened", "goal": 1, "xp": 500, "fragments": 10,
		"progress_items": ["l_prism_dawn", "l_prism_dusk", "l_prism_night"]},
	"s_glyphs": {"type": "side", "name": "Neon Glyphs", "prereq": "m_spark",
		"desc": "Glowing glyphs have been painted in three hidden places around the city. Touch all of them.",
		"kind": "flags", "targets": ["glyph_1", "glyph_2", "glyph_3"], "goal": 3, "xp": 120, "fragments": 3},
	"s_lostfound": {"type": "side", "name": "Lost & Found", "prereq": "m_mall",
		"desc": "Start the Lost & Found challenge at the desk in the Mall and recover every lost toy before time runs out.",
		"kind": "flag", "target": "challenge_lostfound", "goal": 1, "xp": 150, "fragments": 3},
	"s_mallrat": {"type": "side", "name": "Mall Rat", "prereq": "m_mall",
		"desc": "The Galleria hides more than shops. Discover its two hidden places.",
		"kind": "locations", "targets": ["mall_cinema", "mall_staff"], "goal": 2, "xp": 120, "fragments": 2},
	"s_skyrunner": {"type": "side", "name": "Skyrunner", "prereq": "m_grid",
		"desc": "Touch the beacon on the Rooftops and reach the antenna before time runs out — without falling.",
		"kind": "flag", "target": "challenge_parkour", "goal": 1, "xp": 150, "fragments": 3},
	"e_cartographer": {"type": "exploration", "name": "Cartographer", "prereq": "",
		"desc": "Discover 12 named locations across Afterlight.",
		"kind": "locations_count", "goal": 12, "xp": 200, "fragments": 4},
	"e_secrets": {"type": "exploration", "name": "Off the Map", "prereq": "",
		"desc": "Find 5 hidden locations. Observant explorers look up, down and behind.",
		"kind": "hidden_count", "goal": 5, "xp": 200, "fragments": 4},
	"c_curator": {"type": "collection", "name": "Curator", "prereq": "",
		"desc": "Find 5 forgotten artifacts of Uncommon rarity or higher.",
		"kind": "rarity_min", "rarity": Rarity.UNCOMMON, "goal": 5, "xp": 150, "fragments": 3},
	"c_archivist": {"type": "collection", "name": "Archivist", "prereq": "",
		"desc": "Read 6 notes left behind by the people of Afterlight.",
		"kind": "notes", "goal": 6, "xp": 120, "fragments": 2},
	"c_home": {"type": "collection", "name": "Home Sweet Home", "prereq": "",
		"desc": "Visit your apartment (APT in the elevator) and place 3 decorations.",
		"kind": "decor", "goal": 3, "xp": 100, "fragments": 0},
}

const MISSION_ORDER := ["m_spark", "m_mall", "m_level3", "m_keycard", "m_grid", "m_summit", "m_afterlight",
	"s_glyphs", "s_lostfound", "s_mallrat", "s_skyrunner", "e_cartographer", "e_secrets", "c_curator", "c_archivist", "c_home"]

# ------------------------------------------------------------------ DECORATIONS
const DECOR := {
	"d_plant": {"name": "Moonleaf Plant", "cost": 3, "req": {}, "desc": "A plant that only grows at night. Fits right in."},
	"d_rug": {"name": "Aurora Rug", "cost": 4, "req": {}, "desc": "Soft, round and shimmering."},
	"d_lamp": {"name": "Orb Lamp", "cost": 5, "req": {}, "desc": "Warm light for long nights of exploring."},
	"d_poster": {"name": "Skyline Poster", "cost": 3, "req": {}, "desc": "Afterlight City, the way it used to look."},
	"d_neon": {"name": "Neon 'HOME' Sign", "cost": 6, "req": {"level": 2}, "desc": "Every home needs a sign."},
	"d_record": {"name": "Record Player", "cost": 4, "req": {"item": "c_cassette"}, "desc": "Plays the night shift songs."},
	"d_lantern": {"name": "Tunnel Lantern", "cost": 0, "req": {"item": "u_tunnel_lantern"}, "desc": "Brought up from Line 7."},
	"d_aquarium": {"name": "Holo Aquarium", "cost": 0, "req": {"item": "r_holo_koi"}, "desc": "A home for the Holo Koi."},
	"d_arcade": {"name": "Arcade Cabinet", "cost": 8, "req": {"level": 4}, "desc": "Rescued from Pixel Arcade."},
	"d_telescope": {"name": "Telescope", "cost": 10, "req": {"level": 5}, "desc": "Point it at the stars. They are still there."},
}
const DECOR_ORDER := ["d_plant", "d_rug", "d_lamp", "d_poster", "d_neon", "d_record", "d_lantern", "d_aquarium", "d_arcade", "d_telescope"]
const DISPLAY_SLOTS := 5

# ------------------------------------------------------------------ LEVELS
static func xp_to_next(level: int) -> int:
	return 100 + (level - 1) * 60

const MAX_LEVEL := 20
const LEVEL_REWARDS := {
	2: "Pulse Scanner unlocked — reveal nearby secrets (SCAN).",
	3: "Elevator path to the Underground stabilised.",
	4: "Arcade Cabinet decoration unlocked.",
	5: "Light Step unlocked — you can double jump!",
	6: "Neon Trail cosmetic unlocked (Inventory).",
	8: "Fragment Magnet — fragments drift toward you.",
}
const LEVEL_SCANNER := 2
const LEVEL_DOUBLE_JUMP := 5
const LEVEL_TRAIL := 6
const LEVEL_MAGNET := 8

# ------------------------------------------------------------------ ACHIEVEMENTS
const ACHIEVEMENTS := {
	"a_first_steps": {"name": "First Steps", "desc": "Discover your first location."},
	"a_lights_on": {"name": "Lights On", "desc": "Power the Central Tower."},
	"a_rare": {"name": "Keen Eye", "desc": "Find a Rare discovery."},
	"a_epic": {"name": "Something Special", "desc": "Find an Epic discovery."},
	"a_legendary": {"name": "Legend Hunter", "desc": "Find a Legendary discovery."},
	"a_mythic": {"name": "Afterlight", "desc": "Find the Mythic discovery."},
	"a_all_floors": {"name": "Elevator Operator", "desc": "Visit Floors 0 to 4."},
	"a_level5": {"name": "Seasoned Explorer", "desc": "Reach Explorer Level 5."},
	"a_challenges": {"name": "Problem Solver", "desc": "Complete all three challenges."},
	"a_decorator": {"name": "Interior Designer", "desc": "Place 5 decorations at home."},
	"a_fragments": {"name": "Spark Collector", "desc": "Collect 40 Energy Fragments in total."},
	"a_secrets": {"name": "Secret Keeper", "desc": "Discover 8 hidden locations."},
}

# ------------------------------------------------------------------ LOADING TIPS
const TIPS := [
	"Hidden places rarely have markers. Look up, look behind, look down.",
	"Notes left by the citizens often contain real clues.",
	"Higher Explorer Levels unlock new abilities — not just numbers.",
	"Energy Fragments can be spent on decorations for your apartment.",
	"Use the Pulse Scanner to reveal collectibles hiding nearby.",
	"Your progress is saved automatically after every discovery.",
	"Rare discoveries are never random. They reward curiosity.",
	"The elevator panel tells you exactly what each locked floor needs.",
]
