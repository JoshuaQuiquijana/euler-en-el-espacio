# Euler en el Espacio

Simulador web del despegue de un cohete experimental (NASA, 1962) con el **método de Euler**, comparado con la **solución analítica**. Incluye Heun y Runge-Kutta de orden 4 como ampliación. Proyecto de Métodos Numéricos inspirado en la película *Talentos ocultos* (*Hidden Figures*).

**Aplicación en línea:** _(https://joshuaquiquijana.github.io/euler-en-el-espacio/)_

## Qué hace

- Permite ingresar masa, empuje, gravedad, resistencia, condiciones iniciales, tiempo total y paso `h`.
- Resuelve `m·dv/dt = T − m·g − k·v`, `dy/dt = v` con Euler, Heun y RK4.
- Calcula la solución analítica `v(t) = v∞ + (v₀ − v∞)·e^(−b t)` y la altura correspondiente.
- Muestra tabla de iteraciones, tabla de errores por paso, comparación de métodos y gráficas (velocidad, altura, error frente a `h` en escala log-log, diferencia con la exacta).
- Simulación animada del despegue y desafío de precisión (error de velocidad < 0,5 m/s, de altura < 5 m).
- Responde las cinco preguntas de reflexión del desafío.

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html`, `styles.css` | Página y estilos |
| `solver.js` | Núcleo numérico (Euler, Heun, RK4, solución exacta), sin dependencias |
| `app.js` | Interfaz, tablas y gráficas SVG |
| `tests/test_solver.js` | Pruebas contra los valores del enunciado |
| `docs/informe.md` | Informe con el desarrollo matemático |
| `docs/guion-video.md` | Guion del video de 2 minutos |
| `build_single.py` | Genera `dist/euler-en-el-espacio.html`, versión en un solo archivo |

## Uso

Abre `index.html` en el navegador. No necesita instalar nada.

Para ejecutar las pruebas (requiere Node.js):

```
node tests/test_solver.js
```

## Publicar con GitHub Pages

1. Crea un repositorio nuevo en GitHub y sube todos estos archivos.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Elige la rama `main` y la carpeta `/ (root)`, y pulsa **Save**.
4. Espera uno o dos minutos. El enlace será `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.

## Modelo y verificación

Con los datos del enunciado (`m = 1000 kg`, `T = 15 000 N`, `g = 9,81 m/s²`, `k = 100 kg/s`, `h = 2 s`) a los 20 s: Euler da 46,3273 m/s y 574,7272 m; la solución exacta da 44,8761 m/s y 589,2390 m. Los datos del cohete son ficticios y el modelo es didáctico (masa, empuje y resistencia constantes).
