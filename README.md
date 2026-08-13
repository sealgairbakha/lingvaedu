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
