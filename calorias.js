/* =============================================================================
 * calorias.js — Motor de cálculo de calorías y macros (SIN dependencias de UI).
 * Puro y testeable en aislamiento. Funciona en navegador (window.MacroFacil) y
 * en Node (module.exports) para los tests.
 *
 * Fórmulas ESTÁNDAR y reconocidas (no inventadas):
 *  - BMR (metabolismo basal): Mifflin-St Jeor.
 *      Hombre: 10·peso(kg) + 6.25·altura(cm) − 5·edad + 5
 *      Mujer:  10·peso(kg) + 6.25·altura(cm) − 5·edad − 161
 *  - TDEE (gasto total) = BMR × factor de actividad.
 *  - Calorías objetivo = TDEE × (1 + ajuste según objetivo).
 *  - Proteína: g/kg de peso corporal (nivel elegible).
 *  - Grasa: % de las calorías (con un mínimo por kg).
 *  - Carbohidratos: lo que resta (4 kcal/g prot y carbo, 9 kcal/g grasa).
 *  - IMC = peso / altura(m)².
 *
 * -----------------------------------------------------------------------------
 * CASO VERIFICADO A MANO (test de humo y documentación):
 *   Hombre, 30 años, 80 kg, 180 cm, actividad moderada, mantener,
 *   proteína alta (2.0 g/kg), grasa 25 %.
 *   BMR  = 10·80 + 6.25·180 − 5·30 + 5 = 1780
 *   TDEE = 1780 × 1.55 = 2759
 *   Calorías (mantener) = 2759
 *   Proteína = 2.0·80 = 160 g → 640 kcal
 *   Grasa    = 25 % de 2759 = 689.75 kcal → 76.6 g (min 0.6·80=48 g, ok)
 *   Carbos   = 2759 − 640 − 689.75 = 1429.25 kcal → 357.3 g
 *   IMC = 80 / 1.8² = 24.7 (Normal)
 * ============================================================================= */

