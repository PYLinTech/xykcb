import { translatePage, getI18n } from '/assets/init/languages.js';
import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';
import { Dialog } from '/assets/common/dialog.js';
import { CalendarPicker } from '/assets/common/calendar_picker.js';
import { loadCourse, getCurrentSemesterAndWeek, getAvailableSemesters, getSemesterConfig, getWeekDates, getCourses, getCoursesByWeek, getCoursesByDate, formatWeeks, getBaseCourseByHash } from '/assets/common/course_parser.js';
import { refreshCourseData, getSavedUser, loadLogin } from '/assets/subpages/login/login.js';
import { toast } from '/assets/common/toast.js';
import { mask } from '/assets/common/mask.js';

const POPUP_LAYER_ID = 'xykcb-popup-layer';

function ensurePopupLayer() {
    let layer = document.getElementById(POPUP_LAYER_ID);
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = POPUP_LAYER_ID;
    layer.className = 'xykcb-layer xykcb-popup-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:7000;overflow:visible;background:transparent;pointer-events:none;';
    document.body.appendChild(layer);
    return layer;
}
import { getCustomCourseItems, getCustomCourseItem, upsertCustomCourseItem, deleteCustomCourseItem, createCustomCourseId } from '/assets/common/custom_course_store.js';

const DEFAULT_TOTAL_WEEKS = 20;
const DEFAULT_SECTION_COUNT = 20;
const CUSTOM_REFRESH_DELAY = 50;
const DIALOG_CLOSE_DELAY = 200;
const SWIPE_THRESHOLD = 40;
const DELETE_REVEAL_RATIO = 0.2;
const WEEKDAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_KEYS_WITH_SUN = ['Sun', ...WEEKDAY_KEYS];
const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => HTML_ESCAPE_MAP[ch]);
}

function formatNumberRanges(values, separator = ',') {
  if (!values?.length) return '';
  const sorted = [...values].sort((a, b) => a - b);
  const parts = [];
  let start = sorted[0];
  let prev = start;
  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current !== prev + 1) {
      parts.push(start === prev ? String(start) : `${start}-${prev}`);
      start = current;
    }
    prev = current;
  }
  return parts.join(separator);
}

function formatSections(sections) {
  return formatNumberRanges(sections);
}

function addCourseToMap(map, key, course) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(course);
}

