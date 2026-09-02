/* =============================================================================
 * main.js — UI de "Decime cuánto querés ganar y te digo a cuánto vender".
 * Solo cablea el DOM con el motor (calculo.js). Toda la matemática vive en
 * calculo.js (RML.calcularObjetivo). IIFE, sin dependencias externas.
 * ============================================================================= */
(function () {
  "use strict";

  var RML = window.RentabilidadML;
  var BRAND = window.__BRAND__ || {};

  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }
  function byId(id) { return document.getElementById(id); }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Campos de valor del formulario (para leer, limpiar y detectar "prístino").
  var CAMPOS = [
    "nombreProducto", "costoProducto", "gananciaObjetivo", "margenObjetivoPct",
    "comisionPct", "cargoFijo", "envio", "impuestosPct", "publicidad",
    "otrosCostos", "precioReferencia", "inversionInicial"
  ];
  // Campos numéricos que definen si el formulario está "vacío/prístino".
  var CAMPOS_VALOR = ["costoProducto", "gananciaObjetivo", "margenObjetivoPct"];

  var monedaActual = BRAND.monedaDefecto || "ARS";
  var presetsData = null;
  var modoObjetivo = "ganancia"; // "ganancia" | "margen"

  function fMoneda(n) { return RML.formato.moneda(n, monedaActual); }
  function fPct(n, d) { return RML.formato.porcentaje(n, d === undefined ? 1 : d); }

  /* ---------- Lectura ---------- */
  function leerEntrada() {
    var e = {};
    CAMPOS.forEach(function (c) { var el = byId(c); e[c] = el ? el.value : ""; });
    e.modoObjetivo = modoObjetivo;
    e.canal = (byId("canal") || {}).value || "mercadolibre";
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
      if (slot) {
        slot.textContent = er.mensaje;
        var field = slot.closest(".field");
        if (field) field.classList.add("field--error");
      }
    });
  }

  /* ---------- Estados de la vista ---------- */
  var emptyBox, fullBox, impBox;
  function mostrar(estado) {
    if (emptyBox) emptyBox.hidden = estado !== "vacio";
    if (impBox) impBox.hidden = estado !== "imposible";
    if (fullBox) fullBox.hidden = estado !== "full";
  }

  /* ---------- Render ---------- */
  function render(res) {
    var d = res.resultado, e = res.entrada;

    if (d.imposible) {
      byId("r-imposible").textContent = d.motivoImposible;
      mostrar("imposible");
      return;
    }
    mostrar("full");

    var prod = d.nombreProducto ? (" de tu " + d.nombreProducto) : "";
    // Línea de objetivo
    var objTxt = (d.modoObjetivo === "ganancia")
      ? ("Para ganar " + fMoneda(d.gananciaObjetivo) + " por unidad" + prod + "…")
      : ("Para un margen de " + fPct(e.margenObjetivoPct, 0) + prod + "…");
    byId("r-obj-line").textContent = objTxt;

    // Precio grande
    byId("r-precio").textContent = fMoneda(d.precio);
    byId("r-precio-sub").innerHTML = "Con este precio, después de tus costos, tu ganancia sería de aproximadamente <strong>" +
      fMoneda(d.gananciaUnit) + "</strong> por unidad.";

    // Semáforo
    var hero = byId("hero-result");
    hero.setAttribute("data-estado", d.semaforo.estado);
    byId("semaforo-label").textContent = d.semaforo.etiqueta;

    // KPIs
    byId("r-ganancia").textContent = fMoneda(d.gananciaUnit);
    byId("r-margen").textContent = fPct(d.margenPct);
    byId("r-costos").textContent = fMoneda(d.costosTotales);
    byId("r-roi").textContent = fPct(d.roiPct);

    // Tabla de precios
    var filasP = d.escenariosPrecio.map(function (row) {
      return '<tr' + (row.objetivo ? ' class="row-obj"' : '') + '>' +
        '<td>' + fMoneda(row.precio) + (row.objetivo ? ' <span class="tag-obj">objetivo</span>' : '') + '</td>' +
        '<td class="' + (row.ganancia < 0 ? 'neg' : '') + '">' + fMoneda(row.ganancia) + '</td>' +
        '<td>' + fPct(row.margen) + '</td></tr>';
    }).join("");
    byId("tbl-precios").innerHTML = filasP;

    // Costo máximo del proveedor
    byId("costomax-ref").textContent = "A un precio de venta de " + fMoneda(d.precioReferencia) + ":";
    var costomaxEl = byId("r-costomax");
    if (d.costoMaximoPosible) {
      costomaxEl.textContent = fMoneda(d.costoMaximo);
      costomaxEl.classList.remove("neg");
      byId("costomax-msg").innerHTML = "Ese es el <strong>máximo que podés pagarle al proveedor</strong> por unidad y seguir alcanzando tu objetivo. Si te cuesta más, no te deja la ganancia que buscás.";
    } else {
      costomaxEl.textContent = "No alcanza";
      costomaxEl.classList.add("neg");
      byId("costomax-msg").innerHTML = "A ese precio de venta no llegás a tu objetivo ni pagando $0 por el producto. Subí el precio o bajá tu ganancia objetivo.";
    }

    // Publicidad
    byId("r-pubactual").textContent = fMoneda(d.publicidadActual);
    byId("r-pubadic").textContent = fMoneda(Math.max(0, d.publicidadAdicional));
    byId("r-maxpub").textContent = fMoneda(Math.max(0, d.maxPublicidad));
    byId("r-acos").textContent = d.acosEquilibrioPct <= 0 ? "0 %" : fPct(d.acosEquilibrioPct);
    var pubMsg = byId("pub-msg");
    if (d.publicidadAdicional > 0) {
      pubMsg.innerHTML = "Ya gastás <strong>" + fMoneda(d.publicidadActual) + "</strong> por venta. " +
        "Te quedan <strong>" + fMoneda(d.publicidadAdicional) + "</strong> adicionales antes de llegar a $0 de ganancia " +
        "(máximo total <strong>" + fMoneda(d.maxPublicidad) + "</strong> por venta).";
      pubMsg.classList.remove("msg-warn");
    } else {
      pubMsg.innerHTML = "⚠️ Ya estás en el límite de publicidad para este precio. Cualquier gasto extra en ads te deja por debajo de tu objetivo.";
      pubMsg.classList.add("msg-warn");
    }

    // Punto de equilibrio (inversión)
    var eqBox = byId("equilibrio-box");
    if (d.unidadesEquilibrio != null) {
      eqBox.hidden = false;
      byId("r-unidades").textContent = d.unidadesEquilibrio + " u.";
      byId("equilibrio-msg").innerHTML = "Con una inversión de <strong>" + fMoneda(d.inversionInicial) +
        "</strong> y una ganancia de <strong>" + fMoneda(d.gananciaUnit) + "</strong> por unidad, " +
        "recuperás tu inversión vendiendo <strong>" + d.unidadesEquilibrio + " unidades</strong>. Desde ahí, todo es ganancia.";
    } else {
      eqBox.hidden = true;
    }

    // Decisión + escenarios de ganancia
    byId("r-precio-objetivo").textContent = fMoneda(d.precio);
    byId("r-decision-sub").innerHTML = (d.modoObjetivo === "ganancia")
      ? ("Con este precio alcanzás tu objetivo de " + fMoneda(d.gananciaObjetivo) + " de ganancia por unidad.")
      : ("Con este precio alcanzás tu margen objetivo de " + fPct(e.margenObjetivoPct, 0) + ".");

    var escGan = byId("escenarios-ganancia");
    if (d.escenariosGanancia) {
      escGan.hidden = false;
      byId("tbl-ganancias").innerHTML = d.escenariosGanancia.map(function (row) {
        return '<tr' + (row.objetivo ? ' class="row-obj"' : '') + '>' +
          '<td>' + fMoneda(row.ganancia) + '</td>' +
          '<td>' + (row.precio == null ? "—" : fMoneda(row.precio)) +
          (row.objetivo ? ' <span class="tag-obj">objetivo</span>' : '') + '</td></tr>';
      }).join("");
    } else {
      escGan.hidden = true;
    }

    renderComoSeCalculo(res);
  }

  function renderComoSeCalculo(res) {
    var e = res.entrada, d = res.resultado;
    var m = fMoneda;
    var fijos = e.costoProducto + e.cargoFijo + e.envio + e.publicidad + e.otrosCostos;
    var kPct = e.comisionPct + e.impuestosPct;
    var html = [];
    html.push('<p class="cs-intro">Cálculos aplicados a tus números:</p>');

    html.push('<div class="cs-step"><strong>Costos por unidad (sin %)</strong><br>' +
      m(e.costoProducto) + " (producto) + " + m(e.cargoFijo) + " (cargo fijo) + " + m(e.envio) +
      " (envío) + " + m(e.publicidad) + " (publicidad) + " + m(e.otrosCostos) + " (otros) = <strong>" +
      m(fijos) + "</strong></div>");

    if (d.modoObjetivo === "ganancia") {
      html.push('<div class="cs-step"><strong>Precio para tu objetivo</strong><br>(' +
        m(d.gananciaObjetivo) + " objetivo + " + m(fijos) + " costos) ÷ (1 − " + fPct(kPct, 1) +
        ") = " + m(d.precioExacto) + " → redondeado a <strong>" + m(d.precio) + "</strong></div>");
    } else {
      html.push('<div class="cs-step"><strong>Precio para tu margen</strong><br>' + m(fijos) +
        " ÷ (1 − " + fPct(kPct, 1) + " − " + fPct(e.margenObjetivoPct, 1) + ") = " + m(d.precioExacto) +
        " → redondeado a <strong>" + m(d.precio) + "</strong></div>");
    }

    html.push('<div class="cs-step"><strong>Ganancia real a ese precio</strong><br>' + m(d.precio) +
      " − costos − comisión (" + fPct(e.comisionPct, 1) + ") − impuestos (" + fPct(e.impuestosPct, 1) +
      ") = <strong>" + m(d.gananciaUnit) + "</strong> (nunca menos que tu objetivo)</div>");

    html.push('<div class="cs-step"><strong>Costo máximo del proveedor</strong><br>' + m(d.precioReferencia) +
      " × (1 − " + fPct(kPct, 1) + ") − ganancia objetivo − costos fijos = <strong>" +
      (d.costoMaximoPosible ? m(d.costoMaximo) : "no alcanza") + "</strong></div>");

    html.push('<div class="cs-step"><strong>Máximo de publicidad por venta</strong><br>ganancia antes de ads = <strong>' +
      m(d.maxPublicidad) + "</strong> · ACOS de equilibrio = <strong>" +
      (d.acosEquilibrioPct <= 0 ? "0 %" : fPct(d.acosEquilibrioPct)) + "</strong></div>");

    byId("calc-steps").innerHTML = html.join("");
  }

  /* ---------- Recalcular ---------- */
  function recalcular() {
    var entrada = leerEntrada();
    var res = RML.calcularObjetivo(entrada);

    if (!res.valido) {
      var pristino = CAMPOS_VALOR.every(function (c) { return String(entrada[c] || "").trim() === ""; });
      if (pristino) { limpiarErrores(); mostrar("vacio"); return; }
      pintarErrores(res.errores);
      if (!(fullBox && !fullBox.hidden)) mostrar("vacio");
      return;
    }
    limpiarErrores();
    render(res);
  }

  var debounceTimer = null;
  function recalcularDebounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(recalcular, 140);
  }

  /* ---------- Modo objetivo (ganancia $ / margen %) ---------- */
  function toggleModo() {
    modoObjetivo = modoObjetivo === "ganancia" ? "margen" : "ganancia";
    var esGanancia = modoObjetivo === "ganancia";
    byId("wrap-ganancia").hidden = !esGanancia;
    byId("wrap-margen").hidden = esGanancia;
    byId("objetivo-label").innerHTML = esGanancia
      ? '¿Cuánto querés ganar por unidad? <span class="req">*</span>'
      : '¿Qué margen querés? <span class="req">*</span>';
    byId("objetivo-hint").textContent = esGanancia
      ? "Tu objetivo de ganancia en pesos por cada venta."
      : "Tu objetivo de margen, como % del precio de venta.";
    var btn = byId("modo-toggle");
    btn.textContent = esGanancia ? "Usar % de margen" : "Usar ganancia en $";
    btn.setAttribute("aria-pressed", String(!esGanancia));
    limpiarErrores();
    recalcular();
  }

  /* ---------- Canal ---------- */
  function onCanalChange() {
    var canal = (byId("canal") || {}).value;
    var esML = canal === "mercadolibre";
    var catBar = byId("cat-bar");
    if (catBar) catBar.style.display = esML ? "" : "none";
    var label = byId("comision-label");
    if (label) {
      label.textContent = esML ? "Comisión de Mercado Libre"
        : (canal === "redes" ? "Comisión / recargo (si hay)" : "Comisión de la plataforma");
    }
    recalcular();
  }

  /* ---------- Moneda ---------- */
  function poblarMonedas() {
    var sel = byId("moneda");
    if (!sel) return;
    Object.keys(RML.MONEDAS).forEach(function (cod) {
      var m = RML.MONEDAS[cod];
      var opt = document.createElement("option");
      opt.value = cod; opt.textContent = cod + " · " + m.nombre;
      if (cod === monedaActual) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
      monedaActual = sel.value; actualizarSimbolos(); recalcular();
    });
    actualizarSimbolos();
  }
  function actualizarSimbolos() {
    var sym = (RML.MONEDAS[monedaActual] || {}).simbolo || "$";
    $$(".input-money").forEach(function (el) { el.setAttribute("data-sym", sym); });
  }

  /* ---------- Categorías + memoria por navegador ---------- */
  var LS_KEY = "margenlibre:comision:";
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(LS_KEY + k) || "null"); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(LS_KEY + k, JSON.stringify(v)); } catch (_) {} }
  function catActual() { var s = byId("categoria"); return s ? s.value : ""; }
  function nombreCat(id) {
    if (!presetsData || !presetsData.categorias) return "esta categoría";
    var c = presetsData.categorias.filter(function (x) { return x.id === id; })[0];
    return c ? c.nombre : "esta categoría";
  }
  function refCat(id) {
    if (!presetsData || !presetsData.categorias) return null;
    return presetsData.categorias.filter(function (x) { return x.id === id; })[0] || null;
  }
  function setVal(id, v) { var el = byId(id); if (el) el.value = v; }

  function aplicarCategorias(data) {
    presetsData = data;
    var sel = byId("categoria");
    if (!sel || !data || !data.categorias) return;
    data.categorias.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id; opt.textContent = c.nombre;
      sel.appendChild(opt);
    });
  }

  function onCategoriaChange() {
    var id = catActual();
    var note = byId("cat-ref-note");
    if (note) { note.hidden = true; note.textContent = ""; }
    if (!id || id === "sin-cat") return;

    var guardado = lsGet(id);
    if (guardado && guardado.comisionPct != null && guardado.comisionPct !== "") {
      setVal("comisionPct", guardado.comisionPct);
      if (guardado.cargoFijo != null && guardado.cargoFijo !== "") setVal("cargoFijo", guardado.cargoFijo);
      if (note) { note.hidden = false; note.innerHTML = "Usamos la comisión que guardaste para <strong>" +
        escapeHtml(nombreCat(id)) + "</strong> (" + escapeHtml(String(guardado.comisionPct)) + " %). Editala si cambió."; }
      recalcular(); return;
    }
    var ref = refCat(id);
    if (ref && ref.comisionRefPct != null && ref.comisionRefPct !== "") {
      setVal("comisionPct", ref.comisionRefPct);
      if (ref.cargoFijoRef != null && ref.cargoFijoRef !== "") setVal("cargoFijo", ref.cargoFijoRef);
      if (note) { note.hidden = false; note.innerHTML = "Valor <strong>orientativo</strong> (no oficial). Verificá el tuyo en tu publicación o en el simulador de ML."; }
      recalcular(); return;
    }
    if (note) { note.hidden = false; note.innerHTML = "Cargá tu comisión de <strong>" +
      escapeHtml(nombreCat(id)) + "</strong> abajo y la recordamos para la próxima."; }
  }

  function recordarComision() {
    var id = catActual();
    if (!id || id === "sin-cat") return;
    var comision = (byId("comisionPct") || {}).value;
    var cargo = (byId("cargoFijo") || {}).value;
    if (String(comision || "").trim() === "") return;
    lsSet(id, { comisionPct: comision, cargoFijo: cargo });
    var saved = byId("comision-saved");
    if (saved) {
      saved.hidden = false;
      saved.textContent = "✓ Guardado para " + nombreCat(id) + " en este navegador.";
      clearTimeout(recordarComision._t);
      recordarComision._t = setTimeout(function () { saved.hidden = true; }, 2600);
    }
  }

  function cargarCategorias() {
    var sel = byId("categoria");
    if (!sel) return;
    if (window.__PRESETS__) { aplicarCategorias(window.__PRESETS__); }
    else {
      fetch(BRAND.presetsUrl || "data/presets.json", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(aplicarCategorias)
        .catch(function () { var bar = byId("cat-bar"); if (bar) bar.style.display = "none"; });
    }
    sel.addEventListener("change", onCategoriaChange);
    var comEl = byId("comisionPct"), cargoEl = byId("cargoFijo");
    if (comEl) comEl.addEventListener("change", recordarComision);
    if (cargoEl) cargoEl.addEventListener("change", recordarComision);
  }

  /* ---------- Limpiar ---------- */
  function limpiarTodo() {
    var init = BRAND.valoresIniciales || {};
    CAMPOS.forEach(function (c) { var el = byId(c); if (el) el.value = init[c] !== undefined ? init[c] : ""; });
    var cat = byId("categoria"); if (cat) cat.selectedIndex = 0;
    var canal = byId("canal"); if (canal) canal.selectedIndex = 0;
    [ "cat-ref-note", "comision-saved" ].forEach(function (id) { var el = byId(id); if (el) el.hidden = true; });
    if (modoObjetivo !== "ganancia") toggleModo();
    onCanalChange();
    limpiarErrores();
    mostrar("vacio");
    var costo = byId("costoProducto"); if (costo) costo.focus();
  }

  /* ---------- Init ---------- */
  function aplicarIniciales() {
    var init = BRAND.valoresIniciales || {};
    CAMPOS.forEach(function (c) { var el = byId(c); if (el && init[c] !== undefined && el.value === "") el.value = init[c]; });
  }

  function boot() {
    emptyBox = byId("results-empty");
    fullBox = byId("results-full");
    impBox = byId("results-imposible");
    if (!RML) { console.error("Motor de cálculo no disponible"); return; }

    safe(aplicarIniciales, "aplicarIniciales");
    safe(poblarMonedas, "poblarMonedas");
    safe(cargarCategorias, "cargarCategorias");

    CAMPOS.forEach(function (c) { var el = byId(c); if (el) el.addEventListener("input", recalcularDebounced); });

    var form = byId("form-calc");
    if (form) form.addEventListener("submit", function (ev) { ev.preventDefault(); recalcular(); });
    var toggle = byId("modo-toggle");
    if (toggle) toggle.addEventListener("click", toggleModo);
    var canal = byId("canal");
    if (canal) canal.addEventListener("change", onCanalChange);
    var btnLimpiar = byId("btn-limpiar");
    if (btnLimpiar) btnLimpiar.addEventListener("click", limpiarTodo);
    var btnReset = byId("btn-reset-vista");
    if (btnReset) btnReset.addEventListener("click", function () {
      limpiarTodo();
      var top = byId("calculadora");
      if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    var year = byId("year");
    if (year) year.textContent = new Date().getFullYear();

    safe(onCanalChange, "onCanalChange");
    recalcular();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
