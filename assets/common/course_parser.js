/**
 * Course Data Parser
 * 用于解析课程数据JSON文件
 */

let courseData = null;

/**
 * 加载课程数据JSON文件
 * @param {string} [url] - JSON文件地址，online和merge模式需要
 * @param {string} mode - 加载模式: local(本地存储), online(在线加载), merge(合并加载)
 * @returns {Promise<boolean>} - 加载成功返回true，失败返回false
 */
async function loadCourse(url, mode) {
    try {
        const loadOnline = mode === 'online' || mode === 'merge';
        const loadLocal = mode === 'local' || mode === 'merge';

        if (loadOnline && !url) {
            console.error('URL is required for online/merge mode');
            return false;
        }

        const [onlineData, localData] = await Promise.all([
            loadOnline ? fetch(url).then(r => r.ok ? r.json() : null) : Promise.resolve(null),
            loadLocal ? Promise.resolve(localStorage.getItem('localCourseData')).then(s => s ? JSON.parse(s) : null) : Promise.resolve(null)
        ]);

        switch (mode) {
            case 'local':
                courseData = localData;
                break;
            case 'online':
                courseData = onlineData;
                break;
            case 'merge':
                courseData = mergeData(onlineData, localData);
                break;
            default:
                console.error('Invalid mode:', mode);
                return false;
        }

        return courseData && Object.keys(courseData).length > 0;
    } catch (error) {
        console.error('Failed to load course data:', error);
        return false;
    }
}

/**
 * 合并在线和本地数据
 */
function mergeData(online, local) {
    if (!online) return local;
    if (!local) return online;

    const result = JSON.parse(JSON.stringify(online));
    for (const semesterId in local) {
        if (!result[semesterId]) {
            result[semesterId] = local[semesterId];
            continue;
        }

        const o = result[semesterId];
        const l = local[semesterId];

        if (l.semesterStart !== undefined) o.semesterStart = l.semesterStart;
        if (l.totalWeeks !== undefined) o.totalWeeks = l.totalWeeks;
        mergeArray(o, l, 'timeSlots', 'section');
        mergeArray(o, l, 'courses', 'id');
    }
    return result;
}

/**
 * 合并数组，按key覆盖或添加
 */
function mergeArray(target, source, prop, key) {
    if (!source[prop]?.length) return;
    const map = new Map((target[prop] || []).map(i => [i[key], i]));
    for (const item of source[prop]) map.set(item[key], item);
    target[prop] = Array.from(map.values());
}

/**
 * 获取所有可用学期
 * @returns {string[]} - 学期ID数组
 */
function getAvailableSemesters() {
    if (!courseData || typeof courseData !== 'object') {
        return [];
    }
    return Object.keys(courseData);
}

/**
 * 获取学期配置
 * @param {string} semesterId - 学期ID
 * @returns {Object|null} - 学期配置对象，包含每日节次数、时间槽及总周次，失败返回null
 */
function getSemesterConfig(semesterId) {
    if (!courseData?.[semesterId]) return null;

    const semester = courseData[semesterId];
    return {
        totalWeeks: semester.totalWeeks,
        timeSlots: semester.timeSlots,
        dailySectionCount: semester.timeSlots.length
    };
}

/**
 * 获取指定学期的所有课程
 * @param {string} semesterId - 学期ID
 * @returns {Object[]} - 该学期的课程数组
 */
function getCourses(semesterId) {
    return courseData?.[semesterId]?.courses || [];
}

/**
 * 获取指定周次的课程数据
 * @param {string} semesterId - 学期ID
 * @param {number} week - 周次
 * @returns {Object[]} - 该周次的课程数组
 */
function getCoursesByWeek(semesterId, week) {
    const courses = getCourses(semesterId);
    return courses.filter(course => course.weeks.includes(week));
}

/**
 * 获取指定周次和星期的课程数据
 * @param {string} semesterId - 学期ID
 * @param {number} week - 周次
 * @param {number} day - 星期(1-7)
 * @returns {Object[]} - 该天有课的课程数组
 */
function getCoursesByDay(semesterId, week, day) {
    const courses = getCoursesByWeek(semesterId, week);
    return courses.filter(course => course.schedule && course.schedule[day]);
}

/**
 * 获取指定周次的日期
 * @param {string} semesterId - 学期ID
 * @param {number} week - 周次
 * @returns {Object|null} - 格式: {"1": "2025-09-01", "2": "2025-09-02", ...}，周次超出范围返回null
 */