function getCourseSectionKeys(course, useLargeSection, sectionToLargeIndex) {
  const sections = course.sections || [];
  if (!useLargeSection) return sections;

  const keys = [];
  const handled = new Set();
  for (const section of sections) {
    const largeIdx = sectionToLargeIndex.get(section);
    if (largeIdx !== undefined && !handled.has(largeIdx)) {
      handled.add(largeIdx);
      keys.push(largeIdx);
    }
  }
  return keys;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTodayWeekday() {
  return new Date().getDay() || 7;
}

function getWeekdayLabel(weekday) {
  return getI18n('schedule', `weekday${WEEKDAY_KEYS[weekday - 1]}`);
}

function isChineseScheduleLocale() {
  return /[\u4e00-\u9fff]/.test(getI18n('schedule', 'weekdayMon'));
}

function activeAttr(active) {
  return active ? ' data-active="true"' : '';
}

function parseIntegerList(value) {
  return String(value || '').split(',').map(v => parseInt(v, 10)).filter(v => !Number.isNaN(v));
}

function renderScheduleOption(label, dataAttrs, active) {
  const attrs = Object.entries(dataAttrs).map(([key, value]) => ` data-${key}="${escapeHtml(value)}"`).join('');
  return `<span class="schedule-form-option"${attrs}${activeAttr(active)}>${escapeHtml(label)}</span>`;
}

function createDayNavButton(iconClass, dayDelta, container) {
  const btn = document.createElement('div');
  btn.innerHTML = `<i class="${iconClass}" style="font-size: 22px;"></i>`;
  btn.classList.add('tap-active');
  btn.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; cursor: pointer; color: var(--weui-FG-0); border-radius: 50%;';
  btn.addEventListener('click', () => {
    const date = parseLocalDate(currentDay);
    date.setDate(date.getDate() + dayDelta);
    currentDay = formatLocalDate(date);
    renderDayViewCourses(container);
  });
  return btn;
}

function buildLargeSectionInfo(mergeableSections, timeSlots) {
  const sorted = [...mergeableSections].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const largeSectionMap = new Map();
  const sectionToLargeIndex = new Map();
  let largeIndex = 0;
  for (const item of sorted) {
    const [startSection, endSection] = item.split('-').map(n => parseInt(n, 10));
    if (Number.isNaN(startSection) || Number.isNaN(endSection) || endSection < startSection) continue;
    const sections = [];
    for (let section = startSection; section <= endSection; section++) {
      sections.push(section);
      sectionToLargeIndex.set(section, largeIndex);
    }
    largeSectionMap.set(largeIndex, {
      name: item,
      sections,
      startTime: timeSlots[startSection - 1]?.start || '',
      endTime: timeSlots[endSection - 1]?.end || ''
    });
    largeIndex++;
  }
  return { largeSectionMap, sectionToLargeIndex };
}

const viewConfig = {
    dayView: { value: 'dayView', labelKey: 'dayView' },
    weekView: { value: 'weekView', labelKey: 'weekView' },
    semesterView: { value: 'semesterView', labelKey: 'semesterView' }
};

const getScheduleView = () => localStorage.getItem('schedule_view') || 'weekView';
const saveScheduleView = (view) => localStorage.setItem('schedule_view', view);

let scheduleView = getScheduleView();
let currentSemesterId = null;
let currentWeek = 0;
let currentDay = null;
let dailySectionCount = 0;
let timeSlots = [];
let currentSemesterAndWeek = null;
let courseDataLoaded = false;
let isRefreshing = false;

let weekOptionsCache = null;
let weekOptionsCacheKey = null;
let scheduleClickHandler = null;
let loginSuccessHandler = null;

let scheduleActionState = null;
let swipedCardWrapEl = null;
let pageContainer = null;

const getSetting = key => localStorage.getItem(`setting_${key}`) ?? 'true';
const showWeekend = () => getSetting('showWeekend') === 'true';
const showTeacher = () => getSetting('showTeacher') === 'true';
const showBorder = () => getSetting('showBorder') === 'true';
const showLargeSection = () => getSetting('showLargeSection') === 'true';
const watermarkEnabled = () => (localStorage.getItem('setting_watermarkEnabled') ?? 'true') === 'true';
const watermarkText = () => localStorage.getItem('setting_watermark') ?? '';
const startupUpdateEnabled = () => getSetting('autoUpdate') === 'true';

const getCourseColorIndex = (course) => {
    const name = course.name || '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % 10;
};

function renderWatermark(container) {
    const wrapperEl = container.querySelector('#js_schedule_wrapper');
    if (!wrapperEl) return;
    wrapperEl.querySelector('.schedule-watermark')?.remove();
    const text = watermarkText();
    if (!text || !watermarkEnabled()) return;
    const watermark = document.createElement('div');
    watermark.className = 'schedule-watermark';
    const inner = document.createElement('div');
    inner.className = 'schedule-watermark-inner';
    const cols = Math.ceil(wrapperEl.offsetWidth / 160) + 2;
    const rows = Math.ceil(wrapperEl.offsetHeight / 100) + 2;
    const count = cols * rows;
    for (let i = 0; i < count; i++) {
        const span = document.createElement('span');
        span.className = 'schedule-watermark-text';
        span.textContent = text;
        inner.appendChild(span);
    }
    watermark.appendChild(inner);
    wrapperEl.appendChild(watermark);
}

function updateContentView(container) {
    container.querySelector('#js_content_view_label').textContent = getI18n('schedule', viewConfig[scheduleView].labelKey);
}

function updateCurrentSemester(container) {
    if (currentSemesterId) {
        const semesterLabel = container.querySelector('#js_current_semester span[data-i18n="currentSemester"]');
        if (semesterLabel) {
            semesterLabel.textContent = currentSemesterId;
        }
    }
}

function updateCurrentWeek(container) {
    const weekLabel = container.querySelector('#js_current_week_label');
    if (weekLabel) {
        if (currentWeek == 0) {
            weekLabel.textContent = getI18n('schedule', 'allWeek');
        } else {
            weekLabel.textContent = getI18n('schedule', 'weekN').replace('{n}', currentWeek);
        }
    }
    const weekBtn = container.querySelector('#js_current_week');
    if (weekBtn) {
        weekBtn.style.visibility = scheduleView === 'weekView' ? 'visible' : 'hidden';
    }
}

function renderSchedule(container) {
    const contentContainer = container.querySelector('#js_schedule_content');
    if (!contentContainer) return;

    const semesterConfig = getSemesterConfig(currentSemesterId);
    dailySectionCount = semesterConfig?.dailySectionCount || 0;
    timeSlots = semesterConfig?.timeSlots || [];

    switch (scheduleView) {
        case 'dayView':
            renderDayView(contentContainer);
            break;
        case 'weekView':
            renderWeekView(contentContainer);
            break;
        case 'semesterView':
            renderSemesterView(contentContainer);
            break;
    }
}

function renderScheduleActionFab(container) {
    container.querySelector('#js_schedule_action_fab')?.remove();
    if (!courseDataLoaded || !currentSemesterId) return;
    const fab = document.createElement('button');
    fab.id = 'js_schedule_action_fab';
    fab.className = 'schedule-action-fab';
    fab.innerHTML = '<i class="ri-pencil-line"></i>';
    fab.type = 'button';
    fab.setAttribute('aria-label', getI18n('schedule', 'customCourse'));
    container.appendChild(fab);
}

function renderDayView(container) {
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';
    container.style.minHeight = '0';
    container.style.overflow = 'hidden';

    if (!currentDay) {
        currentDay = formatLocalDate(new Date());
    }

    const toolbar = document.createElement('div');
    toolbar.id = 'js_dayview_toolbar';
    toolbar.style.cssText = 'display: flex; align-items: center; justify-content: space-between; height: 46px; flex-shrink: 0; padding: 0 8px;';

    const leftBtn = createDayNavButton('ri-arrow-left-s-line', -1, container);

    const dateText = document.createElement('div');
    dateText.id = 'js_dayview_date';
    dateText.classList.add('tap-active');
    dateText.style.cssText = 'display: flex; align-items: center; justify-content: center; font-size: 16px; color: var(--weui-FG-0); cursor: pointer; padding: 4px 10px; border-radius: 8px;';
    dateText.addEventListener('click', () => {
        CalendarPicker.show({
            initialDate: currentDay,
            onChange: (date) => {
                currentDay = date;
                renderDayViewCourses(container);
            }
        });
    });

    const rightBtn = createDayNavButton('ri-arrow-right-s-line', 1, container);

    toolbar.appendChild(leftBtn);
    toolbar.appendChild(dateText);
    toolbar.appendChild(rightBtn);
    container.appendChild(toolbar);

    const courseList = document.createElement('div');
    courseList.id = 'js_dayview_courses';
    courseList.style.cssText = 'flex: 1; min-height: 0; overflow-y: auto; padding: 8px;';
    container.appendChild(courseList);

    renderDayViewCourses(container);
}

function renderDayViewCourses(container) {
    const courseList = container.querySelector('#js_dayview_courses');
    const dateText = container.querySelector('#js_dayview_date');

    const semesterConfig = getSemesterConfig(currentSemesterId);
    const mergeableSections = semesterConfig?.mergeableSections || [];
    const useLargeSection = showLargeSection() && mergeableSections.length > 0;
    const largeInfo = useLargeSection ? buildLargeSectionInfo(mergeableSections, timeSlots) : null;
    const largeSectionMap = largeInfo?.largeSectionMap;
    const sectionToLargeIndex = largeInfo?.sectionToLargeIndex;

    const today = new Date();
    const displayDate = parseLocalDate(currentDay);
    const isToday = today.getFullYear() === displayDate.getFullYear() &&
                    today.getMonth() === displayDate.getMonth() &&
                    today.getDate() === displayDate.getDate();
    const weekDay = getI18n('schedule', `weekday${WEEKDAY_KEYS_WITH_SUN[displayDate.getDay()]}`);
    const month = String(displayDate.getMonth() + 1).padStart(2, '0');
    const day = String(displayDate.getDate()).padStart(2, '0');
    const todayAbbr = getI18n('schedule', 'todayAbbr');
    dateText.innerHTML = isToday
        ? `<span style="background: var(--weui-BRAND); color: #fff; border-radius: 10px; padding: 2px 6px; margin-right: 6px; font-size: 10px;">${todayAbbr}</span>${displayDate.getFullYear()}-${month}-${day} ${weekDay}`
        : `${displayDate.getFullYear()}-${month}-${day} ${weekDay}`;

    courseList.innerHTML = '';

    const coursesResult = getCoursesByDate(currentSemesterId, currentDay);

    if (coursesResult === null) {
        renderEmptyState(courseList, 'ri-calendar-line', getI18n('schedule', 'noCourse'));
        const savedUser = getSavedUser();
        if (!savedUser || savedUser.isLoggedIn === false) {
            toast.warn(getI18n('login', 'errorNotLoggedIn'));
            loadLogin();
        }
        return;
    } else if (coursesResult === 'out') {
        renderEmptyState(courseList, 'ri-calendar-line', getI18n('schedule', 'outOfSemester'));
    } else if (coursesResult === 'none' || !coursesResult?.length) {
        renderEmptyState(courseList, 'ri-calendar-line', getI18n('schedule', 'noCourse'));
    } else if (Array.isArray(coursesResult)) {
        const sectionCoursesMap = new Map();

        for (const course of coursesResult) {
            for (const sectionKey of getCourseSectionKeys(course, useLargeSection, sectionToLargeIndex)) {
                addCourseToMap(sectionCoursesMap, sectionKey, course);
            }
        }

        const sortedSections = Array.from(sectionCoursesMap.keys()).sort((a, b) => a - b);

        const fragment = document.createDocumentFragment();
        for (const sectionIdx of sortedSections) {
            const sectionCourses = sectionCoursesMap.get(sectionIdx);
            for (const course of sectionCourses) {
                let sectionDisplay, timeDisplay;
                if (useLargeSection) {
                    const ls = largeSectionMap.get(sectionIdx);
                    sectionDisplay = ls?.name || '';
                    timeDisplay = ls ? `${ls.startTime}-${ls.endTime}` : '';
                } else {
                    const slot = timeSlots[sectionIdx - 1];
                    sectionDisplay = sectionIdx;
                    timeDisplay = slot ? `${slot.start}-${slot.end}` : '';
                }
                const card = document.createElement('div');
                card.style.cssText = 'display: flex; min-height: 100px; margin-bottom: 10px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.25);';
                card.classList.add(`course-bg-${getCourseColorIndex(course)}`);

                const leftSection = document.createElement('div');
                leftSection.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; width: 80px; flex-shrink: 0; border-right: 1px solid var(--weui-FG-3); padding: 8px;';
                leftSection.innerHTML = `<div style="font-size: 24px; color: var(--weui-FG-0); font-weight: 600; line-height: 1.2;">${sectionDisplay}</div><div style="font-size: 10px; color: var(--weui-FG-1); margin-top: 2px;">${timeDisplay}</div>`;

                const rightInfo = document.createElement('div');
                rightInfo.style.cssText = 'flex: 1; padding: 12px 14px; display: flex; flex-direction: column; justify-content: center; overflow: hidden;';

                const nameStyle = 'font-size: 16px; color: var(--weui-FG-0); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4;';
                const metaStyle = 'font-size: 12px; color: var(--weui-FG-1); margin-top: 6px; display: flex; flex-wrap: wrap; gap: 8px;';

                let metaHtml = '';
                if (course.location) {
                    metaHtml += `<span style="display: inline-flex; align-items: center; margin-right: 12px; color: var(--weui-FG-1);"><i class="ri-map-pin-fill" style="margin-right: 2px; font-size: 12px; color: var(--weui-FG-1);"></i>${escapeHtml(course.location)}</span>`;
                }
                if (course.teacher) {
                    metaHtml += `<span style="display: inline-flex; align-items: center; color: var(--weui-FG-1);"><i class="ri-user-fill" style="margin-right: 2px; font-size: 12px; color: var(--weui-FG-1);"></i>${escapeHtml(course.teacher)}</span>`;
                }

                rightInfo.innerHTML = `<div style="${nameStyle}">${escapeHtml(course.name)}</div><div style="${metaStyle}">${metaHtml}</div>`;

                card.appendChild(leftSection);
                card.appendChild(rightInfo);
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => showCourseDetailDialog([course]));
                fragment.appendChild(card);
            }
        }
        courseList.appendChild(fragment);
    }
}

