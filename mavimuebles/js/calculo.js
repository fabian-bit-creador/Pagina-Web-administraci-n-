/* ============================================================
   MAVIMUEBLES — Cotizador
   Archivo: js/calculo.js
   ------------------------------------------------------------
   EL "CEREBRO" DE PRECIOS. Aquí viven:
     1. La geometría del mueble (módulos, cajones, puertas...)
     2. El despiece (lista de piezas a cortar)
     3. Herrajes y horas calculados automáticamente
     4. La fórmula de cotización y el reparto del precio por mueble

   No usa la pantalla (DOM): solo recibe datos y devuelve números.
   Así se puede probar solo y reutilizar en la futura página pública.
   Los números (margen, merma, valor hora...) se editan en la app.
   ============================================================ */

/* ============================================================
   UTILIDADES
   ============================================================ */

/* Usa "valor" si es un número válido; si no, "porDefecto". */
function num(valor, porDefecto) {
  const n = Number(valor);
  return (valor !== "" && valor !== null && valor !== undefined && !isNaN(n)) ? n : (Number(porDefecto) || 0);
}
function r1(x) { return Math.round(x * 10) / 10; }
function redondearHoras(h) { return Math.ceil(h * 4 - 1e-9) / 4; } // al cuarto de hora hacia arriba

/* Convierte 125000 en "$125.000" según la moneda configurada. */
function formatearDinero(valor, config) {
  config = config || CONFIG_DEFECTO;
  const n = Number(valor) || 0;
  const signo = n < 0 ? "−" : "";
  const partes = Math.abs(n).toFixed(config.monedaDecimales || 0).split(".");
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.monedaSeparadorMiles || ".");
  return signo + (config.monedaSimbolo || "$") + partes.join(",");
}

function unidadTexto(u) {
  return { plancha: "plancha", m2: "m²", ml: "m lineal", un: "unidad" }[u] || u || "";
}
function areaPlanchaM2(mat) { return (num(mat && mat.largo, 0) * num(mat && mat.ancho, 0)) / 10000; }

/* Precio por m² de un material (planchas o m²). */
function precioPorM2(mat) {
  if (!mat) return 0;
  if (mat.unidad === "plancha") {
    const a = areaPlanchaM2(mat);
    return a > 0 ? num(mat.precio, 0) / a : 0;
  }
  return num(mat.precio, 0);
}

/* Número de bisagras según el alto de la puerta (regla práctica de taller). */
function bisagrasPorPuerta(altoCm) {
  if (altoCm <= 90) return 2;
  if (altoCm <= 160) return 3;
  if (altoCm <= 220) return 4;
  return 5;
}

/* Une la configuración general con la parte "congelada" de una cotización guardada. */
function configEfectiva(config, cot) {
  const base = Object.assign({}, CONFIG_DEFECTO, config || {});
  const cong = (cot && cot.configCongelada) || {};
  const out = Object.assign({}, base, cong);
  out.tiempos = Object.assign({}, CONFIG_DEFECTO.tiempos, base.tiempos || {}, cong.tiempos || {});
  return out;
}

/* Partes de la configuración que afectan el precio y se congelan al guardar. */
function extraerConfigCongelable(config) {
  const c = configEfectiva(config, null);
  return {
    tiempos: Object.assign({}, c.tiempos),
    insumosPorPlancha: c.insumosPorPlancha,
    alturaZocalo: c.alturaZocalo,
    tapacantoCuerpoId: c.tapacantoCuerpoId,
    tapacantoFrenteId: c.tapacantoFrenteId
  };
}

/* ============================================================
   CATÁLOGO DE PRECIOS
   Busca materiales y herrajes por id. Si la cotización tiene
   precios "congelados" (guardados el día que se cotizó), usa
   esos primero; así una cotización antigua no cambia sola
   cuando actualizas los precios.
   ============================================================ */
function crearCatalogo(materiales, herrajes, congelados) {
  const snapM = (congelados && congelados.materiales) || {};
  const snapH = (congelados && congelados.herrajes) || {};
  const mapM = {}; (materiales || []).forEach(m => { mapM[m.id] = m; });
  const mapH = {}; (herrajes || []).forEach(h => { mapH[h.id] = h; });
  const lista = (base, mapa, snap) => {
    const out = base.map(x => snap[x.id] || x);
    Object.keys(snap).forEach(id => { if (!mapa[id]) out.push(snap[id]); });
    return out;
  };
  return {
    mat: id => snapM[id] || mapM[id] || null,
    her: id => snapH[id] || mapH[id] || null,
    listaMateriales: () => lista(materiales || [], mapM, snapM),
    listaHerrajes: () => lista(herrajes || [], mapH, snapH),
    congelado: !!congelados
  };
}

/* Guarda una copia de los precios usados por la cotización. */
function congelarPrecios(resultado, catalogo) {
  const out = { materiales: {}, herrajes: {} };
  resultado.lineasMat.forEach(l => { const m = catalogo.mat(l.materialId); if (m) out.materiales[l.materialId] = JSON.parse(JSON.stringify(m)); });
  resultado.lineasHer.forEach(l => { const h = catalogo.her(l.herrajeId); if (h) out.herrajes[l.herrajeId] = JSON.parse(JSON.stringify(h)); });
  return out;
}

