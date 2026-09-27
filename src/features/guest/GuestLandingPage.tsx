import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { loadGuestCourses, type GuestCourse } from "./guestTrialData";
import "./guest.css";

function Brand() {
  return <Link className="guestBrand" to="/welcome" aria-label="LingvaEdu — главная для гостей">
    <span className="guestBrandMark">lv</span>
    <span>Lingva<span>Edu</span></span>
  </Link>;
}

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true" className="guestArrow">{diagonal ? "↗" : "→"}</span>;
}

function CourseCard({ course, index }: { course: GuestCourse; index: number }) {
  return <article className="guestCourseCard">
    <div className="guestCourseVisual">
      {course.coverImage && <img className="guestCourseCoverImage" src={course.coverImage} alt="" loading="lazy" />}
      <span className="guestCourseIndex">{String(index + 1).padStart(2, "0")}</span>
      <span className="guestCourseOrbit" aria-hidden="true" />
      <span className="guestCourseVisualLabel">{course.language || "Языковой курс"}</span>
    </div>
    <div className="guestCourseBody">
      <div className="guestCourseMeta"><span>ПРОБНЫЙ УРОК</span>{course.level && <span>{course.level}</span>}</div>
      <h3>{course.title}</h3>
      <p>{course.description || `Первый урок — «${course.lessonTitle}». Попробуйте без регистрации.`}</p>
      <div className="guestCourseFoot"><span>01 / {course.lessonTitle}</span><Link to={`/trial/${encodeURIComponent(course.courseId)}`} aria-label={`Открыть пробный урок курса ${course.title}`}><Arrow diagonal /></Link></div>
    </div>
  </article>;
}

