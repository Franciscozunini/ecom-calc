/* Pinta los resultados de los tests en test-runner.html. Dev-only. */
(function () {
  "use strict";
  function pintar() {
    var res = window.__TESTS_RENTABILIDAD__.correr();
    var sum = document.getElementById("summary");
    var list = document.getElementById("list");
    sum.className = "summary " + (res.fallaron ? "fail" : "ok");
    sum.textContent = res.pasaron + "/" + res.total + " tests OK" +
      (res.fallaron ? " — " + res.fallaron + " fallaron" : " ✓");
    res.detalles.forEach(function (d) {
      var li = document.createElement("li");
      li.className = d.ok ? "ok" : "fail";
      li.textContent = (d.ok ? "✓ " : "✗ ") + d.nombre;
      if (!d.ok) {
        var e = document.createElement("span");
        e.className = "err";
        e.textContent = d.error;
        li.appendChild(e);
      }
      list.appendChild(li);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pintar);
  } else {
    pintar();
  }
})();
