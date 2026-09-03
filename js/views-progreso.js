/* js/views-progreso.js — Peso, PRs, volumen y calendario */
(function (global) {
  "use strict";
  var GYM = global.GYM, ui = GYM.ui, el = ui.el, store = GYM.store, calc = GYM.calc;

  GYM.views.progreso = function () {
    var s = store.get();
    var root = el("div");
    root.appendChild(el("h1.view-title", { text: "Progreso" }));
    root.appendChild(el("div.view-sub", { text: "Tu evolución en fuerza, peso y constancia." }));

    /* Peso corporal */
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Peso corporal" }), el("button.btn.btn-quiet.btn-sm", { text: "+ Registrar", onclick: function () { registrarPeso(); } })]));
    var st = store.statsPeso(s.objetivos.pesoObjetivo);
    if (!st) {
      root.appendChild(el("div.empty", {}, [el("div.ic", { html: scale() }), el("h3", { text: "Sin registros de peso" }), el("p", { text: "Registrá tu peso para ver la tendencia." }), el("button.btn.btn-primary", { text: "Registrar peso", onclick: function () { registrarPeso(); } })]));
    } else {
      root.appendChild(el("div.panel", {}, [
        el("div.between", { style: "margin-bottom:10px" }, [
          el("div.stat", {}, [el("span.k", { text: "Actual" }), el("span.v.num", { text: ui.n1(st.actual) + " kg" })]),
          el("div.stat", { style: "text-align:right" }, [el("span.k", { text: "Cambio total" }), el("span.v.num", { text: (st.cambio > 0 ? "+" : "") + ui.n1(st.cambio) + " kg", style: st.cambio < 0 ? "color:var(--good)" : (st.cambio > 0 ? "color:var(--accent-2)" : "") })])
        ]),
        ui.lineChart(store.pesos().map(function (p) { return { x: p.fecha, y: p.peso }; }), { color: "#ff5b2e", vacio: "Registrá al menos 2 pesos." }),
        el("div.grid.g3", { style: "margin-top:12px" }, [
          mini("Inicial", ui.n1(st.inicial) + " kg"),
          mini("Prom. 7", ui.n1(st.promedio) + " kg"),
          mini("Tendencia", st.tendencia)
        ]),
        st.objetivo ? el("div.muted", { style: "font-size:12.5px;margin-top:10px", text: "Objetivo: " + ui.n1(st.objetivo) + " kg · te " + (st.actual > st.objetivo ? "sobran " : "faltan ") + ui.n1(Math.abs(st.actual - st.objetivo)) + " kg" }) : null
      ]));
    }

    root.appendChild(el("div.ad", { text: "Publicidad" }));

    /* PRs */
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Récords personales" })]));
    var prs = calcularPRs(s);
    if (!prs.length) {
      root.appendChild(el("div.empty", {}, [el("p", { text: "Registrá entrenamientos para ver tus PRs por ejercicio." })]));
    } else {
      var list = el("div.list.panel");
      prs.forEach(function (p) {
        list.appendChild(el("div.lrow.tap", { onclick: function () { GYM.go("#/ejercicio/" + encodeURIComponent(p.nombre)); } }, [
          el("div.ic", { html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3l2.5 5 5.5.8-4 3.9 1 5.5L12 16l-5 2.7 1-5.5-4-3.9 5.5-.8z"/></svg>' }),
          el("div.main", {}, [el("div.t", { text: p.nombre }), el("div.s", { text: "Mejor: " + ui.n1(p.peso) + " kg × " + p.reps })]),
          el("div.end", {}, [ui.n1(p.rm) + " kg", el("div.s.muted", { text: "1RM est.", style: "font-weight:600" })])
        ]));
      });
      root.appendChild(list);
    }

    /* Volumen semanal */
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Volumen semanal" })]));
    var semanas = volumenSemanal(s.sesiones);
    root.appendChild(el("div.panel", {}, [
      ui.lineChart(semanas.map(function (w) { return { x: w.k, y: w.vol }; }), { color: "#34d99b", vacio: "Necesitás sesiones en 2 semanas distintas." })
    ]));

    /* Calendario */
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Constancia" })]));
    root.appendChild(calendario(s));

    return root;
  };

  function calcularPRs(s) {
    var names = {};
    s.sesiones.forEach(function (ses) { (ses.ejercicios || []).forEach(function (e) { if (e.nombre) names[e.nombre] = 1; }); });
    return Object.keys(names).map(function (nom) {
      var hist = store.historialEjercicio(nom);
      var best = calc.mejores(hist);
      // encontrar el set del mejor peso
      var bestSet = { kg: best.peso, reps: 0 };
      hist.forEach(function (h) { h.sets.forEach(function (st) { if (st.kg === best.peso && st.reps > bestSet.reps) bestSet.reps = st.reps; }); });
      return { nombre: nom, peso: best.peso, reps: bestSet.reps, rm: best.rm };
    }).sort(function (a, b) { return b.rm - a.rm; });
  }

  function volumenSemanal(sesiones) {
    var map = {};
    sesiones.forEach(function (s) {
      var k = semanaKey(s.fecha);
      map[k] = (map[k] || 0) + (s.volumen || 0);
    });
    return Object.keys(map).sort().map(function (k) { return { k: k, vol: map[k] }; }).slice(-8);
  }
  function semanaKey(iso) {
    var d = new Date(iso + "T12:00:00");
    var day = (d.getDay() + 6) % 7; // lunes=0
    d.setDate(d.getDate() - day);
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  }
  function p2(n) { return (n < 10 ? "0" : "") + n; }

  function calendario(s) {
    var now = new Date();
    var y = now.getFullYear(), mo = now.getMonth();
    var first = new Date(y, mo, 1);
    var startDow = (first.getDay() + 6) % 7; // lunes=0
    var days = new Date(y, mo + 1, 0).getDate();
    var panel = el("div.panel");
    panel.appendChild(el("div", { style: "text-align:center;font-weight:700;margin-bottom:10px;font-family:var(--disp)", text: first.toLocaleDateString("es-AR", { month: "long", year: "numeric" }) }));
    var grid = el("div.cal");
    ["L", "M", "M", "J", "V", "S", "D"].forEach(function (d) { grid.appendChild(el("div.dow", { text: d })); });
    for (var i = 0; i < startDow; i++) grid.appendChild(el("div"));
    for (var day = 1; day <= days; day++) {
      var iso = y + "-" + p2(mo + 1) + "-" + p2(day);
      var dd = s.dias[iso];
      var hasEntreno = !!(dd && dd.entreno);
      var hasCal = !!(dd && (store.macrosDia(iso).kcal > 0));
      var cell = el("div.cell" + (dd ? ".has" : ""), { text: day, dataset: { iso: iso } });
      if (hasEntreno || hasCal) {
        var dots = el("div.dots");
        if (hasEntreno) dots.appendChild(el("i"));
        if (hasCal) dots.appendChild(el("i.g"));
        cell.appendChild(dots);
      }
      cell.addEventListener("click", (function (isoDate) { return function () { verDia(isoDate); }; })(iso));
      grid.appendChild(cell);
    }
    panel.appendChild(grid);
    panel.appendChild(el("div.wrap-gap", { style: "justify-content:center;margin-top:12px;font-size:11.5px;color:var(--ink-mute)" }, [
      el("span.row", { style: "gap:5px" }, [el("i", { style: "width:6px;height:6px;border-radius:50%;background:var(--accent);display:block" }), "Entreno"]),
      el("span.row", { style: "gap:5px" }, [el("i", { style: "width:6px;height:6px;border-radius:50%;background:var(--good);display:block" }), "Comida"])
    ]));
    return panel;
  }

  function verDia(iso) {
    var s = store.get();
    var m = store.macrosDia(iso);
    var d = s.dias[iso] || {};
    var ses = s.sesiones.filter(function (x) { return x.fecha === iso; })[0];
    var body = el("div", {}, [
      el("div.grid.g2", {}, [
        mini("Calorías", ui.n0(m.kcal)), mini("Proteína", ui.n0(m.prot) + " g"),
        mini("Agua", ui.n1((d.agua || 0) / 1000) + " L"), mini("Pasos", ui.n0(d.pasos || 0))
      ]),
      ses ? el("div.panel", { style: "margin-top:12px" }, [el("div", { style: "font-weight:700", text: ses.rutinaNombre || "Entrenamiento" }), el("div.muted", { style: "font-size:12.5px", text: (ses.ejercicios || []).length + " ejercicios · " + ui.n0(ses.volumen) + " kg" })]) : el("div.muted", { style: "margin-top:12px;font-size:13px", text: "Sin entrenamiento este día." })
    ]);
    ui.sheet(ui.fechaLarga(iso), body);
  }

  function registrarPeso() {
    var inp = el("input.input", { type: "text", inputmode: "decimal", placeholder: "Ej: 84.3" });
    var body = el("div", {}, [
      el("div.field", {}, [el("label", { text: "Peso de hoy (kg)" }), inp]),
      el("button.btn.btn-primary.btn-block", { style: "margin-top:14px", text: "Guardar", onclick: function () {
        var v = calc.num(inp.value, 0); if (v <= 0) { ui.toast("Peso inválido"); return; }
        store.setPesoDia(store.fechaHoy(), v); ui.toast("Peso guardado", "good"); sh.close(); GYM.refresh();
      } })
    ]);
    var sh = ui.sheet("Registrar peso", body);
  }

  function mini(k, v) { return el("div.panel", { style: "padding:11px" }, [el("div.stat", {}, [el("span.k", { text: k }), el("span.v.num", { text: v, style: "font-size:1.1rem" })])]); }
  function scale() { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M12 8v3M8.5 8.5 12 11l3.5-2.5"/></svg>'; }
})(typeof window !== "undefined" ? window : this);
