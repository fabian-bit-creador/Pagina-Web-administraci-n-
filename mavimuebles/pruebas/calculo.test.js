/* ============================================================
   Pruebas del motor de cálculo (js/calculo.js)
   Ejecutar desde la carpeta del proyecto:
       node mavimuebles/pruebas/calculo.test.js
   No necesita instalar nada.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const raiz = path.join(__dirname, "..");
vm.runInThisContext(
  fs.readFileSync(path.join(raiz, "js/datos.js"), "utf8") + "\n" +
  fs.readFileSync(path.join(raiz, "js/calculo.js"), "utf8") + "\n" +
  "globalThis.M = { CONFIG_DEFECTO, MATERIALES_DEFECTO, HERRAJES_DEFECTO, PLANTILLAS_DEFECTO, DIFICULTAD," +
  " num, formatearDinero, geometria, generarDespiece, herrajesAuto, horasSugeridas, crearCatalogo," +
  " calcularCotizacion, nuevaCotizacionVacia, muebleDesdePlantilla, migrarDatosV1, congelarPrecios, preciosCambiaron };"
);
const {
  CONFIG_DEFECTO, MATERIALES_DEFECTO, HERRAJES_DEFECTO, PLANTILLAS_DEFECTO,
  formatearDinero, geometria, generarDespiece, crearCatalogo, calcularCotizacion,
  nuevaCotizacionVacia, muebleDesdePlantilla, migrarDatosV1, congelarPrecios, preciosCambiaron
} = globalThis.M;

let ok = 0, fallas = 0;
function prueba(nombre, fn) {
  try { fn(); ok++; console.log("  ✔ " + nombre); }
  catch (e) { fallas++; console.log("  ✘ " + nombre + "\n      " + e.message); }
}
const cat = crearCatalogo(MATERIALES_DEFECTO, HERRAJES_DEFECTO, null);
const plantilla = tipo => PLANTILLAS_DEFECTO.find(p => p.tipo === tipo);
const cotCon = (...muebles) => { const c = nuevaCotizacionVacia(CONFIG_DEFECTO, PLANTILLAS_DEFECTO); c.muebles = muebles; return c; };
const cerca = (a, b, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

console.log("\nMotor de cálculo Mavimuebles");

prueba("formatea dinero chileno", () => {
  assert.strictEqual(formatearDinero(506280), "$506.280");
  assert.strictEqual(formatearDinero(-5000), "−$5.000");
});

prueba("despiece del clóset tiene las piezas esperadas", () => {
  const m = muebleDesdePlantilla(plantilla("Clóset"));
  const piezas = generarDespiece(m, geometria(m, CONFIG_DEFECTO));
  const cant = n => (piezas.find(p => p.nombre === n) || { cant: 0 }).cant;
  assert.strictEqual(cant("Lateral"), 2);
  assert.strictEqual(cant("División"), 1);
  assert.strictEqual(cant("Repisa"), 2);
  assert.strictEqual(cant("Zócalo"), 1);
  assert.strictEqual(cant("Frente de cajón"), 3);
  assert.strictEqual(cant("Costado de cajón"), 6);
  assert.strictEqual(cant("Puerta corredera"), 2);
  assert.strictEqual(cant("Fondo"), 1);
  assert.strictEqual(piezas.find(p => p.nombre === "Fondo").materialId, "hdf3");
});

prueba("herrajes automáticos del clóset", () => {
  const r = calcularCotizacion(cotCon(muebleDesdePlantilla(plantilla("Clóset"))), CONFIG_DEFECTO, cat);
  const q = id => (r.lineasHer.find(l => l.herrajeId === id) || { cantidad: 0 }).cantidad;
  assert.strictEqual(q("corr_tel"), 3, "correderas de cajón");
  assert.strictEqual(q("riel_corr"), 1, "riel de puertas");
  assert.strictEqual(q("tirador"), 5, "2 hojas + 3 cajones");
  assert.strictEqual(q("barra"), 1);
  assert.strictEqual(q("soporte"), 4, "2 repisas × 2 pares");
});

prueba("horas sugeridas del clóset (dificultad media)", () => {
  const r = calcularCotizacion(cotCon(muebleDesdePlantilla(plantilla("Clóset"))), CONFIG_DEFECTO, cat);
  assert.deepStrictEqual(r.horas, { diseno: 1, fab: 8.5, inst: 2.5 });
});

prueba("el fondo que no cabe en una plancha se divide en partes (sin alerta)", () => {
  const r = calcularCotizacion(cotCon(muebleDesdePlantilla(plantilla("Clóset"))), CONFIG_DEFECTO, cat);
  const fondo = r.muebles[0].despiece.find(p => /^Fondo/.test(p.nombre));
  assert.strictEqual(fondo.cant, 2);
  assert.ok(fondo.ancho <= 152);
  assert.ok(!r.alertas.some(a => /Fondo/.test(a.texto)));
});

prueba("bisagras según alto de puerta (cocina base: 2 por puerta)", () => {
  const r = calcularCotizacion(cotCon(muebleDesdePlantilla(plantilla("Mueble cocina base"))), CONFIG_DEFECTO, cat);
  assert.strictEqual(r.lineasHer.find(l => l.herrajeId === "bis_suave").cantidad, 4);
  assert.strictEqual(r.lineasHer.find(l => l.herrajeId === "pata").cantidad, 6);
});

prueba("el margen es real: ganancia / neto = margen", () => {
  const r = calcularCotizacion(cotCon(muebleDesdePlantilla(plantilla("Clóset"))), CONFIG_DEFECTO, cat);
  cerca(r.gananciaPct, 35, 1e-9);
});

prueba("planchas completas: se cobra la plancha entera y la merma nunca es negativa", () => {
  const c = cotCon(muebleDesdePlantilla(plantilla("Velador")));
  const r = calcularCotizacion(c, CONFIG_DEFECTO, cat);
  const mel = r.lineasMat.find(l => l.materialId === "mel18");
  assert.strictEqual(mel.planchas, 1);
  assert.strictEqual(mel.compra, 45000);
  assert.ok(r.merma >= 0);
  c.parametros.planchasCompletas = false;
  const r2 = calcularCotizacion(c, CONFIG_DEFECTO, cat);
  assert.ok(r2.total < r.total, "sin planchas completas debe salir más barato");
});

prueba("con varios muebles, descuento e IVA, el documento suma exacto", () => {
  const c = cotCon(muebleDesdePlantilla(plantilla("Mueble cocina base")),
                   muebleDesdePlantilla(plantilla("Mueble cocina aéreo")),
                   muebleDesdePlantilla(plantilla("Clóset")));
  c.requiereDespacho = true; c.despacho = 20000;
  c.parametros.descuentoPct = 7; c.parametros.ivaActivo = true;
  const r = calcularCotizacion(c, CONFIG_DEFECTO, cat);
  const d = r.redondeado;
  assert.strictEqual(r.muebles.reduce((s, m) => s + m.precio, 0), d.subtotal);
  assert.strictEqual(d.subtotal - d.descuento + d.iva, d.total);
  assert.ok(Math.abs(d.total - r.total) <= 1);
});

prueba("compartir planchas entre muebles sale más barato que cotizarlos por separado", () => {
  const a = muebleDesdePlantilla(plantilla("Velador")), b = muebleDesdePlantilla(plantilla("Velador"));
  const juntos = calcularCotizacion(cotCon(a, b), CONFIG_DEFECTO, cat).total;
  const solo = calcularCotizacion(cotCon(a), CONFIG_DEFECTO, cat).total;
  assert.ok(juntos < solo * 2);
});

prueba("alertas: correderas que no caben en un velador de 40 cm", () => {
  const r = calcularCotizacion(cotCon(muebleDesdePlantilla(plantilla("Velador"))), CONFIG_DEFECTO, cat);
  assert.ok(r.alertas.some(a => /correderas de 45 cm/.test(a.texto)));
});

prueba("alertas: lateral más alto que la plancha", () => {
  const m = muebleDesdePlantilla(plantilla("Clóset")); m.alto = 260;
  const r = calcularCotizacion(cotCon(m), CONFIG_DEFECTO, cat);
  assert.ok(r.alertas.some(a => /no cabe en una plancha/.test(a.texto)));
});

prueba("alertas: descuento que deja el margen bajo el mínimo", () => {
  const c = cotCon(muebleDesdePlantilla(plantilla("Clóset")));
  c.parametros.descuentoPct = 20;
  const r = calcularCotizacion(c, CONFIG_DEFECTO, cat);
  assert.ok(r.alertas.some(a => a.nivel === "error" && /Margen real/.test(a.texto)));
});

prueba("cajones que no caben generan error", () => {
  const m = muebleDesdePlantilla(plantilla("Velador")); m.cajones = 5;
  const r = calcularCotizacion(cotCon(m), CONFIG_DEFECTO, cat);
  assert.ok(r.alertas.some(a => /no caben 5 cajones/.test(a.texto)));
});

prueba("precios congelados: la cotización no cambia si suben los precios", () => {
  const c = cotCon(muebleDesdePlantilla(plantilla("Clóset")));
  const r = calcularCotizacion(c, CONFIG_DEFECTO, cat);
  c.precios = congelarPrecios(r, cat);
  const nuevos = JSON.parse(JSON.stringify(MATERIALES_DEFECTO));
  nuevos.find(m => m.id === "mel18").precio = 60000;
  const catNuevo = crearCatalogo(nuevos, HERRAJES_DEFECTO, c.precios);
  assert.strictEqual(calcularCotizacion(c, CONFIG_DEFECTO, catNuevo).total, r.total);
  assert.ok(preciosCambiaron(c, nuevos, HERRAJES_DEFECTO, CONFIG_DEFECTO));
});

prueba("migración v1: convierte la cotización y m² a planchas", () => {
  const v1 = {
    materiales: MATERIALES_DEFECTO.length && [{ id: "mel18", nombre: "Melamina 18 mm", unidad: "m2", precio: 10500 }],
    herrajes: [{ id: "bis_rec", nombre: "Bisagra codo recto", precio: 900 }],
    plantillas: [{ tipo: "Clóset", hDiseno: 1.5, hFab: 8, hInst: 3, dificultad: "media", material: "mel18" }],
    cotizaciones: [{
      id: "COT-1", numero: 1, estado: "aceptado", fecha: "2026-06-29T00:00:00.000Z",
      cliente: { nombre: "Carla" }, proyecto: { tipo: "Clóset", dificultad: "Media", requiereInstalacion: true },
      lineasMat: [{ materialId: "mel18", cantidad: 9.15 }], lineasHer: [{ herrajeId: "bis_rec", cantidad: 4 }],
      formulario: { hDiseno: 1, hFab: 8, hInst: 3, margen: 35, merma: 12 }, resultado: { total: 400000 }
    }]
  };
  const d = migrarDatosV1(v1);
  assert.strictEqual(d.materiales.find(m => m.id === "mel18").unidad, "plancha");
  assert.ok(d.herrajes.some(h => h.id === "barra"));
  assert.ok(d.plantillas[0].modulos !== undefined);
  const c = d.cotizaciones[0];
  assert.strictEqual(c.version, 2);
  assert.strictEqual(c.muebles[0].modo, "manual");
  assert.strictEqual(c.muebles[0].extrasMat[0].cantidad, 2, "9,15 m² = 2 planchas de 4,575 m²");
  assert.strictEqual(c.resumen.total, 400000);
  const catM = crearCatalogo(d.materiales, d.herrajes, null);
  assert.ok(calcularCotizacion(c, CONFIG_DEFECTO, catM).total > 0);
});

console.log(`\n${ok} pruebas OK, ${fallas} con error\n`);
process.exit(fallas ? 1 : 0);
