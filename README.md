# 🛰️ Banda SS13 WebMap

Интерактивная онлайн-вебкарта космических станций, кораблей и планетных зон для трёх игровых серверов проекта **Banda** (Space Station 13):
* 🟢 **BandaMarines** (Колониальные Морпехи США USCM против Ксеноморфов)
* 🔵 **BandaStation** (Классическая научно-исследовательская станция NanoTrasen)
* 🔴 **BandaTroopers** (Звёздный Десант, Halo, ВСФР и военные оперативные зоны)

Проект вдохновлён референсом [AffectedArc07/SS13WebMap](https://github.com/AffectedArc07/SS13WebMap) и расширен поддержкой трёх билдов, пиксельной сетки координат, переключения Z-уровней, встроенной линейки дистанций и системы автоматической синхронизации карт с GitHub.

---

## 🌟 Ключевые возможности

1. **Единый центр навигации по 100+ картам**:
   - Мгновенный поиск по названиям карт, файлам `.dmm` и лору.
   - Фильтры категорий: *Станции*, *Корабли*, *Поверхность / Колонии*.
2. **Пиксельно-точная система координат SS13**:
   - Точные координаты `(X, Y, Z)` при наведении курсора в реальном времени.
   - Подсветка тайла под курсором размером 1×1 клетка.
   - Клик по любой клетке автоматически копирует прямую ссылку с параметрами координат.
   - Поле быстрого перехода: введите `X` и `Y` и нажмите **Перейти**.
3. **Многослойность и Z-уровни**:
   - Переключение палуб (*Deck 1, Deck 2, Deck 3, Caves, Surface*) без сброса положения камеры.
   - Оверлеи трубопроводов (*Pipenet*) и координатной сетки.
   - Инструмент **Линейка** (*Ruler*) для измерения евклидова и манхэттенского расстояния между тайлами.
4. **Deep-linking (Прямые ссылки)**:
   - Поддержка URL-параметров:
     ```
     https://<username>.github.io/BandaWebMap/?server=bandastation&map=cyberiad&z=1&x=128&y=140&zoom=3
     ```
   - Удобно отправлять ссылки на места происшествий и отсеки прямо в Discord или чат игры!
5. **Автоматическая синхронизация с билдами**:
   - GitHub Actions workflow (`.github/workflows/sync-maps.yml`) опрашивает репозитории билдов по расписанию (раз в сутки) или вручную по кнопке, обновляет конфигурации карт и деплоит сайт на GitHub Pages.

---

## 🚀 Инструкция по размещению на GitHub Pages

1. **Создайте репозиторий на GitHub**:
   - Имя: `BandaWebMap` (или любое другое).
   - Сделайте его публичным (**Public**).

2. **Инициализируйте и отправьте проект**:
   ```bash
   cd "c:\Space Station 13\BandaWebMap"
   git init
   git add .
   git commit -m "feat: initial release of Banda SS13 WebMap"
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/BandaWebMap.git
   git push -u origin main
   ```

3. **Включите GitHub Pages**:
   - В настройках репозитория на GitHub перейдите в **Settings** ➔ **Pages**.
   - В выпадающем списке **Build and deployment -> Source** выберите:
     👉 **GitHub Actions**.
   - Готово! Workflow `.github/workflows/deploy.yml` автоматически соберет и опубликует сайт. Ссылка будет иметь вид:
     `https://<YOUR_GITHUB_USERNAME>.github.io/BandaWebMap/`

---

## 💻 Локальный запуск и разработка

```bash
# Запуск локального сервера (порт 3000)
npm start

# Обновление карт из локальных папок BandaMarines, BandaStation, BandaTroopers
npm run sync:local

# Проверка удаленной синхронизации через GitHub API
npm run sync:remote
```

---

## 📁 Структура репозитория

```
BandaWebMap/
├── .github/
│   └── workflows/
│       ├── deploy.yml            # CI/CD: деплой на GitHub Pages
│       └── sync-maps.yml         # Cron-синхронизация метаданных карт
├── assets/
│   ├── css/
│   │   ├── leaflet.css           # Стили Leaflet
│   │   └── style.css             # Sci-fi темная тема и анимации
│   ├── js/
│   │   ├── app.js                # Главный координатор SPA
│   │   ├── coords.js             # Математика координат SS13 и линейка
│   │   ├── map-viewer.js         # Leaflet-контроллер слоев и зума
│   │   ├── sidebar.js            # Сайдбар, поиск, фильтры и Z-уровни
│   │   └── leaflet.js            # Библиотека Leaflet
│   └── maps/
│       └── bandastation/         # Встроенные 2040x2040 наномапы
├── data/
│   └── maps.json                 # Единый каталог 100+ карт трех серверов
├── scripts/
│   ├── sync-maps.js              # Скрипт локальной сборки манифеста
│   └── sync-github.js            # Скрипт удаленной проверки GitHub API
├── index.html                    # Главный HTML файл
└── package.json                  # Конфигурация проекта
```
