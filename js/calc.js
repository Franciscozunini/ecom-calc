/* =============================================================================
 * js/calc.js — Motor de cálculos de GymBox (SIN dependencias de UI).
 * Puro y testeable. Navegador (window.GYM.calc) y Node (module.exports).
 * Fórmulas estándar reconocidas — nada inventado. Todo son ESTIMACIONES.
 * ============================================================================= */
(function (global) {
  "use strict";

  var ACTIVIDAD = {
    sedentario: { factor: 1.2,   label: "Sedentario" },
    ligero:     { factor: 1.375, label: "Ligero (1-3 días)" },
    moderado:   { factor: 1.55,  label: "Moderado (3-5 días)" },
    alto:       { factor: 1.725, label: "Alto (6-7 días)" },
    atleta:     { factor: 1.9,   label: "Muy alto (2x/día)" }
  };
  var OBJETIVOS = {
    perder:   { ajuste: -0.20, label: "Perder grasa" },
    mantener: { ajuste:  0.00, label: "Mantener" },
    ganar:    { ajuste:  0.12, label: "Ganar masa" }
  };
  var PROTEINA = {
    moderada: { gkg: 1.6, label: "Moderada (1.6 g/kg)" },
    alta:     { gkg: 2.0, label: "Alta (2.0 g/kg)" },
    muy_alta: { gkg: 2.2, label: "Muy alta (2.2 g/kg)" }
  };
  var KCAL = { prot: 4, carb: 4, grasa: 9 };
  var GRASA_GKG_DEFECTO = 0.8;   // g por kg (fija por defecto en macros)
  var GRASA_MIN_GKG = 0.6;

  function num(v, def) {
    if (def === undefined) def = NaN;
    if (v === null || v === undefined) return def;
    if (typeof v === "number") return isFinite(v) ? v : def;
    var s = String(v).trim().replace(/\s/g, "");
    if (s === "") return def;
    if (s.indexOf(",") > -1 && s.indexOf(".") > -1) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (s.indexOf(",") > -1) s = s.replace(",", ".");
    var n = parseFloat(s);
    return isFinite(n) ? n : def;
  }
  function round(n, d) { d = d === undefined ? 0 : d; if (!isFinite(n)) return 0; var f = Math.pow(10, d); return Math.round((n + Number.EPSILON) * f) / f; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  /* ---------- Metabolismo / calorías ---------- */
  function bmr(sexo, peso, altura, edad) {
    var base = 10 * peso + 6.25 * altura - 5 * edad;
    return sexo === "mujer" ? base - 161 : base + 5;
  }
  function tdee(bmrVal, actividad) {
    var f = (ACTIVIDAD[actividad] || ACTIVIDAD.moderado).factor;
    return bmrVal * f;
  }
  function calorias(perfil) {
    // perfil: { sexo, edad, peso, altura, actividad, objetivo }
    var b = bmr(perfil.sexo, num(perfil.peso), num(perfil.altura), num(perfil.edad));
    var t = tdee(b, perfil.actividad);
    var aj = (OBJETIVOS[perfil.objetivo] || OBJETIVOS.mantener).ajuste;
    return { bmr: round(b), tdee: round(t), objetivo: round(t * (1 + aj)), ajustePct: round(aj * 100) };
  }

  /* ---------- Macros ----------
   * Auto: proteína = protGkg·peso, grasa = grasaGkg·peso (mín 0.6), carbos = resto.
   * Verifica que la suma en kcal coincida con las calorías objetivo.
   */
  function macros(opts) {
    var cal = num(opts.calorias, 0);
    var peso = num(opts.peso, 0);
    var protGkg = num(opts.protGkg, 2.0);
    var grasaGkg = num(opts.grasaGkg, GRASA_GKG_DEFECTO);
    if (grasaGkg < GRASA_MIN_GKG) grasaGkg = GRASA_MIN_GKG;

    var protG = protGkg * peso;
    var grasaG = grasaGkg * peso;
    var protK = protG * KCAL.prot;
    var grasaK = grasaG * KCAL.grasa;
    var carbK = cal - protK - grasaK;
    var aviso = false;
    if (carbK < 0) { carbK = 0; aviso = true; }
    var carbG = carbK / KCAL.carb;

    var totalK = protK + carbK + grasaK;
    return {
      prot:  { g: round(protG), kcal: round(protK), pct: cal > 0 ? round(protK / cal * 100) : 0 },
      carb:  { g: round(carbG), kcal: round(carbK), pct: cal > 0 ? round(carbK / cal * 100) : 0 },
      grasa: { g: round(grasaG), kcal: round(grasaK), pct: cal > 0 ? round(grasaK / cal * 100) : 0 },
      totalKcal: round(totalK),
      caloriasPedidas: round(cal),
      avisoSinCarbos: aviso
    };
  }

  /* ---------- Proteína (rango orientativo) ---------- */
  function proteinaRango(peso) {
    var p = num(peso, 0);
    return { min: round(1.6 * p), max: round(2.2 * p), optimo: round(2.0 * p) };
  }

  /* ---------- Agua (orientativa: ~35 ml/kg) ---------- */
  function aguaRecomendada(peso) { return round(num(peso, 0) * 35); } // ml

  /* ---------- IMC ---------- */
  function imc(peso, altura) {
    var p = num(peso, 0), a = num(altura, 0) / 100;
    if (a <= 0) return { valor: 0, categoria: { clave: "-", label: "-" } };
    var v = p / (a * a);
    var cat = v < 18.5 ? { clave: "bajo", label: "Bajo peso" }
      : v < 25 ? { clave: "normal", label: "Peso normal" }
      : v < 30 ? { clave: "sobrepeso", label: "Sobrepeso" }
      : { clave: "obesidad", label: "Obesidad" };
    return { valor: round(v, 1), categoria: cat };
  }

  /* ---------- Peso objetivo: plan por ritmo semanal ---------- */
  function planPeso(pesoActual, pesoObjetivo, ritmoKgSem) {
    var a = num(pesoActual, 0), o = num(pesoObjetivo, 0), r = Math.abs(num(ritmoKgSem, 0));
    var dif = o - a;
    if (r === 0 || dif === 0) return { semanas: 0, dif: round(dif, 1), kcalDia: 0, direccion: dif === 0 ? "mantener" : "-" };
    var semanas = Math.abs(dif) / r;
    // ~7700 kcal por kg de grasa corporal.
    var kcalDia = (dif < 0 ? -1 : 1) * r * 7700 / 7;
    return {
      semanas: round(semanas, 1),
      dif: round(dif, 1),
      kcalDia: round(kcalDia),
      direccion: dif < 0 ? "bajar" : "subir"
    };
  }

  /* ---------- 1RM (Epley) + tabla de % ---------- */
  function oneRM(peso, reps) {
    var p = num(peso, 0), r = num(reps, 0);
    if (p <= 0 || r <= 0) return 0;
    if (r === 1) return round(p, 1);
    return round(p * (1 + r / 30), 1);
  }
  var PCTS = [50, 60, 70, 75, 80, 85, 90, 95, 100];
  function tabla1RM(rm) {
    return PCTS.map(function (pct) { return { pct: pct, peso: round(rm * pct / 100, 1) }; });
  }
  function repsDe1RM(rm, pctObjetivo) {
    // inverso aproximado de Epley para estimar reps posibles a un % dado
    var frac = pctObjetivo / 100;
    if (frac >= 1) return 1;
    return Math.max(1, Math.round((1 / frac - 1) * 30));
  }

  /* ---------- Volumen ---------- */
  function volumenSet(kg, reps) { return num(kg, 0) * num(reps, 0); }
  function volumenSesion(sets) {
    return round((sets || []).reduce(function (a, s) { return a + volumenSet(s.kg, s.reps); }, 0));
  }

  /* ---------- Progresión sugerida ----------
   * Basada en la última sesión de un ejercicio. Es una sugerencia matemática simple.
   * estrategia: "peso" | "reps" | "mantener"
   */
  function progresion(ultimaSesion, estrategia) {
    // ultimaSesion: array de sets [{kg, reps}]
    var sets = (ultimaSesion || []).filter(function (s) { return num(s.kg, 0) > 0 && num(s.reps, 0) > 0; });
    if (!sets.length) return null;
    var topSet = sets.slice().sort(function (a, b) { return b.kg - a.kg || b.reps - a.reps; })[0];
    var kg = num(topSet.kg, 0), reps = num(topSet.reps, 0);
    var incremento = kg < 20 ? 1 : (kg < 60 ? 2.5 : 2.5); // paso mínimo de disco por lado ×2
    var todasAltas = sets.every(function (s) { return num(s.reps, 0) >= reps; });

    if (estrategia === "reps") {
      return { tipo: "reps", texto: "Intentá sumar 1 repetición: " + kg + " kg × " + (reps + 1), kg: kg, reps: reps + 1 };
    }
    if (estrategia === "mantener") {
      return { tipo: "mantener", texto: "Repetí " + kg + " kg × " + reps + " y afianzá la técnica.", kg: kg, reps: reps };
    }
    // "peso" (por defecto): si venías cómodo, subí; si no, mantené
    var nuevo = round(kg + incremento, 2);
    return {
      tipo: "peso",
      texto: todasAltas ? "Podrías intentar " + nuevo + " kg" : "Consolidá " + kg + " kg antes de subir",
      kg: todasAltas ? nuevo : kg, reps: reps, subir: todasAltas
    };
  }

  /* ---------- Calculadora de discos ---------- */
  function discos(objetivo, barra, disponibles) {
    var obj = num(objetivo, 0), b = num(barra, 20);
    var discos = (disponibles || [25, 20, 15, 10, 5, 2.5, 1.25]).slice().sort(function (a, x) { return x - a; });
    var porLado = (obj - b) / 2;
    if (porLado < 0) return { ok: false, motivo: "El objetivo es menor que la barra.", porLado: [], resto: 0 };
    var usados = [], resto = porLado;
    discos.forEach(function (d) {
      while (resto >= d - 1e-9) { usados.push(d); resto = round(resto - d, 3); }
    });
    return { ok: true, porLado: usados, resto: round(resto, 3), pesoReal: round(b + (porLado - resto) * 2, 2), objetivo: obj, barra: b };
  }

  /* ---------- Detección de PR ----------
   * historial: array de sesiones previas [{fecha, sets:[{kg,reps}]}]
   * nuevaSesion: {sets:[{kg,reps}]}
   * Devuelve qué récords rompió.
   */
  function mejores(sesiones) {
    var best = { peso: 0, reps: 0, volumen: 0, rm: 0 };
    (sesiones || []).forEach(function (s) {
      (s.sets || []).forEach(function (set) {
        var kg = num(set.kg, 0), reps = num(set.reps, 0);
        if (kg > best.peso) best.peso = kg;
        if (reps > best.reps) best.reps = reps;
        var vol = kg * reps;
        if (vol > best.volumen) best.volumen = vol;
        var rm = oneRM(kg, reps);
        if (rm > best.rm) best.rm = rm;
      });
    });
    return best;
  }
  function detectarPRs(historialPrevio, nuevaSesion) {
    var prev = mejores(historialPrevio);
    var prs = [];
    (nuevaSesion.sets || []).forEach(function (set) {
      var kg = num(set.kg, 0), reps = num(set.reps, 0);
      if (kg <= 0 || reps <= 0) return;
      if (kg > prev.peso) { prs.push({ tipo: "peso", kg: kg, reps: reps, valor: kg }); prev.peso = kg; }
      var vol = kg * reps;
      if (vol > prev.volumen) { prev.volumen = vol; }
      var rm = oneRM(kg, reps);
      if (rm > prev.rm + 0.01) { prs.push({ tipo: "rm", kg: kg, reps: reps, valor: rm }); prev.rm = rm; }
    });
    // dedup por tipo, quedarse con el mayor
    var out = {};
    prs.forEach(function (p) { if (!out[p.tipo] || p.valor > out[p.tipo].valor) out[p.tipo] = p; });
    return Object.keys(out).map(function (k) { return out[k]; });
  }

  var API = {
    ACTIVIDAD: ACTIVIDAD, OBJETIVOS: OBJETIVOS, PROTEINA: PROTEINA, KCAL: KCAL, PCTS: PCTS,
    num: num, round: round, clamp: clamp,
    bmr: bmr, tdee: tdee, calorias: calorias, macros: macros,
    proteinaRango: proteinaRango, aguaRecomendada: aguaRecomendada, imc: imc, planPeso: planPeso,
    oneRM: oneRM, tabla1RM: tabla1RM, repsDe1RM: repsDe1RM,
    volumenSet: volumenSet, volumenSesion: volumenSesion,
    progresion: progresion, discos: discos, mejores: mejores, detectarPRs: detectarPRs
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  global.GYM = global.GYM || {};
  global.GYM.calc = API;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
