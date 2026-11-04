# G Verge

**Русский** · [English](#english)

G Verge включает VPN только для тех программ, которым он нужен. Например, Discord и YouTube идут через VPN, а игры, банки и Госуслуги работают напрямую. VPN-сервис нужен свой: G Verge подключается к нему по ссылке подписки.

## Скачать

[![Скачать для Mac](https://img.shields.io/badge/%D0%A1%D0%BA%D0%B0%D1%87%D0%B0%D1%82%D1%8C_%D0%B4%D0%BB%D1%8F_Mac-Apple_M1_%D0%B8_%D0%BD%D0%BE%D0%B2%D0%B5%D0%B5-000000?style=for-the-badge&logo=apple)](https://github.com/Free-Willing-Eagle/g-verge-app/releases/latest/download/G-Verge-Mac.dmg)
[![Скачать для Windows](https://img.shields.io/badge/%D0%A1%D0%BA%D0%B0%D1%87%D0%B0%D1%82%D1%8C_%D0%B4%D0%BB%D1%8F_Windows-10_%D0%B8_11-0078D4?style=for-the-badge&logo=windows)](https://github.com/Free-Willing-Eagle/g-verge-app/releases/latest/download/G-Verge-Windows-Setup.exe)

Mac подходит с процессором Apple M1 или новее и macOS 11 или новее. Как узнать процессор: меню Apple (яблоко в левом верхнем углу) → «Об этом Mac», строка «Чип».

## Установка на Mac

1. Нажми кнопку «Скачать для Mac» и открой скачанный файл `G-Verge-Mac.dmg`.
2. В открывшемся окне перетащи значок G Verge на папку «Программы» (Applications).
3. Открой G Verge из папки «Программы».
4. Если Mac пишет, что не может проверить разработчика, нажми «Готово». Затем открой «Системные настройки» → «Конфиденциальность и безопасность», пролистай вниз и нажми «Все равно открыть». Подтверди паролем от Mac.
5. Если Mac пишет, что программа «повреждена», открой «Терминал» (поиск Spotlight: Cmd + пробел, набери «Терминал»). Вставь строку ниже, нажми Enter и снова открой G Verge.

   ```
   xattr -cr "/Applications/G Verge.app"
   ```

Предупреждения появляются потому, что программа не куплена в App Store и не подписана платным сертификатом Apple. Весь исходный код программы лежит в этом репозитории.

## Установка на Windows

1. Нажми кнопку «Скачать для Windows» и запусти скачанный файл `G-Verge-Windows-Setup.exe`.
2. Если появилось синее окно «Windows защитила ваш компьютер», нажми «Подробнее», затем «Выполнить в любом случае».
3. На вопрос «Разрешить этому приложению вносить изменения?» ответь «Да». Дальше нажимай «Далее» и «Установить».
4. G Verge появится в меню «Пуск».

## Первый запуск

1. Открой раздел «Мои VPN» и нажми «Добавить VPN». Вставь ссылку из своего VPN-сервиса. Обычно она называется «Ссылка подписки» или «Subscription URL» и начинается с `https://`. Подойдет и ссылка на один сервер вида `vless://…`.
2. Открой раздел «Программы». Для нужных программ выбери VPN и страну. Если программы нет в списке, нажми «Добавить программу».
3. Нажми «Сохранить выбор».
4. Нажми красную кнопку слева. Когда она станет зеленой, все работает. При первом включении Mac попросит пароль, Windows может спросить разрешение.

Ссылка VPN хранится только на твоем компьютере. Не пересылай ее другим: по ней можно пользоваться твоим VPN.

### Пример: Discord через VPN, остальное напрямую

| Где | Что выбрать |
|---|---|
| «Общее подключение» | Без VPN |
| Discord | Твой VPN |
| «Российские сайты без VPN» | Включено |

Игры и все остальное пойдут напрямую без задержек. Голосовые каналы Discord тоже пойдут через VPN.

## Частые вопросы

**Как обновить?** Скачай файл заново по кнопке выше и установи поверх. Настройки и VPN сохранятся.

**Не работает сайт или программа.** Нажми зеленую кнопку, чтобы выключить G Verge, и проверь без нее. Если без G Verge работает, выбери для этой программы другой VPN или страну.

**У меня уже стоит Clash Verge.** Удали его перед установкой G Verge. Две программы используют одну системную службу и мешают друг другу.

**Как удалить?** На Mac перетащи G Verge из «Программ» в Корзину. На Windows: «Параметры» → «Приложения», найди G Verge и нажми «Удалить».

Интерфейс программы на русском языке.

---

## English

G Verge turns a VPN on only for the programs that need it. For example, Discord and YouTube go through the VPN while games and banking sites connect directly. You need your own VPN service: G Verge connects to it with a subscription link.

### Download

[![Download for Mac](https://img.shields.io/badge/Download_for_Mac-Apple_M1_or_newer-000000?style=for-the-badge&logo=apple)](https://github.com/Free-Willing-Eagle/g-verge-app/releases/latest/download/G-Verge-Mac.dmg)
[![Download for Windows](https://img.shields.io/badge/Download_for_Windows-10_and_11-0078D4?style=for-the-badge&logo=windows)](https://github.com/Free-Willing-Eagle/g-verge-app/releases/latest/download/G-Verge-Windows-Setup.exe)

The Mac version needs an Apple M1 chip or newer and macOS 11 or newer. To check your chip, open the Apple menu (top left corner) → About This Mac and look at "Chip".

### Install on Mac

1. Click "Download for Mac" and open the downloaded `G-Verge-Mac.dmg`.
2. Drag the G Verge icon onto the Applications folder.
3. Open G Verge from Applications.
4. If macOS says it cannot verify the developer, click "Done". Then open System Settings → Privacy & Security, scroll down and click "Open Anyway". Confirm with your Mac password.
5. If macOS says the app "is damaged", open Terminal (Spotlight: Cmd + Space, type "Terminal"). Paste the line below, press Enter and open G Verge again.

   ```
   xattr -cr "/Applications/G Verge.app"
   ```

These warnings appear because the app is not from the App Store and is not signed with a paid Apple certificate. The full source code is in this repository.

### Install on Windows

1. Click "Download for Windows" and run the downloaded `G-Verge-Windows-Setup.exe`.
2. If a blue "Windows protected your PC" window appears, click "More info", then "Run anyway".
3. When asked "Do you want to allow this app to make changes?", click "Yes". Then click "Next" and "Install".
4. G Verge appears in the Start menu.

### First start

The app interface is in Russian. The buttons you need are named below.

1. Open «Мои VPN» (My VPNs) and click «Добавить VPN» (Add VPN). Paste the link from your VPN service. It is usually called "Subscription URL" and starts with `https://`. A single server link such as `vless://…` also works.
2. Open «Программы» (Programs). Choose a VPN and a country for the programs that need it. If a program is missing, click «Добавить программу» (Add program).
3. Click «Сохранить выбор» (Save).
4. Click the red button on the left. When it turns green, everything works. The first time, macOS asks for your password and Windows may ask for permission.

Your VPN link stays on your computer. Do not share it: anyone with the link can use your VPN.

### Questions

**How do I update?** Download the file again with the button above and install it over the old version. Your settings and VPNs are kept.

**A site or program does not work.** Click the green button to turn G Verge off and try again. If it works without G Verge, choose another VPN or country for that program.

**I already have Clash Verge.** Uninstall it before installing G Verge. Both use the same system service and interfere with each other.

**How do I uninstall?** On Mac, drag G Verge from Applications to the Trash. On Windows, open Settings → Apps, find G Verge and click Uninstall.

---

G Verge is based on [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev) and is distributed under the [GPL-3.0](LICENSE) license.