/* ¿Algún precio congelado es distinto al precio actual de las Bases? */
function preciosCambiaron(cot, materiales, herrajes, config) {
  if (!cot || !cot.precios) return false;
  const igual = (a, b) => b && num(a.precio) === num(b.precio) && a.unidad === b.unidad &&
    num(a.largo) === num(b.largo) && num(a.ancho) === num(b.ancho);
  const bm = {}; materiales.forEach(m => { bm[m.id] = m; });
  const bh = {}; herrajes.forEach(h => { bh[h.id] = h; });
  for (const id in cot.precios.materiales) if (!igual(cot.precios.materiales[id], bm[id])) return true;
  for (const id in cot.precios.herrajes) if (!bh[id] || num(cot.precios.herrajes[id].precio) !== num(bh[id].precio)) return true;
  if (cot.configCongelada && JSON.stringify(cot.configCongelada) !== JSON.stringify(extraerConfigCongelable(config))) return true;
  return false;
}

/* ============================================================
   MUEBLES Y COTIZACIONES NUEVAS
   ============================================================ */
function idCorto(prefijo) {
  return prefijo + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* Crea un mueble a partir de una plantilla. Si se pasa "actual",
   conserva sus datos propios (id, color, materiales, extras...). */
function muebleDesdePlantilla(p, actual) {
  const base = {
    id: idCorto("M"),
    modo: "constructor",
    descripcion: "", cantidad: 1, color: "",
    matCuerpo: "mel18", matFrentes: "mel18", matFondo: "hdf3", espesor: 18,
    matCubierta: "cubierta", tipoBisagra: "bis_suave", tipoCorredera: "corr_tel",
    extrasMat: [], extrasHer: [],
    horasManual: false, horas: { diseno: 0, fab: 0, inst: 0 }
  };
  const m = Object.assign(base, actual ? JSON.parse(JSON.stringify(actual)) : {});
  Object.assign(m, {
    tipo: p.tipo, alto: p.alto, ancho: p.ancho, prof: p.prof,
    modulos: p.modulos, repisas: p.repisas, cajones: p.cajones, altoCajon: p.altoCajon,
    puertas: p.puertas, tipoPuerta: p.tipoPuerta, barras: p.barras, base: p.base,
    cubierta: !!p.cubierta, dificultad: p.dificultad || "media",
    horasManual: false, modo: "constructor"
  });
  if (p.fondo === false) m.matFondo = "";
  else if (!m.matFondo) m.matFondo = "hdf3";
  return m;
}

function nuevaCotizacionVacia(config, plantillas) {
  const c = configEfectiva(config, null);
  const ahora = new Date().toISOString();
  return {
    id: idCorto("COT-"), numero: null, estado: "pendiente", version: 2,
    creada: ahora, actualizada: ahora,
    cliente: { nombre: "", telefono: "", correo: "", direccion: "", observaciones: "" },
    muebles: [muebleDesdePlantilla((plantillas && plantillas[0]) || PLANTILLAS_DEFECTO[0])],
    requiereInstalacion: true, requiereDespacho: false, despacho: 0, otros: 0,
    parametros: {
      mermaPct: c.mermaPct, indirectosPct: c.indirectosPct, imprevistosPct: c.imprevistosPct,
      margenPct: c.margenPct, descuentoPct: c.descuentoPct, valorHora: c.valorHora,
      ivaActivo: !!c.ivaActivo, planchasCompletas: !!c.planchasCompletas
    },
    precios: null, configCongelada: null, preciosFecha: null
  };
}

/* ============================================================
   1. GEOMETRÍA DEL MUEBLE
   Todas las medidas en cm, con origen abajo a la izquierda.
   La usan el despiece y el dibujo, así siempre coinciden.
   ============================================================ */
function geometria(m, config) {
  const H = num(m.alto, 0), W = num(m.ancho, 0), D = num(m.prof, 0);
  const e = (num(m.espesor, 18) || 18) / 10;
  const N = Math.max(1, Math.round(num(m.modulos, 1)));
  const R = Math.max(0, Math.round(num(m.repisas, 0)));
  const C = Math.max(0, Math.round(num(m.cajones, 0)));
  const hc = Math.max(5, num(m.altoCajon, 18));
  const tipoPuerta = m.tipoPuerta || "ninguna";
  const P = tipoPuerta === "ninguna" ? 0 : Math.max(0, Math.round(num(m.puertas, 0)));
  const B = Math.max(0, Math.round(num(m.barras, 0)));
  const z = m.base === "zocalo" ? num(config && config.alturaZocalo, 8) : 0;
  const Wi = W - 2 * e;              // ancho interior
  const Hi = H - 2 * e - z;          // alto interior
  const Wm = (Wi - (N - 1) * e) / N; // ancho de cada módulo
  const ok = H > 0 && W > 0 && D > 0 && Wi > 0 && Hi > 0 && Wm > 0;

  const modulos = [];
  for (let i = 0; i < N; i++) { const x0 = e + i * (Wm + e); modulos.push({ x0, x1: x0 + Wm }); }
  const modCajones = C > 0 ? 0 : -1;  // los cajones van en el primer módulo
  const pisoY = z + e, techoY = H - e;

  // Puertas: zona que cubren
  let puertas = null;
  if (P > 0 && ok) {
    let zona;
    if (tipoPuerta === "corredera") zona = { x0: e, x1: W - e, y0: pisoY, y1: techoY };
    else if (C > 0 && N > 1) zona = { x0: modulos[1].x0 - e / 2, x1: W, y0: z, y1: H }; // cajonera a la vista
    else if (C > 0) zona = { x0: 0, x1: W, y0: Math.min(H, pisoY + C * hc), y1: H };     // cajones abajo, puerta arriba
    else zona = { x0: 0, x1: W, y0: z, y1: H };
    const anchoZona = zona.x1 - zona.x0, altoZona = zona.y1 - zona.y0;
    puertas = tipoPuerta === "corredera"
      ? { tipo: tipoPuerta, n: P, zona, ancho: anchoZona / P + 2, alto: altoZona - 1 }
      : { tipo: tipoPuerta, n: P, zona, ancho: anchoZona / P - 0.3, alto: altoZona - 0.3 };
  }

  // Barras de colgar: desde el último módulo, evitando la cajonera
  const barras = new Array(N).fill(0);
  const candB = [];
  for (let i = N - 1; i >= 0; i--) if (!(i === modCajones && N > 1)) candB.push(i);
  if (!candB.length) candB.push(0);
  for (let k = 0; k < B; k++) barras[candB[k % candB.length]]++;

  // Repisas: primero en módulos sin barra
  const repisas = new Array(N).fill(0);
  let candR = [];
  for (let i = 0; i < N; i++) if (!barras[i]) candR.push(i);
  if (!candR.length) candR = modulos.map((_, i) => i);
  candR.sort((a, b) => (a === modCajones) - (b === modCajones));
  for (let k = 0; k < R; k++) repisas[candR[k % candR.length]]++;

  return { ok, H, W, D, e, N, R, C, hc, P, B, z, Wi, Hi, Wm, modulos, modCajones,
           pisoY, techoY, puertas, tipoPuerta, barras, repisas };
}

/* ============================================================
   2. DESPIECE (lista de corte) — por UNA unidad del mueble
   ============================================================ */
function generarDespiece(m, g, catalogo) {
  if (!g.ok) return [];
  const piezas = [];
  const cuerpo = m.matCuerpo, frente = m.matFrentes || m.matCuerpo, fondo = m.matFondo;
  const add = (grupo, nombre, cant, largo, ancho, materialId, cantoCm, tipoCanto) => {
    if (cant > 0 && largo > 0 && ancho > 0 && materialId) {
      piezas.push({ grupo, nombre, cant, largo: r1(largo), ancho: r1(ancho), materialId, cantoCm: r1(cantoCm), tipoCanto });
    }
  };
  const { H, W, D, e, N, R, C, hc, z, Wi, Hi, Wm } = g;

  add("Cuerpo", "Lateral", 2, H, D, cuerpo, H, "cuerpo");
  add("Cuerpo", "Techo", 1, Wi, D, cuerpo, Wi, "cuerpo");
  add("Cuerpo", "Piso", 1, Wi, D, cuerpo, Wi, "cuerpo");
  if (z) add("Cuerpo", "Zócalo", 1, Wi, z, cuerpo, Wi, "cuerpo");
  if (N > 1) add("Cuerpo", "División", N - 1, Hi, D, cuerpo, Hi, "cuerpo");
  if (R) add("Cuerpo", "Repisa", R, Wm - 0.2, D - 2, cuerpo, Wm - 0.2, "cuerpo");
  if (fondo) {
    // Si el fondo no cabe en una plancha, se hace en varias partes (práctica normal de taller)
    const matF = catalogo && catalogo.mat(fondo);
    let partes = 1;
    if (matF && matF.unidad === "plancha") {
      const L = num(matF.largo), A = num(matF.ancho);
      const cabe = (l, a) => (l <= L && a <= A) || (l <= A && a <= L);
      while (partes < 6 && !cabe(H - 0.5, (W - 0.5) / partes)) partes++;
    }
    add("Cuerpo", partes > 1 ? `Fondo (en ${partes} partes)` : "Fondo", partes, H - 0.5, (W - 0.5) / partes, fondo, 0, "");
  }

  if (C) {
    const anchoCaja = Wm - 2.6;   // 1,3 cm por lado para las correderas
    const largoCaja = D - 5;
    add("Cajones", "Frente de cajón", C, Wm - 0.4, hc - 0.3, frente, 2 * ((Wm - 0.4) + (hc - 0.3)), "frente");
    add("Cajones", "Costado de cajón", 2 * C, largoCaja, hc - 5, cuerpo, largoCaja, "cuerpo");
    add("Cajones", "Contrafrente / trasera", 2 * C, anchoCaja - 2 * e, hc - 6, cuerpo, anchoCaja - 2 * e, "cuerpo");
    add("Cajones", "Piso de cajón", C, anchoCaja, largoCaja, fondo || cuerpo, 0, "");
  }

  if (g.puertas) {
    const p = g.puertas;
    const nombre = p.tipo === "corredera" ? "Puerta corredera" : "Puerta batiente";
    add("Puertas", nombre, p.n, p.alto, p.ancho, frente, 2 * (p.alto + p.ancho), "frente");
  }
  return piezas;
}

/* ============================================================
   3a. CONSUMO DE MATERIAL de un mueble (ya × cantidad)
   Devuelve { materialId: cantidad } en m² (tableros) o
   m lineales (tapacantos y cubiertas).
   ============================================================ */
function consumoMueble(m, g, despiece, config) {
  const q = Math.max(1, Math.round(num(m.cantidad, 1)));
  const c = {};
  const sumar = (id, v) => { if (id && v > 0) c[id] = (c[id] || 0) + v; };
  despiece.forEach(p => {
    sumar(p.materialId, p.cant * p.largo * p.ancho / 10000 * q);
    if (p.cantoCm > 0) {
      const idCanto = p.tipoCanto === "frente" ? config.tapacantoFrenteId : config.tapacantoCuerpoId;
      sumar(idCanto, p.cant * p.cantoCm / 100 * q);
    }
  });
  if (m.cubierta && m.matCubierta && g.ok) sumar(m.matCubierta, (g.W / 100) * q);
  return c;
}

/* ============================================================
   3b. HERRAJES AUTOMÁTICOS (ya × cantidad)
   ============================================================ */
function herrajesAuto(m, g, despiece) {
  const q = Math.max(1, Math.round(num(m.cantidad, 1)));
  const lista = [];
  const add = (id, cant, motivo) => { if (id && cant > 0) lista.push({ herrajeId: id, cantidad: cant, motivo }); };
  const p = g.puertas;
  if (p && p.tipo === "batiente") {
    const nb = bisagrasPorPuerta(p.alto);
    add(m.tipoBisagra || "bis_suave", p.n * nb * q, `${p.n} puerta(s) × ${nb} bisagras`);
    add("tirador", p.n * q, "1 por puerta");
  }
  if (p && p.tipo === "corredera") {
    add("riel_corr", q, "sistema de correderas");
    add("tirador", p.n * q, "1 por hoja");
  }
  if (g.C) {
    add(m.tipoCorredera || "corr_tel", g.C * q, `1 par por cajón`);
    add("tirador", g.C * q, "1 por cajón");
  }
  if (g.B) add("barra", g.B * q, "barra de colgar");
  if (g.R) add("soporte", g.R * 2 * q, "2 pares por repisa");
  if (m.base === "patas") add("pata", (4 + 2 * (g.N - 1)) * q, "patas regulables");
  const piezas = despiece.reduce((s, x) => s + x.cant, 0);
  if (piezas) add("tornillos", Math.max(1, Math.ceil(piezas / 30)) * q, `${piezas} piezas`);

  // Agrupar por herraje
  const agrupado = {};
  lista.forEach(x => {
    if (!agrupado[x.herrajeId]) agrupado[x.herrajeId] = { herrajeId: x.herrajeId, cantidad: 0, motivos: [] };
    agrupado[x.herrajeId].cantidad += x.cantidad;
    agrupado[x.herrajeId].motivos.push(x.motivo);
  });
  return Object.keys(agrupado).map(id => ({
    herrajeId: id, cantidad: agrupado[id].cantidad, motivo: agrupado[id].motivos.join(" + ")
  }));
}

/* ============================================================
   3c. HORAS SUGERIDAS (ya × dificultad y × cantidad)
   ============================================================ */
function horasSugeridas(m, g, despiece, config) {
  if (!g.ok) return { diseno: 0, fab: 0, inst: 0 };
  const t = Object.assign({}, CONFIG_DEFECTO.tiempos, config.tiempos || {});
  const f = (DIFICULTAD[m.dificultad] || DIFICULTAD.media).factor;
  const q = Math.max(1, Math.round(num(m.cantidad, 1)));
  const piezasCuerpo = despiece.filter(p => p.grupo === "Cuerpo").reduce((s, p) => s + p.cant, 0);
  const bat = g.puertas && g.puertas.tipo === "batiente";
  const corr = g.puertas && g.puertas.tipo === "corredera";
  const diseno = (t.disenoBase + g.N * t.disenoPorModulo) * f;
  const fab = (t.fabBase + piezasCuerpo * t.minPorPieza / 60 + g.C * t.porCajon +
               (bat ? g.P * t.porPuerta : 0) + (corr ? t.correderas : 0) + (m.cubierta ? 0.5 : 0)) * f * q;
  const inst = (t.instBase + g.N * t.instPorModulo + (corr ? 0.5 : 0) + (m.cubierta ? 0.5 : 0)) * f * q;
  return { diseno: redondearHoras(diseno), fab: redondearHoras(fab), inst: redondearHoras(inst) };
}

/* ============================================================
   3d. ALERTAS DE FABRICACIÓN (errores comunes que cuestan plata)
   ============================================================ */
function alertasMueble(m, g, despiece, catalogo) {
  const a = [];
  const nombre = m.tipo || "Mueble";
  if (m.modo === "manual") return a;
  if (!(num(m.alto) > 0 && num(m.ancho) > 0 && num(m.prof) > 0)) {
    a.push({ nivel: "error", texto: `${nombre}: faltan medidas (alto, ancho y profundidad).` });
    return a;
  }
  if (!g.ok) {
    a.push({ nivel: "error", texto: `${nombre}: las medidas son muy pequeñas para tantos módulos o tanto zócalo.` });
    return a;
  }
  if (g.C && g.C * g.hc > g.Hi + 0.01) {
    a.push({ nivel: "error", texto: `${nombre}: no caben ${g.C} cajones de ${g.hc} cm (alto interior ${r1(g.Hi)} cm; caben ${Math.floor(g.Hi / g.hc)}).` });
  }
  if (g.C) {
    const corr = catalogo.her(m.tipoCorredera || "corr_tel");
    const largo = corr && /(\d+)\s*cm/.exec(corr.nombre);
    if (largo && Number(largo[1]) > g.D - 5) {
      const sugerido = Math.floor((g.D - 5) / 5) * 5;
      a.push({ nivel: "aviso", texto: `${nombre}: con ${g.D} cm de profundidad no caben correderas de ${largo[1]} cm. Usa correderas de ${sugerido} cm (agrega ese herraje en Bases y selecciónalo).` });
    }
  }
  if ((g.R || g.B) && g.Wm > 90) {
    a.push({ nivel: "aviso", texto: `${nombre}: módulos de ${r1(g.Wm)} cm. Repisas o barras de más de 90 cm se pandean: agrega un módulo más.` });
  }
  if (g.puertas && g.puertas.tipo === "batiente" && g.puertas.ancho > 60) {
    a.push({ nivel: "aviso", texto: `${nombre}: puertas de ${Math.round(g.puertas.ancho)} cm de ancho. Sobre 60 cm pesan y se descuadran: usa más puertas.` });
  }
  if (g.puertas && g.puertas.tipo === "corredera" && g.P < 2) {
    a.push({ nivel: "aviso", texto: `${nombre}: las puertas correderas necesitan al menos 2 hojas.` });
  }
  const vistos = {};
  despiece.forEach(p => {
    const mat = catalogo.mat(p.materialId);
    if (!mat) {
      if (!vistos["x" + p.materialId]) a.push({ nivel: "error", texto: `${nombre}: el material "${p.materialId}" ya no existe en Bases.` });
      vistos["x" + p.materialId] = 1;
      return;
    }
    if (mat.unidad !== "plancha" || vistos[p.nombre]) return;
    const L = num(mat.largo), A = num(mat.ancho);
    const cabe = (p.largo <= L && p.ancho <= A) || (p.largo <= A && p.ancho <= L);
    if (!cabe) {
      vistos[p.nombre] = 1;
      a.push({ nivel: "aviso", texto: `${nombre}: la pieza "${p.nombre}" (${p.largo} × ${p.ancho} cm) no cabe en una plancha de ${L} × ${A} cm. Necesita unión o material especial.` });
    }
  });
  return a;
}

/* ============================================================
   3e. "QUÉ INCLUYE" — texto para el cliente
   ============================================================ */
function textoIncluye(m, g, catalogo) {
  if (m.modo === "manual" || !g.ok) return [];
  // Nombre para usar dentro de una frase: sin notas entre paréntesis y sin
  // pasar a minúsculas las siglas (MDF, HDF, PVC)
  const nom = id => {
    const x = catalogo.her(id) || catalogo.mat(id);
    if (!x) return "";
    const n = x.nombre.replace(/\s*\([^)]*\)/g, "").trim();
    return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n;
  };
  const pl = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const out = [];
  if (g.N > 1) out.push(pl(g.N, "módulo", "módulos"));
  if (g.R) out.push(pl(g.R, "repisa", "repisas"));
  if (g.C) out.push(`${pl(g.C, "cajón", "cajones")} con ${nom(m.tipoCorredera || "corr_tel").replace(/\s*\(par\)/, "") || "correderas"}`);
  if (g.puertas && g.puertas.tipo === "batiente") out.push(`${pl(g.P, "puerta", "puertas")} con ${nom(m.tipoBisagra || "bis_suave") || "bisagras"}`);
  if (g.puertas && g.puertas.tipo === "corredera") out.push(`${pl(g.P, "puerta corredera", "puertas correderas")} con riel`);
  if (g.B) out.push(pl(g.B, "barra de colgar", "barras de colgar"));
  if (m.base === "zocalo") out.push("zócalo");
  if (m.base === "patas") out.push("patas regulables");
  if (m.matFondo) out.push(`fondo en ${nom(m.matFondo)}`);
  if (m.cubierta && m.matCubierta) out.push(nom(m.matCubierta));
  out.push("cantos sellados con tapacanto PVC");
  return out;
}

