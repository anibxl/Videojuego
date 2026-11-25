// Construit la VERSION PUBLIÉE de Hoop Bounce pour Google Play :
//   dist/HoopBounce-<version>-release.aab   Android App Bundle à importer dans la Play Console
//   dist/HoopBounce-<version>-release.apk   APK release de la MÊME version, pour la tester sur un téléphone
//
// Même principe que la version de test (tools/build-test-apk.mjs) : enveloppe Android minimale
// (native/release/ : une WebView plein écran qui sert le jeu depuis l'application), assemblée avec les outils
// Android d'Ubuntu (aapt2, javac, dalvik-exchange, zipalign, apksigner, jarsigner, keytool) — sans Gradle.
// Le bundle est assemblé au format exigé par Google Play (module « base » : manifest/, dex/, res/, assets/,
// resources.pb au format protobuf d'aapt2, BundleConfig.pb à la racine) puis signé (jarsigner).
//
// Différences avec la version de test :
//   - identifiant OFFICIEL com.echospeed.hoopbounce, nom « Hoop Bounce », icône intemporelle ;
//   - signature avec la CLÉ D'IMPORT (upload key) native/release/keys/hoopbounce-release.jks (non versionnée,
//     À NE JAMAIS PERDRE : sans elle, plus de mise à jour possible sans passer par le support Google) ;
//   - pas de débogage à distance de la WebView ;
//   - pas de SDK publicitaire dans cette version : le jeu ne montre aucune annonce (pas les annonces de test
//     simulées), les boutons « Regarder une publicité » sont masqués et la reprise au drapeau est offerte —
//     exactement le comportement du jeu hors ligne. Rien d'autre ne change (gameplay, niveaux, sauvegardes).
//
// Usage : node tools/build-release.mjs              (version et versionCode : constantes ci-dessous)
//         node tools/build-release.mjs --new-key    (première fois seulement : crée la clé d'import)
//
// MISES À JOUR : chaque nouvel envoi garde le même identifiant, la même clé d'import et un versionCode
// plus grand. Les sauvegardes des joueurs (localStorage de https://appassets.androidplatform.net) sont gardées.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync, renameSync, appendFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const VERSION_NAME = '1.0.0';
const VERSION_CODE = 16; // 15 : première version prête ; 16 : retour du ↺ Recommencer d'origine (Trickshot). À augmenter à CHAQUE envoi
const PACKAGE = 'com.echospeed.hoopbounce';
const MIN_SDK = 24; // Android 7.0
const TARGET_SDK = 36; // Android 16 (exigence Google Play pour les nouvelles applications)
const ALIAS = 'hoopbounce-upload';
const BUNDLETOOL_VERSION = '1.17.2'; // version du format de bundle déclarée dans BundleConfig.pb

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shell = join(root, 'native', 'release');
const stage = join(root, 'build', 'release');
const dist = join(root, 'dist');
const keyDir = join(shell, 'keys');
const ks = join(keyDir, 'hoopbounce-release.jks');
const ksProps = join(keyDir, 'keystore.properties');
const fpFile = join(shell, 'upload-key.sha256'); // empreinte publique de la clé (versionnée : contrôle)
const ANDROID_JAR = ['/usr/lib/android-sdk/platforms/android-23/android.jar', ...(process.env.ANDROID_JAR ? [process.env.ANDROID_JAR] : [])].find(existsSync);
const base = `HoopBounce-${VERSION_NAME}-${VERSION_CODE}-release`; // ex. HoopBounce-1.0.0-16-release.aab

const run = (cmd, args, opts = {}) => {
  try {
    return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024, ...opts }).toString();
  } catch (e) {
    throw new Error(`${cmd} a échoué :\n${e.stderr?.toString() ?? e.message}`);
  }
};
const step = (msg) => console.log(`• ${msg}`);

