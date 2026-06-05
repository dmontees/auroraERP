import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  isNewer,
  parseSemver,
  selectMacDmgAsset
} = require('../electron/updater-utils.cjs');

assert.deepEqual(parseSemver('v3.0.1'), { raw: '3.0.1', major: 3, minor: 0, patch: 1 });
assert.deepEqual(parseSemver('Aurora 3.2.10-mac'), { raw: '3.2.10-mac', major: 3, minor: 2, patch: 10 });
assert.equal(parseSemver('release-without-version'), null);

assert.equal(isNewer('3.0.1', '3.0.0'), true);
assert.equal(isNewer('3.0.0', '3.0.0'), false);
assert.equal(isNewer('2.9.9', '3.0.0'), false);
assert.equal(isNewer('3.10.0', '3.9.9'), true);

const normalPreferred = selectMacDmgAsset({
  assets: [
    { name: 'Aurora-3.0.1-x64.dmg', browser_download_url: 'x64' },
    { name: 'Aurora-3.0.1.dmg', browser_download_url: 'normal' },
    { name: 'Aurora-3.0.1.dmg.blockmap', browser_download_url: 'blockmap' }
  ]
});
assert.equal(normalPreferred?.browser_download_url, 'normal');

const fallbackToX64 = selectMacDmgAsset({
  assets: [
    { name: 'Aurora-3.0.1-x64.dmg', browser_download_url: 'x64' }
  ]
});
assert.equal(fallbackToX64?.browser_download_url, 'x64');

assert.equal(selectMacDmgAsset({ assets: [{ name: 'latest.yml' }] }), null);

console.log('test-updater-utils: ok');

