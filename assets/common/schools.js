import { API, fetchWithTimeout } from '/assets/common/api.js';
import { getCurrentLang } from '/assets/init/languages.js';

const LOGIN_USER_KEY = 'login_user';

let cachedSchools = null;
let pendingSchools = null;

const sortSchoolsById = (schools) =>
  [...schools].sort((a, b) => String(a?.id ?? '').localeCompare(String(b?.id ?? ''), undefined, { numeric: true }));

export function hasValidSchoolDefinition(definition, schoolKey) {
  if (!definition || typeof definition !== 'object') return false;
  if (schoolKey && definition.desc_key && definition.desc_key !== schoolKey) return false;
  return Boolean(definition['zh-cn'] || definition.en);
}

export function getSchoolName(definition, fallback = '') {
  const lang = getCurrentLang();
  return definition?.[lang] || definition?.['zh-cn'] || definition?.en || definition?.desc_key || fallback;
}

export async function loadSchools({ refresh = false } = {}) {
  if (!refresh && cachedSchools) return cachedSchools;
  if (!refresh && pendingSchools) return pendingSchools;

  const request = (async () => {
    const response = await fetchWithTimeout(API.getSupportSchool);
    const result = await response.json();
    if (!response.ok || !result.success || !Array.isArray(result.data)) {
      throw new Error('Failed to load schools');
    }
    cachedSchools = sortSchoolsById(result.data);
    return cachedSchools;
  })();

  pendingSchools = request;
  try {
    return await request;
  } finally {
    if (pendingSchools === request) pendingSchools = null;
  }
}

export function backfillSavedSchoolDefinition(schoolKey, definition) {
  if (!schoolKey || !hasValidSchoolDefinition(definition, schoolKey)) return;
  try {
    const savedUser = JSON.parse(localStorage.getItem(LOGIN_USER_KEY) || 'null');
    if (!savedUser || savedUser.school !== schoolKey) return;
    if (hasValidSchoolDefinition(savedUser.schoolDefinition, schoolKey)) return;
    localStorage.setItem(LOGIN_USER_KEY, JSON.stringify({ ...savedUser, schoolDefinition: definition }));
  } catch {
    // Ignore storage parse/write errors
  }
}

export async function resolveSchoolDefinition(schoolKey, existingDefinition = null) {
  if (!schoolKey) return null;
  if (hasValidSchoolDefinition(existingDefinition, schoolKey)) return existingDefinition;

  try {
    const schools = await loadSchools();
    const matched = schools.find(school => school.desc_key === schoolKey) || null;
    if (matched) backfillSavedSchoolDefinition(schoolKey, matched);
    return matched;
  } catch {
    return null;
  }
}
