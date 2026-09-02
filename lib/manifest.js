/* =============================================================================
 * lib/manifest.js — Datos de marca. Solo expone window.__BRAND__.
 * Sin lógica de cálculo (eso vive en calorias.js).
 * ============================================================================= */
(function () {
  "use strict";
  window.__BRAND__ = {
    nombre: "MacroFácil",
    tagline: "Calculadora de calorías y macros",
    valoresIniciales: {
      sexo: "", edad: "", peso: "", altura: "",
      actividad: "moderado", objetivo: "mantener",
      proteinaNivel: "alta", grasaPct: ""
    }
  };
})();
