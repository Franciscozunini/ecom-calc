/* js/views-inicio.js — Dashboard diario */
(function (global) {
  "use strict";
  var GYM = global.GYM, ui = GYM.ui, el = ui.el, store = GYM.store, calc = GYM.calc;

  function pct(a, b) { return b > 0 ? Math.min(100, a / b * 100) : 0; }

  GYM.views.inicio = function () {
    var s = store.get();
    var hoy = store.fechaHoy();
    var g = s.objetivos;
    var m = store.macrosDia(hoy);
    var d = store.dia(hoy);
    var perfilVacio = !s.perfil.peso || !s.perfil.altura;

    var root = el("div");

    // Header
    root.appendChild(el("div.between", { style: "margin-bottom:6px" }, [
      el("div", {}, [
        el("div.eyebrow", { text: ui.fechaLarga(hoy) }),
        el("h1.view-title", { text: "Hoy" })
      ]),
      el("a.btn.btn-primary.btn-sm", { href: "#/comida", html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg> Comida' })
    ]));

    if (perfilVacio) {
      root.appendChild(el("a.panel", { href: "#/mas", style: "display:flex;gap:12px;align-items:center;margin-bottom:14px;border-color:var(--line-2)" }, [
        el("div.lrow-ic.ic", { class: "ic", html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5"/></svg>' }),
        el("div", { style: "flex:1" }, [el("div", { style: "font-weight:700", text: "Completá tu perfil" }), el("div.s.muted", { text: "Cargá peso y altura para calcular tus objetivos.", style: "font-size:12.5px" })]),
        el("span.accent", { text: "→", style: "font-size:20px" })
      ]));
    }

    // Hero: calorías
    var restante = Math.max(0, g.calorias - m.kcal);
    var hero = el("div.hero-stat", { style: "margin-bottom:14px" }, [el("div.glow")]);
    var heroRow = el("div.row", { style: "gap:20px;align-items:center" });
    heroRow.appendChild(ui.ring(pct(m.kcal, g.calorias), ui.n0(m.kcal), "de " + ui.n0(g.calorias) + " kcal", 140));
    heroRow.appendChild(el("div", { style: "flex:1;min-width:0" }, [
      el("div.eyebrow", { text: "Calorías de hoy" }),
      el("div", { style: "display:flex;align-items:baseline;gap:8px;margin:2px 0 10px" }, [
        el("span.num", { text: ui.n0(restante), style: "font-size:2rem;font-weight:800" }),
        el("span.muted", { text: m.kcal > g.calorias ? "pasado" : "te faltan", style: "font-size:13px" })
      ]),
      metricLine("Proteína", m.prot, g.proteina, "g", "good"),
      metricLine("Carbos", m.carb, g.carbos, "g"),
      metricLine("Grasa", m.grasa, g.grasas, "g", "warn")
    ]));
    hero.appendChild(heroRow);
    root.appendChild(hero);

    // Balance del día (déficit/superávit)
    root.appendChild(balanceCard(s, hoy, m, d));

    // Secundarias: agua / pasos / peso
    root.appendChild(el("div.grid.g3", {}, [
      miniStat("Agua", ui.n1(d.agua / 1000) + "L", pct(d.agua, g.agua), "#33d99b", "#/comida"),
      miniStat("Pasos", ui.n0(d.pasos), pct(d.pasos, g.pasos), "#ff5b2e", "#/comida"),
      pesoMini(s)
    ]));

    // Entrenamiento de hoy
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Entrenamiento" })]));
    var ses = s.sesiones.filter(function (x) { return x.fecha === hoy; })[0];
    if (ses) {
      root.appendChild(el("a.panel", { href: "#/progreso", style: "display:block" }, [
        el("div.between", {}, [
          el("div", {}, [
            el("div", { style: "font-weight:800;font-family:var(--disp)", text: ses.rutinaNombre || "Entrenamiento" }),
            el("div.muted", { text: (ses.ejercicios || []).length + " ejercicios · terminado ✓", style: "font-size:12.5px" })
          ]),
          el("div.stat", { style: "text-align:right" }, [el("span.k", { text: "Volumen" }), el("span.v.num", { text: ui.n0(ses.volumen) + " kg" })])
        ])
      ]));
    } else {
      var ult = ultimoEntreno(s);
      root.appendChild(el("div.panel", {}, [
        el("div.between", { style: "margin-bottom:12px" }, [
          el("div", {}, [
            el("div", { style: "font-weight:700", text: "Todavía no entrenaste hoy" }),
            el("div.muted", { text: ult ? "Última vez: " + ui.fechaCorta(ult.fecha) + " · " + (ult.rutinaNombre || "sesión") : "Registrá tu primera sesión.", style: "font-size:12.5px" })
          ])
        ]),
        el("a.btn.btn-primary.btn-block", { href: "#/entreno", text: "Empezar entreno" })
      ]));
    }

    // Ad slot (no interrumpe)
    root.appendChild(el("div.ad", { text: "Publicidad" }));

    // Accesos rápidos
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Registro rápido" })]));
    root.appendChild(el("div.grid.g2", {}, [
      quickAdd("+250 ml agua", "#33d99b", function () { store.addAgua(hoy, 250); ui.toast("+250 ml de agua", "good"); GYM.refresh(); }),
      quickAdd("Registrar peso", "#ff5b2e", function () { registrarPeso(hoy); })
    ]));

    return root;
  };

  function balanceCard(s, hoy, m, d) {
    var pf = s.perfil;
    var completo = pf.sexo && pf.peso && pf.altura && pf.edad;
    var bmr = completo ? calc.bmr(pf.sexo, calc.num(pf.peso), calc.num(pf.altura), calc.num(pf.edad)) : 0;
    var bal = calc.balanceDia({ bmr: bmr, pasos: d.pasos, peso: pf.peso, altura: pf.altura, entrenoKcal: store.entrenoKcalDia(hoy), cardioKcal: store.cardioKcalDia(hoy), comido: m.kcal });
    if (!bal) {
      return el("a.panel", { href: "#/mas", style: "display:block;margin-top:14px" }, [
        el("div", { style: "font-weight:700", text: "Balance del día" }),
        el("div.muted", { style: "font-size:12.5px", text: "Completá tu perfil (peso, altura, edad) para ver tu déficit estimado." })
      ]);
    }
    var deficit = bal.balance < 0;
    var estado = deficit ? "Déficit" : (bal.balance > 0 ? "Superávit" : "En equilibrio");
    var color = deficit ? "var(--good)" : (bal.balance > 0 ? "var(--accent-2)" : "var(--ink)");
    var card = el("div.panel", { style: "margin-top:14px" });
    card.appendChild(el("div.between", { style: "margin-bottom:8px" }, [
      el("div.eyebrow", { text: "Balance del día" }),
      el("span.muted", { style: "font-size:11.5px", text: "estimado" })
    ]));
    card.appendChild(el("div", { style: "display:flex;align-items:baseline;gap:8px" }, [
      el("span.num", { text: estado === "En equilibrio" ? estado : (estado + " de " + ui.n0(Math.abs(bal.balance)) + " kcal"), style: "font-size:1.7rem;font-weight:800;color:" + color })
    ]));
    card.appendChild(el("div.muted", { style: "font-size:12.5px;margin-top:4px", html: "Gasto estimado <b class='num' style='color:var(--ink)'>" + ui.n0(bal.gasto) + "</b> · comiste <b class='num' style='color:var(--ink)'>" + ui.n0(bal.comido) + "</b> kcal" }));
    // desglose del gasto
    card.appendChild(el("div.wrap-gap", { style: "margin-top:10px" }, [
      chip("Base " + ui.n0(bal.base)), chip("Pasos " + ui.n0(bal.pasosKcal)),
      chip("Entreno " + ui.n0(bal.entrenoKcal)), chip("Cardio " + ui.n0(bal.cardioKcal))
    ]));
    card.appendChild(el("details.calc-detail", { style: "margin-top:12px;border:0;background:transparent" }, [
      el("summary", { style: "padding:6px 0;background:transparent;color:var(--ink-mute);font-size:12px", text: "¿Cómo se calcula?" }),
      el("div.muted", { style: "font-size:12px;line-height:1.5;padding:4px 0", text: "Gasto = metabolismo base (×1,2) + calorías de tus pasos, entreno y cardio. Balance = lo que comiste menos ese gasto. Todo es una estimación con fórmulas estándar (MET); los primeros ~4.000 pasos ya están en el gasto base." })
    ]));
    return card;
  }
  function chip(t) { return el("span.chip", { text: t }); }

  function metricLine(lab, val, goal, unit, tone) {
    return el("div", { style: "margin-bottom:8px" }, [
      el("div.between", { style: "margin-bottom:3px" }, [
        el("span", { text: lab, style: "font-size:12.5px;color:var(--ink-soft);font-weight:600" }),
        el("span.num", { html: '<b style="color:var(--ink)">' + ui.n0(val) + '</b><span style="color:var(--ink-mute)"> / ' + ui.n0(goal) + ' ' + unit + '</span>', style: "font-size:12.5px" })
      ]),
      ui.bar(goal > 0 ? val / goal * 100 : 0, tone)
    ]);
  }
  function miniStat(lab, val, p, color, href) {
    return el("a.panel", { href: href, style: "display:block" }, [
      el("div.stat", {}, [el("span.k", { text: lab }), el("span.v.num", { text: val })]),
      el("div", { style: "margin-top:8px" }, [barColor(p, color)])
    ]);
  }
  function barColor(p, color) {
    var b = el("div.bar"); b.appendChild(el("span", { style: "width:" + Math.max(0, Math.min(100, p)) + "%;background:" + color })); return b;
  }
  function pesoMini(s) {
    var st = store.statsPeso(s.objetivos.pesoObjetivo);
    return el("a.panel", { href: "#/progreso", style: "display:block" }, [
      el("div.stat", {}, [el("span.k", { text: "Peso" }), el("span.v.num", { text: st ? ui.n1(st.actual) + " kg" : "—" })]),
      el("div.muted", { style: "font-size:12px;margin-top:8px", text: st ? (st.cambio === 0 ? "sin cambios" : (st.cambio > 0 ? "+" : "") + ui.n1(st.cambio) + " kg total") : "sin registros" })
    ]);
  }
  function quickAdd(txt, color, fn) {
    return el("button.panel", { style: "display:flex;gap:10px;align-items:center;text-align:left;cursor:pointer", onclick: fn }, [
      el("span", { style: "width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:" + color + "22;color:" + color, html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>' }),
      el("span", { style: "font-weight:700;font-size:13.5px", text: txt })
    ]);
  }
  function ultimoEntreno(s) { var ss = s.sesiones.slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; }); return ss[0] || null; }

  function registrarPeso(hoy) {
    var d = store.dia(hoy);
    var inp = el("input.input", { type: "text", inputmode: "decimal", placeholder: "Ej: 84.5", value: d.peso || "" });
    var body = el("div", {}, [
      el("div.field", {}, [el("label", { text: "Peso de hoy (kg)" }), inp]),
      el("button.btn.btn-primary.btn-block", { style: "margin-top:14px", text: "Guardar", onclick: function () {
        var v = calc.num(inp.value, 0);
        if (v <= 0) { ui.toast("Ingresá un peso válido"); return; }
        store.setPesoDia(hoy, v); ui.toast("Peso guardado", "good"); s.close(); GYM.refresh();
      } })
    ]);
    var s = ui.sheet("Registrar peso", body);
  }
})(typeof window !== "undefined" ? window : this);