function formatCourseTimeText(course) {
    const sections = [...(course.sections || [])].sort((a, b) => a - b);
    if (!course.weekday) {
        return sections.length ? `${formatSections(sections)}${getI18n('schedule', 'sectionSuffix')}` : '-';
    }
    const weekday = getWeekdayLabel(course.weekday);
    if (sections.length === 0) return weekday;
    return `${weekday} ${formatSections(sections)} ${getI18n('schedule', 'sectionSuffix')}`;
}

function generateCourseDetailContent(courses) {
    const lineStyle = 'display: flex; align-items: flex-start; line-height: 1.6; font-size: 16px; margin-top: 4px;';
    const iconStyle = 'color: var(--weui-FG-1); margin-right: 8px; flex-shrink: 0; font-size: 16px;';
    const spanStyle = 'text-align: left; width: 0; flex: 1; color: var(--weui-FG-1);';
    return courses.map((course, index) => {
        const separator = index > 0 ? '<div style="border-top: 1px solid var(--weui-FG-3); margin: 22px 0 18px;"></div>' : '';
        return `${separator}
            <div style="font-size: 20px; text-align: center; margin-bottom: 12px;">${escapeHtml(course.name)}</div>
            <div style="${lineStyle}">
                <i class="ri-map-pin-fill" style="${iconStyle}"></i>
                <span style="${spanStyle}">${getI18n('schedule', 'location')}${escapeHtml(course.location) || '-'}</span>
            </div>
            <div style="${lineStyle}">
                <i class="ri-time-fill" style="${iconStyle}"></i>
                <span style="${spanStyle}">${getI18n('schedule', 'time')}${formatCourseTimeText(course)}</span>
            </div>
            <div style="${lineStyle}">
                <i class="ri-user-fill" style="${iconStyle}"></i>
                <span style="${spanStyle}">${getI18n('schedule', 'teacher')}${escapeHtml(course.teacher) || '-'}</span>
            </div>
            <div style="${lineStyle}">
                <i class="ri-calendar-check-fill" style="${iconStyle}"></i>
                <span style="${spanStyle}">${getI18n('schedule', 'week')}${formatWeeks(course.weeks) || '-'}</span>
            </div>
            <div style="text-align: right; margin-top: 8px;">
                <a href="javascript:;" class="schedule-detail-edit" data-course-hash="${escapeHtml(course.hash)}" style="font-size: 14px; color: var(--weui-BRAND); text-decoration: none;">${getI18n('schedule', 'editCourse')}</a>
            </div>`;
    }).join('');
}

function showCourseDetailDialog(courses) {
    const content = generateCourseDetailContent(courses);
    Dialog.show({
        style: '2',
        content: content,
        buttons: [{ text: getI18n('schedule', 'close') }],
        allowMaskClose: true
    });

    const wrap = document.getElementById('weuiDialogWrap');
    wrap?.addEventListener('click', e => {
        const editBtn = e.target.closest('.schedule-detail-edit');
        if (!editBtn) return;
        const hash = editBtn.dataset.courseHash;
        const course = courses.find(c => c.hash === hash);
        if (!course) return;
        document.getElementById('weuiDialogWrap')?.remove();
        openScheduleActionPanel({
            mode: 'edit',
            tab: 'add',
            sourceCourse: course,
            sourceCourseHash: course.hash,
            termId: course.termId || currentSemesterId
        });
    });
}

function getSemesterCourseGroupKey(course) {
    return course.rawId ? `raw:${course.rawId}` : `hash:${course.hash}`;
}

function pushUnique(list, value) {
    if (value && !list.includes(value)) list.push(value);
}

function getFirstWeek(course) {
    const weeks = Array.isArray(course.weeks) ? course.weeks : [];
    return weeks.length ? Math.min(...weeks) : Number.MAX_SAFE_INTEGER;
}

function syncCurrentSemesterAndWeek() {
    const semesterAndWeek = getCurrentSemesterAndWeek();
    if (!semesterAndWeek) return false;
    currentSemesterId = semesterAndWeek.semesterId;
    currentWeek = semesterAndWeek.week;
    currentSemesterAndWeek = semesterAndWeek.week !== 0 ? semesterAndWeek : null;
    return true;
}

function refreshScheduleView(container) {
    updateCurrentSemester(container);
    updateContentView(container);
    updateCurrentWeek(container);
    renderSchedule(container);
    renderScheduleActionFab(container);
    renderWatermark(container);
}

function refreshPageSchedule(delay = CUSTOM_REFRESH_DELAY) {
    if (!pageContainer) return;
    if (delay > 0) setTimeout(() => refreshScheduleView(pageContainer), delay);
    else refreshScheduleView(pageContainer);
}

function renderEmptyState(container, iconClass, text) {
    container.innerHTML = `
    <div style="text-align: center; color: var(--weui-FG-1); margin-top: 40px;">
      <i class="${iconClass}" style="font-size: 48px; margin-bottom: 12px;"></i>
      <div style="margin-top: 8px;">${escapeHtml(text)}</div>
    </div>
  `;
}