(function (global) {
  "use strict";

  var ACTIVIDAD = {
    sedentario: { factor: 1.2,  label: "Sedentario — poco o nada de ejercicio" },
    ligero:     { factor: 1.375, label: "Ligero — ejercicio 1 a 3 días/semana" },
    moderado:   { factor: 1.55, label: "Moderado — ejercicio 3 a 5 días/semana" },
    alto:       { factor: 1.725, label: "Alto — ejercicio 6 a 7 días/semana" },
    atleta:     { factor: 1.9,  label: "Muy alto — 2 turnos o trabajo físico" }
  };

  // Ajuste sobre el TDEE según el objetivo.
  var OBJETIVOS = {
    bajar_rapido: { ajuste: -0.20, label: "Bajar grasa rápido (−20 %)" },
    bajar:        { ajuste: -0.15, label: "Bajar grasa (−15 %)" },
    bajar_leve:   { ajuste: -0.10, label: "Bajar grasa suave (−10 %)" },
    mantener:     { ajuste:  0.00, label: "Mantener peso" },
    ganar_leve:   { ajuste:  0.10, label: "Ganar músculo limpio (+10 %)" },
    ganar:        { ajuste:  0.15, label: "Ganar músculo (+15 %)" }
  };

  // Proteína en gramos por kg de peso corporal.
  var PROTEINA = {
    moderada: { gkg: 1.6, label: "Moderada (1.6 g/kg)" },
    alta:     { gkg: 2.0, label: "Alta (2.0 g/kg)" },
    muy_alta: { gkg: 2.2, label: "Muy alta (2.2 g/kg)" }
  };

  var KCAL = { proteina: 4, carbo: 4, grasa: 9 };
  var GRASA_PCT_DEFECTO = 0.25;   // 25 % de las calorías
  var GRASA_MIN_GKG = 0.6;        // mínimo saludable de grasa por kg

  function parseNumero(v, def) {
    if (def === undefined) def = NaN;
    if (v === null || v === undefined) return def;
    if (typeof v === "number") return isFinite(v) ? v : def;
    var s = String(v).trim().replace(/\s/g, "");
    if (s === "") return def;
    if (s.indexOf(",") > -1 && s.indexOf(".") > -1) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (s.indexOf(",") > -1) { s = s.replace(",", "."); }
    var n = parseFloat(s);
    return isFinite(n) ? n : def;
  }
  function esVacio(v) { return v === null || v === undefined || String(v).trim() === ""; }
  function redondear(n, d) { d = d === undefined ? 0 : d; if (!isFinite(n)) return 0; var f = Math.pow(10, d); return Math.round((n + Number.EPSILON) * f) / f; }

  function bmrMifflin(sexo, peso, altura, edad) {
    var base = 10 * peso + 6.25 * altura - 5 * edad;
    return sexo === "mujer" ? base - 161 : base + 5;
  }

  function categoriaIMC(imc) {
    if (imc < 18.5) return { clave: "bajo", label: "Bajo peso" };
    if (imc < 25)   return { clave: "normal", label: "Peso normal" };
    if (imc < 30)   return { clave: "sobrepeso", label: "Sobrepeso" };
    return { clave: "obesidad", label: "Obesidad" };
  }

  function validar(entrada) {
    entrada = entrada || {};
    var errores = [];
    var sexo = entrada.sexo === "mujer" ? "mujer" : (entrada.sexo === "hombre" ? "hombre" : null);
    var edad = parseNumero(entrada.edad, NaN);
    var peso = parseNumero(entrada.peso, NaN);
    var altura = parseNumero(entrada.altura, NaN);
    var actividad = ACTIVIDAD[entrada.actividad] ? entrada.actividad : null;
    var objetivo = OBJETIVOS[entrada.objetivo] ? entrada.objetivo : null;
    var proteinaNivel = PROTEINA[entrada.proteinaNivel] ? entrada.proteinaNivel : "alta";
    var grasaPct = esVacio(entrada.grasaPct) ? GRASA_PCT_DEFECTO * 100 : parseNumero(entrada.grasaPct, NaN);

    if (!sexo) errores.push({ campo: "sexo", mensaje: "Elegí tu sexo (para el cálculo metabólico)." });
    if (esVacio(entrada.edad) || isNaN(edad)) errores.push({ campo: "edad", mensaje: "Ingresá tu edad." });
    else if (edad < 14 || edad > 100) errores.push({ campo: "edad", mensaje: "La edad debe estar entre 14 y 100 años." });
    if (esVacio(entrada.peso) || isNaN(peso)) errores.push({ campo: "peso", mensaje: "Ingresá tu peso." });
    else if (peso < 30 || peso > 400) errores.push({ campo: "peso", mensaje: "El peso debe estar entre 30 y 400 kg." });
    if (esVacio(entrada.altura) || isNaN(altura)) errores.push({ campo: "altura", mensaje: "Ingresá tu altura." });
    else if (altura < 120 || altura > 250) errores.push({ campo: "altura", mensaje: "La altura debe estar entre 120 y 250 cm." });
    if (!esVacio(entrada.grasaPct) && (isNaN(grasaPct) || grasaPct < 15 || grasaPct > 45)) {
      errores.push({ campo: "grasaPct", mensaje: "El % de grasa debe estar entre 15 % y 45 %." });
    }

    var norm = {
      sexo: sexo, edad: edad, peso: peso, altura: altura,
      actividad: actividad || "moderado", objetivo: objetivo || "mantener",
      proteinaNivel: proteinaNivel, grasaPct: (isNaN(grasaPct) ? GRASA_PCT_DEFECTO * 100 : grasaPct)
    };
    return { valido: errores.length === 0, errores: errores, entrada: norm };
  }

  function calcular(entradaCruda) {
    var v = validar(entradaCruda);
    if (!v.valido) return { valido: false, errores: v.errores, entrada: v.entrada, resultado: null };
    var e = v.entrada;

    var bmr = bmrMifflin(e.sexo, e.peso, e.altura, e.edad);
    var factor = ACTIVIDAD[e.actividad].factor;
    var tdee = bmr * factor;
    var ajuste = OBJETIVOS[e.objetivo].ajuste;
    var calorias = tdee * (1 + ajuste);

    // Macros
    var protGkg = PROTEINA[e.proteinaNivel].gkg;
    var proteinaG = protGkg * e.peso;
    var proteinaKcal = proteinaG * KCAL.proteina;

    var grasaKcal = calorias * (e.grasaPct / 100);
    var grasaG = grasaKcal / KCAL.grasa;
    // Mínimo saludable de grasa
    var grasaMinG = GRASA_MIN_GKG * e.peso;
    if (grasaG < grasaMinG) { grasaG = grasaMinG; grasaKcal = grasaG * KCAL.grasa; }

    var carbosKcal = calorias - proteinaKcal - grasaKcal;
    var carbosG = carbosKcal / KCAL.carbo;
    var avisoCarbos = false;
    if (carbosG < 0) { carbosG = 0; carbosKcal = 0; avisoCarbos = true; }

    // % de cada macro sobre las calorías objetivo
    var pPct = calorias > 0 ? proteinaKcal / calorias * 100 : 0;
    var gPct = calorias > 0 ? grasaKcal / calorias * 100 : 0;
    var cPct = calorias > 0 ? carbosKcal / calorias * 100 : 0;

    var alturaM = e.altura / 100;
    var imc = e.peso / (alturaM * alturaM);
    var cat = categoriaIMC(imc);

    var resultado = {
      bmr: redondear(bmr),
      tdee: redondear(tdee),
      calorias: redondear(calorias),
      ajustePct: redondear(ajuste * 100),
      objetivoLabel: OBJETIVOS[e.objetivo].label,
      actividadLabel: ACTIVIDAD[e.actividad].label,

      proteinaG: redondear(proteinaG),
      proteinaKcal: redondear(proteinaKcal),
      proteinaPct: redondear(pPct),
      grasaG: redondear(grasaG),
      grasaKcal: redondear(grasaKcal),
      grasaPct: redondear(gPct),
      carbosG: redondear(carbosG),
      carbosKcal: redondear(carbosKcal),
      carbosPct: redondear(cPct),
      avisoCarbos: avisoCarbos,

      imc: redondear(imc, 1),
      imcCategoria: cat,

      // Reparto por comida (4 comidas) — práctico
      porComida: {
        calorias: redondear(calorias / 4),
        proteinaG: redondear(proteinaG / 4)
      },

      entrada: e
    };
    return { valido: true, errores: [], entrada: e, resultado: resultado };
  }

  var formato = {
    numero: function (n) {
      try { return new Intl.NumberFormat("es-AR").format(Math.round(n)); }
      catch (_) { return String(Math.round(n)); }
    },
    gramos: function (n) { return Math.round(n) + " g"; },
    kcal: function (n) { return formato.numero(n) + " kcal"; }
  };

  var API = {
    version: "1.0.0",
    ACTIVIDAD: ACTIVIDAD, OBJETIVOS: OBJETIVOS, PROTEINA: PROTEINA,
    KCAL: KCAL,
    parseNumero: parseNumero, redondear: redondear,
    bmrMifflin: bmrMifflin, categoriaIMC: categoriaIMC,
    validar: validar, calcular: calcular, formato: formato
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  global.MacroFacil = API;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
