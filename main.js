/* =============================================================================
 * main.js — UI de MacroFácil. Cablea el DOM con el motor (calorias.js).
 * Toda la matemática vive en calorias.js. IIFE, sin dependencias externas.
 * ============================================================================= */
(function () {
  "use strict";

  var MF = window.MacroFacil;
  var BRAND = window.__BRAND__ || {};
  var $$ = function (s, sc) { return Array.prototype.slice.call((sc || document).querySelectorAll(s)); };
  function byId(id) { return document.getElementById(id); }
  function safe(fn, n) { try { fn(); } catch (e) { console.warn("[" + n + "]", e); } }

  var CAMPOS = ["edad", "peso", "altura", "actividad", "objetivo", "proteinaNivel", "grasaPct"];

  function num(n) { return MF.formato.numero(n); }

  /* ---------- Lectura ---------- */
  function leerEntrada() {
    var e = {};
    CAMPOS.forEach(function (c) { var el = byId(c); e[c] = el ? el.value : ""; });
    var sx = document.querySelector('input[name="sexo"]:checked');
    e.sexo = sx ? sx.value : "";
    return e;
  }

  /* ---------- Errores ---------- */
  function limpiarErrores() {
    $$(".err").forEach(function (el) { el.textContent = ""; });
    $$(".field").forEach(function (el) { el.classList.remove("field--error"); });
  }
  function pintarErrores(errores) {
    limpiarErrores();
    errores.forEach(function (er) {
      var slot = document.querySelector('[data-err="' + er.campo + '"]');
      if (slot) { slot.textContent = er.mensaje; var f = slot.closest(".field"); if (f) f.classList.add("field--error"); }
    });
  }

  /* ---------- Estados ---------- */
  var emptyBox, fullBox;
  function mostrar(estado) {
    if (emptyBox) emptyBox.hidden = estado !== "vacio";
    if (fullBox) fullBox.hidden = estado !== "full";
  }

  /* ---------- Render ---------- */
  function render(res) {
    var d = res.resultado;
    mostrar("full");

    byId("r-cal-sub").textContent = d.objetivoLabel;
    byId("r-calorias").textContent = num(d.calorias);
    var note = byId("r-cal-note");
    if (d.ajustePct === 0) note.textContent = "Estas son tus calorías de mantenimiento.";
    else if (d.ajustePct < 0) note.innerHTML = "Déficit del <strong>" + Math.abs(d.ajustePct) + " %</strong> sobre tu mantenimiento (" + num(d.tdee) + " kcal).";
    else note.innerHTML = "Superávit del <strong>" + d.ajustePct + " %</strong> sobre tu mantenimiento (" + num(d.tdee) + " kcal).";

    // Macros
    setMacro("prot", d.proteinaG, d.proteinaKcal, d.proteinaPct);
    setMacro("carb", d.carbosG, d.carbosKcal, d.carbosPct);
    setMacro("grasa", d.grasaG, d.grasaKcal, d.grasaPct);
    byId("carbos-aviso").hidden = !d.avisoCarbos;

    // KPIs
    byId("r-tdee").textContent = num(d.tdee) + " kcal";
    byId("r-bmr").textContent = num(d.bmr) + " kcal";
    byId("r-imc").textContent = d.imc;
    byId("r-comida").textContent = num(d.porComida.calorias) + " kcal";

    var imcLine = byId("imc-line");
    imcLine.hidden = false;
    imcLine.className = "imc-line imc-" + d.imcCategoria.clave;
    imcLine.innerHTML = "IMC " + d.imc + " — <strong>" + d.imcCategoria.label + "</strong>. Por comida (4/día): ~" +
      num(d.porComida.calorias) + " kcal y " + Math.round(d.porComida.proteinaG) + " g de proteína.";

    renderComoSeCalculo(res);
  }

  function setMacro(k, g, kcal, pct) {
    byId("r-" + k + "-g").textContent = Math.round(g) + " g";
    byId("r-" + k + "-kcal").textContent = num(kcal) + " kcal";
    byId("r-" + k + "-pct").textContent = Math.round(pct) + " %";
    var bar = byId("bar-" + k);
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + "%";
  }

  function renderComoSeCalculo(res) {
    var e = res.entrada, d = res.resultado;
    var html = [];
    html.push('<p class="cs-intro">Cálculos aplicados a tus datos:</p>');
    var signo = e.sexo === "mujer" ? "− 161" : "+ 5";
    html.push('<div class="cs-step"><strong>Metabolismo basal (Mifflin-St Jeor)</strong><br>10×' + e.peso +
      " + 6.25×" + e.altura + " − 5×" + e.edad + " " + signo + " = <strong>" + num(d.bmr) + " kcal</strong></div>");
    html.push('<div class="cs-step"><strong>Gasto total (TDEE)</strong><br>' + num(d.bmr) + " × " +
      MF.ACTIVIDAD[e.actividad].factor + " (" + escapeActividad(e.actividad) + ") = <strong>" + num(d.tdee) + " kcal</strong></div>");
    html.push('<div class="cs-step"><strong>Calorías objetivo</strong><br>' + num(d.tdee) +
      (d.ajustePct === 0 ? " (mantener)" : " × (1 " + (d.ajustePct < 0 ? "−" : "+") + " " + Math.abs(d.ajustePct) + "%)") +
      " = <strong>" + num(d.calorias) + " kcal</strong></div>");
    html.push('<div class="cs-step"><strong>Macros</strong><br>Proteína ' + Math.round(d.proteinaG) + " g (" +
      MF.PROTEINA[e.proteinaNivel].gkg + " g/kg) · Grasa " + Math.round(d.grasaG) + " g · Carbos " +
      Math.round(d.carbosG) + " g (el resto de las calorías)</div>");
    html.push('<div class="cs-step"><strong>IMC</strong><br>' + e.peso + " ÷ (" + (e.altura / 100) +
      ")² = <strong>" + d.imc + "</strong> (" + d.imcCategoria.label + ")</div>");
    byId("calc-steps").innerHTML = html.join("");
  }
  function escapeActividad(k) { return (MF.ACTIVIDAD[k] || {}).label ? MF.ACTIVIDAD[k].label.split(" — ")[0].toLowerCase() : k; }

  /* ---------- Recalcular ---------- */
  function recalcular() {
    var entrada = leerEntrada();
    var res = MF.calcular(entrada);
    if (!res.valido) {
      var pristino = !entrada.sexo && CAMPOS.filter(function (c) { return c !== "actividad" && c !== "objetivo" && c !== "proteinaNivel"; })
        .every(function (c) { return String(entrada[c] || "").trim() === ""; });
      if (pristino) { limpiarErrores(); mostrar("vacio"); return; }
      pintarErrores(res.errores);
      if (!(fullBox && !fullBox.hidden)) mostrar("vacio");
      return;
    }
    limpiarErrores();
    render(res);
  }
  var t = null;
  function recalcularDebounced() { clearTimeout(t); t = setTimeout(recalcular, 130); }

  /* ---------- Poblado de selects ---------- */
  function poblarSelect(id, obj, valorKey) {
    var sel = byId(id);
    if (!sel) return;
    Object.keys(obj).forEach(function (k) {
      var opt = document.createElement("option");
      opt.value = k; opt.textContent = obj[k].label;
      sel.appendChild(opt);
    });
    var init = (BRAND.valoresIniciales || {})[valorKey];
    if (init && obj[init]) sel.value = init;
  }

  /* ---------- Limpiar ---------- */
  function limpiarTodo() {
    var init = BRAND.valoresIniciales || {};
    CAMPOS.forEach(function (c) { var el = byId(c); if (el) el.value = init[c] !== undefined && init[c] !== "" ? init[c] : (el.tagName === "SELECT" ? el.value : ""); });
    byId("edad").value = ""; byId("peso").value = ""; byId("altura").value = ""; byId("grasaPct").value = "";
    $$('input[name="sexo"]').forEach(function (r) { r.checked = false; });
    limpiarErrores();
    mostrar("vacio");
    var s = document.querySelector('input[name="sexo"]'); if (s) s.focus();
  }

  /* ---------- Init ---------- */
  function boot() {
    emptyBox = byId("results-empty");
    fullBox = byId("results-full");
    if (!MF) { console.error("Motor no disponible"); return; }

    safe(function () { poblarSelect("actividad", MF.ACTIVIDAD, "actividad"); }, "actividad");
    safe(function () { poblarSelect("objetivo", MF.OBJETIVOS, "objetivo"); }, "objetivo");
    safe(function () { poblarSelect("proteinaNivel", MF.PROTEINA, "proteinaNivel"); }, "proteina");

    CAMPOS.forEach(function (c) {
      var el = byId(c); if (!el) return;
      el.addEventListener("input", recalcularDebounced);
      el.addEventListener("change", recalcular);
    });
    $$('input[name="sexo"]').forEach(function (r) { r.addEventListener("change", recalcular); });

    var form = byId("form-calc");
    if (form) form.addEventListener("submit", function (ev) { ev.preventDefault(); recalcular(); });
    var bl = byId("btn-limpiar"); if (bl) bl.addEventListener("click", limpiarTodo);
    var br = byId("btn-reset-vista"); if (br) br.addEventListener("click", function () {
      limpiarTodo(); var top = byId("calculadora"); if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    var y = byId("year"); if (y) y.textContent = new Date().getFullYear();

    recalcular();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
