/* ============================================================
   MAVIMUEBLES — Cotizador
   Archivo: js/app.js
   ------------------------------------------------------------
   La aplicación: conecta los formularios con el cálculo, guarda
   en el navegador (localStorage), arma el historial, las bases
   editables y el documento de cotización para imprimir/PDF.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Atajos ---------- */
  const $  = (id) => document.getElementById(id);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ---------- Claves de guardado ---------- */
  const K = {
    config: "mavi_config",
    materiales: "mavi_materiales",
    herrajes: "mavi_herrajes",
    plantillas: "mavi_plantillas",
    cotizaciones: "mavi_cotizaciones"
  };

  /* ---------- Almacenamiento ---------- */
  function cargar(clave, defecto) {
    try {
      const v = localStorage.getItem(clave);
      return v ? JSON.parse(v) : structuredCopia(defecto);
    } catch (e) { return structuredCopia(defecto); }
  }
  function guardar(clave, valor) { localStorage.setItem(clave, JSON.stringify(valor)); }
  function structuredCopia(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- Estado en memoria ---------- */
  const estado = {
    config: cargar(K.config, CONFIG_DEFECTO),
    empresa: null, // dentro de config
    materiales: cargar(K.materiales, MATERIALES_DEFECTO),
    herrajes: cargar(K.herrajes, HERRAJES_DEFECTO),
    plantillas: cargar(K.plantillas, PLANTILLAS_DEFECTO),
    cotizaciones: cargar(K.cotizaciones, []),
    lineasMat: [],     // [{materialId, cantidad}]
    lineasHer: [],     // [{herrajeId, cantidad}]
    editandoId: null,  // id de cotización en edición
    ultimoResultado: null,
    filtroEstado: "todos"
  };
  // empresa vive dentro de config (para compatibilidad si no existe)
  if (!estado.config.empresa) estado.config.empresa = structuredCopia(EMPRESA_DEFECTO);

  /* ============================================================
     NAVEGACIÓN ENTRE VISTAS
     ============================================================ */
  function mostrarVista(nombre) {
    $$(".vista").forEach(v => v.hidden = (v.id !== "vista-" + nombre));
    $$(".tab").forEach(t => t.classList.toggle("tab--activa", t.dataset.vista === nombre));
    if (nombre === "inicio") renderPanel();
    if (nombre === "historial") renderHistorial();
    if (nombre === "bases") renderBases();
    if (nombre === "ajustes") cargarAjustesEnForm();
    window.scrollTo(0, 0);
  }
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-vista]");
    if (btn) { mostrarVista(btn.dataset.vista); }
  });

  /* ============================================================
     INICIALIZACIÓN
     ============================================================ */
  function init() {
    aplicarMarca();
    poblarSelectsProyecto();
    nuevaCotizacion();          // prepara el formulario en blanco
    bindEventosCotizar();
    bindEventosAjustes();
    bindEventosBases();
    mostrarVista("cotizar");
  }

  function aplicarMarca() {
    const em = estado.config.empresa;
    $("cabNombre").textContent = em.nombre || "Mavimuebles";
    $("cabEslogan").textContent = em.eslogan || "";
  }

  /* ============================================================
     VISTA COTIZAR — preparar formulario
     ============================================================ */
  function poblarSelectsProyecto() {
    // Tipo de mueble (desde plantillas)
    $("proTipo").innerHTML = estado.plantillas
      .map(p => `<option value="${p.tipo}">${p.tipo}</option>`).join("");
    // Material principal
    $("proMaterial").innerHTML = estado.materiales
      .map(m => `<option value="${m.id}">${m.nombre}</option>`).join("");
    // Dificultad
    $("proDificultad").innerHTML = Object.keys(DIFICULTAD)
      .map(k => `<option value="${k}">${DIFICULTAD[k].etiqueta}</option>`).join("");
  }

  function nuevaCotizacion() {
    estado.editandoId = null;
    estado.lineasMat = [];
    estado.lineasHer = [];
    $("tituloCotizar").textContent = "Nueva cotización";
    $("cotId").value = "";
    $("estadoActual").hidden = true;

    // Limpiar cliente / proyecto
    ["cliNombre","cliTelefono","cliCorreo","cliDireccion","cliObs",
     "proDesc","proAlto","proAncho","proProf","proColor"].forEach(id => $(id).value = "");
    $("proCantidad").value = 1;
    $("proInstalacion").checked = true;
    $("proDespacho").checked = false;
    $("hDiseno").value = 0; $("hFab").value = 0; $("hInst").value = 0;
    $("costoDespacho").value = 0; $("costoOtros").value = 0;

    // Parámetros desde config
    const c = estado.config;
    $("valorHora").value = c.valorHora;
    $("parMerma").value = c.mermaPct;
    $("parIndirectos").value = c.indirectosPct;
    $("parImprevistos").value = c.imprevistosPct;
    $("parMargen").value = c.margenPct;
    $("parDescuento").value = c.descuentoPct;
    $("parIvaActivo").checked = !!c.ivaActivo;

    renderLineasMat();
    renderLineasHer();
    recalcular();
  }

  /* ---------- Líneas de materiales ---------- */
  function renderLineasMat() {
    const cont = $("lineasMateriales");
    if (estado.lineasMat.length === 0) {
      cont.innerHTML = `<p class="vacio">Sin materiales aún. Agrega uno o usa "Estimar m² del mueble".</p>`;
      recalcular(); return;
    }
    cont.innerHTML = estado.lineasMat.map((ln, i) => {
      const opciones = estado.materiales.map(m =>
        `<option value="${m.id}" ${m.id === ln.materialId ? "selected" : ""}>${m.nombre} (${unidadTxt(m.unidad)})</option>`
      ).join("");
      const mat = buscarMaterial(ln.materialId);
      const total = mat ? mat.precio * (Number(ln.cantidad) || 0) : 0;
      return `<div class="linea" data-i="${i}">
        <select class="lm-mat">${opciones}</select>
        <input class="lm-cant" type="number" min="0" step="0.01" value="${ln.cantidad}" title="Cantidad en ${mat ? unidadTxt(mat.unidad) : ''}">
        <span class="linea__total">${formatearDinero(total, estado.config)}</span>
        <button class="linea__quitar" title="Quitar" data-quitar-mat="${i}">×</button>
      </div>`;
    }).join("");
    recalcular();
  }

  /* ---------- Líneas de herrajes ---------- */
  function renderLineasHer() {
    const cont = $("lineasHerrajes");
    if (estado.lineasHer.length === 0) {
      cont.innerHTML = `<p class="vacio">Sin herrajes aún.</p>`;
      recalcular(); return;
    }
    cont.innerHTML = estado.lineasHer.map((ln, i) => {
      const opciones = estado.herrajes.map(h =>
        `<option value="${h.id}" ${h.id === ln.herrajeId ? "selected" : ""}>${h.nombre}</option>`
      ).join("");
      const her = buscarHerraje(ln.herrajeId);
      const total = her ? her.precio * (Number(ln.cantidad) || 0) : 0;
      return `<div class="linea" data-i="${i}">
        <select class="lh-her">${opciones}</select>
        <input class="lh-cant" type="number" min="0" step="1" value="${ln.cantidad}" title="Cantidad">
        <span class="linea__total">${formatearDinero(total, estado.config)}</span>
        <button class="linea__quitar" title="Quitar" data-quitar-her="${i}">×</button>
      </div>`;
    }).join("");
    recalcular();
  }

  function unidadTxt(u) { return u === "m2" ? "m²" : u === "ml" ? "m lineal" : "unidad"; }
  function buscarMaterial(id) { return estado.materiales.find(m => m.id === id); }
  function buscarHerraje(id) { return estado.herrajes.find(h => h.id === id); }

  /* ============================================================
     RECÁLCULO EN VIVO
     ============================================================ */
  function leerDatosFormulario() {
    const dif = DIFICULTAD[$("proDificultad").value] || DIFICULTAD.media;
    const materiales = estado.lineasMat.map(ln => {
      const m = buscarMaterial(ln.materialId) || { nombre: "—", unidad: "un", precio: 0 };
      return { nombre: m.nombre, unidad: m.unidad, precio: m.precio, cantidad: Number(ln.cantidad) || 0 };
    });
    const herrajes = estado.lineasHer.map(ln => {
      const h = buscarHerraje(ln.herrajeId) || { nombre: "—", precio: 0 };
      return { nombre: h.nombre, precio: h.precio, cantidad: Number(ln.cantidad) || 0 };
    });
    return {
      materiales, herrajes,
      horas: { diseno: $("hDiseno").value, fabricacion: $("hFab").value, instalacion: $("hInst").value },
      factorDificultad: dif.factor,
      requiereInstalacion: $("proInstalacion").checked,
      despacho: $("proDespacho").checked ? Number($("costoDespacho").value) || 0 : 0,
      otros: Number($("costoOtros").value) || 0,
      valorHora: $("valorHora").value,
      mermaPct: $("parMerma").value,
      indirectosPct: $("parIndirectos").value,
      imprevistosPct: $("parImprevistos").value,
      margenPct: $("parMargen").value,
      descuentoPct: $("parDescuento").value,
      ivaActivo: $("parIvaActivo").checked,
      ivaPct: estado.config.ivaPct
    };
  }

  function recalcular() {
    const datos = leerDatosFormulario();
    const r = calcularCotizacion(datos, estado.config);
    estado.ultimoResultado = r;
    renderDesglose(r);
  }

  function renderDesglose(r) {
    const f = (v) => formatearDinero(v, estado.config);
    const c = estado.config;
    $("desglose").innerHTML = `
      <h3>Desglose del presupuesto</h3>
      <div class="fila fila--costo"><span>Materiales</span><span>${f(r.costoMateriales)}</span></div>
      <div class="fila fila--costo"><span>Merma (${num0($("parMerma").value)}%)</span><span>${f(r.merma)}</span></div>
      <div class="fila fila--costo"><span>Herrajes</span><span>${f(r.costoHerrajes)}</span></div>
      <div class="fila fila--costo"><span>Mano de obra</span><span>${f(r.manoObra)}</span></div>
      <div class="fila fila--costo"><span>Instalación</span><span>${f(r.instalacion)}</span></div>
      <div class="fila fila--costo"><span>Despacho</span><span>${f(r.despacho)}</span></div>
      <div class="fila fila--costo"><span>Otros</span><span>${f(r.otros)}</span></div>
      <div class="fila fila--sub"><span>Subtotal costos</span><span>${f(r.subtotalCosto)}</span></div>
      <div class="fila fila--costo"><span>Gastos generales</span><span>${f(r.indirectos)}</span></div>
      <div class="fila fila--costo"><span>Imprevistos</span><span>${f(r.imprevistos)}</span></div>
      <div class="fila fila--sub"><span>Costo total</span><span>${f(r.costoTotal)}</span></div>
      <div class="fila fila--ganancia"><span>Ganancia (${Math.round(r.gananciaPct)}%)</span><span>${f(r.ganancia)}</span></div>
      ${r.descuento > 0 ? `<div class="fila"><span>Precio neto</span><span>${f(r.precioNeto)}</span></div>
        <div class="fila"><span>Descuento</span><span>− ${f(r.descuento)}</span></div>` : ``}
      <div class="fila"><span>Neto</span><span>${f(r.netoFinal)}</span></div>
      ${r.iva > 0 ? `<div class="fila"><span>IVA (${c.ivaPct}%)</span><span>${f(r.iva)}</span></div>` : ``}
      <div class="precio-cliente">
        <div class="precio-cliente__lbl">Precio sugerido al cliente</div>
        <div class="precio-cliente__num">${f(r.total)}</div>
      </div>`;
  }

  function num0(v){ return Math.round(Number(v)||0); }

  /* ============================================================
     EVENTOS DE LA VISTA COTIZAR
     ============================================================ */
  function bindEventosCotizar() {
    // Recalcular ante cualquier cambio de input en la vista cotizar
    $("vista-cotizar").addEventListener("input", recalcular);

    // Cambios dentro de líneas de materiales
    $("lineasMateriales").addEventListener("change", (e) => {
      const fila = e.target.closest(".linea"); if (!fila) return;
      const i = Number(fila.dataset.i);
      if (e.target.classList.contains("lm-mat")) estado.lineasMat[i].materialId = e.target.value;
      if (e.target.classList.contains("lm-cant")) estado.lineasMat[i].cantidad = e.target.value;
      renderLineasMat();
    });
    $("lineasMateriales").addEventListener("input", (e) => {
      const fila = e.target.closest(".linea"); if (!fila) return;
      const i = Number(fila.dataset.i);
      if (e.target.classList.contains("lm-cant")) {
        estado.lineasMat[i].cantidad = e.target.value;
        const mat = buscarMaterial(estado.lineasMat[i].materialId);
        fila.querySelector(".linea__total").textContent =
          formatearDinero((mat ? mat.precio : 0) * (Number(e.target.value)||0), estado.config);
        recalcular();
      }
    });
    $("lineasMateriales").addEventListener("click", (e) => {
      if (e.target.dataset.quitarMat !== undefined) {
        estado.lineasMat.splice(Number(e.target.dataset.quitarMat), 1);
        renderLineasMat();
      }
    });

    // Cambios dentro de líneas de herrajes
    $("lineasHerrajes").addEventListener("change", (e) => {
      const fila = e.target.closest(".linea"); if (!fila) return;
      const i = Number(fila.dataset.i);
      if (e.target.classList.contains("lh-her")) estado.lineasHer[i].herrajeId = e.target.value;
      if (e.target.classList.contains("lh-cant")) estado.lineasHer[i].cantidad = e.target.value;
      renderLineasHer();
    });
    $("lineasHerrajes").addEventListener("input", (e) => {
      const fila = e.target.closest(".linea"); if (!fila) return;
      const i = Number(fila.dataset.i);
      if (e.target.classList.contains("lh-cant")) {
        estado.lineasHer[i].cantidad = e.target.value;
        const her = buscarHerraje(estado.lineasHer[i].herrajeId);
        fila.querySelector(".linea__total").textContent =
          formatearDinero((her ? her.precio : 0) * (Number(e.target.value)||0), estado.config);
        recalcular();
      }
    });
    $("lineasHerrajes").addEventListener("click", (e) => {
      if (e.target.dataset.quitarHer !== undefined) {
        estado.lineasHer.splice(Number(e.target.dataset.quitarHer), 1);
        renderLineasHer();
      }
    });

    // Botones agregar línea
    $("btnAddMaterial").addEventListener("click", () => {
      estado.lineasMat.push({ materialId: estado.materiales[0].id, cantidad: 1 });
      renderLineasMat();
    });
    $("btnAddHerraje").addEventListener("click", () => {
      estado.lineasHer.push({ herrajeId: estado.herrajes[0].id, cantidad: 1 });
      renderLineasHer();
    });

    // Estimar m²
    $("btnSugerirM2").addEventListener("click", () => {
      const m2 = estimarSuperficieM2($("proAlto").value, $("proAncho").value, $("proProf").value, $("proCantidad").value);
      if (m2 <= 0) { toast("Ingresa alto, ancho y profundidad primero.", "error"); return; }
      const matId = $("proMaterial").value;
      // si ya hay una línea con ese material, actualizar; si no, crear
      const existente = estado.lineasMat.find(l => l.materialId === matId);
      if (existente) existente.cantidad = m2;
      else estado.lineasMat.push({ materialId: matId, cantidad: m2 });
      renderLineasMat();
      toast(`Estimado: ${m2} m² de material.`, "ok");
    });

    // Autocompletar desde plantilla
    $("btnPlantilla").addEventListener("click", () => {
      const p = estado.plantillas.find(x => x.tipo === $("proTipo").value);
      if (!p) return;
      $("hDiseno").value = p.hDiseno;
      $("hFab").value = p.hFab;
      $("hInst").value = p.hInst;
      $("proDificultad").value = p.dificultad;
      if (p.material) $("proMaterial").value = p.material;
      recalcular();
      toast("Plantilla aplicada. Ajusta las horas si hace falta.", "ok");
    });

    // Guardar / Imprimir / Nueva
    $("btnGuardar").addEventListener("click", guardarCotizacion);
    $("btnImprimir").addEventListener("click", () => {
      const cot = construirCotizacionDesdeForm();
      if (!cot.cliente.nombre) { toast("Pon al menos el nombre del cliente.", "error"); return; }
      generarDocumento(cot);
      window.print();
    });
    $("btnNueva").addEventListener("click", () => { nuevaCotizacion(); toast("Listo para una nueva cotización.", "ok"); });
  }

  /* ---------- Construir objeto cotización desde el formulario ---------- */
  function construirCotizacionDesdeForm() {
    const datos = leerDatosFormulario();
    const r = calcularCotizacion(datos, estado.config);
    const dif = $("proDificultad").value;
    return {
      id: estado.editandoId || ("COT-" + Date.now()),
      numero: estado.editandoId ? (buscarCotizacion(estado.editandoId)?.numero) : siguienteNumero(),
      fecha: new Date().toISOString(),
      estado: estado.editandoId ? (buscarCotizacion(estado.editandoId)?.estado || "pendiente") : "pendiente",
      cliente: {
        nombre: $("cliNombre").value.trim(),
        telefono: $("cliTelefono").value.trim(),
        correo: $("cliCorreo").value.trim(),
        direccion: $("cliDireccion").value.trim(),
        observaciones: $("cliObs").value.trim()
      },
      proyecto: {
        tipo: $("proTipo").value,
        descripcion: $("proDesc").value.trim(),
        alto: $("proAlto").value, ancho: $("proAncho").value, prof: $("proProf").value,
        cantidad: $("proCantidad").value,
        material: ($("proMaterial").selectedOptions[0] || {}).text || "",
        color: $("proColor").value.trim(),
        dificultad: (DIFICULTAD[dif] || {}).etiqueta || "",
        requiereInstalacion: $("proInstalacion").checked,
        requiereDespacho: $("proDespacho").checked
      },
      lineasMat: structuredCopia(estado.lineasMat),
      lineasHer: structuredCopia(estado.lineasHer),
      formulario: {
        hDiseno: $("hDiseno").value, hFab: $("hFab").value, hInst: $("hInst").value,
        valorHora: $("valorHora").value, despacho: $("costoDespacho").value, otros: $("costoOtros").value,
        merma: $("parMerma").value, indirectos: $("parIndirectos").value, imprevistos: $("parImprevistos").value,
        margen: $("parMargen").value, descuento: $("parDescuento").value, ivaActivo: $("parIvaActivo").checked
      },
      resultado: r
    };
  }

  function siguienteNumero() {
    const max = estado.cotizaciones.reduce((m, c) => Math.max(m, c.numero || 0), 0);
    return max + 1;
  }
  function buscarCotizacion(id) { return estado.cotizaciones.find(c => c.id === id); }

  /* ---------- Guardar cotización ---------- */
  function guardarCotizacion() {
    const cot = construirCotizacionDesdeForm();
    if (!cot.cliente.nombre) { toast("Pon al menos el nombre del cliente.", "error"); return; }

    const idx = estado.cotizaciones.findIndex(c => c.id === cot.id);
    if (idx >= 0) estado.cotizaciones[idx] = cot;
    else estado.cotizaciones.unshift(cot);

    guardar(K.cotizaciones, estado.cotizaciones);
    estado.editandoId = cot.id;
    $("cotId").value = cot.id;
    $("tituloCotizar").textContent = `Cotización N° ${cot.numero}`;
    pintarEstadoActual(cot.estado);
    toast(idx >= 0 ? "Cotización actualizada." : "Cotización guardada.", "ok");
  }

  function pintarEstadoActual(est) {
    const el = $("estadoActual");
    const meta = ESTADOS.find(e => e.id === est) || ESTADOS[0];
    el.hidden = false;
    el.className = "pill pill--" + est;
    el.textContent = meta.etiqueta;
  }

  /* ============================================================
     PANEL / INICIO
     ============================================================ */
  function renderPanel() {
    const cots = estado.cotizaciones;
    const f = (v) => formatearDinero(v, estado.config);
    const por = (e) => cots.filter(c => c.estado === e);
    const sum = (arr) => arr.reduce((s, c) => s + (c.resultado ? c.resultado.total : 0), 0);
    const aceptadas = por("aceptado").concat(por("terminado"));
    const tarjetas = [
      { num: cots.length, lbl: "Cotizaciones totales" },
      { num: por("pendiente").length, lbl: "Pendientes" },
      { num: aceptadas.length, lbl: "Aceptadas / terminadas" },
      { num: f(sum(aceptadas)), lbl: "Ventas estimadas (aprobadas)" },
      { num: f(sum(por("pendiente"))), lbl: "Cotizado pendiente" }
    ];
    $("panelResumen").innerHTML = tarjetas.map(t =>
      `<div class="tarjeta"><div class="tarjeta__num">${t.num}</div><div class="tarjeta__lbl">${t.lbl}</div></div>`
    ).join("");

    const recientes = cots.slice(0, 5);
    $("panelRecientes").innerHTML = recientes.length
      ? recientes.map(filaHistorial).join("")
      : `<p class="vacio">Aún no hay cotizaciones. Crea la primera.</p>`;
  }

  /* ============================================================
     HISTORIAL
     ============================================================ */
  function renderHistorial() {
    // filtros
    const filtros = [{ id: "todos", etiqueta: "Todas" }].concat(ESTADOS);
    $("filtrosEstado").innerHTML = filtros.map(e =>
      `<button class="btn btn--mini ${estado.filtroEstado === e.id ? "activo" : ""}" data-filtro="${e.id}">${e.etiqueta}</button>`
    ).join("");

    let lista = estado.cotizaciones;
    if (estado.filtroEstado !== "todos") lista = lista.filter(c => c.estado === estado.filtroEstado);

    $("listaHistorial").innerHTML = lista.length
      ? lista.map(filaHistorial).join("")
      : `<p class="vacio">No hay cotizaciones en este filtro.</p>`;
  }

  function filaHistorial(c) {
    const f = (v) => formatearDinero(v, estado.config);
    const fecha = new Date(c.fecha).toLocaleDateString("es-CL");
    const opts = ESTADOS.map(e =>
      `<option value="${e.id}" ${c.estado === e.id ? "selected" : ""}>${e.etiqueta}</option>`).join("");
    return `<div class="hist" data-id="${c.id}">
      <div class="hist__info">
        <div class="hist__cliente">N° ${c.numero || "—"} · ${c.cliente.nombre || "Sin nombre"}
          <span class="pill pill--${c.estado}">${(ESTADOS.find(e=>e.id===c.estado)||{}).etiqueta||""}</span></div>
        <div class="hist__meta">${c.proyecto.tipo || ""} · ${fecha} ${c.cliente.telefono ? "· "+c.cliente.telefono : ""}</div>
      </div>
      <div class="hist__precio">${f(c.resultado ? c.resultado.total : 0)}</div>
      <div class="hist__acciones">
        <select data-estado="${c.id}" title="Cambiar estado">${opts}</select>
        <button class="btn btn--mini" data-abrir="${c.id}">Abrir</button>
        <button class="btn btn--mini" data-pdf="${c.id}">PDF</button>
        <button class="btn btn--mini btn--peligro" data-borrar="${c.id}">Borrar</button>
      </div>
    </div>`;
  }

  // Delegación de eventos para historial y panel
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t.dataset.filtro) { estado.filtroEstado = t.dataset.filtro; renderHistorial(); }
    if (t.dataset.abrir) abrirCotizacion(t.dataset.abrir);
    if (t.dataset.pdf) { const c = buscarCotizacion(t.dataset.pdf); if (c){ generarDocumento(c); window.print(); } }
    if (t.dataset.borrar) borrarCotizacion(t.dataset.borrar);
  });
  document.addEventListener("change", (e) => {
    if (e.target.dataset.estado) {
      const c = buscarCotizacion(e.target.dataset.estado);
      if (c) { c.estado = e.target.value; guardar(K.cotizaciones, estado.cotizaciones); renderHistorial(); toast("Estado actualizado.", "ok"); }
    }
  });

  function abrirCotizacion(id) {
    const c = buscarCotizacion(id); if (!c) return;
    estado.editandoId = c.id;
    $("cotId").value = c.id;
    $("tituloCotizar").textContent = `Cotización N° ${c.numero}`;
    pintarEstadoActual(c.estado);

    $("cliNombre").value = c.cliente.nombre || "";
    $("cliTelefono").value = c.cliente.telefono || "";
    $("cliCorreo").value = c.cliente.correo || "";
    $("cliDireccion").value = c.cliente.direccion || "";
    $("cliObs").value = c.cliente.observaciones || "";

    $("proTipo").value = c.proyecto.tipo || estado.plantillas[0].tipo;
    $("proDesc").value = c.proyecto.descripcion || "";
    $("proAlto").value = c.proyecto.alto || "";
    $("proAncho").value = c.proyecto.ancho || "";
    $("proProf").value = c.proyecto.prof || "";
    $("proCantidad").value = c.proyecto.cantidad || 1;
    $("proColor").value = c.proyecto.color || "";
    // dificultad: mapear etiqueta -> clave
    const difKey = Object.keys(DIFICULTAD).find(k => DIFICULTAD[k].etiqueta === c.proyecto.dificultad) || "media";
    $("proDificultad").value = difKey;
    $("proInstalacion").checked = !!c.proyecto.requiereInstalacion;
    $("proDespacho").checked = !!c.proyecto.requiereDespacho;

    const fm = c.formulario || {};
    $("hDiseno").value = fm.hDiseno || 0; $("hFab").value = fm.hFab || 0; $("hInst").value = fm.hInst || 0;
    $("valorHora").value = fm.valorHora || estado.config.valorHora;
    $("costoDespacho").value = fm.despacho || 0; $("costoOtros").value = fm.otros || 0;
    $("parMerma").value = fm.merma ?? estado.config.mermaPct;
    $("parIndirectos").value = fm.indirectos ?? estado.config.indirectosPct;
    $("parImprevistos").value = fm.imprevistos ?? estado.config.imprevistosPct;
    $("parMargen").value = fm.margen ?? estado.config.margenPct;
    $("parDescuento").value = fm.descuento ?? estado.config.descuentoPct;
    $("parIvaActivo").checked = !!fm.ivaActivo;

    // material principal: intentar reconstruir desde la línea o el texto
    estado.lineasMat = structuredCopia(c.lineasMat || []);
    estado.lineasHer = structuredCopia(c.lineasHer || []);
    renderLineasMat();
    renderLineasHer();
    recalcular();
    mostrarVista("cotizar");
  }

  function borrarCotizacion(id) {
    if (!confirm("¿Borrar esta cotización? No se puede deshacer.")) return;
    estado.cotizaciones = estado.cotizaciones.filter(c => c.id !== id);
    guardar(K.cotizaciones, estado.cotizaciones);
    if (estado.editandoId === id) nuevaCotizacion();
    renderHistorial();
    toast("Cotización borrada.", "ok");
  }

  /* ============================================================
     DOCUMENTO DE COTIZACIÓN (imprimir / PDF)
     ============================================================ */
  function generarDocumento(c) {
    const em = estado.config.empresa;
    const cfg = estado.config;
    const f = (v) => formatearDinero(v, cfg);
    const r = c.resultado;
    const fecha = new Date(c.fecha).toLocaleDateString("es-CL");
    const valido = new Date(new Date(c.fecha).getTime() + (cfg.validezDias*86400000)).toLocaleDateString("es-CL");
    const p = c.proyecto;
    const medidas = (p.alto || p.ancho || p.prof)
      ? `${p.alto||"–"} (alto) × ${p.ancho||"–"} (ancho) × ${p.prof||"–"} (prof) cm` : "—";

    // Filas de detalle (resumen de partidas)
    const filas = [
      ["Materiales", r.costoMateriales],
      ["Herrajes y accesorios", r.costoHerrajes],
      ["Mano de obra", r.manoObra],
      c.proyecto.requiereInstalacion ? ["Instalación", r.instalacion] : null,
      c.proyecto.requiereDespacho ? ["Despacho / traslado", r.despacho] : null
    ].filter(Boolean)
     .map(([n, v]) => `<tr><td>${n}</td><td class="der">${f(v)}</td></tr>`).join("");

    $("documento").innerHTML = `
      <div class="documento__hoja">
        <div class="doc-cab">
          <div class="doc-marca">${em.nombre}<small>${em.eslogan || ""}</small></div>
          <div class="doc-meta">
            <strong>COTIZACIÓN N° ${c.numero || ""}</strong><br>
            Fecha: ${fecha}<br>
            Válida hasta: ${valido}
          </div>
        </div>

        <div class="doc-grid">
          <div class="doc-caja">
            <h4>Cliente</h4>
            <p><strong>${c.cliente.nombre || "—"}</strong></p>
            ${c.cliente.telefono ? `<p>Tel: ${c.cliente.telefono}</p>` : ""}
            ${c.cliente.correo ? `<p>${c.cliente.correo}</p>` : ""}
            ${c.cliente.direccion ? `<p>${c.cliente.direccion}</p>` : ""}
          </div>
          <div class="doc-caja">
            <h4>Proyecto</h4>
            <p><strong>${p.tipo}</strong>${p.cantidad ? ` · ${p.cantidad} unidad(es)` : ""}</p>
            <p>Material: ${p.material || "—"}${p.color ? " · "+p.color : ""}</p>
            <p>Medidas: ${medidas}</p>
            <p>Dificultad: ${p.dificultad || "—"}</p>
          </div>
        </div>

        ${p.descripcion ? `<div class="doc-caja" style="margin-bottom:14px"><h4>Descripción del trabajo</h4><p>${p.descripcion}</p></div>` : ""}

        <table class="doc-tabla">
          <thead><tr><th>Detalle</th><th class="der">Valor</th></tr></thead>
          <tbody>
            ${filas}
            ${r.descuento > 0 ? `<tr><td>Descuento</td><td class="der">− ${f(r.descuento)}</td></tr>` : ""}
            ${r.iva > 0 ? `<tr><td>Neto</td><td class="der">${f(r.netoFinal)}</td></tr>
                          <tr><td>IVA (${cfg.ivaPct}%)</td><td class="der">${f(r.iva)}</td></tr>` : ""}
          </tbody>
        </table>

        <div class="doc-total">TOTAL: ${f(r.total)}</div>

        <div class="doc-cond">
          <h4>Condiciones comerciales</h4>
          <p><strong>Tiempo estimado de fabricación:</strong> ${cfg.tiempoFabricacionDias} días hábiles aprox.</p>
          <p><strong>Validez de la cotización:</strong> ${cfg.validezDias} días.</p>
          <p><strong>Forma de pago:</strong> ${cfg.formaPago}</p>
          ${cfg.condiciones ? `<p>${cfg.condiciones}</p>` : ""}
          ${c.cliente.observaciones ? `<p><strong>Observaciones:</strong> ${c.cliente.observaciones}</p>` : ""}
        </div>

        <div class="doc-firma">
          <div>${em.nombre}<br>${em.telefono || ""} ${em.correo ? " · "+em.correo : ""}</div>
          <div>Aceptado por el cliente</div>
        </div>
      </div>`;
  }

  /* ============================================================
     BASES EDITABLES (materiales / herrajes / plantillas)
     ============================================================ */
  function renderBases() {
    // Materiales
    $("tablaMateriales").innerHTML = `<table class="tabla">
      <thead><tr><th>Nombre</th><th>Unidad</th><th class="col-num">Precio</th><th class="col-acc"></th></tr></thead>
      <tbody>${estado.materiales.map((m, i) => `
        <tr data-i="${i}">
          <td><input data-bm="nombre" value="${escapeAttr(m.nombre)}"></td>
          <td><select data-bm="unidad">
            <option value="m2" ${m.unidad==="m2"?"selected":""}>m²</option>
            <option value="ml" ${m.unidad==="ml"?"selected":""}>m lineal</option>
            <option value="un" ${m.unidad==="un"?"selected":""}>unidad</option>
          </select></td>
          <td><input data-bm="precio" type="number" min="0" value="${m.precio}"></td>
          <td class="col-acc"><button class="linea__quitar" data-delm="${i}">×</button></td>
        </tr>`).join("")}</tbody></table>`;

    // Herrajes
    $("tablaHerrajes").innerHTML = `<table class="tabla">
      <thead><tr><th>Nombre</th><th class="col-num">Precio</th><th class="col-acc"></th></tr></thead>
      <tbody>${estado.herrajes.map((h, i) => `
        <tr data-i="${i}">
          <td><input data-bh="nombre" value="${escapeAttr(h.nombre)}"></td>
          <td><input data-bh="precio" type="number" min="0" value="${h.precio}"></td>
          <td class="col-acc"><button class="linea__quitar" data-delh="${i}">×</button></td>
        </tr>`).join("")}</tbody></table>`;

    // Plantillas
    $("tablaPlantillas").innerHTML = `<table class="tabla">
      <thead><tr><th>Tipo</th><th>Diseño h</th><th>Fab. h</th><th>Inst. h</th><th>Dificultad</th></tr></thead>
      <tbody>${estado.plantillas.map((p, i) => `
        <tr data-i="${i}">
          <td><input data-bp="tipo" value="${escapeAttr(p.tipo)}"></td>
          <td><input data-bp="hDiseno" type="number" step="0.5" value="${p.hDiseno}"></td>
          <td><input data-bp="hFab" type="number" step="0.5" value="${p.hFab}"></td>
          <td><input data-bp="hInst" type="number" step="0.5" value="${p.hInst}"></td>
          <td><select data-bp="dificultad">${Object.keys(DIFICULTAD).map(k =>
            `<option value="${k}" ${p.dificultad===k?"selected":""}>${DIFICULTAD[k].etiqueta}</option>`).join("")}</select></td>
        </tr>`).join("")}</tbody></table>`;
  }

  function bindEventosBases() {
    $("vista-bases").addEventListener("input", (e) => {
      const tr = e.target.closest("tr"); if (!tr) return;
      const i = Number(tr.dataset.i);
      if (e.target.dataset.bm) {
        const campo = e.target.dataset.bm;
        estado.materiales[i][campo] = (campo === "precio") ? Number(e.target.value) : e.target.value;
        guardar(K.materiales, estado.materiales); poblarSelectsProyecto();
      }
      if (e.target.dataset.bh) {
        const campo = e.target.dataset.bh;
        estado.herrajes[i][campo] = (campo === "precio") ? Number(e.target.value) : e.target.value;
        guardar(K.herrajes, estado.herrajes);
      }
      if (e.target.dataset.bp) {
        const campo = e.target.dataset.bp;
        estado.plantillas[i][campo] = (campo.startsWith("h")) ? Number(e.target.value) : e.target.value;
        guardar(K.plantillas, estado.plantillas); poblarSelectsProyecto();
      }
    });
    $("vista-bases").addEventListener("change", (e) => {
      const tr = e.target.closest("tr"); if (!tr) return;
      const i = Number(tr.dataset.i);
      if (e.target.dataset.bm === "unidad") { estado.materiales[i].unidad = e.target.value; guardar(K.materiales, estado.materiales); }
      if (e.target.dataset.bp === "dificultad") { estado.plantillas[i].dificultad = e.target.value; guardar(K.plantillas, estado.plantillas); }
    });
    $("vista-bases").addEventListener("click", (e) => {
      if (e.target.dataset.delm !== undefined) {
        if (estado.materiales.length <= 1) { toast("Deja al menos un material.", "error"); return; }
        estado.materiales.splice(Number(e.target.dataset.delm), 1);
        guardar(K.materiales, estado.materiales); renderBases(); poblarSelectsProyecto();
      }
      if (e.target.dataset.delh !== undefined) {
        estado.herrajes.splice(Number(e.target.dataset.delh), 1);
        guardar(K.herrajes, estado.herrajes); renderBases();
      }
    });
    $("btnAddBaseMaterial").addEventListener("click", () => {
      estado.materiales.push({ id: "m" + Date.now(), nombre: "Nuevo material", unidad: "m2", precio: 0 });
      guardar(K.materiales, estado.materiales); renderBases(); poblarSelectsProyecto();
    });
    $("btnAddBaseHerraje").addEventListener("click", () => {
      estado.herrajes.push({ id: "h" + Date.now(), nombre: "Nuevo herraje", precio: 0 });
      guardar(K.herrajes, estado.herrajes); renderBases();
    });
  }

  /* ============================================================
     AJUSTES
     ============================================================ */
  function cargarAjustesEnForm() {
    const c = estado.config, em = c.empresa;
    $("setNombre").value = em.nombre || ""; $("setEslogan").value = em.eslogan || "";
    $("setTelefono").value = em.telefono || ""; $("setCorreo").value = em.correo || "";
    $("setDireccion").value = em.direccion || ""; $("setWeb").value = em.web || "";
    $("setSimbolo").value = c.monedaSimbolo;
    $("setMerma").value = c.mermaPct; $("setIndirectos").value = c.indirectosPct;
    $("setImprevistos").value = c.imprevistosPct; $("setMargen").value = c.margenPct;
    $("setValorHora").value = c.valorHora; $("setDespacho").value = c.despachoBase;
    $("setIvaActivo").checked = !!c.ivaActivo; $("setIvaPct").value = c.ivaPct;
    $("setValidez").value = c.validezDias; $("setTiempoFab").value = c.tiempoFabricacionDias;
    $("setFormaPago").value = c.formaPago; $("setCondiciones").value = c.condiciones;
  }

  function bindEventosAjustes() {
    $("btnGuardarAjustes").addEventListener("click", () => {
      const c = estado.config;
      c.empresa = {
        nombre: $("setNombre").value.trim() || "Mavimuebles",
        eslogan: $("setEslogan").value.trim(),
        telefono: $("setTelefono").value.trim(),
        correo: $("setCorreo").value.trim(),
        direccion: $("setDireccion").value.trim(),
        web: $("setWeb").value.trim()
      };
      c.monedaSimbolo = $("setSimbolo").value || "$";
      c.mermaPct = Number($("setMerma").value); c.indirectosPct = Number($("setIndirectos").value);
      c.imprevistosPct = Number($("setImprevistos").value); c.margenPct = Number($("setMargen").value);
      c.valorHora = Number($("setValorHora").value); c.despachoBase = Number($("setDespacho").value);
      c.ivaActivo = $("setIvaActivo").checked; c.ivaPct = Number($("setIvaPct").value);
      c.validezDias = Number($("setValidez").value); c.tiempoFabricacionDias = Number($("setTiempoFab").value);
      c.formaPago = $("setFormaPago").value; c.condiciones = $("setCondiciones").value;
      guardar(K.config, c);
      aplicarMarca();
      toast("Ajustes guardados.", "ok");
    });

    // Exportar respaldo
    $("btnExportar").addEventListener("click", () => {
      const data = {
        config: estado.config, materiales: estado.materiales, herrajes: estado.herrajes,
        plantillas: estado.plantillas, cotizaciones: estado.cotizaciones, _exportado: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "mavimuebles-respaldo.json"; a.click();
      URL.revokeObjectURL(url);
      toast("Respaldo descargado.", "ok");
    });

    // Importar respaldo
    $("btnImportar").addEventListener("click", () => $("fileImportar").click());
    $("fileImportar").addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const lector = new FileReader();
      lector.onload = () => {
        try {
          const d = JSON.parse(lector.result);
          if (d.config) { estado.config = d.config; guardar(K.config, d.config); }
          if (d.materiales) { estado.materiales = d.materiales; guardar(K.materiales, d.materiales); }
          if (d.herrajes) { estado.herrajes = d.herrajes; guardar(K.herrajes, d.herrajes); }
          if (d.plantillas) { estado.plantillas = d.plantillas; guardar(K.plantillas, d.plantillas); }
          if (d.cotizaciones) { estado.cotizaciones = d.cotizaciones; guardar(K.cotizaciones, d.cotizaciones); }
          aplicarMarca(); poblarSelectsProyecto(); cargarAjustesEnForm();
          toast("Datos importados correctamente.", "ok");
        } catch (err) { toast("Archivo no válido.", "error"); }
      };
      lector.readAsText(file);
      e.target.value = "";
    });

    // Volver a fábrica
    $("btnReset").addEventListener("click", () => {
      if (!confirm("Esto borra TODO (cotizaciones, precios y ajustes) y vuelve a los valores de fábrica. ¿Continuar?")) return;
      [K.config, K.materiales, K.herrajes, K.plantillas, K.cotizaciones].forEach(k => localStorage.removeItem(k));
      estado.config = structuredCopia(CONFIG_DEFECTO); estado.config.empresa = structuredCopia(EMPRESA_DEFECTO);
      estado.materiales = structuredCopia(MATERIALES_DEFECTO);
      estado.herrajes = structuredCopia(HERRAJES_DEFECTO);
      estado.plantillas = structuredCopia(PLANTILLAS_DEFECTO);
      estado.cotizaciones = [];
      aplicarMarca(); poblarSelectsProyecto(); cargarAjustesEnForm(); nuevaCotizacion();
      toast("Datos restablecidos.", "ok");
    });
  }

  /* ============================================================
     UTILIDADES
     ============================================================ */
  function toast(msg, tipo) {
    const el = $("toast");
    el.textContent = msg;
    el.className = "toast " + (tipo ? "toast--" + tipo : "");
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2600);
  }
  function escapeAttr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }

  /* ---------- Arranque ---------- */
  document.addEventListener("DOMContentLoaded", init);
})();
