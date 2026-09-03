/* =============================================================================
 * tests/engine.test.js — Tests del motor (calc) y la persistencia (store).
 * `node tests/engine.test.js` o desde tests/test-runner.html.
 * ============================================================================= */
(function () {
  "use strict";
  var isNode = (typeof module !== "undefined" && module.exports);
  var calc = isNode ? require("../js/calc.js") : window.GYM.calc;
  var store = isNode ? require("../js/store.js") : window.GYM.store;
  var foods = isNode ? require("../js/foods.js") : window.GYM.foods;

  var pruebas = [];
  function test(n, fn) { pruebas.push({ nombre: n, fn: fn }); }
  function aprox(a, b, tol) { tol = tol === undefined ? 0.5 : tol; return Math.abs(a - b) <= tol; }
  var A = {
    ok: function (c, m) { if (!c) throw new Error(m || "esperaba verdadero"); },
    eq: function (a, b, m) { if (a !== b) throw new Error((m || "no coincide") + " → esperado " + b + ", obtuve " + a); },
    aprox: function (a, b, m, t) { if (!aprox(a, b, t)) throw new Error((m || "no aprox") + " → ~" + b + ", obtuve " + a); }
  };

  /* ===== CALC ===== */
  test("BMR y TDEE (hombre 80/180/30 moderado)", function () {
    var c = calc.calorias({ sexo: "hombre", peso: 80, altura: 180, edad: 30, actividad: "moderado", objetivo: "mantener" });
    A.aprox(c.bmr, 1780, "BMR", 1);
    A.aprox(c.tdee, 2759, "TDEE", 1);
    A.aprox(c.objetivo, 2759, "mantener", 1);
  });
  test("Calorías déficit y superávit", function () {
    var d = calc.calorias({ sexo: "hombre", peso: 80, altura: 180, edad: 30, actividad: "moderado", objetivo: "perder" });
    var g = calc.calorias({ sexo: "hombre", peso: 80, altura: 180, edad: 30, actividad: "moderado", objetivo: "ganar" });
    A.aprox(d.objetivo, 2759 * 0.8, "-20%", 1);
    A.aprox(g.objetivo, 2759 * 1.12, "+12%", 1);
  });
  test("Macros: suman las calorías y verifican", function () {
    var m = calc.macros({ calorias: 2200, peso: 80, protGkg: 2.0, grasaGkg: 0.8 });
    A.aprox(m.prot.g, 160, "prot g");
    A.aprox(m.grasa.g, 64, "grasa g");
    A.aprox(m.prot.kcal + m.carb.kcal + m.grasa.kcal, 2200, "suma kcal", 2);
  });
  test("Macros: grasa respeta mínimo y carbos no negativos", function () {
    var m = calc.macros({ calorias: 1000, peso: 90, protGkg: 2.2, grasaGkg: 0.2 });
    A.ok(m.grasa.g >= 0.6 * 90 - 0.5, "grasa min");
    A.ok(m.carb.g >= 0, "carbos no neg");
  });
  test("Proteína rango", function () {
    var r = calc.proteinaRango(80);
    A.aprox(r.min, 128, "min 1.6"); A.aprox(r.max, 176, "max 2.2");
  });
  test("Agua recomendada (~35 ml/kg)", function () { A.aprox(calc.aguaRecomendada(80), 2800, "agua"); });
  test("IMC categorías", function () {
    A.eq(calc.imc(80, 180).categoria.clave, "normal", "normal");
    A.eq(calc.imc(100, 170).categoria.clave, "obesidad", "obesidad");
  });
  test("1RM Epley + tabla", function () {
    A.aprox(calc.oneRM(100, 5), 116.7, "1RM 100x5", 0.2);
    A.aprox(calc.oneRM(100, 1), 100, "1RM 1 rep");
    var t = calc.tabla1RM(100);
    A.aprox(t.filter(function (x) { return x.pct === 80; })[0].peso, 80, "80%");
  });
  test("Volumen", function () {
    A.eq(calc.volumenSet(85, 8), 680, "vol set");
    A.eq(calc.volumenSesion([{ kg: 85, reps: 8 }, { kg: 85, reps: 7 }, { kg: 87.5, reps: 5 }]), Math.round(85 * 8 + 85 * 7 + 87.5 * 5), "vol sesión");
  });
  test("Progresión sugiere subir cuando todo fue alto", function () {
    var p = calc.progresion([{ kg: 80, reps: 10 }, { kg: 80, reps: 10 }, { kg: 80, reps: 10 }], "peso");
    A.ok(p.subir === true, "debe sugerir subir");
    A.aprox(p.kg, 82.5, "nuevo peso");
  });
  test("Plan de peso: semanas y kcal/día", function () {
    var p = calc.planPeso(85, 80, 0.5); // bajar 5 kg a 0.5/sem => 10 semanas
    A.aprox(p.semanas, 10, "semanas");
    A.ok(p.kcalDia < 0, "déficit");
    A.eq(p.direccion, "bajar", "bajar");
  });
  test("Discos: reparto correcto", function () {
    var d = calc.discos(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]); // 40 por lado
    A.ok(d.ok, "ok");
    A.eq(d.resto, 0, "sin resto");
    var suma = d.porLado.reduce(function (a, x) { return a + x; }, 0);
    A.eq(suma, 40, "40 por lado");
  });
  test("Discos: objetivo menor que barra => no ok", function () {
    A.eq(calc.discos(15, 20, [5]).ok, false, "no ok");
  });
  test("Detección de PR por peso y 1RM", function () {
    var hist = [{ fecha: "2026-09-01", sets: [{ kg: 80, reps: 8 }] }];
    var prs = calc.detectarPRs(hist, { sets: [{ kg: 90, reps: 5 }] });
    A.ok(prs.some(function (p) { return p.tipo === "peso" && p.valor === 90; }), "PR peso 90");
  });

  /* ===== GASTO / BALANCE ===== */
  test("kcal de actividad (MET, neto)", function () {
    // (8-1)·3.5·80/200·30 = 294
    A.aprox(calc.kcalActividad(8, 30, 80, true), 294, "cardio HIIT 30min 80kg", 1);
    A.aprox(calc.kcalActividad(8, 30, 80, false), 336, "bruto", 1);
  });
  test("kcal de pasos (peso y altura)", function () {
    // extra 6000, stride 0.747, km 4.482, kcal 179.3
    A.aprox(calc.kcalPasos(10000, 80, 180), 179, "10k pasos 80kg 180cm", 2);
    A.eq(calc.kcalPasos(3000, 80, 180), 0, "menos del baseline => 0");
  });
  test("kcal de sesión de musculación", function () {
    // 12 series => 42 min; (5-1)·3.5·80/200·42 = 235.2
    A.aprox(calc.kcalSesion(12, null, 80), 235, "12 series 80kg", 2);
    A.eq(calc.duracionSesion(12), 42, "duración estimada");
  });
  test("balance del día (déficit)", function () {
    var b = calc.balanceDia({ bmr: 1780, pasos: 10000, peso: 80, altura: 180, entrenoKcal: 235, cardioKcal: 294, comido: 2000 });
    // base 2136 + pasos 179 + 235 + 294 = 2844 ; comido 2000 => déficit 844
    A.aprox(b.gasto, 2844, "gasto estimado", 3);
    A.ok(b.balance < 0, "balance negativo = déficit");
    A.aprox(b.deficit, 844, "déficit", 3);
  });
  test("balance sin perfil => null", function () {
    A.eq(calc.balanceDia({ bmr: 0 }), null, "sin bmr no calcula");
  });

  /* ===== EDGE CASES ===== */
  test("Edge: ceros y vacíos no rompen", function () {
    A.eq(calc.oneRM(0, 0), 0, "1RM 0");
    A.eq(calc.volumenSet(0, 0), 0, "vol 0");
    var m = calc.macros({ calorias: 0, peso: 0 });
    A.ok(m && m.totalKcal >= 0, "macros 0");
  });
  test("Edge: negativos e inválidos", function () {
    A.eq(calc.oneRM(-50, 5), 0, "peso negativo => 0");
    A.eq(calc.oneRM(50, -3), 0, "reps negativas => 0");
    var d = calc.discos(-10, 20, [5]);
    A.eq(d.ok, false, "objetivo negativo");
  });

  /* ===== STORE ===== */
  function freshStore() { store._setStorage(store._memShim()); store.load(); }

  test("Store: perfil y objetivos persisten", function () {
    freshStore();
    store.setPerfil({ sexo: "hombre", peso: 80 });
    store.setObjetivos({ calorias: 2400 });
    A.eq(store.get().perfil.peso, 80, "perfil");
    A.eq(store.get().objetivos.calorias, 2400, "objetivos");
  });
  test("Store: comidas suman macros del día", function () {
    freshStore();
    var hoy = store.fechaHoy();
    store.addComida(hoy, { tipo: "almuerzo", nombre: "Pollo", cant: 150, kcal: 248, prot: 46, carb: 0, grasa: 5 });
    store.addComida(hoy, { tipo: "almuerzo", nombre: "Arroz", cant: 200, kcal: 260, prot: 5, carb: 56, grasa: 1 });
    var m = store.macrosDia(hoy);
    A.eq(m.kcal, 508, "kcal día");
    A.eq(m.prot, 51, "prot día");
  });
  test("Store: agua/pasos/peso", function () {
    freshStore();
    var hoy = store.fechaHoy();
    store.addAgua(hoy, 250); store.addAgua(hoy, 500);
    A.eq(store.dia(hoy).agua, 750, "agua");
    store.setPasos(hoy, 8000);
    A.eq(store.dia(hoy).pasos, 8000, "pasos");
    store.setPesoDia(hoy, 85.2);
    A.eq(store.pesos().length, 1, "log peso");
    A.eq(store.pesos()[0].peso, 85.2, "peso registrado");
  });
  test("Store: sesión guarda volumen e historial por ejercicio", function () {
    freshStore();
    store.guardarSesion({ fecha: "2026-09-01", rutinaNombre: "Push", ejercicios: [
      { nombre: "Press banca", sets: [{ kg: 80, reps: 8 }, { kg: 80, reps: 7 }] }
    ] });
    store.guardarSesion({ fecha: "2026-09-05", rutinaNombre: "Push", ejercicios: [
      { nombre: "Press banca", sets: [{ kg: 85, reps: 6 }] }
    ] });
    A.eq(store.sesiones().length, 2, "2 sesiones");
    var h = store.historialEjercicio("press banca");
    A.eq(h.length, 2, "historial 2");
    A.eq(store.ultimaVez("Press banca").fecha, "2026-09-05", "última vez");
  });
  test("Store: export / import ida y vuelta", function () {
    freshStore();
    store.setPerfil({ peso: 77 });
    store.addAgua(store.fechaHoy(), 1000);
    var json = store.exportar();
    freshStore(); // borra
    A.eq(store.get().perfil.peso || "", "", "borrado");
    store.importar(json);
    A.eq(store.get().perfil.peso, 77, "restaurado");
    A.eq(store.dia(store.fechaHoy()).agua, 1000, "agua restaurada");
  });
  test("Store: import inválido lanza y no rompe", function () {
    freshStore();
    var ok = false;
    try { store.importar("{ no es json"); } catch (_) { ok = true; }
    A.ok(ok, "debe lanzar en JSON inválido");
  });
  test("Store: borrar todo", function () {
    freshStore();
    store.setPerfil({ peso: 90 });
    store.borrarTodo();
    A.eq(store.get().perfil.peso || "", "", "vacío tras borrar");
  });

  /* ===== FOODS ===== */
  test("Foods: escalar por gramos", function () {
    var pollo = foods.BASE.filter(function (f) { return f.nombre.indexOf("pollo") > -1 || f.nombre.indexOf("Pollo") > -1 || f.nombre.indexOf("Pechuga") > -1; })[0];
    var e = foods.escalar(pollo, 150);
    A.aprox(e.kcal, Math.round(pollo.kcal * 1.5), "kcal escalada", 1);
  });

  function correr(reportar) {
    var pasaron = 0, fallaron = 0, det = [];
    pruebas.forEach(function (p) {
      try { p.fn(); pasaron++; det.push({ nombre: p.nombre, ok: true }); }
      catch (e) { fallaron++; det.push({ nombre: p.nombre, ok: false, error: e.message }); }
    });
    if (reportar) reportar({ total: pruebas.length, pasaron: pasaron, fallaron: fallaron, detalles: det });
    return { total: pruebas.length, pasaron: pasaron, fallaron: fallaron, detalles: det };
  }

  if (isNode) {
    var r = correr();
    r.detalles.forEach(function (d) { console.log((d.ok ? "✓ " : "✗ ") + d.nombre + (d.ok ? "" : "\n    " + d.error)); });
    console.log("\n" + r.pasaron + "/" + r.total + " tests OK" + (r.fallaron ? " — " + r.fallaron + " fallaron" : ""));
    process.exit(r.fallaron ? 1 : 0);
  } else {
    window.__TESTS_GYMBOX__ = { correr: correr };
  }
})();
