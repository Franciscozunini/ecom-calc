/* =============================================================================
 * js/app.js — Shell + router (hash) de GymBox. Registra nav y monta vistas.
 * ============================================================================= */
(function (global) {
  "use strict";
  var GYM = global.GYM = global.GYM || {};
  var ui = GYM.ui, el = ui.el;
  GYM.views = GYM.views || {};

  var ICON = {
    inicio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    entreno: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5 17.5 17.5"/><path d="M4 8l-1 1 3 3M20 16l1-1-3-3"/><rect x="2" y="9" width="4" height="6" rx="1"/><rect x="18" y="9" width="4" height="6" rx="1"/></svg>',
    comida: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-1.5 0-3 1.5-3 5s1.5 4 3 4 3-1 3-4-1.5-5-3-5zM17 12v9"/></svg>',
    progreso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M6 14l4-4 3 3 5-6"/></svg>',
    mas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
  };
  var NAV = [
    { id: "inicio", label: "Inicio", route: "#/inicio" },
    { id: "entreno", label: "Entreno", route: "#/entreno" },
    { id: "comida", label: "Comida", route: "#/comida" },
    { id: "progreso", label: "Progreso", route: "#/progreso" },
    { id: "mas", label: "Más", route: "#/mas" }
  ];

  function brand(size) {
    return el("a.brand", { href: "index.html", "aria-label": "GymBox" }, [
      el("span.brand-mark", { html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="9" width="3.5" height="6" rx="1"/><rect x="18.5" y="9" width="3.5" height="6" rx="1"/><path d="M5.5 12h13"/></svg>' }),
      el("span.brand-name", { html: 'Gym<b>Box</b>' })
    ]);
  }

  function topRoute() {
    var h = location.hash.replace(/^#\//, "");
    return h.split("/")[0] || "inicio";
  }

  function renderShell() {
    var side = el("aside.sidebar", {}, [
      brand(),
      el("nav.side-nav", {}, NAV.map(function (n) {
        return el("a.side-link", { href: n.route, dataset: { nav: n.id } }, [
          el("span", { html: ICON[n.id] }), n.label
        ]);
      })),
      el("div.side-foot", {}, [
        el("a.side-link", { href: "#/mas", dataset: { nav: "mas" } }, [
          el("span", { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5"/></svg>' }),
          "Perfil y datos"
        ])
      ])
    ]);

    var top = el("header.topbar", {}, [
      brand(),
      el("a.btn.btn-ghost.btn-sm", { href: "#/mas", text: "Perfil" })
    ]);

    var main = el("main.main", {}, [el("div.wrap#view")]);

    var tabs = el("nav.tabbar", {}, NAV.map(function (n) {
      return el("a.tab", { href: n.route, dataset: { nav: n.id } }, [el("span", { html: ICON[n.id] }), n.label]);
    }));

    document.body.appendChild(el("div.app", {}, [side, top, main, tabs]));
  }

  function setActiveNav() {
    var t = topRoute();
    ui.$$("[data-nav]").forEach(function (a) {
      a.classList.toggle("active", a.dataset.nav === t);
    });
  }

  function parseRoute() {
    var h = location.hash.replace(/^#\//, "");
    var parts = h.split("/").filter(Boolean);
    return { top: parts[0] || "inicio", parts: parts };
  }

  function router() {
    var r = parseRoute();
    var view = ui.$("#view");
    if (!view) return;
    var fn = GYM.views[r.top] || GYM.views.inicio;
    view.innerHTML = "";
    try {
      var node = fn(r.parts.slice(1), r);
      if (node) view.appendChild(node);
    } catch (e) {
      view.appendChild(el("div.empty", {}, [el("h3", { text: "Ups, algo falló" }), el("p", { text: String(e && e.message || e) })]));
      if (global.console) console.error(e);
    }
    setActiveNav();
    window.scrollTo(0, 0);
  }

  function boot() {
    if (!GYM.store) { document.body.textContent = "Error al cargar."; return; }
    GYM.store.load();
    renderShell();
    if (!location.hash) location.replace("#/inicio");
    window.addEventListener("hashchange", router);
    router();
  }
  GYM.go = function (route) { location.hash = route; };
  GYM.refresh = router;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : this);
