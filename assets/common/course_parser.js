/**
 * Course Data Parser
 * 用于解析课程数据JSON文件
 */

let courseData = null;

/**
 * 生成课程特征hash
 */
function genCourseHash(course) {
    const key = `${course.id}|${course.name || ''}|${course.location || ''}|${course.teacher || ''}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

/**
 * 处理重复ID课程 - 优化版本
 */
function resolveDuplicateIds(semesterId) {
    const courses = courseData?.[semesterId]?.courses;
    if (!courses || courses.length === 0) return;

    // 按ID分组
    const idMap = new Map();
    for (const course of courses) {
        if (!idMap.has(course.id)) idMap.set(course.id, []);
        idMap.get(course.id).push(course);
    }

    const processed = [];
    for (const [id, group] of idMap) {
        if (group.length === 1) {
            processed.push(group[0]);
        } else {
            // 一级比对：名称、地点、教师 - 使用 Map 分类
            const diffCourses = [];
            const sameBasicCourses = [];
            const base = group[0];
            const baseKey = `${base.name}|${base.location}|${base.teacher}`;

            for (let i = 1; i < group.length; i++) {
                const c = group[i];
                const key = `${c.name}|${c.location}|${c.teacher}`;
                if (key === baseKey) {
                    sameBasicCourses.push(c);
                } else {
                    diffCourses.push(c);
                }
            }

            // 处理名称/地点/教师不同的课程 -> 重新生成ID
            for (const c of diffCourses) {
                c.id = genCourseHash(c);
                processed.push(c);
            }

            // 处理名称/地点/教师相同的课程
            if (sameBasicCourses.length === 0) {
                processed.push(base);
            } else {
                // 按weeks分组 - 使用 Map 替代 JSON.stringify
                const weeksMap = new Map();
                const baseWeeksSet = new Set(base.weeks || []);
                weeksMap.set(baseWeeksSet, [base]);

                for (const c of sameBasicCourses) {
                    const weeksSet = new Set(c.weeks || []);
                    let found = false;
                    for (const [existingKey, list] of weeksMap) {
                        if (existingKey.size === weeksSet.size &&
                            [...weeksSet].every(w => existingKey.has(w))) {
                            list.push(c);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        weeksMap.set(weeksSet, [c]);
                    }
                }

                // 处理每个 weeks 组
                for (const [weeksSet, coursesGroup] of weeksMap) {
                    const first = coursesGroup[0];
                    if (coursesGroup.length === 1) {
                        // 只有一个，且weeks与base不同 -> 重新生成ID
                        const isSameWeeks = baseWeeksSet.size === weeksSet.size &&
                            [...weeksSet].every(w => baseWeeksSet.has(w));
                        if (!isSameWeeks) {
                            first.id = genCourseHash(first);
                        }
                        processed.push(first);
                    } else {
                        // 多个weeks相同的课程 -> 合并schedule
                        // 使用 Set 优化节次去重
                        for (let i = 1; i < coursesGroup.length; i++) {
                            const c = coursesGroup[i];
                            for (const [day, sections] of Object.entries(c.schedule || {})) {
                                if (!first.schedule[day]) {
                                    first.schedule[day] = [];
                                }
                                const daySet = new Set(first.schedule[day]);
                                for (const s of sections) {
                                    if (!daySet.has(s)) {
                                        first.schedule[day].push(s);
                                        daySet.add(s);
                                    }
                                }
                            }
                            // 排序
                            for (const day of Object.keys(first.schedule)) {
                                first.schedule[day].sort((a, b) => a - b);
                            }
                        }
                        processed.push(first);
                    }
                }
            }
        }
    }
    courseData[semesterId].courses = processed;
}

/**
 * 加载课程数据
 * @param {string} mode - 加载模式: local(本地存储), online(登录缓存), merge(合并加载)
 * @returns {Promise<boolean>} - 加载成功返回true，失败返回false
 */
async function loadCourse(mode) {
    try {
        const loadOnline = mode === 'online' || mode === 'merge';
        const loadLocal = mode === 'local' || mode === 'merge';

        const [onlineData, localData] = await Promise.all([
            loadOnline ? Promise.resolve(localStorage.getItem('course_data')).then(s => s ? JSON.parse(s) : null) : Promise.resolve(null),
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
                courseData = shallowCloneWithMerge(onlineData, localData);
                break;
            default:
                console.error('Invalid mode:', mode);
                return false;
        }

        // 处理每个学期的重复ID课程
        for (const semesterId of Object.keys(courseData || {})) {
            resolveDuplicateIds(semesterId);
        }

        return courseData && Object.keys(courseData).length > 0;
    } catch (error) {
        console.error('Failed to load course data:', error);
        return false;
    }
}

/**
 * 高效深拷贝 - 只拷贝需要合并的属性
 */
function shallowCloneWithMerge(online, local) {
    if (!online) return local;
    if (!local) return online;

    // 深拷贝每个学期数据，避免修改原始 online 数据
    const result = {};
    for (const semesterId in online) {
        result[semesterId] = { ...online[semesterId] };
    }

    for (const semesterId in local) {
        if (!result[semesterId]) {
            result[semesterId] = local[semesterId];
            continue;
        }

        const o = result[semesterId];
        const l = local[semesterId];

        // 只覆盖明确需要更新的字段
        if (l.semesterStart !== undefined) o.semesterStart = l.semesterStart;
        if (l.totalWeeks !== undefined) o.totalWeeks = l.totalWeeks;

        // 合并数组
        if (l.timeSlots?.length) {
            o.timeSlots = mergeTimeSlots(o.timeSlots, l.timeSlots);
        }
        if (l.courses?.length) {
            o.courses = mergeCourses(o.courses, l.courses);
        }
    }
    return result;
}

/**
 * 合并时间槽数组 - 使用扩展运算符创建新数组避免修改原数据
 */
function mergeTimeSlots(target, source) {
    if (!target?.length) return source;
    if (!source?.length) return [...target];
    // 按 section 去重合并，使用扩展运算符创建新数组
    const map = new Map(target.map(t => [t.section, { ...t }]));
    for (const s of source) {
        map.set(s.section, { ...s });
    }
    return Array.from(map.values()).sort((a, b) => a.section - b.section);
}

/**
 * 合并课程数组 - 使用扩展运算符创建新数组避免修改原数据
 */
function mergeCourses(target, source) {
    if (!target?.length) return source;
    if (!source?.length) return [...target];
    // 按 id 去重合并，使用扩展运算符创建新数组
    const map = new Map(target.map(t => [t.id, { ...t }]));
    for (const s of source) {
        map.set(s.id, { ...s });
    }
    return Array.from(map.values());
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
        dailySectionCount: semester.timeSlots.length,
        mergeableSections: semester.mergeableSections || []
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
 * 根据日期获取课程数据
 * @param {string} semesterId - 学期ID
 * @param {string} dateStr - 日期字符串，格式: "2025-09-01"
 * @returns {Object[]|"out"|"none"|null} - 课程数组，"out"表示日期不在学期范围，"none"表示无课程，null表示错误
 */
function getCoursesByDate(semesterId, dateStr) {
    const semester = courseData?.[semesterId];
    if (!semester?.semesterStart) return null;

    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) return null;

    const startDate = new Date(semester.semesterStart);
    const startDay = startDate.getDay();
    const firstWeekMonday = new Date(startDate.getTime() - (startDay === 0 ? 6 : startDay - 1) * 24 * 60 * 60 * 1000);

    const diffTime = targetDate.getTime() - firstWeekMonday.getTime();
    const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
    const week = Math.floor(diffDays / 7) + 1;

    // 日期不在学期范围内
    if (week < 1 || week > semester.totalWeeks) return 'out';

    // 星期几 (1-7, 1=周一)
    const day = targetDate.getDay();
    const dayOfWeek = day === 0 ? 7 : day;

    // 获取该周次的课程
    const courses = getCoursesByWeek(semesterId, week);
    const dayCourses = courses.filter(course => course.schedule && course.schedule[dayOfWeek]);

    return dayCourses.length > 0 ? dayCourses : 'none';
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
    const startDay = startDate.getDay();
    const firstWeekMonday = new Date(startDate.getTime() - (startDay === 0 ? 6 : startDay - 1) * 24 * 60 * 60 * 1000);
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
 * 获取当前日期所属的学期和周次
 * @returns {Object|null} - { semesterId, week }，找不到返回null
 */
function getCurrentSemesterAndWeek() {
    const semesters = getAvailableSemesters();
    if (semesters.length === 0) return null;

    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${month}-${day}`;
    const targetDate = new Date(todayStr);

    // 计算每个学期的周次
    const results = semesters.map(semesterId => {
        const semester = courseData?.[semesterId];
        if (!semester?.semesterStart) return { semesterId, week: 0, startTime: 0 };

        const startDate = new Date(semester.semesterStart);
        const startDay = startDate.getDay();
        const firstWeekMonday = new Date(startDate.getTime() - (startDay === 0 ? 6 : startDay - 1) * 24 * 60 * 60 * 1000);

        const diffTime = targetDate.getTime() - firstWeekMonday.getTime();
        const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
        const week = Math.floor(diffDays / 7) + 1;

        if (week >= 1 && week <= semester.totalWeeks) {
            return { semesterId, week, startTime: startDate.getTime() };
        }
        return { semesterId, week: 0, startTime: startDate.getTime() };
    });

    // 优先筛选匹配周次的，按开始日期降序
    const matched = results.filter(r => r.week > 0);
    if (matched.length > 0) {
        matched.sort((a, b) => b.startTime - a.startTime);
        return { semesterId: matched[0].semesterId, week: matched[0].week };
    }

    // 无匹配周次，返回开始日期最晚的
    const sorted = [...results].sort((a, b) => b.startTime - a.startTime);
    return { semesterId: sorted[0].semesterId, week: 0 };
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
    return result.join(',\u200B');
}

export { loadCourse, getAvailableSemesters, getSemesterConfig, getCourses, getCoursesByWeek, getCoursesByDate, getWeekDates, getCurrentSemesterAndWeek, searchCourses, formatWeeks };
