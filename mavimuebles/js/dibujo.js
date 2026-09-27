/* ============================================================
   MAVIMUEBLES — Cotizador
   Archivo: js/dibujo.js
   ------------------------------------------------------------
   Dibuja la vista frontal del mueble (SVG) a medida que se
   ingresan los datos: módulos, repisas, cajones, barras,
   puertas, zócalo/patas, cubierta y cotas.
   Usa la misma geometría que el despiece (js/calculo.js),
   así el dibujo y el precio siempre coinciden.
   ============================================================ */

/* Colores reconocidos en el campo "Color / terminación".
   Ej: "Blanco / Roble" → cuerpo blanco, frentes roble. */
const COLORES_MADERA = {
  blanco: "#f4f2ec", negro: "#3a3a3a", gris: "#a3a3a3", grafito: "#5a5a5a", humo: "#8f8b85",
  roble: "#c19a6b", nogal: "#7a5236", cerezo: "#9b4a2e", wengue: "#4a3326", wenge: "#4a3326",
  haya: "#d9a56b", pino: "#e3c393", natural: "#d8b58a", caoba: "#7b3f2a", teca: "#a86f3c",
  beige: "#e6d7bd", arena: "#d8c7a3", azul: "#4d6b8a", verde: "#6f8a6a", rojo: "#a8453c"
};

function coloresDesdeTexto(texto) {
  const encontrados = [];
  String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .split(/[^a-z]+/).forEach(p => { if (COLORES_MADERA[p]) encontrados.push(COLORES_MADERA[p]); });
  return encontrados;
}

/* Aclara (+) u oscurece (−) un color hex. */
function tono(hex, cantidad) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v =>
    Math.max(0, Math.min(255, Math.round(cantidad > 0 ? v + (255 - v) * cantidad : v * (1 + cantidad)))));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}

