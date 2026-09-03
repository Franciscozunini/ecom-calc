/* js/views-comida.js — Comidas, tracker de macros, agua y pasos */
(function (global) {
  "use strict";
  var GYM = global.GYM, ui = GYM.ui, el = ui.el, store = GYM.store, calc = GYM.calc, foods = GYM.foods;

  var TIPOS = [
    { id: "desayuno", label: "Desayuno" }, { id: "almuerzo", label: "Almuerzo" },
    { id: "merienda", label: "Merienda" }, { id: "cena", label: "Cena" }, { id: "snack", label: "Snack" }
  ];

  GYM.views.comida = function () {
    var hoy = store.fechaHoy();
    var g = store.get().objetivos;
    var m = store.macrosDia(hoy);
    var d = store.dia(hoy);
    var root = el("div");

    root.appendChild(el("div.between", {}, [
      el("div", {}, [el("h1.view-title", { text: "Comida" }), el("div.view-sub", { text: ui.fechaLarga(hoy) })]),
      el("button.btn.btn-ghost.btn-sm", { text: "Objetivos", onclick: function () { if (GYM.editarObjetivos) GYM.editarObjetivos(); } })
    ]));

    // Tracker de macros
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Hoy llevás" })]));
    var tracker = el("div.panel");
    tracker.appendChild(macroRow("Calorías", m.kcal, g.calorias, "kcal", "accent"));
    tracker.appendChild(macroRow("Proteína", m.prot, g.proteina, "g", "good"));
    tracker.appendChild(macroRow("Carbohidratos", m.carb, g.carbos, "g", "accent"));
    tracker.appendChild(macroRow("Grasas", m.grasa, g.grasas, "g", "warn"));
    // te faltan
    var faltaK = g.calorias - m.kcal, faltaP = g.proteina - m.prot;
    tracker.appendChild(el("div.hairline", { style: "margin-top:10px;padding-top:10px" }, [
      el("div.muted", { style: "font-size:12.5px", html: faltaK > 0
        ? "Te faltan <b class='num' style='color:var(--ink)'>" + ui.n0(faltaK) + "</b> kcal y <b class='num' style='color:var(--ink)'>" + ui.n0(Math.max(0, faltaP)) + "</b> g de proteína."
        : "✅ Alcanzaste tus calorías del día." })
    ]));
    root.appendChild(tracker);

    // Agua
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Agua" }), el("button.btn.btn-quiet.btn-sm", { text: "Editar total", onclick: function () { editarAgua(hoy); } })]));
    root.appendChild(el("div.panel", {}, [
      el("div.between", { style: "margin-bottom:10px" }, [
        el("div.stat", {}, [el("span.k", { text: "De " + ui.n1(g.agua / 1000) + " L" }), el("span.v.num", { text: ui.n1(d.agua / 1000) + " L" })]),
        el("div.muted", { text: Math.round((d.agua / g.agua) * 100 || 0) + "%", style: "font-family:var(--disp);font-weight:700" })
      ]),
      barColor(g.agua > 0 ? d.agua / g.agua * 100 : 0, "#33d99b"),
      el("div.grid.g3", { style: "margin-top:12px" }, [250, 500, 750].map(function (ml) {
        return el("button.btn.btn-ghost", { text: "+" + ml, onclick: function () { store.addAgua(hoy, ml); ui.toast("+" + ml + " ml", "good"); GYM.refresh(); } });
      }))
    ]));

    // Pasos
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Pasos" })]));
    var pasosInp = el("input.input", { type: "text", inputmode: "numeric", value: d.pasos || "", placeholder: "0",
      onchange: function () { store.setPasos(hoy, calc.num(pasosInp.value, 0)); GYM.refresh(); } });
    root.appendChild(el("div.panel", {}, [
      el("div.between", { style: "margin-bottom:8px" }, [
        el("div.stat", {}, [el("span.k", { text: "Objetivo " + ui.n0(g.pasos) }), el("span.v.num", { text: ui.n0(d.pasos) })]),
        el("div.muted", { text: Math.round((d.pasos / g.pasos) * 100 || 0) + "%", style: "font-family:var(--disp);font-weight:700" })
      ]),
      barColor(g.pasos > 0 ? d.pasos / g.pasos * 100 : 0, "#ff5b2e"),
      el("div.field", { style: "margin-top:12px" }, [el("label", { text: "Registrar pasos de hoy" }), pasosInp])
    ]));

    // Cardio
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Cardio" }), el("button.btn.btn-primary.btn-sm", { html: plus() + " Cardio", onclick: function () { agregarCardio(hoy); } })]));
    if (!d.cardio.length) {
      root.appendChild(el("div.panel", {}, [el("p.muted", { style: "font-size:13px;margin:0", text: "Registrá tu cardio (correr, bici…) y estimamos las calorías quemadas." })]));
    } else {
      var ck = store.cardioKcalDia(hoy);
      var box = el("div.panel", {}, [el("div.between", { style: "margin-bottom:4px" }, [el("div", { style: "font-weight:800;font-family:var(--disp)", text: "Total cardio" }), el("div.accent.num", { style: "font-weight:700", text: "−" + ui.n0(ck) + " kcal" })])]);
      d.cardio.forEach(function (c) {
        box.appendChild(el("div.lrow", {}, [
          el("div.main", {}, [el("div.t", { text: c.label }), el("div.s", { text: ui.n0(c.minutos) + " min" })]),
          el("div.end", {}, [ui.n0(c.kcal), el("div.s.muted", { text: "kcal", style: "font-weight:600" })]),
          el("button.icon-btn", { html: trash(), onclick: function () { store.removeCardio(hoy, c.id); GYM.refresh(); } })
        ]));
      });
      root.appendChild(box);
    }

    // Ad
    root.appendChild(el("div.ad", { text: "Publicidad" }));

    // Comidas
    root.appendChild(el("div.between", { style: "margin:24px 0 12px" }, [
      el("h2", { style: "font-family:var(--disp);font-size:1.02rem", text: "Lo que comí hoy" }),
      el("button.btn.btn-primary.btn-sm", { html: plus() + " Alimento", onclick: function () { agregarComida(hoy); } })
    ]));
    if (!d.comidas.length) {
      root.appendChild(el("div.empty", {}, [el("div.ic", { html: fork() }), el("h3", { text: "Nada registrado aún" }), el("p", { text: "Agregá lo que comés y sumamos las calorías y macros automáticamente." }), el("button.btn.btn-primary", { html: plus() + " Agregar alimento", onclick: function () { agregarComida(hoy); } })]));
    } else {
      TIPOS.forEach(function (t) {
        var items = d.comidas.filter(function (c) { return c.tipo === t.id; });
        if (!items.length) return;
        var sub = items.reduce(function (a, c) { return a + (Number(c.kcal) || 0); }, 0);
        var group = el("div.panel", { style: "margin-bottom:10px" }, [
          el("div.between", { style: "margin-bottom:4px" }, [el("div", { style: "font-weight:800;font-family:var(--disp)", text: t.label }), el("div.muted.num", { style: "font-weight:700", text: ui.n0(sub) + " kcal" })])
        ]);
        items.forEach(function (c) {
          group.appendChild(el("div.lrow", {}, [
            el("div.main", {}, [el("div.t", { text: c.nombre }), el("div.s", { text: ui.n0(c.cant) + " g · P " + ui.n1(c.prot) + " · C " + ui.n1(c.carb) + " · G " + ui.n1(c.grasa) })]),
            el("div.end", {}, [ui.n0(c.kcal), el("div.s.muted", { text: "kcal", style: "font-weight:600" })]),
            el("button.icon-btn", { html: trash(), onclick: function () { store.removeComida(hoy, c.id); GYM.refresh(); } })
          ]));
        });
        root.appendChild(group);
      });
    }
    return root;
  };

  function macroRow(lab, val, goal, unit, tone) {
    return el("div.metric", {}, [
      el("span.lab", { text: lab }),
      el("span.val.num", { html: "<b>" + ui.n0(val) + "</b><span> / " + ui.n0(goal) + " " + unit + "</span>" }),
      el("span.barwrap", {}, [ui.bar(goal > 0 ? val / goal * 100 : 0, tone === "accent" ? null : tone)])
    ]);
  }
  function barColor(p, color) { var b = el("div.bar"); b.appendChild(el("span", { style: "width:" + Math.max(0, Math.min(100, p)) + "%;background:" + color })); return b; }

  /* ---------- Agregar comida ---------- */
  function agregarComida(hoy) {
    var tipo = "almuerzo";
    var modo = "buscar";
    var seleccion = null;

    var segTipo = el("div.seg.seg-quiet", { style: "flex-wrap:wrap" }, TIPOS.map(function (t) {
      return el("button", { text: t.label, class: t.id === tipo ? "on" : "", onclick: function () { tipo = t.id; ui.$$("button", segTipo).forEach(function (b) { b.classList.remove("on"); }); this.classList.add("on"); } });
    }));

    var buscar = el("input.input", { placeholder: "Buscá: pollo, arroz, huevo…", autocomplete: "off" });
    var lista = el("div", { style: "max-height:190px;overflow-y:auto;margin-top:8px" });
    var preview = el("div", { style: "margin-top:10px" });

    function pool() { return foods.BASE.concat(store.alimentos()); }
    function pintarLista() {
      var q = buscar.value.trim().toLowerCase();
      var items = pool().filter(function (f) { return !q || f.nombre.toLowerCase().indexOf(q) > -1; }).slice(0, 12);
      lista.innerHTML = "";
      items.forEach(function (f) {
        lista.appendChild(el("button.lrow.tap", { style: "width:100%;text-align:left;padding:9px 8px", onclick: function () { seleccionar(f); } }, [
          el("div.main", {}, [el("div.t", { text: f.nombre }), el("div.s", { text: f.kcal + " kcal · P" + f.prot + " C" + f.carb + " G" + f.grasa + " /100g" })])
        ]));
      });
      if (!items.length) lista.appendChild(el("div.muted", { style: "padding:10px;font-size:13px", text: "Sin resultados. Usá «Personalizado» abajo." }));
    }
    function seleccionar(f) {
      seleccion = f;
      var gramos = f.porcion || 100;
      preview.innerHTML = "";
      var inp = el("input.input", { type: "text", inputmode: "numeric", value: gramos, style: "text-align:center;font-family:var(--disp);font-weight:700" });
      var res = el("div.muted", { style: "text-align:center;margin:8px 0;font-size:13px" });
      function upd() {
        var g = calc.num(inp.value, 0); var e = foods.escalar(f, g);
        res.innerHTML = "<b class='num' style='color:var(--ink);font-size:1.3rem'>" + ui.n0(e.kcal) + "</b> kcal · P " + ui.n1(e.prot) + " · C " + ui.n1(e.carb) + " · G " + ui.n1(e.grasa);
        preview._calc = { g: g, e: e };
      }
      inp.addEventListener("input", upd);
      preview.appendChild(el("div.field", {}, [el("label", { text: f.nombre + " — cantidad (g)" }), inp]));
      preview.appendChild(res);
      preview.appendChild(el("button.btn.btn-primary.btn-block", { text: "Agregar a " + tipoLabel(tipo), onclick: function () {
        var c = preview._calc; if (!c || c.g <= 0) { ui.toast("Ingresá una cantidad"); return; }
        store.addComida(hoy, { tipo: tipo, nombre: f.nombre, cant: c.g, kcal: c.e.kcal, prot: c.e.prot, carb: c.e.carb, grasa: c.e.grasa });
        ui.toast("Agregado", "good"); sh.close(); GYM.refresh();
      } }));
      upd();
    }
    buscar.addEventListener("input", pintarLista);

    var tabBuscar = el("div", {}, [buscar, lista, preview]);
    var tabCustom = personalizado(hoy, function () { tipo = tipo; return tipo; }, function () { sh.close(); });

    var segModo = el("div.seg", { style: "margin:12px 0" }, [
      el("button", { text: "Buscar", class: "on", onclick: function () { setModo("buscar", this); } }),
      el("button", { text: "Personalizado", onclick: function () { setModo("custom", this); } })
    ]);
    function setModo(mm, btn) { modo = mm; ui.$$("button", segModo).forEach(function (b) { b.classList.remove("on"); }); btn.classList.add("on"); tabBuscar.hidden = mm !== "buscar"; tabCustom.hidden = mm !== "custom"; }

    var body = el("div", {}, [
      el("div.lab", { text: "Comida", style: "margin-bottom:6px;font-size:13px;color:var(--ink-soft)" }), segTipo,
      segModo, tabBuscar, tabCustom
    ]);
    tabCustom.hidden = true;
    var sh = ui.sheet("Agregar alimento", body);
    pintarLista();

    function tipoActual() { return tipo; }
    tabCustom._tipo = tipoActual;
  }

  function personalizado(hoy, getTipo, closeFn) {
    var nom = el("input.input", { placeholder: "Ej: Milanesa casera" });
    var cant = el("input.input", { type: "text", inputmode: "numeric", placeholder: "Cantidad (g)", value: "100" });
    var kcal = el("input.input", { type: "text", inputmode: "numeric", placeholder: "kcal" });
    var prot = el("input.input", { type: "text", inputmode: "decimal", placeholder: "Proteína g" });
    var carb = el("input.input", { type: "text", inputmode: "decimal", placeholder: "Carbos g" });
    var grasa = el("input.input", { type: "text", inputmode: "decimal", placeholder: "Grasa g" });
    var guardar = el("input", { type: "checkbox", id: "guardar-alim" });
    var box = el("div", {}, [
      el("div.hint", { text: "Ingresá los valores para la cantidad que comiste.", style: "margin-bottom:8px" }),
      el("div.field", {}, [el("label", { text: "Nombre" }), nom]),
      el("div.grid.g2", { style: "margin-top:10px" }, [
        el("div.field", {}, [el("label", { text: "Cantidad (g)" }), cant]),
        el("div.field", {}, [el("label", { text: "Calorías" }), kcal])
      ]),
      el("div.grid.g3", { style: "margin-top:10px" }, [
        el("div.field", {}, [el("label", { text: "Prot" }), prot]),
        el("div.field", {}, [el("label", { text: "Carbs" }), carb]),
        el("div.field", {}, [el("label", { text: "Grasa" }), grasa])
      ]),
      el("label.row", { style: "margin-top:12px;font-size:13px;color:var(--ink-soft);cursor:pointer" }, [guardar, el("span", { text: "Guardar en mi base de alimentos (por 100 g)" })]),
      el("button.btn.btn-primary.btn-block", { style: "margin-top:14px", text: "Agregar", onclick: function () {
        var g = calc.num(cant.value, 0);
        if (!nom.value.trim() || g <= 0) { ui.toast("Completá nombre y cantidad"); return; }
        var c = { tipo: (box._tipo ? box._tipo() : "snack"), nombre: nom.value.trim(), cant: g,
          kcal: calc.num(kcal.value, 0), prot: calc.num(prot.value, 0), carb: calc.num(carb.value, 0), grasa: calc.num(grasa.value, 0) };
        store.addComida(hoy, c);
        if (guardar.checked && g > 0) {
          var f = 100 / g;
          store.addAlimento({ nombre: nom.value.trim(), kcal: Math.round(c.kcal * f), prot: Math.round(c.prot * f * 10) / 10, carb: Math.round(c.carb * f * 10) / 10, grasa: Math.round(c.grasa * f * 10) / 10, porcion: g });
        }
        ui.toast("Agregado", "good"); closeFn(); GYM.refresh();
      } })
    ]);
    return box;
  }

  function agregarCardio(hoy) {
    var peso = calc.num(store.get().perfil.peso, 0) || 75;
    var sinPeso = !calc.num(store.get().perfil.peso, 0);
    var tipo = "trote";
    var sel = el("select.input", {}, Object.keys(calc.MET_CARDIO).map(function (k) {
      return el("option", { value: k, selected: k === tipo ? "selected" : null, text: calc.MET_CARDIO[k].label });
    }));
    var minInp = el("input.input", { type: "text", inputmode: "numeric", placeholder: "30" });
    var out = el("div.stat", { style: "text-align:center;margin:12px 0" }, [el("span.k", { text: "Estimado" }), el("span.v.num#cq", { text: "— kcal" })]);
    function upd() {
      var met = calc.MET_CARDIO[sel.value].met;
      ui.$("#cq", out).textContent = ui.n0(calc.kcalActividad(met, minInp.value, peso, true)) + " kcal";
    }
    sel.addEventListener("change", upd); minInp.addEventListener("input", upd);
    var body = el("div", {}, [
      el("div.field", {}, [el("label", { text: "Tipo de cardio" }), sel]),
      el("div.field", { style: "margin-top:10px" }, [el("label", { text: "Minutos" }), minInp]),
      out,
      sinPeso ? el("div.muted", { style: "font-size:11.5px;text-align:center", text: "Cargá tu peso en Perfil para más precisión (usamos 75 kg)." }) : null,
      el("button.btn.btn-primary.btn-block", { style: "margin-top:12px", text: "Agregar cardio", onclick: function () {
        var mm = calc.num(minInp.value, 0);
        if (mm <= 0) { ui.toast("Ingresá los minutos"); return; }
        var met = calc.MET_CARDIO[sel.value];
        store.addCardio(hoy, { tipo: sel.value, label: met.label, minutos: mm, kcal: calc.kcalActividad(met.met, mm, peso, true) });
        ui.toast("Cardio agregado", "good"); sh.close(); GYM.refresh();
      } })
    ]);
    var sh = ui.sheet("Agregar cardio", body);
    upd();
  }

  function editarAgua(hoy) {
    var inp = el("input.input", { type: "text", inputmode: "numeric", value: store.dia(hoy).agua, placeholder: "ml" });
    var body = el("div", {}, [
      el("div.field", {}, [el("label", { text: "Agua total de hoy (ml)" }), inp]),
      el("button.btn.btn-primary.btn-block", { style: "margin-top:14px", text: "Guardar", onclick: function () { store.setAgua(hoy, calc.num(inp.value, 0)); sh.close(); GYM.refresh(); } })
    ]);
    var sh = ui.sheet("Editar agua", body);
  }

  function tipoLabel(id) { var t = TIPOS.filter(function (x) { return x.id === id; })[0]; return t ? t.label.toLowerCase() : id; }
  function plus() { return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'; }
  function trash() { return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>'; }
  function fork() { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-1.5 0-3 1.5-3 5s1.5 4 3 4 3-1 3-4-1.5-5-3-5zM17 12v9"/></svg>'; }
})(typeof window !== "undefined" ? window : this);
