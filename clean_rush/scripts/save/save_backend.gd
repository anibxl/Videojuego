class_name SaveBackend
extends RefCounted
## Storage abstraction used by SaveStore. The game currently uses only the
## local backend below. A future optional cloud backend (e.g. Google Play Games
## Saved Games or a custom account service) can implement the same methods and
## be plugged into SaveStore without touching game code.
## NOTE: no cloud synchronisation exists in this version.


func read_text(path: String) -> String:
	if not FileAccess.file_exists(path):
		return ""
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return ""
	return f.get_as_text()


## Writes to a temporary file, verifies it, then atomically replaces `path`
## (keeping the previous version as `backup_path` when given).
func write_text_atomic(path: String, text: String, backup_path := "") -> bool:
	var tmp := path + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		push_error("Save: cannot open %s (%s)" % [tmp, FileAccess.get_open_error()])
		return false
	f.store_string(text)
	f.flush()
	f.close()
	# Verify what actually reached the disk.
	if read_text(tmp) != text:
		push_error("Save: verification failed for " + tmp)
		DirAccess.remove_absolute(tmp)
		return false
	if backup_path != "" and FileAccess.file_exists(path):
		if FileAccess.file_exists(backup_path):
			DirAccess.remove_absolute(backup_path)
		DirAccess.rename_absolute(path, backup_path)
	elif FileAccess.file_exists(path):
		DirAccess.remove_absolute(path)
	return DirAccess.rename_absolute(tmp, path) == OK


func exists(path: String) -> bool:
	return FileAccess.file_exists(path)


func remove(path: String) -> void:
	if FileAccess.file_exists(path):
		DirAccess.remove_absolute(path)


func rename(from: String, to: String) -> void:
	if FileAccess.file_exists(from):
		if FileAccess.file_exists(to):
			DirAccess.remove_absolute(to)
		DirAccess.rename_absolute(from, to)


func ensure_dir(path: String) -> void:
	if not DirAccess.dir_exists_absolute(path):
		DirAccess.make_dir_recursive_absolute(path)
