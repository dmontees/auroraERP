const GITHUB_RELEASES_API = 'https://api.github.com/repos/dmontees/auroraERP/releases';

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

module.exports = {
  GITHUB_RELEASES_API,
  parseSemver,
  compareSemver,
  isNewer,
  selectMacDmgAsset
};

