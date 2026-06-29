/* ============================================================
   MAVIMUEBLES — Cotizador de muebles a medida
   Archivo: js/datos.js
   ------------------------------------------------------------
   AQUÍ ESTÁN LOS VALORES POR DEFECTO (precios, herrajes,
   plantillas y la configuración de la fórmula).

   👉 Son solo el punto de partida. TODO esto también se puede
      editar DENTRO de la aplicación (pestaña "Bases" y "Ajustes")
      y queda guardado en tu navegador. Si algún día quieres
      "volver de fábrica", se borran los datos guardados y se
      vuelven a usar estos valores.

   ¡Importante! Ajusta estos precios con TUS costos reales.
   ============================================================ */

/* ----- Datos de tu negocio (salen en la cotización) ----- */
const EMPRESA_DEFECTO = {
  nombre: "Mavimuebles",
  eslogan: "Muebles a medida — fabricación e instalación",
  telefono: "+56 9 0000 0000",
  correo: "contacto@mavimuebles.cl",
  direccion: "Tu dirección / comuna",
  web: ""
};

/* ----- Configuración de la fórmula de cotización -----
   Todos estos números se pueden cambiar desde la pestaña "Ajustes".
   Los porcentajes van en número entero (12 = 12%). */
const CONFIG_DEFECTO = {
  // Moneda
  monedaSimbolo: "$",
  monedaSeparadorMiles: ".",
  monedaDecimales: 0,

  // Porcentajes de la fórmula
  mermaPct: 12,        // pérdida de material por cortes/despuntes
  indirectosPct: 10,   // gastos generales del taller (luz, máquinas, etc.)
  imprevistosPct: 5,   // colchón de seguridad
  margenPct: 35,       // ganancia (se aplica por división, no multiplicación)
  descuentoPct: 0,     // descuento por defecto

  // Impuesto
  ivaActivo: false,    // en Chile sería true para factura
  ivaPct: 19,

  // Mano de obra
  valorHora: 8000,     // valor de la hora de trabajo

  // Despacho
  despachoBase: 15000, // costo base de traslado cuando aplica

  // Condiciones comerciales (salen en el documento al cliente)
  validezDias: 15,
  tiempoFabricacionDias: 15,
  formaPago: "50% de anticipo para iniciar la fabricación y 50% contra entrega.",
  condiciones: "Los precios pueden variar si cambian las medidas, materiales o el alcance del proyecto una vez aceptada la cotización."
};

/* ----- Factor según la dificultad del proyecto -----
   Multiplica las horas de trabajo. Un mueble "muy difícil" toma
   más tiempo real del estimado base. */
const DIFICULTAD = {
  baja:     { etiqueta: "Baja",     factor: 0.9 },
  media:    { etiqueta: "Media",    factor: 1.0 },
  alta:     { etiqueta: "Alta",     factor: 1.25 },
  muy_alta: { etiqueta: "Muy alta", factor: 1.5 }
};

/* ----- Base de materiales -----
   "unidad" puede ser: m2 (metro cuadrado), ml (metro lineal) o un (unidad).
   "precio" es el precio por esa unidad.
   Para planchas (melamina/MDF/terciado) usamos precio por m² para poder
   calcular según el tamaño del mueble. (Una plancha 1,83 × 2,50 m rinde
   4,575 m²; divide el precio de la plancha por 4,575 para obtener el m².) */
const MATERIALES_DEFECTO = [
  { id: "mel15", nombre: "Melamina 15 mm",          unidad: "m2", precio: 9000 },
  { id: "mel18", nombre: "Melamina 18 mm",          unidad: "m2", precio: 10500 },
  { id: "mdf15", nombre: "MDF 15 mm",               unidad: "m2", precio: 8500 },
  { id: "mdf18", nombre: "MDF 18 mm",               unidad: "m2", precio: 10000 },
  { id: "ter15", nombre: "Terciado 15 mm",          unidad: "m2", precio: 12000 },
  { id: "pino",  nombre: "Madera sólida (pino)",    unidad: "m2", precio: 18000 },
  { id: "cubierta", nombre: "Cubierta postformada", unidad: "ml", precio: 25000 },
  { id: "tapacanto", nombre: "Tapacanto (rollo)",   unidad: "ml", precio: 400 }
];

/* ----- Base de herrajes y accesorios (precio por unidad) ----- */
const HERRAJES_DEFECTO = [
  { id: "bis_rec",  nombre: "Bisagra codo recto",            precio: 900 },
  { id: "bis_suave",nombre: "Bisagra cierre suave",          precio: 1800 },
  { id: "corr_tel", nombre: "Corredera telescópica 45 cm",   precio: 3500 },
  { id: "corr_push",nombre: "Corredera push 45 cm",          precio: 6000 },
  { id: "tirador",  nombre: "Tirador metálico",              precio: 1500 },
  { id: "pata",     nombre: "Pata regulable",                precio: 700 },
  { id: "riel_corr",nombre: "Riel puerta corredera (set)",   precio: 18000 },
  { id: "tornillos",nombre: "Tornillos (pack)",              precio: 2500 },
  { id: "soporte",  nombre: "Soporte repisa (par)",          precio: 1200 }
];

/* ----- Plantillas por tipo de mueble -----
   Horas estimadas de diseño, fabricación e instalación + dificultad y
   material sugerido. Sirven para autocompletar la cotización y ahorrar
   tiempo. Edítalas en la pestaña "Bases". */
const PLANTILLAS_DEFECTO = [
  { tipo: "Clóset",        hDiseno: 1.5, hFab: 8,  hInst: 3,   dificultad: "media",  material: "mel18" },
  { tipo: "Mueble cocina", hDiseno: 2.0, hFab: 12, hInst: 4,   dificultad: "alta",   material: "mel18" },
  { tipo: "Escritorio",    hDiseno: 0.5, hFab: 4,  hInst: 1,   dificultad: "baja",   material: "mel18" },
  { tipo: "Repisa/Estante",hDiseno: 0.3, hFab: 2,  hInst: 0.5, dificultad: "baja",   material: "mel15" },
  { tipo: "Vanitorio",     hDiseno: 1.0, hFab: 5,  hInst: 2,   dificultad: "media",  material: "mel18" },
  { tipo: "Mueble TV",     hDiseno: 0.8, hFab: 5,  hInst: 1,   dificultad: "media",  material: "mel18" },
  { tipo: "Velador",       hDiseno: 0.3, hFab: 2,  hInst: 0.3, dificultad: "baja",   material: "mel15" },
  { tipo: "Cómoda",        hDiseno: 1.0, hFab: 6,  hInst: 1,   dificultad: "media",  material: "mel18" },
  { tipo: "Otro",          hDiseno: 1.0, hFab: 4,  hInst: 1,   dificultad: "media",  material: "mel18" }
];

/* ----- Estados posibles de una cotización ----- */
const ESTADOS = [
  { id: "pendiente", etiqueta: "Pendiente" },
  { id: "aceptado",  etiqueta: "Aceptado" },
  { id: "rechazado", etiqueta: "Rechazado" },
  { id: "terminado", etiqueta: "Terminado" }
];
