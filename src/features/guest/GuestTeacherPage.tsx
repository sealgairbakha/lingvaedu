import { Link } from "react-router-dom";
import { GuestChevron, GuestFooter, GuestHeader } from "./GuestUi";
import "./guest.css";

export default function GuestTeacherPage() {
  return <div className="guestPage guestAudiencePage">
    <a className="skipContent" href="#teacher-main">Перейти к содержимому</a>
    <GuestHeader active="teachers" />
    <main id="teacher-main">
      <section className="guestAudienceHero guestTeacherAudienceHero" aria-labelledby="teacher-hero-title">
        <div className="guestContainer guestTeacherAudienceInner">
          <div className="guestTeacherAudienceCopy">
            <span className="guestAudienceLabel">LINGVAEDU ДЛЯ ПРЕПОДАВАТЕЛЕЙ</span>
            <h1 id="teacher-hero-title">Ваш курс.<br /><em>Ваш способ учить.</em></h1>
            <p>Собирайте уроки из материалов и заданий, работайте с группами и проверяйте результаты учеников в одном пространстве.</p>
            <div className="guestHeroActions"><a className="guestButton guestButtonPrimary" href="#teacher-tools"><GuestChevron />Посмотреть возможности</a><Link className="guestButton guestButtonGhost" to="/welcome/students#trial-courses"><GuestChevron />Открыть пробный урок</Link></div>
          </div>
          <div className="guestTeacherIllustration" aria-hidden="true"><div className="guestTeacherPanel"><div className="guestTeacherPanelTop"><span>КОНСТРУКТОР УРОКА</span><span>•••</span></div><div className="guestTeacherPanelTitle"/><div className="guestTeacherPanelLine"/><div className="guestTeacherPanelTile"><span>01</span><i/><i/></div><div className="guestTeacherPanelTile"><span>02</span><i/><i/></div><div className="guestTeacherPanelTile"><span>03</span><i/><i/></div></div><span className="guestTeacherRing" /></div>
        </div>
      </section>

      <section className="guestTeacherTools guestContainer" id="teacher-tools" aria-labelledby="teacher-tools-title">
        <div className="guestTeacherToolsHead"><h2 id="teacher-tools-title">От замысла урока<br />до результата ученика.</h2><p>В LingvaEdu инструменты преподавателя связаны с учебным процессом: материалами, группами и выполненными заданиями.</p></div>
        <div className="guestTeacherToolRows">
          <article><span>01 / КУРС</span><h3>Создайте структуру обучения</h3><p>Объединяйте уроки в модули и добавляйте текст, медиа и практические блоки.</p></article>
          <article><span>02 / ГРУППА</span><h3>Организуйте учеников</h3><p>Назначайте опубликованные курсы учебным группам через рабочее пространство.</p></article>
          <article><span>03 / ПРОВЕРКА</span><h3>Следите за прохождением</h3><p>Получайте отправленные работы, проверяйте задания и смотрите отчёты.</p></article>
        </div>
      </section>

      <section className="guestTeacherAccess" aria-labelledby="teacher-access-title"><div className="guestContainer guestTeacherAccessInner"><div><span className="guestKicker">ДОСТУП И УСЛОВИЯ</span><h2 id="teacher-access-title">Рабочее пространство для преподавателя.</h2><p>Права преподавателя назначает администратор. Точный тариф пока не опубликован; обычная регистрация сама по себе не открывает редактор курсов.</p></div><Link className="guestButton guestButtonLight" to="/"><GuestChevron />Войти в кабинет</Link></div></section>
    </main>
    <GuestFooter />
  </div>;
}
