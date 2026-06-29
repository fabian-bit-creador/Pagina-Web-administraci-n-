/* ============================================================
   MAVIMUEBLES — Cotizador
   Archivo: js/calculo.js
   ------------------------------------------------------------
   EL "CEREBRO" DE PRECIOS. Aquí vive la fórmula de cotización.
   No necesitas tocar este archivo para cambiar precios: los
   números (margen, merma, valor hora, etc.) se editan en la app.
   Solo cambia esto si quieres modificar la LÓGICA de cálculo.
   ============================================================ */

/* ----- Formatear dinero -----
   Convierte 125000 en "$125.000" según la moneda configurada. */
function formatearDinero(valor, config) {
  config = config || CONFIG_DEFECTO;
  const n = Math.round(Number(valor) || 0);
  const partes = n.toFixed(config.monedaDecimales).split(".");
  // separador de miles
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.monedaSeparadorMiles);
  const numero = partes.join(",");
  return config.monedaSimbolo + numero;
}

/* ----- Estimar superficie de material (m²) -----
   A partir de alto, ancho y profundidad (en cm) estima la
   superficie de tablero "desarrollada" de un mueble tipo caja:
   2 laterales + tapa + piso + fondo + 2 repisas.
   Es una ESTIMACIÓN razonable; siempre se puede ajustar a mano. */
function estimarSuperficieM2(altoCm, anchoCm, profCm, cantidad) {
  const a = (Number(altoCm)  || 0) / 100;  // a metros
  const w = (Number(anchoCm) || 0) / 100;
  const p = (Number(profCm)  || 0) / 100;
  const c = Number(cantidad) || 1;
  if (a <= 0 || w <= 0 || p <= 0) return 0;

  const laterales  = 2 * (a * p);
  const tapaPiso   = 2 * (w * p);
  const fondo      = a * w;
  const repisas    = 2 * (w * p);
  const porUnidad  = laterales + tapaPiso + fondo + repisas;
  return +(porUnidad * c).toFixed(2);
}

/* ----- LA FÓRMULA DE COTIZACIÓN -----
   Recibe los datos capturados y la configuración; devuelve el
   desglose completo de costos y el precio final al cliente.

   datos = {
     materiales: [{ nombre, unidad, precio, cantidad }],
     herrajes:   [{ nombre, precio, cantidad }],
     horas: { diseno, fabricacion, instalacion },
     factorDificultad: 1.0,
     requiereInstalacion: bool,
     despacho: number,   // 0 si no aplica
     otros: number,
     // porcentajes (heredan de config si no se pasan)
     mermaPct, indirectosPct, imprevistosPct, margenPct, descuentoPct,
     valorHora, ivaActivo, ivaPct
   }
*/
function calcularCotizacion(datos, config) {
  config = config || CONFIG_DEFECTO;

  // Permitir que la cotización use sus propios % o herede de config
  const mermaPct       = num(datos.mermaPct,       config.mermaPct);
  const indirectosPct  = num(datos.indirectosPct,  config.indirectosPct);
  const imprevistosPct = num(datos.imprevistosPct, config.imprevistosPct);
  const margenPct      = num(datos.margenPct,      config.margenPct);
  const descuentoPct   = num(datos.descuentoPct,   config.descuentoPct);
  const valorHora      = num(datos.valorHora,      config.valorHora);
  const ivaActivo      = (datos.ivaActivo !== undefined) ? datos.ivaActivo : config.ivaActivo;
  const ivaPct         = num(datos.ivaPct,         config.ivaPct);
  const factor         = num(datos.factorDificultad, 1);

  // A. Materiales principales
  const costoMateriales = (datos.materiales || [])
    .reduce((s, m) => s + (Number(m.precio) || 0) * (Number(m.cantidad) || 0), 0);

  // B. Merma (pérdida de material)
  const merma = costoMateriales * mermaPct / 100;

  // C. Herrajes y accesorios
  const costoHerrajes = (datos.herrajes || [])
    .reduce((s, h) => s + (Number(h.precio) || 0) * (Number(h.cantidad) || 0), 0);

  // D. Mano de obra directa (diseño + fabricación)
  const hDiseno = num(datos.horas && datos.horas.diseno, 0);
  const hFab    = num(datos.horas && datos.horas.fabricacion, 0);
  const hInst   = num(datos.horas && datos.horas.instalacion, 0);
  const manoObra = (hDiseno + hFab) * valorHora * factor;

  // E. Instalación (si aplica) — se calcula con las horas de instalación
  const instalacion = datos.requiereInstalacion ? (hInst * valorHora * factor) : 0;

  // F. Despacho / traslado
  const despacho = Number(datos.despacho) || 0;

  // G. Otros costos
  const otros = Number(datos.otros) || 0;

  // Subtotal de costos directos
  const subtotalCosto = costoMateriales + merma + costoHerrajes + manoObra + instalacion + despacho + otros;

  // H. Gastos generales del taller (indirectos)
  const indirectos = subtotalCosto * indirectosPct / 100;

  // I. Imprevistos (colchón de seguridad)
  const imprevistos = (subtotalCosto + indirectos) * imprevistosPct / 100;

  // Costo total real del proyecto
  const costoTotal = subtotalCosto + indirectos + imprevistos;

  // J. Precio neto con margen REAL (por división, para no perder plata)
  const divisorMargen = (1 - margenPct / 100);
  const precioNeto = divisorMargen > 0 ? (costoTotal / divisorMargen) : costoTotal;

  // K. Descuento opcional
  const descuento = precioNeto * descuentoPct / 100;
  const netoFinal = precioNeto - descuento;

  // L. IVA (si está activo)
  const iva = ivaActivo ? (netoFinal * ivaPct / 100) : 0;

  // M. TOTAL final al cliente
  const total = netoFinal + iva;

  // Ganancia estimada (informativo)
  const ganancia = netoFinal - costoTotal;
  const gananciaPct = netoFinal > 0 ? (ganancia / netoFinal * 100) : 0;

  return {
    costoMateriales, merma, costoHerrajes, manoObra, instalacion, despacho, otros,
    subtotalCosto, indirectos, imprevistos, costoTotal,
    precioNeto, descuento, netoFinal, iva, total,
    ganancia, gananciaPct,
    // eco de parámetros usados (útil para guardar/mostrar)
    parametros: { mermaPct, indirectosPct, imprevistosPct, margenPct, descuentoPct, valorHora, ivaActivo, ivaPct, factor,
                  horas: { diseno: hDiseno, fabricacion: hFab, instalacion: hInst } }
  };
}

/* Utilidad: usa "valor" si es un número válido, si no usa "porDefecto". */
function num(valor, porDefecto) {
  const n = Number(valor);
  return (valor !== "" && valor !== null && valor !== undefined && !isNaN(n)) ? n : Number(porDefecto) || 0;
}
