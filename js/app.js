/* ============================================================
   APP.JS — Lógica de las pantallas del portal (estudiantes)
   ============================================================
   Este archivo LEE los datos de js/datos.js y dibuja cada
   pantalla. Normalmente NO necesitas editarlo: el contenido
   se cambia en datos.js o desde admin.html.

   Cómo funciona la navegación: usamos la parte de la dirección
   que va después de # (se llama "hash"). Ejemplos:
     #/inicio              → página de inicio
     #/asignatura/gct      → página de la asignatura con id "gct"
     #/avisos              → todos los avisos
     #/calendario          → fechas de todas las asignaturas
     #/preguntas           → preguntas frecuentes
     #/buscar/iva          → resultados de búsqueda para "iva"
   Esto permite que el sitio funcione sin servidor especial
   (por ejemplo en GitHub Pages) y que cada vista tenga su enlace.
   ============================================================ */

(function () {
  "use strict";

  // Referencia al área donde se dibujan las pantallas
  const contenido = document.getElementById("contenido");

  /* ----------------------------------------------------------
     UTILIDADES PEQUEÑAS
     ---------------------------------------------------------- */

  // Evita que textos con < o > rompan el HTML (seguridad básica)
  function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = String(texto == null ? "" : texto);
    return div.innerHTML;
  }

  // Convierte "2026-06-09" en "9 de junio de 2026" (más amigable)
  function fechaLegible(fechaISO) {
    if (!fechaISO) return "";
    const [a, m, d] = fechaISO.split("-").map(Number);
    const meses = ["enero","febrero","marzo","abril","mayo","junio",
                   "julio","agosto","septiembre","octubre","noviembre","diciembre"];
    if (!a || !m || !d) return fechaISO;
    return `${d} de ${meses[m - 1]} de ${a}`;
  }

  // Abreviación de mes para el calendario ("JUN")
  function mesCorto(fechaISO) {
    const meses = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
    const m = Number((fechaISO || "").split("-")[1]);
    return meses[m - 1] || "";
  }

  // Información de un tipo de recurso (ícono y etiqueta)
  function infoTipo(tipo) {
    const datos = obtenerDatos();
    return (datos.tiposRecurso && datos.tiposRecurso[tipo]) || { etiqueta: tipo, icono: "📄" };
  }

  /* ----------------------------------------------------------
     PANTALLA: INICIO
     Bienvenida + avisos recientes + tarjetas de asignaturas
     agrupadas por nivel (III Medio, IV Medio…).
     ---------------------------------------------------------- */
  function vistaInicio() {
    const datos = obtenerDatos();
    const s = datos.sitio;

    // Avisos: se muestran solo los 3 más recientes en el inicio
    const avisosRecientes = (datos.avisos || []).slice(0, 3);

    // Agrupar asignaturas por nivel respetando el orden de datos.js
    const niveles = [];
    (datos.asignaturas || []).forEach(function (a) {
      let grupo = niveles.find(function (n) { return n.nivel === a.nivel; });
      if (!grupo) { grupo = { nivel: a.nivel, lista: [] }; niveles.push(grupo); }
      grupo.lista.push(a);
    });

    let html = `
      <section class="portada">
        <h1>${escapar(s.bienvenidaTitulo)}</h1>
        <p>${escapar(s.bienvenidaTexto)}</p>
        <div class="acciones">
          <a class="boton" href="#/calendario">📅 Ver calendario de evaluaciones</a>
          ${s.driveGeneral ? `<a class="boton boton--secundario" href="${escapar(s.driveGeneral)}" target="_blank" rel="noopener">📁 Carpeta general en Drive</a>` : ""}
        </div>
      </section>`;

    if (avisosRecientes.length) {
      html += `
      <section class="seccion" aria-labelledby="titulo-avisos">
        <h2 class="seccion__titulo" id="titulo-avisos">📢 Últimos avisos</h2>
        ${avisosRecientes.map(plantillaAviso).join("")}
        <p><a href="#/avisos">Ver todos los avisos →</a></p>
      </section>`;
    }

    niveles.forEach(function (grupo) {
      html += `
      <section class="seccion" aria-label="Asignaturas de ${escapar(grupo.nivel)}">
        <h2 class="seccion__titulo">🎓 ${escapar(grupo.nivel)}</h2>
        <div class="rejilla">
          ${grupo.lista.map(function (a) {
            return `
            <a class="tarjeta-asignatura" href="#/asignatura/${escapar(a.id)}" style="border-top-color:${escapar(a.color)}">
              <span class="tarjeta-asignatura__icono" aria-hidden="true">${escapar(a.icono)}</span>
              <span class="tarjeta-asignatura__sigla">${escapar(a.sigla)}</span>
              <span class="tarjeta-asignatura__nombre">${escapar(a.nombre)}</span>
              <p class="tarjeta-asignatura__descripcion">${escapar(a.descripcion)}</p>
            </a>`;
          }).join("")}
        </div>
      </section>`;
    });

    contenido.innerHTML = html;
  }

  // Tarjeta de un aviso (se usa en Inicio y en la página de Avisos)
  function plantillaAviso(aviso) {
    return `
      <article class="tarjeta ${aviso.importante ? "tarjeta--importante" : ""}">
        <span class="etiqueta-fecha">${escapar(fechaLegible(aviso.fecha))}</span>
        <h3>${aviso.importante ? "⚠️ " : ""}${escapar(aviso.titulo)}</h3>
        <p>${escapar(aviso.texto)}</p>
      </article>`;
  }

  /* ----------------------------------------------------------
     PANTALLA: ASIGNATURA
     Descripción, unidades, recursos con filtro por tipo,
     tareas y fechas importantes.
     ---------------------------------------------------------- */
  function vistaAsignatura(id, filtroTipo) {
    const datos = obtenerDatos();
    const a = (datos.asignaturas || []).find(function (x) { return x.id === id; });

    if (!a) {
      contenido.innerHTML = `
        <div class="sin-resultados">
          <div class="grande">🤔</div>
          <p>No encontramos esa asignatura. <a href="#/inicio">Volver al inicio</a></p>
        </div>`;
      return;
    }

    // Tipos de recurso presentes en esta asignatura (para los filtros)
    const tiposPresentes = [];
    (a.recursos || []).forEach(function (r) {
      if (tiposPresentes.indexOf(r.tipo) === -1) tiposPresentes.push(r.tipo);
    });

    // Recursos a mostrar (todos o solo los del filtro), del más nuevo al más antiguo
    let recursos = (a.recursos || []).slice().sort(function (x, y) {
      return (y.fecha || "").localeCompare(x.fecha || "");
    });
    if (filtroTipo) recursos = recursos.filter(function (r) { return r.tipo === filtroTipo; });

    let html = `
      <a class="volver" href="#/inicio">← Volver al inicio</a>

      <header class="cabecera-asignatura" style="border-top-color:${escapar(a.color)}">
        <span class="nivel">${escapar(a.nivel)} · ${escapar(a.sigla)}</span>
        <h1>${escapar(a.icono)} ${escapar(a.nombre)}</h1>
        <p>${escapar(a.descripcion)}</p>
        ${a.drive ? `<a class="boton-admin" style="text-decoration:none" href="${escapar(a.drive)}" target="_blank" rel="noopener">📁 Abrir carpeta en Drive</a>` : ""}
      </header>`;

    // --- Unidades ---
    if ((a.unidades || []).length) {
      html += `
      <section class="seccion" aria-label="Unidades">
        <h2 class="seccion__titulo">📖 Unidades</h2>
        <div class="lista-unidades">
          ${a.unidades.map(function (u) {
            return `
            <div class="unidad">
              <span class="unidad__numero">Unidad ${escapar(u.numero)}</span>
              <h3>${escapar(u.titulo)}</h3>
              <p>${escapar(u.descripcion)}</p>
            </div>`;
          }).join("")}
        </div>
      </section>`;
    }

    // --- Recursos con filtros ---
    html += `
      <section class="seccion" aria-label="Materiales y recursos">
        <h2 class="seccion__titulo">📚 Materiales y recursos</h2>
        <p class="seccion__subtitulo">Ordenados del más reciente al más antiguo. Usa los filtros para encontrar lo que buscas.</p>
        <div class="filtros" role="group" aria-label="Filtrar recursos por tipo">
          <button class="${!filtroTipo ? "activo" : ""}" data-filtro="">Todos</button>
          ${tiposPresentes.map(function (t) {
            const info = infoTipo(t);
            return `<button class="${filtroTipo === t ? "activo" : ""}" data-filtro="${escapar(t)}">${escapar(info.icono)} ${escapar(info.etiqueta)}</button>`;
          }).join("")}
        </div>
        ${recursos.length ? recursos.map(plantillaRecurso).join("")
          : `<p class="seccion__subtitulo">Aún no hay materiales en esta categoría.</p>`}
      </section>`;

    // --- Tareas ---
    html += `
      <section class="seccion" aria-label="Tareas y actividades">
        <h2 class="seccion__titulo">✏️ Tareas y actividades</h2>
        ${(a.tareas || []).length ? a.tareas.map(function (t) {
          return `
          <article class="tarjeta tarea">
            <h3>${escapar(t.titulo)}</h3>
            <p>${escapar(t.descripcion)}</p>
            ${t.fechaEntrega ? `<p class="vencimiento">📌 Entrega: ${escapar(fechaLegible(t.fechaEntrega))}</p>` : ""}
          </article>`;
        }).join("") : `<p class="seccion__subtitulo">No hay tareas pendientes por ahora. 🎉</p>`}
      </section>`;

    // --- Fechas importantes ---
    if ((a.fechas || []).length) {
      const fechasOrdenadas = a.fechas.slice().sort(function (x, y) {
        return (x.fecha || "").localeCompare(y.fecha || "");
      });
      html += `
      <section class="seccion" aria-label="Fechas importantes">
        <h2 class="seccion__titulo">📅 Fechas importantes</h2>
        <ul class="linea-tiempo">
          ${fechasOrdenadas.map(function (f) { return plantillaFecha(f, null); }).join("")}
        </ul>
      </section>`;
    }

    contenido.innerHTML = html;

    // Activar los botones de filtro (cambian la dirección y se redibuja)
    contenido.querySelectorAll(".filtros button").forEach(function (boton) {
      boton.addEventListener("click", function () {
        const f = boton.getAttribute("data-filtro");
        location.hash = f ? "#/asignatura/" + id + "/" + f : "#/asignatura/" + id;
      });
    });
  }

  // Tarjeta de un recurso (guía, presentación, enlace…)
  function plantillaRecurso(r) {
    const info = infoTipo(r.tipo);
    return `
      <article class="recurso">
        <span class="recurso__icono" aria-hidden="true">${escapar(info.icono)}</span>
        <div class="recurso__cuerpo">
          <a class="recurso__titulo" href="${escapar(r.url)}" target="_blank" rel="noopener">${escapar(r.titulo)} ↗</a>
          <div class="recurso__meta">
            ${r.unidad ? "Unidad " + escapar(r.unidad) + " · " : ""}${escapar(fechaLegible(r.fecha))}
          </div>
          ${r.descripcion ? `<p class="recurso__descripcion">${escapar(r.descripcion)}</p>` : ""}
        </div>
        <span class="recurso__tipo">${escapar(info.etiqueta)}</span>
      </article>`;
  }

  // Elemento de la línea de tiempo del calendario
  function plantillaFecha(f, nombreAsignatura) {
    const dia = (f.fecha || "").split("-")[2] || "";
    const iconos = { evaluacion: "✅", entrega: "📌", clase: "🏫", otro: "🔔" };
    return `
      <li>
        <div class="fecha-bloque" aria-hidden="true">
          <span class="dia">${escapar(Number(dia) || "")}</span>
          <span class="mes">${escapar(mesCorto(f.fecha))}</span>
        </div>
        <div>
          <strong>${iconos[f.tipo] || "🔔"} ${escapar(f.titulo)}</strong>
          ${nombreAsignatura ? `<div class="recurso__meta">${escapar(nombreAsignatura)}</div>` : ""}
          <div class="recurso__meta">${escapar(fechaLegible(f.fecha))}</div>
        </div>
      </li>`;
  }

  /* ----------------------------------------------------------
     PANTALLA: AVISOS (todos)
     ---------------------------------------------------------- */
  function vistaAvisos() {
    const datos = obtenerDatos();
    contenido.innerHTML = `
      <section class="seccion">
        <h2 class="seccion__titulo">📢 Avisos y novedades</h2>
        <p class="seccion__subtitulo">Las novedades más recientes aparecen primero.</p>
        ${(datos.avisos || []).length ? datos.avisos.map(plantillaAviso).join("")
          : `<p>No hay avisos por el momento.</p>`}
      </section>`;
  }

  /* ----------------------------------------------------------
     PANTALLA: CALENDARIO
     Reúne las fechas de TODAS las asignaturas en una sola
     línea de tiempo ordenada.
     ---------------------------------------------------------- */
  function vistaCalendario() {
    const datos = obtenerDatos();
    const todas = [];
    (datos.asignaturas || []).forEach(function (a) {
      (a.fechas || []).forEach(function (f) {
        todas.push({ fecha: f.fecha, titulo: f.titulo, tipo: f.tipo, asignatura: a.icono + " " + a.nombre });
      });
    });
    todas.sort(function (x, y) { return (x.fecha || "").localeCompare(y.fecha || ""); });

    contenido.innerHTML = `
      <section class="seccion">
        <h2 class="seccion__titulo">📅 Calendario de evaluaciones y entregas</h2>
        <p class="seccion__subtitulo">Todas las fechas importantes de todas las asignaturas, en orden.</p>
        ${todas.length
          ? `<ul class="linea-tiempo">${todas.map(function (f) { return plantillaFecha(f, f.asignatura); }).join("")}</ul>`
          : `<p>No hay fechas registradas por ahora.</p>`}
      </section>`;
  }

  /* ----------------------------------------------------------
     PANTALLA: PREGUNTAS FRECUENTES
     ---------------------------------------------------------- */
  function vistaPreguntas() {
    const datos = obtenerDatos();
    contenido.innerHTML = `
      <section class="seccion">
        <h2 class="seccion__titulo">❓ Preguntas frecuentes</h2>
        <p class="seccion__subtitulo">Toca una pregunta para ver su respuesta.</p>
        ${(datos.preguntasFrecuentes || []).map(function (p) {
          return `
          <details class="faq">
            <summary>${escapar(p.pregunta)}</summary>
            <p>${escapar(p.respuesta)}</p>
          </details>`;
        }).join("")}
      </section>`;
  }

  /* ----------------------------------------------------------
     PANTALLA: RESULTADOS DE BÚSQUEDA
     Busca el texto en asignaturas, recursos, tareas y avisos.
     ---------------------------------------------------------- */
  function vistaBusqueda(consulta) {
    const datos = obtenerDatos();
    const texto = decodeURIComponent(consulta || "").toLowerCase().trim();
    const resultados = [];

    // Función de ayuda: ¿el texto buscado aparece en alguno de estos campos?
    function coincide() {
      for (let i = 0; i < arguments.length; i++) {
        if (String(arguments[i] || "").toLowerCase().indexOf(texto) !== -1) return true;
      }
      return false;
    }

    if (texto) {
      (datos.asignaturas || []).forEach(function (a) {
        // Coincidencia con la asignatura misma
        if (coincide(a.nombre, a.sigla, a.descripcion)) {
          resultados.push({ icono: a.icono, titulo: a.nombre, detalle: "Asignatura · " + a.nivel, enlace: "#/asignatura/" + a.id });
        }
        // Coincidencia con recursos
        (a.recursos || []).forEach(function (r) {
          if (coincide(r.titulo, r.descripcion)) {
            resultados.push({ icono: infoTipo(r.tipo).icono, titulo: r.titulo, detalle: infoTipo(r.tipo).etiqueta + " · " + a.nombre, enlace: r.url, externo: true });
          }
        });
        // Coincidencia con tareas
        (a.tareas || []).forEach(function (t) {
          if (coincide(t.titulo, t.descripcion)) {
            resultados.push({ icono: "✏️", titulo: t.titulo, detalle: "Tarea · " + a.nombre, enlace: "#/asignatura/" + a.id });
          }
        });
      });
      // Coincidencia con avisos
      (datos.avisos || []).forEach(function (av) {
        if (coincide(av.titulo, av.texto)) {
          resultados.push({ icono: "📢", titulo: av.titulo, detalle: "Aviso · " + fechaLegible(av.fecha), enlace: "#/avisos" });
        }
      });
    }

    contenido.innerHTML = `
      <section class="seccion">
        <h2 class="seccion__titulo">🔍 Resultados para "${escapar(decodeURIComponent(consulta || ""))}"</h2>
        ${resultados.length
          ? resultados.map(function (r) {
              return `
              <article class="recurso">
                <span class="recurso__icono" aria-hidden="true">${escapar(r.icono)}</span>
                <div class="recurso__cuerpo">
                  <a class="recurso__titulo" href="${escapar(r.enlace)}" ${r.externo ? 'target="_blank" rel="noopener"' : ""}>${escapar(r.titulo)}${r.externo ? " ↗" : ""}</a>
                  <div class="recurso__meta">${escapar(r.detalle)}</div>
                </div>
              </article>`;
            }).join("")
          : `<div class="sin-resultados">
               <div class="grande">🔎</div>
               <p>No encontramos nada con ese texto.<br>Prueba con otra palabra, por ejemplo el nombre de la asignatura o el tema de la clase.</p>
             </div>`}
      </section>`;
  }

  /* ----------------------------------------------------------
     ENRUTADOR: decide qué pantalla dibujar según el hash
     ---------------------------------------------------------- */
  function enrutar() {
    // Partes de la dirección: #/asignatura/gct/guia → ["asignatura","gct","guia"]
    const partes = location.hash.replace(/^#\/?/, "").split("/");
    const ruta = partes[0] || "inicio";

    switch (ruta) {
      case "asignatura": vistaAsignatura(partes[1], partes[2] || ""); break;
      case "avisos":     vistaAvisos(); break;
      case "calendario": vistaCalendario(); break;
      case "preguntas":  vistaPreguntas(); break;
      case "buscar":     vistaBusqueda(partes.slice(1).join("/")); break;
      default:           vistaInicio();
    }

    // Marcar el enlace activo del menú y cerrar el menú móvil
    document.querySelectorAll(".navegacion a").forEach(function (enlace) {
      enlace.classList.toggle("activo", enlace.getAttribute("href") === "#/" + ruta);
    });
    document.getElementById("navegacion").classList.remove("abierta");

    // Llevar el foco y el scroll al inicio del contenido (accesibilidad)
    window.scrollTo(0, 0);
  }

  /* ----------------------------------------------------------
     MODO OSCURO
     Se guarda la preferencia en el navegador del estudiante.
     ---------------------------------------------------------- */
  function iniciarTema() {
    const boton = document.getElementById("boton-tema");
    const guardado = localStorage.getItem("portal_tema");
    if (guardado === "oscuro") {
      document.documentElement.setAttribute("data-tema", "oscuro");
      boton.textContent = "☀️";
    }
    boton.addEventListener("click", function () {
      const esOscuro = document.documentElement.getAttribute("data-tema") === "oscuro";
      if (esOscuro) {
        document.documentElement.removeAttribute("data-tema");
        localStorage.setItem("portal_tema", "claro");
        boton.textContent = "🌙";
      } else {
        document.documentElement.setAttribute("data-tema", "oscuro");
        localStorage.setItem("portal_tema", "oscuro");
        boton.textContent = "☀️";
      }
    });
  }

  /* ----------------------------------------------------------
     ARRANQUE de la aplicación
     ---------------------------------------------------------- */
  function iniciar() {
    const datos = obtenerDatos();

    // Textos generales que vienen de datos.js
    document.title = datos.sitio.nombre;
    document.getElementById("marca-nombre").textContent = datos.sitio.nombre;
    document.getElementById("pie-texto").textContent =
      datos.sitio.establecimiento + " · " + datos.sitio.profesor + " · " + datos.sitio.anio;

    // Buscador: al enviar, navega a la pantalla de resultados
    document.getElementById("formulario-busqueda").addEventListener("submit", function (e) {
      e.preventDefault();
      const texto = document.getElementById("campo-busqueda").value.trim();
      if (texto) location.hash = "#/buscar/" + encodeURIComponent(texto);
    });

    // Menú móvil (botón ☰)
    const botonMenu = document.getElementById("boton-menu");
    botonMenu.addEventListener("click", function () {
      const nav = document.getElementById("navegacion");
      const abierto = nav.classList.toggle("abierta");
      botonMenu.setAttribute("aria-expanded", abierto ? "true" : "false");
    });

    iniciarTema();

    // Dibuja la pantalla actual y vuelve a dibujar cuando cambia el hash
    window.addEventListener("hashchange", enrutar);
    enrutar();
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
