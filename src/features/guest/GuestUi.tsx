import { Link } from "react-router-dom";
import { ActionChevron } from "../../components/ActionChevron";

export function GuestChevron({ back = false }: { back?: boolean }) {
  return <span className={back ? "guestChevron guestChevronBack" : "guestChevron"}><ActionChevron /></span>;
}

export function GuestBrand() {
  return <Link className="guestBrand" to="/welcome" aria-label="LingvaEdu — главная для гостей">Lingva<span>Edu</span></Link>;
}

export function GuestHeader({ active }: { active?: "students" | "teachers" }) {
  return <header className="guestHeader">
    <div className="guestHeaderInner">
      <GuestBrand />
      <nav aria-label="Основная навигация">
        <Link to="/welcome/students" aria-current={active === "students" ? "page" : undefined}>Для учеников</Link>
        <Link to="/welcome/teachers" aria-current={active === "teachers" ? "page" : undefined}>Для учителей</Link>
        <Link to="/welcome#pricing">Цены</Link>
      </nav>
      <Link className="guestHeaderLogin" to="/">Войти</Link>
    </div>
  </header>;
}

export function GuestFooter() {
  return <footer className="guestFooter guestContainer"><GuestBrand /><span>© {new Date().getFullYear()} LingvaEdu</span><Link to="/"><GuestChevron />Вход в кабинет</Link></footer>;
}