function renderWeekView(container) {
    container.innerHTML = '';

    if (!courseDataLoaded) {
        const savedUser = getSavedUser();
        const isLoggedIn = savedUser && savedUser.isLoggedIn !== false;
        const btnText = isLoggedIn ? getI18n('schedule', 'relogin') : getI18n('schedule', 'goLogin');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.innerHTML = `
            <div style="text-align: center; color: var(--weui-FG-1); margin-top: 40px;">
                <i class="ri-error-warning-line" style="font-size: 48px; margin-bottom: 12px;"></i>
                <div style="margin-top: 8px;">${getI18n('schedule', 'loadCourseError')}</div>
            </div>
            <div style="flex: 1; min-height: 30px;"></div>
            <a id="js_weekview_login_btn" class="weui-btn weui-btn_primary" style="margin-bottom: 100px;">${btnText}</a>
        `;
        container.querySelector('#js_weekview_login_btn').addEventListener('click', () => loadLogin());
        return;
    }

    const semesterConfig = getSemesterConfig(currentSemesterId);
    const mergeableSections = semesterConfig?.mergeableSections || [];
    const useLargeSection = showLargeSection() && mergeableSections.length > 0;
    const largeInfo = useLargeSection ? buildLargeSectionInfo(mergeableSections, timeSlots) : null;
    const largeSectionMap = largeInfo?.largeSectionMap;
    const sectionToLargeIndex = largeInfo?.sectionToLargeIndex;
    const rowCount = useLargeSection ? largeSectionMap.size : dailySectionCount;

    container.style.display = 'grid';
    container.style.height = '100%';
    container.style.minHeight = '0';
    container.style.overflow = 'auto';
    container.style.width = '100%';

    const displayWeekend = showWeekend();
    const columnCount = displayWeekend ? 8 : 6;
    container.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
    container.style.gridTemplateRows = `46px repeat(${rowCount}, minmax(80px, 1fr))`;

    const displayBorder = showBorder();
    const displayTeacher = showTeacher();

    const weekDates = currentWeek > 0 ? getWeekDates(currentSemesterId, currentWeek) : null;

    const todayStr = formatLocalDate(new Date());

    const courses = currentWeek > 0 ? getCoursesByWeek(currentSemesterId, currentWeek) : getCourses(currentSemesterId);

    const cells = [];
    const fragment = document.createDocumentFragment();

    const totalCells = columnCount * (rowCount + 1);
    for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        if (displayBorder) {
            cell.style.border = '0.5px solid var(--weui-FG-3)';
        }
        cell.style.color = 'var(--weui-FG-0)';
        cell.style.overflow = 'hidden';
        cell.style.minWidth = '0';
        cell.style.minHeight = '0';

        const col = i % columnCount;
        const row = Math.floor(i / columnCount);
        if (row === 0) {
            if (col === 0) {
                cell.textContent = getI18n('schedule', 'section');
            } else {
                const weekday = WEEKDAY_KEYS[col - 1];
                const dateStr = weekDates?.[col];
                if (dateStr) {
                    const [, month, day] = dateStr.split('-');
                    cell.innerHTML = `<div>${getI18n('schedule', `weekday${weekday}`)}</div><div style="font-size: 12px; color: var(--weui-FG-1);">${parseInt(month)}.${parseInt(day)}</div>`;
                    cell.style.display = 'flex';
                    cell.style.flexDirection = 'column';
                    cell.style.alignItems = 'center';
                    if (dateStr === todayStr) {
                        cell.style.backgroundColor = 'var(--weui-BRAND)';
                        for (const child of cell.children) {
                            child.style.color = '#fff';
                        }
                    }
                } else {
                    cell.textContent = getI18n('schedule', `weekday${weekday}`);
                }
            }
            cell.style.fontSize = '14px';
        } else if (col === 0 && row > 0 && row <= rowCount) {
            if (useLargeSection) {
                const ls = largeSectionMap.get(row - 1);
                if (ls) {
                    cell.innerHTML = `<div style="font-size: 16px;">${ls.name}</div><div style="font-size: 10px; color: var(--weui-FG-1);">${ls.startTime}-${ls.endTime}</div>`;
                }
            } else {
                const slot = timeSlots[row - 1];
                if (slot?.section && slot?.start && slot?.end) {
                    cell.innerHTML = `<div style="font-size: 16px;">${slot.section}</div><div style="font-size: 10px; color: var(--weui-FG-1);">${slot.start}-<wbr>${slot.end}</div>`;
                } else {
                    cell.textContent = row;
                }
            }
            cell.style.display = 'flex';
            cell.style.flexDirection = 'column';
            cell.style.alignItems = 'center';
            cell.style.justifyContent = 'center';
            cell.style.textAlign = 'center';
            cell.style.padding = '4px';
        }

        cells.push(cell);
        fragment.appendChild(cell);
    }

    container.appendChild(fragment);

    const cellCoursesMap = new Map();

    for (const course of courses) {
        const dayNum = course.weekday;
        if (!dayNum || (!displayWeekend && dayNum >= 6)) continue;
        const col = dayNum;
        for (const sectionKey of getCourseSectionKeys(course, useLargeSection, sectionToLargeIndex)) {
            const cellIndex = (useLargeSection ? sectionKey + 1 : sectionKey) * columnCount + col;
            if (cellIndex >= 0 && cellIndex < cells.length) {
                addCourseToMap(cellCoursesMap, cellIndex, course);
            }
        }
    }

    for (const [cellIndex, cellCourses] of cellCoursesMap) {
        const cell = cells[cellIndex];
        cellCourses.sort((a, b) => getFirstWeek(a) - getFirstWeek(b));
        const course = cellCourses[0];
        const multipleIndicator = cellCourses.length > 1
            ? `<div style="position: absolute; top: 0; right: 0; width: 0; height: 0; border-style: solid; border-width: 0 12px 12px 0; border-color: transparent #ff4d4f transparent transparent;"></div>`
            : '';
        const teacherHtml = displayTeacher ? `<div style="font-size: 10px; color: var(--weui-FG-1); margin-top: 6px; line-height: 1; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(course.teacher)}</div>` : '';
        cell.innerHTML = `<div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4px;">${multipleIndicator}<div style="font-size: 12px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(course.name)}</div><div style="font-size: 10px; color: var(--weui-FG-1); margin-top: 8px; line-height: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(course.location)}</div>${teacherHtml}</div>`;
        cell.classList.add(`course-bg-${getCourseColorIndex(course)}`);
        cell.style.position = 'relative';
        cell.style.overflow = 'hidden';
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => showCourseDetailDialog(cellCourses));
    }
}

function renderSemesterView(container) {
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';
    container.style.minHeight = '0';
    container.style.overflow = 'hidden';

    const courseList = document.createElement('div');
    courseList.id = 'js_semesterview_courses';
    courseList.style.cssText = 'flex: 1; min-height: 0; overflow-y: auto; padding: 12px;';
    container.appendChild(courseList);

    const courses = getCourses(currentSemesterId);

    if (!courses || courses.length === 0) {
        renderEmptyState(courseList, 'ri-book-2-line', getI18n('schedule', 'noCourseInSemester'));
        const savedUser = getSavedUser();
        if (!savedUser || savedUser.isLoggedIn === false) {
            toast.warn(getI18n('login', 'errorNotLoggedIn'));
            loadLogin();
        }
        return;
    }

    const courseGroupMap = new Map();
    for (const course of courses) {
        const groupKey = getSemesterCourseGroupKey(course);
        if (!courseGroupMap.has(groupKey)) {
            courseGroupMap.set(groupKey, {
                groupKey,
                rawId: course.rawId,
                name: course.name,
                teacher: course.teacher,
                subCourses: []
            });
        }
        courseGroupMap.get(groupKey).subCourses.push(course);
    }

    const fragment = document.createDocumentFragment();
    for (const group of courseGroupMap.values()) {
        const subCourses = group.subCourses;
        const firstCourse = subCourses[0];

        const locations = [];
        const times = [];
        const weeks = [];

        for (const c of subCourses) {
            pushUnique(locations, escapeHtml(c.location || '-'));
            pushUnique(times, formatCourseTimeText(c));
            pushUnique(weeks, formatWeeks(c.weeks) || '-');
        }

        const locationStr = locations.join(' | ');
        const timeStr = times.join(' | ');
        const weeksStr = weeks.join(' | ');

        const card = document.createElement('div');
        card.style.cssText = 'display: flex; min-height: 120px; margin-bottom: 12px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.25);';
        card.classList.add(`course-bg-${getCourseColorIndex(firstCourse)}`);

        const leftName = document.createElement('div');
        leftName.style.cssText = 'width: 100px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 12px; border-right: 1px solid var(--weui-FG-3);';
        leftName.innerHTML = `<div style="font-size: 15px; color: var(--weui-FG-0); line-height: 1.4; text-align: center; word-break: break-all;">${escapeHtml(firstCourse.name)}</div>`;

        const rightInfo = document.createElement('div');
        rightInfo.style.cssText = 'flex: 1; padding: 12px 14px; display: flex; flex-direction: column; justify-content: center; overflow: hidden;';

        let metaHtml = '';
        if (locationStr) {
            metaHtml += `<div style="display: flex; align-items: flex-start;"><i class="ri-map-pin-fill" style="margin-right: 6px; font-size: 12px; color: var(--weui-FG-1); flex-shrink: 0;"></i><span style="font-size: 12px; color: var(--weui-FG-1);">${getI18n('schedule', 'location')}${locationStr}</span></div>`;
        }
        if (showTeacher()) {
            const teacherVal = firstCourse.teacher ? escapeHtml(firstCourse.teacher) : '-';
            metaHtml += `<div style="display: flex; align-items: flex-start;"><i class="ri-user-fill" style="margin-right: 6px; font-size: 12px; color: var(--weui-FG-1); flex-shrink: 0;"></i><span style="font-size: 12px; color: var(--weui-FG-1);">${getI18n('schedule', 'teacher')}${teacherVal}</span></div>`;
        }
        if (timeStr) {
            metaHtml += `<div style="display: flex; align-items: flex-start;"><i class="ri-time-fill" style="margin-right: 6px; font-size: 12px; color: var(--weui-FG-1); flex-shrink: 0;"></i><span style="font-size: 12px; color: var(--weui-FG-1); word-break: keep-all;">${getI18n('schedule', 'time')}${timeStr}</span></div>`;
        }
        if (weeksStr) {
            metaHtml += `<div style="display: flex; align-items: flex-start;"><i class="ri-calendar-check-fill" style="margin-right: 6px; font-size: 12px; color: var(--weui-FG-1); flex-shrink: 0;"></i><span style="font-size: 12px; color: var(--weui-FG-1); word-break: keep-all;">${getI18n('schedule', 'week')}${weeksStr}</span></div>`;
        }

        rightInfo.innerHTML = metaHtml;

        card.appendChild(leftName);
        card.appendChild(rightInfo);
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => showCourseDetailDialog(subCourses));
        fragment.appendChild(card);
    }
    courseList.appendChild(fragment);
}

