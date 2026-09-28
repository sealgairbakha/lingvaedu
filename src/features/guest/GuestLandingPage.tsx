import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { GuestCatalog } from "./GuestCatalog";
import { GuestChevron, GuestFooter, GuestHeader } from "./GuestUi";
import "./guest.css";

export default function GuestLandingPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    return () => window.cancelAnimationFrame(frame);
  }, [hash]);

  return <div className="guestPage" id="top">
    <a className="skipContent" href="#guest-main">Перейти к содержимому</a>
    <GuestHeader />
    <main id="guest-main">
      <section className="guestHero" aria-labelledby="guest-hero-title">
        <img className="guestHeroImage" src="/guest/learning-hero.png" alt="Ученица разговаривает с преподавателем по видеосвязи" />
        <div className="guestHeroShade" aria-hidden="true" />
        <div className="guestHeroContent guestContainer">
          <div className="guestEyebrow"><span className="guestLiveDot" /> ЯЗЫК НАЧИНАЕТСЯ С РАЗГОВОРА</div>
          <h1 id="guest-hero-title">Первый урок —<br /><em>уже ваш.</em></h1>
          <p>Попробуйте LingvaEdu в деле: откройте первый урок любого опубликованного курса и учитесь без регистрации.</p>
          <div className="guestHeroActions"><a className="guestButton guestButtonPrimary" href="#trial-courses"><GuestChevron />Выбрать пробный урок</a><a className="guestButton guestButtonGhost" href="#how-it-works"><GuestChevron />Как это работает</a></div>
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

      <GuestCatalog />

      <section className="guestTeacher" id="for-teachers" aria-labelledby="guest-teacher-title">
        <div className="guestContainer guestTeacherInner">
          <div className="guestTeacherCopy"><span className="guestKicker">ДЛЯ ТЕХ, КТО УЧИТ</span><h2 id="guest-teacher-title">Ваши уроки.<br /><em>Ваш подход.</em></h2><p>Создавайте курсы, собирайте задания, работайте с группами и проверяйте результаты в одном пространстве.</p><Link className="guestButton guestButtonLight" to="/welcome/teachers"><GuestChevron />Страница для учителей</Link><small className="guestTeacherNote">Доступ преподавателя назначает администратор.</small></div>
          <div className="guestTeacherIllustration" aria-hidden="true"><div className="guestTeacherPanel"><div className="guestTeacherPanelTop"><span>КОНСТРУКТОР УРОКА</span><span>•••</span></div><div className="guestTeacherPanelTitle"/><div className="guestTeacherPanelLine"/><div className="guestTeacherPanelTile"><span>01</span><i/><i/></div><div className="guestTeacherPanelTile"><span>02</span><i/><i/></div><div className="guestTeacherPanelTile"><span>03</span><i/><i/></div></div><span className="guestTeacherRing" /></div>
        </div>
      </section>

      <section className="guestPricing guestContainer" id="pricing" aria-labelledby="guest-pricing-title">
        <div className="guestPricingHead"><span className="guestKicker">ДЛЯ УЧЕНИКОВ</span><h2 id="guest-pricing-title">Выберите свой формат.</h2><p>Первые уроки бесплатны. Точная цена полного курса указана для каждого доступного формата отдельно.</p></div>
        <div className="guestPricingGrid">
          <article className="guestPriceCard"><span className="guestPriceBadge">ПРОБНЫЙ УРОК</span><h3>Попробуйте бесплатно</h3><p>Первый урок каждого опубликованного курса доступен гостю.</p><div className="guestPriceValue">Бесплатно <small>за первый урок</small></div><div className="guestPriceDivider"/><ul><li>Реальный учебный материал</li><li>Интерактивные задания</li><li>Без создания аккаунта</li></ul><Link className="guestButton guestButtonOutline" to="/welcome/students?category=free#trial-courses"><GuestChevron />Доступные курсы</Link></article>
          <article className="guestPriceCard"><span className="guestPriceBadge">САМОСТОЯТЕЛЬНО</span><h3>В своём темпе</h3><p>Проходите полный курс самостоятельно, когда удобно.</p><div className="guestPriceValue">от 30 000 ₸ <small>за курс · точная цена указана в каталоге</small></div><div className="guestPriceDivider"/><ul><li>Доступные курсы с ценами</li><li>Первый урок бесплатно</li><li>Обучение в своём темпе</li></ul><Link className="guestButton guestButtonOutline" to="/welcome/students?category=self-paced#trial-courses"><GuestChevron />Доступные курсы</Link></article>
          <article className="guestPriceCard guestPriceCardFeatured"><span className="guestPriceBadge">С УЧИТЕЛЕМ</span><h3>С поддержкой учителя</h3><p>Выберите курс, для которого предусмотрен формат с учителем.</p><div className="guestPriceValue">от 50 000 ₸ <small>за курс · точная цена указана в каталоге</small></div><div className="guestPriceDivider"/><ul><li>Доступные курсы с ценами</li><li>Первый урок бесплатно</li><li>Формат с учителем</li></ul><Link className="guestButton guestButtonOutline" to="/welcome/students?category=with-teacher#trial-courses"><GuestChevron />Доступные курсы</Link></article>
        </div>
        <div className="guestTeacherPricingNote"><div><strong>Преподаёте?</strong><span>Курсы, группы и проверка работ — в одном пространстве. Доступ назначает администратор.</span></div><Link to="/welcome/teachers"><GuestChevron />Для учителей</Link></div>
      </section>

      <section className="guestFinal"><div className="guestContainer guestFinalInner"><div><span className="guestKicker">НАЧНИТЕ С ОДНОГО УРОКА</span><h2>Лучший способ понять — попробовать.</h2></div><a className="guestButton guestButtonPrimary" href="#trial-courses"><GuestChevron />Открыть пробный урок</a></div></section>
    </main>
    <GuestFooter />
  </div>;
}
