/* =============================================================================
 * calculo.js — Motor de cálculo de rentabilidad (SIN dependencias de UI)
 * -----------------------------------------------------------------------------
 * Puro, testeable de forma aislada. No toca el DOM. Se puede usar tanto en el
 * navegador (queda expuesto como window.RentabilidadML) como en Node (para los
 * tests unitarios de tests/calculo.test.js).
 *
 * MODELO DE COSTOS (decisión de producto, documentada para el usuario en la
 * sección "Cómo se calculó"):
 *
 *   Costos VARIABLES por unidad (se repiten en cada venta):
 *     - costo del producto
 *     - comisión de Mercado Libre (% sobre el precio)
 *     - cargo fijo de Mercado Libre
 *     - costo de envío
 *     - impuestos (% sobre el precio)
 *
 *   Costos del LOTE (totales, se ingresan una vez para toda la tanda):
 *     - inversión en publicidad / Product Ads
 *     - otros costos
 *
 * Ningún valor de comisión, impuesto o costo está hardcodeado como verdad: TODO
 * lo ingresa el usuario. Los presets viven en data/presets.json y son solo
 * valores de referencia editables.
 *
 * -----------------------------------------------------------------------------
 * CASO VERIFICADO A MANO (sirve de test de humo y de documentación):
 *
 *   precioVenta = 10000, costoProducto = 4000, comisionPct = 13, cargoFijo = 500,
 *   envio = 800, impuestosPct = 5, publicidad = 1000, otrosCostos = 200,
 *   unidades = 10, margenObjetivoPct = 20
 *
 *   comision            = 10000 * 0.13            = 1300
 *   impuestos           = 10000 * 0.05            = 500
 *   cmUnit (contrib.)   = 10000 - 4000 - 1300 - 500 - 800 - 500 = 2900
 *   costosLoteFijos     = 1000 + 200              = 1200
 *   gananciaLote        = 2900*10 - 1200          = 27800
 *   gananciaUnit        = 27800 / 10             = 2780
 *   ingresosLote        = 10000 * 10             = 100000
 *   costosLoteTotal     = 100000 - 27800         = 72200
 *   margenPct           = 27800 / 100000 * 100   = 27.8 %
 *   roiPct              = 27800 / 72200 * 100     = 38.504... %
 *   puntoEquilibrio     = ceil(1200 / 2900)       = 1 unidad
 *   maxPublicidadLote   = 2900*10 - 200           = 28800
 *   maxPublicidadVenta  = 28800 / 10             = 2880
 *   acosEquilibrio      = 2880 / 10000 * 100      = 28.8 %
 *   precioMinimo(20%)   = 5420 / (0.82 - 0.20)    = 8741.935...
 *      (k = 1 - 0.13 - 0.05 = 0.82 ; fijoPorUnidad = 4000+500+800+120 = 5420)
 * ============================================================================= */

