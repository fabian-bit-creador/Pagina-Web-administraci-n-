# 🪑 Mavimuebles — Cotizador de muebles a medida

Aplicación web simple y profesional para presupuestar muebles a medida sin perder
plata. Hecha en **HTML / CSS / JavaScript puro**: no necesita instalar nada ni
compilar. Todo se guarda en tu navegador (`localStorage`).

## ▶️ Cómo abrirla

- **En tu computador:** abre el archivo `mavimuebles/index.html` con doble clic.
- **Publicada en Netlify:** queda disponible en `https://TU-SITIO.netlify.app/mavimuebles/`
  (este proyecto ya está configurado para publicar la raíz del repositorio).

## 🧭 Qué hace

- **Cotizar:** datos del cliente, datos del proyecto (tipo, medidas, material,
  color, dificultad, instalación, despacho), materiales, herrajes, mano de obra
  y costos. El precio se calcula **en vivo** con desglose completo.
- **Estimar m²:** calcula la superficie de tablero del mueble a partir de
  alto × ancho × profundidad (estimación editable).
- **Plantillas:** autocompleta horas y dificultad según el tipo de mueble.
- **PDF / Imprimir:** genera un documento de cotización presentable para el
  cliente (usa "Guardar como PDF" en el diálogo de impresión).
- **Historial:** guarda cada cotización con su estado (pendiente, aceptado,
  rechazado, terminado).
- **Bases editables:** materiales, herrajes y plantillas con precios que ajustas
  tú mismo.
- **Ajustes:** datos del negocio, fórmula por defecto, condiciones comerciales,
  respaldo (exportar/importar) y volver a valores de fábrica.

## 🧮 La fórmula (resumen)

```
Materiales + Merma% + Herrajes + Mano de obra + Instalación + Despacho + Otros
  = Subtotal de costos
  + Gastos generales%  + Imprevistos%
  = Costo total
Precio neto = Costo total / (1 − Margen%)     ← margen real, no se pierde plata
  − Descuento%  (+ IVA% si está activo)
  = PRECIO SUGERIDO AL CLIENTE
```

> El **margen se aplica por división**, no multiplicando el costo. Así, un margen
> de 35% significa que el 35% del precio de venta es ganancia (forma correcta de
> no quedar corto).

Todos los porcentajes y valores son editables, por cotización o en los ajustes
generales.

## 📁 Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura de las pantallas |
| `css/estilos.css` | Colores y estilos (variables al inicio) |
| `js/datos.js` | Precios, herrajes y plantillas por defecto |
| `js/calculo.js` | La fórmula de cálculo |
| `js/app.js` | La lógica de la aplicación |

## 🔒 Sobre los datos

Todo se guarda **solo en el navegador** de tu equipo. Para mover los datos a otro
computador usa **Ajustes → Exportar datos** y luego **Importar datos**. En una
versión futura se puede conectar a una base de datos real para acceder desde
varios dispositivos.