export default function GuestLandingPage() {
  const { hash } = useLocation();
  const [courses, setCourses] = useState<GuestCourse[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    loadGuestCourses().then((result) => {
      if (active) { setCourses(result); setStatus("ready"); }
    }).catch((caught: unknown) => {
      if (active) { setError(caught instanceof Error ? caught.message : "Не удалось загрузить курсы."); setStatus("error"); }
    });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    if (!hash) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    return () => window.cancelAnimationFrame(frame);
  }, [hash]);

  return <div className="guestPage" id="top">
    <a className="skipContent" href="#guest-main">Перейти к содержимому</a>
    <header className="guestHeader">
      <div className="guestHeaderInner"><Brand /><nav aria-label="Основная навигация"><a href="#trial-courses">Пробные уроки</a><a href="#for-teachers">Для учителей</a><a href="#pricing">Цены</a></nav><Link className="guestHeaderLogin" to="/">Войти <Arrow diagonal /></Link></div>
    </header>
    <main id="guest-main">
      <section className="guestHero" aria-labelledby="guest-hero-title">
        <img className="guestHeroImage" src="/guest/learning-hero.png" alt="Ученица разговаривает с преподавателем по видеосвязи" />
        <div className="guestHeroShade" aria-hidden="true" />
        <div className="guestHeroContent guestContainer">
          <div className="guestEyebrow"><span className="guestLiveDot" /> ЯЗЫК НАЧИНАЕТСЯ С РАЗГОВОРА</div>
          <h1 id="guest-hero-title">Первый урок —<br /><em>уже ваш.</em></h1>
          <p>Попробуйте LingvaEdu в деле: откройте первый урок любого опубликованного курса и учитесь без регистрации.</p>
          <div className="guestHeroActions"><a className="guestButton guestButtonPrimary" href="#trial-courses">Выбрать пробный урок <Arrow diagonal /></a><a className="guestButton guestButtonGhost" href="#how-it-works">Как это работает <Arrow /></a></div>
          <span className="guestHeroNote">Без аккаунта · Реальный урок из курса</span>
        </div>
        <div className="guestHeroSideNote" aria-hidden="true"><span>LINGVAEDU / OPEN LESSON</span><span>01 — BEGIN</span></div>
      </section>

      <section className="guestSteps guestContainer" id="how-it-works" aria-labelledby="guest-steps-title">
        <div className="guestSectionLead"><span className="guestKicker">НАЧНИТЕ ЗДЕСЬ</span><h2 id="guest-steps-title">Сначала попробуйте.<br />Потом решите.</h2></div>
        <div className="guestStepsGrid">
          <article><span className="guestStepNumber">01</span><h3>Выберите курс</h3><p>В каталоге доступны первые уроки опубликованных курсов.</p></article>
          <article><span className="guestStepNumber">02</span><h3>Откройте урок</h3><p>Смотрите материалы и выполняйте интерактивные задания без аккаунта.</p></article>
          <article><span className="guestStepNumber">03</span><h3>Продолжайте с нами</h3><p>Для полного курса и сохранения прогресса понадобится доступ к обучению.</p></article>
        </div>
      </section>

      <section className="guestCatalog" id="trial-courses" aria-labelledby="guest-catalog-title">
        <div className="guestContainer">
          <div className="guestCatalogHead"><div><span className="guestKicker">ОТКРЫТЫЙ ДОСТУП</span><h2 id="guest-catalog-title">Выберите первый урок.</h2><p>Это настоящие уроки курсов, а не отдельная демонстрация.</p></div><span className="guestCatalogCount">{status === "ready" ? String(courses.length).padStart(2, "0") : "—"}<small>курсов</small></span></div>
          {status === "loading" && <div className="guestCatalogMessage" role="status">Загружаем доступные уроки…</div>}
          {status === "error" && <div className="guestCatalogMessage" role="alert"><p>{error}</p><button type="button" className="guestButton guestButtonPrimary" onClick={() => { setStatus("loading"); setRetry((value) => value + 1); }}>Попробовать ещё раз <Arrow /></button></div>}
          {status === "ready" && courses.length === 0 && <div className="guestCatalogMessage"><h3>Пробных уроков пока нет</h3><p>Здесь появится первый урок каждого опубликованного курса.</p></div>}
          {status === "ready" && courses.length > 0 && <div className="guestCourseGrid">{courses.map((course, index) => <CourseCard key={course.courseId} course={course} index={index} />)}</div>}
        </div>
      </section>

      <section className="guestTeacher" id="for-teachers" aria-labelledby="guest-teacher-title">
        <div className="guestContainer guestTeacherInner">
          <div className="guestTeacherCopy"><span className="guestKicker">ДЛЯ ТЕХ, КТО УЧИТ</span><h2 id="guest-teacher-title">Ваши уроки.<br /><em>Ваш подход.</em></h2><p>Создавайте курсы, собирайте задания, работайте с группами и проверяйте результаты в одном пространстве.</p><Link className="guestButton guestButtonLight" to="/">Войти в рабочее пространство <Arrow diagonal /></Link><small className="guestTeacherNote">Доступ преподавателя назначает администратор.</small></div>
          <div className="guestTeacherIllustration" aria-hidden="true"><div className="guestTeacherPanel"><div className="guestTeacherPanelTop"><span>КОНСТРУКТОР УРОКА</span><span>•••</span></div><div className="guestTeacherPanelTitle"/><div className="guestTeacherPanelLine"/><div className="guestTeacherPanelTile"><span>01</span><i/><i/></div><div className="guestTeacherPanelTile"><span>02</span><i/><i/></div><div className="guestTeacherPanelTile"><span>03</span><i/><i/></div></div><span className="guestTeacherRing" /></div>
        </div>
      </section>

      <section className="guestPricing guestContainer" id="pricing" aria-labelledby="guest-pricing-title">
        <div className="guestPricingHead"><span className="guestKicker">СТОИМОСТЬ</span><h2 id="guest-pricing-title">Прозрачный старт.</h2><p>Пробный урок открыт без регистрации. Условия полного обучения и работы учителя публикуются отдельно.</p></div>
        <div className="guestPricingGrid">
          <article className="guestPriceCard"><span className="guestPriceBadge">ДЛЯ УЧЕНИКОВ</span><h3>Учитесь в своём ритме</h3><p>Первый урок каждого опубликованного курса доступен гостю.</p><div className="guestPriceValue">Бесплатно <small>за пробный урок</small></div><div className="guestPriceDivider"/><ul><li>Реальный учебный материал</li><li>Интерактивные задания</li><li>Без создания аккаунта</li></ul><a className="guestButton guestButtonOutline" href="#trial-courses">Выбрать урок <Arrow diagonal /></a><p className="guestPriceFootnote">Стоимость полного курса уточняется.</p></article>
          <article className="guestPriceCard guestPriceCardTeacher"><span className="guestPriceBadge">ДЛЯ УЧИТЕЛЕЙ</span><h3>Создавайте своё пространство</h3><p>Курсы, задания и группы — в одной системе.</p><div className="guestPriceValue">Уточняется <small>тариф для преподавателей</small></div><div className="guestPriceDivider"/><ul><li>Редактор курсов и уроков</li><li>Управление группами</li><li>Проверка работ и отчёты</li></ul><Link className="guestButton guestButtonOutline" to="/">Войти в кабинет <Arrow diagonal /></Link><p className="guestPriceFootnote">Доступ преподавателя назначает администратор.</p></article>
        </div>
      </section>

      <section className="guestFinal"><div className="guestContainer guestFinalInner"><div><span className="guestKicker">НАЧНИТЕ С ОДНОГО УРОКА</span><h2>Лучший способ понять — попробовать.</h2></div><a className="guestButton guestButtonPrimary" href="#trial-courses">Открыть пробный урок <Arrow diagonal /></a></div></section>
    </main>
    <footer className="guestFooter guestContainer"><Brand /><span>© {new Date().getFullYear()} LingvaEdu</span><Link to="/">Вход в кабинет <Arrow diagonal /></Link></footer>
  </div>;
}
