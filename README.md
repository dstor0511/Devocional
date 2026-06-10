# 📖 Dashboard Devocional

PWA personal para seguimiento de lectura bíblica, oración y reflexión espiritual diaria. Funciona como app nativa en iPhone, sin backend, sin cuenta, sin servidores.

---

## ✨ Características

- **Registro diario** — lecturas bíblicas (múltiples libros por día), minutos de oración, y notas en markdown
- **Estadísticas** — días leídos, racha actual, libro favorito, split AT/NT, promedio de oración
- **Notas en markdown** — plantilla diaria con secciones de reflexión, editor con preview
- **Reporte PDF** — exportable por período con estadísticas completas y notas opcionales
- **PIN con cifrado AES-256-GCM** — los datos se cifran en el dispositivo antes de guardarse, nunca salen del teléfono
- **PWA offline** — funciona sin internet después de la primera carga
- **Privacidad total** — sin cuenta, sin backend, sin analytics, sin cookies

---

## 🔒 Seguridad

Los datos nunca salen del dispositivo. El flujo es:

```
datos → AES-256-GCM (clave derivada del PIN con PBKDF2 · 150k iteraciones) → localStorage
```

- El PIN nunca se almacena, solo un hash derivado con PBKDF2
- Si alguien accede al almacenamiento del dispositivo, solo ve datos cifrados ilegibles
- 5 intentos fallidos activan bloqueo de 30 segundos
- Cambio de PIN re-cifra todos los datos automáticamente

---

## 📱 Instalación en iPhone

1. Abre `https://dstor0511.github.io/devocional/` en **Safari**
2. Toca el botón de compartir (cuadrado con flecha)
3. **"Agregar a pantalla de inicio"**
4. La app aparece como icono nativo, se abre a pantalla completa

> Requiere Safari. Chrome en iOS no soporta PWA correctamente.

---

## 🗂️ Estructura del proyecto

```
devocional-app/
├── index.html          app completa (actualmente monolítica)
├── manifest.json       configuración PWA
├── sw.js               service worker para soporte offline
├── icon-192.png        ícono de la app
├── icon-512.png        ícono de la app (alta resolución)
├── README.md           este archivo
└── -- refactoring pendiente --
    css/
    ├── base.css        variables, reset, animaciones
    ├── pin.css         pantallas de PIN
    ├── app.css         app, stats, form, entries, notas, modales
    └── print.css       estilos de impresión
    js/
    ├── markdown.js     renderizador markdown
    ├── crypto.js       cifrado AES, hash PIN
    ├── bible.js        libros AT/NT, dropdown
    ├── pin.js          setup, lock, cambio de PIN
    ├── data.js         storage, estadísticas, fechas
    ├── ui.js           render, lecturas, tabs de nota
    ├── export.js       reporte PDF
    └── app.js          init, boot, service worker
```

---

## 🛠️ Stack

- HTML · CSS · JavaScript vanilla — sin frameworks, sin dependencias
- Web Crypto API — cifrado nativo del navegador
- localStorage — almacenamiento local cifrado
- Service Worker — soporte offline
- CSS print — generación de PDF vía impresión del navegador

---

## 📋 Plantilla de nota diaria

```markdown
## 🙏 ¿Qué aprendí sobre Dios?

## 👤 ¿Qué aprendí sobre mí?

## ✅ ¿Qué debo hacer?

## 🔄 ¿Qué debo cambiar?
```

---

## 🔐 Privacidad

Este proyecto es de uso personal. Cada persona que acceda al link tiene una sesión completamente independiente — los datos viven únicamente en su dispositivo, cifrados con su propio PIN. El repositorio en GitHub solo contiene el código de la app, nunca datos de usuarios.

---

*Construido con Claude · Anthropic*
