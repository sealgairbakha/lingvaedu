import { useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { GuestCatalog } from "./GuestCatalog";
import type { StudentCategory } from "./guestTrialData";
import { GuestChevron, GuestFooter, GuestHeader } from "./GuestUi";
import "./guest.css";

export default function GuestStudentPage() {
  const { hash } = useLocation();
  const [searchParams] = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const category: StudentCategory = requestedCategory === "self-paced" || requestedCategory === "with-teacher" ? requestedCategory : "free";

  useEffect(() => {
    if (!hash) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    return () => window.cancelAnimationFrame(frame);
  }, [hash]);

  return <div className="guestPage guestAudiencePage">
    <a className="skipContent" href="#student-main">Перейти к содержимому</a>
    <GuestHeader active="students" />
    <main id="student-main">
      <section className="guestAudienceHero guestStudentHero" aria-labelledby="student-hero-title">
        <img src="/guest/learning-hero.png" alt="Ученица занимается языком по видеосвязи" />
        <div className="guestContainer guestAudienceHeroInner">
          <span className="guestAudienceLabel">LINGVAEDU ДЛЯ УЧЕНИКОВ</span>
          <h1 id="student-hero-title">Начните с урока.<br /><em>Найдите свой формат.</em></h1>
          <p>Первый урок — бесплатно и без регистрации. Посмотрите доступные курсы для самостоятельного обучения или занятий с учителем.</p>
          <div className="guestHeroActions"><a className="guestButton guestButtonPrimary" href="#trial-courses"><GuestChevron />Выбрать урок</a><Link className="guestButton guestButtonGhost" to="/welcome/teachers"><GuestChevron />Я преподаватель</Link></div>
        </div>
      </section>

      <div className="guestAudienceRibbon"><div className="guestContainer"><span>Первый урок каждого опубликованного курса</span><span>Задания можно попробовать сразу</span><span>Прогресс гостя не сохраняется</span></div></div>

      <nav className="guestStudentCategories guestContainer" aria-label="Категории обучения">
        <Link to="?category=free#trial-courses" aria-current={category === "free" ? "page" : undefined}><strong>Бесплатно</strong><span>Первый урок каждого курса</span></Link>
        <Link to="?category=self-paced#trial-courses" aria-current={category === "self-paced" ? "page" : undefined}><strong>Самостоятельно</strong><span>От 30 000 ₸ за курс</span></Link>
        <Link to="?category=with-teacher#trial-courses" aria-current={category === "with-teacher" ? "page" : undefined}><strong>С учителем</strong><span>От 50 000 ₸ за курс</span></Link>
      </nav>

      <GuestCatalog key={category} category={category} title={category === "free" ? "Пробные уроки." : category === "self-paced" ? "Курсы для самостоятельного обучения." : "Курсы с учителем."} intro={category === "free" ? "Первый урок каждого опубликованного курса открыт без регистрации." : "Выберите курс и посмотрите его первый урок бесплатно. Полный курс доступен после назначения обучения."} />

      <section className="guestAudienceAfter guestContainer" aria-labelledby="student-after-title">
        <div><span className="guestKicker">ПОСЛЕ ПРОБНОГО УРОКА</span><h2 id="student-after-title">Хотите продолжить?</h2><p>Для полного курса и сохранения прогресса понадобится аккаунт и доступ к обучению. Пробный урок останется доступен без регистрации.</p></div>
        <div className="guestAudienceAction"><strong>Первый урок — бесплатно</strong><span>без регистрации</span><p>Для продолжения курса потребуется аккаунт и назначение доступа.</p><Link className="guestButton guestButtonOutline" to="/?register=1"><GuestChevron />Создать аккаунт</Link></div>
      </section>
    </main>
    <GuestFooter />
  </div>;
}
