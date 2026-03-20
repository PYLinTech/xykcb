import { translatePage, getI18n } from '/assets/init/languages.js';
import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';
import { Dialog } from '/assets/common/dialog.js';
import { CalendarPicker } from '/assets/common/calendar_picker.js';
import { loadCourse, getCurrentSemesterAndWeek, getAvailableSemesters, getSemesterConfig, getWeekDates, getCourses, getCoursesByWeek, getCoursesByDate, formatWeeks } from '/assets/common/course_parser.js';
import { refreshCourseData, getSavedUser, loadLogin } from '/assets/subpages/login/login.js';
import { toast } from '/assets/common/toast.js';

const viewConfig = {
    dayView: { value: 'dayView', labelKey: 'dayView' },
    weekView: { value: 'weekView', labelKey: 'weekView' },
    semesterView: { value: 'semesterView', labelKey: 'semesterView' }
};

// 视图相关设置
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
let isRefreshing = false; // 防止重复刷新

// 周次选项缓存，避免每次打开弹窗都重新创建数组
let weekOptionsCache = null;
let weekOptionsCacheKey = null;

// 获取设置
const getSetting = key => localStorage.getItem(`setting_${key}`) ?? 'true';
const showWeekend = () => getSetting('showWeekend') === 'true';
const showTeacher = () => getSetting('showTeacher') === 'true';
const showBorder = () => getSetting('showBorder') === 'true';
const showLargeSection = () => getSetting('showLargeSection') === 'true';
const startupUpdateEnabled = () => getSetting('autoUpdate') === 'true';

// 根据课程名称生成颜色索引
const getCourseColorIndex = (course) => {
    const name = course.name || '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % 10;
};

//顶部工具栏显示当前视图选项
function updateContentView(container) {
    container.querySelector('#js_content_view_label').textContent = getI18n('schedule', viewConfig[scheduleView].labelKey);
}

//顶部工具栏显示当前学期选项
function updateCurrentSemester(container) {
    if (currentSemesterId) {
        const semesterLabel = container.querySelector('#js_current_semester span[data-i18n="currentSemester"]');
        if (semesterLabel) {
            semesterLabel.textContent = currentSemesterId;
        }
    }
}

//顶部工具栏显示当前周次选项，仅在切换为周次视图时显示
function updateCurrentWeek(container) {
    const weekLabel = container.querySelector('#js_current_week_label');
    if (weekLabel) {
        if (currentWeek == 0) {
            weekLabel.textContent = getI18n('schedule', 'allWeek');
        } else {
            weekLabel.textContent = getI18n('schedule', 'weekN').replace('{n}', currentWeek);
        }
    }
    // 周视图时显示，其他视图隐藏
    const weekBtn = container.querySelector('#js_current_week');
    if (weekBtn) {
        weekBtn.style.visibility = scheduleView === 'weekView' ? 'visible' : 'hidden';
    }
}