function getWeekDates(semesterId, week) {
    const semester = courseData?.[semesterId];
    if (!semester?.semesterStart || week < 1 || week > semester.totalWeeks) return null;

    const startDate = new Date(semester.semesterStart);
    // 星期几(0=周日, 1=周一, ..., 6=周六)
    const startDay = startDate.getDay();
    // 计算第1周星期一的日期
    const firstWeekMonday = new Date(startDate.getTime() - (startDay === 0 ? 6 : startDay - 1) * 24 * 60 * 60 * 1000);
    // 计算目标周星期一的日期
    const weekStart = new Date(firstWeekMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    const dates = {};

    for (let day = 1; day <= 7; day++) {
        const date = new Date(weekStart.getTime() + (day - 1) * 24 * 60 * 60 * 1000);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');
        dates[day] = `${date.getFullYear()}-${month}-${dayStr}`;
    }

    return dates;
}

/**
 * 根据日期获取周次
 * @param {string} semesterId - 学期ID
 * @param {string} dateStr - 日期字符串，格式: "2025-10-01"
 * @returns {number|null} - 周次，日期超出学期范围返回null
 */
function getWeekByDate(semesterId, dateStr) {
    const semester = courseData?.[semesterId];
    if (!semester?.semesterStart) return null;

    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) return null;

    const startDate = new Date(semester.semesterStart);
    // 星期几(0=周日, 1=周一, ..., 6=周六)
    const startDay = startDate.getDay();
    // 计算第1周星期一的日期
    const firstWeekMonday = new Date(startDate.getTime() - (startDay === 0 ? 6 : startDay - 1) * 24 * 60 * 60 * 1000);

    const diffTime = targetDate.getTime() - firstWeekMonday.getTime();
    const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
    const week = Math.floor(diffDays / 7) + 1;

    if (week < 1 || week > semester.totalWeeks) return null;
    return week;
}

/**
 * 获取当前日期所属的学期和周次
 * @returns {Object|null} - { semesterId, week }，找不到返回null
 */
function getCurrentSemesterAndWeek() {
    const semesters = getAvailableSemesters();
    if (semesters.length === 0) return null;

    // 获取当前日期
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${month}-${day}`;

    // 轮询每个学期，收集 week 不为空的匹配结果
    const matchedSemesters = [];
    for (const semesterId of semesters) {
        const week = getWeekByDate(semesterId, todayStr);
        if (week !== null) {
            matchedSemesters.push({ semesterId, week });
        }
    }

    // 如果有匹配结果，返回开始日期最晚的学期和其周次
    if (matchedSemesters.length > 0) {
        matchedSemesters.sort((a, b) => {
            const dateA = new Date(courseData[a.semesterId]?.semesterStart || 0);
            const dateB = new Date(courseData[b.semesterId]?.semesterStart || 0);
            return dateB.getTime() - dateA.getTime();
        });
        return matchedSemesters[0];
    }

    // 如果没有匹配结果，返回开始日期最晚的学期和 week:0
    const sortedSemesters = [...semesters].sort((a, b) => {
        const dateA = new Date(courseData[a]?.semesterStart || 0);
        const dateB = new Date(courseData[b]?.semesterStart || 0);
        return dateB.getTime() - dateA.getTime();
    });

    return { semesterId: sortedSemesters[0], week: 0 };
}

/**
 * 按关键词查询课程
 * @param {string} semesterId - 学期ID
 * @param {string} keyword - 关键词
 * @returns {Object[]} - 符合条件的所有课程完整数据
 */
function searchCourses(semesterId, keyword) {
    const courses = getCourses(semesterId);
    const lowerKeyword = keyword.toLowerCase();

    return courses.filter(course =>
        course.name?.toLowerCase().includes(lowerKeyword) ||
        course.location?.toLowerCase().includes(lowerKeyword) ||
        course.teacher?.toLowerCase().includes(lowerKeyword)
    );
}

/**
 * 格式化周次数组，合并连续周次
 * @param {number[]} weeks - 周次数组，如 [1,2,3,5,6,7,8,10]
 * @returns {string} - 格式化后的字符串，如 "1-3,5-8,10"
 */
function formatWeeks(weeks) {
    if (!weeks?.length) return '';
    const sorted = [...weeks].sort((a, b) => a - b);
    const result = [];
    let start = sorted[0];
    let prev = start;

    for (let i = 1; i <= sorted.length; i++) {
        const current = sorted[i];
        if (current !== prev + 1) {
            if (start === prev) {
                result.push(String(start));
            } else {
                result.push(`${start}-${prev}`);
            }
            start = current;
        }
        prev = current;
    }
    // 在逗号后添加零宽空格，实现友好换行
    return result.join(',\u200B');
}

export { loadCourse, getAvailableSemesters, getSemesterConfig, getCourses, getCoursesByWeek, getCoursesByDay, getWeekDates, getWeekByDate, getCurrentSemesterAndWeek, searchCourses, formatWeeks };
