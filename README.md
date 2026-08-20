# LingvaEdu

Интерфейс LMS-платформы LingvaEdu для управления курсами, пользователями, группами, ролями, отчётами, видеокомнатами и учебным календарём.

## Стек

- React 19
- TypeScript
- Vite
- React Router
- обычный CSS

Проект не использует Next.js, Vinext, Cloudflare Workers, D1 или R2.

## Локальный запуск

```bash
npm install
npm run dev
```

## Production-сборка

```bash
npm run build
```

Готовые статические файлы создаются в каталоге `dist/`.

## Деплой на Vercel

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Файл `vercel.json` перенаправляет все маршруты приложения на `index.html`, поэтому прямые переходы на `/courses`, `/reports`, `/calendar` и другие страницы работают без ошибки 404.

## Регистрация и подтверждение почты

Авторизация работает через Supabase Auth. Пользователь регистрируется с email и паролем, а аккаунт становится доступен только после перехода по ссылке из письма.

1. Создайте проект на [Supabase](https://supabase.com/dashboard).
2. В `Authentication → Providers → Email` включите Email provider и `Confirm email`.
3. В `Authentication → URL Configuration` укажите production-домен Vercel как `Site URL` и добавьте его в `Redirect URLs`.
4. Скопируйте `Project URL` и публичный `anon` key из `Project Settings → API`.
5. Добавьте в Vercel для Production, Preview и Development:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

6. Запустите новый deployment в Vercel.

Публичный `anon` key предназначен для frontend и не является секретным service-role ключом. `service_role` в Vercel frontend добавлять нельзя.

## Создание первого администратора

Роль администратора хранится в защищённом `app_metadata` Supabase. Она не задаётся из браузера и не может быть изменена обычным пользователем.

В PowerShell выполните команду, подставив значения своего проекта и надёжный временный пароль:

```powershell
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
$env:ADMIN_EMAIL="admin@lingva.kz"
$env:ADMIN_PASSWORD="temporary-password-12+"
$env:ADMIN_NAME="Имя Администратора"
npm run admin:create
```

Скрипт создаст подтверждённого пользователя с ролью `admin`. Если пользователь с такой почтой уже существует, скрипт назначит ему роль администратора и обновит имя и пароль.

`SUPABASE_SERVICE_ROLE_KEY` используется только локально для этой команды. Его нельзя добавлять в frontend-переменные `VITE_*`, коммитить в GitHub или хранить в клиентском коде.

## Общие курсы и редактор

Чтобы курсы синхронизировались между администратором и сотрудниками, выполните файл `supabase/migrations/001_courses.sql` в `Supabase → SQL Editor`. До применения миграции редактор автоматически работает локально в браузере и показывает соответствующую пометку.

Редактировать курсы могут пользователи, у которых в защищённом `app_metadata.role` указано `admin` или `staff`. Ученики могут просматривать курсы, но не видят управляющие действия.

Для загрузки видео и аудио выполните второй файл `supabase/migrations/002_course_media_storage.sql` в `Supabase → SQL Editor`. Он создаёт публичный Storage bucket `course-media`; загружать и удалять материалы смогут только пользователи с ролью `admin` или `staff`.

Для загрузки аватаров выполните файл `supabase/migrations/003_profile_avatars.sql` в `Supabase → SQL Editor`. Пользователь сможет изменять файлы только внутри собственной папки Storage.
