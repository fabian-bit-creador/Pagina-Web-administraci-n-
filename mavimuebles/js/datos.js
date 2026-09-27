/* ============================================================
   MAVIMUEBLES — Cotizador de muebles a medida
   Archivo: js/datos.js
   ------------------------------------------------------------
   AQUÍ ESTÁN LOS VALORES POR DEFECTO (precios, herrajes,
   plantillas y la configuración de la fórmula).

   👉 Son solo el punto de partida. TODO esto también se puede
      editar DENTRO de la aplicación (pestañas "Bases" y "Ajustes")
      y queda guardado en el navegador.

   ¡Importante! Ajusta estos precios con TUS costos reales.
   ============================================================ */

/* Versión de los datos guardados. Si cambia, la app actualiza
   automáticamente lo que ya estaba guardado en el navegador. */
const VERSION_DATOS = 2;

/* ----- Datos del negocio (salen en la cotización) ----- */
const EMPRESA_DEFECTO = {
  nombre: "Mavimuebles",
  eslogan: "Muebles a medida — fabricación e instalación",
  telefono: "+56 9 0000 0000",
  correo: "contacto@mavimuebles.cl",
  direccion: "Tu dirección / comuna",
  web: ""
};

/* ----- Configuración de la fórmula de cotización -----
   Los porcentajes van en número entero (12 = 12%). */
const CONFIG_DEFECTO = {
  // Moneda
  monedaSimbolo: "$",
  monedaSeparadorMiles: ".",
  monedaDecimales: 0,

  // Porcentajes de la fórmula
  mermaPct: 12,          // pérdida de material por cortes/despuntes
  indirectosPct: 10,     // gastos generales del taller (arriendo, luz, vehículo...)
  imprevistosPct: 5,     // colchón de seguridad
  margenPct: 35,         // ganancia (se aplica por división, no multiplicación)
  margenMinimoPct: 25,   // si el margen real baja de esto, la app avisa
  descuentoPct: 0,

  // Planchas: cobrar planchas completas (lo que realmente se compra)
  planchasCompletas: true,

  // Impuesto
  ivaActivo: false,
  ivaPct: 19,

  // Mano de obra
  valorHora: 8000,

  // Insumos y desgaste de herramientas, por plancha usada
  // (hojas de sierra, brocas, cola, lijas, tarugos, tornillería menor)
  insumosPorPlancha: 3000,

  // Despacho: se propone este valor al marcar "Requiere despacho"
  despachoBase: 15000,

  // Tapacantos que usa el constructor para cantos visibles
  tapacantoCuerpoId: "tapacanto",  // cantos del cuerpo (0,45 mm)
  tapacantoFrenteId: "tapa2",      // puertas y frentes de cajón (2 mm)

  // Medidas estándar del constructor (cm)
  alturaZocalo: 8,

  // Tiempos estándar para estimar horas (se multiplican por la dificultad)
  tiempos: {
    disenoBase: 0.5,      // h por mueble
    disenoPorModulo: 0.25,// h por cada módulo
    fabBase: 1,           // h por mueble (preparación, armado final)
    minPorPieza: 20,      // minutos por pieza de cuerpo (corte + canto + perforado)
    porCajon: 1,          // h por cajón (armado + correderas + regulación)
    porPuerta: 0.5,       // h por puerta batiente (bisagras, regulación)
    correderas: 1,        // h por sistema de puertas correderas
    instBase: 1,          // h de instalación por mueble
    instPorModulo: 0.5    // h de instalación por módulo
  },

  // Condiciones comerciales (salen en el documento al cliente)
  validezDias: 15,
  tiempoFabricacionDias: 15,
  formaPago: "50% de anticipo para iniciar la fabricación y 50% contra entrega.",
  condiciones: "Los precios pueden variar si cambian las medidas, materiales o el alcance del proyecto una vez aceptada la cotización."
};

/* ----- Factor según la dificultad del proyecto (multiplica las horas) ----- */
const DIFICULTAD = {
  baja:     { etiqueta: "Baja",     factor: 0.9 },
  media:    { etiqueta: "Media",    factor: 1.0 },
  alta:     { etiqueta: "Alta",     factor: 1.25 },
  muy_alta: { etiqueta: "Muy alta", factor: 1.5 }
};

/* ----- Base de materiales -----
   unidad:
     "plancha" → precio por plancha; largo y ancho en cm (tamaño de la plancha)
     "m2"      → precio por metro cuadrado
     "ml"      → precio por metro lineal (cubiertas, tapacantos)
     "un"      → precio por unidad */
const MATERIALES_DEFECTO = [
  { id: "mel18",     nombre: "Melamina 18 mm",           unidad: "plancha", largo: 250, ancho: 183, precio: 45000 },
  { id: "mel15",     nombre: "Melamina 15 mm",           unidad: "plancha", largo: 250, ancho: 183, precio: 39000 },
  { id: "mdf18",     nombre: "MDF 18 mm (para pintar)",  unidad: "plancha", largo: 250, ancho: 183, precio: 42000 },
  { id: "mdf15",     nombre: "MDF 15 mm (para pintar)",  unidad: "plancha", largo: 250, ancho: 183, precio: 36000 },
  { id: "ter15",     nombre: "Terciado 15 mm",           unidad: "plancha", largo: 244, ancho: 122, precio: 36000 },
  { id: "hdf3",      nombre: "HDF / Trupán 3 mm (fondos)",unidad: "plancha", largo: 244, ancho: 152, precio: 9500 },
  { id: "pino",      nombre: "Madera sólida (pino)",     unidad: "m2", precio: 18000 },
  { id: "cubierta",  nombre: "Cubierta postformada",     unidad: "ml", precio: 25000 },
  { id: "tapacanto", nombre: "Tapacanto PVC 0,45 mm",    unidad: "ml", precio: 300 },
  { id: "tapa2",     nombre: "Tapacanto PVC 2 mm",       unidad: "ml", precio: 700 }
];

