const LruCache = require('./lru-cache');

const DEFAULT_CACHE_MAX_MB = 50;

function parseCacheMaxBytes() {
  const raw = process.env.CACHE_MAX_MB;
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_CACHE_MAX_MB * 1024 * 1024;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_CACHE_MAX_MB * 1024 * 1024;
  }

  return Math.floor(parsed * 1024 * 1024);
}

const cache = new LruCache({ maxBytes: parseCacheMaxBytes() });

function uniqueRefs(refs) {
  return Array.from(new Set((refs || []).filter(Boolean)));
}

function remember(key, loader, refsBuilder, options = {}) {
  const cachedValue = cache.get(key);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  const value = loader();
  if (value === undefined) {
    return value;
  }

  const refs = typeof refsBuilder === 'function' ? refsBuilder(value) : refsBuilder;
  cache.set(key, value, {
    refs: uniqueRefs(refs),
    ttlMs: options.ttlMs
  });
  return value;
}

function skillKey(skillId) {
  return `skill:${skillId}`;
}

function skillSearchKey(query) {
  return `skill-search:${query || ''}`;
}

function skillExistsKey(skillId) {
  return `skill-exists:${skillId}`;
}

function skillVersionsKey(skillId) {
  return `skill-versions:${skillId}`;
}

function skillVersionKey(skillId, version) {
  return `skill-version:${skillId}:${version}`;
}

function skillLatestKey(skillId) {
  return `skill-latest:${skillId}`;
}

function userBasicKey(userId) {
  return `user-basic:${userId}`;
}

function skillRefs(skill) {
  if (!skill) {
    return [];
  }
  return [`skill:${skill.id}`, `user:${skill.owner_id}`];
}

function skillSearchRefs(skills) {
  const refs = ['collection:skill-search'];
  for (const skill of skills || []) {
    refs.push(...skillRefs(skill));
  }
  return refs;
}

function versionRefs(version) {
  if (!version) {
    return [];
  }
  return [
    `skill:${version.skill_id}`,
    `version:${version.skill_id}:${version.version}`,
    `user:${version.uploader_id}`
  ];
}

function versionListRefs(skillId, versions) {
  const refs = [`skill:${skillId}`];
  for (const version of versions || []) {
    refs.push(...versionRefs(version));
  }
  return refs;
}

function userRefs(user) {
  if (!user) {
    return [];
  }
  return [`user:${user.id}`];
}

function invalidateSkill(skillId) {
  cache.delete(skillKey(skillId));
  cache.delete(skillExistsKey(skillId));
  cache.delete(skillVersionsKey(skillId));
  cache.delete(skillLatestKey(skillId));
  cache.clearByPrefix(`skill-version:${skillId}:`);
  cache.clearByRef(`skill:${skillId}`);
  cache.clearByRef('collection:skill-search');
}

function invalidateUser(userId) {
  cache.delete(userBasicKey(userId));
  cache.clearByRef(`user:${userId}`);
}

function invalidateAllSkillSearches() {
  cache.clearByRef('collection:skill-search');
}

function getStats() {
  return cache.stats();
}

module.exports = {
  remember,
  getStats,
  invalidateSkill,
  invalidateUser,
  invalidateAllSkillSearches,
  keys: {
    skill: skillKey,
    skillSearch: skillSearchKey,
    skillExists: skillExistsKey,
    skillVersions: skillVersionsKey,
    skillVersion: skillVersionKey,
    skillLatest: skillLatestKey,
    userBasic: userBasicKey
  },
  refs: {
    skill: skillRefs,
    skillSearch: skillSearchRefs,
    version: versionRefs,
    versionList: versionListRefs,
    user: userRefs
  }
};
