/* ============================================================
   MAVIMUEBLES — Cotizador
   Archivo: js/app.js
   ------------------------------------------------------------
   La aplicación: conecta los formularios con el motor de
   cálculo (js/calculo.js) y el dibujo (js/dibujo.js), guarda en
   el navegador (localStorage), arma el historial, las bases
   editables y el documento de cotización para imprimir/PDF.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Atajos ---------- */
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const copia = (o) => JSON.parse(JSON.stringify(o));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
  const setPath = (o, p, v) => {
    const ks = p.split("."); let a = o;
    ks.slice(0, -1).forEach(k => { if (a[k] == null || typeof a[k] !== "object") a[k] = {}; a = a[k]; });
    a[ks[ks.length - 1]] = v;
  };
  const fechaCorta = (iso) => { const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleDateString("es-CL"); };
  const dec = (x, n) => (Math.round(x * Math.pow(10, n)) / Math.pow(10, n)).toLocaleString("es-CL");

  /* ---------- Guardado en el navegador ---------- */
  const K = {
    config: "mavi_config", materiales: "mavi_materiales", herrajes: "mavi_herrajes",
    plantillas: "mavi_plantillas", cotizaciones: "mavi_cotizaciones", version: "mavi_version"
  };
  function leer(clave) {
    try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); return true; }
    catch (e) { toast("No se pudo guardar en este navegador (almacenamiento lleno o bloqueado). Descarga un respaldo en Ajustes.", "error"); return false; }
  }

  function normalizarConfig(c) {
    const out = Object.assign(copia(CONFIG_DEFECTO), c || {});
    out.tiempos = Object.assign({}, CONFIG_DEFECTO.tiempos, (c && c.tiempos) || {});
    out.empresa = Object.assign(copia(EMPRESA_DEFECTO), (c && c.empresa) || {});
    out.gastosGenerales = Object.assign({
      arriendo: 0, servicios: 0, telefono: 0, vehiculo: 0, otros: 0,
      herramientasValor: 0, herramientasMeses: 36, costoDirectoMes: 0
    }, (c && c.gastosGenerales) || {});
    return out;
  }

  /* Carga lo guardado y, si viene de la versión 1, lo actualiza. */
  function cargarDatos() {
    const g = {
      config: leer(K.config), materiales: leer(K.materiales), herrajes: leer(K.herrajes),
      plantillas: leer(K.plantillas), cotizaciones: leer(K.cotizaciones)
    };
    const hayAlgo = Object.keys(g).some(k => g[k] !== null);
    const version = leer(K.version) || (hayAlgo ? 1 : VERSION_DATOS);
    let d = {
      config: normalizarConfig(g.config),
      materiales: g.materiales || copia(MATERIALES_DEFECTO),
      herrajes: g.herrajes || copia(HERRAJES_DEFECTO),
      plantillas: g.plantillas || copia(PLANTILLAS_DEFECTO),
      cotizaciones: g.cotizaciones || []
    };
    const migrado = hayAlgo && version < 2;
    if (migrado) d = Object.assign(d, migrarDatosV1(d));
    if (migrado || !hayAlgo) {
      guardar(K.config, d.config); guardar(K.materiales, d.materiales); guardar(K.herrajes, d.herrajes);
      guardar(K.plantillas, d.plantillas); guardar(K.cotizaciones, d.cotizaciones);
      guardar(K.version, VERSION_DATOS);
    }
    d.migrado = migrado;
    return d;
  }

  /* ---------- Estado en memoria ---------- */
  const datos = cargarDatos();
  const estado = {
    config: datos.config,
    materiales: datos.materiales,
    herrajes: datos.herrajes,
    plantillas: datos.plantillas,
    cotizaciones: datos.cotizaciones,
    cot: null,          // cotización en edición (copia de trabajo)
    sel: 0,             // mueble seleccionado
    res: null,          // último resultado del cálculo
    sucio: false,       // hay cambios sin guardar
    verPuertas: true,
    filtroEstado: "todos",
    busqueda: ""
  };

  const fmt = (v) => formatearDinero(v, estado.config);
  const catalogo = () => crearCatalogo(estado.materiales, estado.herrajes, estado.cot && estado.cot.precios);
  const cfgEf = () => configEfectiva(estado.config, estado.cot);
  const muebleSel = () => estado.cot.muebles[estado.sel];

  /* ============================================================
     NAVEGACIÓN
     ============================================================ */
  function mostrarVista(nombre) {
    document.body.dataset.vista = nombre;
    $$(".vista").forEach(v => { v.hidden = v.id !== "vista-" + nombre; });
    $$(".tab").forEach(t => t.classList.toggle("tab--activa", t.dataset.vista === nombre));
    if (nombre === "inicio") renderPanel();
    if (nombre === "cotizar") pintarMueble();
    if (nombre === "historial") renderHistorial();
    if (nombre === "bases") renderBases();
    if (nombre === "ajustes") cargarAjustes();
    window.scrollTo(0, 0);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-vista]");
    if (b) mostrarVista(b.dataset.vista);
  });

  /* ============================================================
     INICIO
     ============================================================ */
  function init() {
    aplicarMarca();
    estado.cot = nuevaCotizacionVacia(estado.config, estado.plantillas);
    bindCotizar();
    bindHistorial();
    bindBases();
    bindAjustes();
    pintarCotizacion();
    mostrarVista("cotizar");
    if (datos.migrado) toast("Actualizamos tus datos a la nueva versión del cotizador.", "ok");
  }

  function aplicarMarca() {
    const em = estado.config.empresa;
    $("cabNombre").textContent = em.nombre || "Mavimuebles";
    $("cabEslogan").textContent = em.eslogan || "";
    $("inicioNombre").textContent = em.nombre || "Mavimuebles";
  }

  function marcarSucio() { estado.sucio = true; $("sinGuardar").hidden = false; }

  /* ============================================================
     COTIZAR — pintar formulario desde el estado
     ============================================================ */
  function pintarCotizacion() {
    const c = estado.cot;
    $$("[data-c]").forEach(el => { el.value = c.cliente[el.dataset.c] || ""; });
    $("qInstalacion").checked = !!c.requiereInstalacion;
    $("qDespacho").checked = !!c.requiereDespacho;
    $("qCostoDespacho").value = c.despacho || 0;
    $("qOtros").value = c.otros || 0;
    $$("[data-p]").forEach(el => {
      const v = c.parametros[el.dataset.p];
      if (el.type === "checkbox") el.checked = !!v; else el.value = v === undefined ? "" : v;
    });
    $("nuevoTipo").innerHTML = estado.plantillas.map(p => `<option>${esc(p.tipo)}</option>`).join("");
    pintarCabecera();
    pintarMueble();
  }

  function pintarCabecera() {
    const c = estado.cot;
    $("tituloCotizar").textContent = c.numero ? `Cotización N° ${c.numero}` : "Nueva cotización";
    const pill = $("estadoActual");
    pill.hidden = !c.numero;
    if (c.numero) {
      pill.className = "pill pill--" + c.estado;
      pill.textContent = (ESTADOS.find(e => e.id === c.estado) || ESTADOS[0]).etiqueta;
    }
    $("sinGuardar").hidden = !estado.sucio;
    const cambio = preciosCambiaron(c, estado.materiales, estado.herrajes, estado.config);
    $("bannerPrecios").hidden = !cambio;
    if (cambio) $("bannerTexto").textContent =
      `Esta cotización usa los precios del ${fechaCorta(c.preciosFecha || c.creada)}. Desde entonces cambiaron algunos precios o tiempos en Bases/Ajustes.`;
  }

  function opciones(lista, valor, vacio) {
    let html = vacio ? `<option value="">${esc(vacio)}</option>` : "";
    const ids = lista.map(x => x.id);
    if (valor && ids.indexOf(valor) < 0) html += `<option value="${esc(valor)}">(${esc(valor)} — no existe en Bases)</option>`;
    return html + lista.map(x => `<option value="${esc(x.id)}"${x.id === valor ? " selected" : ""}>${esc(x.nombre)}</option>`).join("");
  }

  function poblarSelectsMueble(m) {
    const cat = catalogo();
    const mats = cat.listaMateriales();
    const tableros = mats.filter(x => x.unidad === "plancha" || x.unidad === "m2");
    const lineales = mats.filter(x => x.unidad === "ml");
    const hers = cat.listaHerrajes();
    const bisagras = hers.filter(h => /bisagra/i.test(h.nombre));
    const correderas = hers.filter(h => /corredera/i.test(h.nombre) && !/riel/i.test(h.nombre));

    const tipos = estado.plantillas.map(p => p.tipo);
    if (tipos.indexOf(m.tipo) < 0) tipos.unshift(m.tipo);
    $("mTipo").innerHTML = tipos.map(t => `<option${t === m.tipo ? " selected" : ""}>${esc(t)}</option>`).join("");
    $("mMatCuerpo").innerHTML = opciones(tableros, m.matCuerpo);
    $("mMatFrentes").innerHTML = opciones(tableros, m.matFrentes);
    $("mMatFondo").innerHTML = opciones(tableros, m.matFondo, "(sin fondo)");
    $("mMatCubierta").innerHTML = opciones(lineales, m.matCubierta);
    $("mTipoBisagra").innerHTML = opciones(bisagras.length ? bisagras : hers, m.tipoBisagra);
    $("mTipoCorredera").innerHTML = opciones(correderas.length ? correderas : hers, m.tipoCorredera);
    $("mDificultad").innerHTML = Object.keys(DIFICULTAD).map(k =>
      `<option value="${k}"${k === m.dificultad ? " selected" : ""}>${DIFICULTAD[k].etiqueta} (×${DIFICULTAD[k].factor} horas)</option>`).join("");
  }

  function pintarMueble() {
    if (!estado.cot) return;
    if (estado.sel >= estado.cot.muebles.length) estado.sel = estado.cot.muebles.length - 1;
    const m = muebleSel();
    poblarSelectsMueble(m);
    $$("[data-m]").forEach(el => {
      const v = getPath(m, el.dataset.m);
      if (el.type === "radio") el.checked = el.value === (m.modo || "constructor");
      else if (el.type === "checkbox") el.checked = !!v;
      else el.value = (v === undefined || v === null) ? "" : v;
    });
    $("bloqueConstructor").hidden = m.modo === "manual";
    $("tituloMueble").textContent = `Mueble ${estado.sel + 1}: ${m.tipo}`;
    actualizarHabilitados(m);
    renderExtras();
    recalcular();
  }

  function actualizarHabilitados(m) {
    const sinPuertas = m.tipoPuerta === "ninguna";
    $("mPuertas").disabled = sinPuertas;
    $$('[data-step="puertas"]').forEach(b => { b.disabled = sinPuertas; });
    $("mAltoCajon").disabled = !num(m.cajones);
    $("mMatCubierta").disabled = !m.cubierta;
    $("mTipoBisagra").disabled = m.tipoPuerta !== "batiente";
    $("mTipoCorredera").disabled = !num(m.cajones);
  }

  /* ---------- Materiales y herrajes agregados a mano ---------- */
  function renderExtras() {
    const m = muebleSel(), cat = catalogo();
    const mats = cat.listaMateriales(), hers = cat.listaHerrajes();
    $("lineasMateriales").innerHTML = m.extrasMat.length ? m.extrasMat.map((l, i) => `
      <div class="linea" data-i="${i}">
        <select class="ex-mat" aria-label="Material">${mats.map(x => `<option value="${esc(x.id)}"${x.id === l.materialId ? " selected" : ""}>${esc(x.nombre)} (${unidadTexto(x.unidad)})</option>`).join("")}</select>
        <input class="ex-cant" type="number" min="0" step="0.01" value="${esc(l.cantidad)}" aria-label="Cantidad">
        <span class="linea__total"></span>
        <button class="linea__quitar" type="button" data-quitar-mat="${i}" aria-label="Quitar">×</button>
      </div>`).join("") : `<p class="vacio">Sin materiales adicionales.</p>`;
    $("lineasHerrajes").innerHTML = m.extrasHer.length ? m.extrasHer.map((l, i) => `
      <div class="linea" data-i="${i}">
        <select class="ex-her" aria-label="Herraje">${hers.map(x => `<option value="${esc(x.id)}"${x.id === l.herrajeId ? " selected" : ""}>${esc(x.nombre)}</option>`).join("")}</select>
        <input class="ex-cant" type="number" min="0" step="1" value="${esc(l.cantidad)}" aria-label="Cantidad">
        <span class="linea__total"></span>
        <button class="linea__quitar" type="button" data-quitar-her="${i}" aria-label="Quitar">×</button>
      </div>`).join("") : `<p class="vacio">Nada agregado a mano.</p>`;
  }

  function actualizarTotalesExtras() {
    const m = muebleSel(), cat = catalogo();
    $$("#lineasMateriales .linea").forEach(f => {
      const l = m.extrasMat[Number(f.dataset.i)]; const x = l && cat.mat(l.materialId);
      f.querySelector(".linea__total").textContent = fmt((x ? num(x.precio) : 0) * num(l && l.cantidad));
    });
    $$("#lineasHerrajes .linea").forEach(f => {
      const l = m.extrasHer[Number(f.dataset.i)]; const x = l && cat.her(l.herrajeId);
      f.querySelector(".linea__total").textContent = fmt((x ? num(x.precio) : 0) * num(l && l.cantidad));
    });
  }

  /* ============================================================
     RECÁLCULO EN VIVO
     ============================================================ */
  function recalcular() {
    const cat = catalogo();
    const r = calcularCotizacion(estado.cot, estado.config, cat);
    estado.res = r;
    const info = r.muebles[estado.sel];
    renderChips(r);
    renderDibujo(info);
    renderAlertas(r);
    renderDespiece(info, r, cat);
    renderHerrajesAuto(info, cat);
    renderHoras(info);
    actualizarTotalesExtras();
    renderDesglose(r);
    const c = estado.cot;
    $("resumenCliente").textContent = c.cliente.nombre ? "— " + c.cliente.nombre : "";
    $("resumenParametros").textContent = `— margen ${num(c.parametros.margenPct)}% · merma ${num(c.parametros.mermaPct)}% · gastos generales ${num(c.parametros.indirectosPct)}%`;
    $("barraTotalNum").textContent = fmt(r.redondeado.total);
  }

  function renderChips(r) {
    $("chipsMuebles").innerHTML = r.muebles.map((info, i) => {
      const m = info.mueble, q = Math.max(1, Math.round(num(m.cantidad, 1)));
      const medidas = (num(m.ancho) && num(m.alto)) ? `${num(m.ancho)}×${num(m.alto)}×${num(m.prof)} · ` : "";
      return `<button type="button" role="tab" aria-selected="${i === estado.sel}" data-chip="${i}"
        class="chip${i === estado.sel ? " chip--activo" : ""}${info.alertas.length ? " chip--alerta" : ""}">
        <strong>${i + 1}. ${esc(m.tipo)}${q > 1 ? " ×" + q : ""}</strong><span>${medidas}${fmt(info.precio)}</span></button>`;
    }).join("");
  }

  function renderDibujo(info) {
    const svg = dibujarMueble(info.mueble, cfgEf(), { puertas: estado.verPuertas });
    $("dibujo").innerHTML = svg;
    $("dibujoMovil").innerHTML = svg;
    $("dibujoTitulo").textContent = `${estado.sel + 1}. ${info.mueble.tipo}`;
  }

  function renderAlertas(r) {
    $("alertas").innerHTML = r.alertas.length
      ? r.alertas.map(a => `<div class="alerta alerta--${a.nivel}">${a.nivel === "error" ? "⛔" : "⚠️"} ${esc(a.texto)}</div>`).join("")
      : `<div class="alerta alerta--ok">✓ Sin alertas de fabricación ni de precio.</div>`;
  }

  function renderDespiece(info, r, cat) {
    const m = info.mueble;
    if (m.modo === "manual") { $("tablaDespiece").innerHTML = `<p class="vacio">Modo manual: este mueble no genera despiece.</p>`; return; }
    if (!info.despiece.length) { $("tablaDespiece").innerHTML = `<p class="vacio">Ingresa alto, ancho y profundidad para ver las piezas.</p>`; return; }
    const q = Math.max(1, Math.round(num(m.cantidad, 1)));
    const nombreMat = id => { const x = cat.mat(id); return x ? x.nombre : id; };
    let html = `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Pieza</th><th class="num">Cant.${q > 1 ? " (×" + q + ")" : ""}</th><th class="num">Largo × ancho (cm)</th><th>Material</th><th class="num">Canto (m)</th></tr></thead><tbody>`;
    info.despiece.forEach(p => {
      html += `<tr><td>${esc(p.nombre)}</td><td class="num">${p.cant}</td><td class="num">${dec(p.largo, 1)} × ${dec(p.ancho, 1)}</td>
        <td>${esc(nombreMat(p.materialId))}</td><td class="num">${p.cantoCm ? dec(p.cant * p.cantoCm / 100, 2) : "—"}</td></tr>`;
    });
    html += `</tbody></table></div><h4 class="sub-titulo">Material a comprar (toda la cotización)</h4>
      <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Material</th><th class="num">Se usa</th><th class="num">A comprar</th><th class="num">Costo</th></tr></thead><tbody>`;
    const merma = num(r.parametros.mermaPct) / 100;
    r.lineasMat.forEach(l => {
      const mat = cat.mat(l.materialId);
      let usa, compra;
      if (l.extra) { usa = `${dec(l.cantidad, 2)} ${unidadTexto(l.unidad)}`; compra = "agregado a mano"; }
      else if (l.unidad === "plancha") {
        const area = mat ? areaPlanchaM2(mat) : 0;
        const aprov = l.planchas > 0 && area > 0 ? Math.round(l.cantidad / (l.planchas * area) * 100) : 0;
        usa = `${dec(l.cantidad, 2)} m²`;
        compra = `${r.parametros.planchasCompletas ? l.planchas : dec(l.planchas, 2)} plancha${l.planchas === 1 ? "" : "s"}` +
                 (r.parametros.planchasCompletas ? ` <small>(aprovecha ${aprov}%)</small>` : "");
      } else if (l.unidad === "un") { usa = `${dec(l.cantidad, 2)} un.`; compra = usa; }
      else { const u = l.unidad === "ml" ? "m" : "m²"; usa = `${dec(l.cantidad, 2)} ${u}`; compra = `${dec(l.cantidad * (1 + merma), 2)} ${u}`; }
      html += `<tr><td>${esc(l.nombre)}</td><td class="num">${usa}</td><td class="num">${compra}</td><td class="num">${fmt(l.compra)}</td></tr>`;
    });
    html += `</tbody><tfoot><tr><td colspan="3">Total materiales (con merma)</td><td class="num">${fmt(r.costoMateriales + r.merma)}</td></tr></tfoot></table></div>`;
    $("tablaDespiece").innerHTML = html;
  }

  function renderHerrajesAuto(info, cat) {
    const m = info.mueble;
    if (m.modo === "manual") { $("herrajesAuto").innerHTML = `<p class="vacio">En modo manual, los herrajes se agregan a mano aquí abajo.</p>`; return; }
    const auto = info.herrajes.filter(x => !x.extra);
    if (!auto.length) { $("herrajesAuto").innerHTML = `<p class="vacio">Este mueble no lleva herrajes automáticos.</p>`; return; }
    $("herrajesAuto").innerHTML = `<ul class="auto-lista">${auto.map(x => {
      const h = cat.her(x.herrajeId);
      return `<li><span><span class="etiqueta-auto">AUTO</span>${x.cantidad} × ${esc(h ? h.nombre : x.herrajeId)} <small>(${esc(x.motivo)})</small></span>
        <span class="num">${fmt((h ? num(h.precio) : 0) * x.cantidad)}</span></li>`;
    }).join("")}</ul><p class="ayuda">Se calculan solos según puertas, cajones, repisas y base. El tipo de bisagra y de corredera se elige en la sección 4.</p>`;
  }

  function renderHoras(info) {
    const m = info.mueble, s = info.horasSugeridas;
    if (m.modo === "manual") {
      $("horasHint").textContent = "Modo manual: ingresa las horas estimadas de este mueble (para todas sus unidades).";
      $("btnHorasSugeridas").hidden = true;
      return;
    }
    $("horasHint").textContent = `Sugerido según piezas, cajones, puertas y dificultad: diseño ${dec(s.diseno, 2)} h · fabricación ${dec(s.fab, 2)} h · instalación ${dec(s.inst, 2)} h.` +
      (m.horasManual ? " Estás usando horas propias." : "");
    $("btnHorasSugeridas").hidden = !m.horasManual;
    if (!m.horasManual) {
      m.horas = { diseno: s.diseno, fab: s.fab, inst: s.inst };
      [["mHDiseno", "diseno"], ["mHFab", "fab"], ["mHInst", "inst"]].forEach(([id, k]) => {
        if (document.activeElement !== $(id)) $(id).value = s[k];
      });
    }
  }

  function renderDesglose(r) {
    const p = r.parametros, d = r.redondeado, c = estado.cot, cfg = cfgEf();
    const fila = (a, b, cls, nota) => `<div class="fila ${cls || ""}"><span>${a}${nota ? ` <small>${nota}</small>` : ""}</span><span>${b}</span></div>`;
    const planchasTxt = p.planchasCompletas ? `${dec(r.planchas, 2)} planchas completas` : `${num(p.mermaPct)}%`;
    const minimo = num(cfg.margenMinimoPct);
    let html = `<h3>Desglose del presupuesto</h3>`;
    html += fila("Materiales", fmt(r.costoMateriales), "fila--costo");
    html += fila("Merma y sobrante", fmt(r.merma), "fila--costo", planchasTxt);
    html += fila("Herrajes", fmt(r.costoHerrajes), "fila--costo");
    if (r.insumos) html += fila("Insumos y desgaste de herramientas", fmt(r.insumos), "fila--costo");
    html += fila("Mano de obra", fmt(r.manoObra), "fila--costo", `${dec(r.horas.diseno + r.horas.fab, 2)} h`);
    html += c.requiereInstalacion ? fila("Instalación", fmt(r.instalacion), "fila--costo", `${dec(r.horas.inst, 2)} h`) : fila("Instalación", "no incluida", "fila--costo");
    if (c.requiereDespacho) html += fila("Despacho", fmt(r.despacho), "fila--costo");
    if (r.otros) html += fila("Otros", fmt(r.otros), "fila--costo");
    html += fila("Subtotal costos", fmt(r.subtotalCosto), "fila--sub");
    html += fila("Gastos generales", fmt(r.indirectos), "fila--costo", `${num(p.indirectosPct)}%`);
    html += fila("Imprevistos", fmt(r.imprevistos), "fila--costo", `${num(p.imprevistosPct)}%`);
    html += fila("Costo total", fmt(r.costoTotal), "fila--sub");
    html += fila("Tu ganancia", fmt(r.ganancia), r.gananciaPct < minimo ? "fila--mala" : "fila--ganancia", `${Math.round(r.gananciaPct)}% del precio`);
    if (d.descuento) {
      html += fila("Precio con margen", fmt(d.subtotal));
      html += fila("Descuento", "− " + fmt(d.descuento), "", `${num(p.descuentoPct)}%`);
    }
    if (d.iva) { html += fila("Neto", fmt(d.neto)); html += fila("IVA", fmt(d.iva), "", `${num(p.ivaPct)}%`); }
    html += `<div class="precio-cliente"><div class="precio-cliente__lbl">Precio sugerido al cliente</div>
      <div class="precio-cliente__num">${fmt(d.total)}</div><small>${p.ivaActivo ? "IVA incluido" : "Sin IVA"}</small></div>`;
    if (r.muebles.length > 1) {
      html += `<div class="por-mueble">${r.muebles.map((info, i) => fila(`${i + 1}. ${esc(info.mueble.tipo)}`, fmt(info.precio))).join("")}
        <p class="ayuda">Precio de cada mueble antes de descuento e IVA. Compartir planchas entre muebles abarata el total.</p></div>`;
    }
    $("desglose").innerHTML = html;
  }

  /* ============================================================
     COTIZAR — eventos
     ============================================================ */
  function valorInput(el) {
    if (el.type === "checkbox") return el.checked;
    if (el.type === "radio") return el.value;
    if (el.type === "number") return el.value === "" ? "" : Number(el.value);
    return el.value;
  }

  function alCambiar(e) {
    const el = e.target;
    const esSelectOCheck = el.tagName === "SELECT" || el.type === "checkbox" || el.type === "radio";
    if (esSelectOCheck && e.type === "input") return; // se procesan en "change"
    if (el.closest(".linea") || el.id === "verPuertas") return;

    if (el.dataset.m) {
      const m = muebleSel(), k = el.dataset.m, v = valorInput(el);
      if (k === "tipo") { cambiarTipo(v); return; }
      setPath(m, k, v);
      m._editado = true;
      if (k.indexOf("horas.") === 0) m.horasManual = true;
      if (k === "modo") { if (v === "manual") m.horasManual = true; marcarSucio(); pintarMueble(); return; }
      if (k === "cantidad" && e.type === "change" && num(v) < 1) { m.cantidad = 1; el.value = 1; }
      if (k === "matCuerpo") {
        const mat = catalogo().mat(v), mm = mat && /(\d+)\s*mm/.exec(mat.nombre);
        if (mm) { m.espesor = Number(mm[1]); $("mEspesor").value = m.espesor; }
      }
      if (k === "tipoPuerta") {
        if (v === "ninguna") m.puertas = 0;
        else if (!num(m.puertas)) m.puertas = v === "corredera" ? 2 : (num(m.ancho) > 60 ? 2 : 1);
        $("mPuertas").value = m.puertas;
      }
      actualizarHabilitados(m);
    } else if (el.dataset.c) {
      estado.cot.cliente[el.dataset.c] = el.value;
    } else if (el.dataset.q) {
      const k = el.dataset.q;
      estado.cot[k] = valorInput(el);
      if (k === "requiereDespacho" && el.checked && !num(estado.cot.despacho)) {
        estado.cot.despacho = num(estado.config.despachoBase);
        $("qCostoDespacho").value = estado.cot.despacho;
      }
    } else if (el.dataset.p) {
      estado.cot.parametros[el.dataset.p] = valorInput(el);
    } else return;
    marcarSucio();
    recalcular();
  }

  function cambiarTipo(tipo) {
    const m = muebleSel();
    const p = estado.plantillas.find(x => x.tipo === tipo);
    const cargar = p && (!m._editado || confirm(
      `¿Cargar las medidas y piezas típicas de "${tipo}"?\n\nAceptar: se reemplazan medidas, módulos, cajones y puertas.\nCancelar: solo cambia el nombre del mueble.`));
    if (cargar) {
      const nuevo = muebleDesdePlantilla(p, m);
      nuevo._editado = false;
      estado.cot.muebles[estado.sel] = nuevo;
      toast(`Se cargó la plantilla "${tipo}". Ajusta lo que necesites.`, "ok");
    } else {
      m.tipo = tipo;
    }
    marcarSucio();
    pintarMueble();
  }

  function seleccionarMueble(i) {
    estado.sel = i;
    pintarMueble();
  }

  function agregarMueble() {
    const p = estado.plantillas.find(x => x.tipo === $("nuevoTipo").value) || estado.plantillas[0];
    const actual = muebleSel();
    const nuevo = muebleDesdePlantilla(p);
    // hereda color y materiales del mueble actual (ej: toda la cocina del mismo color)
    ["color", "matCuerpo", "matFrentes", "espesor", "tipoBisagra", "tipoCorredera"].forEach(k => { nuevo[k] = actual[k]; });
    if (p.fondo !== false && actual.matFondo) nuevo.matFondo = actual.matFondo;
    estado.cot.muebles.push(nuevo);
    estado.sel = estado.cot.muebles.length - 1;
    marcarSucio();
    pintarMueble();
    toast(`Se agregó "${p.tipo}" con el mismo color y materiales.`, "ok");
  }

  function bindCotizar() {
    const vista = $("vista-cotizar");
    vista.addEventListener("input", alCambiar);
    vista.addEventListener("change", alCambiar);

    // Steppers − / +
    vista.addEventListener("click", (e) => {
      const b = e.target.closest("[data-step]");
      if (b) {
        const m = muebleSel(), k = b.dataset.step;
        const minimo = k === "modulos" ? 1 : 0;
        m[k] = Math.max(minimo, Math.round(num(m[k])) + Number(b.dataset.d));
        if (k === "puertas" && m.puertas > 0 && m.tipoPuerta === "ninguna") { m.tipoPuerta = "batiente"; $("mTipoPuerta").value = "batiente"; }
        $("m" + k.charAt(0).toUpperCase() + k.slice(1)).value = m[k];
        m._editado = true;
        actualizarHabilitados(m);
        marcarSucio();
        recalcular();
        return;
      }
      const chip = e.target.closest("[data-chip]");
      if (chip) seleccionarMueble(Number(chip.dataset.chip));
    });

    $("btnAddMueble").addEventListener("click", agregarMueble);
    $("btnDuplicarMueble").addEventListener("click", () => {
      const copiaM = copia(muebleSel());
      copiaM.id = idCorto("M");
      estado.cot.muebles.splice(estado.sel + 1, 0, copiaM);
      estado.sel++;
      marcarSucio(); pintarMueble();
      toast("Mueble duplicado.", "ok");
    });
    $("btnEliminarMueble").addEventListener("click", () => {
      if (estado.cot.muebles.length <= 1) { toast("La cotización necesita al menos un mueble.", "error"); return; }
      if (!confirm(`¿Quitar "${muebleSel().tipo}" de la cotización?`)) return;
      estado.cot.muebles.splice(estado.sel, 1);
      estado.sel = Math.max(0, estado.sel - 1);
      marcarSucio(); pintarMueble();
    });

    $("verPuertas").addEventListener("change", (e) => { estado.verPuertas = e.target.checked; renderDibujo(estado.res.muebles[estado.sel]); });

    // Extras: materiales
    $("lineasMateriales").addEventListener("input", (e) => {
      const f = e.target.closest(".linea"); if (!f || !e.target.classList.contains("ex-cant")) return;
      muebleSel().extrasMat[Number(f.dataset.i)].cantidad = valorInput(e.target);
      marcarSucio(); recalcular();
    });
    $("lineasMateriales").addEventListener("change", (e) => {
      const f = e.target.closest(".linea"); if (!f || !e.target.classList.contains("ex-mat")) return;
      muebleSel().extrasMat[Number(f.dataset.i)].materialId = e.target.value;
      marcarSucio(); recalcular();
    });
    $("lineasMateriales").addEventListener("click", (e) => {
      const b = e.target.closest("[data-quitar-mat]"); if (!b) return;
      muebleSel().extrasMat.splice(Number(b.dataset.quitarMat), 1);
      marcarSucio(); renderExtras(); recalcular();
    });
    $("btnAddMaterial").addEventListener("click", () => {
      const lista = catalogo().listaMateriales();
      const sugerido = lista.find(x => x.unidad === "un" || x.unidad === "m2") || lista[0];
      if (!sugerido) { toast("Primero agrega materiales en la pestaña Bases.", "error"); return; }
      muebleSel().extrasMat.push({ materialId: sugerido.id, cantidad: 1 });
      marcarSucio(); renderExtras(); recalcular();
    });

    // Extras: herrajes
    $("lineasHerrajes").addEventListener("input", (e) => {
      const f = e.target.closest(".linea"); if (!f || !e.target.classList.contains("ex-cant")) return;
      muebleSel().extrasHer[Number(f.dataset.i)].cantidad = valorInput(e.target);
      marcarSucio(); recalcular();
    });
    $("lineasHerrajes").addEventListener("change", (e) => {
      const f = e.target.closest(".linea"); if (!f || !e.target.classList.contains("ex-her")) return;
      muebleSel().extrasHer[Number(f.dataset.i)].herrajeId = e.target.value;
      marcarSucio(); recalcular();
    });
    $("lineasHerrajes").addEventListener("click", (e) => {
      const b = e.target.closest("[data-quitar-her]"); if (!b) return;
      muebleSel().extrasHer.splice(Number(b.dataset.quitarHer), 1);
      marcarSucio(); renderExtras(); recalcular();
    });
    $("btnAddHerraje").addEventListener("click", () => {
      const lista = catalogo().listaHerrajes();
      if (!lista.length) { toast("Primero agrega herrajes en la pestaña Bases.", "error"); return; }
      muebleSel().extrasHer.push({ herrajeId: lista[0].id, cantidad: 1 });
      marcarSucio(); renderExtras(); recalcular();
    });

    $("btnHorasSugeridas").addEventListener("click", () => { muebleSel().horasManual = false; marcarSucio(); recalcular(); });
    $("btnActualizarPrecios").addEventListener("click", () => {
      if (!confirm("¿Recalcular esta cotización con los precios y tiempos actuales? El precio al cliente puede cambiar.")) return;
      estado.cot.precios = null; estado.cot.configCongelada = null; estado.cot.preciosFecha = null;
      marcarSucio(); pintarCabecera(); pintarMueble();
      toast("Cotización recalculada con los precios actuales. Guárdala para conservar el cambio.", "ok");
    });

    $("btnGuardar").addEventListener("click", guardarCotizacion);
    $("btnImprimir").addEventListener("click", () => {
      if ((!estado.cot.numero || estado.sucio) && !guardarCotizacion()) return;
      imprimir(estado.cot);
    });
    $("btnNueva").addEventListener("click", nuevaCotizacion);
    $("btnInicioNueva").addEventListener("click", () => { nuevaCotizacion(); mostrarVista("cotizar"); });
    $("btnGuardarPlantilla").addEventListener("click", guardarComoPlantilla);
    $("btnVerDetalle").addEventListener("click", () => $("desglose").scrollIntoView({ behavior: "smooth" }));

    window.addEventListener("beforeunload", (e) => { if (estado.sucio) { e.preventDefault(); e.returnValue = ""; } });
  }

  function puedeDescartar() {
    return !estado.sucio || confirm("Hay cambios sin guardar en la cotización actual. ¿Descartarlos?");
  }

  function nuevaCotizacion() {
    if (!puedeDescartar()) return;
    estado.cot = nuevaCotizacionVacia(estado.config, estado.plantillas);
    estado.sel = 0;
    estado.sucio = false;
    pintarCotizacion();
    $("bloqueCliente").open = true;
    $("cliNombre").focus();
  }

  function siguienteNumero() {
    return estado.cotizaciones.reduce((mx, c) => Math.max(mx, num(c.numero)), 0) + 1;
  }

  function guardarCotizacion() {
    const c = estado.cot;
    if (!c.cliente.nombre.trim()) {
      toast("Escribe al menos el nombre del cliente.", "error");
      $("bloqueCliente").open = true; $("cliNombre").focus();
      return false;
    }
    const cat = catalogo();
    const r = calcularCotizacion(c, estado.config, cat);
    c.precios = congelarPrecios(r, cat);                       // los precios de hoy quedan fijos
    c.configCongelada = c.configCongelada || extraerConfigCongelable(estado.config);
    c.preciosFecha = c.preciosFecha || new Date().toISOString();
    const nueva = !c.numero;
    if (nueva) c.numero = siguienteNumero();
    c.actualizada = new Date().toISOString();
    c.resumen = { total: r.redondeado.total, neto: r.redondeado.neto, costo: Math.round(r.costoTotal), muebles: c.muebles.map(m => m.tipo) };
    const i = estado.cotizaciones.findIndex(x => x.id === c.id);
    if (i >= 0) estado.cotizaciones[i] = copia(c); else estado.cotizaciones.unshift(copia(c));
    if (!guardar(K.cotizaciones, estado.cotizaciones)) return false;
    estado.sucio = false;
    pintarCabecera();
    toast(nueva ? `Cotización N° ${c.numero} guardada.` : "Cotización actualizada.", "ok");
    return true;
  }

  function guardarComoPlantilla() {
    const m = muebleSel();
    if (m.modo === "manual") { toast("Solo los muebles en modo Constructor se pueden guardar como plantilla.", "error"); return; }
    const nombre = (prompt("Nombre de la plantilla:", m.tipo) || "").trim();
    if (!nombre) return;
    const i = estado.plantillas.findIndex(p => p.tipo.toLowerCase() === nombre.toLowerCase());
    if (i >= 0 && !confirm(`Ya existe la plantilla "${estado.plantillas[i].tipo}". ¿Reemplazarla?`)) return;
    const p = {
      tipo: nombre, alto: num(m.alto), ancho: num(m.ancho), prof: num(m.prof), modulos: num(m.modulos, 1),
      repisas: num(m.repisas), cajones: num(m.cajones), altoCajon: num(m.altoCajon, 18), puertas: num(m.puertas),
      tipoPuerta: m.tipoPuerta, barras: num(m.barras), base: m.base, fondo: !!m.matFondo, cubierta: !!m.cubierta,
      dificultad: m.dificultad
    };
    if (i >= 0) estado.plantillas[i] = p; else estado.plantillas.push(p);
    guardar(K.plantillas, estado.plantillas);
    $("nuevoTipo").innerHTML = estado.plantillas.map(x => `<option>${esc(x.tipo)}</option>`).join("");
    m.tipo = nombre; m._editado = false;
    pintarMueble();
    toast(`Plantilla "${nombre}" guardada.`, "ok");
  }

  /* ============================================================
     DOCUMENTO PARA EL CLIENTE (imprimir / PDF)
     ============================================================ */
  function imprimir(c) {
    const cat = crearCatalogo(estado.materiales, estado.herrajes, c.precios);
    const r = calcularCotizacion(c, estado.config, cat);
    $("documento").innerHTML = generarDocumento(c, r, cat);
    setTimeout(() => window.print(), 60);
  }

  function generarDocumento(c, r, cat) {
    const em = estado.config.empresa;
    const cfg = configEfectiva(estado.config, c);
    const d = r.redondeado;
    const fecha = new Date(c.actualizada || c.creada);
    const valida = new Date(fecha.getTime() + num(cfg.validezDias) * 86400000);
    const nombre = id => { const x = cat.mat(id); return x ? x.nombre : ""; };

    const items = r.muebles.map((info, i) => {
      const m = info.mueble, q = Math.max(1, Math.round(num(m.cantidad, 1)));
      const conDibujo = m.modo !== "manual" && info.g.ok;
      const medidas = (num(m.ancho) || num(m.alto)) ? `${num(m.ancho)} ancho × ${num(m.alto)} alto × ${num(m.prof)} prof. (cm)` : "";
      let mats = "";
      if (m.modo !== "manual") {
        mats = nombre(m.matCuerpo);
        if (m.matFrentes && m.matFrentes !== m.matCuerpo && (num(m.puertas) || num(m.cajones))) mats += ` · frentes en ${nombre(m.matFrentes)}`;
      }
      return `<div class="doc-item${conDibujo ? "" : " doc-item--sin-dibujo"}">
        ${conDibujo ? `<div>${dibujarMueble(m, cfg, { puertas: true, cotas: true })}</div>` : ""}
        <div>
          <h3>${i + 1}. ${esc(m.tipo)}${q > 1 ? ` — ${q} unidades` : ""}</h3>
          ${m.descripcion ? `<p>${esc(m.descripcion)}</p>` : ""}
          ${medidas ? `<p><strong>Medidas:</strong> ${medidas}</p>` : ""}
          ${m.color ? `<p><strong>Color / terminación:</strong> ${esc(m.color)}</p>` : ""}
          ${mats ? `<p><strong>Material:</strong> ${esc(mats)}</p>` : ""}
          ${info.incluye.length ? `<p><strong>Incluye:</strong> ${esc(info.incluye.join(", "))}.</p>` : ""}
        </div>
        <div class="doc-item__precio">${fmt(info.precio)}</div>
      </div>`;
    }).join("");

    const servicios = ["fabricación"];
    if (c.requiereInstalacion) servicios.push("instalación");
    if (c.requiereDespacho) servicios.push("despacho");
    let totales = `<tr><td>Subtotal</td><td>${fmt(d.subtotal)}</td></tr>`;
    if (d.descuento) totales += `<tr><td>Descuento (${num(r.parametros.descuentoPct)}%)</td><td>− ${fmt(d.descuento)}</td></tr>`;
    if (d.iva) totales += `<tr><td>Neto</td><td>${fmt(d.neto)}</td></tr><tr><td>IVA (${num(r.parametros.ivaPct)}%)</td><td>${fmt(d.iva)}</td></tr>`;
    totales += `<tr class="doc-total"><td>TOTAL</td><td>${fmt(d.total)}</td></tr>`;

    return `<div class="doc">
      <div class="doc-cab">
        <div class="doc-marca">${esc(em.nombre)}<small>${esc(em.eslogan)}</small></div>
        <div class="doc-meta"><strong>COTIZACIÓN N° ${esc(c.numero || "—")}</strong><br>
          Fecha: ${fecha.toLocaleDateString("es-CL")}<br>Válida hasta: ${valida.toLocaleDateString("es-CL")}</div>
      </div>
      <div class="doc-grid">
        <div class="doc-caja"><h4>Cliente</h4>
          <p><strong>${esc(c.cliente.nombre || "—")}</strong></p>
          ${c.cliente.telefono ? `<p>Tel: ${esc(c.cliente.telefono)}</p>` : ""}
          ${c.cliente.correo ? `<p>${esc(c.cliente.correo)}</p>` : ""}
          ${c.cliente.direccion ? `<p>${esc(c.cliente.direccion)}</p>` : ""}
        </div>
        <div class="doc-caja"><h4>${esc(em.nombre)}</h4>
          ${em.telefono ? `<p>Tel: ${esc(em.telefono)}</p>` : ""}
          ${em.correo ? `<p>${esc(em.correo)}</p>` : ""}
          ${em.direccion ? `<p>${esc(em.direccion)}</p>` : ""}
          ${em.web ? `<p>${esc(em.web)}</p>` : ""}
        </div>
      </div>
      ${items}
      <table class="doc-totales">${totales}</table>
      <div class="doc-cond">
        <h4>Condiciones comerciales</h4>
        <p><strong>Incluye:</strong> ${servicios.join(", ")}.${r.parametros.ivaActivo ? "" : " Valores sin IVA."}</p>
        <p><strong>Tiempo estimado de fabricación:</strong> ${num(cfg.tiempoFabricacionDias)} días hábiles desde la confirmación y el anticipo.</p>
        <p><strong>Validez de la cotización:</strong> ${num(cfg.validezDias)} días.</p>
        <p><strong>Forma de pago:</strong> ${esc(cfg.formaPago)}</p>
        ${cfg.condiciones ? `<p>${esc(cfg.condiciones)}</p>` : ""}
        ${c.cliente.observaciones ? `<p><strong>Observaciones:</strong> ${esc(c.cliente.observaciones)}</p>` : ""}
      </div>
      <div class="doc-firma">
        <div>${esc(em.nombre)}${em.telefono ? "<br>" + esc(em.telefono) : ""}</div>
        <div>Aceptado por el cliente<br>(nombre, firma y fecha)</div>
      </div>
    </div>`;
  }

  /* ============================================================
     PANEL DE INICIO
     ============================================================ */
  const totalDe = (c) => (c.resumen && c.resumen.total) || (c.resultado && c.resultado.total) || 0;
  const ordenadas = () => estado.cotizaciones.slice().sort((a, b) => String(b.actualizada || "").localeCompare(String(a.actualizada || "")));

  function renderPanel() {
    const cots = estado.cotizaciones;
    const por = (...ids) => cots.filter(c => ids.indexOf(c.estado) >= 0);
    const suma = (arr) => arr.reduce((s, c) => s + totalDe(c), 0);
    const aprobadas = por("aceptado", "terminado"), rechazadas = por("rechazado"), pendientes = por("pendiente");
    const cerradas = aprobadas.length + rechazadas.length;
    const tarjetas = [
      { num: cots.length, lbl: "Cotizaciones totales" },
      { num: fmt(suma(pendientes)), lbl: `Por cerrar (${pendientes.length} pendientes)` },
      { num: fmt(suma(aprobadas)), lbl: `Ventas aprobadas (${aprobadas.length})` },
      { num: cerradas ? Math.round(aprobadas.length / cerradas * 100) + "%" : "—", lbl: "Tasa de cierre (aceptadas / respondidas)" },
      { num: aprobadas.length ? fmt(suma(aprobadas) / aprobadas.length) : "—", lbl: "Ticket promedio aprobado" }
    ];
    $("panelResumen").innerHTML = tarjetas.map(t =>
      `<div class="tarjeta"><div class="tarjeta__num">${t.num}</div><div class="tarjeta__lbl">${t.lbl}</div></div>`).join("");
    const recientes = ordenadas().slice(0, 5);
    $("panelRecientes").innerHTML = recientes.length ? recientes.map(filaHistorial).join("")
      : `<p class="vacio">Aún no hay cotizaciones guardadas.</p>`;
  }

  /* ============================================================
     HISTORIAL
     ============================================================ */
  function renderHistorial() {
    const filtros = [{ id: "todos", etiqueta: "Todas" }].concat(ESTADOS);
    $("filtrosEstado").innerHTML = filtros.map(e =>
      `<button type="button" class="btn btn--mini${estado.filtroEstado === e.id ? " activo" : ""}" data-filtro="${e.id}">${e.etiqueta}</button>`).join("");
    const q = estado.busqueda.trim().toLowerCase();
    const lista = ordenadas().filter(c => {
      if (estado.filtroEstado !== "todos" && c.estado !== estado.filtroEstado) return false;
      if (!q) return true;
      const texto = [c.numero, c.cliente.nombre, c.cliente.telefono, c.cliente.correo, (c.muebles || []).map(m => m.tipo).join(" ")].join(" ").toLowerCase();
      return texto.indexOf(q) >= 0;
    });
    $("listaHistorial").innerHTML = lista.length ? lista.map(filaHistorial).join("")
      : `<p class="vacio">No hay cotizaciones con ese filtro.</p>`;
  }

  function filaHistorial(c) {
    const est = ESTADOS.find(e => e.id === c.estado) || ESTADOS[0];
    const tipos = (c.muebles || []).map(m => m.tipo).join(", ");
    return `<div class="hist">
      <div class="hist__info">
        <div class="hist__cliente">N° ${esc(c.numero || "—")} · ${esc(c.cliente.nombre || "Sin nombre")} <span class="pill pill--${c.estado}">${est.etiqueta}</span></div>
        <div class="hist__meta">${esc(tipos)} · ${fechaCorta(c.actualizada || c.creada)}${c.cliente.telefono ? " · " + esc(c.cliente.telefono) : ""}</div>
      </div>
      <div class="hist__precio">${fmt(totalDe(c))}</div>
      <div class="hist__acciones">
        <select data-h-estado="${esc(c.id)}" aria-label="Estado">${ESTADOS.map(e => `<option value="${e.id}"${e.id === c.estado ? " selected" : ""}>${e.etiqueta}</option>`).join("")}</select>
        <button type="button" class="btn btn--mini" data-h-abrir="${esc(c.id)}">Abrir</button>
        <button type="button" class="btn btn--mini" data-h-dup="${esc(c.id)}">Duplicar</button>
        <button type="button" class="btn btn--mini" data-h-pdf="${esc(c.id)}">PDF</button>
        <button type="button" class="btn btn--mini btn--peligro" data-h-borrar="${esc(c.id)}">Borrar</button>
      </div>
    </div>`;
  }

  function bindHistorial() {
    $("busqueda").addEventListener("input", (e) => { estado.busqueda = e.target.value; renderHistorial(); });
    document.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const buscar = id => estado.cotizaciones.find(c => c.id === id);
      if (b.dataset.filtro) { estado.filtroEstado = b.dataset.filtro; renderHistorial(); }
      if (b.dataset.hAbrir) abrirCotizacion(buscar(b.dataset.hAbrir));
      if (b.dataset.hDup) duplicarCotizacion(buscar(b.dataset.hDup));
      if (b.dataset.hPdf) { const c = buscar(b.dataset.hPdf); if (c) imprimir(c); }
      if (b.dataset.hBorrar) borrarCotizacion(b.dataset.hBorrar);
    });
    document.addEventListener("change", (e) => {
      const id = e.target.dataset && e.target.dataset.hEstado; if (!id) return;
      const c = estado.cotizaciones.find(x => x.id === id); if (!c) return;
      c.estado = e.target.value;
      guardar(K.cotizaciones, estado.cotizaciones);
      if (estado.cot.id === id) { estado.cot.estado = c.estado; pintarCabecera(); }
      if (document.body.dataset.vista === "historial") renderHistorial(); else renderPanel();
      toast("Estado actualizado.", "ok");
    });
  }

  function abrirCotizacion(c) {
    if (!c || !puedeDescartar()) return;
    estado.cot = copia(c);
    estado.sel = 0;
    estado.sucio = false;
    pintarCotizacion();
    mostrarVista("cotizar");
  }

  function duplicarCotizacion(c) {
    if (!c || !puedeDescartar()) return;
    const n = copia(c), ahora = new Date().toISOString();
    Object.assign(n, { id: idCorto("COT-"), numero: null, estado: "pendiente", creada: ahora, actualizada: ahora,
                       precios: null, configCongelada: null, preciosFecha: null });
    delete n.resumen;
    n.muebles.forEach(m => { m.id = idCorto("M"); });
    estado.cot = n; estado.sel = 0; estado.sucio = true;
    pintarCotizacion();
    mostrarVista("cotizar");
    toast(`Copia de la N° ${c.numero} con precios actuales. Guárdala para darle número.`, "ok");
  }

  function borrarCotizacion(id) {
    const c = estado.cotizaciones.find(x => x.id === id);
    if (!c || !confirm(`¿Borrar la cotización N° ${c.numero} de ${c.cliente.nombre || "sin nombre"}? No se puede deshacer.`)) return;
    estado.cotizaciones = estado.cotizaciones.filter(x => x.id !== id);
    guardar(K.cotizaciones, estado.cotizaciones);
    if (estado.cot.id === id) { estado.cot.numero = null; estado.cot.precios = null; estado.cot.configCongelada = null; marcarSucio(); pintarCabecera(); }
    renderHistorial();
    toast("Cotización borrada.", "ok");
  }

  /* ============================================================
     BASES EDITABLES
     ============================================================ */
  function renderBases() {
    const unidades = ["plancha", "m2", "ml", "un"];
    $("tablaMateriales").innerHTML = `<table class="tabla">
      <thead><tr><th>Nombre</th><th>Se compra por</th><th class="num">Largo plancha (cm)</th><th class="num">Ancho plancha (cm)</th><th class="num">Precio</th><th class="num">Valor m²</th><th class="col-acc"></th></tr></thead>
      <tbody>${estado.materiales.map((m, i) => `<tr data-i="${i}">
        <td><input data-bm="nombre" value="${esc(m.nombre)}" aria-label="Nombre"></td>
        <td><select data-bm="unidad" aria-label="Unidad">${unidades.map(u => `<option value="${u}"${m.unidad === u ? " selected" : ""}>${unidadTexto(u)}</option>`).join("")}</select></td>
        <td><input data-bm="largo" type="number" min="0" value="${esc(m.largo || "")}" ${m.unidad === "plancha" ? "" : "disabled"} aria-label="Largo"></td>
        <td><input data-bm="ancho" type="number" min="0" value="${esc(m.ancho || "")}" ${m.unidad === "plancha" ? "" : "disabled"} aria-label="Ancho"></td>
        <td><input data-bm="precio" type="number" min="0" value="${esc(m.precio)}" aria-label="Precio"></td>
        <td class="num" data-m2>${(m.unidad === "plancha" || m.unidad === "m2") ? fmt(precioPorM2(m)) : "—"}</td>
        <td class="col-acc"><button type="button" class="linea__quitar" data-delm="${i}" aria-label="Borrar">×</button></td>
      </tr>`).join("")}</tbody></table>`;

    $("tablaHerrajes").innerHTML = `<table class="tabla">
      <thead><tr><th>Nombre</th><th class="num">Precio unidad</th><th class="col-acc"></th></tr></thead>
      <tbody>${estado.herrajes.map((h, i) => `<tr data-i="${i}">
        <td><input data-bh="nombre" value="${esc(h.nombre)}" aria-label="Nombre"></td>
        <td><input data-bh="precio" type="number" min="0" value="${esc(h.precio)}" aria-label="Precio"></td>
        <td class="col-acc"><button type="button" class="linea__quitar" data-delh="${i}" aria-label="Borrar">×</button></td>
      </tr>`).join("")}</tbody></table>`;

    const sel = (campo, valor, ops) => `<select data-bp="${campo}">${ops.map(([v, t]) => `<option value="${v}"${v === valor ? " selected" : ""}>${t}</option>`).join("")}</select>`;
    const n = (campo, valor) => `<input data-bp="${campo}" type="number" min="0" value="${esc(valor)}">`;
    $("tablaPlantillas").innerHTML = `<table class="tabla">
      <thead><tr><th>Tipo</th><th>Alto</th><th>Ancho</th><th>Prof.</th><th>Módulos</th><th>Repisas</th><th>Cajones</th><th>Puertas</th><th>Tipo puerta</th><th>Barras</th><th>Base</th><th>Fondo</th><th>Cubierta</th><th>Dificultad</th><th class="col-acc"></th></tr></thead>
      <tbody>${estado.plantillas.map((p, i) => `<tr data-i="${i}">
        <td><input data-bp="tipo" value="${esc(p.tipo)}"></td>
        <td>${n("alto", p.alto)}</td><td>${n("ancho", p.ancho)}</td><td>${n("prof", p.prof)}</td>
        <td>${n("modulos", p.modulos)}</td><td>${n("repisas", p.repisas)}</td><td>${n("cajones", p.cajones)}</td><td>${n("puertas", p.puertas)}</td>
        <td>${sel("tipoPuerta", p.tipoPuerta, [["ninguna", "Sin puertas"], ["batiente", "Batiente"], ["corredera", "Corredera"]])}</td>
        <td>${n("barras", p.barras)}</td>
        <td>${sel("base", p.base, [["ninguna", "Sin base"], ["zocalo", "Zócalo"], ["patas", "Patas"]])}</td>
        <td><input data-bp="fondo" type="checkbox"${p.fondo !== false ? " checked" : ""} aria-label="Fondo"></td>
        <td><input data-bp="cubierta" type="checkbox"${p.cubierta ? " checked" : ""} aria-label="Cubierta"></td>
        <td>${sel("dificultad", p.dificultad, Object.keys(DIFICULTAD).map(k => [k, DIFICULTAD[k].etiqueta]))}</td>
        <td class="col-acc"><button type="button" class="linea__quitar" data-delp="${i}" aria-label="Borrar">×</button></td>
      </tr>`).join("")}</tbody></table>`;
  }

  function bindBases() {
    const vista = $("vista-bases");
    const alEditar = (e) => {
      const el = e.target, tr = el.closest("tr"); if (!tr) return;
      const i = Number(tr.dataset.i);
      if (el.dataset.bm) {
        const m = estado.materiales[i], k = el.dataset.bm;
        m[k] = (k === "nombre" || k === "unidad") ? el.value : num(el.value);
        if (k === "unidad" && e.type === "change") {
          if (m.unidad === "plancha" && !(num(m.largo) && num(m.ancho))) { m.largo = 250; m.ancho = 183; }
          guardar(K.materiales, estado.materiales); renderBases(); return;
        }
        tr.querySelector("[data-m2]").textContent = (m.unidad === "plancha" || m.unidad === "m2") ? fmt(precioPorM2(m)) : "—";
        guardar(K.materiales, estado.materiales);
      } else if (el.dataset.bh) {
        const h = estado.herrajes[i], k = el.dataset.bh;
        h[k] = k === "nombre" ? el.value : num(el.value);
        guardar(K.herrajes, estado.herrajes);
      } else if (el.dataset.bp) {
        const p = estado.plantillas[i], k = el.dataset.bp;
        if (el.type === "checkbox") p[k] = el.checked;
        else if (el.type === "number") p[k] = num(el.value);
        else p[k] = el.value;
        guardar(K.plantillas, estado.plantillas);
        $("nuevoTipo").innerHTML = estado.plantillas.map(x => `<option>${esc(x.tipo)}</option>`).join("");
      }
    };
    vista.addEventListener("input", alEditar);
    vista.addEventListener("change", alEditar);
    vista.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.delm !== undefined) {
        const m = estado.materiales[Number(b.dataset.delm)];
        if (!confirm(`¿Borrar "${m.nombre}"? Las cotizaciones guardadas conservan su precio.`)) return;
        estado.materiales.splice(Number(b.dataset.delm), 1);
        guardar(K.materiales, estado.materiales); renderBases();
      }
      if (b.dataset.delh !== undefined) {
        const h = estado.herrajes[Number(b.dataset.delh)];
        if (!confirm(`¿Borrar "${h.nombre}"?`)) return;
        estado.herrajes.splice(Number(b.dataset.delh), 1);
        guardar(K.herrajes, estado.herrajes); renderBases();
      }
      if (b.dataset.delp !== undefined) {
        if (estado.plantillas.length <= 1) { toast("Deja al menos una plantilla.", "error"); return; }
        const p = estado.plantillas[Number(b.dataset.delp)];
        if (!confirm(`¿Borrar la plantilla "${p.tipo}"?`)) return;
        estado.plantillas.splice(Number(b.dataset.delp), 1);
        guardar(K.plantillas, estado.plantillas); renderBases();
      }
    });
    $("btnAddBaseMaterial").addEventListener("click", () => {
      estado.materiales.push({ id: idCorto("m"), nombre: "Nuevo material", unidad: "plancha", largo: 250, ancho: 183, precio: 0 });
      guardar(K.materiales, estado.materiales); renderBases();
      const filas = $$("#tablaMateriales tbody tr"); filas[filas.length - 1].querySelector("input").select();
    });
    $("btnAddBaseHerraje").addEventListener("click", () => {
      estado.herrajes.push({ id: idCorto("h"), nombre: "Nuevo herraje", precio: 0 });
      guardar(K.herrajes, estado.herrajes); renderBases();
      const filas = $$("#tablaHerrajes tbody tr"); filas[filas.length - 1].querySelector("input").select();
    });
  }

  /* ============================================================
     AJUSTES
     ============================================================ */
  function cargarAjustes() {
    const c = estado.config;
    const lineales = estado.materiales.filter(m => m.unidad === "ml");
    $("cfgTapaCuerpo").innerHTML = opciones(lineales, c.tapacantoCuerpoId);
    $("cfgTapaFrente").innerHTML = opciones(lineales, c.tapacantoFrenteId);
    $$("[data-cfg]").forEach(el => {
      const v = getPath(c, el.dataset.cfg);
      if (el.type === "checkbox") el.checked = !!v; else el.value = v === undefined || v === null ? "" : v;
    });
    $$("[data-gg]").forEach(el => { el.value = c.gastosGenerales[el.dataset.gg] || ""; });
    calcularGastos();
  }

  function leerGastos() {
    const g = {};
    $$("[data-gg]").forEach(el => { g[el.dataset.gg] = num(el.value); });
    return g;
  }

  function calcularGastos() {
    const g = leerGastos();
    const herramientas = g.herramientasMeses > 0 ? g.herramientasValor / g.herramientasMeses : 0;
    const mensual = g.arriendo + g.servicios + g.telefono + g.vehiculo + g.otros + herramientas;
    let html = `<div>Gastos fijos al mes: <strong>${fmt(mensual)}</strong>${herramientas ? ` <small>(herramientas: ${fmt(herramientas)}/mes)</small>` : ""}</div>`;
    if (g.costoDirectoMes > 0 && mensual > 0) {
      const pct = Math.round(mensual / g.costoDirectoMes * 1000) / 10;
      html += `<div>Gastos generales sugeridos: <strong>${pct.toLocaleString("es-CL")}%</strong></div>
        <button type="button" class="btn btn--mini btn--primario" data-usar-gg="${pct}">Usar ${pct.toLocaleString("es-CL")}%</button>`;
    } else {
      html += `<div class="ayuda">Completa los gastos y el costo directo de un mes normal para calcular el %.</div>`;
    }
    $("resultadoGastos").innerHTML = html;
  }

  function bindAjustes() {
    $("calcGastos").addEventListener("input", calcularGastos);
    $("resultadoGastos").addEventListener("click", (e) => {
      const b = e.target.closest("[data-usar-gg]"); if (!b) return;
      $("cfgIndirectos").value = b.dataset.usarGg;
      toast("Listo. Presiona \"Guardar ajustes\" para usarlo en las cotizaciones nuevas.", "ok");
    });

    $("btnGuardarAjustes").addEventListener("click", () => {
      const c = estado.config;
      $$("[data-cfg]").forEach(el => {
        const v = el.type === "checkbox" ? el.checked : el.type === "number" ? num(el.value) : el.value;
        setPath(c, el.dataset.cfg, v);
      });
      if (!c.empresa.nombre.trim()) c.empresa.nombre = "Mavimuebles";
      if (!c.monedaSimbolo) c.monedaSimbolo = "$";
      c.gastosGenerales = leerGastos();
      if (guardar(K.config, c)) {
        aplicarMarca();
        pintarCabecera();
        toast("Ajustes guardados. Se usan en las cotizaciones nuevas.", "ok");
      }
    });

    $("btnExportar").addEventListener("click", () => {
      const data = {
        _app: "mavimuebles-cotizador", _version: VERSION_DATOS, _exportado: new Date().toISOString(),
        config: estado.config, materiales: estado.materiales, herrajes: estado.herrajes,
        plantillas: estado.plantillas, cotizaciones: estado.cotizaciones
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = `mavimuebles-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Respaldo descargado. Guárdalo en un lugar seguro.", "ok");
    });

    $("btnImportar").addEventListener("click", () => $("fileImportar").click());
    $("fileImportar").addEventListener("change", (e) => {
      const archivo = e.target.files[0]; if (!archivo) return;
      const lector = new FileReader();
      lector.onload = () => {
        let d;
        try { d = JSON.parse(lector.result); } catch (err) { toast("El archivo no es un respaldo válido.", "error"); return; }
        if (!d || !(d.cotizaciones || d.materiales || d.config)) { toast("El archivo no es un respaldo del cotizador.", "error"); return; }
        if (!confirm("Esto REEMPLAZA los datos actuales por los del respaldo. ¿Continuar?")) return;
        ["config", "materiales", "herrajes", "plantillas", "cotizaciones"].forEach(k => { if (d[k]) guardar(K[k], d[k]); });
        guardar(K.version, d._version || 1);
        estado.sucio = false;
        location.reload();
      };
      lector.readAsText(archivo);
      e.target.value = "";
    });

    $("btnReset").addEventListener("click", () => {
      if (!confirm("Esto BORRA todo (cotizaciones, precios y ajustes) y vuelve a los valores de fábrica.\n\nTe recomendamos descargar un respaldo antes. ¿Continuar?")) return;
      Object.keys(K).forEach(k => localStorage.removeItem(K[k]));
      estado.sucio = false;
      location.reload();
    });
  }

  /* ============================================================
     UTILIDADES
     ============================================================ */
  function toast(msg, tipo) {
    const el = $("toast");
    el.textContent = msg;
    el.className = "toast" + (tipo ? " toast--" + tipo : "");
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 3200);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
