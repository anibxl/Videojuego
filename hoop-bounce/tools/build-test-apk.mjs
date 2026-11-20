// Construit la VERSION DE TEST Android de Hoop Bounce : dist/HoopBounce_Test_v<N>.apk
//
// Pourquoi pas Capacitor / Gradle ici ? Gradle a besoin du SDK Android et des bibliothèques Google
// (dl.google.com), inaccessibles dans l'environnement de développement. Cette version de test utilise
// donc une enveloppe Android minimale (native/test-apk/ : une WebView plein écran qui sert le jeu
// depuis l'APK), construite directement avec les outils Android d'Ubuntu :
//   sudo apt-get install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
// La version Play Store, elle, se construit avec le projet Capacitor (android/) dans Android Studio.
//
// Publicités : l'enveloppe de test ne contient pas le SDK AdMob ; le jeu y affiche ses annonces de TEST
// simulées (aucun identifiant AdMob, aucune requête réseau).
//
// Usage : node tools/build-test-apk.mjs            (numéro de version de test : TEST_BUILD ci-dessous)
//         node tools/build-test-apk.mjs --build 2  (version de test n° 2)

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_BUILD = 1;
const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version; // 1.0.0
const MIN_SDK = 24; // Android 7.0
const TARGET_SDK = 34; // Android 14
const KEY_PASS = 'hoopbounce-test'; // clé de TEST uniquement (jamais la clé de publication)

const argBuild = process.argv.indexOf('--build');
const build = argBuild > 0 ? parseInt(process.argv[argBuild + 1], 10) : TEST_BUILD;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shell = join(root, 'native', 'test-apk');
const stage = join(root, 'build', 'test-apk');
const dist = join(root, 'dist');
const apkName = `HoopBounce_Test_v${build}.apk`;
const ANDROID_JAR = ['/usr/lib/android-sdk/platforms/android-23/android.jar', ...(process.env.ANDROID_JAR ? [process.env.ANDROID_JAR] : [])].find(existsSync);

const run = (cmd, args, opts = {}) => {
  try {
    return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts }).toString();
  } catch (e) {
    throw new Error(`${cmd} a échoué :\n${e.stderr?.toString() ?? e.message}`);
  }
};
const step = (msg) => console.log(`• ${msg}`);

if (!ANDROID_JAR) throw new Error('android.jar introuvable : sudo apt-get install android-sdk-platform-23');
for (const tool of ['aapt2', 'javac', 'dalvik-exchange', 'zipalign', 'apksigner', 'keytool', 'zip']) {
  try {
    run('which', [tool]);
  } catch {
    throw new Error(`outil manquant : ${tool} (voir l'en-tête de ce fichier)`);
  }
}

rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, 'assets'), { recursive: true });
mkdirSync(dist, { recursive: true });

// 1. Fichiers du jeu (mêmes fichiers que l'application Capacitor : tools/build-web.mjs)
step('fichiers du jeu → assets/www');
run('node', [join(root, 'tools', 'build-web.mjs')]);
cpSync(join(root, 'www'), join(stage, 'assets', 'www'), { recursive: true });
// La page « À propos » et les paramètres affichent « 1.0.0 (test 1) »
const versionFile = join(stage, 'assets', 'www', 'src', 'shared', 'version.js');
writeFileSync(versionFile, readFileSync(versionFile, 'utf8').replace(/APP_VERSION = '[^']*'/, `APP_VERSION = '${VERSION} (test ${build})'`));

// 2. Ressources Android : nom de l'application, icônes (celles du projet Capacitor)
step('ressources (nom, icônes)');
const res = join(stage, 'res');
cpSync(join(shell, 'res'), res, { recursive: true });
for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  const from = join(root, 'android', 'app', 'src', 'main', 'res', `mipmap-${d}`, 'ic_launcher.png');
  mkdirSync(join(res, `mipmap-${d}`), { recursive: true });
  cpSync(from, join(res, `mipmap-${d}`, 'ic_launcher.png'));
}
run('aapt2', ['compile', '--dir', res, '-o', join(stage, 'res.zip')]);

// 3. Assemblage (manifeste, ressources, fichiers du jeu)
step('assemblage (aapt2)');
const unsigned = join(stage, 'unsigned.apk');
run('aapt2', ['link', '-o', unsigned, '-I', ANDROID_JAR, '--manifest', join(shell, 'AndroidManifest.xml'), '-A', join(stage, 'assets'),
  '--min-sdk-version', String(MIN_SDK), '--target-sdk-version', String(TARGET_SDK),
  '--version-code', String(build), '--version-name', `${VERSION}-test${build}`, '-0', 'woff2', '-0', 'png', join(stage, 'res.zip')]);

// 4. Code Java → classes.dex
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
run('dalvik-exchange', ['--dex', `--min-sdk-version=${MIN_SDK}`, `--output=${join(stage, 'classes.dex')}`, classes]);
run('zip', ['-q', '-j', unsigned, join(stage, 'classes.dex')]);

// 5. Alignement et signature (clé de test, schémas v1 + v2 + v3 : installable sur tous les Android)
step('alignement et signature (clé de test)');
const aligned = join(stage, 'aligned.apk');
run('zipalign', ['-p', '-f', '4', unsigned, aligned]);
const keyDir = join(shell, 'keys');
const ks = join(keyDir, 'hoopbounce-test.jks');
if (!existsSync(ks)) {
  mkdirSync(keyDir, { recursive: true });
  run('keytool', ['-genkeypair', '-keystore', ks, '-storepass', KEY_PASS, '-keypass', KEY_PASS, '-alias', 'hoopbounce-test',
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Hoop Bounce Test, O=EchoSpeed']);
  console.log(`  nouvelle clé de test : ${relative(root, ks)} (gardez-la pour pouvoir mettre à jour les versions de test)`);
}
const out = join(dist, apkName);
run('apksigner', ['sign', '--ks', ks, '--ks-pass', `pass:${KEY_PASS}`, '--key-pass', `pass:${KEY_PASS}`, '--ks-key-alias', 'hoopbounce-test',
  '--v1-signing-enabled', 'true', '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true', '--out', out, aligned]);

// 6. Vérifications
step('vérifications');
const verify = run('apksigner', ['verify', '--verbose', '--min-sdk-version', String(MIN_SDK), out]);
run('zipalign', ['-c', '-p', '4', out]);
const badging = run('aapt', ['dump', 'badging', out]);
const size = (statSync(out).size / 1024 / 1024).toFixed(2);
console.log(verify.split('\n').filter((l) => /Verifies|v1 scheme|v2 scheme|v3 scheme|Number of signers/.test(l)).map((l) => `  ${l}`).join('\n'));
console.log(badging.split('\n').filter((l) => /^(package|sdkVersion|targetSdkVersion|application-label:|uses-permission|native-code)/.test(l)).map((l) => `  ${l}`).join('\n'));
console.log(`\n✅ ${relative(root, out)} (${size} Mo)`);