// ---- Custom Course Dialog ----

function getWeekdayShortLabels() {
    return isChineseScheduleLocale()
        ? ['一', '二', '三', '四', '五', '六', '日']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}

function buildCustomSectionOptions(termId) {
    const config = getSemesterConfig(termId);
    const timeSlots = config?.timeSlots || [];
    const mergeableSections = config?.mergeableSections || [];

    if (showLargeSection() && mergeableSections.length > 0) {
        const largeInfo = buildLargeSectionInfo(mergeableSections, timeSlots);
        return Array.from(largeInfo.largeSectionMap.values())
            .map(ls => ({ label: ls.name, sections: [...ls.sections] }))
            .sort((a, b) => a.sections[0] - b.sections[0]);
    }

    const sectionCount = config?.dailySectionCount || timeSlots.length || DEFAULT_SECTION_COUNT;
    return Array.from({ length: sectionCount }, (_, i) => {
        const sectionNo = timeSlots[i]?.section || (i + 1);
        return {
            label: String(sectionNo),
            sections: [sectionNo]
        };
    });
}

function getTotalWeeks(termId) {
    const config = getSemesterConfig(termId);
    if (config?.totalWeeks) return config.totalWeeks;
    for (let week = DEFAULT_TOTAL_WEEKS; week >= 1; week--) {
        const dates = getWeekDates(termId, week);
        if (dates && Object.values(dates).some(Boolean)) {
            return week;
        }
    }
    return DEFAULT_TOTAL_WEEKS;
}

function updateScheduleActionModeText(mode) {
    const isEdit = mode === 'edit';
    const titleEl = document.querySelector('.schedule-dialog-tab[data-tab="add"] .js_tab_text');
    if (titleEl) titleEl.textContent = getI18n('schedule', isEdit ? 'editCourseTitle' : 'addCourse');
    const submitBtn = document.querySelector('#js_add_course_btn');
    if (submitBtn) submitBtn.textContent = getI18n('schedule', isEdit ? 'saveCourse' : 'add');
}

function resetSwipedCard() {
    if (!swipedCardWrapEl) return;
    const card = swipedCardWrapEl.querySelector('.schedule-manage-card');
    if (card) {
        card.style.transform = '';
        card.style.transition = '';
        card.classList.remove('schedule-manage-card--swiped');
    }
    swipedCardWrapEl.classList.remove('is-delete-open');
    swipedCardWrapEl = null;
}

function openDeleteConfirm(cardWrap) {
    if (!cardWrap) return;
    if (swipedCardWrapEl && swipedCardWrapEl !== cardWrap) {
        resetSwipedCard();
    }
    const card = cardWrap.querySelector('.schedule-manage-card');
    if (card) {
        card.style.transform = '';
        card.style.transition = '';
        card.classList.add('schedule-manage-card--swiped');
    }
    cardWrap.classList.add('is-delete-open');
    swipedCardWrapEl = cardWrap;
}

function getScheduleActionInitialForm(existingItem, sourceCourse, termId) {
    const source = existingItem || sourceCourse;
    if (!source) return getDefaultScheduleActionForm(termId);
    return {
        name: source.name || '',
        location: source.location || '',
        teacher: source.teacher || '',
        weekday: source.weekday != null ? source.weekday : 1,
        sections: [...(source.sections || [])],
        weeks: [...(source.weeks || [])]
    };
}

function openScheduleActionPanel(options = {}) {
    closeScheduleActionPanel();
    resetSwipedCard();

    const mode = options.mode || 'add';
    const sourceCourse = options.sourceCourse || null;
    let sourceCourseHash = options.sourceCourseHash || '';
    const termId = options.termId || currentSemesterId;
    let editingId = options.editingId || '';

    // 从课程详情编辑 add 课程时，用 editingId 而非 sourceCourseHash
    if (sourceCourse && sourceCourse.customType === 'add' && !editingId) {
        editingId = sourceCourse.hash || sourceCourseHash;
        sourceCourseHash = '';
    }
    const existingItem = options.existingItem || null;

    const sectionOptions = buildCustomSectionOptions(termId);
    const totalWeeks = getTotalWeeks(termId);
    const form = getScheduleActionInitialForm(existingItem, sourceCourse, termId);
    const sectionSet = new Set(form.sections);
    const weekSet = new Set(form.weeks);

    scheduleActionState = {
        mode,
        tab: options.tab || 'add',
        editingId,
        sourceCourseHash,
        termId,
        form
    };

    const weekdayLabels = getWeekdayShortLabels();

    const sectionHtml = sectionOptions.map(opt => {
        const sectionsStr = opt.sections.join(',');
        return renderScheduleOption(opt.label, { sections: sectionsStr }, opt.sections.every(s => sectionSet.has(s)));
    }).join('');

    const weekHtml = Array.from({ length: totalWeeks }, (_, i) => {
        const val = i + 1;
        return renderScheduleOption(val, { value: val }, weekSet.has(val));
    }).join('');

    const titleKey = mode === 'edit' ? 'editCourseTitle' : 'addCourse';
    const submitKey = mode === 'edit' ? 'saveCourse' : 'add';

    const wrap = document.createElement('div');
    wrap.id = 'js_schedule_dialog_wrap';
    wrap.className = 'schedule-dialog-wrap';
    wrap.innerHTML = `
    <div class="schedule-dialog-panel">
      <div class="schedule-dialog-hd">
        <span class="schedule-dialog-tab" data-tab="add" data-active="true">
          <span class="schedule-dialog-tab-text">
            <span class="js_tab_text">${getI18n('schedule', titleKey)}</span>
            <span class="schedule-dialog-indicator"></span>
          </span>
        </span>
        <span class="schedule-dialog-tab" data-tab="manage">
          <span class="schedule-dialog-tab-text">
            ${getI18n('schedule', 'manageCustomCourse')}
            <span class="schedule-dialog-indicator"></span>
          </span>
        </span>
        <i class="schedule-dialog-close ri-close-line"></i>
      </div>
      <div class="schedule-dialog-bd">
        <div data-tab-content="add" class="schedule-dialog-tab-add">
          <div class="weui-cells__group weui-cells__group_form">
            <div class="weui-cells">
              <label class="weui-cell weui-cell_active">
                <div class="weui-cell__hd"><span class="weui-label">${getI18n('schedule', 'courseName')}</span></div>
                <div class="weui-cell__bd weui-flex">
                  <input class="weui-input" data-course-field="name" type="text" placeholder="${getI18n('schedule', 'courseNamePlaceholder')}" value="${escapeHtml(form.name)}" />
                </div>
              </label>
              <label class="weui-cell weui-cell_active">
                <div class="weui-cell__hd"><span class="weui-label">${getI18n('schedule', 'courseLocation')}</span></div>
                <div class="weui-cell__bd weui-flex">
                  <input class="weui-input" data-course-field="location" type="text" placeholder="${getI18n('schedule', 'courseLocationPlaceholder')}" value="${escapeHtml(form.location)}" />
                </div>
              </label>
              <label class="weui-cell weui-cell_active">
                <div class="weui-cell__hd"><span class="weui-label">${getI18n('schedule', 'courseTeacher')}</span></div>
                <div class="weui-cell__bd weui-flex">
                  <input class="weui-input" data-course-field="teacher" type="text" placeholder="${getI18n('schedule', 'courseTeacherPlaceholder')}" value="${escapeHtml(form.teacher)}" />
                </div>
              </label>
              <div class="weui-cell schedule-option-cell">
                <div class="weui-cell__hd"><span class="weui-label">${getI18n('schedule', 'courseWeekday')}</span></div>
                <div class="weui-cell__bd schedule-form-options schedule-form-options--weekday">${weekdayLabels.map((name, i) => {
                    const val = i + 1;
                    return renderScheduleOption(name, { value: val }, form.weekday === val);
                }).join('')}</div>
              </div>
              <div class="weui-cell schedule-option-cell">
                <div class="weui-cell__hd"><span class="weui-label">${getI18n('schedule', 'coursePeriod')}</span></div>
                <div class="weui-cell__bd schedule-form-options schedule-form-options--section" id="js_section_options">${sectionHtml}</div>
              </div>
              <div class="weui-cell schedule-option-cell">
                <div class="weui-cell__hd"><span class="weui-label">${getI18n('schedule', 'courseWeek')}</span></div>
                <div class="weui-cell__bd schedule-form-options schedule-form-options--week" id="js_week_options">${weekHtml}</div>
              </div>
            </div>
            <div class="schedule-submit-wrap">
              <a role="button" id="js_add_course_btn" class="weui-btn weui-btn_primary" href="javascript:;" style="display: inline-block; width: auto;">${getI18n('schedule', submitKey)}</a>
            </div>
          </div>
        </div>
        <div data-tab-content="manage" class="schedule-dialog-tab-manage" id="js_manage_list"></div>
      </div>
    </div>`;

    ensurePopupLayer().appendChild(wrap);
    scheduleActionState.maskHandle = mask.show({
        onClick: () => { resetSwipedCard(); closeScheduleActionPanel(); }
    });

    requestAnimationFrame(() => {
        wrap.classList.add('schedule-dialog-wrap--visible');
    });

    initScheduleFormOptions();
    bindScheduleActionEvents();

    if (scheduleActionState.tab === 'manage') {
        switchScheduleActionTab('manage');
    }
}

