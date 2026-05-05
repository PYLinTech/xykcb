import { getCustomCourseItems } from '/assets/common/custom_course_store.js';

const DAY_MS = 24 * 60 * 60 * 1000;

let courseData = null;
let sortedCoursesCache = new Map();
let weekCoursesCache = new Map();
let dayCoursesCache = new Map();

if (typeof window !== 'undefined') {
  window.addEventListener('custom-courses-changed', e => {
    clearCourseCaches(e.detail?.termId);
  });
}

function deleteCacheByTerm(cache, termId) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${termId}:`)) cache.delete(key);
  }
}

function clearCourseCaches(termId) {
  if (!termId) {
    sortedCoursesCache = new Map();
    weekCoursesCache = new Map();
    dayCoursesCache = new Map();
    return;
  }
  sortedCoursesCache.delete(termId);
  deleteCacheByTerm(weekCoursesCache, termId);
  deleteCacheByTerm(dayCoursesCache, termId);
}

function parseDateOnly(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getFirstWeekMonday(startDate) {
  const startDay = startDate.getDay();
  return new Date(startDate.getTime() - (startDay === 0 ? 6 : startDay - 1) * DAY_MS);
}

function getTermWeekInfo(termId, dateStr) {
  const term = courseData?.terms?.[termId];
  if (!term?.startDate) return null;
  const targetDate = parseDateOnly(dateStr);
  if (!targetDate) return null;
  const startDate = parseDateOnly(term.startDate);
  if (!startDate) return null;
  const firstWeekMonday = getFirstWeekMonday(startDate);
  const diffTime = targetDate.getTime() - firstWeekMonday.getTime();
  const diffDays = Math.floor(diffTime / DAY_MS);
  const week = Math.floor(diffDays / 7) + 1;
  const day = targetDate.getDay();
  const dayOfWeek = day === 0 ? 7 : day;
  if (week < 1 || week > term.totalWeeks) return { week, dayOfWeek, outOfRange: true };
  return { week, dayOfWeek };
}

async function loadCourse() {
  clearCourseCaches();
  try {
    const raw = localStorage.getItem('course_data');
    if (!raw) {
      courseData = null;
      return false;
    }
    const data = JSON.parse(raw);
    if (data && data.terms && data.coursesByHash) {
      courseData = data;
      return true;
    }
    courseData = null;
    return false;
  } catch (error) {
    courseData = null;
    console.error('Failed to load course data:', error);
    return false;
  }
}

function getAvailableSemesters() {
  return Object.keys(courseData?.terms || {});
}

function getSemesterConfig(termId) {
  const term = courseData?.terms?.[termId];
  if (!term) return null;
  return {
    totalWeeks: term.totalWeeks,
    timeSlots: term.timeSlots,
    dailySectionCount: term.timeSlots.length,
    mergeableSections: term.mergeableSections || []
  };
}

function getBaseCourseByHash(hash) {
  return courseData?.coursesByHash?.[hash] || null;
}

function splitCustomCourses(termId) {
  const overridesByHash = new Map();
  const adds = [];
  for (const item of getCustomCourseItems()) {
    if (item.termId !== termId) continue;
    if (item.type === 'override') {
      const base = courseData?.coursesByHash?.[item.targetHash];
      if (base) overridesByHash.set(item.targetHash, item);
    } else if (item.type === 'add') {
      adds.push(item);
    }
  }
  return { overridesByHash, adds };
}

function applyCourseOverride(base, override) {
  if (!override) return base;
  return {
    ...base,
    name: override.name,
    location: override.location,
    teacher: override.teacher,
    weeks: override.weeks,
    weekday: override.weekday,
    sections: override.sections,
    customType: 'override',
    customId: override.id,
    targetHash: base.hash
  };
}

function createAddedCourse(item) {
  return {
    hash: item.id,
    termId: item.termId,
    rawId: '',
    name: item.name,
    location: item.location,
    teacher: item.teacher,
    weeks: item.weeks,
    weekday: item.weekday,
    sections: item.sections,
    customType: 'add',
    customId: item.id
  };
}

function compareCourses(a, b) {
  if (a.weekday !== b.weekday) return a.weekday - b.weekday;
  const aSec = a.sections?.[0] || 0;
  const bSec = b.sections?.[0] || 0;
  if (aSec !== bSec) return aSec - bSec;
  const aWeek = a.weeks?.[0] || 0;
  const bWeek = b.weeks?.[0] || 0;
  if (aWeek !== bWeek) return aWeek - bWeek;
  return (a.hash || '').localeCompare(b.hash || '');
}

function getCourses(termId) {
  if (sortedCoursesCache.has(termId)) return sortedCoursesCache.get(termId).slice();

  const result = [];
  const { overridesByHash, adds } = splitCustomCourses(termId);

  for (const hash of courseData?.courseHashesByTerm?.[termId] || []) {
    const base = courseData.coursesByHash[hash];
    if (base) result.push(applyCourseOverride(base, overridesByHash.get(hash)));
  }

  for (const item of adds) result.push(createAddedCourse(item));

  result.sort(compareCourses);

  sortedCoursesCache.set(termId, result);
  return result.slice();
}

function getCoursesByWeek(termId, week) {
  const key = `${termId}:${week}`;
  if (weekCoursesCache.has(key)) return weekCoursesCache.get(key).slice();
  const courses = getCourses(termId).filter(course => course.weeks.includes(week));
  weekCoursesCache.set(key, courses);
  return courses.slice();
}

function getCoursesByDate(termId, dateStr) {
  const info = getTermWeekInfo(termId, dateStr);
  if (!info) return null;
  if (info.outOfRange) return 'out';
  const key = `${termId}:${info.week}:${info.dayOfWeek}`;
  if (dayCoursesCache.has(key)) {
    const cached = dayCoursesCache.get(key);
    return cached.length > 0 ? cached.slice() : 'none';
  }
  const courses = getCoursesByWeek(termId, info.week);
  const dayCourses = courses.filter(course => course.weekday === info.dayOfWeek);
  dayCoursesCache.set(key, dayCourses);
  return dayCourses.length > 0 ? dayCourses.slice() : 'none';
}

function getWeekDates(termId, week) {
  const term = courseData?.terms?.[termId];
  if (!term?.startDate || week < 1 || week > term.totalWeeks) return null;
  const startDate = parseDateOnly(term.startDate);
  if (!startDate) return null;
  const firstWeekMonday = getFirstWeekMonday(startDate);
  const weekStart = new Date(firstWeekMonday.getTime() + (week - 1) * 7 * DAY_MS);
  const dates = {};
  for (let day = 1; day <= 7; day++) {
    const date = new Date(weekStart.getTime() + (day - 1) * DAY_MS);
    dates[day] = formatDateOnly(date);
  }
  return dates;
}

function getCurrentSemesterAndWeek() {
  const semesters = getAvailableSemesters();
  if (semesters.length === 0) return null;
  const todayStr = formatDateOnly(new Date());
  const results = semesters.map(semesterId => {
    const info = getTermWeekInfo(semesterId, todayStr);
    const term = courseData?.terms?.[semesterId];
    const week = (info && !info.outOfRange) ? info.week : 0;
    const startDate = term?.startDate ? parseDateOnly(term.startDate) : null;
    return { semesterId, week, startTime: startDate?.getTime() || 0 };
  });
  const matched = results.filter(r => r.week > 0);
  if (matched.length > 0) {
    matched.sort((a, b) => b.startTime - a.startTime);
    return { semesterId: matched[0].semesterId, week: matched[0].week };
  }
  results.sort((a, b) => b.startTime - a.startTime);
  return { semesterId: results[0].semesterId, week: 0 };
}

function searchCourses(termId, keyword) {
  const key = String(keyword || '').trim().toLowerCase();
  if (!key) return [];
  const courses = getCourses(termId);
  return courses.filter(course =>
    (course.name || '').toLowerCase().includes(key) ||
    (course.location || '').toLowerCase().includes(key) ||
    (course.teacher || '').toLowerCase().includes(key)
  );
}

function formatWeeks(weeks) {
  if (!Array.isArray(weeks) || !weeks.length) return '';
  const unique = [...new Set(weeks.filter(n => typeof n === 'number' && !Number.isNaN(n)))].sort((a, b) => a - b);
  if (!unique.length) return '';

  const result = [];
  let start = unique[0];
  let prev = start;
  for (let i = 1; i <= unique.length; i++) {
    const current = unique[i];
    if (current !== prev + 1) {
      result.push(start === prev ? String(start) : `${start}-${prev}`);
      start = current;
    }
    prev = current;
  }
  return result.join(',\u200B');
}

export { loadCourse, getAvailableSemesters, getSemesterConfig, getCourses, getCoursesByWeek, getCoursesByDate, getWeekDates, getCurrentSemesterAndWeek, searchCourses, formatWeeks, clearCourseCaches, getBaseCourseByHash };
