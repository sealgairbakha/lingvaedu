import { useNavigate } from "react-router-dom";

const permissions = [
  ["Курсы", "Просмотр и редактирование всех", "Просмотр и редактирование всех", "Только назначенные опубликованные"],
  ["Учебные группы", "Управление", "Управление", "Нет доступа к управлению"],
  ["Пользователи и роли", "Управление", "Нет доступа", "Нет доступа"],
  ["Центр проверки заданий", "Доступен", "Нет доступа к разделу", "Отправка работ внутри уроков"],
  ["Отчёты платформы", "Просмотр и экспорт", "Нет доступа", "Нет доступа"],
  ["Видеокомнаты", "Создание и вход по ссылке", "Создание и вход по ссылке", "Вход по ссылке"],
];

export function RolesPage() {
  const navigate = useNavigate();
  return <main className="content fade">
    <div className="pageTitle"><div><h1>Роли и права</h1><p>Действующие уровни доступа на платформе.</p></div><button className="btn primary" onClick={() => navigate("/users")}>Управлять пользователями</button></div>
    <div className="platformNotice"><span>Роль назначается в карточке пользователя. Права действуют для всего аккаунта; настройки внешнего вида не меняют доступ к данным.</span></div>
    <section className="panel reportCoursePanel"><div className="panelHead"><div><h2>Матрица доступа</h2><p>Три системные роли: администратор, наставник и ученик.</p></div></div>
      <div className="reportTableScroll" tabIndex={0} role="region" aria-label="Права системных ролей"><table className="reportTable"><thead><tr><th scope="col">Раздел</th><th scope="col">Администратор</th><th scope="col">Наставник</th><th scope="col">Ученик</th></tr></thead><tbody>{permissions.map(([feature, ...values]) => <tr key={feature}><th scope="row">{feature}</th>{values.map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table></div>
    </section>
    <p className="reportMethod">Пользовательские наборы разрешений пока не поддерживаются. Наставники могут работать со всеми курсами и группами; ученики получают курсы через назначение в группу.</p>
  </main>;
}
