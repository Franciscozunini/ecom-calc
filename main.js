/* =============================================================================
 * main.js — UI de la calculadora. Solo cablea el DOM con el motor (calculo.js).
 * Toda la matemática vive en calculo.js; acá solo leemos inputs, pedimos el
 * cálculo y pintamos resultados. IIFE, sin dependencias externas.
 * ============================================================================= */
(function () {
  "use strict";

  var RML = window.RentabilidadML;
  var BRAND = window.__BRAND__ || {};

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  var CAMPOS = [
    "precioVenta", "costoProducto", "comisionPct", "cargoFijo", "envio",
    "impuestosPct", "publicidad", "otrosCostos", "unidades", "margenObjetivoPct"
  ];

  var monedaActual = BRAND.monedaDefecto || "ARS";
  var presetsData = null;

  function fMoneda(n) { return RML.formato.moneda(n, monedaActual); }
  function fPct(n, d) { return RML.formato.porcentaje(n, d === undefined ? 1 : d); }

  /* ---------- Lectura del formulario ---------- */
  function leerEntrada() {
    var e = {};
    CAMPOS.forEach(function (c) {
      var el = document.getElementById(c);
      e[c] = el ? el.value : "";
    });
    return e;
  }

  /* ---------- Errores por campo ---------- */
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

  /* ---------- Render de resultados ---------- */
  var emptyBox = null, fullBox = null;

  function mostrarVacio() {
    if (emptyBox) emptyBox.hidden = false;
    if (fullBox) fullBox.hidden = true;
  }

  function filaDesglose(label, valor, opts) {
    opts = opts || {};
    var cls = "bd-row" + (opts.strong ? " bd-row--strong" : "") + (opts.neg ? " bd-row--neg" : "");
    return '<li class="' + cls + '"><span class="bd-label">' + label +
      '</span><span class="bd-value">' + valor + "</span></li>";
  }

  function render(res) {
    var d = res.resultado;

    if (emptyBox) emptyBox.hidden = true;
    if (fullBox) fullBox.hidden = false;

    // --- Semáforo + principal ---
    var hero = document.getElementById("hero-result");
    hero.setAttribute("data-estado", d.semaforo.estado);
    document.getElementById("semaforo-label").textContent = d.semaforo.etiqueta;

    var gu = document.getElementById("r-gananciaUnit");
    gu.textContent = fMoneda(d.gananciaUnit);
    gu.classList.toggle("is-neg", d.gananciaUnit < 0);

    var mp = document.getElementById("r-margenPct");
    mp.textContent = fPct(d.margenPct);
    mp.classList.toggle("is-neg", d.margenPct < 0);

    // --- Diferencial publicidad ---
    document.getElementById("r-maxAdsVenta").textContent =
      d.maxPublicidadPorVenta < 0 ? fMoneda(0) : fMoneda(d.maxPublicidadPorVenta);
    document.getElementById("r-acos").textContent =
      d.acosEquilibrioPct <= 0 ? "0 %" : fPct(d.acosEquilibrioPct);

    var difEl = document.getElementById("r-difAds");
    var difLabel = document.getElementById("r-difAds-label");
    var adsMsg = document.getElementById("ads-msg");
    var adsBox = document.getElementById("ads-box");

    if (d.deficitarioSinPublicidad) {
      adsBox.setAttribute("data-tone", "danger");
      difLabel.textContent = "Pérdida base (sin ads)";
      difEl.textContent = fMoneda(d.perdidaBaseSinPublicidad);
      difEl.classList.add("is-neg");
      adsMsg.innerHTML = "⚠️ <strong>Tu producto ya es deficitario antes de invertir en publicidad.</strong> " +
        "Con los costos actuales perdés " + fMoneda(Math.abs(d.perdidaBaseSinPublicidad)) +
        " en el lote incluso gastando $0 en anuncios. Revisá precio y costos antes de pautar.";
    } else {
      var sobreGasto = d.diferenciaPublicidad < 0;
      adsBox.setAttribute("data-tone", sobreGasto ? "warn" : "ok");
      difEl.classList.remove("is-neg");
      if (sobreGasto) {
        difLabel.textContent = "Te estás pasando por";
        difEl.textContent = fMoneda(Math.abs(d.diferenciaPublicidad));
        difEl.classList.add("is-neg");
        adsMsg.innerHTML = "⚠️ Estás gastando <strong>" + fMoneda(Math.abs(d.diferenciaPublicidad)) +
          "</strong> más de lo que tu producto aguanta. Bajá la inversión en ads o subí el precio para no vender a pérdida.";
      } else {
        difLabel.textContent = "Margen libre para ads";
        difEl.textContent = fMoneda(d.diferenciaPublicidad);
        adsMsg.innerHTML = "✅ Podés gastar hasta <strong>" + fMoneda(d.maxPublicidadPorVenta) +
          "</strong> por venta en publicidad antes de llegar a $0 de ganancia. " +
          "Hoy tenés " + fMoneda(d.diferenciaPublicidad) + " de margen libre en el lote.";
      }
    }

    // --- Desglose completo ---
    var u = d.unidades;
    var rows = [];
    rows.push(filaDesglose("Ingresos (lote de " + u + ")", fMoneda(d.ingresosLote)));
    rows.push(filaDesglose("Costo del producto", "− " + fMoneda(d.costoProductoLote), { neg: true }));
    rows.push(filaDesglose("Comisión Mercado Libre", "− " + fMoneda(d.comisionLote), { neg: true }));
    rows.push(filaDesglose("Cargo fijo", "− " + fMoneda(d.cargoFijoLote), { neg: true }));
    rows.push(filaDesglose("Envío", "− " + fMoneda(d.envioLote), { neg: true }));
    rows.push(filaDesglose("Impuestos", "− " + fMoneda(d.impuestosLote), { neg: true }));
    rows.push(filaDesglose("Publicidad", "− " + fMoneda(d.publicidad), { neg: true }));
    rows.push(filaDesglose("Otros costos", "− " + fMoneda(d.otrosCostos), { neg: true }));
    rows.push(filaDesglose("Costo total del lote", fMoneda(d.costosLoteTotal), { strong: true }));
    rows.push(filaDesglose("Ganancia neta por venta", fMoneda(d.gananciaUnit), { strong: true }));
    rows.push(filaDesglose("Ganancia del lote (" + u + " u.)", fMoneda(d.gananciaLote), { strong: true }));
    rows.push(filaDesglose("Margen neto", fPct(d.margenPct)));
    rows.push(filaDesglose("ROI", fPct(d.roiPct)));
    rows.push(filaDesglose("Punto de equilibrio",
      d.puntoEquilibrio === null ? "No alcanzable" : (d.puntoEquilibrio + " u.")));
    if (res.entrada.tieneMargenObjetivo) {
      rows.push(filaDesglose("Precio mínimo (margen " + fPct(res.entrada.margenObjetivoPct, 0) + ")",
        d.precioMinimo === null ? "No alcanzable" : fMoneda(d.precioMinimo)));
    }
    rows.push(filaDesglose("Máx. publicidad sin pérdida (lote)",
      d.maxPublicidadLote < 0 ? fMoneda(0) : fMoneda(d.maxPublicidadLote)));
    document.getElementById("breakdown-list").innerHTML = rows.join("");

    // --- Cómo se calculó ---
    renderComoSeCalculo(res);
  }

  function paso(txt) { return '<div class="cs-step">' + txt + "</div>"; }

  function renderComoSeCalculo(res) {
    var e = res.entrada, d = res.resultado;
    var m = function (n) { return fMoneda(n); };
    var comisionUnit = e.precioVenta * (e.comisionPct / 100);
    var impuestosUnit = e.precioVenta * (e.impuestosPct / 100);
    var html = [];

    html.push('<p class="cs-intro">Estos son los cálculos aplicados a los valores que ingresaste:</p>');

    html.push(paso("<strong>Contribución por unidad</strong><br>" +
      m(e.precioVenta) + " (precio) − " + m(e.costoProducto) + " (producto) − " +
      m(comisionUnit) + " (comisión " + fPct(e.comisionPct, 1) + ") − " +
      m(e.cargoFijo) + " (cargo fijo) − " + m(e.envio) + " (envío) − " +
      m(impuestosUnit) + " (impuestos " + fPct(e.impuestosPct, 1) + ") = <strong>" +
      m(d.contribucionUnit) + "</strong>"));

    html.push(paso("<strong>Ganancia del lote</strong> (" + e.unidades + " unidades)<br>" +
      m(d.contribucionUnit) + " × " + e.unidades + " − " + m(d.costosLoteFijos) +
      " (publicidad + otros) = <strong>" + m(d.gananciaLote) + "</strong>"));

    html.push(paso("<strong>Ganancia neta por venta</strong><br>" +
      m(d.gananciaLote) + " ÷ " + e.unidades + " = <strong>" + m(d.gananciaUnit) + "</strong>"));

    html.push(paso("<strong>Margen neto</strong><br>" +
      m(d.gananciaLote) + " ÷ " + m(d.ingresosLote) + " × 100 = <strong>" + fPct(d.margenPct) + "</strong>"));

    html.push(paso("<strong>ROI</strong><br>" +
      m(d.gananciaLote) + " ÷ " + m(d.costosLoteTotal) + " × 100 = <strong>" + fPct(d.roiPct) + "</strong>"));

    if (d.puntoEquilibrio !== null) {
      html.push(paso("<strong>Punto de equilibrio</strong><br>" +
        m(d.costosLoteFijos) + " (costos de lote) ÷ " + m(d.contribucionUnit) +
        " (contribución) redondeado hacia arriba = <strong>" + d.puntoEquilibrio + " unidades</strong>"));
    } else {
      html.push(paso("<strong>Punto de equilibrio</strong><br>La contribución por unidad no es positiva: vendiendo más no se recuperan los costos."));
    }

    html.push(paso("<strong>Máximo gasto en publicidad sin pérdida</strong><br>" +
      m(d.contribucionUnit) + " × " + e.unidades + " − " + m(e.otrosCostos) + " (otros) = <strong>" +
      m(d.maxPublicidadLote) + "</strong> en el lote (" + m(d.maxPublicidadPorVenta) + " por venta)"));

    html.push(paso("<strong>ACOS de equilibrio</strong><br>" +
      m(d.maxPublicidadPorVenta) + " ÷ " + m(e.precioVenta) + " × 100 = <strong>" +
      (d.acosEquilibrioPct <= 0 ? "0 %" : fPct(d.acosEquilibrioPct)) + "</strong>"));

    if (res.entrada.tieneMargenObjetivo) {
      if (d.precioMinimo !== null) {
        html.push(paso("<strong>Precio mínimo para margen " + fPct(e.margenObjetivoPct, 0) + "</strong><br>" +
          "Precio necesario para que la ganancia sea el " + fPct(e.margenObjetivoPct, 0) +
          " del precio = <strong>" + m(d.precioMinimo) + "</strong>"));
      } else {
        html.push(paso("<strong>Precio mínimo para margen " + fPct(e.margenObjetivoPct, 0) + "</strong><br>" +
          "No es alcanzable: la comisión y los impuestos ya se llevan más margen que el objetivo."));
      }
    }

    document.getElementById("calc-steps").innerHTML = html.join("");
  }

  /* ---------- Recalcular ---------- */
  function recalcular() {
    var entrada = leerEntrada();
    var res = RML.calcular(entrada);

    if (!res.valido) {
      // Formulario prístino (solo unidades con su valor por defecto): no mostramos
      // errores todavía, solo el estado vacío. Nada de regañar antes de interactuar.
      var pristino = CAMPOS.every(function (c) {
        return String(entrada[c] || "").trim() === "" || c === "unidades";
      });
      if (pristino) {
        limpiarErrores();
        mostrarVacio();
        return;
      }
      pintarErrores(res.errores);
      // Si hay un resultado previo visible lo mantenemos; si no, estado vacío.
      if (!(fullBox && !fullBox.hidden)) mostrarVacio();
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

  /* ---------- Moneda ---------- */
  function poblarMonedas() {
    var sel = document.getElementById("moneda");
    if (!sel) return;
    Object.keys(RML.MONEDAS).forEach(function (cod) {
      var m = RML.MONEDAS[cod];
      var opt = document.createElement("option");
      opt.value = cod;
      opt.textContent = cod + " · " + m.nombre;
      if (cod === monedaActual) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
      monedaActual = sel.value;
      actualizarSimbolos();
      recalcular();
    });
    actualizarSimbolos();
  }

  function actualizarSimbolos() {
    var sym = (RML.MONEDAS[monedaActual] || {}).simbolo || "$";
    $$(".input-money").forEach(function (el) {
      el.setAttribute("data-sym", sym);
    });
  }

  /* ---------- Categorías + memoria por navegador ----------
   * No inventamos comisiones. La categoría por sí sola no trae un número (los
   * valores de referencia vienen en null en presets.json). Lo que sí hacemos:
   * cuando el usuario carga SU comisión real para una categoría, la recordamos
   * en su propio navegador (localStorage) y la próxima vez la precargamos.
   */
  var LS_KEY = "margenlibre:comision:";

  function lsGet(catId) {
    try { return JSON.parse(localStorage.getItem(LS_KEY + catId) || "null"); }
    catch (_) { return null; }
  }
  function lsSet(catId, obj) {
    try { localStorage.setItem(LS_KEY + catId, JSON.stringify(obj)); } catch (_) {}
  }

  function catActual() {
    var sel = document.getElementById("categoria");
    return sel ? sel.value : "";
  }

  function nombreCat(catId) {
    if (!presetsData || !presetsData.categorias) return "esta categoría";
    var c = presetsData.categorias.filter(function (x) { return x.id === catId; })[0];
    return c ? c.nombre : "esta categoría";
  }

  function aplicarCategoriasData(data) {
    presetsData = data;
    var sel = document.getElementById("categoria");
    if (!sel || !data || !data.categorias) return;
    data.categorias.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nombre;
      sel.appendChild(opt);
    });
  }

  function refDeCategoria(catId) {
    if (!presetsData || !presetsData.categorias) return null;
    return presetsData.categorias.filter(function (x) { return x.id === catId; })[0] || null;
  }

  function onCategoriaChange() {
    var catId = catActual();
    var note = document.getElementById("cat-ref-note");
    if (note) { note.hidden = true; note.textContent = ""; }
    if (!catId || catId === "sin-cat") return;

    // 1) ¿El usuario ya guardó su comisión para esta categoría? → precargar.
    var guardado = lsGet(catId);
    if (guardado && guardado.comisionPct != null && guardado.comisionPct !== "") {
      setVal("comisionPct", guardado.comisionPct);
      if (guardado.cargoFijo != null && guardado.cargoFijo !== "") setVal("cargoFijo", guardado.cargoFijo);
      if (note) {
        note.hidden = false;
        note.innerHTML = "Usamos la comisión que guardaste para <strong>" +
          escapeHtml(nombreCat(catId)) + "</strong> (" + escapeHtml(String(guardado.comisionPct)) +
          " %). Editala si cambió.";
      }
      recalcular();
      return;
    }

    // 2) ¿Hay un valor de REFERENCIA cargado por el dueño del sitio? (por defecto null)
    var ref = refDeCategoria(catId);
    if (ref && ref.comisionRefPct != null && ref.comisionRefPct !== "") {
      setVal("comisionPct", ref.comisionRefPct);
      if (ref.cargoFijoRef != null && ref.cargoFijoRef !== "") setVal("cargoFijo", ref.cargoFijoRef);
      if (note) {
        note.hidden = false;
        note.innerHTML = "Valor <strong>orientativo</strong> (no oficial). Verificá el tuyo en tu publicación o en el simulador de ML.";
      }
      recalcular();
      return;
    }

    // 3) No hay dato: guiamos (el bloque de ayuda ya está visible) y recordamos cuando lo cargue.
    if (note) {
      note.hidden = false;
      note.innerHTML = "Cargá tu comisión de <strong>" + escapeHtml(nombreCat(catId)) +
        "</strong> abajo y la recordamos para la próxima.";
    }
  }

  function setVal(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Cuando el usuario edita la comisión (o el cargo fijo) y hay categoría elegida,
  // guardamos su valor para esa categoría en su navegador.
  function recordarComision() {
    var catId = catActual();
    if (!catId || catId === "sin-cat") return;
    var comision = (document.getElementById("comisionPct") || {}).value;
    var cargo = (document.getElementById("cargoFijo") || {}).value;
    if (String(comision || "").trim() === "") return;
    lsSet(catId, { comisionPct: comision, cargoFijo: cargo });
    var saved = document.getElementById("comision-saved");
    if (saved) {
      saved.hidden = false;
      saved.textContent = "✓ Guardado para " + nombreCat(catId) + " en este navegador.";
      clearTimeout(recordarComision._t);
      recordarComision._t = setTimeout(function () { saved.hidden = true; }, 2600);
    }
  }

  function cargarCategorias() {
    var sel = document.getElementById("categoria");
    if (!sel) return;
    if (window.__PRESETS__) { aplicarCategoriasData(window.__PRESETS__); }
    else {
      fetch(BRAND.presetsUrl || "data/presets.json", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(aplicarCategoriasData)
        .catch(function () {
          var bar = sel.closest(".cat-bar");
          if (bar) bar.style.display = "none";
        });
    }
    sel.addEventListener("change", onCategoriaChange);

    var comEl = document.getElementById("comisionPct");
    var cargoEl = document.getElementById("cargoFijo");
    if (comEl) comEl.addEventListener("change", recordarComision);
    if (cargoEl) cargoEl.addEventListener("change", recordarComision);
  }

  /* ---------- Limpiar / reset ---------- */
  function limpiarTodo() {
    var init = BRAND.valoresIniciales || {};
    CAMPOS.forEach(function (c) {
      var el = document.getElementById(c);
      if (el) el.value = init[c] !== undefined ? init[c] : "";
    });
    var cat = document.getElementById("categoria");
    if (cat) cat.selectedIndex = 0;
    var catNote = document.getElementById("cat-ref-note");
    if (catNote) catNote.hidden = true;
    var saved = document.getElementById("comision-saved");
    if (saved) saved.hidden = true;
    limpiarErrores();
    mostrarVacio();
    var precio = document.getElementById("precioVenta");
    if (precio) precio.focus();
  }

  /* ---------- Init ---------- */
  function aplicarIniciales() {
    var init = BRAND.valoresIniciales || {};
    CAMPOS.forEach(function (c) {
      var el = document.getElementById(c);
      if (el && init[c] !== undefined && el.value === "") el.value = init[c];
    });
  }

  function boot() {
    emptyBox = document.getElementById("results-empty");
    fullBox = document.getElementById("results-full");

    if (!RML) { console.error("Motor de cálculo no disponible"); return; }

    safe(aplicarIniciales, "aplicarIniciales");
    safe(poblarMonedas, "poblarMonedas");
    safe(cargarCategorias, "cargarCategorias");

    // Recalcular en vivo
    CAMPOS.forEach(function (c) {
      var el = document.getElementById(c);
      if (el) el.addEventListener("input", recalcularDebounced);
    });

    var form = document.getElementById("form-calc");
    if (form) form.addEventListener("submit", function (ev) { ev.preventDefault(); recalcular(); });

    var btnLimpiar = document.getElementById("btn-limpiar");
    if (btnLimpiar) btnLimpiar.addEventListener("click", limpiarTodo);

    var btnReset = document.getElementById("btn-reset-vista");
    if (btnReset) btnReset.addEventListener("click", function () {
      limpiarTodo();
      var top = document.getElementById("calculadora");
      if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();

    // Primer cálculo (por si hay valores precargados)
    recalcular();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