/* ============================================================
   4. COSTEO DE MATERIALES
   Con "planchas completas" se cobran las planchas enteras que se
   compran (la diferencia aparece como merma/sobrante).
   ============================================================ */
function costearMateriales(consumo, catalogo, p) {
  const merma = num(p.mermaPct, 0) / 100;
  return Object.keys(consumo).map(id => {
    const cantidad = consumo[id];
    const mat = catalogo.mat(id);
    if (!mat) return { materialId: id, nombre: "(material no encontrado)", unidad: "", cantidad, planchas: 0, neto: 0, compra: 0, precio: 0 };
    let neto, compra, planchas = 0;
    const precio = num(mat.precio, 0);
    if (mat.unidad === "plancha") {
      const a = areaPlanchaM2(mat);
      neto = a > 0 ? cantidad / a * precio : 0;
      const necesarias = a > 0 ? cantidad * (1 + merma) / a : 0;
      if (p.planchasCompletas) { planchas = Math.ceil(necesarias - 1e-9); compra = planchas * precio; }
      else { planchas = necesarias; compra = neto * (1 + merma); }
    } else if (mat.unidad === "un") {
      neto = compra = cantidad * precio;
    } else {
      neto = cantidad * precio;
      compra = neto * (1 + merma);
    }
    return { materialId: id, nombre: mat.nombre, unidad: mat.unidad, cantidad, planchas, neto, compra, precio };
  });
}

