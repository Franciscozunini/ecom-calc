# MargenLibre — Calculadora de rentabilidad de Mercado Libre

Micro-SaaS web **100 % estático** (HTML + CSS + JavaScript vanilla, sin backend,
sin build, sin dependencias) que responde la pregunta que el simulador oficial de
Mercado Libre no responde:

> **Después de comisiones, impuestos, envío y publicidad, ¿cuánto gano realmente
> en cada venta y cuánto puedo gastar en anuncios sin perder plata?**

No es un simulador de comisiones: es una calculadora **integral de rentabilidad**
(ganancia neta, margen, ROI, punto de equilibrio, precio mínimo y máximo gasto
publicitario / ACOS de equilibrio).

---

## 🧭 Regla de oro del proyecto

**La herramienta no inventa ningún dato.** No trae comisiones, impuestos ni costos
de envío oficiales precargados. Todos los valores los ingresa el usuario con los
datos reales de su cuenta. Los "presets" de `data/presets.json` son valores de
**referencia editables** (marcados como *no oficiales*), con fecha de actualización,
y separados del motor de cálculo.

---

## 📁 Estructura del proyecto

```
ecom-calc/
├── index.html            ← la calculadora (MVP: una sola página, muy buena)
├── styles.css            ← estilos (1 archivo, seccionado, mobile-first, dark-mode)
├── calculo.js            ← MOTOR DE CÁLCULO (sin dependencias de UI, testeable)
├── main.js               ← UI: cablea el DOM con el motor
├── lib/
│   └── manifest.js       ← datos de marca (window.__BRAND__), sin lógica ni datos fiscales
├── data/
│   └── presets.json      ← presets de referencia EDITABLES, con fecha_actualizacion
├── assets/
│   ├── favicon.svg
│   ├── og-image.svg      ← fuente de la tarjeta social
│   └── og-image.png      ← tarjeta social 1200×630 (Open Graph / Twitter)
├── tests/
│   ├── calculo.test.js   ← 16 tests unitarios del motor (Node y navegador)
│   ├── test-runner.html  ← corre los tests en el navegador
│   └── runner-ui.js      ← pinta el resultado de los tests (dev-only)
├── privacidad.html       ← esqueleto (requerido por AdSense) con TODOs del dueño
├── aviso-legal.html      ← esqueleto con disclaimer legal y TODOs del dueño
├── robots.txt
├── sitemap.xml
├── .htaccess             ← cache, MIME, gzip, headers (Apache / LiteSpeed / Hostinger)
└── README.md
```

**Arquitectura pensada para separar responsabilidades:** el motor (`calculo.js`)
no sabe nada de la interfaz y se puede testear solo; los datos (`presets.json`)
están versionados y aparte; la UI (`main.js`) solo lee inputs y pinta resultados.

---

## ▶️ Cómo ejecutarlo localmente

No hay que compilar nada. Solo hace falta servirlo por HTTP (el `fetch` de los
presets no funciona abriendo el archivo directo con `file://`).

```bash
cd ecom-calc
python3 -m http.server 8137
# Abrí http://localhost:8137/ en el navegador
```

(La calculadora funciona igual sin los presets; simplemente no aparece el selector
de referencia si se abre sin servidor.)

### Correr los tests

**En consola (Node):**

```bash
node tests/calculo.test.js
# → 16/16 tests OK
```

**En el navegador:** abrí `http://localhost:8137/tests/test-runner.html`.

Los tests cubren: venta rentable, venta con pérdida, comisión 0, publicidad 0,
costo de producto 0, margen objetivo, punto de equilibrio, ACOS de equilibrio,
inputs vacíos, valores negativos, porcentajes inválidos y números decimales.

---

## 🚀 Cómo publicarlo en Hostinger

Es un sitio estático, así que se sube tal cual:

1. Entrá al **hPanel** de Hostinger → **Administrador de archivos** (o usá FTP).
2. Abrí la carpeta `public_html` de tu dominio.
3. Subí **todo el contenido** de la carpeta `ecom-calc/` (no la carpeta, su
   contenido): `index.html` tiene que quedar en la raíz de `public_html`.
   Incluí el archivo oculto **`.htaccess`** (activá "mostrar archivos ocultos"
   en el administrador de archivos).
4. Podés **omitir la carpeta `tests/`** en producción (es solo para desarrollo).
5. Editá antes de subir:
   - En `index.html`, `sitemap.xml`, `robots.txt`, `privacidad.html` y
     `aviso-legal.html`: reemplazá `https://margenlibre.com` por tu dominio real.
   - Completá los `TODO OWNER` de `privacidad.html` y `aviso-legal.html`
     (email de contacto, titular).
