/* =============================================================================
 * js/ejercicios.js — Catálogo LOCAL de ejercicios de gimnasio (español rioplatense).
 * Con alias para buscar (ej: "isquio" → Sillón de isquios). Sin datos externos.
 * ============================================================================= */
(function (global) {
  "use strict";
  var GYM = global.GYM = global.GYM || {};

  // g = grupo muscular, n = nombre, a = alias para búsqueda
  var CAT = [
    // Pecho
    { g: "Pecho", n: "Press banca", a: "pecho banca plano barra" },
    { g: "Pecho", n: "Press inclinado con barra", a: "pecho inclinado superior" },
    { g: "Pecho", n: "Press plano con mancuernas", a: "pecho mancuernas" },
    { g: "Pecho", n: "Press inclinado con mancuernas", a: "pecho inclinado mancuernas" },
    { g: "Pecho", n: "Aperturas / Peck deck", a: "pecho contractora aperturas mariposa" },
    { g: "Pecho", n: "Cruce de poleas", a: "pecho crossover poleas" },
    { g: "Pecho", n: "Fondos en paralelas", a: "pecho fondos dips" },
    // Espalda
    { g: "Espalda", n: "Jalón al pecho", a: "espalda dorsal dorsalera jalon polea" },
    { g: "Espalda", n: "Dominadas", a: "espalda dorsal pull up" },
    { g: "Espalda", n: "Remo con barra", a: "espalda dorsal remo" },
    { g: "Espalda", n: "Remo en polea baja", a: "espalda remo bajo polea" },
    { g: "Espalda", n: "Remo con mancuerna", a: "espalda remo unilateral serrucho" },
    { g: "Espalda", n: "Remo en máquina (Hammer)", a: "espalda remo maquina hammer" },
    { g: "Espalda", n: "Peso muerto", a: "espalda peso muerto deadlift" },
    { g: "Espalda", n: "Pull over", a: "espalda dorsal pullover" },
    // Hombros
    { g: "Hombros", n: "Press militar", a: "hombro hombros militar press over head" },
    { g: "Hombros", n: "Press Arnold", a: "hombro arnold" },
    { g: "Hombros", n: "Vuelos laterales", a: "hombro laterales vuelos elevaciones" },
    { g: "Hombros", n: "Vuelos posteriores", a: "hombro posterior deltoide posterior pajaro" },
    { g: "Hombros", n: "Remo al mentón", a: "hombro menton remo alto" },
    // Bíceps
    { g: "Bíceps", n: "Curl con barra", a: "biceps curl barra" },
    { g: "Bíceps", n: "Curl con mancuernas", a: "biceps curl mancuernas" },
    { g: "Bíceps", n: "Curl martillo", a: "biceps martillo hammer" },
    { g: "Bíceps", n: "Curl predicador (banco Scott)", a: "biceps predicador scott banco" },
    { g: "Bíceps", n: "Curl en polea", a: "biceps polea" },
    // Tríceps
    { g: "Tríceps", n: "Extensión en polea", a: "triceps polea empuje" },
    { g: "Tríceps", n: "Extensión sobre la cabeza (francés)", a: "triceps frances copa" },
    { g: "Tríceps", n: "Patada de tríceps", a: "triceps patada kickback" },
    { g: "Tríceps", n: "Press cerrado", a: "triceps press cerrado banca" },
    { g: "Tríceps", n: "Fondos en banco", a: "triceps fondos banco" },
    // Cuádriceps
    { g: "Cuádriceps", n: "Sentadilla", a: "cuadriceps pierna sentadilla squat" },
    { g: "Cuádriceps", n: "Sentadilla hack", a: "cuadriceps hack maquina" },
    { g: "Cuádriceps", n: "Prensa 45°", a: "cuadriceps pierna prensa 45 leg press" },
    { g: "Cuádriceps", n: "Extensión de cuádriceps (sillón)", a: "cuadriceps sillon camilla extension" },
    { g: "Cuádriceps", n: "Zancadas / Estocadas", a: "cuadriceps pierna zancadas estocadas lunges" },
    { g: "Cuádriceps", n: "Sentadilla búlgara", a: "cuadriceps bulgara" },
    // Isquios
    { g: "Isquios", n: "Sillón de isquios (curl femoral)", a: "isquios isquio femoral sillon curl acostado" },
    { g: "Isquios", n: "Curl femoral sentado", a: "isquios femoral sentado" },
    { g: "Isquios", n: "Peso muerto rumano", a: "isquios rumano rdl femoral" },
    { g: "Isquios", n: "Buenos días", a: "isquios buenos dias good morning" },
    // Glúteos
    { g: "Glúteos", n: "Hip thrust", a: "gluteo gluteos empuje cadera hip thrust" },
    { g: "Glúteos", n: "Patada de glúteo en polea", a: "gluteo patada polea" },
    { g: "Glúteos", n: "Abducción en máquina", a: "gluteo abductores abduccion" },
    // Gemelos
    { g: "Gemelos", n: "Elevación de gemelos de pie", a: "gemelos pantorrilla parado" },
    { g: "Gemelos", n: "Elevación de gemelos sentado", a: "gemelos pantorrilla sentado" },
    // Abdominales
    { g: "Abdominales", n: "Crunch abdominal", a: "abdominales abdomen crunch" },
    { g: "Abdominales", n: "Elevación de piernas", a: "abdominales piernas colgado" },
    { g: "Abdominales", n: "Plancha", a: "abdominales plancha isometrico" },
    { g: "Abdominales", n: "Rueda abdominal", a: "abdominales rueda ab wheel" },
    { g: "Abdominales", n: "Crunch en polea", a: "abdominales polea" },
    // Otros
    { g: "Trapecios", n: "Encogimientos (shrugs)", a: "trapecio trapecios encogimientos shrugs" }
  ];

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

  // Busca en el catálogo + los ejercicios que el usuario ya usó (extra).
  function buscar(q, extra) {
    q = norm(q).trim();
    var pool = CAT.slice();
    (extra || []).forEach(function (nm) {
      if (!CAT.some(function (c) { return norm(c.n) === norm(nm); })) pool.unshift({ g: "Tuyos", n: nm, a: "" });
    });
    if (!q) return pool.slice(0, 40);
    return pool.filter(function (c) {
      return norm(c.n).indexOf(q) > -1 || norm(c.a).indexOf(q) > -1 || norm(c.g).indexOf(q) > -1;
    }).slice(0, 30);
  }

  GYM.ejercicios = { CAT: CAT, buscar: buscar, norm: norm };
  if (typeof module !== "undefined" && module.exports) module.exports = GYM.ejercicios;
})(typeof window !== "undefined" ? window : this);