if (!ANDROID_JAR) throw new Error('android.jar introuvable : sudo apt-get install android-sdk-platform-23');
for (const tool of ['aapt2', 'aapt', 'javac', 'dalvik-exchange', 'zipalign', 'apksigner', 'jarsigner', 'keytool', 'zip', 'unzip']) {
  try {
    run('which', [tool]);
  } catch {
    throw new Error(`outil manquant : ${tool}`);
  }
}

// ─── 0. Clé d'import (upload key) ────────────────────────────────────────────
if (!existsSync(ks)) {
  if (!process.argv.includes('--new-key')) {
    throw new Error(`clé d'import introuvable (${relative(root, ks)}) : remettez-la (avec keystore.properties), ou relancez avec --new-key UNIQUEMENT si l'application n'a encore jamais été envoyée sur Google Play.`);
  }
  mkdirSync(keyDir, { recursive: true });
  const pass = randomBytes(18).toString('base64url');
  run('keytool', ['-genkeypair', '-keystore', ks, '-storetype', 'PKCS12', '-storepass', pass, '-keypass', pass, '-alias', ALIAS,
    '-keyalg', 'RSA', '-keysize', '4096', '-validity', '10950', '-dname', 'CN=EchoSpeed, OU=Hoop Bounce, O=EchoSpeed']);
  writeFileSync(ksProps, `# Clé d'import Google Play de Hoop Bounce — À GARDER EN LIEU SÛR, NE JAMAIS PUBLIER\nstoreFile=hoopbounce-release.jks\nkeyAlias=${ALIAS}\nstorePassword=${pass}\nkeyPassword=${pass}\n`);
  console.log(`  nouvelle clé d'import : ${relative(root, ks)} (mot de passe dans ${relative(root, ksProps)})`);
}
const props = Object.fromEntries(readFileSync(ksProps, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const PASS = props.storePassword;
const certInfo = run('keytool', ['-list', '-v', '-keystore', ks, '-storepass', PASS, '-alias', props.keyAlias ?? ALIAS]);
const fingerprint = certInfo.match(/SHA256:\s*([0-9A-F:]+)/)?.[1]?.replace(/:/g, '').toLowerCase();
if (!fingerprint) throw new Error('empreinte de la clé introuvable');
if (!existsSync(fpFile)) writeFileSync(fpFile, `${fingerprint}\n`);
const expected = readFileSync(fpFile, 'utf8').trim();
if (expected !== fingerprint) throw new Error(`clé d'import différente de celle enregistrée (${expected.slice(0, 16)}…) : Google Play refuserait l'envoi`);

rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, 'assets'), { recursive: true });
mkdirSync(dist, { recursive: true });

// ─── 1. Fichiers du jeu ──────────────────────────────────────────────────────
step('fichiers du jeu → assets/www');
run('node', [join(root, 'tools', 'build-web.mjs')]);
const www = join(stage, 'assets', 'www');
cpSync(join(root, 'www'), www, { recursive: true });
const version = readFileSync(join(www, 'src', 'shared', 'version.js'), 'utf8');
if (!version.includes(`APP_VERSION = '${VERSION_NAME}'`)) throw new Error(`src/shared/version.js n'affiche pas ${VERSION_NAME}`);
// Pas de SDK publicitaire dans cette version : aucune annonce (pas même les annonces de test simulées)
const adsFile = join(www, 'src', 'shared', 'ads.js');
const ads = readFileSync(adsFile, 'utf8');
const adsPatched = ads.replace("this.mode = mode; // null · 'fail' · 'none' · 'instant' (tests automatisés)", "this.mode = 'none'; // version publiée sans SDK publicitaire : aucune annonce");
if (adsPatched === ads) throw new Error('ads.js : réglage « sans publicité » introuvable');
writeFileSync(adsFile, adsPatched);
appendFileSync(join(www, 'css', 'polish.css'), '\n/* Version publiée sans SDK publicitaire : les boutons « Regarder une publicité » sont masqués */\n#btn-double, [data-spin="ad"] { display: none !important; }\n');

