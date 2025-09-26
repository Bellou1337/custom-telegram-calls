### 1. Клонирование и запуск проекта

```bash
git clone <repository-url>
cd custom-telegram-calls
```

1. Открываем проект и пишем в корне `npm i` или `npm install`
2. Далее переходим в `apps/bot`, `apps/calls`, `apps/database`, `apps/kafka` там тоже пишем `npm install`
3. Заполняем `.env` файл по примеру `.env.example`
4. В `apps/bot` пишем `npm run migrate:deploy` и `npm run generate:prisma`
5. Выходим в корень проекта и пишем `npm run dev`
6. Запускаем `docker compose` командой `docker-compose up -d` для поднятия локальной кафки