function closeScheduleActionPanel() {
    const wrap = document.getElementById('js_schedule_dialog_wrap');
    if (!wrap) return;
    resetSwipedCard();
    scheduleActionState?.maskHandle?.close();
    wrap.classList.remove('schedule-dialog-wrap--visible');
    setTimeout(() => wrap.remove(), DIALOG_CLOSE_DELAY);
    scheduleActionState = null;
}

function initScheduleFormOptions() {
    document.querySelectorAll('.schedule-form-options').forEach(grid => {
        const isWeekday = grid.classList.contains('schedule-form-options--weekday');

        let pointerActive = false;
        let pointerId = null;
        let dragTargetState = true;
        let lastOpt = null;
        let suppressClickUntil = 0;

        function getOptionFromPoint(x, y) {
            const el = document.elementFromPoint(x, y);
            const opt = el?.closest?.('.schedule-form-option');
            if (!opt || opt.closest('.schedule-form-options') !== grid) return null;
            return opt;
        }

        function setOptionActive(opt, active) {
            if (!opt || opt.closest('.schedule-form-options') !== grid) return;
            if (isWeekday) {
                grid.querySelectorAll('.schedule-form-option').forEach(o => {
                    o.dataset.active = active && o === opt ? 'true' : 'false';
                });
                return;
            }
            opt.dataset.active = active ? 'true' : 'false';
        }

        function applyPointerOption(opt) {
            if (!opt) return;
            if (isWeekday) {
                setOptionActive(opt, opt.dataset.active !== 'true');
            } else {
                setOptionActive(opt, dragTargetState);
            }
        }

        grid.addEventListener('pointerdown', e => {
            if (e.button !== undefined && e.button !== 0) return;
            const opt = getOptionFromPoint(e.clientX, e.clientY);
            if (!opt) return;
            pointerActive = true;
            pointerId = e.pointerId;
            lastOpt = opt;
            suppressClickUntil = Date.now() + 500;
            if (!isWeekday) {
                dragTargetState = opt.dataset.active !== 'true';
            }
            applyPointerOption(opt);
            try { grid.setPointerCapture(e.pointerId); } catch {}
            e.preventDefault();
        });

        grid.addEventListener('pointermove', e => {
            if (!pointerActive || e.pointerId !== pointerId) return;
            const opt = getOptionFromPoint(e.clientX, e.clientY);
            if (!opt || opt === lastOpt) return;
            lastOpt = opt;
            suppressClickUntil = Date.now() + 500;
            applyPointerOption(opt);
            e.preventDefault();
        });

        function endPointer(e) {
            if (!pointerActive || e.pointerId !== pointerId) return;
            pointerActive = false;
            pointerId = null;
            lastOpt = null;
            suppressClickUntil = Date.now() + 500;
            try { grid.releasePointerCapture(e.pointerId); } catch {}
        }

        grid.addEventListener('pointerup', endPointer);
        grid.addEventListener('pointercancel', endPointer);
        grid.addEventListener('lostpointercapture', () => {
            pointerActive = false;
            pointerId = null;
            lastOpt = null;
            suppressClickUntil = Date.now() + 500;
        });

        grid.addEventListener('click', e => {
            if (Date.now() < suppressClickUntil) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            const opt = e.target.closest('.schedule-form-option');
            if (!opt || opt.closest('.schedule-form-options') !== grid) return;
            if (isWeekday) {
                setOptionActive(opt, true);
            } else {
                setOptionActive(opt, opt.dataset.active !== 'true');
            }
        });
    });
}

function readScheduleActionForm() {
    const fieldValue = field => document.querySelector(`[data-course-field="${field}"]`)?.value?.trim() || '';
    const activeOptions = selector => document.querySelectorAll(`${selector} .schedule-form-option[data-active="true"]`);

    const weekdayEl = activeOptions('.schedule-form-options--weekday')[0];
    const sectionsSet = new Set();
    activeOptions('#js_section_options').forEach(el => {
        parseIntegerList(el.dataset.sections).forEach(n => sectionsSet.add(n));
    });

    return {
        name: fieldValue('name'),
        location: fieldValue('location'),
        teacher: fieldValue('teacher'),
        weekday: parseInt(weekdayEl?.dataset.value, 10) || 0,
        sections: [...sectionsSet],
        weeks: Array.from(activeOptions('#js_week_options'), el => parseInt(el.dataset.value, 10)).filter(n => !Number.isNaN(n))
    };
}

function saveScheduleActionForm() {
    if (!scheduleActionState) return;
    const { name, location, teacher, weekday, sections, weeks } = readScheduleActionForm();

    if (!name) {
        toast.warn(getI18n('schedule', 'errorCourseNameRequired'));
        return;
    }

    const termId = scheduleActionState.termId || currentSemesterId;
    const payload = { name, location, teacher, weekday, sections, weeks, updatedAt: Date.now() };

    if (scheduleActionState.mode === 'edit' && scheduleActionState.editingId) {
        const existingItem = getCustomCourseItem(scheduleActionState.editingId);
        if (existingItem) {
            upsertCustomCourseItem({
                ...existingItem,
                ...payload,
                termId: existingItem.termId || termId
            });
        }
    } else if (scheduleActionState.mode === 'edit' && scheduleActionState.sourceCourseHash) {
        const existingOverride = getCustomCourseItems().find(i => i.type === 'override' && i.targetHash === scheduleActionState.sourceCourseHash);
        upsertCustomCourseItem({
            ...payload,
            id: existingOverride?.id || createCustomCourseId(),
            type: 'override',
            targetHash: scheduleActionState.sourceCourseHash,
            termId
        });
    } else {
        upsertCustomCourseItem({
            ...payload,
            id: createCustomCourseId(),
            type: 'add',
            termId
        });
    }

    resetScheduleActionAddForm();
    switchScheduleActionTab('manage');
    refreshPageSchedule();
}

