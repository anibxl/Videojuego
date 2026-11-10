# CLEAN RUSH 3.0: first-person simulator, delivery report

## 0. Inspection and backup
* **Engine and architecture found:** Godot 4.3, GDScript, GL Compatibility renderer (OpenGL ES 3 on
  Android).
  * Gameplay: a third-person `CameraRig` following a `CharacterBody3D` player, `ToolRuntime` for tools,
    `MapBase` plus six map builders, and `ContractRunner` for objectives.
  * Saves: three slots through `SaveStore` (2.0).
  * UI: code-built screens using `UIKit`.
* **Backups:** `clean_rush_backups/clean_rush_v2.0_backup.zip` (commit `db36e66`) and the earlier
  `clean_rush_v1.0_backup.zip`.
* The upgrade was made in place. Every existing system was kept: 6 maps, 21 contracts, shop, upgrades,
  gear, cosmetics, achievements, collection, daily missions, character creator, slots and settings.

## 1. Why progress was being lost (root causes) and the fixes
| Root cause found in 2.0 | Fix in 3.0 |
|---|---|
| A location's cleaning state was **never saved**: every visit rebuilt the map fully dirty. | Each location's exact state (per-pixel dirt of every surface, every leaf/litter position, found discoveries) is saved per slot in `slot_N_map_<id>.sav` and restored on load. Saves are compressed, checksummed, atomic, with a `.bak`. |
| Coins for removed dirt and for discoveries were only paid when a contract was finished, so closing the app mid-job lost them. | Coins are paid **while cleaning** (tracked per location so they are never paid twice) and saved. |
| The location's best % was only recorded on an explicit "exit to menu". | The state is recorded before every save, every 15 s in play, on pause, on exit, on contract finish, and on app pause, background or close. |
| The job in progress was forgotten. | The `active_job` (map, contract, timer) is saved. The menu shows **CONTINUE** and the timer resumes. |
| If the settings file was missing or damaged, boot fell back to slot 1 or to no slot, so a player whose data was in slot 2 or 3 appeared to have lost everything. | Boot resumes the **most recently saved** readable slot. |
| Finished contracts could be replayed instantly on an already-clean site (a reward farm, once state became persistent). | Replaying a finished contract resets that site first. Unfinished contracts continue on the saved state. |

Unchanged from 2.0 and still active: versioned saves, SHA-256 header, verified atomic writes, backups,
corruption recovery, autosave every 30 s, saves on app pause/background/close, and the saving
indicator in the HUD.

## 2. First-person experience
* `Player` is now a first-person controller:
  * Body yaw plus head pitch, with the camera at the character's eye height (1.62 m × height).
  * Pitch is clamped to ±85°. Walk is 3.7 m/s and run 6.2 m/s.
  * Comfortable head bob (can be turned off), a slight strafe roll, adjustable FOV (60–90°) and
    adjustable look sensitivity with invert-Y.
* The body is not visible to the camera, but it **casts its shadow** (built from the saved character)
  and animates while walking.
* `FirstPersonView`:
  * Your own arms (sleeve colour, skin tone, gloves) hold the equipped tool in per-tool grips (spray
    guns, blowers/vacuums, poles, hand tools, machines) with two-handed holds.
  * Walk bob, breathing, look-sway lag, and a lower/raise switch animation.
  * Use animations: aim and vibration, sweeping, scrubbing circles. Vacuums, nets and pickers show a
    fill indicator for the collection bag.
* **Targeting:**
  * A raycast from the crosshair finds the surface you look at. Cleaning is applied at that hit point
    with the tool's radius, and the water or foam stream goes from the visible nozzle to that point.
  * Debris tools work at the looked-at ground point: blower airflow follows your view, and the vacuum,
    rake and net work where you aim.
  * The crosshair colour shows the target: dirt (turquoise), wrong tool (red), already clean (white),
    debris (orange).
* **USE** button / E / right mouse: empties the bag at a bin, picks up a sparkling discovery in view,
  otherwise switches the tool mode.

## 3. Controls
* **Touch:**
  * Floating joystick and look-drag (also works while holding CLEAN).
  * CLEAN / RUN / USE / MODE buttons and a tool chip with < > quick switching plus a full picker.
  * Settings: joystick size, button size, left-handed mirrored layout, sensitivity, invert-Y, FOV,
    head bob.
* **Desktop:** WASD, mouse look (captured), left mouse = clean, Shift = run, E/F/right mouse = use,
  R = mode, 1–9 / Tab / Q / mouse wheel = tools, Esc = pause (releases the mouse).

## 4. Equipment progression
* New saves start with the **Basic Leaf Blower** (Eco/Turbo power) equipped, plus a sponge. Old saves
  keep everything they own and also receive the blower.
