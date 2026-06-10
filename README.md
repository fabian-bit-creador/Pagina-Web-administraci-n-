# 📚 Portal TP Administración

Plataforma web para estudiantes de enseñanza media técnico profesional de la
especialidad de **Administración**. Reúne en un solo lugar las asignaturas,
materiales de clases, guías, tareas, fechas de evaluación, avisos y recursos
de apoyo, con enlaces directos a las carpetas de Google Drive del curso.

**Hecha para ser fácil de editar por un/una docente, sin saber programar.**

---

## ✨ Qué incluye (MVP)

- **Inicio** con bienvenida y tarjetas de acceso rápido a cada asignatura, agrupadas por nivel (III y IV Medio).
- **Página por asignatura**: descripción, unidades, recursos con **filtros por tipo** (guía, presentación, evaluación, enlace, refuerzo), tareas con fecha de entrega y fechas importantes.
- **Buscador interno** (busca en asignaturas, recursos, tareas y avisos).
- **Avisos / novedades** con destacados.
- **Calendario** (línea de tiempo) con las evaluaciones y entregas de todas las asignaturas.
- **Preguntas frecuentes**.
- **Modo oscuro** opcional (botón 🌙).
- **Diseño responsive** (computador, tablet y celular) y accesible (alto contraste, foco visible, textos grandes, navegación por teclado).
- **Panel de administración** (`admin.html`) para editar todo con formularios.

## 🧰 Tecnologías y por qué

| Tecnología | Por qué |
|---|---|
| HTML + CSS + JavaScript puro | No requiere instalar nada ni "compilar". Se edita con cualquier editor (incluso el de GitHub) y funciona en hosting gratuito. |
| Un solo archivo de datos (`js/datos.js`) | Todo el contenido está en un lugar, con comentarios que explican cada campo. |
| Navegación por hash (`#/asignatura/gct`) | Cada pantalla tiene su propio enlace y funciona en GitHub Pages sin configuración. |

> **¿Por qué no React?** React es excelente, pero exige Node, dependencias y un
> proceso de build. Para un portal mantenido por un docente, eso agrega fricción
> sin aportar nada que este MVP necesite. La arquitectura ya separa **datos**
> (datos.js) de **vistas** (app.js), así que migrar a React/Next en una V2 es directo.

## 📁 Estructura del proyecto

```
├── index.html        ← Página de los estudiantes (casi nunca se edita)
├── admin.html        ← Panel del docente
├── css/
│   └── estilos.css   ← Colores y diseño (variables editables al inicio)
└── js/
    ├── datos.js      ← ⭐ TODO EL CONTENIDO: asignaturas, recursos, avisos…
    ├── app.js        ← Lógica de las pantallas de estudiantes
    └── admin.js      ← Lógica del panel docente (la clave de acceso está aquí)
```

## 🚀 Cómo verla funcionando

Opción 1 (sin instalar nada): abre `index.html` con doble clic en tu navegador.