// 根据 scheduleView 渲染对应视图
function renderSchedule(container) {
    const contentContainer = container.querySelector('#js_schedule_content');
    if (!contentContainer) return;

    // 获取学期配置中的每日节次数
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

// 日视图渲染
function renderDayView(container) {
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    // 初始化当前日期
    if (!currentDay) {
        const today = new Date();
        currentDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    // 创建操作栏
    const toolbar = document.createElement('div');
    toolbar.id = 'js_dayview_toolbar';
    toolbar.style.cssText = 'display: flex; align-items: center; justify-content: space-between; height: 46px; flex-shrink: 0; padding: 0 8px;';

    // 左箭头
    const leftBtn = document.createElement('div');
    leftBtn.innerHTML = '<i class="ri-arrow-left-s-line" style="font-size: 22px;"></i>';
    leftBtn.classList.add('tap-active');
    leftBtn.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; cursor: pointer; color: var(--weui-FG-0); border-radius: 50%;';
    leftBtn.addEventListener('click', () => {
        const date = new Date(currentDay);
        date.setDate(date.getDate() - 1);
        currentDay = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        renderDayViewCourses(container);
    });

    // 当前日期文本
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

    // 右箭头
    const rightBtn = document.createElement('div');
    rightBtn.innerHTML = '<i class="ri-arrow-right-s-line" style="font-size: 22px;"></i>';
    rightBtn.classList.add('tap-active');
    rightBtn.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; cursor: pointer; color: var(--weui-FG-0); border-radius: 50%;';
    rightBtn.addEventListener('click', () => {
        const date = new Date(currentDay);
        date.setDate(date.getDate() + 1);
        currentDay = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        renderDayViewCourses(container);
    });

    toolbar.appendChild(leftBtn);
    toolbar.appendChild(dateText);
    toolbar.appendChild(rightBtn);
    container.appendChild(toolbar);

    // 创建课程列表容器
    const courseList = document.createElement('div');
    courseList.id = 'js_dayview_courses';
    courseList.style.cssText = 'flex: 1; overflow-y: auto; padding: 8px;';
    container.appendChild(courseList);

    // 渲染课程
    renderDayViewCourses(container);
}

// 日视图课程列表渲染
function renderDayViewCourses(container) {
    const courseList = container.querySelector('#js_dayview_courses');
    const dateText = container.querySelector('#js_dayview_date');

    // 获取学期配置
    const semesterConfig = getSemesterConfig(currentSemesterId);
    let mergeableSections = semesterConfig?.mergeableSections || [];

    // 按起始节次排序
    mergeableSections = [...mergeableSections].sort((a, b) => {
        const startA = parseInt(a.split('-')[0]);
        const startB = parseInt(b.split('-')[0]);
        return startA - startB;
    });

    // 解析大节配置
    const largeSectionMap = new Map(); // 大节索引 -> { name: "1-2", sections: [1,2], startTime, endTime }
    for (let i = 0; i < mergeableSections.length; i++) {
        const parts = mergeableSections[i].split('-');
        const startSection = parseInt(parts[0]);
        const endSection = parseInt(parts[1]);
        const sections = [];
        for (let s = startSection; s <= endSection; s++) {
            sections.push(s);
        }
        const startSlot = timeSlots[startSection - 1];
        const endSlot = timeSlots[endSection - 1];
        largeSectionMap.set(i, {
            name: mergeableSections[i],
            sections: sections,
            startTime: startSlot?.start || '',
            endTime: endSlot?.end || ''
        });
    }

    const useLargeSection = showLargeSection() && largeSectionMap.size > 0;

    // 更新日期文本
    const today = new Date();
    const displayDate = new Date(currentDay);
    const isToday = today.getFullYear() === displayDate.getFullYear() &&
                    today.getMonth() === displayDate.getMonth() &&
                    today.getDate() === displayDate.getDate();
    const weekdayKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDay = getI18n('schedule', `weekday${weekdayKeys[displayDate.getDay()]}`);
    const month = String(displayDate.getMonth() + 1).padStart(2, '0');
    const day = String(displayDate.getDate()).padStart(2, '0');
    const todayAbbr = getI18n('schedule', 'todayAbbr');
    dateText.innerHTML = isToday
        ? `<span style="background: var(--weui-BRAND); color: #fff; border-radius: 10px; padding: 2px 6px; margin-right: 6px; font-size: 10px;">${todayAbbr}</span>${displayDate.getFullYear()}-${month}-${day} ${weekDay}`
        : `${displayDate.getFullYear()}-${month}-${day} ${weekDay}`;

    courseList.innerHTML = '';

    // 获取当天课程数据
    const coursesResult = getCoursesByDate(currentSemesterId, currentDay);

    if (coursesResult === null) {
        courseList.innerHTML = `<div style="text-align: center; color: var(--weui-FG-1); margin-top: 40px;"><i class="ri-calendar-line" style="font-size: 48px; margin-bottom: 12px;"></i><div style="margin-top: 8px;">${getI18n('schedule', 'noCourse')}</div></div>`;
        // 检查登录状态
        const savedUser = getSavedUser();
        if (!savedUser || savedUser.isLoggedIn === false) {
            toast.warn(getI18n('login', 'errorNotLoggedIn'));
            loadLogin();
        } else {
            toast.warn(getI18n('schedule', 'loadCourseError'));
        }
        return;
    } else if (coursesResult === 'out') {
        courseList.innerHTML = `<div style="text-align: center; color: var(--weui-FG-1); margin-top: 40px;"><i class="ri-calendar-line" style="font-size: 48px; margin-bottom: 12px;"></i><div style="margin-top: 8px;">${getI18n('schedule', 'outOfSemester')}</div></div>`;
    } else if (coursesResult === 'none' || !coursesResult?.length) {
        courseList.innerHTML = `<div style="text-align: center; color: var(--weui-FG-1); margin-top: 40px;"><i class="ri-calendar-line" style="font-size: 48px; margin-bottom: 12px;"></i><div style="margin-top: 8px;">${getI18n('schedule', 'noCourse')}</div></div>`;
    } else if (Array.isArray(coursesResult)) {
        // 按节次收集课程，同一节次可能有多个课程
        const sectionCoursesMap = new Map();

        if (useLargeSection) {
            // 大节模式：按大节收集课程
            for (const course of coursesResult) {
                for (const [day, sections] of Object.entries(course.schedule)) {
                    const dayNum = parseInt(day);
                    const targetDayNum = displayDate.getDay() || 7;
                    if (dayNum === targetDayNum) {
                        // 查找课程所属的大节
                        for (const [largeIdx, largeSection] of largeSectionMap) {
                            const hasSection = sections.some(s => largeSection.sections.includes(s));
                            if (hasSection) {
                                if (!sectionCoursesMap.has(largeIdx)) {
                                    sectionCoursesMap.set(largeIdx, []);
                                }
                                // 避免重复添加同一课程
                                if (!sectionCoursesMap.get(largeIdx).includes(course)) {
                                    sectionCoursesMap.get(largeIdx).push(course);
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // 小节模式：按小节收集课程
            for (const course of coursesResult) {
                for (const [day, sections] of Object.entries(course.schedule)) {
                    const dayNum = parseInt(day);
                    const targetDayNum = displayDate.getDay() || 7;
                    if (dayNum === targetDayNum) {
                        for (const section of sections) {
                            if (!sectionCoursesMap.has(section)) {
                                sectionCoursesMap.set(section, []);
                            }
                            sectionCoursesMap.get(section).push(course);
                        }
                    }
                }
            }
        }

        // 按节次排序
        const sortedSections = Array.from(sectionCoursesMap.keys()).sort((a, b) => a - b);

        // 使用 DocumentFragment 减少 DOM 操作
        const fragment = document.createDocumentFragment();
        for (const sectionIdx of sortedSections) {
            const sectionCourses = sectionCoursesMap.get(sectionIdx);
            for (const course of sectionCourses) {
                let sectionDisplay, timeDisplay;
                if (useLargeSection) {
                    // 大节显示
                    const largeSection = largeSectionMap.get(sectionIdx);
                    sectionDisplay = largeSection?.name || '';
                    timeDisplay = largeSection ? `${largeSection.startTime}-${largeSection.endTime}` : '';
                } else {
                    // 小节显示
                    const slot = timeSlots[sectionIdx - 1];
                    sectionDisplay = sectionIdx;
                    timeDisplay = slot ? `${slot.start}-${slot.end}` : '';
                }
                const card = document.createElement('div');
                card.style.cssText = 'display: flex; min-height: 100px; margin-bottom: 10px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.25);';
                card.classList.add(`course-bg-${getCourseColorIndex(course)}`);

                // 左侧节次
                const leftSection = document.createElement('div');
                leftSection.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; width: 80px; flex-shrink: 0; border-right: 1px solid var(--weui-FG-3); padding: 8px;';
                leftSection.innerHTML = `<div style="font-size: 24px; color: var(--weui-FG-0); font-weight: 600; line-height: 1.2;">${sectionDisplay}</div><div style="font-size: 10px; color: var(--weui-FG-1); margin-top: 2px;">${timeDisplay}</div>`;

                // 右侧课程信息
                const rightInfo = document.createElement('div');
                rightInfo.style.cssText = 'flex: 1; padding: 12px 14px; display: flex; flex-direction: column; justify-content: center; overflow: hidden;';

                const nameStyle = 'font-size: 16px; color: var(--weui-FG-0); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4;';
                const metaStyle = 'font-size: 12px; color: var(--weui-FG-1); margin-top: 6px; display: flex; flex-wrap: wrap; gap: 8px;';

                let metaHtml = '';
                if (course.location) {
                    metaHtml += `<span style="display: inline-flex; align-items: center; margin-right: 12px; color: var(--weui-FG-1);"><i class="ri-map-pin-fill" style="margin-right: 2px; font-size: 12px; color: var(--weui-FG-1);"></i>${course.location}</span>`;
                }
                if (course.teacher) {
                    metaHtml += `<span style="display: inline-flex; align-items: center; color: var(--weui-FG-1);"><i class="ri-user-fill" style="margin-right: 2px; font-size: 12px; color: var(--weui-FG-1);"></i>${course.teacher}</span>`;
                }

                rightInfo.innerHTML = `<div style="${nameStyle}">${course.name}</div><div style="${metaStyle}">${metaHtml}</div>`;

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

// 辅助函数：格式化课程时间为显示文本
function formatCourseTimeText(course) {
    const weekdayKeys = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daySchedules = new Map();
    for (const [day, sections] of Object.entries(course.schedule || {})) {
        const dayNum = parseInt(day);
        if (!daySchedules.has(dayNum)) daySchedules.set(dayNum, []);
        daySchedules.get(dayNum).push(...sections);
    }
    const scheduleTexts = [];
    for (const [day, sections] of daySchedules) {
        const weekday = getI18n('schedule', `weekday${weekdayKeys[day - 1]}`);
        sections.sort((a, b) => a - b);
        let result = weekday;
        let start = sections[0];
        let prev = start;
        for (let i = 1; i <= sections.length; i++) {
            const current = sections[i];
            if (current !== prev + 1) {
                const sectionStr = start === prev ? start : `${start}-${prev}`;
                result += result === weekday ? ` ${sectionStr}` : `,${sectionStr}`;
                start = current;
            }
            prev = current;
        }
        scheduleTexts.push(`${result} ${getI18n('schedule', 'sectionSuffix')}`);
    }
    return scheduleTexts.join(getI18n('schedule', 'scheduleSeparator') + '\u200B');
}

// 生成课程详情弹窗内容
function generateCourseDetailContent(courses) {
    const lineStyle = 'display: flex; align-items: flex-start; line-height: 1.6; font-size: 16px; margin-top: 4px;';
    const iconStyle = 'color: var(--weui-FG-1); margin-right: 8px; flex-shrink: 0; font-size: 16px;';
    const spanStyle = 'text-align: left; width: 0; flex: 1; color: var(--weui-FG-1);';
    return courses.map((course, index) => {
        const separator = index > 0 ? '<div style="border-top: 1px solid var(--weui-FG-3); margin: 22px 0 18px;"></div>' : '';
        return `${separator}
            <div style="font-size: 20px; text-align: center; margin-bottom: 12px;">${course.name}</div>
            <div style="${lineStyle}">
                <i class="ri-map-pin-fill" style="${iconStyle}"></i>
                <span style="${spanStyle}">${getI18n('schedule', 'location')}${course.location}</span>
            </div>
            <div style="${lineStyle}">
                <i class="ri-time-fill" style="${iconStyle}"></i>
                <span style="${spanStyle}">${getI18n('schedule', 'time')}${formatCourseTimeText(course)}</span>
            </div>
            <div style="${lineStyle}">
                <i class="ri-user-fill" style="${iconStyle}"></i>
                <span style="${spanStyle}">${getI18n('schedule', 'teacher')}${course.teacher}</span>
            </div>
            <div style="${lineStyle}">
                <i class="ri-calendar-check-fill" style="${iconStyle}"></i>
                <span style="${spanStyle}">${getI18n('schedule', 'week')}${formatWeeks(course.weeks)}</span>
            </div>`;
    }).join('');
}

// 显示课程详情弹窗
function showCourseDetailDialog(courses) {
    const content = generateCourseDetailContent(courses);
    Dialog.show({
        style: '2',
        content: content,
        buttons: [{ text: getI18n('schedule', 'close') }],
        allowMaskClose: true
    });
}

// 周视图渲染
function renderWeekView(container) {
    container.innerHTML = '';

    // 如果课程数据加载失败，显示提示
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

    // 获取学期配置
    const semesterConfig = getSemesterConfig(currentSemesterId);
    let mergeableSections = semesterConfig?.mergeableSections || [];

    // 按起始节次排序
    mergeableSections = [...mergeableSections].sort((a, b) => {
        const startA = parseInt(a.split('-')[0]);
        const startB = parseInt(b.split('-')[0]);
        return startA - startB;
    });

    // 解析大节配置
    const largeSectionMap = new Map(); // 大节索引 -> { name: "1-2", sections: [1,2], startTime, endTime }
    for (let i = 0; i < mergeableSections.length; i++) {
        const parts = mergeableSections[i].split('-');
        const startSection = parseInt(parts[0]);
        const endSection = parseInt(parts[1]);
        const sections = [];
        for (let s = startSection; s <= endSection; s++) {
            sections.push(s);
        }
        // 获取起始和结束时间
        const startSlot = timeSlots[startSection - 1];
        const endSlot = timeSlots[endSection - 1];
        largeSectionMap.set(i, {
            name: mergeableSections[i],
            sections: sections,
            startTime: startSlot?.start || '',
            endTime: endSlot?.end || ''
        });
    }

    const useLargeSection = showLargeSection() && largeSectionMap.size > 0;
    const rowCount = useLargeSection ? largeSectionMap.size : dailySectionCount;

    container.style.display = 'grid';
    container.style.height = '100%';
    container.style.width = '100%';

    // 根据设置确定列数
    const displayWeekend = showWeekend();
    const columnCount = displayWeekend ? 8 : 6;
    container.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
    container.style.gridTemplateRows = `46px repeat(${rowCount}, minmax(80px, 1fr))`;

    // 根据设置确定边框
    const displayBorder = showBorder();
    const displayTeacher = showTeacher();

    // 获取当前周次日期
    const weekDates = currentWeek > 0 ? getWeekDates(currentSemesterId, currentWeek) : null;

    // 获取今天的日期字符串
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 获取课程数据
    const courses = currentWeek > 0 ? getCoursesByWeek(currentSemesterId, currentWeek) : getCourses(currentSemesterId);

    // 存储所有单元格的引用
    const cells = [];
    // 使用 DocumentFragment 减少 DOM 操作
    const fragment = document.createDocumentFragment();

    // 绘制所有单元格
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

        // 第一列从第二行开始填充节次
        const col = i % columnCount;
        const row = Math.floor(i / columnCount);
        // 第一行显示表头
        if (row === 0) {
            if (col === 0) {
                cell.textContent = getI18n('schedule', 'section');
            } else {
                const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][col - 1];
                const dateStr = weekDates?.[col];
                if (dateStr) {
                    // 将 "2025-09-01" 转换为 "9.1"
                    const [, month, day] = dateStr.split('-');
                    cell.innerHTML = `<div>${getI18n('schedule', `weekday${weekday}`)}</div><div style="font-size: 12px; color: var(--weui-FG-1);">${parseInt(month)}.${parseInt(day)}</div>`;
                    cell.style.display = 'flex';
                    cell.style.flexDirection = 'column';
                    cell.style.alignItems = 'center';
                    // 如果是今天，背景色设为品牌色
                    if (dateStr === todayStr) {
                        cell.style.backgroundColor = 'var(--weui-BRAND)';
                        // 所有子元素文字设为白色
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
                // 大节显示
                const largeSection = largeSectionMap.get(row - 1);
                if (largeSection) {
                    cell.innerHTML = `<div style="font-size: 16px;">${largeSection.name}</div><div style="font-size: 10px; color: var(--weui-FG-1);">${largeSection.startTime}-${largeSection.endTime}</div>`;
                }
            } else {
                // 小节显示
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

    // 一次性将所有单元格添加到容器
    container.appendChild(fragment);

    // 按位置分组收集课程
    const cellCoursesMap = new Map();

    for (const course of courses) {
        for (const [day, sections] of Object.entries(course.schedule)) {
            const dayNum = parseInt(day); // 星期几 (1-7)
            // 如果不显示周末且是周六日，跳过
            if (!displayWeekend && dayNum >= 6) continue;
            const col = dayNum;

            if (useLargeSection) {
                // 大节模式：将课程放入对应的大节
                // 首先找到课程所有节次对应的大节
                const largeSectionCourses = new Map(); // 大节索引 -> 课程列表

                for (const section of sections) {
                    // 查找该小节属于哪个大节
                    for (const [largeIdx, largeSection] of largeSectionMap) {
                        if (largeSection.sections.includes(section)) {
                            if (!largeSectionCourses.has(largeIdx)) {
                                largeSectionCourses.set(largeIdx, []);
                            }
                            // 避免重复添加同一课程
                            if (!largeSectionCourses.get(largeIdx).includes(course)) {
                                largeSectionCourses.get(largeIdx).push(course);
                            }
                            break;
                        }
                    }
                }

                // 将课程放入对应大节
                for (const [largeIdx, courseList] of largeSectionCourses) {
                    const row = largeIdx + 1; // 大节索引从1开始（0是表头）
                    const cellIndex = row * columnCount + col;
                    if (cellIndex >= 0 && cellIndex < cells.length) {
                        if (!cellCoursesMap.has(cellIndex)) {
                            cellCoursesMap.set(cellIndex, []);
                        }
                        // 合并课程列表
                        for (const c of courseList) {
                            if (!cellCoursesMap.get(cellIndex).includes(c)) {
                                cellCoursesMap.get(cellIndex).push(c);
                            }
                        }
                    }
                }
            } else {
                // 小节模式
                for (const section of sections) {
                    const row = section; // 第几节 (1-n)
                    const cellIndex = row * columnCount + col;
                    if (cellIndex >= 0 && cellIndex < cells.length) {
                        if (!cellCoursesMap.has(cellIndex)) {
                            cellCoursesMap.set(cellIndex, []);
                        }
                        cellCoursesMap.get(cellIndex).push(course);
                    }
                }
            }
        }
    }

    // 填充课程
    for (const [cellIndex, cellCourses] of cellCoursesMap) {
        const cell = cells[cellIndex];
        // 取第一个课程显示
        const course = cellCourses[0];
        // 如果有多个课程，显示红色三角形标记
        const multipleIndicator = cellCourses.length > 1
            ? `<div style="position: absolute; top: 0; right: 0; width: 0; height: 0; border-style: solid; border-width: 0 12px 12px 0; border-color: transparent #ff4d4f transparent transparent;"></div>`
            : '';
        const teacherHtml = displayTeacher ? `<div style="font-size: 10px; color: var(--weui-FG-1); margin-top: 6px; line-height: 1; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${course.teacher}</div>` : '';
        cell.innerHTML = `<div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4px;">${multipleIndicator}<div style="font-size: 12px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${course.name}</div><div style="font-size: 10px; color: var(--weui-FG-1); margin-top: 8px; line-height: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${course.location}</div>${teacherHtml}</div>`;
        cell.classList.add(`course-bg-${getCourseColorIndex(course)}`);
        cell.style.position = 'relative';
        cell.style.overflow = 'hidden';
        // 添加点击事件
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => showCourseDetailDialog(cellCourses));
    }
}

// 学期视图渲染
function renderSemesterView(container) {
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    // 创建课程卡片容器
    const courseList = document.createElement('div');
    courseList.id = 'js_semesterview_courses';
    courseList.style.cssText = 'flex: 1; overflow-y: auto; padding: 12px;';
    container.appendChild(courseList);

    // 获取所有课程数据
    const courses = getCourses(currentSemesterId);

    if (!courses || courses.length === 0) {
        courseList.innerHTML = `<div style="text-align: center; color: var(--weui-FG-1); margin-top: 40px;"><i class="ri-book-2-line" style="font-size: 48px; margin-bottom: 12px;"></i><div style="margin-top: 8px;">${getI18n('schedule', 'noCourseInSemester')}</div></div>`;
        // 检查登录状态
        const savedUser = getSavedUser();
        if (!savedUser || savedUser.isLoggedIn === false) {
            toast.warn(getI18n('login', 'errorNotLoggedIn'));
            loadLogin();
        } else {
            toast.warn(getI18n('schedule', 'loadCourseError'));
        }
        return;
    }

    // 辅助函数：格式化单个课程的时间
    function formatCourseTime(course) {
        const weekdayKeys = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const daySchedules = new Map();
        for (const [day, sections] of Object.entries(course.schedule || {})) {
            const dayNum = parseInt(day);
            if (!daySchedules.has(dayNum)) daySchedules.set(dayNum, []);
            daySchedules.get(dayNum).push(...sections);
        }
        const scheduleTexts = [];
        for (const [day, sections] of daySchedules) {
            const weekday = getI18n('schedule', `weekday${weekdayKeys[day - 1]}`);
            sections.sort((a, b) => a - b);
            let result = weekday;
            let start = sections[0];
            let prev = start;
            for (let i = 1; i <= sections.length; i++) {
                const current = sections[i];
                if (current !== prev + 1) {
                    const sectionStr = start === prev ? start : `${start}-${prev}`;
                    result += result === weekday ? ` ${sectionStr}` : `,${sectionStr}`;
                    start = current;
                }
                prev = current;
            }
            scheduleTexts.push(`${result} ${getI18n('schedule', 'sectionSuffix')}`);
        }
        return scheduleTexts.join(getI18n('schedule', 'scheduleSeparator') + '\u200B');
    }

    // 按课程名称+教师分组
    const courseGroupMap = new Map();
    for (const course of courses) {
        const key = `${course.name}|${course.teacher || ''}`;
        if (!courseGroupMap.has(key)) {
            courseGroupMap.set(key, []);
        }
        courseGroupMap.get(key).push(course);
    }

    // 渲染每个课程组 - 使用 DocumentFragment 减少 DOM 操作
    const fragment = document.createDocumentFragment();
    for (const [key, groupCourses] of courseGroupMap) {
        const course = groupCourses[0];

        // 收集地点、时间、周次，用 | 分割
        const locations = [];
        const times = [];
        const weeks = [];

        for (const c of groupCourses) {
            locations.push(c.location || '-');
            times.push(formatCourseTime(c));
            weeks.push(formatWeeks(c.weeks) || '-');
        }

        const locationStr = locations.join(' | ');
        const timeStr = times.join(' | ');
        const weeksStr = weeks.join(' | ');

        const card = document.createElement('div');
        card.style.cssText = 'display: flex; min-height: 120px; margin-bottom: 12px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.25);';
        card.classList.add(`course-bg-${getCourseColorIndex(course)}`);

        // 左侧课程名称
        const leftName = document.createElement('div');
        leftName.style.cssText = 'width: 100px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 12px; border-right: 1px solid var(--weui-FG-3);';
        leftName.innerHTML = `<div style="font-size: 15px; color: var(--weui-FG-0); line-height: 1.4; text-align: center; word-break: break-all;">${course.name}</div>`;

        // 右侧课程信息
        const rightInfo = document.createElement('div');
        rightInfo.style.cssText = 'flex: 1; padding: 12px 14px; display: flex; flex-direction: column; justify-content: center; overflow: hidden;';

        let metaHtml = '';
        // 地点
        if (locationStr) {
            metaHtml += `<div style="display: flex; align-items: flex-start;"><i class="ri-map-pin-fill" style="margin-right: 6px; font-size: 12px; color: var(--weui-FG-1); flex-shrink: 0;"></i><span style="font-size: 12px; color: var(--weui-FG-1);">${getI18n('schedule', 'location')}${locationStr}</span></div>`;
        }
        // 教师
        if (showTeacher() && course.teacher) {
            metaHtml += `<div style="display: flex; align-items: flex-start;"><i class="ri-user-fill" style="margin-right: 6px; font-size: 12px; color: var(--weui-FG-1); flex-shrink: 0;"></i><span style="font-size: 12px; color: var(--weui-FG-1);">${getI18n('schedule', 'teacher')}${course.teacher}</span></div>`;
        }
        // 节次
        if (timeStr) {
            metaHtml += `<div style="display: flex; align-items: flex-start;"><i class="ri-time-fill" style="margin-right: 6px; font-size: 12px; color: var(--weui-FG-1); flex-shrink: 0;"></i><span style="font-size: 12px; color: var(--weui-FG-1); word-break: keep-all;">${getI18n('schedule', 'time')}${timeStr}</span></div>`;
        }
        // 周次
        if (weeksStr) {
            metaHtml += `<div style="display: flex; align-items: flex-start;"><i class="ri-calendar-check-fill" style="margin-right: 6px; font-size: 12px; color: var(--weui-FG-1); flex-shrink: 0;"></i><span style="font-size: 12px; color: var(--weui-FG-1); word-break: keep-all;">${getI18n('schedule', 'week')}${weeksStr}</span></div>`;
        }

        rightInfo.innerHTML = metaHtml;

        card.appendChild(leftName);
        card.appendChild(rightInfo);
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => showCourseDetailDialog(groupCourses));
        fragment.appendChild(card);
    }
    courseList.appendChild(fragment);
}

// 课程页面起始加载方法
export async function load(container) {
    const response = await fetch('/assets/subpages/schedule/schedule.html');
    const html = await response.text();
    container.innerHTML = html;
    await translatePage('schedule', container);

    // 检查是否首次加载该页面
    const isFirstLoad = container.dataset.firstLoad === 'true';

    // 检查是否自动加载课程数据
    const savedUser = getSavedUser();
    const isLoggedIn = savedUser?.isLoggedIn !== false;

    // 加载课程数据并获取当前学期和周次
    if (isLoggedIn && savedUser) {
        const loaded = await loadCourse('merge');
        courseDataLoaded = !!loaded;
        if (loaded) {
            //调用方法获取当前学期及周次
            const semesterAndWeek = getCurrentSemesterAndWeek();
            if (semesterAndWeek) {
                currentSemesterId = semesterAndWeek.semesterId;
                currentWeek = semesterAndWeek.week;
                if (semesterAndWeek.week !== 0) {
                    currentSemesterAndWeek = semesterAndWeek;
                }
            }
            // 仅在首次加载页面时自动更新课程数据（后台执行，不阻塞显示）
            if (isFirstLoad && startupUpdateEnabled()) {
                refreshCourseData().then(async () => {
                    // 刷新完成后重新加载课程数据并更新界面
                    await loadCourse('merge');
                    const semesterAndWeek = getCurrentSemesterAndWeek();
                    if (semesterAndWeek) {
                        currentSemesterId = semesterAndWeek.semesterId;
                        currentWeek = semesterAndWeek.week;
                        if (semesterAndWeek.week !== 0) {
                            currentSemesterAndWeek = semesterAndWeek;
                        }
                    }
                    // 重置日视图日期为今天
                    currentDay = null;
                    updateCurrentSemester(container);
                    updateContentView(container);
                    updateCurrentWeek(container);
                    renderSchedule(container);
                });
            }
        } else {
            toast.warn(getI18n('schedule', 'loadCourseError'));
        }
    } else {
        courseDataLoaded = false;
    }
    //更新顶部工具栏的学期、视图、周次
    updateCurrentSemester(container);
    updateContentView(container);
    updateCurrentWeek(container);
    //根据选择加载对应视图的课程
    renderSchedule(container);

    // 监听登录成功事件，刷新课程数据（使用 once 防止重复绑定）
    const handleLoginSuccess = async () => {
        const loaded = await loadCourse('merge');
        courseDataLoaded = !!loaded;
        if (loaded) {
            const semesterAndWeek = getCurrentSemesterAndWeek();
            if (semesterAndWeek) {
                currentSemesterId = semesterAndWeek.semesterId;
                currentWeek = semesterAndWeek.week;
                if (semesterAndWeek.week !== 0) {
                    currentSemesterAndWeek = semesterAndWeek;
                }
            }
        }
        updateCurrentSemester(container);
        updateContentView(container);
        updateCurrentWeek(container);
        renderSchedule(container);
    };

    // 使用 once: true 确保只执行一次
    window.addEventListener('login-success', handleLoginSuccess, { once: true });

    // 使用事件委托确保点击事件有效
    container.addEventListener('click', async (e) => {
        //学期选择器
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
                        // 切换学期后清理周次选项缓存
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

        //周次选择器
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

                // 使用缓存避免每次都重新创建数组
                const cacheKey = `${currentSemesterId}-${currentSemesterAndWeek?.semesterId}-${currentSemesterAndWeek?.week}`;
                if (weekOptionsCacheKey !== cacheKey) {
                    weekOptionsCacheKey = cacheKey;
                    weekOptionsCache = [
                        { value: '0', label: getI18n('schedule', 'allWeek') },
                        ...Array.from({ length: totalWeeks }, (_, i) => {
                            const weekNum = i + 1;
                            const isCurrentWeek = currentSemesterAndWeek?.semesterId === currentSemesterId && currentSemesterAndWeek?.week === weekNum;
                            return {
                                value: String(weekNum),
                                label: `${getI18n('schedule', 'weekN').replace('{n}', weekNum)}${isCurrentWeek ? getI18n('schedule', 'currentWeekSuffix') : ''}`
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
                        // 切换周次后需要更新缓存
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

        //视图选择器
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

        //刷新按钮
        const refresh = e.target.closest('#js_refresh');
        if (refresh) {
            // 防重复点击
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
                await refreshCourseData();
                scheduleView = 'weekView';
                currentSemesterId = null;
                currentWeek = 0;
                currentDay = null;
                dailySectionCount = 0;
                timeSlots = [];
                currentSemesterAndWeek = null;
                courseDataLoaded = false;
                const loaded = await loadCourse('merge');
                courseDataLoaded = !!loaded;
                if (loaded) {
                    const semesterAndWeek = getCurrentSemesterAndWeek();
                    if (semesterAndWeek) {
                        currentSemesterId = semesterAndWeek.semesterId;
                        currentWeek = semesterAndWeek.week;
                        if (semesterAndWeek.week !== 0) {
                            currentSemesterAndWeek = semesterAndWeek;
                        }
                    }
                } else {
                    toast.warn(getI18n('schedule', 'loadCourseError'));
                }
                updateCurrentSemester(container);
                updateContentView(container);
                updateCurrentWeek(container);
                renderSchedule(container);
            } catch (error) {
                console.error('Refresh error:', error);
                toast.warn(getI18n('schedule', 'loadCourseError'));
            } finally {
                isRefreshing = false;
            }
        }
    });
}
