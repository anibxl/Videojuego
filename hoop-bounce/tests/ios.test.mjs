// Prise en charge d'iOS : publicités de test par plateforme, vibrations, configuration Xcode.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ADS_CONFIG, resolveAdIds, currentPlatform } from '../src/shared/ads-config.js';
import { vibratePattern, canVibrate } from '../src/platform/vibrate.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('publicités : identifiants de TEST Google propres à iOS, Android inchangé', () => {
  const ios = resolveAdIds(ADS_CONFIG, 'ios');
  assert.equal(ios.testing, true);
  assert.equal(ios.appId, 'ca-app-pub-3940256099942544~1458002511');
  assert.equal(ios.unit('doubleCoins'), 'ca-app-pub-3940256099942544/1712485313');
  const android = resolveAdIds(ADS_CONFIG, 'android');
  assert.equal(android.appId, 'ca-app-pub-3940256099942544~3347511713');
  assert.equal(android.unit('checkpoint'), 'ca-app-pub-3940256099942544/5224354917');
  assert.equal(ADS_CONFIG.useTestAds, true);
});

test('plateforme détectée : iOS dans l’application iPhone, Android sinon', () => {
  const before = globalThis.Capacitor;
  try {
    delete globalThis.Capacitor;
    assert.equal(currentPlatform(), 'android');
    globalThis.Capacitor = { getPlatform: () => 'ios' };
    assert.equal(currentPlatform(), 'ios');
    assert.equal(resolveAdIds().appId, 'ca-app-pub-3940256099942544~1458002511');
  } finally {
    globalThis.Capacitor = before;
  }
});

test('vibrations : navigator.vibrate sur Android, retour haptique natif sur iPhone (même rythme)', async () => {
  const savedNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const savedCap = globalThis.Capacitor;
  try {
    // Android : navigator.vibrate reçoit le motif tel quel
    const got = [];
    Object.defineProperty(globalThis, 'navigator', { value: { vibrate: (p) => got.push(p) }, configurable: true });
    assert.equal(vibratePattern([10, 40, 10]), true);
    assert.deepEqual(got, [[10, 40, 10]]);
    // iPhone : pas de navigator.vibrate ; chocs haptiques natifs
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    const impacts = [];
    globalThis.Capacitor = { isNativePlatform: () => true, Plugins: { Haptics: { impact: (o) => (impacts.push(o.style), Promise.resolve()) } } };
    assert.equal(canVibrate(), true);
    vibratePattern(8);
    vibratePattern([30, 20, 12]);
    await new Promise((r) => setTimeout(r, 80));
    assert.deepEqual(impacts, ['LIGHT', 'HEAVY', 'MEDIUM']);
    // Ailleurs (Safari sur ordinateur) : rien, sans erreur
    globalThis.Capacitor = undefined;
    assert.equal(vibratePattern(8), false);
  } finally {
    if (savedNav) Object.defineProperty(globalThis, 'navigator', savedNav);
    globalThis.Capacitor = savedCap;
  }
});

test('projet Xcode : paysage, plein écran, AdMob de test, iOS 16, contrôleur du jeu', () => {
  const plist = read('ios/App/App/Info.plist');
  assert.match(plist, /<key>GADApplicationIdentifier<\/key>\s*<string>ca-app-pub-3940256099942544~1458002511<\/string>/);
  assert.doesNotMatch(plist, /UIInterfaceOrientationPortrait/);
  assert.match(plist, /UIInterfaceOrientationLandscapeLeft/);
  assert.match(plist, /<key>UIStatusBarHidden<\/key>\s*<true\/>/);
  assert.match(plist, /<key>UIRequiresFullScreen<\/key>\s*<true\/>/);
  assert.match(plist, /SKAdNetworkIdentifier/);
  const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
  assert.equal((pbx.match(/IPHONEOS_DEPLOYMENT_TARGET = 16\.0;/g) ?? []).length, 4);
  assert.equal((pbx.match(/MainViewController\.swift/g) ?? []).length >= 4, true);
  assert.match(pbx, /PRODUCT_BUNDLE_IDENTIFIER = com\.echospeed\.hoopbounce;/);
  assert.match(read('ios/App/App/Base.lproj/Main.storyboard'), /customClass="MainViewController"/);
  const cfg = JSON.parse(read('capacitor.config.json'));
  assert.equal(cfg.ios.contentInset, 'never');
  assert.equal(cfg.ios.scrollEnabled, false);
});

test('aucune dépendance native réservée à Android : chaque plugin Capacitor a sa version iOS', () => {
  const pkg = JSON.parse(read('package.json'));
  const plugins = Object.keys(pkg.dependencies).filter((d) => d !== '@capacitor/core' && d !== '@capacitor/android' && d !== '@capacitor/ios');
  assert.ok(plugins.length >= 2);
  for (const p of plugins) assert.ok(existsSync(new URL(`../node_modules/${p}/Package.swift`, import.meta.url)), `${p} sans Package.swift (iOS)`);
  const spm = read('ios/App/CapApp-SPM/Package.swift');
  for (const p of plugins) assert.ok(spm.includes(`node_modules/${p}`), `${p} absent du projet iOS`);
});
