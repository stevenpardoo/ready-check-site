// Check catalogue and default project settings.
// Order here is the order shown in the panel and in project settings.

export const CHECK_IDS = [
  'storyFormat',
  'acceptanceCriteria',
  'gherkin',
  'edgeCases',
  'openQuestions',
  'estimate',
  'ambiguity',
  'detail',
  'designLink',
];

export const DEFAULT_SETTINGS = {
  threshold: 70,
  // True once an admin finished the setup. The validator only blocks in configured
  // projects, so a workflow shared with other projects never surprises them.
  configured: false,
  // Status whose incoming transitions carry the validator (chosen in the setup).
  gateStatusId: null,
  // Issue types where the validator enforces the threshold. Empty = all types.
  // Names are for display (in the admin's language); ids are what the validator matches,
  // because Jira returns names in the language of whoever asks.
  issueTypes: [],
  issueTypeIds: [],
  // Optional custom field (multi-line text) that holds acceptance criteria.
  acFieldId: null,
  // 'auto' follows each user's Jira language; 'en' or 'es' forces one.
  language: 'auto',
  minWords: 30,
  checks: {
    storyFormat: { enabled: true, weight: 2 },
    acceptanceCriteria: { enabled: true, weight: 3 },
    gherkin: { enabled: true, weight: 2 },
    edgeCases: { enabled: true, weight: 3 },
    openQuestions: { enabled: true, weight: 2 },
    estimate: { enabled: true, weight: 2 },
    ambiguity: { enabled: true, weight: 1 },
    detail: { enabled: true, weight: 1 },
    designLink: { enabled: true, weight: 1 },
  },
};

const clampInt = (v, min, max, fallback) => {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

// Merges saved (possibly partial or outdated) settings over the defaults and
// sanitises every value, so stored data can never break the engine.
export function mergeSettings(saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const checks = {};
  for (const id of CHECK_IDS) {
    const def = DEFAULT_SETTINGS.checks[id];
    const got = (s.checks && s.checks[id]) || {};
    checks[id] = {
      enabled: typeof got.enabled === 'boolean' ? got.enabled : def.enabled,
      weight: clampInt(got.weight, 1, 5, def.weight),
    };
  }
  return {
    configured: s.configured === true,
    gateStatusId: typeof s.gateStatusId === 'string' && /^\d+$/.test(s.gateStatusId) ? s.gateStatusId : null,
    threshold: clampInt(s.threshold, 0, 100, DEFAULT_SETTINGS.threshold),
    issueTypes: Array.isArray(s.issueTypes)
      ? s.issueTypes.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim()).slice(0, 50)
      : [...DEFAULT_SETTINGS.issueTypes],
    issueTypeIds: Array.isArray(s.issueTypeIds)
      ? s.issueTypeIds.map(String).filter((id) => /^\d+$/.test(id)).slice(0, 50)
      : [],
    acFieldId: typeof s.acFieldId === 'string' && /^customfield_\d+$/.test(s.acFieldId) ? s.acFieldId : null,
    language: ['auto', 'en', 'es'].includes(s.language) ? s.language : 'auto',
    minWords: clampInt(s.minWords, 0, 500, DEFAULT_SETTINGS.minWords),
    checks,
  };
}

export function appliesToIssueType(settings, issueTypeName, issueTypeId) {
  if (settings.issueTypeIds.length && issueTypeId) return settings.issueTypeIds.includes(String(issueTypeId));
  if (!settings.issueTypes.length) return true;
  const name = (issueTypeName || '').trim().toLowerCase();
  return settings.issueTypes.some((t) => t.toLowerCase() === name);
}
