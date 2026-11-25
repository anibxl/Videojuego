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
//         node tools/build-test-apk.mjs --build 3  (version de test n° 3)
//
// MISE À JOUR SANS PERDRE LES SAUVEGARDES : chaque nouvelle version de test doit garder le même
// identifiant (com.echospeed.hoopbounce.test, dans native/test-apk/AndroidManifest.xml), être signée avec
// la MÊME clé (native/test-apk/keys/hoopbounce-test.jks, à ne jamais perdre ni régénérer) et avoir un
// versionCode plus grand (= numéro de version de test). Android installe alors par-dessus l'ancienne :
// progression, pièces, skins et récompenses (localStorage de https://appassets.androidplatform.net) restent.
//   v1 : 1.0.0-test1 (étape 20)   v2 : 1.1.0-test2 (étape 22, mode TRICKSHOT)   v3 : 1.2.0-test3 (étape 23, laboratoire)
//   v4 : 1.3.0-test4 (étape 24, Boutique et Collection refaites)
//   v5 : 1.4.0-test5 (saison 1 Noël, étape 1 : menu décoré)
//   v6 : 1.5.0-test6 (Hoop Pass et gemmes)   v7 : 1.6.0-test7 (étape 25, direction artistique)
//   v8 : 1.7.0-test8 (phase 2 : refonte complète des 50 niveaux)   v9 : 1.8.0-test9 (phase 3 : Mode Fantôme)
//   v10 : 1.9.0-test10 (phase 4 : économie rééquilibrée, roulette quotidienne)
//   v11 : 1.10.0-test11 (phase 5 : système de succès)
//   v12 : 1.11.0-test12 (refonte de la campagne : 50 niveaux plus longs, pièges surprises, Trickshot 50 cartes)
//   v13 : 1.11.1-test13 (Trickshot : ↺ Recommencer ne permet plus d'obtenir l'étoile « Premier essai »)
//   v14 : 1.12.0-test14 (phase de finition : scène de Noël, neige, pièces, gemmes, étoiles, coffres, sons, fondus)
//   v15 : 1.12.1-test15 (Trickshot : retour au fonctionnement d'origine du bouton ↺ Recommencer)

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_BUILD = 15;
// Nom de version des versions de test : 1.1.0 = mode TRICKSHOT, 1.2.0 = TRICKSHOT « laboratoire », 1.3.0 = Boutique / Collection, 1.4.0 = menu de Noël (Play Store : 1.0.0)
const VERSION = '1.12.1';
const PACKAGE = 'com.echospeed.hoopbounce.test';
// Empreinte SHA-256 de la clé de test qui a signé la v1 : une autre clé empêcherait la mise à jour
const KEY_SHA256 = '894f0b7da38d40fbd7ad33ae73cfe4d3c64659d981e8f94c00d4cba11535bfd8';
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
if (!existsSync(ks) && !process.argv.includes('--new-key')) {
  throw new Error(`clé de test introuvable (${relative(root, ks)}) : sans elle, l'APK ne pourra pas mettre à jour l'application déjà installée.\nRemettez la clé d'origine, ou relancez avec --new-key (il faudra alors désinstaller l'ancienne version).`);
}
if (!existsSync(ks)) {
  mkdirSync(keyDir, { recursive: true });
  run('keytool', ['-genkeypair', '-keystore', ks, '-storepass', KEY_PASS, '-keypass', KEY_PASS, '-alias', 'hoopbounce-test',
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Hoop Bounce Test, O=EchoSpeed']);
  console.log(`  nouvelle clé de test : ${relative(root, ks)} (gardez-la pour pouvoir mettre à jour les versions de test)`);
}
const out = join(dist, apkName);
run('apksigner', ['sign', '--ks', ks, '--ks-pass', `pass:${KEY_PASS}`, '--key-pass', `pass:${KEY_PASS}`, '--ks-key-alias', 'hoopbounce-test',
  '--v1-signing-enabled', 'true', '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true', '--v4-signing-enabled', 'false', '--out', out, aligned]);

// 6. Vérifications
step('vérifications');
const verify = run('apksigner', ['verify', '--verbose', '--min-sdk-version', String(MIN_SDK), out]);
run('zipalign', ['-c', '-p', '4', out]);
const badging = run('aapt', ['dump', 'badging', out]);
const size = (statSync(out).size / 1024 / 1024).toFixed(2);
// Garanties de mise à jour : même identifiant, même clé, versionCode plus grand que les APK précédents
const pkg = badging.match(/package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/);
if (!pkg || pkg[1] !== PACKAGE) throw new Error(`identifiant inattendu : ${pkg?.[1]} (attendu ${PACKAGE})`);
const certs = run('apksigner', ['verify', '--print-certs', out]);
const sha = certs.match(/certificate SHA-256 digest: ([0-9a-f]+)/)?.[1];
if (sha !== KEY_SHA256 && !process.argv.includes('--new-key')) throw new Error(`clé de signature différente de la v1 (${sha}) : la mise à jour serait refusée par Android`);
for (const f of readdirSync(dist)) {
  const m = f.match(/^HoopBounce_Test_v(\d+)\.apk$/);
  if (m && f !== apkName && +m[1] >= build) throw new Error(`versionCode ${build} pas plus grand que ${f} : Android refuserait la mise à jour`);
}
console.log(`  identifiant ${pkg[1]} · versionCode ${pkg[2]} · versionName ${pkg[3]} · clé SHA-256 ${sha.slice(0, 16)}… (identique à la v1)`);
console.log(verify.split('\n').filter((l) => /Verifies|v1 scheme|v2 scheme|v3 scheme|Number of signers/.test(l)).map((l) => `  ${l}`).join('\n'));
console.log(badging.split('\n').filter((l) => /^(package|sdkVersion|targetSdkVersion|application-label:|uses-permission|native-code)/.test(l)).map((l) => `  ${l}`).join('\n'));
console.log(`\n✅ ${relative(root, out)} (${size} Mo)`);
