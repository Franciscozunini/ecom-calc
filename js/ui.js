/* =============================================================================
 * js/ui.js — Helpers de interfaz (DOM seguro, formato, modal, toast, gráficos).
 * Sin dependencias. Todo lo que renderiza texto del usuario pasa por escape (XSS).
 * ============================================================================= */
(function (global) {
  "use strict";
  var GYM = global.GYM = global.GYM || {};
  GYM.views = GYM.views || {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var $ = function (s, sc) { return (sc || document).querySelector(s); };
  var $$ = function (s, sc) { return Array.prototype.slice.call((sc || document).querySelectorAll(s)); };

  // el("div.clase#id", {attrs}, [hijos|texto])
  function el(sel, attrs, kids) {
    var tagm = sel.match(/^[a-z0-9]+/i);
    var tag = tagm ? tagm[0] : "div";
    var node = document.createElement(tag);
    var idm = sel.match(/#([\w-]+)/);
    if (idm) node.id = idm[1];
    var cls = (sel.match(/\.[\w-]+/g) || []).map(function (c) { return c.slice(1); });
    if (cls.length) node.className = cls.join(" ");
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k === "on" && typeof v === "object") Object.keys(v).forEach(function (ev) { node.addEventListener(ev, v[ev]); });
      else if (k.indexOf("on") === 0 && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (k === "dataset") Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else node.setAttribute(k, v);
    });
    (kids == null ? [] : [].concat(kids)).forEach(function (k) {
      if (k == null || k === false) return;
      node.appendChild(typeof k === "string" || typeof k === "number" ? document.createTextNode(String(k)) : k);
    });
    return node;
  }

  /* ---- Formato ---- */
  function n0(x) { try { return new Intl.NumberFormat("es-AR").format(Math.round(x || 0)); } catch (_) { return String(Math.round(x || 0)); } }
  function n1(x) { var v = Math.round((x || 0) * 10) / 10; try { return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(v); } catch (_) { return String(v); } }
  function kg(x) { return n1(x) + " kg"; }
  function fechaCorta(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    return p[2] + "/" + p[1];
  }
  function fechaLarga(iso) {
    try { var d = new Date(iso + "T12:00:00"); return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }); }
    catch (_) { return iso; }
  }

  /* ---- Toast ---- */
  function toast(msg, tipo) {
    var wrap = $("#toast-wrap");
    if (!wrap) { wrap = el("div.toast-wrap#toast-wrap"); document.body.appendChild(wrap); }
    var t = el("div.toast" + (tipo ? "." + tipo : ""), { text: msg });
    wrap.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(function () { t.remove(); }, 320); }, 2200);
  }

  /* ---- Modal / sheet ---- */
  function sheet(titulo, contenido, opts) {
    opts = opts || {};
    var scrim = el("div.scrim");
    var box = el("div.sheet", { role: "dialog", "aria-modal": "true" });
    box.appendChild(el("div.handle"));
    if (titulo) box.appendChild(el("h3", { text: titulo }));
    if (opts.sub) box.appendChild(el("p.muted", { text: opts.sub, style: "font-size:13px;margin-bottom:12px" }));
    var body = el("div", { style: "margin-top:10px" });
    if (typeof contenido === "string") body.innerHTML = contenido; else body.appendChild(contenido);
    box.appendChild(body);
    scrim.appendChild(box);
    function close() { scrim.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    scrim.addEventListener("click", function (e) { if (e.target === scrim) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(scrim);
    var first = box.querySelector("input,select,textarea,button");
    if (first) setTimeout(function () { first.focus(); }, 60);
    return { el: box, close: close };
  }

  function confirmar(msg, onOk, opts) {
    opts = opts || {};
    var c = el("div", {}, [
      el("p.soft", { text: msg, style: "margin-bottom:16px" }),
      el("div.row", { style: "gap:8px" }, [
        el("button.btn.btn-ghost.btn-block", { text: "Cancelar", onclick: function () { s.close(); } }),
        el("button.btn." + (opts.danger ? "btn-danger" : "btn-primary") + ".btn-block", { text: opts.ok || "Confirmar", onclick: function () { s.close(); onOk(); } })
      ])
    ]);
    var s = sheet(opts.titulo || "¿Confirmás?", c);
    return s;
  }

  /* ---- Ring SVG ---- */
  function ring(pct, big, lab, sz) {
    pct = Math.max(0, Math.min(100, pct || 0));
    sz = sz || 132;
    var r = (sz / 2) - 10, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    var wrap = el("div.ring", { style: "--sz:" + sz + "px" });
    wrap.innerHTML =
      '<svg viewBox="0 0 ' + sz + ' ' + sz + '">' +
      '<circle class="bg" cx="' + sz / 2 + '" cy="' + sz / 2 + '" r="' + r + '" fill="none" stroke-width="10"/>' +
      '<circle class="fg" cx="' + sz / 2 + '" cy="' + sz / 2 + '" r="' + r + '" fill="none" stroke-width="10" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg><div class="center"><div class="big num">' + esc(big) + '</div><div class="lab">' + esc(lab) + '</div></div>';
    return wrap;
  }

  /* ---- Bar ---- */
  function bar(pct, tone) {
    var b = el("div.bar" + (tone ? "." + tone : ""));
    b.appendChild(el("span", { style: "width:" + Math.max(0, Math.min(100, pct || 0)) + "%" }));
    return b;
  }

  /* ---- Line chart (SVG) ---- */
  function lineChart(puntos, opts) {
    opts = opts || {};
    var W = 320, H = 150, pad = 8;
    if (!puntos || puntos.length < 2) {
      return el("div.chart-empty", { text: opts.vacio || "Necesitás al menos 2 registros para ver la evolución." });
    }
    var ys = puntos.map(function (p) { return p.y; });
    var min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if (min === max) { min -= 1; max += 1; }
    var dx = (W - pad * 2) / (puntos.length - 1);
    function X(i) { return pad + i * dx; }
    function Y(v) { return H - pad - (v - min) / (max - min) * (H - pad * 2); }
    var d = puntos.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.y).toFixed(1); }).join(" ");
    var area = d + " L" + X(puntos.length - 1).toFixed(1) + " " + (H - pad) + " L" + X(0).toFixed(1) + " " + (H - pad) + " Z";
    var svg = el("svg.chart", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none" });
    svg.innerHTML =
      '<defs><linearGradient id="garea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (opts.color || "#ff5b2e") + '" stop-opacity=".35"/><stop offset="1" stop-color="' + (opts.color || "#ff5b2e") + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="area" d="' + area + '"/>' +
      '<path class="line" d="' + d + '" style="stroke:' + (opts.color || "#ff5b2e") + '"/>' +
      puntos.map(function (p, i) { return '<circle class="dot" cx="' + X(i).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="2.5" style="fill:' + (opts.color || "#ff5b2e") + '"/>'; }).join("");
    return svg;
  }

  GYM.ui = {
    esc: esc, $: $, $$: $$, el: el,
    n0: n0, n1: n1, kg: kg, fechaCorta: fechaCorta, fechaLarga: fechaLarga,
    toast: toast, sheet: sheet, confirmar: confirmar,
    ring: ring, bar: bar, lineChart: lineChart
  };
})(typeof window !== "undefined" ? window : this);
