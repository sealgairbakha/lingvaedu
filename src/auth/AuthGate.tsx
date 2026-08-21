import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

type Mode = "login" | "register" | "check-email" | "forgot";

function validatePassword(password: string) {
  return password.length >= 8 && /[A-ZА-Я]/.test(password) && /\d/.test(password);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(window.location.search).get("register") === "1"
      ? "register"
      : "login",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured) return <AuthSetup/>;
  if (loading) return <div className="authLoading"><div className="authSpinner"/><b>LingvaEdu</b></div>;
  if (user) return children;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        if (!name.trim()) throw new Error("Введите имя и фамилию");
        if (!validatePassword(password)) throw new Error("Пароль должен содержать минимум 8 символов, заглавную букву и цифру");
        if (password !== confirm) throw new Error("Пароли не совпадают");
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() },
          },
        });
        if (signUpError) throw signUpError;
        setMode("check-email");
      } else if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setMode("check-email");
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (loginError) throw loginError;
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось выполнить запрос";
      setError(message === "Invalid login credentials" ? "Неверная почта или пароль. Убедитесь, что почта подтверждена." : message);
    } finally { setBusy(false); }
  };

  return <div className="authPage"><section className="authBrand"><div className="authLogo"><span>lv</span><b>Lingva<span>Edu</span></b></div><div className="authBrandCopy"><span>ОБУЧЕНИЕ БЕЗ ГРАНИЦ</span><h1>Языки открывают<br/><em>новые возможности.</em></h1><p>Учитесь в своём темпе, общайтесь с наставниками и отслеживайте прогресс в одном пространстве.</p></div><div className="authQuote"><div className="quoteAvatars"><i>AK</i><i>МИ</i><i>+1K</i></div><p>Более 1 200 учеников уже учатся с LingvaEdu</p></div></section><section className="authFormSide"><div className="authFormWrap">{mode === "check-email" ? <div className="emailSent"><div>✉</div><span>ПРОВЕРЬТЕ ПОЧТУ</span><h2>Письмо уже в пути</h2><p>Мы отправили ссылку на <b>{email}</b>. Перейдите по ней — только после подтверждения почты аккаунт станет активным.</p><button className="authPrimary" onClick={()=>setMode("login")}>Вернуться ко входу</button><small>Не пришло письмо? Проверьте папку «Спам».</small></div> : <><div className="authHeading"><span>{mode === "register" ? "НОВЫЙ АККАУНТ" : mode === "forgot" ? "ВОССТАНОВЛЕНИЕ" : "С ВОЗВРАЩЕНИЕМ"}</span><h2>{mode === "register" ? "Создайте аккаунт" : mode === "forgot" ? "Восстановить пароль" : "Войдите в LingvaEdu"}</h2><p>{mode === "register" ? "Для регистрации понадобится действующая электронная почта." : mode === "forgot" ? "Отправим безопасную ссылку на вашу почту." : "Продолжите обучение с того места, где остановились."}</p></div><form onSubmit={submit}>{mode === "register" && <label>Имя и фамилия<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Алия Касымова" required/></label>}<label>Электронная почта<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" placeholder="name@example.com" required/></label>{mode !== "forgot" && <label>Пароль<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="Минимум 8 символов" required/></label>}{mode === "register" && <><label>Повторите пароль<input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" autoComplete="new-password" required/></label><p className="passwordHint">8+ символов · заглавная буква · минимум одна цифра</p></>}{error && <div className="authError">! {error}</div>}{mode === "login" && <button type="button" className="forgotLink" onClick={()=>setMode("forgot")}>Забыли пароль?</button>}<button className="authPrimary" disabled={busy}>{busy ? "Подождите…" : mode === "register" ? "Создать аккаунт" : mode === "forgot" ? "Отправить ссылку" : "Войти"}</button></form><div className="authSwitch">{mode === "register" ? <>Уже есть аккаунт? <button onClick={()=>setMode("login")}>Войти</button></> : mode === "forgot" ? <button onClick={()=>setMode("login")}>← Вернуться ко входу</button> : <>Нет аккаунта? <button onClick={()=>setMode("register")}>Зарегистрироваться</button></>}</div><p className="authLegal">Продолжая, вы принимаете условия использования и политику конфиденциальности LingvaEdu.</p></>}</div></section></div>;
}

function AuthSetup() {
  return <div className="authSetup"><div className="authLogo"><span>lv</span><b>Lingva<span>Edu</span></b></div><h1>Авторизация готова к подключению</h1><p>Добавьте переменные Supabase в Vercel и перезапустите deployment.</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</code><small>Инструкция находится в README проекта.</small></div>;
}
