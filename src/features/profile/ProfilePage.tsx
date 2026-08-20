import { useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import { useCourses } from "../courses/CourseProvider";

const roleNames = { admin: "Администратор", staff: "Сотрудник", student: "Ученик" } as const;

export function ProfilePage() {
  const { user, displayName, initials, avatarUrl, role } = useAuth();
  const { courses } = useCourses();
  const [name, setName] = useState(displayName);
  const [phone, setPhone] = useState(String(user?.user_metadata?.phone || ""));
  const [telegram, setTelegram] = useState(String(user?.user_metadata?.telegram || ""));
  const [avatar, setAvatar] = useState(avatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const certificates = useMemo(() => courses.filter((course) => {
    if (!user || course.status !== "published") return false;
    const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    try { const done = JSON.parse(localStorage.getItem(`lingvaedu-progress-${user.id}-${course.id}`) || "[]") as string[]; return lessonIds.length > 0 && lessonIds.every((id) => done.includes(id)); } catch { return false; }
  }), [courses, user]);

  const uploadAvatar = async (file: File) => {
    if (!supabase || !user) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setMessage("Выберите изображение размером до 5 МБ."); return; }
    setUploading(true); setMessage("");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatar(data.publicUrl);
      setMessage("Аватар загружен. Нажмите «Сохранить изменения».");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось загрузить аватар."); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!supabase || !name.trim()) return;
    setSaving(true); setMessage("");
    const { error } = await supabase.auth.updateUser({ data: { ...user?.user_metadata, full_name: name.trim(), phone: phone.trim(), telegram: telegram.trim().replace(/^@/, ""), avatar_url: avatar } });
    setSaving(false); setMessage(error ? error.message : "Профиль успешно обновлён.");
  };

  return <main className="content fade profilePage"><div className="pageTitle"><div><h1>Мой профиль</h1><p>Личные данные, роль в системе и достижения.</p></div></div><div className="profileLayout"><aside className="profileCard panel"><div className="profileAvatar">{avatar ? <img src={avatar} alt={displayName}/> : <span>{initials}</span>}<label className={uploading ? "uploading" : ""}>✎<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => { const file=e.target.files?.[0]; if(file) void uploadAvatar(file); }}/></label></div><h2>{displayName}</h2><p>{user?.email}</p><div className="profileBadges"><span>{roleNames[role]}</span><span className="active">● Активен</span></div><dl><div><dt>Дата регистрации</dt><dd>{user?.created_at ? new Date(user.created_at).toLocaleDateString("ru-RU") : "—"}</dd></div><div><dt>Подтверждение почты</dt><dd>{user?.email_confirmed_at ? "Подтверждена" : "Ожидается"}</dd></div></dl></aside><section className="profileMain"><div className="profileForm panel"><div className="panelHead"><div><h2>Личная информация</h2><p>Эти данные отображаются в вашем аккаунте.</p></div></div><div className="profileFields"><label>Имя пользователя<input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ваше имя"/></label><label>Email<input value={user?.email || ""} disabled/></label><label>Номер телефона<input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+7 700 000 00 00"/></label><label>Telegram<input value={telegram} onChange={(e)=>setTelegram(e.target.value)} placeholder="username"/><small>Можно указать без символа @</small></label></div>{message&&<p className="profileMessage">{message}</p>}<div className="profileSave"><button className="btn primary" disabled={saving||uploading||!name.trim()} onClick={save}>{saving?"Сохраняем…":"Сохранить изменения"}</button></div></div><div className="certificates panel"><div className="panelHead"><div><h2>Мои сертификаты</h2><p>Сертификаты появляются после полного завершения курса.</p></div><span>{certificates.length}</span></div>{certificates.length ? <div className="certificateGrid">{certificates.map((course)=><article key={course.id}><span>✓</span><div><small>СЕРТИФИКАТ LINGVAEDU</small><h3>{course.title}</h3><p>Курс успешно завершён</p></div><button onClick={()=>window.print()}>Скачать</button></article>)}</div> : <div className="certificateEmpty"><span>◇</span><h3>Сертификатов пока нет</h3><p>Завершите первый курс на 100%, и сертификат появится здесь.</p></div>}</div></section></div></main>;
}
