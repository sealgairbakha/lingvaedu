"use client";

import { useMemo, useState } from "react";

type View = "learn" | "lesson" | "admin" | "users";
type Unit = { id: number; number: string; title: string; subtitle: string; duration: string; progress: number; color: string; locked?: boolean };

const initialUnits: Unit[] = [
  { id: 1, number: "01", title: "First conversations", subtitle: "Знакомство и первые фразы", duration: "35 мин", progress: 100, color: "yellow" },
  { id: 2, number: "02", title: "Around the city", subtitle: "Город, транспорт и направления", duration: "45 мин", progress: 64, color: "blue" },
  { id: 3, number: "03", title: "Food & feelings", subtitle: "Еда, эмоции и предпочтения", duration: "40 мин", progress: 0, color: "pink" },
  { id: 4, number: "04", title: "Plans and dreams", subtitle: "Планы, мечты и будущее", duration: "50 мин", progress: 0, color: "green", locked: true },
];

const users = [
  { initials: "AK", name: "Алия Касымова", email: "aliya.k@mail.kz", plan: "Premium", course: "English A1", progress: 68, color: "#d9f0dd" },
  { initials: "MI", name: "Марат Ибраев", email: "m.ibrayev@gmail.com", plan: "Standard", course: "Русский B1", progress: 41, color: "#dfe9fb" },
  { initials: "AD", name: "Алина Досова", email: "adosova@mail.ru", plan: "Premium", course: "English A2", progress: 84, color: "#f8e1d8" },
  { initials: "NS", name: "Нурлан Садыков", email: "n.sadykov@gmail.com", plan: "Trial", course: "Қазақ тілі A1", progress: 12, color: "#eee5ce" },
];

function Mark() { return <div className="mark" aria-label="Lingva"><i>L</i><span>lingva</span></div>; }

function Header({ view, setView }: { view: View; setView: (v: View) => void }) {
  return <header className="header"><button className="logoButton" onClick={() => setView("learn")}><Mark /></button>
    <nav><button className={view === "learn" || view === "lesson" ? "active" : ""} onClick={() => setView("learn")}>Обучение</button><button>Разговорный клуб</button><button>Словарь</button></nav>
    <div className="headerActions"><button className="streak"><span>🔥</span> 7 дней</button><button className="iconBtn" aria-label="Уведомления">♢<b /></button><button className="avatar" onClick={() => setView("admin")}>A</button></div>
  </header>;
}

function Dashboard({ units, setView }: { units: Unit[]; setView: (v: View) => void }) {
  return <main className="dashboard pageIn">
    <section className="welcome"><div><p className="eyebrow">СРЕДА, 12 АВГУСТА</p><h1>Добрый день, <em>Айжан!</em></h1><p>Продолжим двигаться к свободному английскому?</p></div><div className="today"><span>ПЛАН НА СЕГОДНЯ</span><strong>15 <small>минут</small></strong><div><i style={{width:"60%"}} /></div></div></section>
    <section className="continueCard"><div className="continueText"><div className="tinyLabel">ПРОДОЛЖИТЬ УРОК</div><div className="unitMeta">UNIT 2 <span /> УРОК 4 ИЗ 6</div><h2>Asking for directions</h2><p>Научимся спрашивать дорогу и понимать простые указания.</p><button className="primary" onClick={() => setView("lesson")}>Продолжить <span>→</span></button></div><div className="illustration"><div className="sun"/><div className="bubble one">WHERE?</div><div className="bubble two">TURN LEFT!</div><div className="road"/><div className="person">●<i/></div></div></section>
    <section className="unitsHead"><div><p className="eyebrow">КУРС ENGLISH A1</p><h2>Ваш путь</h2></div><div className="progressSummary"><strong>37%</strong><span>12 из 32 уроков</span></div></section>
    <div className="unitsGrid">{units.map((u) => <article className={`unitCard ${u.color} ${u.locked ? "locked" : ""}`} key={u.id} onClick={() => !u.locked && setView("lesson")}><div className="unitTop"><span>{u.number}</span>{u.locked ? <b>🔒</b> : u.progress === 100 ? <b className="done">✓</b> : <b>{u.duration}</b>}</div><div><h3>{u.title}</h3><p>{u.subtitle}</p></div><div className="unitProgress"><i style={{width:`${u.progress}%`}} /></div><small>{u.locked ? "Откроется после Unit 3" : u.progress === 100 ? "Завершено" : u.progress ? `${u.progress}% пройдено` : "Начать Unit"}</small></article>)}</div>
  </main>;
}