Opción 2 (recomendada, igual que en internet):
```bash
# con Python (viene en casi todos los computadores)
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## ✏️ Cómo editar el contenido

### Opción A — Panel de administración (sin tocar código)

1. Abre `admin.html` y entra con la clave (por defecto `admin2026`; cámbiala al inicio de `js/admin.js`).
2. Edita textos, avisos, asignaturas, unidades, recursos, tareas y fechas con formularios.
3. Los cambios se guardan **en tu navegador** al instante (vista previa real en el portal).
4. Para **publicarlos a tus estudiantes**: botón **"⬇️ Descargar datos.js"** → reemplaza el archivo `js/datos.js` del proyecto por el descargado → sube el sitio de nuevo (en GitHub: arrastra el archivo a la carpeta `js` y confirma el cambio).

> ⚠️ La clave del panel solo evita ediciones accidentales; en un sitio estático
> no es seguridad real (el contenido del portal es público de todas formas).

### Opción B — Editar el archivo de datos directamente

Abre `js/datos.js`. Está comentado paso a paso. Resumen:

| Quiero cambiar… | Dónde |
|---|---|
| Nombre del portal, bienvenida, mi nombre | `datos.js` → bloque `sitio` |
| Avisos | `datos.js` → lista `avisos` (el más nuevo primero) |
| Agregar una asignatura | `datos.js` → copia un bloque de `asignaturas` y cambia sus datos |
| Agregar una guía/archivo/enlace | `datos.js` → `recursos` de la asignatura (pega el enlace de Drive) |
| Tareas y fechas de evaluación | `datos.js` → `tareas` y `fechas` de la asignatura |
| Preguntas frecuentes | `datos.js` → `preguntasFrecuentes` |
| **Colores** | `css/estilos.css` → variables del primer bloque (`--color-principal`, etc.) |
| Textos fijos de los menús | `index.html` (etiquetas del `<nav>`) |

**Para publicar un archivo de Drive:** clic derecho sobre el archivo → Compartir →
"Cualquier persona con el enlace puede ver" → Copiar enlace → pégalo en el campo `url`.

> 🔒 **Política de recursos:** los estudiantes **nunca ven tus carpetas de Drive**;
> solo ven los archivos individuales que tú publicas como recursos. Los campos
> "carpeta de Drive" del panel son solo una referencia interna para ti.

## 🖼️ Logos del colegio y del TP

El encabezado muestra el escudo del colegio y el logo TP si subes estas
imágenes a la carpeta `img/`:

| Archivo | Contenido |
|---|---|
| `img/logo-colegio.png` | Escudo Colegio Cardenal Caro |
| `img/logo-tp.png` | Logo "Técnicos Profesionales de Excelencia" |

Desde GitHub: entra a la carpeta `img` → **Add file → Upload files** → arrastra
las imágenes → **Commit changes**. Si los archivos no existen, el sitio funciona
igual (los logos simplemente no se muestran).

## 🌐 Cómo publicarla gratis

### GitHub Pages (recomendado — gratis y ya tienes el repositorio)
1. En GitHub: **Settings → Pages**.
2. En "Source" elige la rama principal y carpeta `/ (root)` → **Save**.
3. En 1–2 minutos tu portal queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.
4. Comparte ese enlace con tus estudiantes (ideal: ponlo en Classroom).

### Alternativas también gratuitas
- **Netlify** (netlify.com): arrastras la carpeta del proyecto y listo; da URL propia y se puede conectar al repo para publicar automático.
- **Vercel** (vercel.com): similar a Netlify, conecta el repo y publica solo.
- **Cloudflare Pages**: muy rápido en Chile, también gratuito.

## ♿ Accesibilidad incluida

- Tamaño de letra grande y alto contraste (modo claro y oscuro).
- Enlace "Saltar al contenido" y foco visible para navegar con teclado.
- Etiquetas `aria` en navegación, buscador y secciones.
- Lenguaje simple y fechas escritas en palabras ("9 de junio de 2026").
- Respeta la preferencia "reducir movimiento" del sistema.

## 🔮 Ideas para la versión 2

1. **Base de datos real** (Firebase/Supabase, ambos con plan gratuito): el panel guardaría directo en línea, sin descargar `datos.js`. El proyecto ya está preparado: solo hay que reemplazar la función `obtenerDatos()` por una llamada a la API.
2. **Inicio de sesión real para el docente y los estudiantes** (con el correo institucional @beleneduca.cl vía Google).
3. **Perfil de estudiante**: progreso por asignatura (materiales vistos, tareas entregadas), personalización (avatar, tema) y **encuestas** del docente con resultados agrupados. Requiere los puntos 1 y 2.
3. **Entrega de tareas en línea** con confirmación y estado (entregada/atrasada).
4. **Notificaciones**: correo o WhatsApp/Telegram cuando hay aviso nuevo.
5. **Estadísticas simples**: qué materiales se abren más.
6. **Comentarios o preguntas por clase**, moderados por el docente.
7. **Integración con Google Classroom** (importar tareas y fechas).
8. **Migración a React/Next.js** si el equipo crece; la separación datos/vistas actual hace esa migración directa.

## 🆘 Algo se rompió

- Pantalla en blanco tras editar `datos.js` → casi siempre falta una **coma** o una **comilla**. Abre la consola del navegador (F12) y te dirá la línea.
- El panel muestra datos viejos → botón "↩️ Descartar cambios locales" en `admin.html`.
- Un enlace de Drive no abre a los estudiantes → revisa que el archivo esté compartido como "Cualquier persona con el enlace".
