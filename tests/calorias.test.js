/* =============================================================================
 * tests/calorias.test.js — Tests del motor de calorías y macros.
 * `node tests/calorias.test.js` o desde tests/test-runner.html.
 * ============================================================================= */
(function () {
  "use strict";
  var MF = (typeof module !== "undefined" && module.exports) ? require("../calorias.js") : window.MacroFacil;

  var pruebas = [];
  function test(n, fn) { pruebas.push({ nombre: n, fn: fn }); }
  function aprox(a, b, tol) { tol = tol === undefined ? 0.5 : tol; return Math.abs(a - b) <= tol; }
  var assert = {
    ok: function (c, m) { if (!c) throw new Error(m || "esperaba verdadero"); },
    igual: function (a, b, m) { if (a !== b) throw new Error((m || "no coincide") + " → esperado " + b + ", obtenido " + a); },
    aprox: function (a, b, m, tol) { if (!aprox(a, b, tol)) throw new Error((m || "no aprox") + " → ~" + b + ", obtuve " + a); }
  };

  var BASE = { sexo: "hombre", edad: 30, peso: 80, altura: 180, actividad: "moderado", objetivo: "mantener", proteinaNivel: "alta", grasaPct: 25 };

  test("Caso verificado a mano (hombre 80/180/30)", function () {
    var r = MF.calcular(BASE);
    assert.ok(r.valido, "válido");
    var d = r.resultado;
    assert.aprox(d.bmr, 1780, "BMR");
    assert.aprox(d.tdee, 2759, "TDEE", 1);
    assert.aprox(d.calorias, 2759, "calorías mantener", 1);
    assert.aprox(d.proteinaG, 160, "proteína g");
    assert.aprox(d.grasaG, 76.6, "grasa g", 0.6);
    assert.aprox(d.carbosG, 357.3, "carbos g", 1);
    assert.aprox(d.imc, 24.7, "IMC", 0.1);
    assert.igual(d.imcCategoria.clave, "normal", "IMC normal");
  });

  test("BMR mujer distinto de hombre", function () {
    var h = MF.bmrMifflin("hombre", 70, 170, 30);
    var m = MF.bmrMifflin("mujer", 70, 170, 30);
    assert.aprox(h - m, 166, "diferencia 166 (5 − (−161))");
  });

  test("Factores de actividad", function () {
    var sed = MF.calcular(Object.assign({}, BASE, { actividad: "sedentario" })).resultado;
    var alto = MF.calcular(Object.assign({}, BASE, { actividad: "alto" })).resultado;
    assert.aprox(sed.tdee, 1780 * 1.2, "sedentario", 1);
    assert.aprox(alto.tdee, 1780 * 1.725, "alto", 1);
  });

  test("Déficit y superávit", function () {
    var baja = MF.calcular(Object.assign({}, BASE, { objetivo: "bajar_rapido" })).resultado;
    var gana = MF.calcular(Object.assign({}, BASE, { objetivo: "ganar" })).resultado;
    assert.aprox(baja.calorias, 2759 * 0.8, "−20%", 1);
    assert.aprox(gana.calorias, 2759 * 1.15, "+15%", 1);
  });

  test("Macros suman ~calorías", function () {
    var d = MF.calcular(BASE).resultado;
    var suma = d.proteinaKcal + d.grasaKcal + d.carbosKcal;
    assert.aprox(suma, d.calorias, "suma de macros ≈ calorías", 2);
  });

  test("Nivel de proteína cambia gramos", function () {
    var mod = MF.calcular(Object.assign({}, BASE, { proteinaNivel: "moderada" })).resultado;
    var alta = MF.calcular(Object.assign({}, BASE, { proteinaNivel: "muy_alta" })).resultado;
    assert.aprox(mod.proteinaG, 1.6 * 80, "moderada 1.6 g/kg");
    assert.aprox(alta.proteinaG, 2.2 * 80, "muy alta 2.2 g/kg");
  });

  test("IMC categorías", function () {
    assert.igual(MF.categoriaIMC(17).clave, "bajo", "bajo");
    assert.igual(MF.categoriaIMC(22).clave, "normal", "normal");
    assert.igual(MF.categoriaIMC(27).clave, "sobrepeso", "sobrepeso");
    assert.igual(MF.categoriaIMC(32).clave, "obesidad", "obesidad");
  });

  test("Grasa respeta mínimo saludable", function () {
    // Déficit agresivo + poca grasa => sube al mínimo 0.6 g/kg
    var d = MF.calcular(Object.assign({}, BASE, { objetivo: "bajar_rapido", grasaPct: 15 })).resultado;
    assert.ok(d.grasaG >= 0.6 * 80 - 0.5, "grasa >= mínimo 0.6 g/kg");
  });

  test("Carbos no negativos (clamp)", function () {
    // caso extremo: mucha proteína + mucha grasa + pocas calorías
    var d = MF.calcular({ sexo: "mujer", edad: 25, peso: 90, altura: 150, actividad: "sedentario", objetivo: "bajar_rapido", proteinaNivel: "muy_alta", grasaPct: 45 }).resultado;
    assert.ok(d.carbosG >= 0, "carbos no negativos");
  });

  test("Inputs vacíos no rompen", function () {
    var r = MF.calcular({});
    assert.igual(r.valido, false, "inválido");
    assert.igual(r.resultado, null, "sin resultado");
    assert.ok(r.errores.length > 0, "hay errores");
  });

  test("Valores fuera de rango rechazados", function () {
    assert.igual(MF.calcular(Object.assign({}, BASE, { edad: 5 })).valido, false, "edad baja");
    assert.igual(MF.calcular(Object.assign({}, BASE, { peso: -10 })).valido, false, "peso negativo");
    assert.igual(MF.calcular(Object.assign({}, BASE, { altura: 300 })).valido, false, "altura absurda");
    assert.igual(MF.calcular(Object.assign({}, BASE, { sexo: "" })).valido, false, "sin sexo");
  });

  test("Decimales", function () {
    var r = MF.calcular(Object.assign({}, BASE, { peso: 80.5, altura: 178.5 }));
    assert.ok(r.valido, "decimales válidos");
  });

  function correr(reportar) {
    var pasaron = 0, fallaron = 0, detalles = [];
    pruebas.forEach(function (p) {
      try { p.fn(); pasaron++; detalles.push({ nombre: p.nombre, ok: true }); }
      catch (e) { fallaron++; detalles.push({ nombre: p.nombre, ok: false, error: e.message }); }
    });
    if (reportar) reportar({ total: pruebas.length, pasaron: pasaron, fallaron: fallaron, detalles: detalles });
    return { total: pruebas.length, pasaron: pasaron, fallaron: fallaron, detalles: detalles };
  }

  if (typeof module !== "undefined" && module.exports) {
    var res = correr();
    res.detalles.forEach(function (d) { console.log((d.ok ? "✓ " : "✗ ") + d.nombre + (d.ok ? "" : "\n    " + d.error)); });
    console.log("\n" + res.pasaron + "/" + res.total + " tests OK" + (res.fallaron ? " — " + res.fallaron + " fallaron" : ""));
    process.exit(res.fallaron ? 1 : 0);
  } else {
    window.__TESTS_MACROFACIL__ = { correr: correr, pruebas: pruebas };
  }
})();
