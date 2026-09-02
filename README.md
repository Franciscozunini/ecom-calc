# MargenLibre — Decime cuánto querés ganar. Te digo a cuánto vender.

Micro-SaaS web **100 % estático** (HTML + CSS + JavaScript vanilla, sin backend,
sin build, sin dependencias) orientado a **decisiones de precio**.

En vez de ser "otra calculadora de comisiones", invierte la pregunta:

> **Vos decís cuánto te cuesta y cuánto querés ganar. Te decimos a qué precio publicar.**

> Mercado Libre te dice cuánto te cobra. **MargenLibre te dice a cuánto vender
> para ganar lo que vos querés.**

---

## 🧭 Regla de oro

**La herramienta no inventa ningún dato.** No trae comisiones, impuestos ni costos
oficiales precargados. Todos los valores los ingresa el usuario. Para Mercado Libre,
un selector de categoría **guía** a encontrar la comisión real y la **recuerda en el
navegador** (localStorage) por categoría; no se fabrica ningún porcentaje.

---

## ✨ Qué hace

A partir de: **costo del producto** + **cuánto querés ganar por unidad** (o % de
margen) + **dónde vendés** + **tus costos**, calcula:

- **Precio de publicación recomendado** (redondeado hacia arriba para que la
  ganancia real nunca quede por debajo del objetivo).
- **Ganancia por unidad, margen, costos totales y ROI** a ese precio.
- **¿Qué pasa si cambiás el precio?** — tabla de escenarios (más caro / más barato).
- **¿Cuánto podés pagar como máximo por el producto?** — cálculo inverso del costo
  del proveedor (clave para decidir si conviene comprar para revender).
- **¿Cuánto podés gastar en publicidad?** — publicidad actual, adicional disponible,
  máximo total y ACOS de equilibrio.
- **Punto de equilibrio** — unidades para recuperar tu inversión en stock (opcional).
- **Escenarios de ganancia** — "para ganar $X → publicá a $Y" alrededor de tu objetivo.
- **"Cómo se calculó"** con tus números reales.

---

## 📁 Estructura del proyecto

```
ecom-calc/
├── index.html            ← la herramienta (una sola página)
├── styles.css            ← estilos (1 archivo, mobile-first, dark-mode)
├── calculo.js            ← MOTOR (sin UI): calcular() [forward] + calcularObjetivo() [inverso]
├── main.js               ← UI: cablea el DOM con el motor
├── lib/manifest.js       ← datos de marca (window.__BRAND__)
├── data/presets.json     ← categorías de ML (comisiones en null: no se inventan)
├── assets/               ← favicon.svg, og-image.svg/.png
├── tests/                ← 29 tests del motor (Node y navegador)
│   ├── calculo.test.js
│   ├── test-runner.html
│   └── runner-ui.js
├── privacidad.html · aviso-legal.html   ← esqueletos con TODOs del dueño
├── robots.txt · sitemap.xml · .htaccess
└── README.md
```

El **motor** (`calculo.js`) no toca el DOM y se testea solo. El modo inverso
(`calcularObjetivo`) reutiliza el forward (`calcular`) para el desglose, así que
hay una sola fuente de verdad matemática.

### La fórmula central

```
precio = (costo + costos fijos + ganancia objetivo) / (1 − %comisión − %impuestos)
```

Los costos fijos son por unidad (cargo fijo, envío, publicidad, otros). El precio
se redondea **hacia arriba** para que el redondeo nunca baje la ganancia del objetivo.

---

## ▶️ Cómo ejecutarlo localmente

No hay que compilar nada. Servilo por HTTP (el `fetch` de los presets no corre con `file://`):

```bash
cd ecom-calc
python3 -m http.server 8137
# Abrí http://localhost:8137/
```

### Tests

```bash
node tests/calculo.test.js      # → 29/29 tests OK
```

O en el navegador: `http://localhost:8137/tests/test-runner.html`.

Cubren: caso principal (costo $90.000 + ganancia $50.000), redondeo que nunca baja
del objetivo (barrido de casos), costo máximo del proveedor, publicidad máxima,
objetivo 0, costo 0, % total ≥ 100 %, resultado imposible, modo margen, escenarios
de precio y de ganancia, punto de equilibrio, vacíos y negativos — además de los 16
tests originales del motor forward.

---

## 🚀 Cómo publicarlo en Hostinger

1. hPanel → **Administrador de archivos** (o FTP) → carpeta `public_html`.
2. Subí **todo el contenido** de `ecom-calc/` (que `index.html` quede en la raíz).
   Incluí el archivo oculto **`.htaccess`**. Podés omitir `tests/` en producción.
3. Reemplazá `https://margenlibre.com` por tu dominio en `index.html`, `sitemap.xml`,
   `robots.txt`, `privacidad.html` y `aviso-legal.html`.
4. Completá los `TODO OWNER` de las páginas legales (email, titular).
5. Si tenés SSL, descomentá el bloque "HTTPS redirect" del `.htaccess`.
6. Verificá abriendo tu dominio y haciendo un cálculo real.

Al actualizar, subí el `?v=YYYYMMDD` en las referencias a `.css`/`.js` de los HTML.

---

## ✅ Funcionalidades implementadas

- Flujo invertido: costo + ganancia objetivo → **precio recomendado**.
- Objetivo en **pesos** (protagonista) o en **% de margen** (con un clic).
- Selector de **canal** (Mercado Libre / tienda / redes / otro) que adapta la UI.
- **Categoría de ML + memoria de comisión** por navegador (no inventa comisiones).
- Resultado muy visual: precio grande, KPIs, semáforo, tablas de escenarios.
- **Costo máximo del proveedor** (decisión de compra) y **bloque de publicidad**
  con 4 métricas explicadas.
- **Punto de equilibrio** por inversión en stock (opcional).
- Responsive real (sin overflow horizontal desde 320 px), dark-mode, accesibilidad.
- SEO: title/description nuevos por intención de precio de venta, canonical, OG,
  Twitter, JSON-LD (WebApplication + FAQPage), sitemap, robots.
- Slots de AdSense como placeholders (nunca antes del resultado), páginas legales,
  disclaimer. Estructura lista para Google Analytics sin dependencia.
- 100 % estático, sin backend, sin APIs, funciona offline tras la primera carga.

---

## 🔭 Mejoras futuras

- Comparar **dos productos** lado a lado para decidir cuál conviene.
- Guardar/compartir una simulación por hash en la URL (sin backend).
- Exportar el resultado a PDF/imagen desde el navegador.
- Páginas SEO dedicadas por intención (precio de venta con margen, markup, cuánto
  cobrar por un producto, precio mínimo en ML, ROI ecommerce, Shopify/Tienda Nube…),
  reutilizando el mismo motor.
- Modo "publicidad como % del precio" además del monto por venta.
- Activar GA4 y un CMP de cookies al monetizar con AdSense.

---

## ⚠️ Aviso

Esta herramienta es orientativa y no constituye asesoramiento contable, fiscal,
financiero ni comercial. Las comisiones, impuestos, costos de envío y condiciones de
las plataformas pueden cambiar. Verificá los valores vigentes antes de tomar
decisiones comerciales.

MargenLibre es un proyecto **independiente**. No está afiliado, asociado ni
respaldado por Mercado Libre. "Mercado Libre" es marca de sus respectivos titulares.
