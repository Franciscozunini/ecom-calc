# MacroFácil — Calculadora de calorías y macros

Micro-SaaS web **100 % estático** (HTML + CSS + JavaScript vanilla, sin backend,
sin build, sin dependencias) para el nicho fitness/nutrición: una de las
herramientas más buscadas y mejor monetizables con publicidad.

> Ingresás tus datos y te dice **cuántas calorías** y **cuántos gramos de
> proteína, carbohidratos y grasa** necesitás por día según tu objetivo:
> bajar grasa, mantener o ganar músculo.

Usa fórmulas **estándar y reconocidas** (Mifflin-St Jeor + factores de actividad),
no valores inventados.

---

## ✨ Qué hace

- **Calorías diarias** según objetivo (déficit / mantenimiento / superávit).
- **Macros**: gramos de proteína, carbohidratos y grasa, con kcal y % de cada uno.
- **TDEE** (mantenimiento) y **BMR** (metabolismo basal).
- **IMC** con categoría.
- Reparto **por comida** (4 comidas) como referencia práctica.
- **"Cómo se calculó"** con tus datos reales.

## 📁 Estructura

```
ecom-calc/
├── index.html          ← la calculadora
├── styles.css          ← estilos (mobile-first, dark-mode, paleta verde nutrición)
├── calorias.js         ← MOTOR (sin UI): BMR/TDEE/macros/IMC, testeable en aislamiento
├── main.js             ← UI: cablea el DOM con el motor
├── lib/manifest.js     ← datos de marca (window.__BRAND__)
├── assets/             ← favicon.svg, og-image.svg/.png
├── tests/              ← 12 tests del motor (Node y navegador)
│   ├── calorias.test.js · test-runner.html · runner-ui.js
├── privacidad.html · aviso-legal.html   ← esqueletos con TODOs del dueño
├── robots.txt · sitemap.xml · .htaccess
└── README.md
```

### Fórmulas (documentadas en `calorias.js`)

```
BMR (Mifflin-St Jeor):
  Hombre: 10·peso(kg) + 6.25·altura(cm) − 5·edad + 5
  Mujer:  10·peso(kg) + 6.25·altura(cm) − 5·edad − 161
TDEE = BMR × factor de actividad (1.2 a 1.9)
Calorías objetivo = TDEE × (1 ± ajuste del objetivo)
Proteína: g/kg de peso · Grasa: % de calorías (mín 0.6 g/kg) · Carbos: el resto
IMC = peso / altura(m)²
```

---

## ▶️ Ejecutar localmente

```bash
cd ecom-calc
python3 -m http.server 8137
# Abrí http://localhost:8137/
```

### Tests

```bash
node tests/calorias.test.js      # → 12/12 tests OK
```

O en el navegador: `http://localhost:8137/tests/test-runner.html`.

Cubren: caso verificado a mano, BMR por sexo, factores de actividad, déficit/superávit,
macros que suman las calorías, niveles de proteína, categorías de IMC, mínimo de grasa,
carbos no negativos, inputs vacíos, rangos inválidos y decimales.

---

## 🚀 Publicar en Hostinger

1. hPanel → **Administrador de archivos** (o FTP) → `public_html`.
2. Subí **todo el contenido** de `ecom-calc/` (que `index.html` quede en la raíz).
   Incluí el archivo oculto **`.htaccess`**. Podés omitir `tests/` en producción.
3. Reemplazá `https://macrofacil.com` por tu dominio en `index.html`, `sitemap.xml`,
   `robots.txt`, `privacidad.html` y `aviso-legal.html`.
4. Completá los `TODO OWNER` de las páginas legales (email, titular).
5. Si tenés SSL, descomentá el bloque "HTTPS redirect" del `.htaccess`.
6. Al actualizar, subí el `?v=YYYYMMDD` de las referencias a `.css`/`.js`.

---

## 💰 Monetización

Espacios de AdSense ya reservados (placeholders, sin código): debajo del resultado,
en el contenido y antes del footer. Fitness/nutrición es un vertical de **CPM alto**
(suplementos, apps, ropa deportiva). Pegás tu código de AdSense y listo.

---

## 🔭 Mejoras futuras

- **Calculadora de 1RM** (peso máximo) + tabla de porcentajes.
- **Armá tu plato**: sumar proteína y calorías de alimentos comunes (base incluida).
- Calculadora de **agua diaria**, **IMC** dedicada, **grasa corporal**.
- Unidades imperiales (lb / ft-in) además de métricas.
- Guardar/compartir el resultado por URL (sin backend).

---

## ⚠️ Aviso

Herramienta orientativa. No constituye asesoramiento médico ni nutricional. Los
resultados son estimaciones basadas en fórmulas estándar y pueden no reflejar tus
necesidades reales. Consultá con un profesional de la salud antes de hacer cambios
importantes en tu alimentación o entrenamiento.