// ─── 2. Ressources Android : nom, icônes (classique, ronde, adaptative) ──────
step('ressources (nom, icônes)');
const res = join(stage, 'res');
cpSync(join(shell, 'res'), res, { recursive: true });
const RES = join(root, 'android', 'app', 'src', 'main', 'res');
for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  mkdirSync(join(res, `mipmap-${d}`), { recursive: true });
  for (const f of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png', 'ic_launcher_background.png']) cpSync(join(RES, `mipmap-${d}`, f), join(res, `mipmap-${d}`, f));
}
cpSync(join(RES, 'mipmap-anydpi-v26'), join(res, 'mipmap-anydpi-v26'), { recursive: true });
run('aapt2', ['compile', '--dir', res, '-o', join(stage, 'res.zip')]);

// ─── 3. Code Java → classes.dex ──────────────────────────────────────────────
step('code Java → classes.dex');
const javaFiles = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.java')) javaFiles.push(p);
  }
};
walk(join(shell, 'java'));
const classes = join(stage, 'classes');
mkdirSync(classes);
run('javac', ['--release', '8', '-nowarn', '-Xlint:-options', '-classpath', ANDROID_JAR, '-d', classes, ...javaFiles]);
const dex = join(stage, 'classes.dex');
run('dalvik-exchange', ['--dex', `--min-sdk-version=${MIN_SDK}`, `--output=${dex}`, classes]);

const linkArgs = ['-I', ANDROID_JAR, '--manifest', join(shell, 'AndroidManifest.xml'), '-A', join(stage, 'assets'),
  '--min-sdk-version', String(MIN_SDK), '--target-sdk-version', String(TARGET_SDK),
  '--version-code', String(VERSION_CODE), '--version-name', VERSION_NAME, '-0', 'woff2', '-0', 'png', join(stage, 'res.zip')];

// ─── 4. APK release (pour tester exactement la même version) ────────────────
step('APK release (aapt2 → zipalign → apksigner)');
const unsigned = join(stage, 'unsigned.apk');
run('aapt2', ['link', '-o', unsigned, ...linkArgs]);
run('zip', ['-q', '-j', unsigned, dex]);
const aligned = join(stage, 'aligned.apk');
run('zipalign', ['-p', '-f', '4', unsigned, aligned]);
const apkOut = join(dist, `${base}.apk`);
run('apksigner', ['sign', '--ks', ks, '--ks-pass', `pass:${PASS}`, '--key-pass', `pass:${PASS}`, '--ks-key-alias', props.keyAlias ?? ALIAS,
  '--v1-signing-enabled', 'true', '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true', '--v4-signing-enabled', 'false', '--out', apkOut, aligned]);

// ─── 5. Android App Bundle (format protobuf, module « base ») ───────────────
step('Android App Bundle (aapt2 --proto-format → module base → jarsigner)');
const proto = join(stage, 'proto.apk');
run('aapt2', ['link', '--proto-format', '-o', proto, ...linkArgs]);
const tmp = join(stage, 'proto');
const mod = join(stage, 'bundle', 'base');
run('unzip', ['-q', proto, '-d', tmp]);
mkdirSync(join(mod, 'manifest'), { recursive: true });
mkdirSync(join(mod, 'dex'), { recursive: true });
renameSync(join(tmp, 'AndroidManifest.xml'), join(mod, 'manifest', 'AndroidManifest.xml'));
renameSync(join(tmp, 'resources.pb'), join(mod, 'resources.pb'));
renameSync(join(tmp, 'res'), join(mod, 'res'));
renameSync(join(tmp, 'assets'), join(mod, 'assets'));
cpSync(dex, join(mod, 'dex', 'classes.dex'));
const leftovers = readdirSync(tmp);
if (leftovers.length) throw new Error(`fichiers inattendus dans le bundle : ${leftovers.join(', ')}`);
// BundleConfig.pb : message BundleConfig { Bundletool bundletool = 1 { string version = 2 } }
const v = Buffer.from(BUNDLETOOL_VERSION);
const inner = Buffer.concat([Buffer.from([0x12, v.length]), v]);
writeFileSync(join(stage, 'bundle', 'BundleConfig.pb'), Buffer.concat([Buffer.from([0x0a, inner.length]), inner]));
const aabOut = join(dist, `${base}.aab`);
rmSync(aabOut, { force: true });
run('zip', ['-q', '-r', '-X', '-D', aabOut, 'BundleConfig.pb', 'base'], { cwd: join(stage, 'bundle') });
run('jarsigner', ['-keystore', ks, '-storepass', PASS, '-keypass', PASS, '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256', aabOut, props.keyAlias ?? ALIAS]);

