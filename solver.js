/* Núcleo numérico: modelo del cohete, método de Euler, Heun, RK4 y solución analítica.
   Modelo:  m·dv/dt = T − m·g − k·v ,   dy/dt = v                                   */
(function (root) {
  "use strict";

  // Aceleración como función de la velocidad: F(v) = T/m − g − (k/m)·v
  function F(v, p) {
    return p.T / p.m - p.g - (p.k / p.m) * v;
  }

  // Solución analítica (separación de variables).
  //  a = T/m − g,  b = k/m,  v∞ = a/b
  //  v(t) = v∞ + (v0 − v∞)·e^(−b t)
  //  y(t) = y0 + v∞·t + (v0 − v∞)·(1 − e^(−b t))/b
  function exact(t, p) {
    var a = p.T / p.m - p.g;
    var b = p.k / p.m;
    if (Math.abs(b) < 1e-12) {
      return { v: p.v0 + a * t, y: p.y0 + p.v0 * t + 0.5 * a * t * t };
    }
    var vinf = a / b;
    var c = p.v0 - vinf;
    var e = Math.exp(-b * t);
    return { v: vinf + c * e, y: p.y0 + vinf * t + (c * (1 - e)) / b };
  }

  // Número de pasos y paso efectivo (el último paso encaja exactamente en tmax).
  function stepping(p, h) {
    var n = Math.max(1, Math.round(p.tmax / h));
    return { n: n, h: p.tmax / n };
  }

  // Integra el sistema con el método pedido. Devuelve las filas {t, v, y}.
  function solve(method, p, h) {
    var s = stepping(p, h);
    var hh = s.h;
    var v = p.v0;
    var y = p.y0;
    var rows = [{ t: 0, v: v, y: y }];
    for (var i = 1; i <= s.n; i++) {
      var vn, yn;
      if (method === "euler") {
        vn = v + hh * F(v, p);
        yn = y + hh * v;
      } else if (method === "heun") {
        var k1 = F(v, p);
        var vp = v + hh * k1;
        var k2 = F(vp, p);
        vn = v + (hh / 2) * (k1 + k2);
        yn = y + (hh / 2) * (v + vp);
      } else if (method === "rk4") {
        var a1 = F(v, p);
        var a2 = F(v + (hh / 2) * a1, p);
        var a3 = F(v + (hh / 2) * a2, p);
        var a4 = F(v + hh * a3, p);
        vn = v + (hh / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
        // y' = v(t): se evalúa v en los mismos puntos intermedios
        var l1 = v;
        var l2 = v + (hh / 2) * a1;
        var l3 = v + (hh / 2) * a2;
        var l4 = v + hh * a3;
        yn = y + (hh / 6) * (l1 + 2 * l2 + 2 * l3 + l4);
      } else {
        throw new Error("Método desconocido: " + method);
      }
      v = vn;
      y = yn;
      rows.push({ t: i * hh, v: v, y: y });
    }
    return rows;
  }

  // Errores absolutos al final del intervalo.
  function finalErrors(method, p, h) {
    var rows = solve(method, p, h);
    var last = rows[rows.length - 1];
    var ex = exact(last.t, p);
    return {
      n: rows.length - 1,
      h: stepping(p, h).h,
      v: last.v,
      y: last.y,
      ev: Math.abs(ex.v - last.v),
      ey: Math.abs(ex.y - last.y),
      vExact: ex.v,
      yExact: ex.y
    };
  }

  // Interpolación lineal entre nodos (para la animación).
  function interp(rows, t, key) {
    var h = rows[1].t - rows[0].t;
    var i = Math.min(rows.length - 2, Math.max(0, Math.floor(t / h + 1e-9)));
    var r = (t - rows[i].t) / h;
    return rows[i][key] + (rows[i + 1][key] - rows[i][key]) * r;
  }

  var api = {
    F: F,
    exact: exact,
    stepping: stepping,
    solve: solve,
    finalErrors: finalErrors,
    interp: interp,
    DEFAULTS: { m: 1000, T: 15000, g: 9.81, k: 100, v0: 0, y0: 0, tmax: 20, h: 2 }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Solver = api;
})(typeof window !== "undefined" ? window : this);
