import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadGuestCourses, type GuestCourse, type StudentCategory } from "./guestTrialData";
import { GuestChevron } from "./GuestUi";

const priceLabel = (price: number) => `${price.toLocaleString("ru-RU")} ₸`;

function CourseCard({ course, index, category }: { course: GuestCourse; index: number; category: StudentCategory }) {
  const price = category === "self-paced" ? course.selfPacedPriceKzt : category === "with-teacher" ? course.withTeacherPriceKzt : null;
  return <article className="guestCourseCard">
    <Link className="guestCourseLink" to={`/trial/${encodeURIComponent(course.courseId)}`} aria-label={`Открыть пробный урок курса ${course.title}`}>
      <div className="guestCourseVisual">
        {course.coverImage && <img className="guestCourseCoverImage" src={course.coverImage} alt="" loading="lazy" />}
        <span className="guestCourseIndex">{String(index + 1).padStart(2, "0")}</span>
        <span className="guestCourseOrbit" aria-hidden="true" />
        <span className="guestCourseVisualLabel">{course.language || "Языковой курс"}</span>
      </div>
      <div className="guestCourseBody">
        <div className="guestCourseMeta"><span>{category === "free" ? "ПРОБНЫЙ УРОК" : category === "self-paced" ? "САМОСТОЯТЕЛЬНО" : "С УЧИТЕЛЕМ"}</span>{course.level && <span>{course.level}</span>}</div>
        <h3>{course.title}</h3>
        <p>{course.description || `Первый урок — «${course.lessonTitle}». Попробуйте без регистрации.`}</p>
        {price !== null && <div className="guestCoursePrice">{priceLabel(price)} <small>за курс · первый урок бесплатно</small></div>}
        <div className="guestCourseFoot"><span>01 / {course.lessonTitle}</span><span className="guestCourseOpen"><GuestChevron />Открыть урок</span></div>
      </div>
    </Link>
  </article>;
}

export function GuestCatalog({ title = "Выберите первый урок.", intro = "Это настоящие уроки курсов, а не отдельная демонстрация.", category = "free" }: { title?: string; intro?: string; category?: StudentCategory }) {
  const [courses, setCourses] = useState<GuestCourse[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    loadGuestCourses(category).then((result) => {
      if (active) { setCourses(result); setStatus("ready"); }
    }).catch((caught: unknown) => {
      if (active) { setError(caught instanceof Error ? caught.message : "Не удалось загрузить курсы."); setStatus("error"); }
    });
    return () => { active = false; };
  }, [retry, category]);

  return <section className="guestCatalog" id="trial-courses" aria-labelledby="guest-catalog-title">
    <div className="guestContainer">
      <div className="guestCatalogHead"><div><span className="guestKicker">ОТКРЫТЫЙ ДОСТУП</span><h2 id="guest-catalog-title">{title}</h2><p>{intro}</p></div><span className="guestCatalogCount">{status === "ready" ? String(courses.length).padStart(2, "0") : "—"}<small>курсов</small></span></div>
      {status === "loading" && <div className="guestCatalogMessage" role="status">Загружаем доступные уроки…</div>}
      {status === "error" && <div className="guestCatalogMessage" role="alert"><p>{error}</p><button type="button" className="guestButton guestButtonPrimary" onClick={() => { setStatus("loading"); setRetry((value) => value + 1); }}><GuestChevron />Попробовать ещё раз</button></div>}
      {status === "ready" && courses.length === 0 && <div className="guestCatalogMessage"><h3>{category === "free" ? "Пробных уроков пока нет" : "Курсов в этой категории пока нет"}</h3><p>{category === "free" ? "Здесь появится первый урок каждого опубликованного курса." : "Здесь появятся опубликованные курсы, которым назначены эта категория и цена."}</p></div>}
      {status === "ready" && courses.length > 0 && <div className="guestCourseGrid">{courses.map((course, index) => <CourseCard key={course.courseId} course={course} index={index} category={category} />)}</div>}
    </div>
  </section>;
}
