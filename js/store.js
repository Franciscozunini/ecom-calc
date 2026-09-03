/* =============================================================================
 * js/store.js — Persistencia local de GymBox (localStorage). Sin backend.
 * Todos los datos viven en el dispositivo del usuario. Export/import/borrar.
 * Testeable en Node inyectando un storage en memoria (GYM.store._setStorage).
 * ============================================================================= */
(function (global) {
  "use strict";

  var KEY = "gymbox.v1";
  var VERSION = 1;

  function memShim() {
    var m = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; }
    };
  }
  var storage = (function () {
    try { if (typeof localStorage !== "undefined") { localStorage.getItem(KEY); return localStorage; } } catch (_) {}
    return memShim();
  })();

  function vacio() {
    return {
      v: VERSION,
      perfil: { nombre: "", sexo: "", edad: "", altura: "", peso: "", actividad: "moderado", objetivo: "mantener" },
      objetivos: { calorias: 2200, proteina: 160, carbos: 220, grasas: 65, agua: 3000, pasos: 10000, pesoObjetivo: "" },
      dias: {},
      pesos: [],
      rutinas: [],
      sesiones: [],
      alimentos: []
    };
  }

  var state = null;

  function load() {
    try {
      var raw = storage.getItem(KEY);
      if (!raw) { state = vacio(); return state; }
      var obj = JSON.parse(raw);
      state = migrar(obj);
    } catch (_) { state = vacio(); }
    return state;
  }
  function migrar(obj) {
    var base = vacio();
    if (!obj || typeof obj !== "object") return base;
    // merge superficial defensivo
    base.perfil = Object.assign(base.perfil, obj.perfil || {});
    base.objetivos = Object.assign(base.objetivos, obj.objetivos || {});
    base.dias = (obj.dias && typeof obj.dias === "object") ? obj.dias : {};
    base.pesos = Array.isArray(obj.pesos) ? obj.pesos : [];
    base.rutinas = Array.isArray(obj.rutinas) ? obj.rutinas : [];
    base.sesiones = Array.isArray(obj.sesiones) ? obj.sesiones : [];
    base.alimentos = Array.isArray(obj.alimentos) ? obj.alimentos : [];
    base.v = VERSION;
    return base;
  }
  function get() { if (!state) load(); return state; }
  function save() { try { storage.setItem(KEY, JSON.stringify(get())); } catch (_) {} return state; }

  /* ---------- Fechas ---------- */
  function fechaHoy() {
    var d = new Date();
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  }
  function p2(n) { return (n < 10 ? "0" : "") + n; }

  function dia(fecha) {
    var s = get();
    if (!s.dias[fecha]) s.dias[fecha] = { agua: 0, pasos: 0, peso: null, comidas: [], entreno: null };
    var d = s.dias[fecha];
    if (!Array.isArray(d.comidas)) d.comidas = [];
    if (typeof d.agua !== "number") d.agua = 0;
    if (typeof d.pasos !== "number") d.pasos = 0;
    return d;
  }

  function uid() { return "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------- Perfil / objetivos ---------- */
  function setPerfil(p) { Object.assign(get().perfil, p || {}); save(); return get().perfil; }
  function setObjetivos(o) { Object.assign(get().objetivos, o || {}); save(); return get().objetivos; }

  /* ---------- Comidas ---------- */
  function addComida(fecha, comida) {
    var d = dia(fecha);
    comida.id = comida.id || uid();
    d.comidas.push(comida);
    save(); return comida;
  }
  function removeComida(fecha, id) {
    var d = dia(fecha);
    d.comidas = d.comidas.filter(function (c) { return c.id !== id; });
    save();
  }
  function macrosDia(fecha) {
    var d = dia(fecha);
    var t = { kcal: 0, prot: 0, carb: 0, grasa: 0 };
    d.comidas.forEach(function (c) {
      t.kcal += Number(c.kcal) || 0; t.prot += Number(c.prot) || 0;
      t.carb += Number(c.carb) || 0; t.grasa += Number(c.grasa) || 0;
    });
    t.kcal = Math.round(t.kcal); t.prot = Math.round(t.prot);
    t.carb = Math.round(t.carb); t.grasa = Math.round(t.grasa);
    return t;
  }

  /* ---------- Agua / pasos / peso ---------- */
  function addAgua(fecha, ml) { var d = dia(fecha); d.agua = Math.max(0, (d.agua || 0) + (Number(ml) || 0)); save(); return d.agua; }
  function setAgua(fecha, ml) { var d = dia(fecha); d.agua = Math.max(0, Number(ml) || 0); save(); return d.agua; }
  function setPasos(fecha, n) { var d = dia(fecha); d.pasos = Math.max(0, Math.round(Number(n) || 0)); save(); return d.pasos; }
  function setPesoDia(fecha, kg) {
    var d = dia(fecha);
    var v = Number(kg);
    d.peso = isFinite(v) && v > 0 ? v : null;
    // Espejo en el log de pesos (uno por fecha)
    var s = get();
    s.pesos = s.pesos.filter(function (x) { return x.fecha !== fecha; });
    if (d.peso) s.pesos.push({ fecha: fecha, peso: d.peso });
    s.pesos.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    save(); return d.peso;
  }
  function pesos() { return get().pesos.slice(); }
  function statsPeso(objetivo) {
    var ps = pesos();
    if (!ps.length) return null;
    var actual = ps[ps.length - 1].peso;
    var inicial = ps[0].peso;
    var cambio = actual - inicial;
    // promedio últimos 7 registros
    var ult = ps.slice(-7);
    var prom = ult.reduce(function (a, x) { return a + x.peso; }, 0) / ult.length;
    var tendencia = "estable";
    if (ps.length >= 2) {
      var d = ps[ps.length - 1].peso - ps[Math.max(0, ps.length - 4)].peso;
      tendencia = d < -0.2 ? "bajando" : d > 0.2 ? "subiendo" : "estable";
    }
    return {
      actual: actual, inicial: inicial, cambio: Math.round(cambio * 10) / 10,
      promedio: Math.round(prom * 10) / 10, tendencia: tendencia,
      objetivo: Number(objetivo) || null, registros: ps.length
    };
  }

  /* ---------- Rutinas ---------- */
  function addRutina(r) { r.id = r.id || uid(); r.ejercicios = r.ejercicios || []; get().rutinas.push(r); save(); return r; }
  function updateRutina(id, patch) {
    var r = get().rutinas.filter(function (x) { return x.id === id; })[0];
    if (r) { Object.assign(r, patch); save(); } return r;
  }
  function removeRutina(id) { var s = get(); s.rutinas = s.rutinas.filter(function (x) { return x.id !== id; }); save(); }
  function rutina(id) { return get().rutinas.filter(function (x) { return x.id === id; })[0] || null; }

  /* ---------- Sesiones de entrenamiento ---------- */
  function guardarSesion(ses) {
    ses.id = ses.id || uid();
    ses.fecha = ses.fecha || fechaHoy();
    var vol = 0;
    (ses.ejercicios || []).forEach(function (ej) {
      (ej.sets || []).forEach(function (st) { vol += (Number(st.kg) || 0) * (Number(st.reps) || 0); });
    });
    ses.volumen = Math.round(vol);
    var s = get();
    // reemplaza si ya existe ese id
    s.sesiones = s.sesiones.filter(function (x) { return x.id !== ses.id; });
    s.sesiones.push(ses);
    s.sesiones.sort(function (a, b) { return a.fecha < b.fecha ? -1 : (a.fecha > b.fecha ? 1 : 0); });
    // marca el día
    dia(ses.fecha).entreno = ses.id;
    save(); return ses;
  }
  function sesiones() { return get().sesiones.slice(); }
  // Historial de un ejercicio por nombre: [{fecha, sets}]
  function historialEjercicio(nombre) {
    var out = [];
    get().sesiones.forEach(function (s) {
      (s.ejercicios || []).forEach(function (ej) {
        if (norm(ej.nombre) === norm(nombre) && (ej.sets || []).length) out.push({ fecha: s.fecha, sets: ej.sets, sesionId: s.id });
      });
    });
    out.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    return out;
  }
  function norm(s) { return String(s || "").trim().toLowerCase(); }
  function ultimaVez(nombre) {
    var h = historialEjercicio(nombre);
    return h.length ? h[h.length - 1] : null;
  }
  function nombresEjercicios() {
    var set = {};
    get().sesiones.forEach(function (s) { (s.ejercicios || []).forEach(function (ej) { if (ej.nombre) set[ej.nombre] = 1; }); });
    get().rutinas.forEach(function (r) { (r.ejercicios || []).forEach(function (ej) { if (ej.nombre) set[ej.nombre] = 1; }); });
    return Object.keys(set).sort();
  }

  /* ---------- Alimentos personalizados ---------- */
  function addAlimento(a) { a.id = a.id || uid(); get().alimentos.push(a); save(); return a; }
  function removeAlimento(id) { var s = get(); s.alimentos = s.alimentos.filter(function (x) { return x.id !== id; }); save(); }
  function alimentos() { return get().alimentos.slice(); }

  /* ---------- Export / import / borrar ---------- */
  function exportar() { return JSON.stringify(get(), null, 2); }
  function importar(jsonStr) {
    var obj = JSON.parse(jsonStr); // lanza si inválido
    if (!obj || typeof obj !== "object") throw new Error("Formato inválido");
    state = migrar(obj);
    save();
    return state;
  }
  function borrarTodo() { state = vacio(); save(); return state; }

  var API = {
    KEY: KEY, VERSION: VERSION,
    _setStorage: function (s) { storage = s || memShim(); state = null; },
    _memShim: memShim,
    vacio: vacio, load: load, get: get, save: save,
    fechaHoy: fechaHoy, dia: dia, uid: uid,
    setPerfil: setPerfil, setObjetivos: setObjetivos,
    addComida: addComida, removeComida: removeComida, macrosDia: macrosDia,
    addAgua: addAgua, setAgua: setAgua, setPasos: setPasos, setPesoDia: setPesoDia, pesos: pesos, statsPeso: statsPeso,
    addRutina: addRutina, updateRutina: updateRutina, removeRutina: removeRutina, rutina: rutina,
    guardarSesion: guardarSesion, sesiones: sesiones, historialEjercicio: historialEjercicio,
    ultimaVez: ultimaVez, nombresEjercicios: nombresEjercicios,
    addAlimento: addAlimento, removeAlimento: removeAlimento, alimentos: alimentos,
    exportar: exportar, importar: importar, borrarTodo: borrarTodo
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  global.GYM = global.GYM || {};
  global.GYM.store = API;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
