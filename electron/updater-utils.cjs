const GITHUB_RELEASES_API = 'https://api.github.com/repos/dmontees/auroraERP/releases';
const GITHUB_RELEASE_DOWNLOAD_BASE = 'https://github.com/dmontees/auroraERP/releases/download';
const GITHUB_LATEST_MAC_YML = 'https://github.com/dmontees/auroraERP/releases/latest/download/latest-mac.yml';

function parseSemver(version) {
  const match = String(version || '').match(/v?(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?/);
  if (!match) return null;
  return {
    raw: match[0].replace(/^v/, ''),
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function isNewer(latest, current) {
  const latestParsed = parseSemver(latest);
  const currentParsed = parseSemver(current);
  if (!latestParsed || !currentParsed) return false;
  return compareSemver(latestParsed, currentParsed) > 0;
}

function selectMacDmgAsset(release) {
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const dmgAssets = assets.filter((asset) => {
    const name = String(asset.name || '').toLowerCase();
    return name.endsWith('.dmg') && !name.endsWith('.blockmap');
  });

  if (dmgAssets.length === 0) return null;

  const normalDmg = dmgAssets.find((asset) => {
    const name = String(asset.name || '').toLowerCase();
    return !name.includes('x64') && !name.includes('arm64') && !name.includes('universal');
  });

  return normalDmg || dmgAssets[0];
}

function parseLatestMacYml(text) {
  const version = String(text || '').match(/^version:\s*['"]?([^'"\r\n]+)['"]?/m)?.[1]?.trim();
  const path = String(text || '').match(/^path:\s*['"]?([^'"\r\n]+)['"]?/m)?.[1]?.trim();

  if (!version || !path) return null;

  return {
    version,
    path,
    downloadUrl: `${GITHUB_RELEASE_DOWNLOAD_BASE}/v${version}/${encodeURIComponent(path).replace(/%2F/g, '/')}`,
    releaseUrl: `${GITHUB_RELEASE_DOWNLOAD_BASE.replace('/download', '/tag')}/v${version}`,
    assetName: path
  };
}

module.exports = {
  GITHUB_RELEASES_API,
  GITHUB_LATEST_MAC_YML,
  parseSemver,
  compareSemver,
  isNewer,
  selectMacDmgAsset,
  parseLatestMacYml
};
