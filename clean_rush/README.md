# CLEAN RUSH

**Clean it. Upgrade it. Unlock everything.**

A relaxing 3D cleaning simulator for Android phones (with desktop controls for development),
made with **Godot 4.3** and **GDScript**. Everything is original and procedural: no paid or
third-party assets. The 3D models, materials, shaders, icons and audio are all generated
by the code in this project.

---

## 1. Open and run

1. Install **Godot 4.3** (standard build, not .NET): https://godotengine.org/download/archive/4.3-stable/
2. Start Godot and choose **Import**, then select `clean_rush/project.godot`.
3. Press **F5** (Run Project).

The first import takes a few seconds while Godot processes the SVG icons and WAV files.

### Desktop controls (for testing)
| Action | Keys |
|---|---|
| Move | WASD / arrow keys |
| Run | Shift |
| Clean | Space, or hold left mouse button (aims at the cursor) |
| Change tool | Tab, or keys 1–9 |
| Nozzle (wide / narrow) | R |
| Rotate camera | Q / E, or drag with the right mouse button |
| Zoom | Mouse wheel |
| Pause | Esc / P |

### Mobile controls
* **Left half of the screen**: floating virtual joystick.
* **Big orange CLEAN button** (hold): uses the current tool. Auto-aim finds dirt in front of you.
* **RUN** toggle, the **tool button** (opens the tool picker) and **Wide/Narrow** for nozzles.
* **Drag on the right side**: rotate the camera (vertical drag zooms).
* Multitouch works: you can move and clean at the same time.

Settings → *Touch controls* lets you force the touch layout on or off (Auto by default).

---

## 2. Build an Android APK

The project ships with an `export_presets.cfg` that has an **Android** preset ready to use
(arm64-v8a + armeabi-v7a, landscape, no permissions).

1. **Export templates**: in Godot go to *Editor → Manage Export Templates → Download and Install* (4.3.stable).
2. **Android SDK / JDK**: install OpenJDK 17 and the Android SDK (command-line tools, `platform-tools`,
   `build-tools;34.0.0`, `platforms;android-34`). In *Editor → Editor Settings → Export → Android*, set
   the **Java SDK Path** and **Android SDK Path**.
   (Without Gradle builds, Godot only needs `apksigner` and `adb`, plus `keytool` from the JDK.)
3. **Debug keystore**: Godot creates one automatically. Or make one yourself:
   ```bash
   keytool -genkeypair -v -keystore debug.keystore -storepass android -alias androiddebugkey \
     -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
   ```
4. *Project → Export… → Android → Export Project* and pick a path such as `export/CleanRush-debug.apk`.

Command line (headless) export:
```bash
godot --headless --path clean_rush --export-debug "Android" export/CleanRush-debug.apk
```

### Before publishing on Google Play
* Change the placeholder package name `com.example.cleanrush` (Export → Android → Package → Unique Name).
* Create a **release keystore**, fill in *Keystore → Release* in the preset, and export with `--export-release`.
* Google Play needs an **AAB**: enable *Gradle Build* (Project → Install Android Build Template) and set
  *Export Format* to AAB. Set **Target SDK** to the level Google Play currently requires.
* Bump `version/code` and `version/name` for each upload.
* Check the store listing assets: icons are in `android/` (192×192 icon and 432×432 adaptive layers),
  and the splash screen is in `assets/icons/ui/splash.png`.
* The game requests **no permissions**, collects **no data**, has **no ads** and works offline.
  You still need your own privacy policy URL for the store listing.
* Nothing has been submitted to or approved by Google Play.

## 3. Install on an Android phone
1. On the phone, enable *Developer options → USB debugging*. Or allow "Install unknown apps"
   for your file manager.
2. With USB: `adb install -r CleanRush-debug.apk`.
   Without USB: copy the APK to the phone and open it.
3. Or use Godot's **one-click deploy** (the Android icon at the top right of the editor) with the phone connected.

---

## 4. How the game works

1. Pick a location → pick a **contract** (a short job with 1–3 objectives).
2. Choose a tool and clean: dirt fades away pixel by pixel, and leaves and litter fly, get sucked up or are collected.
3. When the objectives are met you can **Finish** right away or keep cleaning for more stars:
   * ★ contract complete · ★ under par time · ★ location cleaned to the "perfect" level.
4. You earn coins (contract reward + star bonus + dirt removed + discoveries) and XP (levels give bonus coins).
5. Buy tools, upgrade **Power / Range / Width / Capacity**, buy gear, unlock new locations and repeat.

