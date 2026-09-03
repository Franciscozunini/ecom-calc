/* =============================================================================
 * js/foods.js — Base LOCAL de alimentos comunes. Valores APROXIMADOS por 100 g
 * (o 100 ml en líquidos). Son referenciales, NO precisión absoluta.
 * Fuente: valores nutricionales genéricos de dominio público, redondeados.
 * ============================================================================= */
(function (global) {
  "use strict";
  // Cada item: nombre, kcal, prot, carb, grasa (por 100 g/ml), porcion (g típica).
  var BASE = [
    { nombre: "Pechuga de pollo", kcal: 165, prot: 31, carb: 0, grasa: 3.6, porcion: 150 },
    { nombre: "Carne magra (bife)", kcal: 250, prot: 26, carb: 0, grasa: 15, porcion: 150 },
    { nombre: "Atún al natural", kcal: 116, prot: 26, carb: 0, grasa: 1, porcion: 120 },
    { nombre: "Huevo", kcal: 155, prot: 13, carb: 1.1, grasa: 11, porcion: 50 },
    { nombre: "Arroz cocido", kcal: 130, prot: 2.7, carb: 28, grasa: 0.3, porcion: 200 },
    { nombre: "Pasta cocida", kcal: 158, prot: 6, carb: 31, grasa: 0.9, porcion: 200 },
    { nombre: "Papa hervida", kcal: 87, prot: 2, carb: 20, grasa: 0.1, porcion: 200 },
    { nombre: "Batata", kcal: 86, prot: 1.6, carb: 20, grasa: 0.1, porcion: 200 },
    { nombre: "Avena", kcal: 389, prot: 17, carb: 66, grasa: 7, porcion: 60 },
    { nombre: "Pan", kcal: 265, prot: 9, carb: 49, grasa: 3.2, porcion: 60 },
    { nombre: "Banana", kcal: 89, prot: 1.1, carb: 23, grasa: 0.3, porcion: 120 },
    { nombre: "Manzana", kcal: 52, prot: 0.3, carb: 14, grasa: 0.2, porcion: 180 },
    { nombre: "Leche entera", kcal: 62, prot: 3.2, carb: 4.8, grasa: 3.3, porcion: 250 },
    { nombre: "Yogur natural", kcal: 61, prot: 3.5, carb: 4.7, grasa: 3.3, porcion: 200 },
    { nombre: "Queso", kcal: 350, prot: 25, carb: 1.3, grasa: 27, porcion: 40 },
    { nombre: "Lentejas cocidas", kcal: 116, prot: 9, carb: 20, grasa: 0.4, porcion: 200 },
    { nombre: "Almendras", kcal: 579, prot: 21, carb: 22, grasa: 50, porcion: 30 },
    { nombre: "Mantequilla de maní", kcal: 588, prot: 25, carb: 20, grasa: 50, porcion: 20 },
    { nombre: "Aceite", kcal: 884, prot: 0, carb: 0, grasa: 100, porcion: 10 },
    { nombre: "Whey protein", kcal: 375, prot: 78, carb: 8, grasa: 6, porcion: 30 }
  ];
  // Escala un alimento (por 100 g) a una cantidad en gramos.
  function escalar(food, gramos) {
    var f = gramos / 100;
    return {
      kcal: Math.round(food.kcal * f),
      prot: Math.round(food.prot * f * 10) / 10,
      carb: Math.round(food.carb * f * 10) / 10,
      grasa: Math.round(food.grasa * f * 10) / 10
    };
  }
  var API = { BASE: BASE, escalar: escalar };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  global.GYM = global.GYM || {};
  global.GYM.foods = API;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