6. Si tu dominio tiene SSL, descomentá el bloque de "HTTPS redirect" del `.htaccess`.
7. Verificá la web abriendo tu dominio y haciendo un cálculo real.

> **Cache:** al actualizar archivos, subí el número de versión `?v=YYYYMMDD` en las
> referencias a `styles.css`/`.js` dentro de los HTML para forzar la recarga.

---

## ✅ Funcionalidades implementadas

**Calculadora**
- 10 inputs editables: precio de venta, costo del producto, comisión (%), cargo
  fijo, envío, impuestos (%), publicidad, otros costos, unidades y margen objetivo (opcional).
- Cálculo **en vivo** mientras se escribe (sin recargar). Botones "Recalcular" y "Limpiar todo".
- Flujo en 3 pasos con acordeones ("Contame sobre tu producto" → "Agregá tus costos" → "Descubrí cuánto ganás").
- Selector de **moneda** (ARS por defecto; arquitectura lista para USD, MXN, CLP, COP, BRL, EUR sin tocar el motor).
- **Presets de referencia** cargados desde `data/presets.json`, claramente marcados como editables y no oficiales, con fecha.

**Resultados**
- Resultado principal con máxima jerarquía: **ganancia neta por venta** y **margen neto**.
- **Semáforo** 🟢 Rentable / 🟡 Margen bajo / 🔴 Pérdida (umbral centralizado en `calculo.js`).
- Desglose completo: ingresos, comisión, cargo fijo, envío, impuestos, publicidad,
  otros, costo total, ganancia por venta y por lote, margen, ROI, punto de
  equilibrio, precio mínimo para el margen objetivo y máximo gasto publicitario.
- Sección diferencial **"¿Cuánto puedo gastar en publicidad sin perder plata?"**:
  máximo por venta, ACOS de equilibrio, diferencia contra lo que gastás hoy y
  mensajes condicionales (incluye la advertencia de producto deficitario).
- **"Cómo se calculó"**: expandible que muestra cada fórmula aplicada a *tus* números.

**Motor (`calculo.js`)**
- Puro, sin dependencias de UI, testeable en aislamiento (Node y navegador).
- Modelo de costos documentado (variables por unidad + costos del lote).
- Validaciones: precio obligatorio > 0, rechazo de negativos, porcentajes 0–100,
  unidades ≥ 1; nunca rompe la UI con inputs vacíos.

**Calidad web**
- Responsive mobile-first real, dark-mode automático (`prefers-color-scheme`).
- Accesibilidad: labels asociados, `:focus-visible`, skip-link, contraste, teclado.
- SEO: title, meta description, canonical, Open Graph, Twitter Cards, JSON-LD
  (`WebApplication` + `FAQPage`), `sitemap.xml`, `robots.txt`, contenido útil y FAQ.
- Contenido SEO real debajo de la calculadora (cómo calcular, qué costos, margen
  vs ROI, ACOS/publicidad, FAQ) y **disclaimer legal** visible.
- Espacios de anuncios (placeholders, sin código de AdSense) que nunca tapan el resultado.
- Estructura lista para Google Analytics (sin que ninguna función dependa de él).
- Funciona **offline** después de la primera carga (todo el cálculo es local; sin APIs externas).

---

## 🔭 Mejoras futuras

**Páginas SEO de la arquitectura futura** (el motor y la base ya quedan listos para
reutilizarse sin reescribir nada):

1. `/calculadora-rentabilidad-mercado-libre`
2. `/calculadora-comision-mercado-libre`
3. `/cuanto-gano-vendiendo-en-mercado-libre`
4. `/punto-equilibrio-ecommerce`
5. `/calculadora-margen-markup`
6. `/calculadora-roi-ecommerce`
7. `/rentabilidad-amazon`
8. `/rentabilidad-tienda-nube`
9. `/rentabilidad-shopify`
10. `/rentabilidad-etsy`

**Otras ideas**
- Guardar/compartir una simulación vía hash en la URL (sin backend).
- Comparar dos productos lado a lado.
- Exportar el desglose a PDF/imagen desde el navegador.
- Presets por categoría de Mercado Libre mantenidos por la comunidad (siempre marcados como editables).
- Modo "publicidad como % del precio" además del monto total.
- Activar Google Analytics 4 y un CMP de cookies al monetizar con AdSense.

---

## ⚠️ Aviso

Esta herramienta es orientativa y no constituye asesoramiento contable, fiscal,
financiero ni comercial. Las comisiones, impuestos, costos de envío y condiciones
de las plataformas pueden cambiar. Verificá los valores vigentes antes de tomar
decisiones comerciales.

MargenLibre es un proyecto **independiente**. No está afiliado, asociado ni
respaldado por Mercado Libre. "Mercado Libre" es marca de sus respectivos titulares.
