/* ============================================================
   Genera "cotizador.html": la app completa en UN solo archivo
   (CSS y JavaScript incluidos), para abrir con doble clic o con
   htmlpreview.github.io sin depender de las carpetas css/ y js/.

   Ejecutar después de cualquier cambio:
       node mavimuebles/generar-cotizador.js
   ============================================================ */
const fs = require("fs");
const path = require("path");

const raiz = __dirname;
const leer = (archivo) => fs.readFileSync(path.join(raiz, archivo), "utf8");
let html = leer("index.html");

// Se usa una FUNCIÓN de reemplazo: con un texto, replace() interpreta
// "$$" y "$&" como patrones especiales y rompería el JavaScript.
html = html.replace('<link rel="stylesheet" href="css/estilos.css">', () => `<style>\n${leer("css/estilos.css")}\n</style>`);
["datos", "calculo", "dibujo", "app"].forEach((nombre) => {
  const etiqueta = `<script src="js/${nombre}.js"></script>`;
  if (html.indexOf(etiqueta) < 0) throw new Error(`No se encontró ${etiqueta} en index.html`);
  const codigo = leer(`js/${nombre}.js`);
  if (/<\/script/i.test(codigo)) throw new Error(`js/${nombre}.js contiene "</script" y rompería el archivo único`);
  html = html.replace(etiqueta, () => `<script>\n${codigo}\n</script>`);
});
if (/<script src=|<link rel="stylesheet"/.test(html)) throw new Error("Quedaron archivos externos sin incluir");

html = html.replace("<!DOCTYPE html>", "<!DOCTYPE html>\n<!-- ARCHIVO GENERADO: no editar a mano. Editar index.html, css/ y js/ y luego ejecutar: node mavimuebles/generar-cotizador.js -->");
fs.writeFileSync(path.join(raiz, "cotizador.html"), html);
console.log(`cotizador.html generado (${Math.round(html.length / 1024)} KB)`);