(function (global) {
  "use strict";

  /* ---------------------------------------------------------------------------
   * Configuración de monedas. La arquitectura queda lista para otras monedas
   * sin tocar el motor: el motor trabaja siempre con números crudos y el
   * formateo es responsabilidad de la UI (formato.moneda). No hay cotizaciones
   * en vivo ni APIs: si hace falta convertir, el usuario ingresa el valor.
   * ------------------------------------------------------------------------- */
  var MONEDAS = {
    ARS: { codigo: "ARS", simbolo: "$", locale: "es-AR", decimales: 2, nombre: "Peso argentino" },
    USD: { codigo: "USD", simbolo: "US$", locale: "en-US", decimales: 2, nombre: "Dólar" },
    MXN: { codigo: "MXN", simbolo: "$", locale: "es-MX", decimales: 2, nombre: "Peso mexicano" },
    CLP: { codigo: "CLP", simbolo: "$", locale: "es-CL", decimales: 0, nombre: "Peso chileno" },
    COP: { codigo: "COP", simbolo: "$", locale: "es-CO", decimales: 0, nombre: "Peso colombiano" },
    BRL: { codigo: "BRL", simbolo: "R$", locale: "pt-BR", decimales: 2, nombre: "Real" },
    EUR: { codigo: "EUR", simbolo: "€", locale: "es-ES", decimales: 2, nombre: "Euro" }
  };
  var MONEDA_DEFECTO = "ARS";

  /* ---------------------------------------------------------------------------
   * Umbrales del semáforo. Centralizados y fáciles de ajustar. Son una
   * heurística visual configurable, NO un dato financiero oficial.
   *   margen >= verde        -> 🟢 Rentable
   *   0 <= margen < verde     -> 🟡 Margen bajo
   *   margen < 0              -> 🔴 Pérdida
   * ------------------------------------------------------------------------- */
  var UMBRALES = {
    margenBajoPct: 10 // por debajo de este margen neto (%) se considera "margen bajo"
  };

  /* ---------------------------------------------------------------------------
   * Helpers numéricos
   * ------------------------------------------------------------------------- */

  // Convierte cualquier entrada en número. Acepta coma decimal y separadores de
  // miles. Vacío / null / no numérico -> devuelve el valor por defecto (0).
  function parseNumero(valor, porDefecto) {
    if (porDefecto === undefined) porDefecto = 0;
    if (valor === null || valor === undefined) return porDefecto;
    if (typeof valor === "number") return isFinite(valor) ? valor : porDefecto;
    var s = String(valor).trim();
    if (s === "") return porDefecto;
    // Quita separadores de miles y normaliza coma decimal a punto.
    s = s.replace(/\s/g, "");
    if (s.indexOf(",") > -1 && s.indexOf(".") > -1) {
      // Formato con miles y decimales: el último separador es el decimal.
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (s.indexOf(",") > -1) {
      s = s.replace(",", ".");
    }
    var n = parseFloat(s);
    return isFinite(n) ? n : porDefecto;
  }

  function esVacio(valor) {
    return valor === null || valor === undefined || String(valor).trim() === "";
  }

  function redondear(n, dec) {
    if (dec === undefined) dec = 2;
    if (!isFinite(n)) return 0;
    var f = Math.pow(10, dec);
    return Math.round((n + Number.EPSILON) * f) / f;
  }

  /* ---------------------------------------------------------------------------
   * Validación de la entrada. Devuelve errores (que impiden calcular) y avisos
   * (que no lo impiden). Nunca lanza excepciones: la UI no se debe romper.
   * ------------------------------------------------------------------------- */
  function validar(entrada) {
    entrada = entrada || {};
    var errores = [];
    var avisos = [];

    var precioVenta = parseNumero(entrada.precioVenta, NaN);
    var costoProducto = parseNumero(entrada.costoProducto, 0);
    var comisionPct = parseNumero(entrada.comisionPct, 0);
    var cargoFijo = parseNumero(entrada.cargoFijo, 0);
    var envio = parseNumero(entrada.envio, 0);
    var impuestosPct = parseNumero(entrada.impuestosPct, 0);
    var publicidad = parseNumero(entrada.publicidad, 0);
    var otrosCostos = parseNumero(entrada.otrosCostos, 0);
    var unidades = parseNumero(entrada.unidades, 1);
    var tieneMargenObjetivo = !esVacio(entrada.margenObjetivoPct);
    var margenObjetivoPct = parseNumero(entrada.margenObjetivoPct, NaN);

    // Precio de venta: obligatorio y > 0.
    if (esVacio(entrada.precioVenta) || isNaN(precioVenta)) {
      errores.push({ campo: "precioVenta", mensaje: "Ingresá el precio de venta." });
    } else if (precioVenta <= 0) {
      errores.push({ campo: "precioVenta", mensaje: "El precio de venta debe ser mayor que 0." });
    }

    // Valores monetarios: no pueden ser negativos.
    [
      ["costoProducto", costoProducto, "El costo del producto no puede ser negativo."],
      ["cargoFijo", cargoFijo, "El cargo fijo no puede ser negativo."],
      ["envio", envio, "El envío no puede ser negativo."],
      ["publicidad", publicidad, "La publicidad no puede ser negativa."],
      ["otrosCostos", otrosCostos, "Otros costos no puede ser negativo."]
    ].forEach(function (c) {
      if (c[1] < 0) errores.push({ campo: c[0], mensaje: c[2] });
    });

    // Porcentajes: entre 0 y 100.
    if (comisionPct < 0 || comisionPct > 100) {
      errores.push({ campo: "comisionPct", mensaje: "La comisión debe estar entre 0 % y 100 %." });
    }
    if (impuestosPct < 0 || impuestosPct > 100) {
      errores.push({ campo: "impuestosPct", mensaje: "Los impuestos deben estar entre 0 % y 100 %." });
    }
    if (comisionPct + impuestosPct >= 100) {
      errores.push({
        campo: "comisionPct",
        mensaje: "Comisión + impuestos no pueden sumar 100 % o más del precio."
      });
    }

    // Unidades: entero >= 1.
    if (unidades < 1) {
      errores.push({ campo: "unidades", mensaje: "La cantidad de unidades debe ser al menos 1." });
    } else if (Math.floor(unidades) !== unidades) {
      avisos.push({ campo: "unidades", mensaje: "Se redondeó la cantidad de unidades a un entero." });
      unidades = Math.round(unidades);
    }

    // Margen objetivo (opcional): 0–100 si se ingresó.
    if (tieneMargenObjetivo) {
      if (isNaN(margenObjetivoPct) || margenObjetivoPct < 0 || margenObjetivoPct >= 100) {
        errores.push({
          campo: "margenObjetivoPct",
          mensaje: "El margen objetivo debe estar entre 0 % y 99 %."
        });
      }
    }

    var normalizados = {
      precioVenta: precioVenta,
      costoProducto: costoProducto,
      comisionPct: comisionPct,
      cargoFijo: cargoFijo,
      envio: envio,
      impuestosPct: impuestosPct,
      publicidad: publicidad,
      otrosCostos: otrosCostos,
      unidades: unidades < 1 ? 1 : Math.round(unidades),
      tieneMargenObjetivo: tieneMargenObjetivo,
      margenObjetivoPct: tieneMargenObjetivo ? margenObjetivoPct : null
    };

    return { valido: errores.length === 0, errores: errores, avisos: avisos, entrada: normalizados };
  }

  /* ---------------------------------------------------------------------------
   * Semáforo
   * ------------------------------------------------------------------------- */
  function evaluarSemaforo(margenPct) {
    if (!isFinite(margenPct) || margenPct < 0) {
      return { estado: "perdida", etiqueta: "Pérdida", emoji: "🔴" };
    }
    if (margenPct < UMBRALES.margenBajoPct) {
      return { estado: "bajo", etiqueta: "Margen bajo", emoji: "🟡" };
    }
    return { estado: "rentable", etiqueta: "Rentable", emoji: "🟢" };
  }

  /* ---------------------------------------------------------------------------
   * Precio mínimo de venta para alcanzar un margen objetivo (%).
   *   margen = gananciaUnit / precio = k - fijoPorUnidad / precio
   *   con k = 1 - comisionPct/100 - impuestosPct/100
   *   => precio = fijoPorUnidad / (k - margen/100)
   * Devuelve null si el margen objetivo no es alcanzable con estos costos.
   * ------------------------------------------------------------------------- */
  function precioMinimoParaMargen(e, margenPct) {
    var k = 1 - e.comisionPct / 100 - e.impuestosPct / 100;
    var fijoPorUnidad = e.costoProducto + e.cargoFijo + e.envio +
      (e.publicidad + e.otrosCostos) / e.unidades;
    var denom = k - margenPct / 100;
    if (denom <= 0) return null; // Los costos porcentuales dejan menos margen que el objetivo.
    var precio = fijoPorUnidad / denom;
    if (!isFinite(precio) || precio <= 0) return null;
    return precio;
  }

  /* ---------------------------------------------------------------------------
   * Cálculo principal. Recibe entrada cruda (strings de inputs incluidos) y
   * devuelve SIEMPRE un objeto seguro para renderizar. Si la entrada no es
   * válida, valido=false y resultado=null (la UI muestra los errores).
   * ------------------------------------------------------------------------- */
  function calcular(entradaCruda) {
    var v = validar(entradaCruda);
    if (!v.valido) {
      return { valido: false, errores: v.errores, avisos: v.avisos, entrada: v.entrada, resultado: null };
    }

    var e = v.entrada;

    // --- Por unidad ---
    var comision = e.precioVenta * (e.comisionPct / 100);
    var impuestos = e.precioVenta * (e.impuestosPct / 100);
    // Contribución por unidad: precio menos todos los costos variables por unidad.
    var cmUnit = e.precioVenta - e.costoProducto - comision - e.cargoFijo - e.envio - impuestos;

    // --- Costos del lote (totales) ---
    var costosLoteFijos = e.publicidad + e.otrosCostos;

    // --- Lote ---
    var ingresosLote = e.precioVenta * e.unidades;
    var gananciaLote = cmUnit * e.unidades - costosLoteFijos;
    var costosLoteTotal = ingresosLote - gananciaLote;

    // --- Por venta (promedio, incluye el prorrateo de los costos del lote) ---
    var gananciaUnit = gananciaLote / e.unidades;

    // --- Márgenes ---
    var margenPct = ingresosLote !== 0 ? (gananciaLote / ingresosLote) * 100 : 0;
    var roiPct = costosLoteTotal !== 0 ? (gananciaLote / costosLoteTotal) * 100 : 0;

    // --- Punto de equilibrio (unidades para cubrir los costos del lote) ---
    var puntoEquilibrio, puntoEquilibrioTexto;
    if (cmUnit > 0) {
      puntoEquilibrio = Math.ceil(costosLoteFijos / cmUnit);
      if (puntoEquilibrio < 1) puntoEquilibrio = 1;
      puntoEquilibrioTexto = null;
    } else {
      puntoEquilibrio = null; // Con contribución <= 0 no se alcanza vendiendo más.
      puntoEquilibrioTexto = "No se alcanza: cada unidad pierde plata sin importar la cantidad.";
    }

    // --- Precio mínimo para el margen objetivo (si se ingresó) ---
    var precioMinimo = null, precioMinimoAlcanzable = null;
    if (e.tieneMargenObjetivo) {
      precioMinimo = precioMinimoParaMargen(e, e.margenObjetivoPct);
      precioMinimoAlcanzable = precioMinimo !== null;
    }

    // --- Máximo gasto en publicidad antes de entrar en pérdida ---
    // Se mantienen fijos todos los demás costos; se despeja la publicidad que
    // deja la ganancia del lote en exactamente 0.
    var maxPublicidadLote = cmUnit * e.unidades - e.otrosCostos;
    var maxPublicidadPorVenta = maxPublicidadLote / e.unidades;
    var acosEquilibrioPct = e.precioVenta !== 0 ? (maxPublicidadPorVenta / e.precioVenta) * 100 : 0;
    var diferenciaPublicidad = maxPublicidadLote - e.publicidad; // >0 margen libre, <0 sobregasto
    // ¿El producto ya pierde plata ANTES de gastar en publicidad?
    var deficitarioSinPublicidad = (cmUnit * e.unidades - e.otrosCostos) < 0;
    var perdidaBaseSinPublicidad = deficitarioSinPublicidad
      ? (cmUnit * e.unidades - e.otrosCostos) // negativo
      : 0;

    var semaforo = evaluarSemaforo(margenPct);

    var resultado = {
      // Desglose por unidad / componentes (valores de un vistazo)
      ingresosLote: redondear(ingresosLote),
      comision: redondear(comision),
      comisionLote: redondear(comision * e.unidades),
      cargoFijo: redondear(e.cargoFijo),
      cargoFijoLote: redondear(e.cargoFijo * e.unidades),
      envio: redondear(e.envio),
      envioLote: redondear(e.envio * e.unidades),
      impuestos: redondear(impuestos),
      impuestosLote: redondear(impuestos * e.unidades),
      costoProducto: redondear(e.costoProducto),
      costoProductoLote: redondear(e.costoProducto * e.unidades),
      publicidad: redondear(e.publicidad),
      otrosCostos: redondear(e.otrosCostos),
      costosLoteFijos: redondear(costosLoteFijos),
      costosLoteTotal: redondear(costosLoteTotal),
      contribucionUnit: redondear(cmUnit),

      // Resultados principales
      gananciaUnit: redondear(gananciaUnit),
      gananciaLote: redondear(gananciaLote),
      margenPct: redondear(margenPct),
      roiPct: redondear(roiPct),

      // Derivados
      puntoEquilibrio: puntoEquilibrio,
      puntoEquilibrioTexto: puntoEquilibrioTexto,
      precioMinimo: precioMinimo === null ? null : redondear(precioMinimo),
      precioMinimoAlcanzable: precioMinimoAlcanzable,

      // Diferencial de publicidad
      maxPublicidadLote: redondear(maxPublicidadLote),
      maxPublicidadPorVenta: redondear(maxPublicidadPorVenta),
      acosEquilibrioPct: redondear(acosEquilibrioPct),
      diferenciaPublicidad: redondear(diferenciaPublicidad),
      deficitarioSinPublicidad: deficitarioSinPublicidad,
      perdidaBaseSinPublicidad: redondear(perdidaBaseSinPublicidad),

      // Semáforo
      semaforo: semaforo,

      // Eco de la entrada normalizada (útil para "Cómo se calculó")
      unidades: e.unidades
    };

    return { valido: true, errores: [], avisos: v.avisos, entrada: e, resultado: resultado };
  }

  /* ===========================================================================
   * MODO OBJETIVO — "Decime cuánto querés ganar y te digo a cuánto vender".
   * Todo POR UNIDAD. Los porcentajes (comisión, impuestos) se aplican sobre el
   * precio de venta. Reutiliza `calcular()` (con unidades=1) para el desglose.
   *
   * Fórmula central (precio a partir de una ganancia objetivo G):
   *   ganancia(precio) = precio·(1 − k) − fijos
   *   con k = (comisión% + impuestos%) / 100
   *   y  fijos = costo + cargoFijo + envío + publicidad + otros
   *   => precio = (G + fijos) / (1 − k)
   * ========================================================================= */

  // Fracción del precio que se llevan los costos porcentuales.
  function _kPct(e) { return (e.comisionPct + e.impuestosPct) / 100; }
  // Costos por unidad que NO dependen del precio.
  function _fijosUnit(e) {
    return e.costoProducto + e.cargoFijo + e.envio + e.publicidad + e.otrosCostos;
  }

  // Ganancia por unidad a un precio de venta dado.
  function gananciaEnPrecio(e, precio) {
    return precio * (1 - _kPct(e)) - _fijosUnit(e);
  }

  // Precio de venta necesario para una ganancia objetivo (en $) por unidad.
  function precioParaGanancia(e, G) {
    var denom = 1 - _kPct(e);
    if (denom <= 0) return null;
    var p = (G + _fijosUnit(e)) / denom;
    return (isFinite(p) && p > 0) ? p : null;
  }

  // Precio de venta necesario para un margen objetivo (% sobre el precio).
  function precioParaMargen(e, mPct) {
    var denom = 1 - _kPct(e) - mPct / 100;
    if (denom <= 0) return null;
    var p = _fijosUnit(e) / denom;
    return (isFinite(p) && p > 0) ? p : null;
  }

  // Costo máximo de compra del producto para lograr la ganancia G a un precio dado.
  function costoMaximoParaGanancia(e, precio, G) {
    var otrosFijos = e.cargoFijo + e.envio + e.publicidad + e.otrosCostos;
    return precio * (1 - _kPct(e)) - G - otrosFijos;
  }

  // Redondeo del precio SIEMPRE hacia arriba: garantiza que la ganancia real
  // nunca quede por debajo del objetivo por culpa del redondeo.
  function redondearPrecioArriba(precio, paso) {
    paso = paso || 1;
    if (!isFinite(precio)) return 0;
    return Math.ceil(precio / paso) * paso;
  }

  function validarObjetivo(entrada) {
    entrada = entrada || {};
    var errores = [], avisos = [];
    var modo = entrada.modoObjetivo === "margen" ? "margen" : "ganancia";

    var costoProducto = parseNumero(entrada.costoProducto, NaN);
    var comisionPct = parseNumero(entrada.comisionPct, 0);
    var impuestosPct = parseNumero(entrada.impuestosPct, 0);
    var cargoFijo = parseNumero(entrada.cargoFijo, 0);
    var envio = parseNumero(entrada.envio, 0);
    var publicidad = parseNumero(entrada.publicidad, 0);
    var otrosCostos = parseNumero(entrada.otrosCostos, 0);
    var gananciaObjetivo = parseNumero(entrada.gananciaObjetivo, NaN);
    var margenObjetivoPct = parseNumero(entrada.margenObjetivoPct, NaN);
    var precioReferencia = esVacio(entrada.precioReferencia) ? null : parseNumero(entrada.precioReferencia, NaN);
    var inversionInicial = parseNumero(entrada.inversionInicial, 0);

    if (esVacio(entrada.costoProducto) || isNaN(costoProducto)) {
      errores.push({ campo: "costoProducto", mensaje: "Ingresá cuánto te cuesta el producto." });
    } else if (costoProducto < 0) {
      errores.push({ campo: "costoProducto", mensaje: "El costo no puede ser negativo." });
    }

    if (modo === "ganancia") {
      if (esVacio(entrada.gananciaObjetivo) || isNaN(gananciaObjetivo)) {
        errores.push({ campo: "gananciaObjetivo", mensaje: "Ingresá cuánto querés ganar por unidad." });
      } else if (gananciaObjetivo < 0) {
        errores.push({ campo: "gananciaObjetivo", mensaje: "La ganancia objetivo no puede ser negativa." });
      }
    } else {
      if (esVacio(entrada.margenObjetivoPct) || isNaN(margenObjetivoPct)) {
        errores.push({ campo: "margenObjetivoPct", mensaje: "Ingresá el margen objetivo." });
      } else if (margenObjetivoPct < 0 || margenObjetivoPct >= 100) {
        errores.push({ campo: "margenObjetivoPct", mensaje: "El margen objetivo debe estar entre 0 % y 99 %." });
      }
    }

    [["cargoFijo", cargoFijo], ["envio", envio], ["publicidad", publicidad],
     ["otrosCostos", otrosCostos], ["inversionInicial", inversionInicial]].forEach(function (c) {
      if (c[1] < 0) errores.push({ campo: c[0], mensaje: "No puede ser negativo." });
    });
    if (comisionPct < 0 || comisionPct > 100) errores.push({ campo: "comisionPct", mensaje: "La comisión debe estar entre 0 % y 100 %." });
    if (impuestosPct < 0 || impuestosPct > 100) errores.push({ campo: "impuestosPct", mensaje: "Los impuestos deben estar entre 0 % y 100 %." });
    if (comisionPct + impuestosPct >= 100) errores.push({ campo: "comisionPct", mensaje: "Comisión + impuestos no pueden sumar 100 % o más del precio." });
    if (precioReferencia !== null && (isNaN(precioReferencia) || precioReferencia <= 0)) {
      errores.push({ campo: "precioReferencia", mensaje: "El precio de referencia debe ser mayor que 0." });
    }

    var norm = {
      nombreProducto: entrada.nombreProducto ? String(entrada.nombreProducto).trim() : "",
      canal: entrada.canal || "mercadolibre",
      modoObjetivo: modo,
      costoProducto: costoProducto, comisionPct: comisionPct, impuestosPct: impuestosPct,
      cargoFijo: cargoFijo, envio: envio, publicidad: publicidad, otrosCostos: otrosCostos,
      gananciaObjetivo: isNaN(gananciaObjetivo) ? null : gananciaObjetivo,
      margenObjetivoPct: isNaN(margenObjetivoPct) ? null : margenObjetivoPct,
      precioReferencia: precioReferencia, inversionInicial: inversionInicial
    };
    return { valido: errores.length === 0, errores: errores, avisos: avisos, entrada: norm };
  }

  function calcularObjetivo(entradaCruda) {
    var v = validarObjetivo(entradaCruda);
    if (!v.valido) {
      return { valido: false, errores: v.errores, avisos: v.avisos, entrada: v.entrada, resultado: null };
    }
    var e = v.entrada;

    // 1) Precio exacto para el objetivo.
    var precioExacto = (e.modoObjetivo === "ganancia")
      ? precioParaGanancia(e, e.gananciaObjetivo)
      : precioParaMargen(e, e.margenObjetivoPct);

    if (precioExacto === null) {
      return {
        valido: true, errores: [], avisos: v.avisos, entrada: e,
        resultado: {
          imposible: true,
          motivoImposible: "Con estos costos y objetivo no hay un precio posible: los porcentajes (y el margen) se llevan todo el precio de venta. Bajá la comisión, los impuestos o el margen objetivo."
        }
      };
    }

    // 2) Redondeo hacia arriba (nunca baja del objetivo).
    var precio = redondearPrecioArriba(precioExacto, 1);

    // Objetivo de ganancia efectivo en $ (para modo margen, al precio recomendado).
    var gObjetivo = (e.modoObjetivo === "ganancia") ? e.gananciaObjetivo : (precio * e.margenObjetivoPct / 100);

    // 3) Desglose reutilizando el motor existente (unidades=1 => por unidad).
    var fw = calcular({
      precioVenta: precio, costoProducto: e.costoProducto, comisionPct: e.comisionPct,
      cargoFijo: e.cargoFijo, envio: e.envio, impuestosPct: e.impuestosPct,
      publicidad: e.publicidad, otrosCostos: e.otrosCostos, unidades: 1
    }).resultado;

    // 4) Costo máximo del proveedor (a un precio de referencia; default: recomendado).
    var precioRef = e.precioReferencia || precio;
    var gRef = (e.modoObjetivo === "ganancia") ? e.gananciaObjetivo : (precioRef * e.margenObjetivoPct / 100);
    var costoMaximo = costoMaximoParaGanancia(e, precioRef, gRef);

    // 5) Publicidad.
    var maxPublicidad = fw.maxPublicidadPorVenta;         // ganancia antes de publicidad
    var publicidadAdicional = maxPublicidad - e.publicidad;

    // 6) Punto de equilibrio: unidades para recuperar la inversión inicial (opcional).
    var unidadesEquilibrio = null;
    if (e.inversionInicial > 0 && fw.gananciaUnit > 0) {
      unidadesEquilibrio = Math.ceil(e.inversionInicial / fw.gananciaUnit);
    }

    // 7) Escenarios de precio (alrededor del recomendado).
    var pasos = [-0.15, -0.10, -0.05, 0, 0.05, 0.10, 0.15];
    var escenariosPrecio = pasos.map(function (f) {
      var p = (f === 0) ? precio : redondearPrecioArriba(precio * (1 + f), 1);
      var g = gananciaEnPrecio(e, p);
      return { precio: p, ganancia: redondear(g), margen: redondear(p > 0 ? g / p * 100 : 0), objetivo: f === 0 };
    });

    // 8) Escenarios de ganancia (alrededor del objetivo) — solo en modo ganancia.
    var escenariosGanancia = null;
    if (e.modoObjetivo === "ganancia") {
      var base = e.gananciaObjetivo;
      escenariosGanancia = [-0.4, -0.2, 0, 0.2, 0.4].map(function (f) {
        var g = Math.max(0, redondear(base * (1 + f), 0));
        var pe = precioParaGanancia(e, g);
        return { ganancia: g, precio: pe === null ? null : redondearPrecioArriba(pe, 1), objetivo: f === 0 };
      });
    }

    var resultado = {
      imposible: false,
      nombreProducto: e.nombreProducto,
      canal: e.canal,
      modoObjetivo: e.modoObjetivo,
      precioExacto: redondear(precioExacto),
      precio: precio,
      gananciaObjetivo: redondear(gObjetivo),

      gananciaUnit: fw.gananciaUnit,
      margenPct: fw.margenPct,
      roiPct: fw.roiPct,
      costosTotales: fw.costosLoteTotal,
      costoProducto: fw.costoProducto,
      comision: fw.comision, impuestos: fw.impuestos,
      cargoFijo: fw.cargoFijo, envio: fw.envio,
      publicidad: fw.publicidad, otrosCostos: fw.otrosCostos,
      semaforo: fw.semaforo,

      precioReferencia: precioRef,
      costoMaximo: redondear(costoMaximo),
      costoMaximoPosible: costoMaximo > 0,

      maxPublicidad: redondear(maxPublicidad),
      publicidadActual: redondear(e.publicidad),
      publicidadAdicional: redondear(publicidadAdicional),
      acosEquilibrioPct: redondear(fw.acosEquilibrioPct),
      deficitario: maxPublicidad < 0,

      inversionInicial: e.inversionInicial,
      unidadesEquilibrio: unidadesEquilibrio,

      escenariosPrecio: escenariosPrecio,
      escenariosGanancia: escenariosGanancia
    };
    return { valido: true, errores: [], avisos: v.avisos, entrada: e, resultado: resultado };
  }

  /* ---------------------------------------------------------------------------
   * Formateo (utilidad de UI, separada del motor). No la usa el cálculo.
   * ------------------------------------------------------------------------- */
  var formato = {
    moneda: function (valor, codigoMoneda) {
      var m = MONEDAS[codigoMoneda] || MONEDAS[MONEDA_DEFECTO];
      var n = isFinite(valor) ? valor : 0;
      try {
        return new Intl.NumberFormat(m.locale, {
          style: "currency",
          currency: m.codigo,
          minimumFractionDigits: m.decimales,
          maximumFractionDigits: m.decimales
        }).format(n);
      } catch (_) {
        return m.simbolo + " " + n.toFixed(m.decimales);
      }
    },
    porcentaje: function (valor, decimales) {
      if (decimales === undefined) decimales = 2;
      var n = isFinite(valor) ? valor : 0;
      return n.toFixed(decimales).replace(".", ",") + " %";
    }
  };

  var API = {
    version: "1.0.0",
    MONEDAS: MONEDAS,
    MONEDA_DEFECTO: MONEDA_DEFECTO,
    UMBRALES: UMBRALES,
    parseNumero: parseNumero,
    redondear: redondear,
    validar: validar,
    calcular: calcular,
    evaluarSemaforo: evaluarSemaforo,
    precioMinimoParaMargen: precioMinimoParaMargen,
    // Modo objetivo (reverse pricing)
    validarObjetivo: validarObjetivo,
    calcularObjetivo: calcularObjetivo,
    precioParaGanancia: precioParaGanancia,
    precioParaMargen: precioParaMargen,
    gananciaEnPrecio: gananciaEnPrecio,
    costoMaximoParaGanancia: costoMaximoParaGanancia,
    redondearPrecioArriba: redondearPrecioArriba,
    formato: formato
  };

  // Exposición dual: navegador (window) y Node (module.exports) para los tests.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }
  global.RentabilidadML = API;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