function fillScheduleActionForm(form) {
    ['name', 'location', 'teacher'].forEach(field => {
        const el = document.querySelector(`[data-course-field="${field}"]`);
        if (el) el.value = form[field] || '';
    });

    const weekday = form.weekday ? Number(form.weekday) : 0;
    document.querySelectorAll('.schedule-form-options--weekday .schedule-form-option').forEach(el => {
        el.dataset.active = Number(el.dataset.value) === weekday ? 'true' : 'false';
    });

    const sectionSet = new Set((form.sections || []).map(Number));
    document.querySelectorAll('#js_section_options .schedule-form-option').forEach(el => {
        const raw = el.dataset.sections || el.dataset.value || '';
        const vals = parseIntegerList(raw);
        el.dataset.active = vals.length > 0 && vals.every(v => sectionSet.has(v)) ? 'true' : 'false';
    });

    const weekSet = new Set((form.weeks || []).map(Number));
    document.querySelectorAll('#js_week_options .schedule-form-option').forEach(el => {
        el.dataset.active = weekSet.has(Number(el.dataset.value)) ? 'true' : 'false';
    });
}

function getDefaultScheduleActionForm(termId) {
    const todayWd = getTodayWeekday();
    return {
        name: '',
        location: '',
        teacher: '',
        weekday: todayWd,
        sections: [],
        weeks: currentWeek > 0 && termId === currentSemesterId ? [currentWeek] : []
    };
}

function resetScheduleActionAddForm() {
    if (!scheduleActionState) return;
    const termId = scheduleActionState.termId || currentSemesterId;
    const form = getDefaultScheduleActionForm(termId);

    scheduleActionState.mode = 'add';
    scheduleActionState.editingId = '';
    scheduleActionState.sourceCourseHash = '';
    scheduleActionState.form = form;

    updateScheduleActionModeText('add');
    fillScheduleActionForm(form);
}

function enterScheduleCustomEditMode(item) {
    resetSwipedCard();

    scheduleActionState.mode = 'edit';
    scheduleActionState.tab = 'add';
    scheduleActionState.editingId = item.id;
    scheduleActionState.sourceCourseHash = '';
    scheduleActionState.termId = item.termId || currentSemesterId;
    scheduleActionState.form = {
        name: item.name || '',
        location: item.location || '',
        teacher: item.teacher || '',
        weekday: item.weekday != null ? item.weekday : 0,
        sections: [...(item.sections || [])],
        weeks: [...(item.weeks || [])]
    };

    updateScheduleActionModeText('edit');
    fillScheduleActionForm(scheduleActionState.form);
    switchScheduleActionTab('add', { keepEdit: true });
}

function switchScheduleActionTab(tab, options = {}) {
    if (!scheduleActionState) return;
    const oldTab = scheduleActionState.tab;
    resetSwipedCard();

    const addTab = document.querySelector('[data-tab-content="add"]');
    const manageTab = document.querySelector('[data-tab-content="manage"]');

    document.querySelectorAll('.schedule-dialog-tab').forEach(el => {
        const isActive = el.dataset.tab === tab;
        el.dataset.active = isActive ? 'true' : 'false';
    });

    if (tab === 'manage') {
        if (options.keepEdit !== true) {
            resetScheduleActionAddForm();
        }
        scheduleActionState.tab = tab;
        addTab.classList.add('schedule-dialog-tab-add--hidden');
        manageTab.style.display = 'block';
        renderScheduleManageList();
    } else {
        if (options.keepEdit !== true && oldTab !== 'add') {
            resetScheduleActionAddForm();
        }
        scheduleActionState.tab = tab;
        addTab.classList.remove('schedule-dialog-tab-add--hidden');
        manageTab.style.display = 'none';
    }
}

function renderScheduleManageList() {
    const listEl = document.getElementById('js_manage_list');
    if (!listEl) return;
    const items = getCustomCourseItems().filter(i => i.termId === currentSemesterId).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!items.length) {
        listEl.innerHTML = `<div style="text-align: center; color: var(--weui-FG-1); padding: 40px 0;">${getI18n('schedule', 'noCustomCourse')}</div>`;
        return;
    }

    const sectionSuffix = getI18n('schedule', 'sectionSuffix');
    const isChinese = isChineseScheduleLocale();
    const rowHtml = (text, extraClass = '') => `<div class="schedule-manage-card-row${extraClass}${!text ? ' schedule-manage-card-row--empty' : ''}">${text || '\u00A0'}</div>`;

    let html = '<div class="schedule-manage-list">';
    for (const item of items) {
        const isInvalid = item.type === 'override' && !getBaseCourseByHash(item.targetHash);
        const sectionText = formatSections(item.sections || []);
        const weekText = formatWeeks(item.weeks || []);
        const nameRow = item.name ? escapeHtml(item.name) : '';
        const weekLabel = weekText ? (isChinese ? `第${weekText}周` : `Week ${weekText}`) : '';
        const dayLabel = item.weekday ? getWeekdayLabel(item.weekday) : '';
        const sectionLabel = sectionText ? `${sectionText}${sectionSuffix}` : '';
        const metaRow = [weekLabel, dayLabel, sectionLabel].filter(Boolean).join(' ');
        const locRow = [item.location ? escapeHtml(item.location) : '', item.teacher ? escapeHtml(item.teacher) : ''].filter(Boolean).join(' / ');

        html += `<div class="schedule-manage-card-wrap" data-id="${escapeHtml(item.id)}">
            <button type="button" class="schedule-manage-card-delete-bg js_custom_confirm_delete"><span class="schedule-manage-card-delete-icon"><i class="ri-delete-bin-fill"></i></span></button>
            <div class="schedule-manage-card${isInvalid ? ' schedule-manage-card--invalid' : ''}">
                <div class="schedule-manage-card-main">
                    ${rowHtml(nameRow)}
                    ${rowHtml(metaRow, ' schedule-manage-card-row--meta')}
                    ${rowHtml(locRow, ' schedule-manage-card-row--meta')}
                </div>
                <div class="schedule-manage-card-actions">
                    <button type="button" class="schedule-manage-card-action schedule-manage-card-action--edit js_custom_edit" data-id="${escapeHtml(item.id)}"><i class="ri-pencil-line"></i></button>
                    <button type="button" class="schedule-manage-card-action schedule-manage-card-action--delete js_custom_delete" data-id="${escapeHtml(item.id)}"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
        </div>`;
    }
    html += '</div>';
    listEl.innerHTML = html;

    initCardSwipe();
}

function initCardSwipe() {
    const wraps = document.querySelectorAll('.schedule-manage-card-wrap');

    wraps.forEach(wrap => {
        const card = wrap.querySelector('.schedule-manage-card');
        if (!card) return;

        let startX = 0;
        let currentX = 0;
        let isSwiping = false;

        card.addEventListener('touchstart', e => {
            if (swipedCardWrapEl && swipedCardWrapEl !== wrap) {
                resetSwipedCard();
            }
            startX = e.touches[0].clientX;
            currentX = 0;
            isSwiping = true;
            card.style.transition = 'none';
        }, { passive: true });

        card.addEventListener('touchmove', e => {
            if (!isSwiping) return;
            const deltaX = e.touches[0].clientX - startX;
            if (deltaX > 0) return;
            const maxSwipe = card.offsetWidth * DELETE_REVEAL_RATIO;
            currentX = Math.max(deltaX, -maxSwipe);
            card.style.transform = `translateX(${currentX}px)`;
        }, { passive: true });

        card.addEventListener('touchend', () => {
            if (!isSwiping) return;
            isSwiping = false;
            card.style.transition = 'transform 0.2s ease';
            card.style.transform = '';
            if (Math.abs(currentX) > Math.max(SWIPE_THRESHOLD, card.offsetWidth * 0.18)) {
                openDeleteConfirm(wrap);
            } else {
                resetSwipedCard();
            }
        });
    });
}