// ─── 6. Vérifications ────────────────────────────────────────────────────────
step('vérifications');
const badging = run('aapt', ['dump', 'badging', apkOut]);
const pkg = badging.match(/package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/);
if (!pkg || pkg[1] !== PACKAGE || +pkg[2] !== VERSION_CODE || pkg[3] !== VERSION_NAME) throw new Error(`APK : identité inattendue ${pkg?.slice(1).join(' ')}`);
if (/uses-permission: name='android.permission.INTERNET'/.test(badging)) throw new Error('APK : permission Internet inattendue');
const apkCert = run('apksigner', ['verify', '--print-certs', apkOut]).match(/certificate SHA-256 digest: ([0-9a-f]+)/)?.[1];
if (apkCert !== fingerprint) throw new Error('APK : signé avec une autre clé');
run('zipalign', ['-c', '-p', '4', apkOut]);
const aabVerify = run('jarsigner', ['-verify', '-certs', aabOut]);
if (!/jar verified/.test(aabVerify)) throw new Error('AAB : signature invalide');
const protoBadging = run('aapt2', ['dump', 'badging', proto]);
if (!protoBadging.includes(`package: name='${PACKAGE}' versionCode='${VERSION_CODE}' versionName='${VERSION_NAME}'`)) throw new Error('AAB : manifeste inattendu');
if (!protoBadging.includes(`targetSdkVersion:'${TARGET_SDK}'`)) throw new Error('AAB : targetSdk inattendu');
const entries = run('unzip', ['-Z1', aabOut]).split('\n').filter(Boolean);
for (const need of ['BundleConfig.pb', 'base/manifest/AndroidManifest.xml', 'base/resources.pb', 'base/dex/classes.dex', 'base/assets/www/index.html', 'base/res/mipmap-anydpi-v26/ic_launcher.xml']) {
  if (!entries.includes(need)) throw new Error(`AAB : ${need} manquant`);
}
// Même contenu de jeu dans l'APK et dans le bundle
const apkAssets = run('unzip', ['-Z1', apkOut]).split('\n').filter((e) => e.startsWith('assets/')).sort();
const aabAssets = entries.filter((e) => e.startsWith('base/assets/')).map((e) => e.slice(5)).sort();
if (JSON.stringify(apkAssets) !== JSON.stringify(aabAssets)) throw new Error('APK et AAB ne contiennent pas les mêmes fichiers de jeu');

const mo = (f) => (statSync(f).size / 1024 / 1024).toFixed(2);
console.log(`  identifiant ${PACKAGE} · versionCode ${VERSION_CODE} · versionName ${VERSION_NAME} · minSdk ${MIN_SDK} · targetSdk ${TARGET_SDK}`);
console.log(`  clé d'import SHA-256 ${fingerprint.slice(0, 16)}… · ${apkAssets.length} fichiers de jeu identiques dans l'APK et le bundle`);
console.log(badging.split('\n').filter((l) => /^(uses-permission|application-label:|native-code)/.test(l)).map((l) => `  ${l}`).join('\n'));
console.log(`\n✅ ${relative(root, aabOut)} (${mo(aabOut)} Mo) — à importer dans la Play Console`);
console.log(`✅ ${relative(root, apkOut)} (${mo(apkOut)} Mo) — même version, à installer pour tester`);
