# CLEAN RUSH 2.0: delivery report

## Backup and approach
* Before any change, version 1.0 was archived: `clean_rush_backups/clean_rush_v1.0_backup.zip`
  (also git commit `e4ff2f2`, local tag `clean-rush-v1.0-backup`).
* 2.0 upgrades the existing project in place. All 6 maps, 21 contracts, 13 tools, shop, upgrades,
  gear, achievements, collection, daily missions, rewards, HUD and touch controls are preserved.
  The 1.x save format is migrated automatically.

## What changed

### Graphics and atmosphere
* **Realistic leaves**: an 8-type textured atlas (maple, red maple, oak, golden oak, birch, small,
  large dry, damaged/holed). Each leaf is a curled card with a mid-rib, per-leaf brightness and tint
  variation, backlighting, and shadows on High.
* **Natural distribution**:
  * Attractors around trees, along the fence, path edges, bed borders and the house wall, in corners
    and under furniture.
  * Dense hand-placed piles.
  * Volumetric stacking: leaves on top of others sit higher and tilt more.
* **Vegetation**: oak, maple, birch, pine and cypress trees.
  * Textured branching trunks with root flare, and canopies made of alpha-tested foliage cards
    (one MultiMesh per tree) with wind sway.
  * Bushes, some flowering, and leafy hedges.
  * Instanced grass clumps in culled chunks, with wind.
  * Flowers with petals. Plants sway via a global `wind_strength`.
* **Ground**: tiled grass texture with large-scale colour variation and soil patches. The path is now
  irregular flagstone (voronoi) with bevelled edges, cracks, dirt settling in the joints, mossy
  sections and edge stones.
* **Wet surfaces**: water tools leave a darker, glossy wet trail that dries over about 10 s, showing
  exactly where the tool worked.
* **Garden details**:
  * The house now has textured siding and roof tiles, a stone plinth, gutters and downpipes, a chimney,
    shutters, window boxes with flowers, a panelled door, porch, lamp and doormat.
  * Pointed-picket textured fences.
  * Props: mailbox, garden lights, rocks, wheelbarrow, bird bath, watering can, leaning rake and shovel.
* **Lighting**:
  * Times of day (morning / day / evening) change the sun's height and direction, the light colour and
    energy, and the sky.
  * Weather: sunny, cloudy (soft shadows), windy (strong sway plus wind sound) and light rain
    (camera-following rain particles plus rain sound).
  * Depth fog on Medium/High, ACES tonemapping, 2-split shadows on High.

### Cleaning feel
* **Rake**: drags leaves toward the rake line in front of the player, so walking pushes a growing pile.
  When the player stops, piles of 14 or more raked leaves are bagged with a puff, a sound and a toast.
* **Blower**: leaves get spin, lift up to about 1 m, tumble, then settle back on the ground.
* **Vacuum**: leaves are pulled into the nozzle, with collection bursts and the bag meter.
* **Pressure washer / sponge**: progressive per-pixel cleaning plus the wet trail.

### Character creator (Part 3)
* `CharacterModel` is a fully modular 3D character. Every option is real geometry or material on the
  in-game player:
  * 8 skin tones.
  * 12 hairstyles (buzz, short, side part, medium, bob, long straight, long wavy, curly, afro,
    ponytail, bun, bald), 8 hair colours plus a custom hue/lightness.
  * 5 eye colours, 3 eye shapes, 4 eyebrow styles, 4 face shapes, 4 noses, 4 mouths.
  * 4 body presets, plus height and build sliders.
  * 9 tops, including unlockable uniforms; 4 bottoms; 4 shoes; 7 hats; 5 glasses; 3 gloves; 3 watches;
    14 outfit colours.
* Animations: walk and run cycles (thigh/knee/arm swing, bob, lean), idle breathing, look-around and
  blinking, and two-handed tool poses for sweeping, aiming and scrubbing.
* Creator UI:
  * Large live 3D preview: rotate with a finger or mouse, pinch or wheel to zoom, face zoom.
  * 10 categories and a name field.
  * Randomize, Reset, Cancel and Confirm buttons.
  * Locked items show their unlock requirement; coin items can be bought with in-game coins.
* Reachable from the main menu (*Character*) and when creating a new save.

### Progression cosmetics (Part 6)
* Earnable through gameplay: uniforms (level 5, achievement, 30 stars, coins), golden boots, hard hat,
  crown, goggles, rubber gloves and sport watch.
* 6 tool skins (level, contracts, achievement, coins), shown on the tool model.
* The reward screen announces new cosmetic unlocks. There are no real-money purchases.

