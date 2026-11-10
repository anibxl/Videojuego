extends Node
## Audio manager: pooled one-shot SFX, fading tool loops and background music.
## All sounds are original, synthesised by tools/gen_audio.py.

const SFX_PLAYERS := 10
const LOOP_SOUNDS := ["washer", "blower", "vacuum", "foam", "scrubber", "polisher", "music_garden", "rain", "wind", "ambience_garden", "ambience_city"]

var _streams: Dictionary = {}
var _pool: Array[AudioStreamPlayer] = []
var _pool_index := 0
var _loops: Dictionary = {}   # key -> AudioStreamPlayer
var _music: AudioStreamPlayer
var _music_vol := 0.55
var _sfx_vol := 0.8
var _last_play: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_ensure_bus("Music")
	_ensure_bus("SFX")
	for i in SFX_PLAYERS:
		var p := AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		_pool.append(p)
	_music = AudioStreamPlayer.new()
	_music.bus = "Music"
	_music.volume_db = -6.0
	add_child(_music)


func _ensure_bus(bus_name: String) -> void:
	if AudioServer.get_bus_index(bus_name) == -1:
		AudioServer.add_bus()
		var idx := AudioServer.bus_count - 1
		AudioServer.set_bus_name(idx, bus_name)
		AudioServer.set_bus_send(idx, "Master")


func stream(sound: String) -> AudioStream:
	if _streams.has(sound):
		return _streams[sound]
	var path := "res://assets/audio/%s.wav" % sound
	var s: AudioStream = null
	if ResourceLoader.exists(path):
		s = load(path)
		if s is AudioStreamWAV and sound in LOOP_SOUNDS:
			var w := s as AudioStreamWAV
			w.loop_mode = AudioStreamWAV.LOOP_FORWARD
			w.loop_begin = 0
			var bytes_per_frame := (2 if w.format == AudioStreamWAV.FORMAT_16_BITS else 1) * (2 if w.stereo else 1)
			w.loop_end = int(w.data.size() / bytes_per_frame)
	_streams[sound] = s
	return s


func play(sound: String, volume_db := 0.0, pitch_variation := 0.06, min_interval := 0.04) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if now - float(_last_play.get(sound, -10.0)) < min_interval:
		return
	_last_play[sound] = now
	var s := stream(sound)
	if s == null:
		return
	var p := _pool[_pool_index]
	_pool_index = (_pool_index + 1) % _pool.size()
	p.stream = s
	p.volume_db = volume_db
	p.pitch_scale = 1.0 + randf_range(-pitch_variation, pitch_variation)
	p.play()


func loop_start(key: String, sound: String, volume_db := -4.0, pitch := 1.0) -> void:
	var p: AudioStreamPlayer = _loops.get(key)
	if p == null:
		p = AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		_loops[key] = p
	var s := stream(sound)
	if s == null:
		return
	if p.stream != s or not p.playing:
		p.stream = s
		p.volume_db = -30.0
		p.play()
	p.pitch_scale = pitch
	var tw := create_tween()
	tw.tween_property(p, "volume_db", volume_db, 0.12)


func loop_set_pitch(key: String, pitch: float) -> void:
	var p: AudioStreamPlayer = _loops.get(key)
	if p:
		p.pitch_scale = pitch


func loop_stop(key: String) -> void:
	var p: AudioStreamPlayer = _loops.get(key)
	if p == null or not p.playing:
		return
	var tw := create_tween()
	tw.tween_property(p, "volume_db", -40.0, 0.18)
	tw.tween_callback(p.stop)


func stop_all_loops() -> void:
	for key in _loops.keys():
		loop_stop(key)


func play_music(track := "music_garden") -> void:
	var s := stream(track)
	if s == null or (_music.stream == s and _music.playing):
		return
	_music.stream = s
	_music.play()


func set_volumes(music: float, sfx: float) -> void:
	_music_vol = music
	_sfx_vol = sfx
	_set_bus_linear("Music", music)
	_set_bus_linear("SFX", sfx)


func _set_bus_linear(bus_name: String, v: float) -> void:
	var idx := AudioServer.get_bus_index(bus_name)
	if idx < 0:
		return
	AudioServer.set_bus_mute(idx, v <= 0.001)
	AudioServer.set_bus_volume_db(idx, linear_to_db(maxf(v, 0.001)))