function bindScheduleActionEvents() {
    const wrap = document.getElementById('js_schedule_dialog_wrap');
    if (!wrap) return;

    wrap.addEventListener('click', e => {
        const closeBtn = e.target.closest('.schedule-dialog-close');
        if (closeBtn) { resetSwipedCard(); closeScheduleActionPanel(); return; }


        const confirmDeleteBtn = e.target.closest('.js_custom_confirm_delete');
        if (confirmDeleteBtn) {
            const cardWrap = confirmDeleteBtn.closest('.schedule-manage-card-wrap');
            if (!cardWrap) return;
            const id = cardWrap.dataset.id;
            if (!id) return;
            deleteCustomCourseItem(id);
            resetSwipedCard();
            renderScheduleManageList();
            refreshPageSchedule();
            return;
        }

        const deleteBtn = e.target.closest('.js_custom_delete');
        if (deleteBtn) {
            e.preventDefault();
            const cardWrap = deleteBtn.closest('.schedule-manage-card-wrap');
            openDeleteConfirm(cardWrap);
            return;
        }

        if (swipedCardWrapEl) {
            resetSwipedCard();
            return;
        }

        const tabBtn = e.target.closest('.schedule-dialog-tab');
        if (tabBtn) {
            const tab = tabBtn.dataset.tab;
            if (tab === 'add' || tab === 'manage') switchScheduleActionTab(tab);
            return;
        }

        const submitBtn = e.target.closest('#js_add_course_btn');
        if (submitBtn) { saveScheduleActionForm(); return; }

        const editBtn = e.target.closest('.js_custom_edit');
        if (editBtn) {
            resetSwipedCard();
            const id = editBtn.dataset.id;
            const item = getCustomCourseItem(id);
            if (item) {
                enterScheduleCustomEditMode(item);
            }
            return;
        }
    });
}

// ---- Main Load ----

export async function load(container) {
    pageContainer = container;
    const response = await fetch('/assets/subpages/schedule/schedule.html');
    const html = await response.text();
    container.innerHTML = html;
    await translatePage('schedule', container);

    const savedUser = getSavedUser();
    const isLoggedIn = savedUser?.isLoggedIn !== false;

    if (isLoggedIn && savedUser) {
        if (startupUpdateEnabled()) {
            await refreshCourseData();
        }

        let loaded = await loadCourse();

        if (!loaded && !startupUpdateEnabled()) {
            await refreshCourseData();
            loaded = await loadCourse();
        }

        courseDataLoaded = !!loaded;
        if (loaded) syncCurrentSemesterAndWeek();
    } else {
        courseDataLoaded = false;
    }
    refreshScheduleView(container);

    if (loginSuccessHandler) {
        window.removeEventListener('login-success', loginSuccessHandler);
    }

    loginSuccessHandler = async () => {
        const loaded = await loadCourse();
        courseDataLoaded = !!loaded;
        if (loaded) syncCurrentSemesterAndWeek();
        refreshScheduleView(container);
        loginSuccessHandler = null;
    };

    window.addEventListener('login-success', loginSuccessHandler, { once: true });

    if (scheduleClickHandler) {
        container.removeEventListener('click', scheduleClickHandler);
    }

    scheduleClickHandler = async (e) => {
        const actionFab = e.target.closest('#js_schedule_action_fab');
        if (actionFab) {
            openScheduleActionPanel({
                mode: 'add',
                tab: 'add',
                termId: currentSemesterId
            });
            return;
        }

        const currentSemester = e.target.closest('#js_current_semester');
        if (currentSemester) {
            const savedUser = getSavedUser();
            if (!savedUser || savedUser.isLoggedIn === false) {
                toast.warn(getI18n('login', 'errorNotLoggedIn'));
                loadLogin();
                return;
            }
            const availableSemesters = getAvailableSemesters();
            if (availableSemesters.length > 0) {
                const options = availableSemesters.map(id => ({ value: id, label: id }));
                HalfRadioDialog.show({
                    title: getI18n('schedule', 'selectSemester'),
                    options: options,
                    selected: currentSemesterId,
                    onChange: (value) => {
                        currentSemesterId = value;
                        currentWeek = 0;
                        weekOptionsCache = null;
                        weekOptionsCacheKey = null;
                        updateCurrentSemester(container);
                        updateCurrentWeek(container);
                        renderSchedule(container);
                    }
                });
            } else {
                toast.warn(getI18n('schedule', 'noSemester'));
            }
            return;
        }

        const currentWeekBtn = e.target.closest('#js_current_week');
        if (currentWeekBtn) {
            const savedUser = getSavedUser();
            if (!savedUser || savedUser.isLoggedIn === false) {
                toast.warn(getI18n('login', 'errorNotLoggedIn'));
                loadLogin();
                return;
            }
            const semesterConfig = getSemesterConfig(currentSemesterId);
            if (semesterConfig) {
                const totalWeeks = semesterConfig.totalWeeks;
                const allWeekLabel = getI18n('schedule', 'allWeek');
                const weekLabelTemplate = getI18n('schedule', 'weekN');
                const currentWeekSuffix = getI18n('schedule', 'currentWeekSuffix');

                const cacheKey = `${currentSemesterId}-${totalWeeks}-${currentSemesterAndWeek?.semesterId}-${currentSemesterAndWeek?.week}-${allWeekLabel}-${weekLabelTemplate}-${currentWeekSuffix}`;
                if (weekOptionsCacheKey !== cacheKey) {
                    weekOptionsCacheKey = cacheKey;
                    weekOptionsCache = [
                        { value: '0', label: allWeekLabel },
                        ...Array.from({ length: totalWeeks }, (_, i) => {
                            const weekNum = i + 1;
                            const isCurrentWeek = currentSemesterAndWeek?.semesterId === currentSemesterId && currentSemesterAndWeek?.week === weekNum;
                            return {
                                value: String(weekNum),
                                label: `${weekLabelTemplate.replace('{n}', weekNum)}${isCurrentWeek ? currentWeekSuffix : ''}`
                            };
                        })
                    ];
                }

                HalfRadioDialog.show({
                    title: getI18n('schedule', 'selectWeek'),
                    options: weekOptionsCache,
                    selected: String(currentWeek),
                    onChange: (value) => {
                        currentWeek = Number(value);
                        weekOptionsCacheKey = null;
                        weekOptionsCache = null;
                        updateCurrentWeek(container);
                        renderSchedule(container);
                    }
                });
            } else {
                toast.warn(getI18n('schedule', 'noSemesterConfig'));
            }
            return;
        }

        const contentView = e.target.closest('#js_content_view');
        if (contentView) {
            const options = Object.values(viewConfig).map(v => ({
                value: v.value,
                label: getI18n('schedule', v.labelKey)
            }));
            HalfRadioDialog.show({
                title: getI18n('schedule', 'selectView'),
                options: options,
                selected: scheduleView,
                onChange: (value) => {
                    scheduleView = value;
                    saveScheduleView(value);
                    updateContentView(container);
                    updateCurrentWeek(container);
                    renderSchedule(container);
                }
            });
            return;
        }

        const refresh = e.target.closest('#js_refresh');
        if (refresh) {
            if (isRefreshing) return;
            isRefreshing = true;

            const savedUser = getSavedUser();
            if (!savedUser || savedUser.isLoggedIn === false) {
                toast.warn(getI18n('login', 'errorNotLoggedIn'));
                loadLogin();
                isRefreshing = false;
                return;
            }
            const icon = refresh.querySelector('.refresh-icon');
            icon.animate(
                [{ transform: 'rotate(0deg)' }, { transform: 'rotate(720deg)' }],
                { duration: 1200, easing: 'ease' }
            );

            try {
                const remoteUpdated = await refreshCourseData();
                const loaded = await loadCourse();
                courseDataLoaded = !!loaded;

                if (loaded) {
                    if (remoteUpdated) {
                        scheduleView = 'weekView';
                        currentSemesterId = null;
                        currentWeek = 0;
                        currentDay = null;
                        dailySectionCount = 0;
                        timeSlots = [];
                        currentSemesterAndWeek = null;

                        syncCurrentSemesterAndWeek();
                    }

                    refreshScheduleView(container);
                } else {
                    refreshScheduleView(container);
                }
            } catch (error) {
                console.error('Refresh error:', error);
                refreshScheduleView(container);
            } finally {
                isRefreshing = false;
            }
        }
    };

    container.addEventListener('click', scheduleClickHandler);
}