* Added the **Professional Leaf Blower** and the **Garden Vacuum**. The High-Pressure Nozzle is now the
  **Professional Pressure Washer** (wide/narrow nozzles). The rake and broom are cheap optional tools.
* Blown leaves now also gather into piles that get bagged.
* Each tool has a level requirement (shown as "LEVEL n" in the shop), its own behaviour, a first-person
  hold, sound and effects.

## 5–7. UI redesign
* **New UIKit style** applied to every screen: navy glass panels, thin borders, turquoise accents,
  orange only for primary actions, regular-weight body text, calmer button sizes (all ≥ 48 px for touch).
* **Main menu:**
  * Live garden with a slow, low, swaying cinematic camera.
  * CONTINUE/PLAY, Maps, Equipment, Character, Settings.
  * A compact player panel (money, level/XP, stars, character preview) that opens the new **Profile**
    hub (stats, character, Achievements, Collection, Daily missions, Save slots).
* **Shop:**
  * Categories: Leaf, Surface, Pool, Accessories, Upgrades.
  * Filters: All, Owned, Available, Locked.
  * Vertical item list with icon, name, short description, price or status badge.
  * Detail panel with a rotating **3D tool preview**, performance bars (power, range, width,
    efficiency, capacity), upgrade rows (level pips, current → next, price), tool skins, and Buy/Equip.
* **HUD:**
  * Money (+ coins earned this session) top-left; location progress and mission timer top-centre;
    pause top-right.
  * Compact objectives, crosshair, saving indicator, and the tool/mode/bag chip.
* Contract screen shows the persistent location state with *Reset location*. Settings are reorganised
  (audio, controls, camera & display) in a scroll panel.
* A loading overlay appears while a site is generated. Ambient audio: birds and breeze in gardens,
  traffic in the city.

## 8. Graphics
The 2.0 realism work is kept: textured leaf species with natural piles, card-based trees and hedges,
instanced grass, flagstone paths, the wet trail, textured house and props, time of day and weather.
Additions for first person:
* A **distant treeline and soft hills** around every map (density by quality).
* Mown-height grass and leaf sizes tuned for eye level.

## 9. Tests run (automated, Linux, Mesa llvmpipe, GL Compatibility)
* **Smoke test** (`-- --smoke`): **133 checks, 0 failures**. In addition to all 2.0 checks, it
  covers:
  * Starting with the leaf blower; level-locked tools cannot be bought.
  * First-person checks: active camera at eye height, body shadow-only, hands and tool visible,
    look yaw/pitch with clamp, walk vs run in the look direction.
  * Tool switching swaps the viewmodel; the crosshair raycast hits the looked-at surface; the washer
    nozzle mode and blower power mode work.
* **Real restart test** (`--savetest=write`, then a separate process `--savetest=verify`):
  **19/19 checks pass**.
  1. Starts the patio contract, uses a tool in first person, and cleans **≈45 % of the objective**.
  2. Earns coins (including coins paid live for removed dirt) and buys the pressure washer.
  3. Changes the character, then **closes the application while still on the map**, with no menu
     and no manual save.
  4. A fresh process reloads the slot. It checks money, cleaning coins, XP, purchased and equipped tool,
     appearance, playtime, the current mission, and the stored location %.
  5. It re-enters the map and confirms the site was restored (not reset): the objective progress is
     identical, the partially cleaned tile has **exactly the same pixels**, fully cleaned tiles are
     still clean, the timer resumed, and the bought tool is equipped.

* The tests also caught and fixed two real bugs during development:
  1. Resetting a location while its session was still active re-saved the old clean state.
  2. Starting a new job did not persist the session being left.
* A cleaned location stays clean when re-entered (verified inside the smoke test as well).

## Not verified / limitations (honest)
* No Android device or emulator was available: touch feel, phone frame rate and audio output are
  untested. Multitouch was tested only with simulated touch events.
* Ambient occlusion and reflection probes are not available in the Compatibility renderer.
* The first-person hands are simple shaded shapes (no skinned hand mesh with fingers). Tools can clip
  into walls when you stand right against them (no separate viewmodel render layer).
* Mirrors are not implemented. The character is visible in the creator, the Profile, the menu panel
  and save slots, and as your shadow in game.
* Locked maps stay visible but are clearly marked LOCKED with their requirement and progress.
* Cloud saves are not implemented.

## Roadmap
1. Device QA: tune look sensitivity curves, button positions and graphics presets on real phones.
2. A free button-drag layout editor; skinned first-person hands with finger poses.
3. Viewmodel render layer (no clipping); a mirror/reflection display in a personal base.
4. Optional cloud saves behind `SaveBackend`.
5. New first-person maps (beach, snow, kitchen, garage, office windows).