/* ============================================================
   5. LA FÓRMULA DE COTIZACIÓN
   ------------------------------------------------------------
   Materiales (neto) + Merma/sobrante + Herrajes + Insumos
   + Mano de obra (diseño + fabricación) + Instalación
   + Despacho + Otros                       = Subtotal de costos
   + Gastos generales % + Imprevistos %     = Costo total
   Precio neto = Costo total / (1 − Margen%)   ← margen REAL
   − Descuento %  + IVA % (si está activo)  = PRECIO AL CLIENTE
   ============================================================ */
function calcularCotizacion(cot, config, catalogo) {
  const cfg = configEfectiva(config, cot);
  const pr = cot.parametros || {};
  const p = {
    mermaPct: num(pr.mermaPct, cfg.mermaPct),
    indirectosPct: num(pr.indirectosPct, cfg.indirectosPct),
    imprevistosPct: num(pr.imprevistosPct, cfg.imprevistosPct),
    margenPct: Math.min(95, num(pr.margenPct, cfg.margenPct)),
    descuentoPct: num(pr.descuentoPct, cfg.descuentoPct),
    valorHora: num(pr.valorHora, cfg.valorHora),
    ivaActivo: pr.ivaActivo !== undefined ? !!pr.ivaActivo : !!cfg.ivaActivo,
    ivaPct: num(pr.ivaPct, cfg.ivaPct),
    planchasCompletas: pr.planchasCompletas !== undefined ? !!pr.planchasCompletas : !!cfg.planchasCompletas
  };

  const consumoTotal = {};
  const extras = [];
  const herMap = {};
  const horas = { diseno: 0, fab: 0, inst: 0 };
  const alertas = [];

  const muebles = (cot.muebles || []).map(m => {
    const constructor = m.modo !== "manual";
    const g = geometria(m, cfg);
    const despiece = constructor ? generarDespiece(m, g, catalogo) : [];
    const consumo = constructor ? consumoMueble(m, g, despiece, cfg) : {};
    const herAuto = constructor ? herrajesAuto(m, g, despiece) : [];
    const sug = constructor ? horasSugeridas(m, g, despiece, cfg) : { diseno: 0, fab: 0, inst: 0 };
    const hs = m.horas || {};
    const h = (m.horasManual || !constructor)
      ? { diseno: num(hs.diseno, 0), fab: num(hs.fab, 0), inst: num(hs.inst, 0) }
      : sug;

    const herExtras = (m.extrasHer || []).map(l => ({ herrajeId: l.herrajeId, cantidad: num(l.cantidad, 0), motivo: "agregado a mano", extra: true }));
    const herrajes = herAuto.concat(herExtras);
    const extrasMat = (m.extrasMat || []).map(l => {
      const mat = catalogo.mat(l.materialId);
      const cant = num(l.cantidad, 0);
      const precio = mat ? num(mat.precio, 0) : 0;
      return { materialId: l.materialId, nombre: mat ? mat.nombre : "(material no encontrado)", unidad: mat ? mat.unidad : "",
               cantidad: cant, planchas: mat && mat.unidad === "plancha" ? cant : 0, neto: cant * precio, compra: cant * precio, precio, extra: true };
    });

    Object.keys(consumo).forEach(id => { consumoTotal[id] = (consumoTotal[id] || 0) + consumo[id]; });
    extras.push.apply(extras, extrasMat);
    herrajes.forEach(x => { herMap[x.herrajeId] = (herMap[x.herrajeId] || 0) + x.cantidad; });
    horas.diseno += h.diseno; horas.fab += h.fab; horas.inst += h.inst;
    const al = alertasMueble(m, g, despiece, catalogo);
    alertas.push.apply(alertas, al);

    return { id: m.id, mueble: m, g, despiece, consumo, herrajes, horas: h, horasSugeridas: sug,
             alertas: al, extrasMat, incluye: textoIncluye(m, g, catalogo) };
  });

  // Materiales
  const lineasAuto = costearMateriales(consumoTotal, catalogo, p);
  const lineasMat = lineasAuto.concat(extras);
  const costoMateriales = lineasMat.reduce((s, l) => s + l.neto, 0);
  const merma = lineasMat.reduce((s, l) => s + (l.compra - l.neto), 0);
  const planchas = lineasMat.reduce((s, l) => s + (l.planchas || 0), 0);
  const insumos = planchas * num(cfg.insumosPorPlancha, 0);

  // Herrajes
  const lineasHer = Object.keys(herMap).map(id => {
    const h = catalogo.her(id);
    const precio = h ? num(h.precio, 0) : 0;
    return { herrajeId: id, nombre: h ? h.nombre : "(herraje no encontrado)", precio, cantidad: herMap[id], total: precio * herMap[id] };
  });
  const costoHerrajes = lineasHer.reduce((s, l) => s + l.total, 0);

  // Mano de obra, instalación, despacho
  const manoObra = (horas.diseno + horas.fab) * p.valorHora;
  const instalacion = cot.requiereInstalacion ? horas.inst * p.valorHora : 0;
  const despacho = cot.requiereDespacho ? num(cot.despacho, 0) : 0;
  const otros = num(cot.otros, 0);

  const subtotalCosto = costoMateriales + merma + costoHerrajes + insumos + manoObra + instalacion + despacho + otros;
  const indirectos = subtotalCosto * p.indirectosPct / 100;
  const imprevistos = (subtotalCosto + indirectos) * p.imprevistosPct / 100;
  const costoTotal = subtotalCosto + indirectos + imprevistos;
  const divisor = 1 - p.margenPct / 100;
  const precioNeto = divisor > 0 ? costoTotal / divisor : costoTotal;
  const descuento = precioNeto * p.descuentoPct / 100;
  const netoFinal = precioNeto - descuento;
  const iva = p.ivaActivo ? netoFinal * p.ivaPct / 100 : 0;
  const total = netoFinal + iva;
  const ganancia = netoFinal - costoTotal;
  const gananciaPct = netoFinal > 0 ? ganancia / netoFinal * 100 : 0;

  // Montos redondeados para mostrar: siempre suman exacto en el documento
  const rSub = Math.round(precioNeto), rDesc = Math.round(descuento), rNeto = rSub - rDesc;
  const rIva = p.ivaActivo ? Math.round(rNeto * p.ivaPct / 100) : 0;
  const redondeado = { subtotal: rSub, descuento: rDesc, neto: rNeto, iva: rIva, total: rNeto + rIva };

  // Reparto del precio (antes de descuento) entre los muebles, proporcional a su costo directo
  const lineaPorId = {}; lineasAuto.forEach(l => { lineaPorId[l.materialId] = l; });
  const directos = muebles.map(info => {
    let mat = 0, mer = 0;
    Object.keys(info.consumo).forEach(id => {
      const l = lineaPorId[id];
      if (l && consumoTotal[id] > 0) {
        const parte = info.consumo[id] / consumoTotal[id];
        mat += l.neto * parte; mer += (l.compra - l.neto) * parte;
      }
    });
    info.extrasMat.forEach(l => { mat += l.neto; });
    const her = info.herrajes.reduce((s, x) => { const hh = catalogo.her(x.herrajeId); return s + (hh ? num(hh.precio, 0) : 0) * x.cantidad; }, 0);
    const lab = (info.horas.diseno + info.horas.fab + (cot.requiereInstalacion ? info.horas.inst : 0)) * p.valorHora;
    const ins = (costoMateriales + merma) > 0 ? insumos * (mat + mer) / (costoMateriales + merma) : 0;
    return mat + mer + her + lab + ins;
  });
  const sumaDirectos = directos.reduce((s, x) => s + x, 0);
  let acumulado = 0;
  muebles.forEach((info, i) => {
    const parte = sumaDirectos > 0 ? directos[i] / sumaDirectos : 1 / muebles.length;
    info.costoDirecto = directos[i];
    info.precio = i === muebles.length - 1 ? rSub - acumulado : Math.round(rSub * parte);
    acumulado += info.precio;
  });

  // Alertas generales
  if (!muebles.length) alertas.push({ nivel: "error", texto: "La cotización no tiene muebles." });
  if (lineasMat.some(l => l.cantidad > 0 && l.precio === 0)) alertas.push({ nivel: "aviso", texto: "Hay materiales con precio $0. Revisa la pestaña Bases." });
  if (lineasHer.some(l => l.cantidad > 0 && l.precio === 0)) alertas.push({ nivel: "aviso", texto: "Hay herrajes con precio $0. Revisa la pestaña Bases." });
  if (p.valorHora <= 0) alertas.push({ nivel: "aviso", texto: "El valor hora está en $0: la mano de obra no se está cobrando." });
  const minimo = num(cfg.margenMinimoPct, 0);
  if (netoFinal > 0 && gananciaPct < minimo) {
    alertas.push({ nivel: "error", texto: `Margen real de ${Math.round(gananciaPct)}%: está bajo tu mínimo de ${minimo}%. Revisa el descuento o el margen.` });
  }

  return {
    muebles, lineasMat, lineasHer, horas, planchas,
    costoMateriales, merma, costoHerrajes, insumos, manoObra, instalacion, despacho, otros,
    subtotalCosto, indirectos, imprevistos, costoTotal,
    precioNeto, descuento, netoFinal, iva, total, ganancia, gananciaPct, redondeado,
    alertas, parametros: p
  };
}

