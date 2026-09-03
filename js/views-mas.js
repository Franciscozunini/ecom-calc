/* js/views-mas.js — Perfil, calculadoras, datos (export/import) y privacidad */
(function (global) {
  "use strict";
  var GYM = global.GYM, ui = GYM.ui, el = ui.el, store = GYM.store, calc = GYM.calc;

  /* ============================ HUB ============================ */
  GYM.views.mas = function () {
    var s = store.get();
    var root = el("div");
    root.appendChild(el("h1.view-title", { text: "Más" }));

    // Perfil
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Perfil" })]));
    root.appendChild(perfilPanel(s));

    // Objetivos
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Objetivos del día" }), el("button.btn.btn-quiet.btn-sm", { text: "Editar", onclick: GYM.editarObjetivos })]));
    var g = s.objetivos;
    root.appendChild(el("div.panel.grid.g2", {}, [
      kv("Calorías", ui.n0(g.calorias) + " kcal"), kv("Proteína", ui.n0(g.proteina) + " g"),
      kv("Agua", ui.n1(g.agua / 1000) + " L"), kv("Pasos", ui.n0(g.pasos))
    ]));

    // Calculadoras
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Calculadoras" })]));
    var tools = [
      ["calorias", "Calorías (TDEE)", "Cuántas calorías necesitás"],
      ["macros", "Macros", "Proteína, carbos y grasa"],
      ["1rm", "1RM (peso máximo)", "Tu máximo y % de entrenamiento"],
      ["proteina", "Proteína", "Cuánta proteína por día"],
      ["agua", "Agua", "Cuánta agua tomar"],
      ["imc", "IMC", "Índice de masa corporal"],
      ["peso-objetivo", "Peso objetivo", "Cuánto tardarías"],
      ["discos", "Discos de la barra", "Qué poner por lado"]
    ];
    var grid = el("div.grid.g2");
    tools.forEach(function (t) {
      grid.appendChild(el("a.panel", { href: "#/calc/" + t[0], style: "display:block" }, [
        el("div", { style: "font-weight:700;font-size:14.5px", text: t[1] }),
        el("div.muted", { style: "font-size:12.5px", text: t[2] })
      ]));
    });
    root.appendChild(grid);

    // Datos
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Tus datos" })]));
    root.appendChild(el("div.panel", {}, [
      el("p.muted", { style: "font-size:13px;margin-bottom:12px", text: "Todo se guarda en este dispositivo. Exportá para no perder tu historial o pasarlo a otro navegador." }),
      el("div.grid.g2", {}, [
        el("button.btn.btn-ghost", { text: "Exportar datos", onclick: exportar }),
        el("button.btn.btn-ghost", { text: "Importar datos", onclick: importar })
      ]),
      el("button.btn.btn-ghost.btn-block", { style: "margin-top:10px", text: "Cargar un día de ejemplo", onclick: cargarEjemplo }),
      el("button.btn.btn-danger.btn-block", { style: "margin-top:10px", text: "Eliminar todos mis datos", onclick: borrar })
    ]));

    // Privacidad
    root.appendChild(el("div.panel", { style: "margin-top:14px" }, [
      el("div.row", { style: "gap:8px;margin-bottom:6px" }, [el("span", { html: lock(), style: "color:var(--good)" }), el("strong", { text: "100% privado" })]),
      el("p.muted", { style: "font-size:13px", text: "Todos tus datos se guardan en este dispositivo. No necesitás una cuenta. No enviamos tus datos a ningún servidor." })
    ]));

    root.appendChild(el("div.wrap-gap", { style: "margin-top:16px;justify-content:center" }, [
      el("a.btn.btn-quiet.btn-sm", { href: "privacidad.html", text: "Privacidad" }),
      el("a.btn.btn-quiet.btn-sm", { href: "aviso-legal.html", text: "Aviso legal" }),
      el("a.btn.btn-quiet.btn-sm", { href: "index.html", text: "Inicio" })
    ]));
    root.appendChild(el("p.muted", { style: "text-align:center;font-size:11px;margin-top:14px", text: "Orientativo · no reemplaza el consejo de un profesional de la salud." }));
    return root;
  };

  function perfilPanel(s) {
    var p = s.perfil;
    var sexo = p.sexo;
    var segSexo = el("div.seg", {}, [
      el("button", { text: "Hombre", class: sexo === "hombre" ? "on" : "", onclick: function () { sexo = "hombre"; mark(this); } }),
      el("button", { text: "Mujer", class: sexo === "mujer" ? "on" : "", onclick: function () { sexo = "mujer"; mark(this); } })
    ]);
    function mark(b) { ui.$$("button", segSexo).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on"); }
    var edad = inp(p.edad, "Edad"), peso = inp(p.peso, "Peso kg"), alt = inp(p.altura, "Altura cm");
    var act = selectDe(calc.ACTIVIDAD, p.actividad), obj = selectDe(calc.OBJETIVOS, p.objetivo);
    function guardar() {
      store.setPerfil({ sexo: sexo, edad: calc.num(edad.value, ""), peso: calc.num(peso.value, ""), altura: calc.num(alt.value, ""), actividad: act.value, objetivo: obj.value });
      ui.toast("Perfil guardado", "good");
    }
    [edad, peso, alt].forEach(function (i) { i.addEventListener("change", guardar); });
    act.addEventListener("change", guardar); obj.addEventListener("change", guardar);

    return el("div.panel", {}, [
      el("div.field", {}, [el("span.lab", { text: "Sexo" }), segSexo]),
      el("div.grid.g3", { style: "margin-top:12px" }, [
        el("div.field", {}, [el("label", { text: "Edad" }), edad]),
        el("div.field", {}, [el("label", { text: "Peso (kg)" }), peso]),
        el("div.field", {}, [el("label", { text: "Altura (cm)" }), alt])
      ]),
      el("div.field", { style: "margin-top:12px" }, [el("label", { text: "Actividad" }), act]),
      el("div.field", { style: "margin-top:12px" }, [el("label", { text: "Objetivo" }), obj]),
      el("div.grid.g2", { style: "margin-top:14px" }, [
        el("button.btn.btn-ghost", { text: "Guardar perfil", onclick: guardar }),
        el("button.btn.btn-primary", { text: "Calcular mis objetivos", onclick: function () {
          guardar();
          var pf = store.get().perfil;
          if (!pf.peso || !pf.altura || !pf.edad || !pf.sexo) { ui.toast("Completá todo el perfil primero"); return; }
          var c = calc.calorias(pf);
          var mac = calc.macros({ calorias: c.objetivo, peso: pf.peso, protGkg: 2.0, grasaGkg: 0.8 });
          store.setObjetivos({ calorias: c.objetivo, proteina: mac.prot.g, carbos: mac.carb.g, grasas: mac.grasa.g, agua: calc.aguaRecomendada(pf.peso) });
          ui.toast("Objetivos actualizados", "good"); GYM.refresh();
        } })
      ])
    ]);
  }

  GYM.editarObjetivos = function () {
    var g = store.get().objetivos;
    var f = {};
    ["calorias", "proteina", "carbos", "grasas", "agua", "pasos", "pesoObjetivo"].forEach(function (k) { f[k] = inp(g[k], k); });
    var body = el("div", {}, [
      el("div.grid.g2", {}, [
        fld("Calorías (kcal)", f.calorias), fld("Proteína (g)", f.proteina),
        fld("Carbos (g)", f.carbos), fld("Grasas (g)", f.grasas),
        fld("Agua (ml)", f.agua), fld("Pasos", f.pasos)
      ]),
      fld("Peso objetivo (kg)", f.pesoObjetivo),
      el("button.btn.btn-primary.btn-block", { style: "margin-top:14px", text: "Guardar objetivos", onclick: function () {
        store.setObjetivos({
          calorias: calc.num(f.calorias.value, g.calorias), proteina: calc.num(f.proteina.value, g.proteina),
          carbos: calc.num(f.carbos.value, g.carbos), grasas: calc.num(f.grasas.value, g.grasas),
          agua: calc.num(f.agua.value, g.agua), pasos: calc.num(f.pasos.value, g.pasos),
          pesoObjetivo: calc.num(f.pesoObjetivo.value, "")
        });
        ui.toast("Objetivos guardados", "good"); sh.close(); GYM.refresh();
      } })
    ]);
    var sh = ui.sheet("Editar objetivos", body);
  };

  /* ============================ DATOS ============================ */
  function exportar() {
    var data = store.exportar();
    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: "gymbox-" + store.fechaHoy() + ".json" });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    ui.toast("Datos exportados", "good");
  }
  function importar() {
    var input = el("input", { type: "file", accept: "application/json,.json", style: "display:none" });
    input.addEventListener("change", function () {
      var file = input.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try { store.importar(String(reader.result)); ui.toast("Datos importados", "good"); GYM.refresh(); }
        catch (e) { ui.toast("Archivo inválido"); }
      };
      reader.readAsText(file);
    });
    document.body.appendChild(input); input.click(); setTimeout(function () { input.remove(); }, 1000);
  }
  function cargarEjemplo() {
    ui.confirmar("Cargamos un día de ejemplo en el día de hoy (perfil + entreno + comidas + cardio + pasos) para que veas cómo funciona el balance. Podés editar o borrar todo después.", function () {
      var hoy = store.fechaHoy();
      if (!store.get().perfil.peso) store.setPerfil({ sexo: "hombre", edad: 30, peso: 80, altura: 180, actividad: "moderado", objetivo: "perder" });
      var pf = store.get().perfil, peso = calc.num(pf.peso, 80);
      var c = calc.calorias(pf), mac = calc.macros({ calorias: c.objetivo, peso: peso, protGkg: 2.0, grasaGkg: 0.8 });
      store.setObjetivos({ calorias: c.objetivo, proteina: mac.prot.g, carbos: mac.carb.g, grasas: mac.grasa.g });
      [["desayuno", "Avena", 60, 233, 10, 40, 4], ["desayuno", "Huevo", 100, 155, 13, 1, 11],
       ["almuerzo", "Pechuga de pollo", 200, 330, 62, 0, 7], ["almuerzo", "Arroz cocido", 200, 260, 5, 56, 1],
       ["merienda", "Yogur natural", 200, 122, 7, 9, 7], ["cena", "Carne magra", 200, 500, 52, 0, 30]].forEach(function (x) {
        store.addComida(hoy, { tipo: x[0], nombre: x[1], cant: x[2], kcal: x[3], prot: x[4], carb: x[5], grasa: x[6] });
      });
      store.setAgua(hoy, 2500); store.setPasos(hoy, 9000);
      store.addCardio(hoy, { tipo: "trote", label: "Trote suave", minutos: 30, kcal: calc.kcalActividad(7, 30, peso, true) });
      store.setPesoDia(hoy, 80);
      var ej = [
        { nombre: "Press banca", sets: [{ kg: 80, reps: 8 }, { kg: 80, reps: 7 }, { kg: 82.5, reps: 5 }] },
        { nombre: "Remo con barra", sets: [{ kg: 70, reps: 10 }, { kg: 70, reps: 9 }] },
        { nombre: "Press militar", sets: [{ kg: 45, reps: 8 }, { kg: 45, reps: 8 }] }
      ];
      var totalSets = ej.reduce(function (a, e) { return a + e.sets.length; }, 0);
      store.guardarSesion({ fecha: hoy, rutinaNombre: "Push/Pull ejemplo", ejercicios: ej, duracion: calc.duracionSesion(totalSets), kcal: calc.kcalSesion(totalSets, null, peso) });
      ui.toast("Día de ejemplo cargado", "good"); GYM.go("#/inicio"); GYM.refresh();
    }, { ok: "Cargar ejemplo" });
  }

  function borrar() {
    ui.confirmar("Se van a eliminar TODOS tus datos de este dispositivo (entrenamientos, comidas, peso…). Esto no se puede deshacer.", function () {
      ui.confirmar("¿Seguro? Última confirmación.", function () { store.borrarTodo(); ui.toast("Datos eliminados"); GYM.go("#/inicio"); GYM.refresh(); }, { danger: true, ok: "Sí, eliminar todo", titulo: "Confirmación final" });
    }, { danger: true, ok: "Continuar", titulo: "Eliminar todo" });
  }

  /* ============================ CALCULADORAS ============================ */
  GYM.views.calc = function (parts) {
    var tool = parts[0] || "calorias";
    var map = { calorias: cCalorias, macros: cMacros, "1rm": c1rm, proteina: cProteina, agua: cAgua, imc: cImc, "peso-objetivo": cPesoObj, discos: cDiscos };
    var fn = map[tool] || cCalorias;
    var root = el("div");
    root.appendChild(el("a.btn.btn-quiet.btn-sm", { href: "#/mas", text: "← Calculadoras" }));
    root.appendChild(fn());
    root.appendChild(el("div.disclaimer", { style: "margin-top:20px", html: "<strong>Estimación orientativa.</strong> No reemplaza el consejo de un profesional de la salud. Los resultados usan fórmulas estándar y pueden no reflejar tu caso." }));
    return root;
  };

  function head(t, sub) { return el("div", { style: "margin:10px 0 14px" }, [el("h1.view-title", { text: t }), sub ? el("div.view-sub", { text: sub }) : null]); }

  function cCalorias() {
    var p = store.get().perfil;
    var sexo = p.sexo || "hombre";
    var seg = segmento(["hombre", "mujer"], ["Hombre", "Mujer"], sexo, function (v) { sexo = v; upd(); });
    var edad = inp(p.edad, "Edad"), peso = inp(p.peso, "Peso"), alt = inp(p.altura, "Altura");
    var act = selectDe(calc.ACTIVIDAD, p.actividad), obj = selectDe(calc.OBJETIVOS, p.objetivo);
    var out = el("div", { style: "margin-top:16px" });
    function upd() {
      if (!edad.value || !peso.value || !alt.value) { out.innerHTML = ""; out.appendChild(hint("Completá tus datos para ver el resultado.")); return; }
      var c = calc.calorias({ sexo: sexo, edad: edad.value, peso: peso.value, altura: alt.value, actividad: act.value, objetivo: obj.value });
      out.innerHTML = "";
      out.appendChild(bigResult(ui.n0(c.objetivo), "kcal / día", calc.OBJETIVOS[obj.value].label));
      out.appendChild(el("div.grid.g2", { style: "margin-top:12px" }, [mini("Mantenimiento", ui.n0(c.tdee) + " kcal"), mini("Metabolismo basal", ui.n0(c.bmr) + " kcal")]));
      out.appendChild(el("button.btn.btn-primary.btn-block", { style: "margin-top:14px", text: "Usar como mi objetivo", onclick: function () {
        var mac = calc.macros({ calorias: c.objetivo, peso: peso.value, protGkg: 2.0, grasaGkg: 0.8 });
        store.setObjetivos({ calorias: c.objetivo, proteina: mac.prot.g, carbos: mac.carb.g, grasas: mac.grasa.g });
        ui.toast("Objetivo actualizado", "good");
      } }));
    }
    [edad, peso, alt].forEach(function (i) { i.addEventListener("input", upd); });
    act.addEventListener("change", upd); obj.addEventListener("change", upd);
    var node = el("div", {}, [
      head("Calculadora de calorías", "Tu gasto diario y calorías objetivo (Mifflin-St Jeor)."),
      el("div.field", {}, [el("span.lab", { text: "Sexo" }), seg]),
      el("div.grid.g3", { style: "margin-top:12px" }, [fld("Edad", edad), fld("Peso (kg)", peso), fld("Altura (cm)", alt)]),
      el("div.field", { style: "margin-top:12px" }, [el("label", { text: "Actividad" }), act]),
      el("div.field", { style: "margin-top:12px" }, [el("label", { text: "Objetivo" }), obj]),
      out
    ]);
    upd();
    return node;
  }

  function cMacros() {
    var p = store.get().perfil;
    var calI = inp(store.get().objetivos.calorias, "Calorías"), pesoI = inp(p.peso, "Peso"),
      protI = inp("2.0", "prot"), grasaI = inp("0.8", "grasa");
    var out = el("div", { style: "margin-top:16px" });
    function upd() {
      var m = calc.macros({ calorias: calI.value, peso: pesoI.value, protGkg: protI.value, grasaGkg: grasaI.value });
      out.innerHTML = "";
      out.appendChild(el("div.grid.g3", {}, [
        macroBox("Proteína", m.prot, "#34d99b"), macroBox("Carbohidratos", m.carb, "#ff5b2e"), macroBox("Grasa", m.grasa, "#c084fc")
      ]));
      out.appendChild(el("div.panel", { style: "margin-top:12px;text-align:center" }, [
        el("span.muted", { text: "Total: " }), el("span.num", { text: ui.n0(m.totalKcal) + " kcal", style: "font-weight:700" }),
        m.avisoSinCarbos ? el("div.muted", { style: "font-size:12px;margin-top:4px", text: "⚠️ La proteína y grasa superan las calorías: no quedan carbos." }) : null
      ]));
      out.appendChild(el("button.btn.btn-primary.btn-block", { style: "margin-top:12px", text: "Usar como mi objetivo", onclick: function () {
        store.setObjetivos({ calorias: calc.num(calI.value, 0), proteina: m.prot.g, carbos: m.carb.g, grasas: m.grasa.g }); ui.toast("Objetivo actualizado", "good");
      } }));
    }
    [calI, pesoI, protI, grasaI].forEach(function (i) { i.addEventListener("input", upd); });
    var node = el("div", {}, [
      head("Calculadora de macros", "Reparte tus calorías en proteína, carbos y grasa."),
      el("div.grid.g2", {}, [fld("Calorías (kcal)", calI), fld("Peso (kg)", pesoI)]),
      el("div.grid.g2", { style: "margin-top:12px" }, [fld("Proteína (g/kg)", protI), fld("Grasa (g/kg)", grasaI)]),
      out
    ]);
    upd();
    return node;
  }

  function c1rm() {
    var pesoI = inp("", "Peso"), repsI = inp("", "Reps");
    var out = el("div", { style: "margin-top:16px" });
    function upd() {
      var rm = calc.oneRM(pesoI.value, repsI.value);
      out.innerHTML = "";
      if (rm <= 0) { out.appendChild(hint("Ingresá peso y repeticiones (fórmula de Epley).")); return; }
      out.appendChild(bigResult(ui.n1(rm), "kg", "1RM estimado"));
      var tabla = calc.tabla1RM(rm);
      var rows = el("div.list.panel", { style: "margin-top:12px" });
      tabla.forEach(function (t) {
        rows.appendChild(el("div.lrow", {}, [el("div.main", {}, [el("div.t", { text: t.pct + "%" })]), el("div.end.num", { text: ui.n1(t.peso) + " kg" })]));
      });
      out.appendChild(rows);
    }
    [pesoI, repsI].forEach(function (i) { i.addEventListener("input", upd); });
    var node = el("div", {}, [head("Calculadora de 1RM", "Tu repetición máxima estimada y % para entrenar."),
      el("div.grid.g2", {}, [fld("Peso levantado (kg)", pesoI), fld("Repeticiones", repsI)]), out]);
    upd(); return node;
  }

  function cProteina() {
    var pesoI = inp(store.get().perfil.peso, "Peso");
    var out = el("div", { style: "margin-top:16px" });
    function upd() {
      var r = calc.proteinaRango(pesoI.value);
      out.innerHTML = "";
      if (!pesoI.value) { out.appendChild(hint("Ingresá tu peso.")); return; }
      out.appendChild(bigResult(ui.n0(r.min) + "–" + ui.n0(r.max), "g / día", "Rango recomendado (1.6–2.2 g/kg)"));
      out.appendChild(el("div.panel", { style: "margin-top:12px;text-align:center" }, [el("span.muted", { text: "Punto óptimo para la mayoría: " }), el("span.num", { text: ui.n0(r.optimo) + " g", style: "font-weight:700" })]));
    }
    pesoI.addEventListener("input", upd);
    var node = el("div", {}, [head("Cuánta proteína", "Referencia orientativa por peso corporal."), fld("Peso (kg)", pesoI), out]);
    upd(); return node;
  }

  function cAgua() {
    var pesoI = inp(store.get().perfil.peso, "Peso");
    var out = el("div", { style: "margin-top:16px" });
    function upd() { out.innerHTML = ""; if (!pesoI.value) { out.appendChild(hint("Ingresá tu peso.")); return; } out.appendChild(bigResult(ui.n1(calc.aguaRecomendada(pesoI.value) / 1000), "litros / día", "Estimación (~35 ml/kg)")); }
    pesoI.addEventListener("input", upd);
    var node = el("div", {}, [head("Cuánta agua", "Orientativo — variá según clima y actividad."), fld("Peso (kg)", pesoI), out]);
    upd(); return node;
  }

  function cImc() {
    var pesoI = inp(store.get().perfil.peso, "Peso"), altI = inp(store.get().perfil.altura, "Altura");
    var out = el("div", { style: "margin-top:16px" });
    function upd() {
      out.innerHTML = ""; if (!pesoI.value || !altI.value) { out.appendChild(hint("Ingresá peso y altura.")); return; }
      var r = calc.imc(pesoI.value, altI.value);
      out.appendChild(bigResult(ui.n1(r.valor), r.categoria.label, "Índice de masa corporal"));
      out.appendChild(el("div.disclaimer", { style: "margin-top:12px", text: "El IMC no distingue músculo de grasa: en personas muy musculadas puede sobreestimar. Tomalo como referencia general." }));
    }
    [pesoI, altI].forEach(function (i) { i.addEventListener("input", upd); });
    var node = el("div", {}, [head("Calculadora de IMC"), el("div.grid.g2", {}, [fld("Peso (kg)", pesoI), fld("Altura (cm)", altI)]), out]);
    upd(); return node;
  }

  function cPesoObj() {
    var actI = inp(store.get().perfil.peso, "Actual"), objI = inp(store.get().objetivos.pesoObjetivo, "Objetivo"), ritI = inp("0.5", "Ritmo");
    var out = el("div", { style: "margin-top:16px" });
    function upd() {
      out.innerHTML = ""; if (!actI.value || !objI.value || !ritI.value) { out.appendChild(hint("Completá los tres campos.")); return; }
      var pl = calc.planPeso(actI.value, objI.value, ritI.value);
      if (pl.direccion === "mantener") { out.appendChild(hint("El peso objetivo es igual al actual.")); return; }
      out.appendChild(bigResult(ui.n1(pl.semanas), "semanas", "para " + (pl.direccion === "bajar" ? "bajar " : "subir ") + ui.n1(Math.abs(pl.dif)) + " kg"));
      out.appendChild(el("div.panel", { style: "margin-top:12px;text-align:center" }, [el("span.muted", { text: "Requiere un " + (pl.kcalDia < 0 ? "déficit" : "superávit") + " de ~" }), el("span.num", { text: ui.n0(Math.abs(pl.kcalDia)) + " kcal/día", style: "font-weight:700" })]));
    }
    [actI, objI, ritI].forEach(function (i) { i.addEventListener("input", upd); });
    var node = el("div", {}, [head("Peso objetivo", "Estimación de tiempo (no una promesa)."),
      el("div.grid.g3", {}, [fld("Actual (kg)", actI), fld("Objetivo (kg)", objI), fld("kg / semana", ritI)]), out]);
    upd(); return node;
  }

  function cDiscos() {
    var objI = inp("100", "Objetivo"), barI = inp("20", "Barra");
    var out = el("div", { style: "margin-top:16px" });
    function upd() {
      var r = calc.discos(objI.value, barI.value, [25, 20, 15, 10, 5, 2.5, 1.25]);
      out.innerHTML = "";
      if (!r.ok) { out.appendChild(el("div.disclaimer", { text: r.motivo })); return; }
      var col = { 25: "#ff5b2e", 20: "#3aa0ff", 15: "#f4b740", 10: "#34d99b", 5: "#c084fc", 2.5: "#e5e7eb", 1.25: "#9aa1ac" };
      out.appendChild(el("div.muted", { style: "text-align:center;font-size:12.5px", text: "Por cada lado:" }));
      var plates = el("div.plates", {}, r.porLado.map(function (pp) { return el("div.plate", { style: "height:" + Math.min(90, 34 + pp * 1.6) + "px;background:" + (col[pp] || "#888"), text: pp }); }));
      if (!r.porLado.length) plates.appendChild(el("div.muted", { text: "Solo la barra" }));
      out.appendChild(plates);
      out.appendChild(el("div", { style: "text-align:center;font-family:var(--disp);font-weight:700;margin-top:8px", text: r.porLado.length ? r.porLado.join(" + ") + " kg por lado" : "—" }));
      if (r.resto > 0) out.appendChild(el("div.muted", { style: "text-align:center;font-size:12px", text: "No exacto: sobran " + ui.n1(r.resto) + " kg." }));
    }
    [objI, barI].forEach(function (i) { i.addEventListener("input", upd); });
    var node = el("div", {}, [head("Calculadora de discos"), el("div.grid.g2", {}, [fld("Peso objetivo (kg)", objI), fld("Barra (kg)", barI)]), out]);
    upd(); return node;
  }

  /* ---- helpers ---- */
  function inp(val, ph) { return el("input.input", { type: "text", inputmode: "decimal", value: val != null && val !== "" ? val : "", placeholder: ph || "" }); }
  function fld(label, node) { return el("div.field", {}, [el("label", { text: label }), node]); }
  function selectDe(mapa, sel) {
    return el("select.input", {}, Object.keys(mapa).map(function (k) { return el("option", { value: k, selected: k === sel ? "selected" : null, text: mapa[k].label }); }));
  }
  function segmento(vals, labels, sel, onch) {
    var seg = el("div.seg");
    vals.forEach(function (v, i) { seg.appendChild(el("button", { text: labels[i], class: v === sel ? "on" : "", onclick: function () { ui.$$("button", seg).forEach(function (b) { b.classList.remove("on"); }); this.classList.add("on"); onch(v); } })); });
    return seg;
  }
  function kv(k, v) { return el("div.stat", {}, [el("span.k", { text: k }), el("span.v.num", { text: v, style: "font-size:1.1rem" })]); }
  function mini(k, v) { return el("div.panel", { style: "padding:11px" }, [el("div.stat", {}, [el("span.k", { text: k }), el("span.v.num", { text: v, style: "font-size:1.1rem" })])]); }
  function macroBox(lab, mo, color) {
    return el("div.panel", { style: "padding:12px;text-align:center" }, [
      el("div", { style: "font-size:12px;color:var(--ink-mute);font-weight:600", text: lab }),
      el("div.num", { text: ui.n0(mo.g) + " g", style: "font-weight:800;font-size:1.5rem;color:" + color }),
      el("div.muted", { style: "font-size:11.5px", text: ui.n0(mo.kcal) + " kcal · " + ui.n0(mo.pct) + "%" })
    ]);
  }
  function bigResult(big, unit, lab) {
    return el("div.hero-stat", {}, [el("div.glow"), el("div", { style: "text-align:center;position:relative" }, [
      el("div.eyebrow", { text: lab || "" }),
      el("div", { style: "display:flex;align-items:baseline;gap:8px;justify-content:center;margin-top:4px" }, [
        el("span.num", { text: big, style: "font-size:3rem;font-weight:800;color:var(--accent-2)" }),
        el("span.muted", { text: unit, style: "font-weight:600" })
      ])
    ])]);
  }
  function hint(t) { return el("div.panel", {}, [el("p.muted", { style: "text-align:center;font-size:13.5px;margin:6px 0", text: t })]); }
  function lock() { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'; }
})(typeof window !== "undefined" ? window : this);
