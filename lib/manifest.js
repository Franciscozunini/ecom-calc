/* =============================================================================
 * lib/manifest.js — Datos de marca y configuración. Solo expone window.__BRAND__.
 * No contiene lógica de cálculo (eso vive en calculo.js) ni datos de comisiones
 * o impuestos hardcodeados (esos son editables y viven en data/presets.json).
 * ============================================================================= */
(function () {
  "use strict";

  window.__BRAND__ = {
    nombre: "MargenLibre",
    tagline: "Calculadora de rentabilidad para Mercado Libre",
    monedaDefecto: "ARS",
    presetsUrl: "data/presets.json",

    // Valores iniciales del formulario. Vacíos donde no hay un dato confiable:
    // preferimos que el usuario lo complete a inventar un número.
    valoresIniciales: {
      precioVenta: "",
      costoProducto: "",
      comisionPct: "",
      cargoFijo: "",
      envio: "",
      impuestosPct: "",
      publicidad: "",
      otrosCostos: "",
      unidades: "1",
      margenObjetivoPct: ""
    }
  };
})();
