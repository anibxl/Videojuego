extends Node
## Audio: buses (Master / Music / SFX), music + ambience players and a small
## pooled set of one-shot SFX players. All sounds are original and generated
## by tools/gen_audio.py.

const SFX_DIR := "res://assets/audio/"
const POOL_SIZE := 10

var _streams := {}
var _pool: Array[AudioStreamPlayer] = []
var _pool_i := 0
var music: AudioStreamPlayer
var ambience: AudioStreamPlayer
var loop_player: AudioStreamPlayer      # elevator hum etc.
var _music_bus := 0
var _sfx_bus := 0

const NAMES := ["footstep_1", "footstep_2", "jump", "land", "fragment", "pickup", "discover_rare", "discover_epic",
	"discover_legendary", "level_up", "ui_click", "ui_back", "ui_open", "door", "elevator_ding", "elevator_move",
	"puzzle_ok", "puzzle_fail", "success", "scan", "tick", "bricks", "music_theme", "amb_city", "amb_cave"]
const LOOPING := ["music_theme", "amb_city", "amb_cave", "elevator_move"]

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_setup_buses()
	for n in NAMES:
		var path: String = SFX_DIR + n + ".wav"
		if ResourceLoader.exists(path):
			var s = load(path)
			if s is AudioStreamWAV and n in LOOPING:
				s = s.duplicate()
				s.loop_mode = AudioStreamWAV.LOOP_FORWARD
				s.loop_begin = 0
				s.loop_end = s.data.size() / 2   # 16-bit mono -> frames
			_streams[n] = s
	for i in POOL_SIZE:
		var p := AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		_pool.append(p)
	music = _make_player("Music")
	ambience = _make_player("SFX")
	loop_player = _make_player("SFX")
	Events.settings_changed.connect(apply_volumes)
	apply_volumes()

func _make_player(bus: String) -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	p.bus = bus
	add_child(p)
	return p

func _setup_buses() -> void:
	if AudioServer.get_bus_index("Music") == -1:
		AudioServer.add_bus()
		AudioServer.set_bus_name(AudioServer.bus_count - 1, "Music")
		AudioServer.set_bus_send(AudioServer.bus_count - 1, "Master")
	if AudioServer.get_bus_index("SFX") == -1:
		AudioServer.add_bus()
		AudioServer.set_bus_name(AudioServer.bus_count - 1, "SFX")
		AudioServer.set_bus_send(AudioServer.bus_count - 1, "Master")
	_music_bus = AudioServer.get_bus_index("Music")
	_sfx_bus = AudioServer.get_bus_index("SFX")

static func _lin2db(v: float) -> float:
	return -80.0 if v <= 0.001 else linear_to_db(v)

func apply_volumes() -> void:
	AudioServer.set_bus_volume_db(0, _lin2db(Settings.master_volume))
	AudioServer.set_bus_volume_db(_music_bus, _lin2db(Settings.music_volume))
	AudioServer.set_bus_volume_db(_sfx_bus, _lin2db(Settings.sfx_volume))

func has_sound(n: String) -> bool:
	return _streams.has(n)

## Play a one-shot sound effect.
func play(n: String, volume_db := 0.0, pitch_variation := 0.0) -> void:
	if not _streams.has(n):
		return
	var p := _pool[_pool_i]
	_pool_i = (_pool_i + 1) % POOL_SIZE
	p.stream = _streams[n]
	p.volume_db = volume_db
	p.pitch_scale = 1.0 + randf_range(-pitch_variation, pitch_variation)
	p.play()

func ui_click() -> void:
	play("ui_click", -4.0)

func play_music(n: String = "music_theme", volume_db := -6.0) -> void:
	if not _streams.has(n):
		return
	if music.stream == _streams[n] and music.playing:
		return
	music.stream = _streams[n]
	music.volume_db = volume_db
	music.play()

func play_ambience(n: String, volume_db := -10.0) -> void:
	if n == "":
		ambience.stop()
		return
	if not _streams.has(n):
		return
	if ambience.stream == _streams[n] and ambience.playing:
		return
	ambience.stream = _streams[n]
	ambience.volume_db = volume_db
	ambience.play()

func start_loop(n: String, volume_db := -6.0) -> void:
	if _streams.has(n):
		loop_player.stream = _streams[n]
		loop_player.volume_db = volume_db
		loop_player.play()

func stop_loop() -> void:
	loop_player.stop()
