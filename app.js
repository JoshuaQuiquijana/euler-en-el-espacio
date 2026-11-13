/* Interfaz del simulador. Usa Solver (solver.js) para todo el cálculo. */
(function () {
  "use strict";
  var S = window.Solver;
  var $ = function (id) { return document.getElementById(id); };
  var IDS = ["m", "T", "g", "k", "v0", "y0", "tmax", "h"];
  var METHODS = [
    { id: "euler", name: "Euler", color: "var(--euler)", order: 1 },
    { id: "heun", name: "Heun", color: "var(--heun)", order: 2 },
    { id: "rk4", name: "RK4", color: "var(--rk4)", order: 4 }
  ];
  var state = { chalH: 2, tNow: 0, playing: false, raf: 0, ctx: null };

  /* ---------- Formato ---------- */
  function fmt(x, d) {
    if (!isFinite(x)) return "—";
    return x.toLocaleString("es-BO", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function num(x) { return String(+x.toPrecision(6)).replace(".", ",").replace("-", "−"); }
  function sup(n) {
    var map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(n).split("").map(function (c) { return map[c] || c; }).join("");
  }
  function tick(v) { return String(+v.toFixed(6)).replace(".", ","); }

  /* ---------- Parámetros ---------- */
  function readParams() {
    var p = {};
    IDS.forEach(function (id) { p[id] = parseFloat($(id).value); });
    return p;
  }
  function valid(p) {
    for (var i = 0; i < IDS.length; i++) if (!isFinite(p[IDS[i]])) return "Completa todos los parámetros con números.";
    if (p.m <= 0) return "La masa debe ser mayor que 0.";
    if (p.tmax <= 0) return "El tiempo total debe ser mayor que 0.";
    if (p.h <= 0) return "El paso h debe ser mayor que 0.";
    if (p.tmax / p.h > 20000) return "Con ese paso habría más de 20 000 iteraciones. Usa un h mayor.";
    return "";
  }

  /* ---------- Escalas y gráficas SVG ---------- */
  function niceScale(min, max, n) {
    if (min === max) max = min + 1;
    var span = max - min, raw = span / (n || 5);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var nr = raw / mag;
    var step = (nr <= 1 ? 1 : nr <= 2 ? 2 : nr <= 5 ? 5 : 10) * mag;
    var lo = Math.floor(min / step + 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step;
    var ticks = [];
    for (var v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toPrecision(12));
    return { lo: lo, hi: hi, ticks: ticks };
  }

  function drawChart(host, legend, series, o) {
    var W = 640, H = 340, L = 74, R = 18, T = 16, B = 54;
    var xs = [], ys = [];
    series.forEach(function (s) { s.pts.forEach(function (q) { xs.push(q[0]); ys.push(q[1]); }); });
    var X, Y, xt, yt, xlab = {}, ylab = {};
    var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
    if (o.xlog) {
      var lx = Math.log10(xmin), hx = Math.log10(xmax);
      X = function (x) { return L + (Math.log10(x) - lx) / (hx - lx) * (W - L - R); };
      xt = o.xticks;
      xt.forEach(function (v) { xlab[v] = tick(v); });
    } else {
      var sx = niceScale(xmin, xmax, 6);
      X = function (x) { return L + (x - sx.lo) / (sx.hi - sx.lo) * (W - L - R); };
      xt = sx.ticks;
      xt.forEach(function (v) { xlab[v] = tick(v); });
    }
    if (o.ylog) {
      var ymin = Math.max(1e-14, Math.min.apply(null, ys)), ymax = Math.max.apply(null, ys);
      var ly = Math.floor(Math.log10(ymin)), hy = Math.ceil(Math.log10(ymax));
      if (ly === hy) hy = ly + 1;
      Y = function (y) { return T + (1 - (Math.log10(Math.max(y, 1e-14)) - ly) / (hy - ly)) * (H - T - B); };
      yt = [];
      for (var e = ly; e <= hy; e++) { yt.push(e); ylab[e] = "10" + sup(e); }
      yt = yt.map(function (e) { return Math.pow(10, e); });
      yt.forEach(function (v, i) { ylab[v] = "10" + sup(ly + i); });
    } else {
      var sy = niceScale(Math.min(0, Math.min.apply(null, ys)), Math.max(0, Math.max.apply(null, ys)), 5);
      Y = function (y) { return T + (1 - (y - sy.lo) / (sy.hi - sy.lo)) * (H - T - B); };
      yt = sy.ticks;
      yt.forEach(function (v) { ylab[v] = tick(v); });
    }
    var out = '<svg class="ax" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + o.aria + '">';
    yt.forEach(function (v) {
      var y = Y(v).toFixed(1);
      out += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/>';
      out += '<text x="' + (L - 8) + '" y="' + (+y + 4) + '" text-anchor="end">' + ylab[v] + "</text>";
    });
    xt.forEach(function (v) {
      var x = X(v).toFixed(1);
      out += '<line class="g" x1="' + x + '" x2="' + x + '" y1="' + T + '" y2="' + (H - B) + '"/>';
      out += '<text x="' + x + '" y="' + (H - B + 19) + '" text-anchor="middle">' + xlab[v] + "</text>";
    });
    out += '<line class="a" x1="' + L + '" x2="' + L + '" y1="' + T + '" y2="' + (H - B) + '"/>';
    out += '<line class="a" x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/>';
    if (!o.ylog) {
      var z = Y(0);
      if (z < H - B - 1) out += '<line class="a" x1="' + L + '" x2="' + (W - R) + '" y1="' + z.toFixed(1) + '" y2="' + z.toFixed(1) + '" style="opacity:.45"/>';
    }
    out += '<text class="axt" x="' + ((L + W - R) / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + o.xlabel + "</text>";
    out += '<text class="axt" transform="translate(16 ' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle">' + o.ylabel + "</text>";
    series.forEach(function (s) {
      var d = s.pts.map(function (q, i) { return (i ? "L" : "M") + X(q[0]).toFixed(1) + " " + Y(q[1]).toFixed(1); }).join("");
      out += '<path d="' + d + '" fill="none" style="stroke:' + s.color + '" stroke-width="' + (s.w || 2.2) + '"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : "") + ' stroke-linejoin="round"/>';
      if (s.dots) s.pts.forEach(function (q) {
        out += '<circle cx="' + X(q[0]).toFixed(1) + '" cy="' + Y(q[1]).toFixed(1) + '" r="3.2" style="fill:' + s.color + '"><title>' + s.name + ": " + o.tipx + " " + tick(q[0]) + " → " + fmt(q[1], o.tipd == null ? 3 : o.tipd) + "</title></circle>";
      });
    });
    out += "</svg>";
    host.innerHTML = out;
    legend.innerHTML = series.map(function (s) {
      return '<li><span class="swatch" style="background:' + s.color + '"></span>' + (s.label || s.name) + "</li>";
    }).join("");
  }

  function exactSeries(p, key, name) {
    var pts = [], N = 200;
    for (var i = 0; i <= N; i++) { var t = p.tmax * i / N; pts.push([t, S.exact(t, p)[key]]); }
    return { name: name, label: name, color: "var(--exact)", pts: pts, w: 2.6 };
  }
  function methodSeries(rows, key, m, dots) {
    return { name: m.name, label: m.name, color: m.color, dots: dots, pts: rows.map(function (r) { return [r.t, r[key]]; }), dash: m.id === "euler" ? "" : "6 4" };
  }

  /* ---------- Piezas pequeñas ---------- */
  function tile(cls, lab, val, unit) {
    return '<div class="tile ' + cls + '"><div class="lab">' + lab + '</div><div class="num">' + val + '</div><div class="unit">' + unit + "</div></div>";
  }
  function pill(ok) { return '<span class="pill ' + (ok ? "ok" : "bad") + '">' + (ok ? "Cumple" : "No cumple") + "</span>"; }

  /* ---------- Secciones ---------- */
  function renderModel(p, rows) {
    var a = p.T / p.m - p.g, b = p.k / p.m;
    $("fSub").innerHTML = "dv/dt = " + num(p.T) + "/" + num(p.m) + " − " + num(p.g) + " − (" + num(p.k) + "/" + num(p.m) + ")·v\n" +
      "dv/dt = <span class='live'>" + num(a) + " − " + num(b) + "·v</span>\ndy/dt = v";
    var ex;
    if (Math.abs(b) < 1e-12) {
      ex = "v(t) = " + num(p.v0) + " + " + num(a) + "·t\ny(t) = " + num(p.y0) + " + " + num(p.v0) + "·t + " + num(a / 2) + "·t²";
      $("fNote").textContent = "Sin resistencia (k = 0) la aceleración es constante.";
    } else {
      var vi = a / b, c = p.v0 - vi;
      if (p.v0 === 0 && p.y0 === 0) {
        ex = "v(t) = <span class='live'>" + num(vi) + "·(1 − e^(−" + num(b) + "·t))</span>\ny(t) = <span class='live'>" + num(vi) + "·t − " + num(vi / b) + "·(1 − e^(−" + num(b) + "·t))</span>";
      } else {
        ex = "v(t) = " + num(vi) + " + (" + num(c) + ")·e^(−" + num(b) + "·t)\ny(t) = " + num(p.y0) + " + " + num(vi) + "·t + (" + num(c / b) + ")·(1 − e^(−" + num(b) + "·t))";
      }
      $("fNote").textContent = "Se obtiene por separación de variables: dv/(a − b·v) = dt, con a = T/m − g y b = k/m. La velocidad tiende a v∞ = a/b = " + num(vi) + " m/s.";
    }
    $("fExact").innerHTML = ex;
    var h = rows[1].t - rows[0].t, r1 = rows[1], v0 = rows[0].v;
    $("fEuler").innerHTML = "v(n+1) = v(n) + h·(" + num(a) + " − " + num(b) + "·v(n))\ny(n+1) = y(n) + h·v(n)\n\n" +
      "Iteración 1 (t = " + num(r1.t) + " s):  v₁ = " + num(v0) + " + " + num(h) + "·(" + num(a) + " − " + num(b) + "·" + num(v0) + ") = <span class='live'>" + num(r1.v) + " m/s</span>\n" +
      "                          y₁ = " + num(rows[0].y) + " + " + num(h) + "·" + num(v0) + " = <span class='live'>" + num(r1.y) + " m</span>";
  }

  function renderKpi(p, rows) {
    var last = rows[rows.length - 1], ex = S.exact(last.t, p);
    $("kpi").innerHTML =
      tile("euler", "Euler · velocidad", fmt(last.v, 4), "m/s a los " + num(last.t) + " s") +
      tile("euler", "Euler · altura", fmt(last.y, 4), "m a los " + num(last.t) + " s") +
      tile("exact", "Exacta · velocidad", fmt(ex.v, 4), "m/s") +
      tile("exact", "Exacta · altura", fmt(ex.y, 4), "m") +
      tile("err", "Error de velocidad", fmt(Math.abs(ex.v - last.v), 4), "m/s") +
      tile("err", "Error de altura", fmt(Math.abs(ex.y - last.y), 4), "m");
  }

  function buildTrack(p, rows) {
    var ys = [], i;
    for (i = 0; i <= 50; i++) ys.push(S.exact(p.tmax * i / 50, p).y);
    rows.forEach(function (r) { ys.push(r.y); });
    var sc = niceScale(Math.min(0, Math.min.apply(null, ys)), Math.max(0, Math.max.apply(null, ys)), 5);
    state.ctx = { p: p, rows: rows, lo: sc.lo, hi: sc.hi };
    var html = "";
    sc.ticks.forEach(function (v) {
      var f = (v - sc.lo) / (sc.hi - sc.lo);
      html += '<div class="tick" style="bottom:calc(' + f + ' * (100% - 56px))">' + tick(v) + " m</div>";
    });
    html += '<div class="eul-mark" id="eMark"><span>Euler</span></div>';
    html += '<div class="rocket" id="rocket"><svg viewBox="0 0 34 56" aria-hidden="true"><path d="M17 1c6 8 8 17 8 27v12H9V28C9 18 11 9 17 1z" style="fill:var(--ink)"/><circle cx="17" cy="22" r="4" style="fill:var(--card)"/><path d="M9 32L2 44v7l7-4zM25 32l7 12v7l-7-4z" style="fill:var(--accent)"/><path d="M13 42h8l-4 13z" style="fill:var(--euler)"/></svg></div>';
    $("track").innerHTML = html;
    var sl = $("scrub");
    sl.max = p.tmax; sl.step = p.tmax / 400;
    if (state.tNow > p.tmax) state.tNow = p.tmax;
    setTime(state.tNow);
  }

  function setTime(t) {
    var c = state.ctx; if (!c) return;
    state.tNow = t;
    var ex = S.exact(t, c.p);
    var ev = S.interp(c.rows, t, "v"), ey = S.interp(c.rows, t, "y");
    var f = function (y) { return Math.max(0, Math.min(1, (y - c.lo) / (c.hi - c.lo))); };
    $("rocket").style.bottom = "calc(" + f(ex.y) + " * (100% - 56px))";
    $("eMark").style.bottom = "calc(" + f(ey) + " * (100% - 56px))";
    $("scrub").value = t;
    $("tRead").textContent = "t = " + fmt(t, 1) + " s";
    $("liveTiles").innerHTML =
      tile("exact", "Exacta v", fmt(ex.v, 2), "m/s") + tile("exact", "Exacta y", fmt(ex.y, 1), "m") +
      tile("euler", "Euler v", fmt(ev, 2), "m/s") + tile("euler", "Euler y", fmt(ey, 1), "m");
  }

  function play() {
    var c = state.ctx; if (!c) return;
    if (state.playing) { stop(); return; }
    if (state.fresh || state.tNow >= c.p.tmax - 1e-9) state.tNow = 0;
    state.fresh = false;
    state.playing = true;
    $("play").textContent = "⏸ Pausar";
    var DUR = 8000, start = performance.now(), t0 = state.tNow;
    (function loop(now) {
      if (!state.playing) return;
      var t = Math.min(c.p.tmax, t0 + (now - start) / DUR * c.p.tmax);
      setTime(t);
      if (t >= c.p.tmax) { stop(); return; }
      state.raf = requestAnimationFrame(loop);
    })(start);
  }
  function stop() {
    state.playing = false;
    cancelAnimationFrame(state.raf);
    $("play").textContent = state.tNow >= (state.ctx ? state.ctx.p.tmax : 0) - 1e-9 ? "↻ Repetir" : "▶ Continuar";
  }

  function renderCharts(p, all) {
    var showH = $("showHeun").checked, showR = $("showRK4").checked;
    var act = METHODS.filter(function (m) { return m.id === "euler" || (m.id === "heun" && showH) || (m.id === "rk4" && showR); });
    var sv = [exactSeries(p, "v", "Solución exacta")], sy = [exactSeries(p, "y", "Solución exacta")];
    act.forEach(function (m) {
      var nm = m.name + " (h = " + num(all[m.id][1].t) + " s)";
      var a = methodSeries(all[m.id], "v", m, m.id === "euler"); a.label = nm; sv.push(a);
      var b = methodSeries(all[m.id], "y", m, m.id === "euler"); b.label = nm; sy.push(b);
    });
    drawChart($("chV"), $("lgV"), sv, { xlabel: "tiempo t (s)", ylabel: "velocidad v (m/s)", aria: "Velocidad en función del tiempo", tipx: "t =", tipd: 3 });
    drawChart($("chY"), $("lgY"), sy, { xlabel: "tiempo t (s)", ylabel: "altura y (m)", aria: "Altura en función del tiempo", tipx: "t =", tipd: 3 });

    var hs = [2, 1, 0.5, 0.25, 0.125], se = [];
    METHODS.forEach(function (m) {
      var pts = hs.map(function (h) { return [h, Math.max(S.finalErrors(m.id, p, h).ey, 1e-14)]; });
      var ord = Math.log(pts[0][1] / pts[2][1]) / Math.log(pts[0][0] / pts[2][0]);
      se.push({ name: m.name, label: m.name + " (orden observado ≈ " + fmt(ord, 1) + ")", color: m.color, pts: pts, dots: true, dash: m.id === "euler" ? "" : "6 4" });
    });
    drawChart($("chE"), $("lgE"), se, { xlog: true, ylog: true, xticks: hs, xlabel: "paso h (s)", ylabel: "error de altura al final (m)", aria: "Error de altura según el paso", tipx: "h =", tipd: 6 });

    var sd = act.map(function (m) {
      var pts = all[m.id].map(function (r) { return [r.t, r.y - S.exact(r.t, p).y]; });
      return { name: m.name, label: m.name, color: m.color, pts: pts, dots: m.id === "euler", dash: m.id === "euler" ? "" : "6 4" };
    });
    drawChart($("chD"), $("lgD"), sd, { xlabel: "tiempo t (s)", ylabel: "y aproximada − y exacta (m)", aria: "Diferencia de altura con la solución exacta", tipx: "t =", tipd: 4 });
  }

  function renderIterTable(p, all) {
    var id = $("tblMethod").value, rows = all[id];
    var html = "<thead><tr><th>t (s)</th><th>v aprox. (m/s)</th><th>y aprox. (m)</th><th>v exacta (m/s)</th><th>y exacta (m)</th><th>Error v</th><th>Error y</th></tr></thead><tbody>";
    var cap = 400;
    rows.slice(0, cap + 1).forEach(function (r, i) {
      var ex = S.exact(r.t, p), last = i === rows.length - 1;
      html += "<tr" + (last ? ' class="hl"' : "") + "><td>" + fmt(r.t, 2) + "</td><td>" + fmt(r.v, 4) + "</td><td>" + fmt(r.y, 4) + "</td><td>" + fmt(ex.v, 4) + "</td><td>" + fmt(ex.y, 4) + "</td><td>" + fmt(Math.abs(ex.v - r.v), 4) + "</td><td>" + fmt(Math.abs(ex.y - r.y), 4) + "</td></tr>";
    });
    if (rows.length > cap + 1) html += '<tr><td colspan="7" style="text-align:left">… se muestran las primeras ' + cap + " filas de " + (rows.length - 1) + ".</td></tr>";
    $("iterTable").innerHTML = html + "</tbody>";
  }

  function renderErrors(p) {
    var hs = [2, 1, 0.5, 0.25];
    var html = "<thead><tr><th>Paso h</th><th>Iteraciones</th><th>Velocidad (m/s)</th><th>Error v (m/s)</th><th>Altura (m)</th><th>Error y (m)</th></tr></thead><tbody>";
    var res = hs.map(function (h) { return S.finalErrors("euler", p, h); });
    res.forEach(function (r, i) {
      html += "<tr><td>" + num(hs[i]) + " s</td><td>" + r.n + "</td><td>" + fmt(r.v, 4) + "</td><td>" + fmt(r.ev, 4) + "</td><td>" + fmt(r.y, 4) + "</td><td>" + fmt(r.ey, 4) + "</td></tr>";
    });
    html += '<tr class="hl"><td>Exacta</td><td>—</td><td>' + fmt(res[0].vExact, 4) + "</td><td>0</td><td>" + fmt(res[0].yExact, 4) + "</td><td>0</td></tr></tbody>";
    $("stepTable").innerHTML = html;
    $("stepConclusion").textContent = "Cada vez que el paso se reduce a la mitad, el error de Euler baja aproximadamente a la mitad (de " + fmt(res[0].ey, 2) + " m a " + fmt(res[1].ey, 2) + " m en la altura). Eso es lo que significa que el método sea de orden 1.";

    var tv = parseFloat($("tolV").value), ty = parseFloat($("tolY").value), h = p.h;
    var list = METHODS.map(function (m) {
      var a = S.finalErrors(m.id, p, h), b = S.finalErrors(m.id, p, h / 2);
      var ord = a.ey > 1e-11 && b.ey > 1e-12 ? Math.log2(a.ey / b.ey) : NaN;
      return { m: m, a: a, ord: ord };
    });
    var bestV = Math.min.apply(null, list.map(function (r) { return r.a.ev; })), bestY = Math.min.apply(null, list.map(function (r) { return r.a.ey; }));
    var mh = "<thead><tr><th>Método</th><th>Evaluaciones de F por paso</th><th>Error v (m/s)</th><th>Error y (m)</th><th>Orden observado</th><th>Tolerancia del desafío</th></tr></thead><tbody>";
    list.forEach(function (r) {
      var ok = r.a.ev < tv && r.a.ey < ty;
      mh += "<tr><td>" + r.m.name + "</td><td>" + [1, 2, 4][METHODS.indexOf(r.m)] + '</td><td class="' + (r.a.ev === bestV ? "best" : "") + '">' + fmt(r.a.ev, 6) + '</td><td class="' + (r.a.ey === bestY ? "best" : "") + '">' + fmt(r.a.ey, 6) + "</td><td>" + (isNaN(r.ord) ? "—" : fmt(r.ord, 2)) + "</td><td>" + pill(ok) + "</td></tr>";
    });
    $("methodTable").innerHTML = mh + "</tbody>";
    var eu = list[0].a, rk = list[2].a;
    $("methodConclusion").textContent = "Con h = " + num(h) + " s, RK4 es el más preciso: su error de altura es " + fmt(rk.ey, 6) + " m frente a " + fmt(eu.ey, 4) + " m de Euler. Heun (orden 2) queda en el medio. El orden observado (cuántas veces baja el error al dividir h entre 2, en potencias de 2) coincide con el teórico: 1, 2 y 4. RK4 cuesta cuatro evaluaciones por paso, pero con muchos menos pasos alcanza la misma precisión.";
  }

  function renderChallenge(p) {
    var opts = [2, 1, 0.5, 0.25], html = "";
    opts.forEach(function (h) {
      var n = S.stepping(p, h).n, id = "ch" + String(h).replace(".", "_");
      html += '<input type="radio" name="chalH" id="' + id + '" value="' + h + '"' + (state.chalH === h ? " checked" : "") + '><label for="' + id + '">' + num(h) + " s (" + n + " iter.)</label>";
    });
    $("chal").innerHTML = html;
    var r = S.finalErrors("euler", p, state.chalH), tv = parseFloat($("tolV").value), ty = parseFloat($("tolY").value);
    var okV = r.ev < tv, okY = r.ey < ty;
    $("chalTiles").innerHTML =
      tile("euler", "Velocidad calculada", fmt(r.v, 4), "m/s a los " + num(p.tmax) + " s") +
      tile("euler", "Altura calculada", fmt(r.y, 4), "m a los " + num(p.tmax) + " s") +
      tile("err", "Error de velocidad", fmt(r.ev, 4), "m/s · " + pill(okV)) +
      tile("err", "Error de altura", fmt(r.ey, 4), "m · " + pill(okY));
    var need = null, cand = [4, 2, 1, 0.5, 0.25, 0.125, 0.0625, 0.03125];
    for (var i = 0; i < cand.length; i++) { var q = S.finalErrors("euler", p, cand[i]); if (q.ev < tv && q.ey < ty) { need = cand[i]; break; } }
    var v = $("chalVerdict");
    if (okV && okY) v.innerHTML = "<strong>Cálculo aprobado.</strong>Ambos errores están dentro de los límites. Con paso de " + num(state.chalH) + " s los resultados son aceptables para este lanzamiento.";
    else v.innerHTML = "<strong>La precisión todavía es insuficiente.</strong>Prueba un paso menor para cumplir ambos requisitos." + (need ? " Con Euler, el mayor paso de la lista que cumple es h = " + num(need) + " s." : "");
  }

  function renderConclusion(p, rows) {
    var last = rows[rows.length - 1], ex = S.exact(last.t, p);
    $("concl").textContent = "Con h = " + num(p.h) + " s, Euler calcula una velocidad de " + fmt(last.v, 4) + " m/s y una altura de " + fmt(last.y, 4) + " m a los " + num(last.t) + " s. La solución exacta da " + fmt(ex.v, 4) + " m/s y " + fmt(ex.y, 4) + " m. La diferencia (" + fmt(Math.abs(ex.v - last.v), 4) + " m/s y " + fmt(Math.abs(ex.y - last.y), 4) + " m) muestra que no basta con obtener un número: hay que medir su error y decidir si cumple la precisión requerida.";
  }

  /* ---------- Ciclo principal ---------- */
  function render() {
    var p = readParams(), msg = valid(p);
    if (msg) { $("stepNote").textContent = msg; return; }
    var all = {};
    METHODS.forEach(function (m) { all[m.id] = S.solve(m.id, p, p.h); });
    var s = S.stepping(p, p.h), note = s.n + " iteraciones, paso efectivo h = " + num(s.h) + " s.";
    if (Math.abs(s.h - p.h) > 1e-9) note += " El paso se ajustó para que el último intervalo termine exactamente en t = " + num(p.tmax) + " s.";
    if (p.k > 0 && p.h > 2 * p.m / p.k) note += " Atención: con h > 2m/k = " + num(2 * p.m / p.k) + " s Euler es inestable en este modelo.";
    $("stepNote").textContent = note;
    if (state.playing) stop();
    renderModel(p, all.euler);
    renderKpi(p, all.euler);
    buildTrack(p, all.euler);
    renderCharts(p, all);
    renderIterTable(p, all);
    renderErrors(p);
    renderChallenge(p);
    renderConclusion(p, all.euler);
    $("play").textContent = state.tNow >= p.tmax - 1e-9 ? "↻ Repetir" : "▶ Lanzar";
  }

  IDS.forEach(function (id) { $(id).addEventListener("input", render); });
  ["showHeun", "showRK4"].forEach(function (id) { $(id).addEventListener("change", render); });
  $("tblMethod").addEventListener("change", render);
  ["tolV", "tolY"].forEach(function (id) { $(id).addEventListener("input", render); });
  $("chal").addEventListener("change", function (e) { state.chalH = parseFloat(e.target.value); render(); });
  $("play").addEventListener("click", play);
  $("scrub").addEventListener("input", function (e) { state.fresh = false; if (state.playing) stop(); setTime(parseFloat(e.target.value)); stop(); });
  $("reset").addEventListener("click", function () {
    IDS.forEach(function (id) { $(id).value = S.DEFAULTS[id]; });
    state.tNow = 0; state.chalH = 2;
    render();
  });
  render();
  // La simulación abre ya mostrando un instante intermedio
  state.fresh = true;
  setTime(state.ctx ? state.ctx.p.tmax * 0.6 : 0);
  $("play").textContent = "▶ Lanzar";
})();
