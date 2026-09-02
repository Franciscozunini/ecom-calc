/* =============================================================================
 * tests/calculo.test.js — Tests unitarios del motor de cálculo.
 * Sin framework: corre con `node tests/calculo.test.js`. También se usa desde
 * el navegador en tests/test-runner.html.
 * ============================================================================= */

(function () {
  "use strict";

  var RML = (typeof module !== "undefined" && module.exports)
    ? require("../calculo.js")
    : window.RentabilidadML;

  var pruebas = [];
  function test(nombre, fn) { pruebas.push({ nombre: nombre, fn: fn }); }

  function aprox(a, b, tol) {
    tol = tol === undefined ? 0.01 : tol;
    return Math.abs(a - b) <= tol;
  }

  var assert = {
    ok: function (cond, msg) { if (!cond) throw new Error(msg || "Se esperaba verdadero"); },
    igual: function (a, b, msg) {
      if (a !== b) throw new Error((msg || "No coinciden") + " → esperado " + b + ", obtenido " + a);
    },
    aprox: function (a, b, msg, tol) {
      if (!aprox(a, b, tol)) throw new Error((msg || "No aproximado") + " → esperado ~" + b + ", obtenido " + a);
    }
  };

  var BASE = {
    precioVenta: 10000, costoProducto: 4000, comisionPct: 13, cargoFijo: 500,
    envio: 800, impuestosPct: 5, publicidad: 1000, otrosCostos: 200,
    unidades: 10, margenObjetivoPct: 20
  };

  /* --- 1. Caso verificado a mano (venta rentable) --- */
  test("Caso base verificado a mano", function () {
    var r = RML.calcular(BASE);
    assert.ok(r.valido, "El caso base debe ser válido");
    var d = r.resultado;
    assert.aprox(d.contribucionUnit, 2900, "contribución por unidad");
    assert.aprox(d.gananciaLote, 27800, "ganancia del lote");
    assert.aprox(d.gananciaUnit, 2780, "ganancia por venta");
    assert.aprox(d.ingresosLote, 100000, "ingresos del lote");
    assert.aprox(d.costosLoteTotal, 72200, "costo total del lote");
    assert.aprox(d.margenPct, 27.8, "margen %");
    assert.aprox(d.roiPct, 38.5, "ROI %", 0.05);
    assert.igual(d.puntoEquilibrio, 1, "punto de equilibrio");
    assert.aprox(d.maxPublicidadLote, 28800, "máx publicidad lote");
    assert.aprox(d.maxPublicidadPorVenta, 2880, "máx publicidad por venta");
    assert.aprox(d.acosEquilibrioPct, 28.8, "ACOS de equilibrio");
    assert.igual(d.semaforo.estado, "rentable", "semáforo rentable");
  });

  /* --- 2. Venta con pérdida --- */
  test("Venta con pérdida", function () {
    var r = RML.calcular({
      precioVenta: 1000, costoProducto: 900, comisionPct: 13, cargoFijo: 200,
      envio: 300, impuestosPct: 5, publicidad: 0, otrosCostos: 0, unidades: 1
    });
    var d = r.resultado;
    assert.ok(d.gananciaUnit < 0, "la ganancia por venta debe ser negativa");
    assert.ok(d.margenPct < 0, "el margen debe ser negativo");
    assert.igual(d.semaforo.estado, "perdida", "semáforo en pérdida");
    assert.igual(d.puntoEquilibrio, null, "no hay punto de equilibrio alcanzable");
    assert.ok(d.deficitarioSinPublicidad, "es deficitario incluso sin publicidad");
  });

  /* --- 3. Comisión igual a 0 --- */
  test("Comisión 0 %", function () {
    var r = RML.calcular({
      precioVenta: 1000, costoProducto: 400, comisionPct: 0, cargoFijo: 0,
      envio: 0, impuestosPct: 0, publicidad: 0, otrosCostos: 0, unidades: 1
    });
    var d = r.resultado;
    assert.aprox(d.comision, 0, "comisión debe ser 0");
    assert.aprox(d.gananciaUnit, 600, "ganancia = 1000 - 400");
    assert.aprox(d.margenPct, 60, "margen 60 %");
  });

  /* --- 4. Publicidad igual a 0 --- */
  test("Publicidad 0", function () {
    var r = RML.calcular({
      precioVenta: 2000, costoProducto: 800, comisionPct: 10, cargoFijo: 100,
      envio: 0, impuestosPct: 0, publicidad: 0, otrosCostos: 0, unidades: 1
    });
    var d = r.resultado;
    assert.aprox(d.publicidad, 0, "publicidad 0");
    // cmUnit = 2000 - 800 - 200 - 100 = 900
    assert.aprox(d.gananciaUnit, 900, "ganancia por venta");
    assert.aprox(d.maxPublicidadPorVenta, 900, "todo el margen disponible para ads");
  });

  /* --- 5. Costo de producto igual a 0 --- */
  test("Costo de producto 0", function () {
    var r = RML.calcular({
      precioVenta: 500, costoProducto: 0, comisionPct: 12, cargoFijo: 0,
      envio: 0, impuestosPct: 0, publicidad: 0, otrosCostos: 0, unidades: 1
    });
    var d = r.resultado;
    assert.aprox(d.costoProducto, 0, "costo producto 0");
    // cmUnit = 500 - 60 = 440
    assert.aprox(d.gananciaUnit, 440, "ganancia por venta");
  });

  /* --- 6. Cálculo con margen objetivo --- */
  test("Precio mínimo para margen objetivo (20 %)", function () {
    var r = RML.calcular(BASE);
    var d = r.resultado;
    assert.ok(d.precioMinimoAlcanzable, "el margen 20 % debe ser alcanzable");
    assert.aprox(d.precioMinimo, 8741.94, "precio mínimo para 20 %", 0.1);
    // Verificación cruzada: a ese precio, el margen debe dar ~20 %.
    var check = RML.calcular(Object.assign({}, BASE, { precioVenta: d.precioMinimo, margenObjetivoPct: "" }));
    assert.aprox(check.resultado.margenPct, 20, "el margen al precio mínimo debe ser 20 %", 0.2);
  });

  test("Margen objetivo inalcanzable", function () {
    // comisión + impuestos = 30 %, margen objetivo 80 % => imposible.
    var r = RML.calcular({
      precioVenta: 1000, costoProducto: 100, comisionPct: 20, cargoFijo: 0,
      envio: 0, impuestosPct: 10, publicidad: 0, otrosCostos: 0, unidades: 1,
      margenObjetivoPct: 80
    });
    assert.igual(r.resultado.precioMinimo, null, "no debe existir precio mínimo");
    assert.igual(r.resultado.precioMinimoAlcanzable, false, "no alcanzable");
  });

  /* --- 7. Punto de equilibrio con costos de lote --- */
  test("Punto de equilibrio con inversión de lote", function () {
    // cmUnit = 1000 - 500 = 500 ; costosLoteFijos = 2500 ; equilibrio = ceil(2500/500)=5
    var r = RML.calcular({
      precioVenta: 1000, costoProducto: 500, comisionPct: 0, cargoFijo: 0,
      envio: 0, impuestosPct: 0, publicidad: 2000, otrosCostos: 500, unidades: 100
    });
    assert.igual(r.resultado.puntoEquilibrio, 5, "equilibrio = 5 unidades");
  });

  /* --- 8. ACOS de equilibrio --- */
  test("ACOS de equilibrio", function () {
    // cmUnit = 1000 - 300 = 700 ; sin otros ; maxPublicidadPorVenta = 700 ; ACOS = 70 %
    var r = RML.calcular({
      precioVenta: 1000, costoProducto: 300, comisionPct: 0, cargoFijo: 0,
      envio: 0, impuestosPct: 0, publicidad: 0, otrosCostos: 0, unidades: 1
    });
    assert.aprox(r.resultado.acosEquilibrioPct, 70, "ACOS 70 %");
    assert.aprox(r.resultado.maxPublicidadPorVenta, 700, "máx ads por venta");
  });

  /* --- 9. Inputs vacíos (no debe romper) --- */
  test("Inputs vacíos no rompen", function () {
    var r = RML.calcular({});
    assert.igual(r.valido, false, "debe ser inválido");
    assert.igual(r.resultado, null, "sin resultado");
    assert.ok(r.errores.length > 0, "debe haber errores");
    // El objeto siempre existe: la UI no se rompe.
    assert.ok(Array.isArray(r.errores), "errores es un array");
  });

  test("Solo precio, resto vacío, calcula", function () {
    var r = RML.calcular({ precioVenta: 1000 });
    assert.ok(r.valido, "con solo precio debe calcular (resto = 0)");
    assert.aprox(r.resultado.gananciaUnit, 1000, "ganancia = precio cuando no hay costos");
    assert.aprox(r.resultado.margenPct, 100, "margen 100 %");
  });

  /* --- 10. Valores negativos (rechazados) --- */
  test("Valores negativos rechazados", function () {
    var r = RML.calcular(Object.assign({}, BASE, { costoProducto: -100 }));
    assert.igual(r.valido, false, "costo negativo inválido");
    var r2 = RML.calcular(Object.assign({}, BASE, { precioVenta: -5 }));
    assert.igual(r2.valido, false, "precio negativo inválido");
    var r3 = RML.calcular(Object.assign({}, BASE, { publicidad: -50 }));
    assert.igual(r3.valido, false, "publicidad negativa inválida");
  });

  /* --- 11. Porcentajes inválidos --- */
  test("Porcentajes inválidos rechazados", function () {
    assert.igual(RML.calcular(Object.assign({}, BASE, { comisionPct: 120 })).valido, false, "comisión > 100");
    assert.igual(RML.calcular(Object.assign({}, BASE, { comisionPct: -1 })).valido, false, "comisión < 0");
    assert.igual(RML.calcular(Object.assign({}, BASE, { impuestosPct: 150 })).valido, false, "impuestos > 100");
    assert.igual(RML.calcular(Object.assign({}, BASE, { margenObjetivoPct: 120 })).valido, false, "margen objetivo > 100");
    // Comisión + impuestos >= 100
    assert.igual(RML.calcular(Object.assign({}, BASE, { comisionPct: 60, impuestosPct: 45 })).valido, false, "suma % >= 100");
  });

  /* --- 12. Decimales --- */
  test("Números decimales", function () {
    var r = RML.calcular({
      precioVenta: 1999.99, costoProducto: 750.5, comisionPct: 12.5, cargoFijo: 99.9,
      envio: 250.25, impuestosPct: 3.5, publicidad: 0, otrosCostos: 0, unidades: 3
    });
    assert.ok(r.valido, "decimales válidos");
    // comision = 1999.99*0.125 = 249.99875 ; impuestos = 1999.99*0.035 = 69.99965
    // cmUnit = 1999.99 - 750.5 - 249.99875 - 99.9 - 250.25 - 69.99965 = 579.3416
    assert.aprox(r.resultado.contribucionUnit, 579.34, "contribución con decimales", 0.05);
  });

  test("parseNumero acepta coma decimal y miles", function () {
    assert.aprox(RML.parseNumero("1.234,56"), 1234.56, "formato es-AR");
    assert.aprox(RML.parseNumero("1,5"), 1.5, "coma decimal");
    assert.aprox(RML.parseNumero("2000"), 2000, "entero");
    assert.aprox(RML.parseNumero(""), 0, "vacío = 0");
    assert.aprox(RML.parseNumero("abc"), 0, "texto = 0");
  });

  /* --- 13. Semáforo margen bajo --- */
  test("Semáforo margen bajo", function () {
    // margen entre 0 y 10 %
    var r = RML.calcular({
      precioVenta: 1000, costoProducto: 850, comisionPct: 5, cargoFijo: 0,
      envio: 0, impuestosPct: 0, publicidad: 0, otrosCostos: 0, unidades: 1
    });
    // cmUnit = 1000 - 850 - 50 = 100 ; margen = 10 %? -> exactamente 10 => rentable (>=)
    // Ajustamos para caer debajo de 10:
    var r2 = RML.calcular({
      precioVenta: 1000, costoProducto: 900, comisionPct: 5, cargoFijo: 0,
      envio: 0, impuestosPct: 0, publicidad: 0, otrosCostos: 0, unidades: 1
    });
    // cmUnit = 1000 - 900 - 50 = 50 ; margen = 5 % -> bajo
    assert.igual(r2.resultado.semaforo.estado, "bajo", "margen 5 % es bajo");
    assert.igual(r.resultado.semaforo.estado, "rentable", "margen 10 % es rentable (umbral inclusivo)");
  });

  /* ===========================================================================
   * MODO OBJETIVO — "decime cuánto querés ganar y te digo a cuánto vender"
   * ========================================================================= */

  /* --- O1. Caso principal: costo 90.000 + ganancia objetivo 50.000 --- */
  test("Objetivo: precio para ganar $50.000 (costo $90.000)", function () {
    var r = RML.calcularObjetivo({
      costoProducto: 90000, gananciaObjetivo: 50000, modoObjetivo: "ganancia",
      comisionPct: 13, impuestosPct: 6, cargoFijo: 0, envio: 0, publicidad: 0, otrosCostos: 0
    });
    assert.ok(r.valido, "debe ser válido");
    var d = r.resultado;
    // k = 0.19 ; precio = (50000+90000)/0.81 = 172839.5...
    assert.aprox(d.precioExacto, 172839.51, "precio exacto", 0.5);
    assert.igual(d.precio, 172840, "precio redondeado hacia arriba");
    // La ganancia real al precio redondeado NUNCA debe bajar del objetivo.
    assert.ok(d.gananciaUnit >= 50000, "ganancia real >= objetivo (" + d.gananciaUnit + ")");
  });

  /* --- O2. El redondeo nunca deja la ganancia por debajo del objetivo --- */
  test("Objetivo: el redondeo no baja del objetivo (muchos casos)", function () {
    for (var costo = 1; costo <= 5000; costo += 137) {
      for (var g = 0; g <= 3000; g += 311) {
        var r = RML.calcularObjetivo({
          costoProducto: costo, gananciaObjetivo: g, modoObjetivo: "ganancia",
          comisionPct: 12.5, impuestosPct: 3.5, cargoFijo: 40, envio: 90, publicidad: 0, otrosCostos: 15
        });
        assert.ok(r.valido, "válido costo=" + costo + " g=" + g);
        assert.ok(r.resultado.gananciaUnit >= g - 0.01,
          "ganancia " + r.resultado.gananciaUnit + " >= objetivo " + g + " (costo=" + costo + ")");
      }
    }
  });

  /* --- O3. Costo máximo del proveedor (cálculo inverso) --- */
  test("Objetivo: costo máximo de compra", function () {
    // precio ref 1000, comisión 20%, ganancia objetivo 50, sin otros costos
    // costoMax = 1000*0.8 - 50 = 750
    var r = RML.calcularObjetivo({
      costoProducto: 700, gananciaObjetivo: 50, modoObjetivo: "ganancia",
      comisionPct: 20, impuestosPct: 0, precioReferencia: 1000
    });
    assert.aprox(r.resultado.costoMaximo, 750, "costo máximo a $1000");
    assert.ok(r.resultado.costoMaximoPosible, "es posible");
  });

  /* --- O4. Publicidad máxima y adicional --- */
  test("Objetivo: publicidad máxima / adicional", function () {
    // precio recomendado para ganar 200 con costo 300, comisión 0
    // maxPublicidad = ganancia antes de publicidad = precio - costo - ...
    var r = RML.calcularObjetivo({
      costoProducto: 300, gananciaObjetivo: 200, modoObjetivo: "ganancia",
      comisionPct: 0, impuestosPct: 0, publicidad: 50
    });
    var d = r.resultado;
    // precio = (200 + 300 + 50)/1 = 550 ; maxPublicidad = 550 - 300 - 50(otros? no) ...
    // maxPublicidad = ganancia antes de publicidad = 550 - 300 = 250
    assert.aprox(d.maxPublicidad, 250, "máx publicidad por venta");
    assert.aprox(d.publicidadActual, 50, "publicidad actual");
    assert.aprox(d.publicidadAdicional, 200, "publicidad adicional disponible");
  });

  /* --- O5. Ganancia objetivo 0 (precio de equilibrio) --- */
  test("Objetivo: ganancia 0 => precio de equilibrio", function () {
    var r = RML.calcularObjetivo({
      costoProducto: 500, gananciaObjetivo: 0, modoObjetivo: "ganancia",
      comisionPct: 10, impuestosPct: 0
    });
    assert.ok(r.valido, "válido");
    // precio = 500/0.9 = 555.55 -> 556 ; ganancia ~ 0 (>= 0 por redondeo arriba)
    assert.ok(r.resultado.gananciaUnit >= 0, "ganancia no negativa");
    assert.ok(r.resultado.gananciaUnit < 5, "ganancia cercana a 0");
  });

  /* --- O6. Costo 0 --- */
  test("Objetivo: costo de producto 0", function () {
    var r = RML.calcularObjetivo({
      costoProducto: 0, gananciaObjetivo: 100, modoObjetivo: "ganancia",
      comisionPct: 0, impuestosPct: 0
    });
    assert.ok(r.valido, "válido");
    assert.aprox(r.resultado.precio, 100, "precio = ganancia cuando no hay costos");
  });

  /* --- O7. Porcentaje total >= 100 % => rechazado --- */
  test("Objetivo: comisión + impuestos >= 100% se rechaza", function () {
    var r = RML.calcularObjetivo({
      costoProducto: 100, gananciaObjetivo: 50, modoObjetivo: "ganancia",
      comisionPct: 60, impuestosPct: 45
    });
    assert.igual(r.valido, false, "inválido");
  });

  /* --- O8. Resultado imposible (margen demasiado alto) --- */
  test("Objetivo: margen imposible", function () {
    // comisión 30% + margen 80% => 1 - 0.30 - 0.80 < 0
    var r = RML.calcularObjetivo({
      costoProducto: 100, modoObjetivo: "margen", margenObjetivoPct: 80,
      comisionPct: 30, impuestosPct: 0
    });
    assert.ok(r.valido, "la entrada es válida pero...");
    assert.ok(r.resultado.imposible, "...el resultado es imposible");
  });

  /* --- O9. Modo margen coherente --- */
  test("Objetivo: modo margen", function () {
    // costo 100, comisión 0, margen 25% => precio = 100/(1-0.25) = 133.33 -> 134
    var r = RML.calcularObjetivo({
      costoProducto: 100, modoObjetivo: "margen", margenObjetivoPct: 25,
      comisionPct: 0, impuestosPct: 0
    });
    assert.aprox(r.resultado.precioExacto, 133.33, "precio exacto margen 25%", 0.1);
    assert.ok(r.resultado.margenPct >= 25, "margen real >= objetivo");
  });

  /* --- O10. Escenarios de precio: ganancia crece con el precio --- */
  test("Objetivo: escenarios de precio ordenados", function () {
    var r = RML.calcularObjetivo({
      costoProducto: 1000, gananciaObjetivo: 500, modoObjetivo: "ganancia",
      comisionPct: 10, impuestosPct: 5
    });
    var esc = r.resultado.escenariosPrecio;
    assert.ok(esc.length >= 5, "hay varias filas");
    for (var i = 1; i < esc.length; i++) {
      assert.ok(esc[i].ganancia >= esc[i - 1].ganancia, "ganancia no decrece al subir el precio");
    }
    var obj = esc.filter(function (x) { return x.objetivo; })[0];
    assert.ok(obj && obj.ganancia >= 500, "la fila objetivo alcanza el objetivo");
  });

  /* --- O11. Escenarios de ganancia => precios crecientes --- */
  test("Objetivo: escenarios de ganancia", function () {
    var r = RML.calcularObjetivo({
      costoProducto: 1000, gananciaObjetivo: 500, modoObjetivo: "ganancia",
      comisionPct: 10, impuestosPct: 5
    });
    var esc = r.resultado.escenariosGanancia;
    assert.ok(esc && esc.length === 5, "5 escenarios de ganancia");
    for (var i = 1; i < esc.length; i++) {
      assert.ok(esc[i].precio >= esc[i - 1].precio, "más ganancia => más precio");
    }
  });

  /* --- O12. Punto de equilibrio por inversión inicial --- */
  test("Objetivo: unidades para recuperar inversión", function () {
    // ganancia por unidad 500, inversión 5000 => 10 unidades
    var r = RML.calcularObjetivo({
      costoProducto: 1000, gananciaObjetivo: 500, modoObjetivo: "ganancia",
      comisionPct: 0, impuestosPct: 0, inversionInicial: 5000
    });
    assert.igual(r.resultado.unidadesEquilibrio, 10, "10 unidades");
  });

  /* --- O13. Vacíos y negativos --- */
  test("Objetivo: vacíos y negativos", function () {
    assert.igual(RML.calcularObjetivo({}).valido, false, "vacío inválido");
    assert.igual(RML.calcularObjetivo({ costoProducto: 100 }).valido, false, "sin objetivo inválido");
    assert.igual(RML.calcularObjetivo({ costoProducto: -1, gananciaObjetivo: 50 }).valido, false, "costo negativo");
    assert.igual(RML.calcularObjetivo({ costoProducto: 100, gananciaObjetivo: -5 }).valido, false, "ganancia negativa");
    // no rompe: siempre devuelve objeto
    var r = RML.calcularObjetivo({});
    assert.ok(Array.isArray(r.errores), "errores es array");
  });

  /* --- Runner --- */
  function correr(reportar) {
    var pasaron = 0, fallaron = 0, detalles = [];
    pruebas.forEach(function (p) {
      try {
        p.fn();
        pasaron++;
        detalles.push({ nombre: p.nombre, ok: true });
      } catch (e) {
        fallaron++;
        detalles.push({ nombre: p.nombre, ok: false, error: e.message });
      }
    });
    if (reportar) reportar({ total: pruebas.length, pasaron: pasaron, fallaron: fallaron, detalles: detalles });
    return { total: pruebas.length, pasaron: pasaron, fallaron: fallaron, detalles: detalles };
  }

  if (typeof module !== "undefined" && module.exports) {
    var res = correr();
    res.detalles.forEach(function (d) {
      console.log((d.ok ? "✓ " : "✗ ") + d.nombre + (d.ok ? "" : "\n    " + d.error));
    });
    console.log("\n" + res.pasaron + "/" + res.total + " tests OK" +
      (res.fallaron ? " — " + res.fallaron + " fallaron" : ""));
    process.exit(res.fallaron ? 1 : 0);
  } else {
    window.__TESTS_RENTABILIDAD__ = { correr: correr, pruebas: pruebas };
  }
})();
