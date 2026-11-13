// Ejecutar con:  node tests/test_solver.js
const S = require("../solver.js");
const p = S.DEFAULTS;
let fails = 0;
function check(name, got, want, tol) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log((ok ? "OK   " : "FALLA") + " " + name + ": " + got.toFixed(4) + " (esperado " + want + ")");
}

// Valores del enunciado (Euler, h = 2 s)
const r = S.solve("euler", p, 2);
check("Euler v(2)", r[1].v, 10.38, 1e-4);
check("Euler v(4)", r[2].v, 18.684, 1e-4);
check("Euler v(10)", r[5].v, 34.8934, 1e-4);
check("Euler v(20)", r[10].v, 46.3273, 1e-4);
check("Euler y(4)", r[2].y, 20.76, 1e-4);
check("Euler y(20)", r[10].y, 574.7272, 1e-4);

// Solución analítica
const e = S.exact(20, p);
check("Exacta v(20)", e.v, 44.8761, 1e-4);
check("Exacta y(20)", e.y, 589.239, 1e-3);

// Errores por paso (tabla del enunciado)
[[2, 1.4512, 14.5118], [1, 0.7141, 7.1407], [0.5, 0.3541, 3.5412], [0.25, 0.1763, 1.7633]].forEach(([h, ev, ey]) => {
  const f = S.finalErrors("euler", p, h);
  check("Error v h=" + h, f.ev, ev, 1e-4);
  check("Error y h=" + h, f.ey, ey, 1e-3);
});

// Orden de convergencia: Euler ≈ 1, Heun ≈ 2, RK4 ≈ 4
["euler", "heun", "rk4"].forEach((m, i) => {
  const a = S.finalErrors(m, p, 1).ey;
  const b = S.finalErrors(m, p, 0.5).ey;
  const orden = Math.log2(a / b);
  console.log(m + " orden observado ≈ " + orden.toFixed(2));
  if (Math.abs(orden - [1, 2, 4][i]) > 0.35) { fails++; console.log("FALLA orden " + m); }
});

if (fails) { console.log("\n" + fails + " pruebas fallaron"); process.exit(1); }
console.log("\nTodas las pruebas pasaron");
