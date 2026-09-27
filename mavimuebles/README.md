# 🪑 Mavimuebles — Cotizador de muebles a medida (uso interno)

Herramienta para **armar el mueble pieza por pieza** y obtener un precio que no
pierde plata. Hecha en **HTML / CSS / JavaScript puro**: no necesita instalar
nada ni compilar. Todo se guarda en el navegador (`localStorage`).

> Es la herramienta interna del taller. La futura página pública para clientes
> puede reutilizar el mismo motor de cálculo (`js/calculo.js`), que no depende
> de la pantalla.

## ▶️ Cómo abrirla

- **Un solo archivo:** `cotizador.html` (todo incluido). Doble clic, o en línea:
  `https://htmlpreview.github.io/?https://github.com/fabian-bit-creador/Pagina-Web-administraci-n-/blob/main/mavimuebles/cotizador.html`
- **Publicada en Netlify:** `https://TU-SITIO.netlify.app/mavimuebles/`

⚠️ Los datos quedan en el navegador donde se usa. Descarga un respaldo seguido
en **Ajustes → Descargar respaldo** (y úsalo siempre desde el mismo navegador).

## 🧭 Cómo se cotiza

1. **Cliente.**
2. **Muebles:** una cotización puede tener varios muebles (ej: cocina base +
   aéreo + clóset). Al agregar uno, hereda el color y los materiales.
3. **Tipo de mueble:** carga una plantilla con medidas y piezas típicas.
4. **Construcción (modo Constructor):** módulos, repisas, cajones, puertas
   (batientes o correderas), barras, zócalo/patas, cubierta y materiales.
   El **dibujo se actualiza en vivo** y la app calcula sola:
   - el **despiece** (cada pieza con su medida y material),
   - las **planchas a comprar** y cuánto se aprovechan,
   - los **metros de tapacanto**,
   - los **herrajes** (bisagras según alto de puerta, correderas, tiradores, patas, soportes...),
   - las **horas** de diseño, fabricación e instalación según piezas y dificultad.
5. **Extras a mano:** espejos, LED, vidrio, herrajes especiales.
6. **Modo Manual:** para muebles que el constructor no cubre (se ingresan materiales y horas a mano).

### Alertas que evitan errores caros
- Piezas más grandes que la plancha (el fondo se divide solo en partes).
- Cajones que no caben en el alto disponible.
- Correderas más largas que la profundidad del mueble.
- Repisas o barras de más de 90 cm (se pandean).
- Puertas batientes de más de 60 cm (se descuadran).
- Descuento que deja el margen bajo tu mínimo.
- Materiales o herrajes con precio $0.

## 🧮 La fórmula

```
Materiales + Merma y sobrante de planchas + Herrajes
+ Insumos y desgaste de herramientas (por plancha)
+ Mano de obra (diseño + fabricación) + Instalación + Despacho + Otros
  = Subtotal de costos
+ Gastos generales %  + Imprevistos %
  = Costo total
Precio = Costo total / (1 − Margen%)   ← margen REAL sobre el precio de venta
  − Descuento %  (+ IVA % si está activo)
  = PRECIO SUGERIDO AL CLIENTE
```

- **Planchas completas** (activado por defecto): se cobra lo que realmente se
  compra. La diferencia aparece como "merma y sobrante".
- **Precios congelados:** al guardar, la cotización conserva los precios de ese
  día. Si después cambias precios en Bases, las cotizaciones antiguas no cambian
  solas; al abrirlas aparece un aviso para actualizarlas si quieres.
- **Calculadora de gastos generales** (Ajustes): arriendo, servicios, vehículo y
  desgaste de herramientas ÷ costo directo mensual = % sugerido.

## 📁 Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura de las pantallas |
| `css/estilos.css` | Colores y estilos (variables al inicio) |
| `js/datos.js` | Precios, herrajes, plantillas y tiempos por defecto |
| `js/calculo.js` | Geometría, despiece, herrajes, horas, fórmula y migración |
| `js/dibujo.js` | Dibujo frontal del mueble (SVG) |
| `js/app.js` | Lógica de la aplicación |
| `cotizador.html` | **Generado**: la app en un solo archivo |
| `generar-cotizador.js` | Regenera `cotizador.html` |
| `pruebas/calculo.test.js` | Pruebas automáticas del motor de cálculo |

Después de modificar cualquier archivo:

```bash
node mavimuebles/pruebas/calculo.test.js   # verifica los cálculos
node mavimuebles/generar-cotizador.js      # actualiza cotizador.html
```
