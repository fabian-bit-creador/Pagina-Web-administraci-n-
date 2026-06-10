/* ============================================================
   ADMIN.JS — Lógica del panel de administración (docente)
   ============================================================
   Permite editar todo el contenido del portal mediante
   formularios y luego:
   - GUARDAR en este navegador (vista previa inmediata), y/o
   - DESCARGAR un js/datos.js nuevo para publicar los cambios.

   Flujo de publicación (sitio estático):
   editar aquí → Guardar → revisar el portal → Descargar datos.js
   → reemplazar el archivo en el proyecto → subir el sitio.
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     CLAVE DE ACCESO AL PANEL — CÁMBIALA AQUÍ.
     Solo evita ediciones accidentales de estudiantes curiosos;
     no es seguridad real en un sitio estático.
     ---------------------------------------------------------- */
  const CLAVE_ACCESO = "admin2026";

  const panel = document.getElementById("panel-admin");

  // Copia de trabajo de los datos (se edita en memoria y luego se guarda)
  let datos = JSON.parse(JSON.stringify(obtenerDatos()));

  // Asignatura actualmente seleccionada en la sección de asignaturas
  let asignaturaSeleccionada = datos.asignaturas.length ? datos.asignaturas[0].id : null;

  /* ----------------------------------------------------------
     UTILIDADES
     ---------------------------------------------------------- */
  // Evita que textos con < > o comillas rompan el HTML.
  // Importante: aquí los textos se insertan dentro de value="..."
  // de los formularios, por eso también se escapan las comillas.
  function escapar(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Guarda la copia de trabajo en el navegador y avisa al usuario
  function guardar(mensaje) {
    localStorage.setItem("portal_datos", JSON.stringify(datos));
    dibujar(mensaje || "✔ Cambios guardados en este navegador. Revisa el portal para verlos.");
  }

  // Lee los valores de un formulario como objeto {nombreCampo: valor}
  function leerFormulario(form) {
    const valores = {};
    form.querySelectorAll("input, textarea, select").forEach(function (campo) {
      if (!campo.name) return;
      valores[campo.name] = campo.type === "checkbox" ? campo.checked : campo.value.trim();
    });
    return valores;
  }

  // Genera el contenido del archivo datos.js con los datos actuales
  function generarArchivoDatos() {
    const cuerpo = JSON.stringify(datos, null, 2);
    return (
      "/* ============================================================\n" +
      "   DATOS DEL PORTAL — archivo generado desde el panel docente\n" +
      "   el " + new Date().toLocaleString("es-CL") + ".\n" +
      "   Puedes seguir editándolo a mano o desde admin.html.\n" +
      "   ============================================================ */\n\n" +
      "const DATOS = " + cuerpo + ";\n\n" +
      "/* Función que entrega los datos a la aplicación (no editar). */\n" +
      "function obtenerDatos() {\n" +
      "  try {\n" +
      "    const guardado = localStorage.getItem(\"portal_datos\");\n" +
      "    if (guardado) {\n" +
      "      const d = JSON.parse(guardado);\n" +
      "      if (d && Array.isArray(d.asignaturas)) return d;\n" +
      "    }\n" +
      "  } catch (e) { console.warn(\"Datos guardados ilegibles, se usa el archivo.\", e); }\n" +
      "  return DATOS;\n" +
      "}\n"
    );
  }

  // Descarga un archivo de texto desde el navegador
  function descargarArchivo(nombre, contenido) {
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([contenido], { type: "text/javascript" }));
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  /* ----------------------------------------------------------
     PANTALLA DE ACCESO (clave simple)
     ---------------------------------------------------------- */
  function dibujarAcceso(error) {
    panel.innerHTML = `
      <div class="panel" style="max-width:420px; margin:40px auto;">
        <h2>🔐 Acceso docente</h2>
        <p class="seccion__subtitulo">Escribe la clave del panel para continuar.</p>
        ${error ? `<p style="color:var(--color-peligro); font-weight:600;">Clave incorrecta, intenta de nuevo.</p>` : ""}
        <form id="form-acceso" class="formulario">
          <div>
            <label for="clave">Clave</label>
            <input type="password" id="clave" name="clave" autocomplete="current-password" required>
          </div>
          <button class="boton-admin" type="submit">Entrar</button>
        </form>
      </div>`;

    document.getElementById("form-acceso").addEventListener("submit", function (e) {
      e.preventDefault();
      if (document.getElementById("clave").value === CLAVE_ACCESO) {
        sessionStorage.setItem("portal_admin", "si"); // dura mientras la pestaña esté abierta
        dibujar();
      } else {
        dibujarAcceso(true);
      }
    });
  }

  /* ----------------------------------------------------------
     SECCIÓN 1: Datos generales del sitio
     ---------------------------------------------------------- */
  function seccionGenerales() {
    const s = datos.sitio;
    return `
      <div class="panel">
        <h2>🏠 Datos generales</h2>
        <form id="form-generales" class="formulario">
          <div class="fila-doble">
            <div><label>Nombre del portal</label><input name="nombre" value="${escapar(s.nombre)}"></div>
            <div><label>Año</label><input name="anio" type="number" value="${escapar(s.anio)}"></div>
          </div>
          <div><label>Establecimiento / especialidad</label><input name="establecimiento" value="${escapar(s.establecimiento)}"></div>
          <div class="fila-doble">
            <div><label>Nombre del profesor/a</label><input name="profesor" value="${escapar(s.profesor)}"></div>
            <div><label>Correo de contacto</label><input name="correo" value="${escapar(s.correo)}"></div>
          </div>
          <div><label>Título de bienvenida</label><input name="bienvenidaTitulo" value="${escapar(s.bienvenidaTitulo)}"></div>
          <div><label>Texto de bienvenida</label><textarea name="bienvenidaTexto">${escapar(s.bienvenidaTexto)}</textarea></div>
          <div><label>Enlace a la carpeta general de Drive</label><input name="driveGeneral" value="${escapar(s.driveGeneral)}"></div>
          <button class="boton-admin" type="submit">Guardar datos generales</button>
        </form>
      </div>`;
  }

  /* ----------------------------------------------------------
     SECCIÓN 2: Avisos
     ---------------------------------------------------------- */
  function seccionAvisos() {
    return `
      <div class="panel">
        <h2>📢 Avisos</h2>
        <p class="seccion__subtitulo">El aviso nuevo queda primero en la lista.</p>
        <form id="form-aviso" class="formulario">
          <div class="fila-doble">
            <div><label>Título del aviso</label><input name="titulo" required></div>
            <div><label>Fecha</label><input name="fecha" type="date" required></div>
          </div>
          <div><label>Texto</label><textarea name="texto" required></textarea></div>
          <div><label><input type="checkbox" name="importante" style="width:auto"> Marcar como importante (se destaca con color)</label></div>
          <button class="boton-admin boton-admin--verde" type="submit">＋ Agregar aviso</button>
        </form>
        <hr style="border-color:var(--color-borde); margin:18px 0;">
        ${datos.avisos.map(function (av, i) {
          return `
          <div class="item-admin">
            <div>
              <div class="item-admin__titulo">${av.importante ? "⚠️ " : ""}${escapar(av.titulo)}</div>
              <div class="item-admin__meta">${escapar(av.fecha)}</div>
            </div>
            <div class="botones">
              <button class="boton-admin boton-admin--rojo" data-borrar-aviso="${i}">Eliminar</button>
            </div>
          </div>`;
        }).join("") || "<p>No hay avisos.</p>"}
      </div>`;
  }

  /* ----------------------------------------------------------
     SECCIÓN 3: Asignaturas (crear / editar / eliminar)
     ---------------------------------------------------------- */
  function seccionAsignaturas() {
    const a = datos.asignaturas.find(function (x) { return x.id === asignaturaSeleccionada; });

    return `
      <div class="panel">
        <h2>🎓 Asignaturas</h2>

        <!-- Crear nueva asignatura -->
        <details style="margin-bottom:16px;">
          <summary style="cursor:pointer; font-weight:700;">＋ Agregar una asignatura nueva</summary>
          <form id="form-nueva-asignatura" class="formulario" style="margin-top:12px;">
            <div class="fila-doble">
              <div><label>Nombre completo</label><input name="nombre" required placeholder="Ej: Gestión Comercial y Tributaria"></div>
              <div><label>Sigla</label><input name="sigla" required placeholder="Ej: GCT"></div>
            </div>
            <div class="fila-doble">
              <div><label>Nivel</label><input name="nivel" required placeholder="Ej: III Medio"></div>
              <div><label>Ícono (un emoji)</label><input name="icono" placeholder="Ej: 🧾" value="📘"></div>
            </div>
            <div class="fila-doble">
              <div><label>Color de la tarjeta</label><input name="color" type="color" value="#2563eb"></div>
              <div><label>Tu carpeta de Drive (referencia interna, los estudiantes no la ven)</label><input name="drive" placeholder="https://drive.google.com/..."></div>
            </div>
            <div><label>Descripción breve (1 o 2 frases simples)</label><textarea name="descripcion"></textarea></div>
            <button class="boton-admin boton-admin--verde" type="submit">Crear asignatura</button>
          </form>
        </details>

        <!-- Selector de asignatura a editar -->
        <label for="selector-asignatura" style="font-weight:600;">Asignatura a editar:</label>
        <select id="selector-asignatura" style="padding:8px 12px; font-size:1rem; border-radius:8px; border:2px solid var(--color-borde); background:var(--color-fondo); color:var(--color-texto); margin:6px 0 16px;">
          ${datos.asignaturas.map(function (x) {
            return `<option value="${escapar(x.id)}" ${x.id === asignaturaSeleccionada ? "selected" : ""}>${escapar(x.icono)} ${escapar(x.nombre)} (${escapar(x.nivel)})</option>`;
          }).join("")}
        </select>

        ${a ? subPanelAsignatura(a) : "<p>No hay asignaturas. Crea la primera con el botón de arriba.</p>"}
      </div>`;
  }

  // Formularios de edición de UNA asignatura: datos, recursos, tareas y fechas
  function subPanelAsignatura(a) {
    return `
      <form id="form-asignatura" class="formulario" style="margin-bottom:20px;">
        <div class="fila-doble">
          <div><label>Nombre completo</label><input name="nombre" value="${escapar(a.nombre)}"></div>
          <div><label>Sigla</label><input name="sigla" value="${escapar(a.sigla)}"></div>
        </div>
        <div class="fila-doble">
          <div><label>Nivel</label><input name="nivel" value="${escapar(a.nivel)}"></div>
          <div><label>Ícono (emoji)</label><input name="icono" value="${escapar(a.icono)}"></div>
        </div>
        <div class="fila-doble">
          <div><label>Color</label><input name="color" type="color" value="${escapar(a.color)}"></div>
          <div><label>Tu carpeta de Drive (referencia interna, los estudiantes no la ven)</label><input name="drive" value="${escapar(a.drive)}"></div>
        </div>
        <div><label>Descripción breve</label><textarea name="descripcion">${escapar(a.descripcion)}</textarea></div>
        <div class="acciones-admin">
          <button class="boton-admin" type="submit">Guardar cambios de la asignatura</button>
          <button class="boton-admin boton-admin--rojo" type="button" id="boton-borrar-asignatura">Eliminar esta asignatura</button>
        </div>
      </form>

      <!-- ===== Unidades ===== -->
      <h3>📖 Unidades</h3>
      <form id="form-unidad" class="formulario" style="margin-bottom:12px;">
        <div class="fila-doble">
          <div><label>N° de unidad</label><input name="numero" type="number" min="1" value="${(a.unidades || []).length + 1}" required></div>
          <div><label>Título de la unidad</label><input name="titulo" required></div>
        </div>
        <div><label>Descripción corta</label><textarea name="descripcion"></textarea></div>
        <button class="boton-admin boton-admin--verde" type="submit">＋ Agregar unidad</button>
      </form>
      ${(a.unidades || []).map(function (u, i) {
        return `
        <div class="item-admin">
          <div class="item-admin__titulo">Unidad ${escapar(u.numero)}: ${escapar(u.titulo)}</div>
          <button class="boton-admin boton-admin--rojo" data-borrar-unidad="${i}">Eliminar</button>
        </div>`;
      }).join("")}

      <!-- ===== Recursos (archivos y enlaces) ===== -->
      <h3 style="margin-top:24px;">📚 Recursos (guías, archivos y enlaces)</h3>
      <p class="seccion__subtitulo">Pega el enlace de Drive del archivo (clic derecho → Compartir → Copiar enlace). Recuerda dar acceso de lectura a tus estudiantes.</p>
      <form id="form-recurso" class="formulario" style="margin-bottom:12px;">
        <div><label>Título visible (ej: "Clase 2.13 · Guía de IVA")</label><input name="titulo" required></div>
        <div class="fila-doble">
          <div>
            <label>Tipo</label>
            <select name="tipo">
              ${Object.keys(datos.tiposRecurso || {}).map(function (t) {
                const info = datos.tiposRecurso[t];
                return `<option value="${escapar(t)}">${escapar(info.icono)} ${escapar(info.etiqueta)}</option>`;
              }).join("")}
            </select>
          </div>
          <div><label>Unidad (número)</label><input name="unidad" type="number" min="1" value="1"></div>
        </div>
        <div class="fila-doble">
          <div><label>Fecha (de la clase o publicación)</label><input name="fecha" type="date"></div>
          <div><label>Enlace (URL)</label><input name="url" type="url" required placeholder="https://..."></div>
        </div>
        <div><label>Descripción corta (opcional)</label><textarea name="descripcion"></textarea></div>
        <button class="boton-admin boton-admin--verde" type="submit">＋ Agregar recurso</button>
      </form>
      ${(a.recursos || []).map(function (r, i) {
        return `
        <div class="item-admin">
          <div>
            <div class="item-admin__titulo">${escapar(r.titulo)}</div>
            <div class="item-admin__meta">${escapar(r.tipo)} · Unidad ${escapar(r.unidad)} · ${escapar(r.fecha || "sin fecha")}</div>
          </div>
          <button class="boton-admin boton-admin--rojo" data-borrar-recurso="${i}">Eliminar</button>
        </div>`;
      }).join("") || "<p>Sin recursos aún.</p>"}

      <!-- ===== Tareas ===== -->
      <h3 style="margin-top:24px;">✏️ Tareas y actividades</h3>
      <form id="form-tarea" class="formulario" style="margin-bottom:12px;">
        <div class="fila-doble">
          <div><label>Título de la tarea</label><input name="titulo" required></div>
          <div><label>Fecha de entrega</label><input name="fechaEntrega" type="date"></div>
        </div>
        <div><label>Instrucciones breves</label><textarea name="descripcion"></textarea></div>
        <button class="boton-admin boton-admin--verde" type="submit">＋ Agregar tarea</button>
      </form>
      ${(a.tareas || []).map(function (t, i) {
        return `
        <div class="item-admin">
          <div>
            <div class="item-admin__titulo">${escapar(t.titulo)}</div>
            <div class="item-admin__meta">Entrega: ${escapar(t.fechaEntrega || "sin fecha")}</div>
          </div>
          <button class="boton-admin boton-admin--rojo" data-borrar-tarea="${i}">Eliminar</button>
        </div>`;
      }).join("") || "<p>Sin tareas aún.</p>"}

      <!-- ===== Fechas importantes ===== -->
      <h3 style="margin-top:24px;">📅 Fechas importantes (aparecen en el Calendario)</h3>
      <form id="form-fecha" class="formulario" style="margin-bottom:12px;">
        <div class="fila-doble">
          <div><label>Título (ej: "Evaluación de Unidad 1")</label><input name="titulo" required></div>
          <div><label>Fecha</label><input name="fecha" type="date" required></div>
        </div>
        <div>
          <label>Tipo</label>
          <select name="tipo">
            <option value="evaluacion">✅ Evaluación</option>
            <option value="entrega">📌 Entrega de tarea</option>
            <option value="clase">🏫 Clase especial</option>
            <option value="otro">🔔 Otro</option>
          </select>
        </div>
        <button class="boton-admin boton-admin--verde" type="submit">＋ Agregar fecha</button>
      </form>
      ${(a.fechas || []).map(function (f, i) {
        return `
        <div class="item-admin">
          <div>
            <div class="item-admin__titulo">${escapar(f.titulo)}</div>
            <div class="item-admin__meta">${escapar(f.fecha)} · ${escapar(f.tipo)}</div>
          </div>
          <button class="boton-admin boton-admin--rojo" data-borrar-fecha="${i}">Eliminar</button>
        </div>`;
      }).join("") || "<p>Sin fechas aún.</p>"}`;
  }

  /* ----------------------------------------------------------
     SECCIÓN 4: Publicar / respaldar
     ---------------------------------------------------------- */
  function seccionPublicar() {
    return `
      <div class="panel">
        <h2>🚀 Publicar y respaldar</h2>
        <div class="nota-info">
          <strong>¿Cómo publico los cambios a mis estudiantes?</strong><br>
          1. Haz tus cambios y presiona los botones "Guardar" de cada sección (quedan guardados en este navegador y puedes previsualizarlos en el portal).<br>
          2. Presiona <strong>"Descargar datos.js"</strong>.<br>
          3. Reemplaza el archivo <code>js/datos.js</code> de tu proyecto por el descargado y sube el sitio de nuevo (en GitHub: arrastra el archivo a la carpeta js y confirma).
        </div>
        <div class="acciones-admin">
          <button class="boton-admin boton-admin--verde" id="boton-descargar">⬇️ Descargar datos.js</button>
          <button class="boton-admin boton-admin--rojo" id="boton-restaurar">↩️ Descartar cambios locales (volver al archivo)</button>
        </div>
      </div>`;
  }

  /* ----------------------------------------------------------
     DIBUJAR TODO EL PANEL y conectar los formularios
     ---------------------------------------------------------- */
  function dibujar(mensaje) {
    panel.innerHTML = `
      ${mensaje ? `<div class="mensaje-exito">${escapar(mensaje)}</div>` : ""}
      ${seccionPublicar()}
      ${seccionGenerales()}
      ${seccionAvisos()}
      ${seccionAsignaturas()}`;

    /* --- Publicar / restaurar --- */
    document.getElementById("boton-descargar").addEventListener("click", function () {
      localStorage.setItem("portal_datos", JSON.stringify(datos)); // asegura coherencia
      descargarArchivo("datos.js", generarArchivoDatos());
    });
    document.getElementById("boton-restaurar").addEventListener("click", function () {
      if (confirm("Esto borra los cambios guardados en este navegador y vuelve a los datos del archivo datos.js. ¿Continuar?")) {
        localStorage.removeItem("portal_datos");
        datos = JSON.parse(JSON.stringify(DATOS));
        asignaturaSeleccionada = datos.asignaturas.length ? datos.asignaturas[0].id : null;
        dibujar("Se restauraron los datos del archivo.");
      }
    });

    /* --- Datos generales --- */
    document.getElementById("form-generales").addEventListener("submit", function (e) {
      e.preventDefault();
      const v = leerFormulario(e.target);
      v.anio = Number(v.anio) || v.anio;
      Object.assign(datos.sitio, v);
      guardar();
    });

    /* --- Avisos --- */
    document.getElementById("form-aviso").addEventListener("submit", function (e) {
      e.preventDefault();
      const v = leerFormulario(e.target);
      datos.avisos.unshift({ fecha: v.fecha, titulo: v.titulo, texto: v.texto, importante: !!v.importante });
      guardar("✔ Aviso agregado.");
    });
    panel.querySelectorAll("[data-borrar-aviso]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (confirm("¿Eliminar este aviso?")) {
          datos.avisos.splice(Number(b.getAttribute("data-borrar-aviso")), 1);
          guardar("Aviso eliminado.");
        }
      });
    });

    /* --- Crear asignatura --- */
    document.getElementById("form-nueva-asignatura").addEventListener("submit", function (e) {
      e.preventDefault();
      const v = leerFormulario(e.target);
      // El id se genera desde la sigla: minúsculas, sin espacios ni tildes
      let id = (v.sigla || v.nombre).toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "") /* quita tildes */
        .replace(/[^a-z0-9]/g, "");
      // Si ya existe ese id, se le agrega un número
      let base = id, n = 2;
      while (datos.asignaturas.some(function (x) { return x.id === id; })) { id = base + n; n++; }

      datos.asignaturas.push({
        id: id, sigla: v.sigla, nombre: v.nombre, nivel: v.nivel,
        icono: v.icono || "📘", color: v.color || "#2563eb",
        descripcion: v.descripcion, drive: v.drive,
        unidades: [], recursos: [], tareas: [], fechas: []
      });
      asignaturaSeleccionada = id;
      guardar("✔ Asignatura creada. Ahora puedes agregarle unidades y recursos.");
    });

    /* --- Selector de asignatura --- */
    const selector = document.getElementById("selector-asignatura");
    if (selector) {
      selector.addEventListener("change", function () {
        asignaturaSeleccionada = selector.value;
        dibujar();
      });
    }

    /* --- Edición de la asignatura seleccionada --- */
    const a = datos.asignaturas.find(function (x) { return x.id === asignaturaSeleccionada; });
    if (!a) return;

    document.getElementById("form-asignatura").addEventListener("submit", function (e) {
      e.preventDefault();
      Object.assign(a, leerFormulario(e.target));
      guardar("✔ Asignatura actualizada.");
    });

    document.getElementById("boton-borrar-asignatura").addEventListener("click", function () {
      if (confirm("¿Eliminar la asignatura \"" + a.nombre + "\" con todos sus recursos? Esta acción no se puede deshacer (salvo restaurando el archivo).")) {
        datos.asignaturas = datos.asignaturas.filter(function (x) { return x.id !== a.id; });
        asignaturaSeleccionada = datos.asignaturas.length ? datos.asignaturas[0].id : null;
        guardar("Asignatura eliminada.");
      }
    });

    // Unidades
    document.getElementById("form-unidad").addEventListener("submit", function (e) {
      e.preventDefault();
      const v = leerFormulario(e.target);
      a.unidades = a.unidades || [];
      a.unidades.push({ numero: Number(v.numero) || a.unidades.length + 1, titulo: v.titulo, descripcion: v.descripcion });
      guardar("✔ Unidad agregada.");
    });
    panel.querySelectorAll("[data-borrar-unidad]").forEach(function (b) {
      b.addEventListener("click", function () {
        a.unidades.splice(Number(b.getAttribute("data-borrar-unidad")), 1);
        guardar("Unidad eliminada.");
      });
    });

    // Recursos
    document.getElementById("form-recurso").addEventListener("submit", function (e) {
      e.preventDefault();
      const v = leerFormulario(e.target);
      a.recursos = a.recursos || [];
      a.recursos.push({ titulo: v.titulo, tipo: v.tipo, unidad: Number(v.unidad) || 1, fecha: v.fecha, url: v.url, descripcion: v.descripcion });
      guardar("✔ Recurso agregado.");
    });
    panel.querySelectorAll("[data-borrar-recurso]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (confirm("¿Eliminar este recurso?")) {
          a.recursos.splice(Number(b.getAttribute("data-borrar-recurso")), 1);
          guardar("Recurso eliminado.");
        }
      });
    });

    // Tareas
    document.getElementById("form-tarea").addEventListener("submit", function (e) {
      e.preventDefault();
      const v = leerFormulario(e.target);
      a.tareas = a.tareas || [];
      a.tareas.push({ titulo: v.titulo, descripcion: v.descripcion, fechaEntrega: v.fechaEntrega });
      guardar("✔ Tarea agregada.");
    });
    panel.querySelectorAll("[data-borrar-tarea]").forEach(function (b) {
      b.addEventListener("click", function () {
        a.tareas.splice(Number(b.getAttribute("data-borrar-tarea")), 1);
        guardar("Tarea eliminada.");
      });
    });

    // Fechas importantes
    document.getElementById("form-fecha").addEventListener("submit", function (e) {
      e.preventDefault();
      const v = leerFormulario(e.target);
      a.fechas = a.fechas || [];
      a.fechas.push({ fecha: v.fecha, titulo: v.titulo, tipo: v.tipo });
      guardar("✔ Fecha agregada.");
    });
    panel.querySelectorAll("[data-borrar-fecha]").forEach(function (b) {
      b.addEventListener("click", function () {
        a.fechas.splice(Number(b.getAttribute("data-borrar-fecha")), 1);
        guardar("Fecha eliminada.");
      });
    });
  }

  /* ----------------------------------------------------------
     ARRANQUE: aplica el tema guardado y pide la clave
     (una vez por pestaña)
     ---------------------------------------------------------- */
  if (localStorage.getItem("portal_tema") === "oscuro") {
    document.documentElement.setAttribute("data-tema", "oscuro");
  }
  if (sessionStorage.getItem("portal_admin") === "si") {
    dibujar();
  } else {
    dibujarAcceso(false);
  }
})();