/* ============================================================
   6. MIGRACIÓN DE DATOS DE LA VERSIÓN 1
   Convierte lo guardado con la primera versión del cotizador.
   ============================================================ */
const MATERIALES_V1 = {
  mel15: 9000, mel18: 10500, mdf15: 8500, mdf18: 10000, ter15: 12000, pino: 18000, cubierta: 25000, tapacanto: 400
};

function migrarDatosV1(d) {
  const out = JSON.parse(JSON.stringify(d));
  // Materiales sin editar desde la v1 → se reemplazan por la versión nueva
  const aPlancha = {}; // id → área de la plancha (para convertir m² en planchas)
  out.materiales = (out.materiales || []).map(m => {
    const nuevo = MATERIALES_DEFECTO.find(x => x.id === m.id);
    const sinEditar = MATERIALES_V1[m.id] !== undefined && num(m.precio) === MATERIALES_V1[m.id] && m.unidad !== "plancha";
    if (!(nuevo && sinEditar)) return m;
    if (m.unidad === "m2" && nuevo.unidad === "plancha") aPlancha[m.id] = areaPlanchaM2(nuevo);
    return JSON.parse(JSON.stringify(nuevo));
  });
  MATERIALES_DEFECTO.forEach(m => { if (!out.materiales.some(x => x.id === m.id)) out.materiales.push(JSON.parse(JSON.stringify(m))); });
  // Herrajes nuevos
  out.herrajes = out.herrajes || [];
  HERRAJES_DEFECTO.forEach(h => { if (!out.herrajes.some(x => x.id === h.id)) out.herrajes.push(JSON.parse(JSON.stringify(h))); });
  // Plantillas: la v1 solo tenía horas; se reemplazan por las del constructor
  if (!out.plantillas || !out.plantillas.length || out.plantillas[0].modulos === undefined) {
    out.plantillas = JSON.parse(JSON.stringify(PLANTILLAS_DEFECTO));
  }
  out.cotizaciones = (out.cotizaciones || []).map(c => {
    if (c.version >= 2) return c;
    const nueva = migrarCotizacionV1(c);
    nueva.muebles.forEach(m => m.extrasMat.forEach(l => {
      if (aPlancha[l.materialId]) l.cantidad = Math.round(num(l.cantidad) / aPlancha[l.materialId] * 100) / 100;
    }));
    return nueva;
  });
  return out;
}