### Locations (all six playable)
| # | Location | Main challenges | Unlock |
|---|---|---|---|
| 1 | Autumn Garden | leaves on lawn, path, patio, flower beds; furniture litter | free |
| 2 | Power Wash Patio | mud floor, moss walls, stairs, furniture, upper terrace | 1 Garden contract |
| 3 | Pool Rescue | floating leaves, algae/silt pool floor and walls, waterline tiles, coping, deck; water clears as you work | earn 1,200 coins |
| 4 | City Cleanup | litter (paper, cans, bottles, bags) into bins, graffiti, sidewalks, benches, shop windows | 5 contracts |
| 5 | Car Detailing | mud → polish on the bodywork (2 layers), foam residue, windows, wheels, interior | own a pro tool |
| 6 | Abandoned Greenhouse | moss and smudges on the glass, mossy path, leaves, rubbish, planters, furniture; plants bloom as you restore it | 20 stars |

21 contracts in total, 18 hidden discoveries and 17 achievements, plus 3 daily missions.

### Tools (13)
Starter: **Rake, Broom, Sponge**. Advanced: **Leaf Blower, Litter Picker, Pressure Washer
(wide/narrow nozzle), Pool Net, Pro Leaf Vacuum, Foam Sprayer, Pro Scrubber, Pool Vacuum,
High-Pressure Nozzle, Polishing Machine**.

Each tool has its own behaviour:
* *spray*: long-range raycast cleaning with a water jet.
* *contact*: short-range scrubbing.
* *push*: blowing in a cone that moves leaves.
* *suck*: suction that pulls debris in, with bag capacity.
* *collect*: rake/net/picker, with or without a bag.

Each tool also has its own efficiency table per dirt type, so the right tool matters.
Foam makes any tool clean 2.5× faster. The blower clears an area by pushing leaves into
hedges, under the fence or onto the leaf tarp.

---

## 5. Project structure
```
clean_rush/
  project.godot, export_presets.cfg, icon.svg
  scenes/main/main.tscn           – single entry scene (everything else is built in code)
  scripts/
    autoload/   data.gd (JSON database), game.gd (state, economy, save), audio.gd
    main/       main.gd (screen routing, gameplay session, input)
    player/     player.gd, camera_rig.gd
    cleaning/   clean_surface.gd (mask-based dirt), debris_field.gd (MultiMesh debris),
                discovery.gd, item_models.gd, debris_meshes.gd
    tools/      tool_runtime.gd (aim, auto-aim, behaviours), tool_models.gd, fx.gd
    maps/       map_base.gd (shared builders + progress tracking) + one script per map
    contracts/  contract_runner.gd (objectives, stars, payouts)
    ui/         ui_kit.gd + every screen (menu, maps, contracts, HUD, touch controls, shop…)
  data/         tools.json, dirt_types.json, achievements.json, maps/*.json (contracts, unlocks…)
  shaders/      dirt_common.gdshaderinc, dirt_surface, dirt_glass, water, ground
  assets/       audio/*.wav, icons/**.svg, fonts/ (DejaVu Sans Bold, free license)
  tools/        gen_audio.py, gen_icons.py (regenerate all audio / icons)
  tests/        smoke_test.gd (automated play-through), debug_aim.gd
  android/      launcher icons
```

### Adding a new map (e.g. "Beach Cleanup")
1. Create `data/maps/beach_cleanup.json` (copy an existing one: name, unlock rule, contracts, discoveries).
2. Add `"beach_cleanup"` to `data/maps/index.json`.
3. Create `scripts/maps/map_beach_cleanup.gd` that `extends MapBase` and implements `build()` using the helpers:
   `floor_surface`, `wall_surface`, `floor_grid`, `debris`, `add_bin`, `discovery`, `tree`, `bush`, `add_bloom`…
4. Add a 320×180 thumbnail SVG in `assets/icons/maps/`.

**New dirt type**: add an entry to `data/dirt_types.json` (colours, shader mode, toughness)
and list it in the `types` table of the tools that should clean it.
**New tool**: add it to `data/tools.json` (+ its icon SVG, and optionally a model in `tool_models.gd`).
**New objective type**: add a case in `ContractRunner.objective_value()`.

### Save data
`user://clean_rush_save.json` holds versioned JSON (`version` field, with migrations in `Game._migrate`).
It is written atomically through a temp file and keeps a `.bak` backup. Invalid or missing data falls back
to the backup, then to defaults, and every field is type-checked on load.

---

## 6. Tests
Automated play-through (needs a display; under Linux CI use `xvfb-run`):
```bash
godot --path clean_rush --rendering-driver opengl3 -- --smoke /tmp/shots
```
The bot visits every menu screen and buys every tool and upgrade. On each of the six maps it
plays with three tools and checks that dirt disappears progressively. It then completes a
contract on each map and checks the payout, saving, unlocks, the save/load round trip and
recovery from a corrupt save. It also writes screenshots to `/tmp/shots`.
**Warning:** it overwrites the local save file.

See `docs/DELIVERY.md` for the verified feature list, known issues and roadmap.
