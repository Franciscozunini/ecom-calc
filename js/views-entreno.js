/* js/views-entreno.js — Rutinas, sesión en vivo, historial, timer, discos */
(function (global) {
  "use strict";
  var GYM = global.GYM, ui = GYM.ui, el = ui.el, store = GYM.store, calc = GYM.calc;

  /* ---------- Draft de sesión activa (persistido) ---------- */
  var DKEY = "gymbox.draft.v1";
  var draft = {
    get: function () { try { return JSON.parse(localStorage.getItem(DKEY) || "null"); } catch (_) { return null; } },
    set: function (d) { try { localStorage.setItem(DKEY, JSON.stringify(d)); } catch (_) {} },
    clear: function () { try { localStorage.removeItem(DKEY); } catch (_) {} }
  };

  /* ========================================================= HUB */
  GYM.views.entreno = function (parts) {
    if (parts[0] === "sesion") return sesionView();
    if (parts[0] === "rutina") return rutinaEditor(parts[1]);

    var s = store.get();
    var root = el("div");
    root.appendChild(el("div.between", {}, [
      el("div", {}, [el("h1.view-title", { text: "Entreno" }), el("div.view-sub", { text: "Registrá cada serie y cada kilo." })])
    ]));

    var d = draft.get();
    if (d) {
      root.appendChild(el("a.pr", { href: "#/entreno/sesion", style: "display:block;margin:14px 0" }, [
        el("div.tag", { text: "SESIÓN EN CURSO" }),
        el("div.between", { style: "margin-top:4px" }, [
          el("div", { style: "font-family:var(--disp);font-weight:800;font-size:1.1rem", text: d.rutinaNombre || "Entrenamiento libre" }),
          el("span.btn.btn-primary.btn-sm", { text: "Continuar →" })
        ])
      ]));
    }

    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Empezar ahora" })]));
    var quick = el("div.grid.g2", {}, [
      el("button.btn.btn-primary.btn-lg", { text: "Entreno libre", onclick: function () { iniciarSesion(null); } }),
      el("button.btn.btn-ghost.btn-lg", { text: "Calculadora de discos", onclick: discosSheet })
    ]);
    root.appendChild(quick);

    // Rutinas
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Mis rutinas" }), el("button.btn.btn-quiet.btn-sm", { text: "+ Nueva", onclick: nuevaRutina })]));
    if (!s.rutinas.length) {
      root.appendChild(el("div.empty", {}, [
        el("div.ic", { html: dumbbell() }),
        el("h3", { text: "Sin rutinas todavía" }),
        el("p", { text: "Creá tus rutinas (Push, Pull, Legs…) para empezar cada entreno con un toque." }),
        el("button.btn.btn-primary", { text: "Crear rutina", onclick: nuevaRutina })
      ]));
    } else {
      var list = el("div.list.panel");
      s.rutinas.forEach(function (r) {
        list.appendChild(el("div.lrow", {}, [
          el("div.ic", { html: dumbbell() }),
          el("div.main.tap", { onclick: function () { iniciarSesion(r.id); } }, [
            el("div.t", { text: r.nombre }),
            el("div.s", { text: (r.ejercicios || []).length + " ejercicios" })
          ]),
          el("button.btn.btn-ghost.btn-sm", { text: "Empezar", onclick: function () { iniciarSesion(r.id); } }),
          el("button.icon-btn", { title: "Editar", html: gear(), onclick: function () { GYM.go("#/entreno/rutina/" + r.id); } })
        ]));
      });
      root.appendChild(list);
    }

    // Recientes
    if (s.sesiones.length) {
      root.appendChild(el("div.section-h", {}, [el("h2", { text: "Sesiones recientes" })]));
      var rec = el("div.list.panel");
      s.sesiones.slice().reverse().slice(0, 6).forEach(function (ses) {
        rec.appendChild(el("div.lrow", {}, [
          el("div.main", {}, [el("div.t", { text: ses.rutinaNombre || "Entrenamiento" }), el("div.s", { text: ui.fechaLarga(ses.fecha) })]),
          el("div.end", {}, [ui.n0(ses.volumen) + " kg", el("div.s.muted", { text: (ses.ejercicios || []).length + " ejerc.", style: "font-weight:600" })])
        ]));
      });
      root.appendChild(rec);
    }
    return root;
  };

  function iniciarSesion(rutinaId) {
    var r = rutinaId ? store.rutina(rutinaId) : null;
    var d = {
      fecha: store.fechaHoy(), rutinaId: rutinaId || null,
      rutinaNombre: r ? r.nombre : "Entreno libre",
      ejercicios: (r ? r.ejercicios : []).map(function (e) { return { nombre: e.nombre, sets: [] }; })
    };
    draft.set(d);
    GYM.go("#/entreno/sesion");
  }

  /* ========================================================= SESIÓN EN VIVO */
  function sesionView() {
    var d = draft.get();
    if (!d) { GYM.go("#/entreno"); return el("div"); }

    var root = el("div");
    root.appendChild(el("div.between", { style: "position:sticky;top:0;z-index:5;padding:6px 0;background:var(--bg)" }, [
      el("div", {}, [el("div.eyebrow", { text: "Sesión en curso" }), el("h1.view-title", { text: d.rutinaNombre })]),
      el("button.btn.btn-primary", { text: "Terminar", onclick: function () { terminar(d); } })
    ]));

    // Volumen total en vivo
    var volTotal = 0;
    d.ejercicios.forEach(function (e) { volTotal += calc.volumenSesion(e.sets); });
    root.appendChild(el("div.panel", { style: "margin:12px 0;display:flex;justify-content:space-between;align-items:center" }, [
      el("div.stat", {}, [el("span.k", { text: "Volumen total" }), el("span.v.num", { text: ui.n0(volTotal) + " kg" })]),
      el("button.btn.btn-ghost.btn-sm", { html: clockIcon() + " Descanso", onclick: function () { timerSheet(); } })
    ]));

    d.ejercicios.forEach(function (ej, ei) { root.appendChild(ejercicioCard(d, ei)); });

    root.appendChild(el("button.fab-add", { text: "+ Agregar ejercicio", style: "margin-top:12px", onclick: function () { agregarEjercicio(d); } }));
    root.appendChild(el("button.btn.btn-quiet.btn-block", { text: "Descartar sesión", style: "margin-top:16px", onclick: function () {
      ui.confirmar("¿Descartar esta sesión sin guardar?", function () { draft.clear(); GYM.go("#/entreno"); }, { danger: true, ok: "Descartar" });
    } }));
    return root;
  }

  function ejercicioCard(d, ei) {
    var ej = d.ejercicios[ei];
    var ult = store.ultimaVez(ej.nombre);
    var card = el("div.panel", { style: "margin-bottom:12px" });
    card.appendChild(el("div.between", {}, [
      el("div", { style: "min-width:0" }, [
        el("div", { style: "font-family:var(--disp);font-weight:800;font-size:1.05rem;overflow:hidden;text-overflow:ellipsis", text: ej.nombre }),
        ult ? el("div.muted", { style: "font-size:12px", text: "Última vez: " + topSetTxt(ult.sets) }) : el("div.muted", { style: "font-size:12px", text: "Primera vez con este ejercicio" })
      ]),
      el("button.icon-btn", { html: trash(), title: "Quitar", onclick: function () { d.ejercicios.splice(ei, 1); draft.set(d); GYM.refresh(); } })
    ]));

    if (ej.sets.length) {
      var head = el("div.setline", {}, [el("span.n.head", { text: "#" }), el("span.head", { text: "KG", style: "text-align:center" }), el("span.head", { text: "REPS", style: "text-align:center" }), el("span")]);
      card.appendChild(head);
    }
    ej.sets.forEach(function (st, si) {
      var kgI = el("input.input", { type: "text", inputmode: "decimal", value: st.kg != null ? st.kg : "", placeholder: "0",
        oninput: function () { st.kg = calc.num(kgI.value, 0); draft.set(d); } });
      var rI = el("input.input", { type: "text", inputmode: "numeric", value: st.reps != null ? st.reps : "", placeholder: "0",
        oninput: function () { st.reps = calc.num(rI.value, 0); draft.set(d); } });
      card.appendChild(el("div.setline", {}, [
        el("span.n", { text: (si + 1) }), kgI, rI,
        el("button.icon-btn.rm", { html: minusC(), title: "Quitar serie", onclick: function () { ej.sets.splice(si, 1); draft.set(d); GYM.refresh(); } })
      ]));
    });

    card.appendChild(el("button.fab-add", { text: "+ Agregar serie", style: "margin-top:8px", onclick: function () {
      var last = ej.sets[ej.sets.length - 1];
      ej.sets.push(last ? { kg: last.kg, reps: last.reps } : { kg: "", reps: "" });
      draft.set(d); GYM.refresh();
    } }));
    return card;
  }

  function agregarEjercicio(d) {
    var nombres = store.nombresEjercicios();
    var inp = el("input.input", { type: "text", placeholder: "Ej: Press banca", list: "ej-datalist", autocomplete: "off" });
    var dl = el("datalist#ej-datalist", {}, nombres.map(function (n) { return el("option", { value: n }); }));
    var body = el("div", {}, [
      el("div.field", {}, [el("label", { text: "Nombre del ejercicio" }), inp, dl]),
      el("button.btn.btn-primary.btn-block", { style: "margin-top:14px", text: "Agregar", onclick: function () {
        var nom = inp.value.trim();
        if (!nom) { ui.toast("Escribí un nombre"); return; }
        d.ejercicios.push({ nombre: nom, sets: [{ kg: "", reps: "" }] });
        draft.set(d); sh.close(); GYM.refresh();
      } })
    ]);
    var sh = ui.sheet("Agregar ejercicio", body);
  }

  function terminar(d) {
    var conSets = d.ejercicios.filter(function (e) { return (e.sets || []).some(function (s) { return calc.num(s.kg, 0) > 0 && calc.num(s.reps, 0) > 0; }); });
    if (!conSets.length) { ui.toast("Cargá al menos una serie con kg y reps"); return; }
    // limpiar sets vacíos
    var limpio = conSets.map(function (e) {
      return { nombre: e.nombre, sets: e.sets.filter(function (s) { return calc.num(s.kg, 0) > 0 && calc.num(s.reps, 0) > 0; }).map(function (s) { return { kg: calc.num(s.kg, 0), reps: calc.num(s.reps, 0) }; }) };
    });
    // PRs (comparar con historial ANTES de guardar)
    var prs = [];
    limpio.forEach(function (e) {
      var hist = store.historialEjercicio(e.nombre);
      var p = calc.detectarPRs(hist, { sets: e.sets });
      p.forEach(function (x) { x.ejercicio = e.nombre; prs.push(x); });
    });
    var ses = store.guardarSesion({ fecha: d.fecha, rutinaId: d.rutinaId, rutinaNombre: d.rutinaNombre, ejercicios: limpio });
    draft.clear();
    resumen(ses, prs);
  }

  function resumen(ses, prs) {
    var body = el("div");
    body.appendChild(el("div", { style: "text-align:center;margin-bottom:14px" }, [
      el("div", { style: "font-size:2.6rem", text: "💪" }),
      el("div", { style: "font-family:var(--disp);font-weight:800;font-size:1.3rem", text: "¡Entrenamiento terminado!" }),
      el("div.muted", { text: (ses.ejercicios || []).length + " ejercicios · " + ui.n0(ses.volumen) + " kg de volumen" })
    ]));
    if (prs.length) {
      prs.forEach(function (p) {
        body.appendChild(el("div.pr", { style: "margin-bottom:10px" }, [
          el("div.tag", { text: "🔥 NUEVO PR — " + (p.tipo === "rm" ? "1RM ESTIMADO" : "PESO MÁXIMO") }),
          el("div", { style: "font-weight:700;font-size:.95rem;margin:2px 0", text: p.ejercicio }),
          el("div.v.num", { text: p.tipo === "rm" ? ui.n1(p.valor) + " kg" : ui.n1(p.kg) + " kg × " + p.reps })
        ]));
      });
    }
    body.appendChild(el("button.btn.btn-primary.btn-block", { style: "margin-top:12px", text: "Listo", onclick: function () { sh.close(); GYM.go("#/inicio"); } }));
    var sh = ui.sheet(null, body);
  }

  function topSetTxt(sets) {
    var top = sets.slice().sort(function (a, b) { return b.kg - a.kg || b.reps - a.reps; })[0];
    return top ? ui.n1(top.kg) + " kg × " + top.reps : "—";
  }

  /* ========================================================= EDITOR DE RUTINA */
  function nuevaRutina() {
    var inp = el("input.input", { placeholder: "Ej: Push (pecho, hombro, tríceps)" });
    var chips = ["Push", "Pull", "Legs", "Torso", "Full Body", "Espalda + bíceps"];
    var body = el("div", {}, [
      el("div.field", {}, [el("label", { text: "Nombre de la rutina" }), inp]),
      el("div.wrap-gap", { style: "margin-top:10px" }, chips.map(function (c) { return el("button.chip", { text: c, onclick: function () { inp.value = c; } }); })),
      el("button.btn.btn-primary.btn-block", { style: "margin-top:16px", text: "Crear", onclick: function () {
        var nom = inp.value.trim(); if (!nom) { ui.toast("Escribí un nombre"); return; }
        var r = store.addRutina({ nombre: nom, ejercicios: [] });
        sh.close(); GYM.go("#/entreno/rutina/" + r.id);
      } })
    ]);
    var sh = ui.sheet("Nueva rutina", body);
  }

  function rutinaEditor(id) {
    var r = store.rutina(id);
    if (!r) { GYM.go("#/entreno"); return el("div"); }
    var root = el("div");
    root.appendChild(el("div.between", {}, [
      el("a.btn.btn-quiet.btn-sm", { href: "#/entreno", text: "← Volver" }),
      el("button.btn.btn-danger.btn-sm", { text: "Eliminar", onclick: function () { ui.confirmar("¿Eliminar la rutina «" + r.nombre + "»?", function () { store.removeRutina(id); GYM.go("#/entreno"); }, { danger: true, ok: "Eliminar" }); } })
    ]));
    root.appendChild(el("h1.view-title", { text: r.nombre, style: "margin:10px 0 4px" }));
    root.appendChild(el("div.view-sub", { text: "Agregá los ejercicios de esta rutina." }));

    var list = el("div", { style: "margin-top:14px" });
    function pintar() {
      list.innerHTML = "";
      if (!r.ejercicios.length) list.appendChild(el("div.empty", {}, [el("p", { text: "Sin ejercicios. Agregá el primero." })]));
      r.ejercicios.forEach(function (e, i) {
        list.appendChild(el("div.lrow.panel", { style: "margin-bottom:8px;padding:12px 14px" }, [
          el("div.ic", { html: dumbbell() }),
          el("div.main", {}, [el("div.t", { text: e.nombre }), el("div.s", { text: (e.seriesObj || "?") + " series × " + (e.repsObj || "?") + " reps" + (e.descanso ? " · " + e.descanso + "s" : "") })]),
          el("button.icon-btn", { html: trash(), onclick: function () { r.ejercicios.splice(i, 1); store.updateRutina(id, {}); pintar(); } })
        ]));
      });
    }
    pintar();
    root.appendChild(list);
    root.appendChild(el("button.fab-add", { text: "+ Agregar ejercicio", style: "margin-top:8px", onclick: function () {
      var nom = el("input.input", { placeholder: "Ej: Press banca" });
      var ser = el("input.input", { type: "text", inputmode: "numeric", placeholder: "3" });
      var rep = el("input.input", { type: "text", inputmode: "numeric", placeholder: "8" });
      var des = el("input.input", { type: "text", inputmode: "numeric", placeholder: "90" });
      var body = el("div", {}, [
        el("div.field", {}, [el("label", { text: "Ejercicio" }), nom]),
        el("div.grid.g3", { style: "margin-top:10px" }, [
          el("div.field", {}, [el("label", { text: "Series" }), ser]),
          el("div.field", {}, [el("label", { text: "Reps" }), rep]),
          el("div.field", {}, [el("label", { text: "Descanso s" }), des])
        ]),
        el("button.btn.btn-primary.btn-block", { style: "margin-top:14px", text: "Agregar", onclick: function () {
          if (!nom.value.trim()) { ui.toast("Escribí el ejercicio"); return; }
          r.ejercicios.push({ nombre: nom.value.trim(), seriesObj: calc.num(ser.value, 0) || "", repsObj: calc.num(rep.value, 0) || "", descanso: calc.num(des.value, 0) || "" });
          store.updateRutina(id, {}); sh.close(); pintar();
        } })
      ]);
      var sh = ui.sheet("Agregar ejercicio", body);
    } }));
    root.appendChild(el("button.btn.btn-primary.btn-block", { style: "margin-top:16px", text: "Empezar esta rutina", onclick: function () { iniciarSesion(id); } }));
    return root;
  }

  /* ========================================================= HISTORIAL POR EJERCICIO */
  GYM.views.ejercicio = function (parts) {
    var nombre = decodeURIComponent(parts[0] || "");
    var hist = store.historialEjercicio(nombre);
    var root = el("div");
    root.appendChild(el("a.btn.btn-quiet.btn-sm", { href: "#/progreso", text: "← Volver" }));
    root.appendChild(el("h1.view-title", { text: nombre, style: "margin:10px 0 4px" }));
    if (!hist.length) { root.appendChild(el("div.empty", {}, [el("p", { text: "Sin registros de este ejercicio todavía." })])); return root; }

    var best = calc.mejores(hist);
    root.appendChild(el("div.grid.g4", { style: "margin:14px 0" }, [
      st("Mejor peso", ui.n1(best.peso) + " kg"),
      st("Mejores reps", best.reps),
      st("Mejor volumen", ui.n0(best.volumen) + " kg"),
      st("1RM estimado", ui.n1(best.rm) + " kg")
    ]));

    // Gráfico de 1RM estimado por sesión
    var puntos = hist.map(function (h) {
      var rm = 0; h.sets.forEach(function (s) { rm = Math.max(rm, calc.oneRM(s.kg, s.reps)); });
      return { x: h.fecha, y: rm };
    });
    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Fuerza (1RM estimado)" })]));
    root.appendChild(el("div.panel", {}, [ui.lineChart(puntos, { vacio: "Necesitás al menos 2 sesiones." })]));

    root.appendChild(el("div.section-h", {}, [el("h2", { text: "Historial" })]));
    var list = el("div");
    hist.slice().reverse().forEach(function (h) {
      var sets = h.sets.map(function (s) { return el("div.between", { style: "padding:3px 0" }, [el("span.muted", { text: ui.n1(s.kg) + " kg × " + s.reps }), el("span.mono.muted", { style: "font-size:12px", text: ui.n0(s.kg * s.reps) + " kg" })]); });
      list.appendChild(el("div.panel", { style: "margin-bottom:8px" }, [el("div", { style: "font-weight:700;margin-bottom:6px", text: ui.fechaLarga(h.fecha) })].concat(sets)));
    });
    root.appendChild(list);
    return root;
  };

  /* ========================================================= TIMER */
  function timerSheet() {
    var secs = 90, running = null, remaining = 90;
    var clock = el("div.clock.num", { text: fmt(remaining) });
    var presets = el("div.wrap-gap", { style: "justify-content:center;margin:12px 0" },
      [30, 60, 90, 120, 180, 300].map(function (p) { return el("button.chip", { text: p < 60 ? p + "s" : (p / 60) + "min", onclick: function () { secs = p; remaining = p; render(); if (!running) start(); } }); }));
    var body = el("div.timer", {}, [
      el("div.lab", { text: "Descanso" }), clock, presets,
      el("div.grid.g3", { style: "margin-top:8px" }, [
        el("button.btn.btn-ghost", { text: "−30", onclick: function () { remaining = Math.max(0, remaining - 30); render(); } }),
        el("button.btn.btn-primary#tbtn", { text: "Pausar", onclick: toggle }),
        el("button.btn.btn-ghost", { text: "+30", onclick: function () { remaining += 30; render(); } })
      ])
    ]);
    function fmt(s) { var m = Math.floor(s / 60); return m + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
    function render() { clock.textContent = fmt(remaining); clock.classList.toggle("warn", remaining <= 10 && remaining > 0); }
    function tick() { remaining--; render(); if (remaining <= 0) { stop(); beep(); ui.toast("Descanso terminado", "good"); } }
    function start() { running = setInterval(tick, 1000); var b = ui.$("#tbtn", body); if (b) b.textContent = "Pausar"; }
    function stop() { clearInterval(running); running = null; var b = ui.$("#tbtn", body); if (b) b.textContent = "Reanudar"; }
    function toggle() { running ? stop() : start(); }
    var sh = ui.sheet(null, body);
    var origClose = sh.close;
    sh.close = function () { stop(); origClose(); };
    var scrim = sh.el.parentNode;
    scrim.addEventListener("click", function (e) { if (e.target === scrim) stop(); });
    render(); start();
  }
  function beep() {
    try { var Ctx = global.AudioContext || global.webkitAudioContext; if (!Ctx) return; var ctx = new Ctx();
      var o = ctx.createOscillator(), gn = ctx.createGain(); o.frequency.value = 880; o.connect(gn); gn.connect(ctx.destination);
      gn.gain.setValueAtTime(.2, ctx.currentTime); o.start(); o.stop(ctx.currentTime + .18);
      gn.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .18);
    } catch (_) {}
  }

  /* ========================================================= DISCOS (sheet) */
  function discosSheet() {
    var obj = el("input.input", { type: "text", inputmode: "decimal", placeholder: "100" });
    var barra = el("input.input", { type: "text", inputmode: "decimal", value: "20" });
    var out = el("div", { style: "margin-top:14px" });
    function calcular() {
      var r = calc.discos(calc.num(obj.value, 0), calc.num(barra.value, 20), [25, 20, 15, 10, 5, 2.5, 1.25]);
      out.innerHTML = "";
      if (!r.ok) { out.appendChild(el("div.disclaimer", { text: r.motivo })); return; }
      var col = { 25: "#ff5b2e", 20: "#3aa0ff", 15: "#f4b740", 10: "#34d99b", 5: "#c084fc", 2.5: "#e5e7eb", 1.25: "#9aa1ac" };
      out.appendChild(el("div.muted", { style: "text-align:center;font-size:12.5px", text: "Por cada lado:" }));
      var plates = el("div.plates", {}, r.porLado.map(function (p) {
        var h = 34 + p * 1.6;
        return el("div.plate", { style: "height:" + Math.min(90, h) + "px;background:" + (col[p] || "#888"), text: p });
      }));
      if (!r.porLado.length) plates.appendChild(el("div.muted", { text: "Solo la barra" }));
      out.appendChild(plates);
      out.appendChild(el("div", { style: "text-align:center;font-family:var(--disp);font-weight:700;margin-top:8px", text: r.porLado.join(" + ") + (r.porLado.length ? " kg por lado" : "") }));
      if (r.resto > 0) out.appendChild(el("div.muted", { style: "text-align:center;font-size:12px", text: "No exacto: sobran " + ui.n1(r.resto) + " kg. Peso real ≈ " + ui.n1(r.pesoReal) + " kg." }));
    }
    obj.addEventListener("input", calcular); barra.addEventListener("input", calcular);
    var body = el("div", {}, [
      el("div.grid.g2", {}, [
        el("div.field", {}, [el("label", { text: "Peso objetivo (kg)" }), obj]),
        el("div.field", {}, [el("label", { text: "Barra (kg)" }), barra])
      ]),
      out
    ]);
    ui.sheet("Calculadora de discos", body);
  }

  /* ---- iconos ---- */
  function dumbbell() { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="9" width="3.5" height="6" rx="1"/><rect x="18.5" y="9" width="3.5" height="6" rx="1"/><path d="M5.5 12h13"/></svg>'; }
  function gear() { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>'; }
  function trash() { return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>'; }
  function minusC() { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>'; }
  function clockIcon() { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'; }
  function st(k, v) { return el("div.panel", { style: "padding:12px" }, [el("div.stat", {}, [el("span.k", { text: k }), el("span.v.num", { text: v })])]); }
})(typeof window !== "undefined" ? window : this);
