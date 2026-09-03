# GymBox — Tu gym, tus datos, tu progreso

App web fitness **100% estática y browser-only** para usar **todos los días**:
registrar entrenamientos, comidas, peso y progreso. Sin backend, sin base de
datos, sin login, sin cuentas, sin API keys, sin servicios pagos. Todos los datos
viven en el navegador del usuario (`localStorage`), con **exportar/importar** para
no perder el historial. Compatible con Hostinger (subir y listo).

> "Todo tu gym en un solo lugar." Antes del gym mirás qué hiciste la última vez,
> durante registrás tus series, después ves tu volumen y tus PRs, y durante el día
> cargás calorías, agua y pasos.

---

## Estructura

```
ecom-calc/
├── index.html              ← Landing (vende mostrando el producto). SEO home.
├── app.html                ← La APP (SPA con router por hash). El corazón.
├── styles.css              ← Diseño completo: dark · premium · athletic (1 archivo)
├── manifest.webmanifest    ← Instalable como app (PWA básica)
├── js/
│   ├── calc.js             ← MOTOR de cálculos (puro, testeable): BMR/TDEE/macros/1RM/…
│   ├── store.js            ← Persistencia localStorage + export/import (puro, testeable)
│   ├── foods.js            ← Base local de alimentos (valores aproximados)
│   ├── ui.js               ← Helpers de UI (DOM seguro anti-XSS, toast, sheet, gráficos)
│   ├── app.js              ← Shell + router + navegación (sidebar/tabbar)
│   ├── views-inicio.js     ← Dashboard
│   ├── views-entreno.js    ← Rutinas, sesión en vivo, timer, discos, historial
│   ├── views-comida.js     ← Comidas, macros, agua, pasos
│   ├── views-progreso.js   ← Peso, PRs, volumen, calendario
│   └── views-mas.js        ← Perfil, calculadoras, export/import, privacidad
├── calculadora-calorias.html · calculadora-macros.html · calculadora-1rm.html  ← Páginas SEO
├── privacidad.html · aviso-legal.html
├── robots.txt · sitemap.xml · .htaccess
├── assets/  (favicon.svg, og-image.svg/.png)
├── tests/  (engine.test.js · test-runner.html · runner-ui.js)
└── README.md
```

**Separación limpia:** el motor (`calc.js`) y la persistencia (`store.js`) no tocan
el DOM y se testean en aislamiento. La UI (views) solo lee/escribe a través de ellos.
Todo dato del usuario que se re-renderiza pasa por escape HTML (anti-XSS).

---

## Funcionalidades

**Núcleo (el corazón del producto):**
1. **Dashboard** — calorías del día como métrica protagonista (anillo), macros, agua, pasos, peso y entrenamiento, con jerarquía visual.
2. **Registro de entrenamiento** — sesión en vivo: agregar ejercicios y series (kg × reps), volumen total en tiempo real, "última vez" por ejercicio.
3. **Historial por ejercicio** — mejor peso/reps/volumen, 1RM estimado y gráfico de fuerza.
4. **Comidas + macros** — base local de alimentos + alimento personalizado (guardable), tracker con "te faltan".
5. **Calorías y macros** — Mifflin-St Jeor, factores de actividad, objetivo (perder/mantener/ganar).
6. **Peso corporal** — actual/inicial/cambio/promedio/tendencia/objetivo + gráfico.
7. **Progreso** — PRs por ejercicio, volumen semanal, calendario de constancia.
8. **PRs / 1RM** — detección automática de récords (peso y 1RM) con presentación destacada.
9. **Agua + pasos** — sumar agua con un toque, registrar pasos, objetivos editables.
10. **Persistencia local** — todo en `localStorage`, con exportar/importar/eliminar (doble confirmación).

**Herramientas:** rutinas reutilizables, timer de descanso (con beep), calculadora de discos,
1RM + tabla de %, proteína, agua, IMC (con su limitación), peso objetivo (tiempo estimado),
sugerencia de progresión ("¿qué peso intentar hoy?").

**Navegación:** sidebar en desktop, bottom-nav fija en mobile (íconos SVG, sin emojis).

---

## Cómo ejecutarlo localmente

Servilo por HTTP (la app usa módulos y rutas relativas):

```bash
cd ecom-calc
python3 -m http.server 8137
# App:      http://localhost:8137/app.html
# Landing:  http://localhost:8137/
```

### Tests

```bash
node tests/engine.test.js     # → 24/24 tests OK (motor + persistencia)
```

O en el navegador: `http://localhost:8137/tests/test-runner.html`.
Cubren: BMR, TDEE, calorías, macros, proteína, agua, IMC, 1RM (Epley), volumen,
progresión, plan de peso, discos, detección de PR, y del store: perfil/objetivos,
comidas, agua/pasos/peso, sesiones/historial, export/import (ida y vuelta),
import inválido y borrado. Edge cases: ceros, negativos, vacíos, valores imposibles.

---

## Publicar en Hostinger

1. hPanel → Administrador de archivos → `public_html`.
2. Subí **todo el contenido** de `ecom-calc/` (que `index.html` y `app.html` queden en la raíz).
   Incluí el archivo oculto `.htaccess`. Podés omitir `tests/`.
3. Reemplazá `https://gymbox.app` por tu dominio en `index.html`, las páginas
   `calculadora-*.html`, `privacidad.html`, `aviso-legal.html`, `sitemap.xml`, `robots.txt`.
4. Completá los `TODO OWNER` de las páginas legales (email, titular).
5. Al actualizar, subí el `?v=YYYYMMDD` de las referencias a `.css`/`.js`.

Sigue siendo 100% estático: no hay servidor ni base de datos que configurar.

---

## Monetización

Espacios de AdSense reservados (placeholders, sin código) en lugares que **no
interrumpen** el uso: debajo de resultados/secciones y en las páginas de contenido.
Fitness es un vertical de CPM alto. Pegás tu código de AdSense y listo. La estructura
también queda lista para bloques de afiliados (suplementos, equipamiento) más adelante
— sin enlaces inventados.

---

## Limitaciones reales

- Los **valores nutricionales** de la base local son aproximados/referenciales, no exactos.
- Los cálculos de fitness (calorías, 1RM, progresión) son **estimaciones** con fórmulas estándar; no son consejo médico.
- Los datos viven **solo en este navegador**: si el usuario borra los datos del navegador o cambia de dispositivo, debe importar su export. Es una decisión de privacidad (nada sale del dispositivo), no un bug.
- Sin sincronización entre dispositivos (requeriría cuentas/servidor, fuera del alcance).

---

## Mejoras futuras

- Más páginas SEO con la misma estructura (proteína, agua, IMC, peso ideal, discos, trackers).
- Plantillas de rutina prearmadas (PPL, Full Body) para empezar más rápido.
- Superseries y descansos por ejercicio; notas por serie.
- Exportar el progreso a imagen para compartir.
- Recordatorios locales (sin servidor) y modo offline con Service Worker.

---

## Aviso

GymBox es una herramienta orientativa y **no reemplaza el consejo de un profesional
de la salud, la nutrición o el entrenamiento**. Los cálculos son estimaciones.