function migrarCotizacionV1(c) {
  const pro = c.proyecto || {}, fm = c.formulario || {}, cli = c.cliente || {};
  const difKey = Object.keys(DIFICULTAD).find(k => DIFICULTAD[k].etiqueta === pro.dificultad) || "media";
  const f = DIFICULTAD[difKey].factor; // en la v1 las horas se multiplicaban por la dificultad
  const mueble = {
    id: idCorto("M"), modo: "manual",
    tipo: pro.tipo || "Mueble", descripcion: pro.descripcion || "", cantidad: num(pro.cantidad, 1) || 1,
    alto: pro.alto || "", ancho: pro.ancho || "", prof: pro.prof || "", color: pro.color || "", dificultad: difKey,
    matCuerpo: "mel18", matFrentes: "mel18", matFondo: "hdf3", espesor: 18, matCubierta: "cubierta",
    tipoBisagra: "bis_suave", tipoCorredera: "corr_tel",
    modulos: 1, repisas: 0, cajones: 0, altoCajon: 18, puertas: 0, tipoPuerta: "ninguna", barras: 0, base: "ninguna", cubierta: false,
    extrasMat: (c.lineasMat || []).map(l => ({ materialId: l.materialId, cantidad: l.cantidad })),
    extrasHer: (c.lineasHer || []).map(l => ({ herrajeId: l.herrajeId, cantidad: l.cantidad })),
    horasManual: true,
    horas: { diseno: r1(num(fm.hDiseno) * f), fab: r1(num(fm.hFab) * f), inst: r1(num(fm.hInst) * f) }
  };
  const r = c.resultado || {};
  return {
    id: c.id, numero: c.numero || null, estado: c.estado || "pendiente", version: 2,
    creada: c.fecha || new Date().toISOString(), actualizada: c.fecha || new Date().toISOString(),
    cliente: { nombre: cli.nombre || "", telefono: cli.telefono || "", correo: cli.correo || "", direccion: cli.direccion || "", observaciones: cli.observaciones || "" },
    muebles: [mueble],
    requiereInstalacion: !!pro.requiereInstalacion, requiereDespacho: !!pro.requiereDespacho,
    despacho: num(fm.despacho, 0), otros: num(fm.otros, 0),
    parametros: {
      mermaPct: num(fm.merma, CONFIG_DEFECTO.mermaPct), indirectosPct: num(fm.indirectos, CONFIG_DEFECTO.indirectosPct),
      imprevistosPct: num(fm.imprevistos, CONFIG_DEFECTO.imprevistosPct), margenPct: num(fm.margen, CONFIG_DEFECTO.margenPct),
      descuentoPct: num(fm.descuento, 0), valorHora: num(fm.valorHora, CONFIG_DEFECTO.valorHora),
      ivaActivo: !!fm.ivaActivo, planchasCompletas: false
    },
    precios: null, configCongelada: null, preciosFecha: null,
    resumen: { total: num(r.total, 0), neto: num(r.netoFinal, 0), costo: num(r.costoTotal, 0), muebles: [mueble.tipo] }
  };
}
