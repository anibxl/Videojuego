// Version de test Android (APK) : elle doit rester une version de TEST.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ADS_CONFIG, resolveAdIds } from '../src/shared/ads-config.js';

const manifest = readFileSync(new URL('../native/test-apk/AndroidManifest.xml', import.meta.url), 'utf8');
const activity = readFileSync(new URL('../native/test-apk/java/com/echospeed/hoopbounce/test/MainActivity.java', import.meta.url), 'utf8');

test('publicités : identifiants de TEST de Google uniquement', () => {
  assert.equal(ADS_CONFIG.useTestAds, true);
  const ids = resolveAdIds();
  assert.equal(ids.testing, true);
  assert.equal(ids.appId, 'ca-app-pub-3940256099942544~3347511713');
  assert.match(ids.unit('doubleCoins'), /^ca-app-pub-3940256099942544\//);
});

test('APK de test : identifiant distinct, aucune permission Internet, jeu servi depuis l’APK', () => {
  assert.match(manifest, /package="com\.echospeed\.hoopbounce\.test"/);
  assert.doesNotMatch(manifest, /android\.permission\.INTERNET/);
  assert.match(manifest, /android:screenOrientation="sensorLandscape"/);
  assert.match(activity, /getAssets\(\)\.open\("www" \+ path\)/);
  assert.doesNotMatch(activity, /ca-app-pub-(?!3940256099942544)/, 'aucun identifiant AdMob réel');
});