### Save system (Part 4)
See the README section "Save data (2.0)": 3 slots, SHA-256 checksum header, verified atomic writes,
`.bak` backups, corruption recovery and a damaged-slot state. Settings live in a global file.
Autosave runs on every progression event, every 30 s, and on app pause, focus loss, back and close.
Playtime is tracked. The slot screen shows a live 3D character preview, level, coins, playtime, last
save date and progress. New games can only be created in empty slots, and deletion requires
confirmation. There is a migration chain for old versions and a `SaveBackend` abstraction for a future
cloud backend. **No cloud sync is implemented.**

### Performance (Part 7)
* Everything that can be instanced is instanced (leaves, grass, foliage cards, flowers): about one
  draw call per plant.
* Distance fade-out ranges on foliage and grass (LOD).
* Grass is split into 6 m chunks for frustum culling. Shadows are limited (no grass shadows, leaf
  shadows only on High).
* Graphics presets:
  * **Low**: no shadows, no grass, about 55 % of the foliage cards, 60 % of the leaves, no fog or glow,
    0.75 render scale.
  * **Medium**: shadows, grass at 55 %, fog, MSAA 2×.
  * **High**: everything, MSAA 4×, glow, 2-split shadows.
* Measured instance budget on the Autumn Garden: Low 2,797 · Medium 5,919 · High 8,226.

## Test results (automated, Linux, Mesa llvmpipe, GL Compatibility renderer)
* **Smoke test** (`-- --smoke`): **115 checks, 0 failures**. It covers:
  * Every menu screen, buying every tool, and upgrades.
  * All 6 maps with three tools each and progressive cleaning.
  * Contract completion and rewards on every map.
  * Multitouch joystick and CLEAN button.
  * **Cleaning physics**: the rake drags leaves and bags piles; the blower moves, rotates and lifts
    leaves, which then settle; the vacuum fills its bag; the washer cleans progressively and leaves a
    wet trail.
  * **Character**: every saved option appears on the in-game model; height scales the rig; hair colour
    reaches the hair meshes; accessories change the 3D components; the appearance is identical after a
    save and reload; the creator and slot screens open.
  * **Graphics**: the Low < Medium < High instance budget holds.
  * **Saves**: the slot file is written; a reload keeps coins, tools and upgrades; a corrupt main file
    is recovered from the backup without losing progress; checksum tampering is detected; the slot
    summary is complete.
* **Real restart test** (two separate processes, `--savetest=write` then `--savetest=verify`): **10/10 pass**. The
  first process:
  1. Creates a new save and earns money.
  2. Completes a contract.
  3. Buys an upgrade.
  4. Changes the appearance (hair, colour, eyes, skin, clothes, accessories).
  5. Switches to another map and earns again.
  6. Quits **without** an explicit save call, relying only on autosave.

  The second process boots fresh and confirms the slot, name, coins, XP, contract, upgrade, map
  completion, appearance and playtime, and that the in-game player model is rebuilt from the saved
  appearance.
* The 1.x save present on the test machine (whose main file had been deliberately corrupted by the 1.0
  test) was migrated: it was recovered from its backup into slot 1 and upgraded to v3.

## Not verified / honest limitations
* No physical Android device or emulator was available. Real-phone frame rate, touch feel and audio
  output are untested. Frame rates measured on the CPU software renderer (15/5/3 fps for
  Low/Medium/High) say nothing about phone GPUs; they only confirm that the presets scale.
* **Ambient occlusion and reflection probes are not available** in Godot's Compatibility renderer, which
  this project uses for the broadest Android support. Depth fog, sky reflections and rim lighting are
  used instead.
* The character uses smooth procedural primitives. It is far more detailed and customisable than 1.0
  and every option is real geometry, but it is stylised-realistic, not a photoreal scanned human.
  There is no morph-based face sculpting; faces are built from selectable components, as the brief
  allows.
* Leaf physics are simplified (no leaf-to-leaf collisions, rect obstacles only); this is intentional
  for mobile performance.
* The changing room in a future personal base is not built: the wardrobe is reached from the main menu.
* Weather is visual and audio only. Rain does not make surfaces wet or change cleaning.
* Cloud saves and accounts are not implemented (only the backend abstraction exists).
* iOS export is still not configured.

## Roadmap
1. Device QA on low/mid/high Android phones; tune foliage card counts and shadow distances per preset.
2. A personal base with a changing room, trophy shelf and tool rack (wardrobe in 3D).
3. Weather that affects gameplay (rain wets surfaces, wind drifts leaves back) as optional modifiers.
4. Face detail: textured eyes and lashes, more hairstyles, beards.
5. New maps using the existing pipeline (beach, snow, kitchen, garage, office windows, farm, park).
6. An optional cloud backend (Google Play Games Saved Games) behind `SaveBackend`.
7. Release keystore, AAB, target SDK update, store listing, privacy policy.