function escaparSvg(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ------------------------------------------------------------
   dibujarMueble(mueble, config, { puertas: true, cotas: true })
   Devuelve el SVG como texto.
   ------------------------------------------------------------ */
function dibujarMueble(m, config, opciones) {
  const op = Object.assign({ puertas: true, cotas: true }, opciones || {});
  const g = geometria(m, config || CONFIG_DEFECTO);
  if (m.modo === "manual") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 90" class="dibujo" role="img" aria-label="Mueble en modo manual">
      <text x="100" y="42" text-anchor="middle" font-size="9" fill="#8a7a66" font-family="system-ui,sans-serif">Modo manual: sin dibujo</text>
      <text x="100" y="56" text-anchor="middle" font-size="7" fill="#a89a88" font-family="system-ui,sans-serif">Cambia a "Constructor" para verlo</text></svg>`;
  }
  if (!g.ok) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 90" class="dibujo" role="img" aria-label="Faltan medidas">
      <text x="100" y="48" text-anchor="middle" font-size="9" fill="#8a7a66" font-family="system-ui,sans-serif">Ingresa alto, ancho y profundidad</text></svg>`;
  }

  const { H, W, D, e, z } = g;
  const colores = coloresDesdeTexto(m.color);
  const cCuerpo = colores[0] || "#d9bc94";
  const cFrente = colores[1] || colores[0] || "#c79a6b";
  const cInterior = tono(cCuerpo, cCuerpo === COLORES_MADERA.blanco ? -0.08 : 0.35);
  const cBorde = "#4a3220";

  const fs = Math.max(W, H) / 20;                 // tamaño de letra (en cm)
  const cub = m.cubierta ? 3 : 0;
  const patas = m.base === "patas" ? 10 : 0;
  const padL = fs * 0.8;
  const padR = op.cotas ? fs * 2.6 : fs * 0.8;
  const padT = (op.cotas ? fs * 2.4 : fs * 0.8) + cub;
  const padB = patas + (op.cotas ? fs * 2 : fs * 0.8);
  const f = v => Math.round(v * 100) / 100;
  const Y = y => H - y;                           // el SVG mide hacia abajo; el mueble, hacia arriba
  const trazo = `stroke="${cBorde}" stroke-width="1.2" vector-effect="non-scaling-stroke"`;
  const s = [];
  const rect = (x, y, w, h, attrs) => { if (w > 0 && h > 0) s.push(`<rect x="${f(x)}" y="${f(Y(y + h))}" width="${f(w)}" height="${f(h)}" ${attrs}/>`); };
  const linea = (x1, y1, x2, y2, attrs) => s.push(`<line x1="${f(x1)}" y1="${f(Y(y1))}" x2="${f(x2)}" y2="${f(Y(y2))}" ${attrs}/>`);
  const texto = (x, y, t, extra) => s.push(`<text x="${f(x)}" y="${f(y)}" font-size="${f(fs)}" text-anchor="middle" fill="#3b2a1a" font-family="system-ui,sans-serif" ${extra || ""}>${escaparSvg(t)}</text>`);
  const tirador = `stroke="#2d2016" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke"`;

  // Interior y cuerpo
  rect(0, 0, W, H, `fill="${cInterior}" ${trazo}`);
  rect(0, 0, e, H, `fill="${cCuerpo}" ${trazo}`);
  rect(W - e, 0, e, H, `fill="${cCuerpo}" ${trazo}`);
  rect(e, H - e, W - 2 * e, e, `fill="${cCuerpo}" ${trazo}`);
  rect(e, z, W - 2 * e, e, `fill="${cCuerpo}" ${trazo}`);
  if (z) rect(e, 0, W - 2 * e, z, `fill="${tono(cCuerpo, -0.25)}" ${trazo}`);
  for (let i = 1; i < g.N; i++) rect(g.modulos[i].x0 - e, g.pisoY, e, g.techoY - g.pisoY, `fill="${cCuerpo}" ${trazo}`);

  // Cajones (primer módulo)
  if (g.C) {
    const md = g.modulos[0], w = md.x1 - md.x0;
    for (let k = 0; k < g.C; k++) {
      const y = g.pisoY + k * g.hc;
      if (y + g.hc > g.techoY + 0.01) break;
      rect(md.x0 + 0.3, y + 0.2, w - 0.6, g.hc - 0.4, `fill="${cFrente}" ${trazo}`);
      linea(md.x0 + w * 0.38, y + g.hc / 2, md.x0 + w * 0.62, y + g.hc / 2, tirador);
    }
  }

  // Repisas y barras por módulo
  g.modulos.forEach((md, i) => {
    const w = md.x1 - md.x0;
    let abajo = i === g.modCajones ? g.pisoY + g.C * g.hc : g.pisoY;
    let arriba = g.techoY;
    let r = g.repisas[i];
    if (g.barras[i]) {
      let yBarra = arriba - 12;
      if (r > 0 && arriba - abajo > 60) { rect(md.x0, arriba - 30, w, e, `fill="${cCuerpo}" ${trazo}`); r--; yBarra = arriba - 38; }
      if (yBarra > abajo + 10) {
        linea(md.x0 + 1, yBarra, md.x1 - 1, yBarra, `stroke="#8d8d8d" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"`);
        // perchas
        const nPerchas = Math.max(1, Math.min(5, Math.floor(w / 18)));
        for (let k = 1; k <= nPerchas; k++) {
          const x = md.x0 + w * k / (nPerchas + 1);
          linea(x, yBarra, x, yBarra - 4, `stroke="#9a9a9a" stroke-width="1" vector-effect="non-scaling-stroke"`);
          linea(x - 7, yBarra - 8, x, yBarra - 4, `stroke="#9a9a9a" stroke-width="1" vector-effect="non-scaling-stroke"`);
          linea(x + 7, yBarra - 8, x, yBarra - 4, `stroke="#9a9a9a" stroke-width="1" vector-effect="non-scaling-stroke"`);
        }
      }
      arriba = Math.max(abajo, yBarra - 100); // espacio para ropa colgada
    }
    if (r > 0 && arriba - abajo > 5) {
      for (let k = 1; k <= r; k++) rect(md.x0, abajo + (arriba - abajo) * k / (r + 1) - e / 2, w, e, `fill="${cCuerpo}" ${trazo}`);
    }
  });

  // Puertas (semitransparentes para ver el interior)
  if (op.puertas && g.puertas) {
    const P = g.puertas, zn = P.zona, n = P.n;
    const anchoHoja = (zn.x1 - zn.x0) / n;
    for (let j = 0; j < n; j++) {
      const x = zn.x0 + j * anchoHoja;
      if (P.tipo === "batiente") {
        rect(x + 0.15, zn.y0 + 0.15, anchoHoja - 0.3, zn.y1 - zn.y0 - 0.3, `fill="${cFrente}" fill-opacity=".5" ${trazo}`);
        const bisagraIzq = n === 1 ? true : j % 2 === 0;
        const xAbre = bisagraIzq ? x + anchoHoja : x, xBis = bisagraIzq ? x : x + anchoHoja;
        const yMedio = (zn.y0 + zn.y1) / 2;
        const guion = `stroke="${cBorde}" stroke-width=".8" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" opacity=".7"`;
        linea(xAbre, zn.y1, xBis, yMedio, guion);
        linea(xAbre, zn.y0, xBis, yMedio, guion);
        const xt = bisagraIzq ? x + anchoHoja - 3 : x + 3;
        const largoT = Math.min(12, (zn.y1 - zn.y0) / 4);
        linea(xt, yMedio - largoT / 2, xt, yMedio + largoT / 2, tirador);
      } else {
        const xh = j === 0 ? x : x - 1, wh = anchoHoja + (j === 0 || j === n - 1 ? 1 : 2);
        rect(xh, zn.y0, wh, zn.y1 - zn.y0, `fill="${j % 2 ? tono(cFrente, -0.12) : cFrente}" fill-opacity=".5" ${trazo}`);
        const xt = j % 2 ? xh + 4 : xh + wh - 4, yMedio = (zn.y0 + zn.y1) / 2;
        linea(xt, yMedio - 10, xt, yMedio + 10, tirador);
      }
    }
  }

  // Cubierta y patas
  if (cub) rect(-1, H, W + 2, cub, `fill="#6d6a66" ${trazo}`);
  if (patas) {
    const xs = [3, W - 6];
    for (let i = 1; i < g.N; i++) xs.push(g.modulos[i].x0 - e / 2 - 1.5);
    xs.forEach(x => rect(x, -patas, 3, patas, `fill="#555" stroke="none"`));
  }

  // Cotas
  if (op.cotas) {
    const cota = `stroke="#6b5a48" stroke-width="1" vector-effect="non-scaling-stroke"`;
    const yT = H + cub + fs * 0.9, t = fs * 0.35;
    linea(0, yT, W, yT, cota); linea(0, yT - t, 0, yT + t, cota); linea(W, yT - t, W, yT + t, cota);
    texto(W / 2, Y(yT) - fs * 0.35, `${f(W)} cm`);
    const xR = W + fs * 0.9;
    linea(xR, 0, xR, H, cota); linea(xR - t, 0, xR + t, 0, cota); linea(xR - t, H, xR + t, H, cota);
    const cy = Y(H / 2);
    texto(xR + fs * 1.1, cy, `${f(H)} cm`, `transform="rotate(-90 ${f(xR + fs * 1.1)} ${f(cy)})"`);
    const q = Math.max(1, Math.round(num(m.cantidad, 1)));
    texto(W / 2, Y(-patas) + fs * 1.5, `Prof. ${f(D)} cm${q > 1 ? ` · ${q} unidades` : ""}`, `fill="#6b5a48"`);
  }

  const vb = [-padL, -padT, W + padL + padR, H + padT + padB].map(f).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" class="dibujo" role="img" aria-label="Vista frontal: ${escaparSvg(m.tipo)} de ${f(W)} × ${f(H)} cm" preserveAspectRatio="xMidYMid meet">${s.join("")}</svg>`;
}
