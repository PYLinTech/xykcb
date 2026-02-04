import { translatePage, getI18n } from '/assets/init/languages.js';
import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';
import { Dialog } from '/assets/common/dialog.js';
import { loadCourse, getCurrentSemesterAndWeek, getAvailableSemesters, getSemesterConfig, getWeekDates, getCourses, getCoursesByWeek, formatWeeks } from '/assets/common/course_parser.js';
import { toast } from '/assets/common/toast.js';

const viewConfig = {
    dayView: { value: 'dayView', labelKey: 'dayView' },
    weekView: { value: 'weekView', labelKey: 'weekView' },
    semesterView: { value: 'semesterView', labelKey: 'semesterView' }
};

// 课程数据加载配置
const COURSE_DATA_PATH = '/test/HNIT_23000140320.json';
const COURSE_DATA_SOURCE = 'online';

let scheduleView = 'weekView';
let currentSemesterId = null;
let currentWeek = 0;
let dailySectionCount = 0;
let timeSlots = [];
let currentSemesterAndWeek = null;
let courseDataLoaded = false;

// 获取设置
const getSetting = key => localStorage.getItem(`setting_${key}`) ?? 'true';
const showWeekend = () => getSetting('showWeekend') === 'true';
const showTeacher = () => getSetting('showTeacher') === 'true';
const showBorder = () => getSetting('showBorder') === 'true';

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

// 日视图渲染（留空）
function renderDayView(container) {
    // TODO: 实现日视图渲染
}

// 生成课程详情弹窗内容
function generateCourseDetailContent(courses) {
    const lineStyle = 'display: flex; align-items: flex-start; line-height: 1.6; font-size: 16px; margin-top: 4px;';
    const iconStyle = 'color: var(--weui-FG-2); margin-right: 8px; flex-shrink: 0; font-size: 16px;';
    const spanStyle = 'text-align: left; width: 0; flex: 1;';
    return courses.map((course, index) => {
        const separator = index > 0 ? '<div style="border-top: 1px solid var(--weui-FG-3); margin: 22px 0 18px;"></div>' : '';
        return `${separator}
            <div style="font-size: 20px; text-align: center; margin-bottom: 12px;">${course.name}</div>
            <div style="${lineStyle}">
                <i class="ri-map-pin-fill" style="${iconStyle}"></i>
                <span style="${spanStyle}">${getI18n('schedule', 'location')}${course.location}</span>
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

    // 如果课程数据加载失败，不渲染内容
    if (!courseDataLoaded) {
        return;
    }
    container.style.display = 'grid';
    container.style.height = '100%';
    container.style.width = '100%';

    // 根据设置确定列数
    const displayWeekend = showWeekend();
    const columnCount = displayWeekend ? 8 : 6;
    container.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
    container.style.gridTemplateRows = `46px repeat(${dailySectionCount}, minmax(80px, 1fr))`;

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

    // 绘制所有单元格
    const totalCells = columnCount * (dailySectionCount + 1);
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
        } else if (col === 0 && row > 0 && row <= dailySectionCount) {
            const slot = timeSlots[row - 1];
            if (slot?.section && slot?.start && slot?.end) {
                cell.innerHTML = `<div style="font-size: 16px;">${slot.section}</div><div style="font-size: 10px; color: var(--weui-FG-1);">${slot.start}-<wbr>${slot.end}</div>`;
            } else {
                cell.textContent = row;
            }
            cell.style.display = 'flex';
            cell.style.flexDirection = 'column';
            cell.style.alignItems = 'center';
            cell.style.justifyContent = 'center';
            cell.style.textAlign = 'center';
        }

        cells.push(cell);
        container.appendChild(cell);
    }

    // 按位置分组收集课程
    const cellCoursesMap = new Map();

    for (const course of courses) {
        for (const [day, sections] of Object.entries(course.schedule)) {
            const dayNum = parseInt(day); // 星期几 (1-7)
            // 如果不显示周末且是周六日，跳过
            if (!displayWeekend && dayNum >= 6) continue;
            const col = dayNum;
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
        cell.classList.add(`course-bg-${course.id % 10}`);
        cell.style.position = 'relative';
        cell.style.overflow = 'hidden';
        // 添加点击事件
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => showCourseDetailDialog(cellCourses));
    }
}

// 学期视图渲染（留空）
function renderSemesterView(container) {
    // TODO: 实现学期视图渲染
}

// 课程页面起始加载方法
export async function load(container) {
    const response = await fetch('/assets/subpages/schedule/schedule.html');
    const html = await response.text();
    container.innerHTML = html;
    await translatePage('schedule', container);

    // 加载课程数据并获取当前学期和周次
    const loaded = await loadCourse(COURSE_DATA_PATH, COURSE_DATA_SOURCE);
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
    } else {
        toast.warn(getI18n('schedule', 'loadCourseError'));
    }
    //更新顶部工具栏的学期、视图、周次
    updateCurrentSemester(container);
    updateContentView(container);
    updateCurrentWeek(container);
    //根据选择加载对应视图的课程
    renderSchedule(container);

    // 使用事件委托确保点击事件有效
    container.addEventListener('click', (e) => {
        //学期选择器
        const currentSemester = e.target.closest('#js_current_semester');
        if (currentSemester) {
            const availableSemesters = getAvailableSemesters();
            if (availableSemesters.length > 0) {
                const options = availableSemesters.map(id => ({ value: id, label: id }));
                HalfRadioDialog.show({
                    title: getI18n('schedule', 'selectSemester'),
                    options: options,
                    selected: currentSemesterId,
                    onChange: (value) => {
                        //选中值设置为当前学期，并将当前周次设置为0以默认显示全部周次，再调用视图渲染方法
                        currentSemesterId = value;
                        currentWeek = 0;
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
            const semesterConfig = getSemesterConfig(currentSemesterId);
            if (semesterConfig) {
                const totalWeeks = semesterConfig.totalWeeks;
                const options = [
                    { value: 0, label: getI18n('schedule', 'allWeek') },
                    ...Array.from({ length: totalWeeks }, (_, i) => {
                        const weekNum = i + 1;
                        const isCurrentWeek = currentSemesterAndWeek?.semesterId === currentSemesterId && currentSemesterAndWeek?.week === weekNum;
                        return {
                            value: weekNum,
                            label: `${getI18n('schedule', 'weekN').replace('{n}', weekNum)}${isCurrentWeek ? getI18n('schedule', 'currentWeekSuffix') : ''}`
                        };
                    })
                ];
                HalfRadioDialog.show({
                    title: getI18n('schedule', 'selectWeek'),
                    options: options,
                    selected: currentWeek,
                    onChange: (value) => {
                        //选中值设置为当前周次，调用渲染方法重新加载视图
                        currentWeek = Number(value);
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
                    //选中值设置为当前视图，调用update Container刷新工具栏，并重新渲染视图
                    scheduleView = value;
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
            refresh.animate(
                [{ transform: 'rotate(0deg)' }, { transform: 'rotate(720deg)' }],
                { duration: 1200, easing: 'ease' }
            );
            // 重置公共变量
            scheduleView = 'weekView';
            currentSemesterId = null;
            currentWeek = 0;
            dailySectionCount = 0;
            timeSlots = [];
            currentSemesterAndWeek = null;
            courseDataLoaded = false;
            // 重新加载课程数据
            loadCourse(COURSE_DATA_PATH, COURSE_DATA_SOURCE).then(loaded => {
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
            });
        }
    });
}