function Lesson({ setView }: { setView: (v: View) => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  return <main className="lesson pageIn"><button className="back" onClick={() => setView("learn")}>← &nbsp; Вернуться к курсу</button><div className="lessonBar"><span>UNIT 2 · УРОК 4</span><div><i /></div><b>2 / 5</b></div>
    <section className="lessonBody"><div className="lessonCopy"><span className="lessonType">МИНИ-ДИАЛОГ</span><h1>Как спросить дорогу?</h1><p className="lead">Послушайте диалог, а затем выберите правильный ответ.</p><div className="dialog"><div><span className="speaker blueA">A</span><p><small>EXCUSE ME,</small> could you tell me how to get to the station?</p><button>▶ <span>0:04</span></button></div><div><span className="speaker coralA">B</span><p>Sure! Go straight and <mark>turn left</mark> at the traffic lights.</p><button>▶ <span>0:05</span></button></div></div></div>
    <aside className="taskCard"><span className="taskNum">ЗАДАНИЕ 1</span><h3>Куда нужно повернуть?</h3><div className="answers">{["Направо","Налево","Идти прямо"].map((a,i)=><button onClick={()=>setChoice(i)} className={choice===i?"selected":""} key={a}><i>{String.fromCharCode(65+i)}</i>{a}<span>{choice===i?"✓":""}</span></button>)}</div><button className="check" disabled={choice===null}>{choice === 1 ? "Верно! Продолжить →" : "Проверить"}</button></aside></section>
  </main>;
}

function Admin({ units, setUnits, setView }: { units: Unit[]; setUnits: (u: Unit[]) => void; setView: (v: View) => void }) {
  const [selected, setSelected] = useState(1); const [title, setTitle] = useState(units[0]?.title || "");
  const addUnit = () => { const n = units.length + 1; setUnits([...units, {id:Date.now(),number:String(n).padStart(2,"0"),title:`New unit ${n}`,subtitle:"Добавьте описание",duration:"30 мин",progress:0,color:["yellow","blue","pink","green"][n%4]}]); };
  return <div className="admin pageIn"><aside className="adminSide"><Mark/><div className="adminCourse"><small>ТЕКУЩИЙ КУРС</small><button>🇬🇧 <span>English A1<br/><small>Для начинающих</small></span>⌄</button></div><nav><button className="active">▦ <span>Контент курса</span></button><button onClick={()=>setView("users")}>♙ <span>Пользователи</span></button><button>◫ <span>Курсы и доступы</span></button><button>⌁ <span>Аналитика</span></button></nav><div className="adminBottom"><button onClick={()=>setView("learn")}>↗ <span>Открыть сайт</span></button><button>⚙ <span>Настройки</span></button><div className="adminProfile"><b>A</b><span>Администратор<small>admin@lingva.kz</small></span></div></div></aside>
    <main className="adminMain"><div className="adminHeader"><div><p className="eyebrow">КОНСТРУКТОР КУРСА</p><h1>Контент курса</h1></div><div><button className="outline">Предпросмотр</button><button className="primary" onClick={()=>setView("learn")}>Опубликовать</button></div></div><div className="editorShell"><section className="unitList"><div className="listHead"><span>UNITS</span><button onClick={addUnit}>＋</button></div>{units.map((u,i)=><button key={u.id} className={selected===i?"active":""} onClick={()=>{setSelected(i);setTitle(u.title)}}><b>UNIT {u.number}</b><span>{u.title}</span><small>{i===0?"6 уроков · Опубликован":"4 урока · Черновик"}</small></button>)}</section>
    <section className="editor"><div className="editorTitle"><div><span>UNIT {units[selected]?.number}</span><input value={title} onChange={e=>setTitle(e.target.value)} /></div><button className="dots">•••</button></div><div className="lessonSelect"><button className="active">Урок 1 <small>Nice to meet you</small></button><button>Урок 2 <small>Where are you from?</small></button><button className="addLesson">＋ Добавить урок</button></div><div className="blocks"><div className="block"><span className="drag">⠿</span><div className="blockIcon">Tt</div><div><b>Текстовый блок</b><p>Welcome! In this lesson we’ll learn how to introduce ourselves.</p></div><button>•••</button></div><div className="block videoBlock"><span className="drag">⠿</span><div className="videoPreview"><i>▶</i><small>02:34</small></div><div><b>Видео</b><p>Introduction: Meeting new people</p></div><button>•••</button></div><div className="block"><span className="drag">⠿</span><div className="blockIcon coral">✓</div><div><b>Задание с выбором</b><p>Choose the correct greeting · 3 варианта</p></div><button>•••</button></div><button className="addBlock">＋ &nbsp; Добавить блок</button></div></section></div></main></div>;
}

function Users({ setView }: { setView:(v:View)=>void }) { const [query,setQuery]=useState(""); const filtered=useMemo(()=>users.filter(u=>u.name.toLowerCase().includes(query.toLowerCase())||u.email.includes(query)),[query]); return <div className="admin pageIn"><aside className="adminSide"><Mark/><nav className="topNav"><button onClick={()=>setView("admin")}>▦ <span>Контент курса</span></button><button className="active">♙ <span>Пользователи</span></button><button>◫ <span>Курсы и доступы</span></button><button>⌁ <span>Аналитика</span></button></nav><div className="adminBottom"><button onClick={()=>setView("learn")}>↗ <span>Открыть сайт</span></button></div></aside><main className="adminMain usersMain"><div className="adminHeader"><div><p className="eyebrow">УПРАВЛЕНИЕ</p><h1>Пользователи</h1><p>1 248 учеников на платформе</p></div><button className="primary">＋ Добавить пользователя</button></div><div className="userTools"><label>⌕<input placeholder="Поиск по имени или email" value={query} onChange={e=>setQuery(e.target.value)}/></label><button>Все подписки⌄</button><button>Все курсы⌄</button></div><div className="usersTable"><div className="tableRow tableHead"><span>ПОЛЬЗОВАТЕЛЬ</span><span>ПОДПИСКА</span><span>КУРС</span><span>ПРОГРЕСС</span><span /></div>{filtered.map(u=><div className="tableRow" key={u.email}><div className="userIdentity"><b style={{background:u.color}}>{u.initials}</b><span>{u.name}<small>{u.email}</small></span></div><span><mark className={`plan ${u.plan.toLowerCase()}`}>{u.plan}</mark></span><span>{u.course}</span><span><div className="miniProgress"><i style={{width:`${u.progress}%`}}/></div>{u.progress}%</span><button>•••</button></div>)}</div></main></div> }

export default function Home() { const [view,setView]=useState<View>("learn"); const [units,setUnits]=useState(initialUnits); return <>{view!=="admin"&&view!=="users"&&<Header view={view} setView={setView}/>} {view==="learn"&&<Dashboard units={units} setView={setView}/>} {view==="lesson"&&<Lesson setView={setView}/>} {view==="admin"&&<Admin units={units} setUnits={setUnits} setView={setView}/>} {view==="users"&&<Users setView={setView}/>}</>; }
