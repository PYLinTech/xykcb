const EMPTY_SET = new Set();
const TERM_FIELDS = 8;
const COURSE_FIELDS = 9;
const COURSE_NO_INHERIT = new Set([0]);

function normalizeRow(parts, fieldCount, prevRow, noInheritIndexes = EMPTY_SET) {
  const result = [];
  for (let i = 0; i < fieldCount; i++) {
    const value = parts[i] ?? '';
    if (value === '\\N') {
      result[i] = '';
    } else if (value === '' && prevRow && !noInheritIndexes.has(i)) {
      result[i] = prevRow[i] ?? '';
    } else {
      result[i] = value;
    }
  }
  return result;
}

function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function parseNumberList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !Number.isNaN(n));
}

function splitBlocks(data) {
  const rows = { terms: [], courses: [] };
  const headerSkipped = { terms: false, courses: false };
  let block = null;

  for (const line of data.split('\n')) {
    const rawLine = line.replace(/\r$/, '');
    const marker = rawLine.trim();
    if (!marker) continue;
    if (marker === '@terms' || marker === '@courses') {
      block = marker.slice(1);
      headerSkipped[block] = false;
      continue;
    }
    if (!block) continue;
    if (!headerSkipped[block]) {
      headerSkipped[block] = true;
      continue;
    }
    rows[block].push(rawLine.split('\t'));
  }

  return rows;
}

function buildTerms(rawTermRows) {
  const terms = {};
  let prevRow = null;

  for (const parts of rawTermRows) {
    const row = normalizeRow(parts, TERM_FIELDS, prevRow);
    prevRow = row;

    const [schoolId, termId, totalWeeks, startDate, periodGroup, sectionNo, startTime, endTime] = row;
    if (!termId) throw new Error('Term row missing term_id: ' + parts.join('\t'));

    if (!terms[termId]) {
      terms[termId] = {
        termId,
        schoolId,
        totalWeeks: toInt(totalWeeks),
        startDate,
        timeSlots: [],
        mergeableSections: []
      };
    }

    terms[termId].timeSlots.push({
      section: toInt(sectionNo),
      start: startTime,
      end: endTime,
      periodGroup: toInt(periodGroup)
    });
  }

  for (const term of Object.values(terms)) {
    term.timeSlots.sort((a, b) => a.section - b.section);
    const groups = new Map();
    for (const slot of term.timeSlots) {
      if (!groups.has(slot.periodGroup)) groups.set(slot.periodGroup, []);
      groups.get(slot.periodGroup).push(slot.section);
    }
    term.mergeableSections = [...groups.keys()]
      .sort((a, b) => a - b)
      .filter(key => key >= 1)
      .map(key => groups.get(key).sort((a, b) => a - b))
      .filter(sections => sections.length >= 2)
      .map(sections => `${sections[0]}-${sections[sections.length - 1]}`);
  }

  return terms;
}

function buildCourses(rawCourseRows) {
  const coursesByHash = {};
  const courseHashesByTerm = {};
  let prevRow = null;

  for (const parts of rawCourseRows) {
    const cHash = parts[0] === '\\N' ? '' : (parts[0] ?? '');
    if (!cHash) throw new Error('Course row missing c_hash: ' + parts.join('\t'));
    if (coursesByHash[cHash]) throw new Error('Duplicate course hash: ' + cHash);

    const row = normalizeRow(parts, COURSE_FIELDS, prevRow, COURSE_NO_INHERIT);
    row[0] = cHash;
    prevRow = row;

    const [, termId, rawId, name, location, teacher, weeks, weekday, sections] = row;
    if (!termId) throw new Error('Course row missing term_id for hash: ' + cHash);

    coursesByHash[cHash] = {
      hash: cHash,
      termId,
      rawId: rawId || '',
      name: name || '',
      location: location || '',
      teacher: teacher || '',
      weeks: parseNumberList(weeks),
      weekday: toInt(weekday),
      sections: parseNumberList(sections)
    };

    if (!courseHashesByTerm[termId]) courseHashesByTerm[termId] = [];
    courseHashesByTerm[termId].push(cHash);
  }

  return { coursesByHash, courseHashesByTerm };
}

export function parseCourseDataResponse(data) {
  if (typeof data !== 'string' || !data.trim()) {
    throw new Error('Invalid course data payload');
  }

  const { terms: rawTermRows, courses: rawCourseRows } = splitBlocks(data);
  const terms = buildTerms(rawTermRows);
  const { coursesByHash, courseHashesByTerm } = buildCourses(rawCourseRows);

  if (!Object.keys(terms).length) throw new Error('Course data missing terms');
  if (!Object.keys(coursesByHash).length) throw new Error('Course data missing courses');

  return { terms, coursesByHash, courseHashesByTerm };
}
