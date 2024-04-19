/** @jsxImportSource preact */

// @deno-types="preact/types"
import * as preact from 'preact';
import * as hooks from 'preact/hooks';
import { Course, RegularLectureCourse } from '../../../common/course.ts';
import QuickCourseViewControl from './QuickCourseViewControl.tsx';
import QuickCourseViewBody from './QuickCourseViewBody.tsx';
import {
  Filter,
  semesterMap,
  semesterOrdering,
  weekOfDayOrdering,
} from './defs.ts';

const filterCourse = function (courses: Course[], filter: string) {
  if (filter === 'all') {
    return courses;
  }

  const [yearStr, semester] = filter.split('-');
  const year = parseInt(yearStr);
  const yearFiltered = courses.filter((course) => course.fullYear === year);

  if (typeof semester !== 'string') {
    return yearFiltered;
  }

  // TODO: 範囲に共通部分がある場合 (前期と通年, 前期とQ1など) もマッチさせる

  return yearFiltered
    .filter((course) =>
      course.type === 'regular-lecture' && course.semester === semester
    );
};

const compareCourse = function (course1: Course, course2: Course) {
  if (
    course1.type === 'regular-lecture' && course2.type === 'regular-lecture'
  ) {
    // 通常の講義
    if (course1.fullYear !== course2.fullYear) {
      return course1.fullYear - course2.fullYear;
    }
    if (course1.semester !== course2.semester) {
      return semesterOrdering[course1.semester] -
        semesterOrdering[course2.semester];
    }
    if (course1.weekOfDay !== course2.weekOfDay) {
      return weekOfDayOrdering[course1.weekOfDay] -
        weekOfDayOrdering[course2.weekOfDay];
    }
    const periodDiff = (course1.period[1] - course2.period[1]) * 10 -
      (course1.period[0] - course2.period[0]);
    if (periodDiff !== 0) {
      return periodDiff;
    }

    return course1.code - course2.code;
  } else if (course1.type === 'special' && course2.type === 'special') {
    // 特殊な講義
    if (course1.fullYear !== course2.fullYear) {
      return (course1.fullYear ?? 10000) - (course2.fullYear ?? 10000);
    }

    return course1.fullName < course2.fullName ? -1 : 1;
  } else if (course1.type !== 'regular-lecture') {
    // 通常の講義を優先する
    return 1;
  } else if (course2.type !== 'regular-lecture') {
    // 通常の講義を優先する
    return -1;
  }

  return 0;
};

const QuickCourseView = (props: { courses: Course[] }) => {
  const courses = props.courses;
  const regularCourses = courses
    .filter((course) =>
      course.type === 'regular-lecture'
    ) as RegularLectureCourse[];

  const date = new Date();
  const shiftedDate = new Date(
    getFiscalYear(date),
    date.getMonth() - 3, // 1月=0-3=-3, 3月=2-3=-1, 4月=3-3=0, 9月=8-3=5, 10月=9-3=6, 12月=11-3=8
    date.getDate(),
  );
  // 現在の年と前期/後期のフィルターを最初に選択する
  const [filter, setFilter] = hooks.useState<Filter>(getFilterExp(shiftedDate));

  const filters = [
    { display: 'すべて', value: 'all' },
  ];
  // 年, 学期の組によるフィルター
  const semestersMap = new Map<
    string,
    [RegularLectureCourse['fullYear'], RegularLectureCourse['semester']]
  >();
  regularCourses.forEach((course) => {
    semestersMap.set(`${course.fullYear}-${course.semester}`, [
      course.fullYear,
      course.semester,
    ]);
  });
  semestersMap.set(
    getFilterExp(shiftedDate),
    [shiftedDate.getFullYear(), getSemesterExp(shiftedDate)],
  );
  const semesters = Array.from(semestersMap.values()).sort((a, b) => {
    if (a[0] !== b[0]) {
      return a[0] - b[0];
    }
    return semesterOrdering[a[1]] - semesterOrdering[b[1]];
  });
  // 年だけのフィルター
  const years = Array.from(
    new Set(regularCourses.map((course) => course.fullYear)),
  ).sort();

  // fileterにフィルター項目を登録
  semesters.forEach(([year, semester]) => {
    filters.push({
      display: getFilterDisplayExp(date, year, semesterMap[semester]),
      value: getFilterExp(date, year, semester),
    });
  });
  years.forEach((year) => {
    filters.push({
      display: `${year}年`,
      value: `${year}`,
    });
  });

  const filterDisplay = getFilterDisplayExp();

  return (
    <div id='moodle_ext_quick_course_view' className='card-body p-3'>
      <h5 class='card-title d-inline'>コースリンク</h5>
      <div className='card-text content mt-3'>
        <div
          className='block-quickcouseview block-cards'
          data-region='quickcouseview'
          role='navigation'
        >
          <hr className='mt-0' />
          <QuickCourseViewControl
            filterDisplay={filterDisplay}
            filterValue={filter}
            setFilter={setFilter}
            filterList={filters}
          />
          <QuickCourseViewBody
            courses={filterCourse(courses, filter).sort(compareCourse)}
          />
        </div>
        <div className='footer'></div>
      </div>
    </div>
  );
};

const renderQuickCourseView = function (
  courses: Course[],
  targetElement: HTMLElement,
) {
  preact.render(
    <QuickCourseView courses={courses} />,
    targetElement,
  );
};

/**
 * Filterの表現を取得する
 * @param {Date} date
 * @returns {string} 2024-1/2 みたいなやつ
 */
function getFilterExp(date?: Date, year?: number, semester?: string): string {
  // 雑な実装
  if (date == null) {
    date = new Date();
  }
  if (year == null) {
    year = date.getFullYear();
  }
  if (semester == null) {
    semester = getSemesterExp(date);
  }
  return `${year}-${semester}`;
}

/**
 * 学期の表現を取得する
 * @param {Date} date
 * @returns {string}
 */
function getSemesterExp(date: Date) {
  return date.getMonth() < 6 ? '1/2' : '2/2';
}

/**
 * フィルターの表示項目を取得する
 * @param date
 * @param year
 * @param semester
 * @returns "2024年 前期" みたいなやつ
 */
function getFilterDisplayExp(
  date?: Date,
  year?: number,
  semester?: string,
): string {
  // yearとsemesterが両方あるときはdateいらないみたいにしたい…。
  // 雑な実装
  if (date == null) {
    date = new Date();
  }
  if (year == null) {
    year = getFiscalYear(date);
  }
  if (semester == null) {
    semester = getTermLetter(date) + '期';
  }
  return `${year}年 ${semester}`;
  // return getFiscalYear(nowDate) + '年' + getTermLetter(nowDate);
}

/**
 * 与えられた日付が前期か後期か判定したものを返します。
 * @param {Date} date 日付
 * @return {string} 前期なら前, 後期なら後を返す
 */
function getTermLetter(date: Date): string {
  const month = date.getMonth() + 1; // Monthは0-index
  return 4 <= month && month <= 9 ? '前' : '後';
}

/**
 * 年度にあたる数字を返す。
 * 例: 2022年4月～12月 & 2023年1月～3月 -> 2022
 * @param {Date} date
 * @return {number} 年度 対象外の場合-1
 */
function getFiscalYear(date: Date): number {
  // 年度で指定できるようにするところ。
  const month = date.getMonth() + 1; // Monthは0-index

  if (1 <= month && month <= 3) {
    return Number(date.getFullYear() - 1);
  } else if (4 <= month && month <= 12) {
    return Number(date.getFullYear());
  } else {
    console.error('cannot get fisical year');
    return -1;
  }
}

export { renderQuickCourseView };