/* ----- Base de herrajes y accesorios (precio por unidad) ----- */
const HERRAJES_DEFECTO = [
  { id: "bis_rec",   nombre: "Bisagra codo recto",           precio: 900 },
  { id: "bis_suave", nombre: "Bisagra cierre suave",         precio: 1800 },
  { id: "corr_tel",  nombre: "Corredera telescópica 45 cm (par)", precio: 3500 },
  { id: "corr_push", nombre: "Corredera push 45 cm (par)",   precio: 6000 },
  { id: "tirador",   nombre: "Tirador metálico",             precio: 1500 },
  { id: "pata",      nombre: "Pata regulable",               precio: 700 },
  { id: "riel_corr", nombre: "Riel puerta corredera (set)",  precio: 18000 },
  { id: "barra",     nombre: "Barra de colgar con soportes", precio: 5500 },
  { id: "tornillos", nombre: "Tornillos y tarugos (pack)",   precio: 2500 },
  { id: "soporte",   nombre: "Soporte repisa (par)",         precio: 1200 }
];

/* ----- Plantillas por tipo de mueble -----
   Cada plantilla es un mueble "típico" que el constructor carga
   de una vez: medidas, módulos, repisas, cajones, puertas, etc.
   Después se ajusta todo a mano. Editables en "Bases". */
const PLANTILLAS_DEFECTO = [
  { tipo: "Clóset",              alto: 240, ancho: 180, prof: 55, modulos: 2, repisas: 2, cajones: 3, altoCajon: 18, puertas: 2, tipoPuerta: "corredera", barras: 1, base: "zocalo", fondo: true,  cubierta: false, dificultad: "media" },
  { tipo: "Mueble cocina base",  alto: 86,  ancho: 120, prof: 58, modulos: 2, repisas: 1, cajones: 3, altoCajon: 18, puertas: 2, tipoPuerta: "batiente",  barras: 0, base: "patas",  fondo: true,  cubierta: true,  dificultad: "alta" },
  { tipo: "Mueble cocina aéreo", alto: 70,  ancho: 120, prof: 33, modulos: 2, repisas: 2, cajones: 0, altoCajon: 18, puertas: 2, tipoPuerta: "batiente",  barras: 0, base: "ninguna",fondo: true,  cubierta: false, dificultad: "media" },
  { tipo: "Escritorio",          alto: 75,  ancho: 120, prof: 60, modulos: 2, repisas: 0, cajones: 2, altoCajon: 15, puertas: 0, tipoPuerta: "ninguna",   barras: 0, base: "ninguna",fondo: true,  cubierta: false, dificultad: "baja" },
  { tipo: "Repisa / Estante",    alto: 180, ancho: 80,  prof: 30, modulos: 1, repisas: 4, cajones: 0, altoCajon: 18, puertas: 0, tipoPuerta: "ninguna",   barras: 0, base: "zocalo", fondo: true,  cubierta: false, dificultad: "baja" },
  { tipo: "Vanitorio",           alto: 60,  ancho: 80,  prof: 45, modulos: 1, repisas: 1, cajones: 0, altoCajon: 18, puertas: 2, tipoPuerta: "batiente",  barras: 0, base: "patas",  fondo: true,  cubierta: false, dificultad: "media" },
  { tipo: "Mueble TV",           alto: 50,  ancho: 180, prof: 40, modulos: 3, repisas: 0, cajones: 2, altoCajon: 15, puertas: 2, tipoPuerta: "batiente",  barras: 0, base: "zocalo", fondo: true,  cubierta: false, dificultad: "media" },
  { tipo: "Velador",             alto: 55,  ancho: 45,  prof: 40, modulos: 1, repisas: 0, cajones: 2, altoCajon: 18, puertas: 0, tipoPuerta: "ninguna",   barras: 0, base: "zocalo", fondo: true,  cubierta: false, dificultad: "baja" },
  { tipo: "Cómoda",              alto: 90,  ancho: 100, prof: 45, modulos: 1, repisas: 0, cajones: 4, altoCajon: 19, puertas: 0, tipoPuerta: "ninguna",   barras: 0, base: "zocalo", fondo: true,  cubierta: false, dificultad: "media" },
  { tipo: "Otro",                alto: 100, ancho: 100, prof: 50, modulos: 1, repisas: 2, cajones: 0, altoCajon: 18, puertas: 2, tipoPuerta: "batiente",  barras: 0, base: "ninguna",fondo: true,  cubierta: false, dificultad: "media" }
];

/* ----- Estados posibles de una cotización ----- */
const ESTADOS = [
  { id: "pendiente", etiqueta: "Pendiente" },
  { id: "aceptado",  etiqueta: "Aceptado" },
  { id: "rechazado", etiqueta: "Rechazado" },
  { id: "terminado", etiqueta: "Terminado" }
];
