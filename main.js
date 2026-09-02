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

    // Aviso si en Mercado Libre no se cargó la comisión (resultado incompleto/obvio).
    var warn = byId("warn-comision");
    if (warn) warn.hidden = !(e.canal === "mercadolibre" && e.comisionPct === 0);

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
    var mlCat = byId("ml-cat");
    if (mlCat) mlCat.style.display = esML ? "" : "none";
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

  /* ===========================================================================
   * Categoría + comisión OFICIAL de Mercado Libre (API pública, sin clave).
   * - domain_discovery/search: predice la categoría a partir del nombre del producto.
   * - listing_prices: devuelve la comisión real (% + cargo fijo) por categoría.
   * Todo con try/catch y fallback a carga manual si no hay conexión.
   * ========================================================================= */
  var ML_BASE = "https://api.mercadolibre.com";
  var ML_SITE_POR_MONEDA = { ARS: "MLA", MXN: "MLM", CLP: "MLC", COP: "MCO", BRL: "MLB", UYU: "MLU", PEN: "MPE" };
  var LS_FEE = "margenlibre:mlfee:"; // cache categoría -> {pct, fijo, nombre}
  var catSeleccionada = null;         // { id, nombre }
  var feePorTipo = null;              // { gold_special: {pct,fijo}, gold_pro: {...} }

  function mlSite() { return ML_SITE_POR_MONEDA[monedaActual] || "MLA"; }
  function precioEstimado() {
    var costo = RML.parseNumero((byId("costoProducto") || {}).value, 0);
    var gan = RML.parseNumero((byId("gananciaObjetivo") || {}).value, 0);
    var ref = RML.parseNumero((byId("precioReferencia") || {}).value, 0);
    return ref > 0 ? ref : Math.max(1, costo + gan);
  }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }

  function catStatus(msg, tipo) {
    var el = byId("cat-status");
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ""; el.className = "cat-status"; return; }
    el.hidden = false; el.textContent = msg;
    el.className = "cat-status" + (tipo ? " cat-status--" + tipo : "");
  }

  function tipoListing() {
    var r = document.querySelector('input[name="listing"]:checked');
    return r ? r.value : "gold_special";
  }

  // Busca categorías por nombre de producto (predictor de ML).
  function buscarCategorias() {
    var q = (byId("cat-q") || {}).value.trim() || (byId("nombreProducto") || {}).value.trim();
    if (!q) { catStatus("Escribí tu producto (ej: termo Stanley) y tocá Buscar.", "warn"); return; }
    catStatus("Buscando en Mercado Libre…", "load");
    var lista = byId("cat-resultados"); if (lista) { lista.hidden = true; lista.innerHTML = ""; }
    var url = ML_BASE + "/sites/" + mlSite() + "/domain_discovery/search?limit=8&q=" + encodeURIComponent(q);
    fetch(url).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (arr) {
        if (!Array.isArray(arr) || arr.length === 0) { catStatus("No encontramos categorías para «" + q + "». Probá con otro nombre o cargá la comisión a mano abajo.", "warn"); return; }
        // Deduplicar por category_id
        var vistos = {}, items = [];
        arr.forEach(function (x) {
          if (x.category_id && !vistos[x.category_id]) { vistos[x.category_id] = 1; items.push(x); }
        });
        catStatus("", null);
        pintarResultados(items);
      })
      .catch(function () {
        catStatus("No pudimos conectar con Mercado Libre (puede ser tu conexión). Cargá tu comisión a mano abajo: está en tu publicación → «Costo de venta».", "warn");
      });
  }

  function pintarResultados(items) {
    var lista = byId("cat-resultados");
    if (!lista) return;
    lista.innerHTML = items.map(function (x, i) {
      var nombre = x.category_name || x.domain_name || "Categoría";
      return '<li><button type="button" class="cat-op" data-i="' + i + '">' +
        escapeHtml(nombre) + '</button></li>';
    }).join("");
    lista.hidden = false;
    Array.prototype.forEach.call(lista.querySelectorAll(".cat-op"), function (btn) {
      btn.addEventListener("click", function () {
        var it = items[parseInt(btn.getAttribute("data-i"), 10)];
        seleccionarCategoria(it.category_id, it.category_name || it.domain_name || "Categoría");
      });
    });
  }

  // Trae la comisión oficial de una categoría y la aplica.
  function seleccionarCategoria(catId, nombre) {
    catSeleccionada = { id: catId, nombre: nombre };
    var lista = byId("cat-resultados"); if (lista) lista.hidden = true;
    catStatus("Trayendo la comisión de «" + nombre + "»…", "load");
    traerComision(catId).then(function (fees) {
      feePorTipo = fees;
      lsSet(LS_FEE + catId, { fees: fees, nombre: nombre });
      mostrarCategoriaSeleccionada();
      aplicarComision();
      catStatus("", null);
    }).catch(function () {
      // Sin conexión: si hay cache, usarla; si no, dejar manual.
      var cache = lsGet(LS_FEE + catId);
      if (cache && cache.fees) {
        feePorTipo = cache.fees;
        mostrarCategoriaSeleccionada();
        aplicarComision();
        catStatus("Usamos un valor guardado (sin conexión con ML ahora).", "warn");
      } else {
        catStatus("Elegiste «" + nombre + "» pero no pudimos traer la comisión. Cargala a mano abajo.", "warn");
        mostrarCategoriaSeleccionada();
      }
    });
  }

  function traerComision(catId) {
    var precio = precioEstimado();
    var url = ML_BASE + "/sites/" + mlSite() + "/listing_prices?price=" + encodeURIComponent(precio) + "&category_id=" + encodeURIComponent(catId);
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (arr) {
        var out = {};
        (Array.isArray(arr) ? arr : []).forEach(function (row) {
          var det = row.sale_fee_details || {};
          if (row.listing_type_id && det.percentage_fee != null) {
            out[row.listing_type_id] = { pct: det.percentage_fee, fijo: det.fixed_fee || 0 };
          }
        });
        if (!out.gold_special && !out.gold_pro) throw new Error("sin datos");
        return out;
      });
  }

  function mostrarCategoriaSeleccionada() {
    var box = byId("cat-sel");
    if (box) box.hidden = false;
    var nameEl = byId("cat-sel-name");
    if (nameEl && catSeleccionada) nameEl.textContent = catSeleccionada.nombre;
  }

  function aplicarComision() {
    if (!feePorTipo) return;
    var tipo = tipoListing();
    var fee = feePorTipo[tipo] || feePorTipo.gold_special || feePorTipo.gold_pro;
    if (!fee) return;
    setVal("comisionPct", RML.redondear(fee.pct, 2));
    setVal("cargoFijo", RML.redondear(fee.fijo, 2));
    var feeEl = byId("cat-sel-fee");
    if (feeEl) {
      var tName = tipo === "gold_pro" ? "Premium" : "Clásica";
      feeEl.innerHTML = "Comisión oficial de Mercado Libre: <strong>" + fPct(fee.pct, 1) + "</strong>" +
        (fee.fijo > 0 ? " + " + fMoneda(fee.fijo) + " fijo" : "") +
        " · publicación <strong>" + tName + "</strong>. Podés editarla abajo.";
    }
    recalcular();
  }

  function setVal(id, v) { var el = byId(id); if (el) el.value = v; }

  function cambiarCategoria() {
    catSeleccionada = null; feePorTipo = null;
    var box = byId("cat-sel"); if (box) box.hidden = true;
    var lista = byId("cat-resultados"); if (lista) lista.hidden = true;
    catStatus("", null);
    var q = byId("cat-q"); if (q) q.focus();
  }

  function initCategorias() {
    var btn = byId("cat-buscar");
    if (btn) btn.addEventListener("click", buscarCategorias);
    var q = byId("cat-q");
    if (q) {
      q.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); buscarCategorias(); } });
      // Pre-cargar el nombre del producto como término de búsqueda.
      var nombre = byId("nombreProducto");
      if (nombre) nombre.addEventListener("change", function () { if (!q.value.trim()) q.value = nombre.value.trim(); });
    }
    var cambiar = byId("cat-cambiar");
    if (cambiar) cambiar.addEventListener("click", cambiarCategoria);
    $$('input[name="listing"]').forEach(function (r) { r.addEventListener("change", aplicarComision); });
  }

  /* ---------- Limpiar ---------- */
  function limpiarTodo() {
    var init = BRAND.valoresIniciales || {};
    CAMPOS.forEach(function (c) { var el = byId(c); if (el) el.value = init[c] !== undefined ? init[c] : ""; });
    var canal = byId("canal"); if (canal) canal.selectedIndex = 0;
    var catQ = byId("cat-q"); if (catQ) catQ.value = "";
    cambiarCategoria();
    var savedN = byId("comision-saved"); if (savedN) savedN.hidden = true;
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
    safe(initCategorias, "initCategorias");

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
