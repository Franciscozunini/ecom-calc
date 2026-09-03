/* Build the single-file GymBox-app.html by inlining CSS + JS from source. */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const out = process.argv[2] || path.join(root, "GymBox-app.html");

const order = [
  "js/calc.js", "js/store.js", "js/foods.js", "js/ui.js", "js/ejercicios.js",
  "js/views-inicio.js", "js/views-entreno.js", "js/views-comida.js",
  "js/views-progreso.js", "js/views-mas.js", "js/app.js"
];

const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const favicon = fs.readFileSync(path.join(root, "assets/favicon.svg"));
const faviconURI = "data:image/svg+xml;base64," + favicon.toString("base64");

const scripts = order.map(function (f) {
  var code = fs.readFileSync(path.join(root, f), "utf8");
  return "  <script>\n/* " + f + " */\n" + code + "\n</script>";
}).join("\n");

const html = `<!DOCTYPE html>
<html lang="es-AR">
<head>
  <!-- GymBox — un solo archivo. Doble clic para abrir; tus datos se guardan en este navegador. -->
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>GymBox — Tu gym, tus datos, tu progreso</title>
  <meta name="description" content="Registrá entrenamientos, comidas, peso y progreso. Todo en tu navegador, sin cuenta." />
  <meta name="robots" content="noindex, follow" />
  <meta name="theme-color" content="#0b0d10" />
  <link rel="icon" type="image/svg+xml" href="${faviconURI}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap" />
  <style>
${css}
  </style>
</head>
<body>
  <noscript>
    <div style="padding:24px;text-align:center;color:#f4f6f8">
      GymBox necesita JavaScript para funcionar. Activalo para registrar tus entrenamientos.
    </div>
  </noscript>
${scripts}
</body>
</html>
`;

fs.writeFileSync(out, html);
console.log("Built " + out + " (" + (html.length / 1024).toFixed(0) + " KB)");
