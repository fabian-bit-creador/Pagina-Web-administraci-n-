/* ============================================================
   DATOS DEL PORTAL — ESTE ES EL ARCHIVO QUE MÁS VAS A EDITAR
   ============================================================
   Aquí vive TODO el contenido del sitio: nombre, asignaturas,
   unidades, recursos (guías, presentaciones, evaluaciones),
   tareas, fechas importantes, avisos y preguntas frecuentes.

   REGLAS DE ORO PARA EDITAR SIN ROMPER NADA:
   1. Los textos siempre van entre comillas: "así".
   2. Cada elemento de una lista termina con coma, menos el último.
   3. Si un texto lleva comillas adentro, usa comillas simples: "el libro 'X'".
   4. Guarda el archivo y recarga la página para ver los cambios.
   5. Si algo se rompe, revisa que no falte una coma o una llave } .

   TIP: también puedes editar todo esto desde admin.html sin tocar
   código, y luego descargar este archivo ya actualizado.
   ============================================================ */

const DATOS = {

  /* ----------------------------------------------------------
     1) DATOS GENERALES DEL SITIO
     Cambia aquí el nombre del portal, tu nombre y el mensaje
     de bienvenida que ven los estudiantes al entrar.
     ---------------------------------------------------------- */
  sitio: {
    nombre: "Portal TP Administración",
    establecimiento: "Especialidad de Administración — Enseñanza Media Técnico Profesional",
    profesor: "Profesor Fabián Herrera",
    correo: "fabian.herrera@beleneduca.cl",
    anio: 2026,
    bienvenidaTitulo: "¡Bienvenidos y bienvenidas al portal de la especialidad!",
    bienvenidaTexto: "Aquí encontrarás los materiales de clases, guías, tareas, fechas de evaluación y recursos de apoyo de cada módulo. Usa el buscador o entra directo a tu asignatura.",
    // Carpeta general de Drive con todo el material del año (botón en el inicio)
    driveGeneral: "https://drive.google.com/drive/folders/1KR2WVKgBMO7EEByggNkKg5bYcG_P7tGj"
  },

  /* ----------------------------------------------------------
     2) AVISOS / NOVEDADES
     Los más nuevos van PRIMERO. "importante: true" lo destaca
     con color. Para borrar un aviso, elimina su bloque { ... },
     ---------------------------------------------------------- */
  avisos: [
    {
      fecha: "2026-06-09",
      titulo: "Evaluación de Unidad 2 — GCT",
      texto: "La evaluación de la Unidad 2 de Gestión Comercial y Tributaria se rinde esta semana. Repasa las guías de hojas de cálculo y el libro de compras y ventas.",
      importante: true
    },
    {
      fecha: "2026-06-01",
      titulo: "Nuevas guías de hojas de cálculo",
      texto: "Ya están disponibles las guías prácticas de las clases 2.11 y 2.12 en la sección de Gestión Comercial y Tributaria.",
      importante: false
    },
    {
      fecha: "2026-05-25",
      titulo: "Material de reforzamiento disponible",
      texto: "Si te perdiste alguna clase, revisa la sección 'Refuerzo' de cada asignatura: ahí están las respuestas ejemplares y guías de apoyo.",
      importante: false
    }
  ],

  /* ----------------------------------------------------------
     3) ASIGNATURAS (MÓDULOS)
     Cada asignatura es un bloque { ... }. Para AGREGAR una nueva,
     copia un bloque completo, pégalo al final de la lista (antes
     del corchete ] de cierre) y cambia sus datos.

     Campos de cada asignatura:
     - id:      palabra única SIN espacios ni tildes (se usa en el enlace)
     - sigla:   abreviación que usas en Drive (GCT, UIC, AC…)
     - nombre:  nombre completo que ven los estudiantes
     - nivel:   "III Medio" o "IV Medio" (agrupa las tarjetas del inicio)
     - icono:   un emoji para la tarjeta
     - color:   color de la tarjeta (puedes usar nombres o códigos #)
     - descripcion: 1 o 2 frases simples sobre qué se aprende
     - drive:   enlace a la carpeta de Drive de la asignatura
     - unidades: lista de unidades con número, título y descripción
     - recursos: guías, presentaciones, evaluaciones y enlaces
     - tareas:   actividades con fecha de entrega
     - fechas:   fechas importantes (aparecen también en el Calendario)

     Tipos de recurso permitidos (para el filtro):
     "guia" · "presentacion" · "evaluacion" · "enlace" · "refuerzo" · "documento"
     ---------------------------------------------------------- */
  asignaturas: [

    /* ================== III MEDIO ================== */
    {
      id: "gct",
      sigla: "GCT",
      nombre: "Gestión Comercial y Tributaria",
      nivel: "III Medio",
      icono: "🧾",
      color: "#2563eb",
      descripcion: "Aprenderás a manejar documentos comerciales y tributarios: facturas, boletas, libro de compras y ventas, e impuestos básicos como el IVA, usando hojas de cálculo.",
      drive: "https://drive.google.com/drive/folders/1iFSeh7_uwA6LmKXryWKCjEXbMVc1z6ve",
      unidades: [
        { numero: 1, titulo: "Documentos comerciales y tributarios", descripcion: "Reconocer y completar los documentos que usan las empresas: boletas, facturas, guías de despacho y notas de crédito." },
        { numero: 2, titulo: "Registros comerciales en hojas de cálculo", descripcion: "Registrar compras y ventas en planillas, calcular IVA y construir el libro de compras y ventas de una empresa." }
      ],
      recursos: [
        { titulo: "Carpeta Unidad 1 (todo el material)", tipo: "enlace", unidad: 1, fecha: "2026-04-26", url: "https://drive.google.com/drive/folders/174pBMtu10F93TvFZMhRqksWl3AC7X7-j", descripcion: "Todas las clases y guías de la Unidad 1 en Drive." },
        { titulo: "Clase 2.6 · Guía práctica: Libro de compra y venta", tipo: "guia", unidad: 2, fecha: "2026-05-11", url: "https://docs.google.com/document/d/1jI6Mx8FVlgnuKxqBVANf5jtUt1qwSoNHwqSTJLaaT7Y/edit", descripcion: "Guía paso a paso para registrar compras y ventas." },
        { titulo: "Clase 2.7 · Presentación", tipo: "presentacion", unidad: 2, fecha: "2026-05-18", url: "https://docs.google.com/presentation/d/1DbmnJuMlezYtvL4hSkaPCHi7i6WQQyAYYeRDMZTvhAQ/edit", descripcion: "Diapositivas de la clase 2.7 sobre registros comerciales." },
        { titulo: "Clase 2.11 · Guía práctica en Hojas de Cálculo", tipo: "guia", unidad: 2, fecha: "2026-06-01", url: "https://docs.google.com/document/d/1Xp77v8G0iXTlOdFdMSLcalXtJshJ33Es7yyPdwq41G4/edit", descripcion: "Ejercicios de fórmulas y funciones aplicadas a registros comerciales." },
        { titulo: "Clase 2.12 · Guía: Libro compra y ventas ferretería", tipo: "guia", unidad: 2, fecha: "2026-06-08", url: "https://drive.google.com/file/d/1UoZsRuB7C_DuD3lfCKbmAptHxyCKP6VQ/view", descripcion: "Caso práctico completo de una ferretería (planilla Excel descargable)." },
        { titulo: "Clase 2.4 · Respuesta ejemplar de la guía", tipo: "refuerzo", unidad: 2, fecha: "2026-05-04", url: "https://docs.google.com/document/d/1tX5pkrebpvvtsvJPYqPvf0YpPF4AeL_dUc4M54Gey-o/edit", descripcion: "Revisa cómo se resuelve correctamente la guía de la clase 2.4." },
        { titulo: "Evaluación Unidad Intermedia U2 (pauta)", tipo: "evaluacion", unidad: 2, fecha: "2026-05-10", url: "https://docs.google.com/document/d/1-TWCHJs6hxSpHulPKtCzfA2QIX-pnU2fH0-6BXR4LI4/edit", descripcion: "Documento de la evaluación intermedia de la Unidad 2." }
      ],
      tareas: [
        { titulo: "Completar guía Libro compra y ventas ferretería", descripcion: "Termina la planilla de la clase 2.12 y compártela al correo del profesor.", fechaEntrega: "2026-06-15" }
      ],
      fechas: [
        { fecha: "2026-06-09", titulo: "Evaluación de Unidad 2", tipo: "evaluacion" },
        { fecha: "2026-06-15", titulo: "Entrega guía ferretería", tipo: "entrega" }
      ]
    },

    {
      id: "uic",
      sigla: "UIC",
      nombre: "Utilización de Información Contable",
      nivel: "III Medio",
      icono: "📊",
      color: "#0d9488",
      descripcion: "Conocerás cómo se registra y ordena la información contable de una empresa para apoyar la toma de decisiones.",
      drive: "https://drive.google.com/drive/folders/1-kEPeq_NaAdDEV3JWUjYjOriOorbrdZc",
      unidades: [
        { numero: 1, titulo: "Fundamentos de la información contable", descripcion: "Qué es la contabilidad, para qué sirve y cuáles son sus conceptos básicos: activo, pasivo y patrimonio." },
        { numero: 2, titulo: "Registros contables básicos", descripcion: "Registrar operaciones simples y leer informes contables sencillos." }
      ],
      recursos: [
        { titulo: "Carpeta Unidad 1 (todo el material)", tipo: "enlace", unidad: 1, fecha: "2026-04-26", url: "https://drive.google.com/drive/folders/14DVYKo-6y0AIbd17z8tClwdE4mbulvZO", descripcion: "Material completo de la Unidad 1 en Drive." },
        { titulo: "Carpeta Unidad 2 (todo el material)", tipo: "enlace", unidad: 2, fecha: "2026-04-13", url: "https://drive.google.com/drive/folders/1uPVj3mMhDkwa0ZYatWUrCu3Y0dv0W_Uu", descripcion: "Material completo de la Unidad 2 en Drive." }
      ],
      tareas: [],
      fechas: []
    },

    {
      id: "ac",
      sigla: "AC",
      nombre: "Atención de Clientes",
      nivel: "III Medio",
      icono: "🤝",
      color: "#d97706",
      descripcion: "Desarrollarás habilidades para atender clientes de forma amable y profesional, en persona, por teléfono y por medios digitales.",
      drive: "https://drive.google.com/drive/folders/18qao_GfuwYk1me9jE98Vj5ULVKfv09_x",
      unidades: [
        { numero: 1, titulo: "Comunicación y servicio al cliente", descripcion: "Técnicas de comunicación efectiva y protocolos de atención." },
        { numero: 2, titulo: "Manejo de situaciones difíciles", descripcion: "Resolver reclamos y entregar soluciones manteniendo una buena relación con el cliente." }
      ],
      recursos: [
        { titulo: "Carpeta de la asignatura en Drive", tipo: "enlace", unidad: 1, fecha: "2026-03-03", url: "https://drive.google.com/drive/folders/18qao_GfuwYk1me9jE98Vj5ULVKfv09_x", descripcion: "Todas las clases y guías de Atención de Clientes." }
      ],
      tareas: [],
      fechas: []
    },

    {
      id: "oo",
      sigla: "OO",
      nombre: "Organización de Oficinas",
      nivel: "III Medio",
      icono: "🗂️",
      color: "#7c3aed",
      descripcion: "Aprenderás a organizar espacios de trabajo, archivar documentos y gestionar los recursos de una oficina.",
      drive: "https://drive.google.com/drive/folders/1CfOfja0xXQvNy8igeuxXFbkXv2Yxh5Np",
      unidades: [
        { numero: 1, titulo: "Organización del espacio y los documentos", descripcion: "Sistemas de archivo, orden documental y ergonomía básica." },
        { numero: 2, titulo: "Gestión de recursos de oficina", descripcion: "Control de materiales, correspondencia y agenda." }
      ],
      recursos: [
        { titulo: "Carpeta de la asignatura en Drive", tipo: "enlace", unidad: 1, fecha: "2026-03-03", url: "https://drive.google.com/drive/folders/1CfOfja0xXQvNy8igeuxXFbkXv2Yxh5Np", descripcion: "Todas las clases y guías de Organización de Oficinas." }
      ],
      tareas: [],
      fechas: []
    },

    {
      id: "pa",
      sigla: "PA",
      nombre: "Procesos Administrativos",
      nivel: "III Medio",
      icono: "⚙️",
      color: "#db2777",
      descripcion: "Conocerás cómo funcionan los procesos de una empresa: planificación, organización, dirección y control.",
      drive: "https://drive.google.com/drive/folders/1X3QOMDKBeLnWm_Wr3AvCNaYNhv1ayCNM",
      unidades: [
        { numero: 1, titulo: "La empresa y sus procesos", descripcion: "Tipos de empresa, áreas funcionales y flujos de trabajo." },
        { numero: 2, titulo: "Apoyo a los procesos administrativos", descripcion: "Elaborar y tramitar documentos que apoyan los procesos de la empresa." }
      ],
      recursos: [
        { titulo: "Carpeta de la asignatura en Drive", tipo: "enlace", unidad: 1, fecha: "2026-03-03", url: "https://drive.google.com/drive/folders/1X3QOMDKBeLnWm_Wr3AvCNaYNhv1ayCNM", descripcion: "Todas las clases y guías de Procesos Administrativos." }
      ],
      tareas: [],
      fechas: []
    },

    {
      id: "aiga",
      sigla: "AIGA",
      nombre: "Aplicaciones Informáticas para la Gestión Administrativa",
      nivel: "III Medio",
      icono: "💻",
      color: "#059669",
      descripcion: "Usarás herramientas digitales (procesador de texto, planillas y presentaciones) para resolver tareas administrativas reales.",
      drive: "https://drive.google.com/drive/folders/1UMdwtQjH-y86R9MqgHVKvEN8-6wSj8y-",
      unidades: [
        { numero: 1, titulo: "Herramientas de productividad", descripcion: "Documentos, planillas y presentaciones aplicadas a la oficina." },
        { numero: 2, titulo: "Gestión de información digital", descripcion: "Organizar archivos en la nube y trabajar de forma colaborativa." }
      ],
      recursos: [
        { titulo: "Carpeta de la asignatura en Drive", tipo: "enlace", unidad: 1, fecha: "2026-03-03", url: "https://drive.google.com/drive/folders/1UMdwtQjH-y86R9MqgHVKvEN8-6wSj8y-", descripcion: "Todas las clases y guías de AIGA." }
      ],
      tareas: [],
      fechas: []
    },

    /* ================== IV MEDIO ================== */
    {
      id: "ee",
      sigla: "EE",
      nombre: "Emprendimiento y Empleabilidad",
      nivel: "IV Medio",
      icono: "🚀",
      color: "#dc2626",
      descripcion: "Prepararás tu futuro laboral: currículum, entrevistas, derechos laborales y desarrollo de ideas de emprendimiento.",
      drive: "https://drive.google.com/drive/folders/1jEbQMGPPuh6S6xYc7y7WLhw3Qad2Ugah",
      unidades: [
        { numero: 1, titulo: "Mi proyecto laboral", descripcion: "Currículum, carta de presentación y preparación de entrevistas." },
        { numero: 2, titulo: "Emprender una idea", descripcion: "Detectar oportunidades y armar un plan simple de emprendimiento." }
      ],
      recursos: [
        { titulo: "Carpeta de la asignatura en Drive", tipo: "enlace", unidad: 1, fecha: "2025-12-29", url: "https://drive.google.com/drive/folders/1jEbQMGPPuh6S6xYc7y7WLhw3Qad2Ugah", descripcion: "Todas las clases y guías de Emprendimiento y Empleabilidad." }
      ],
      tareas: [],
      fechas: []
    },

    {
      id: "lel",
      sigla: "LEL",
      nombre: "Legislación Laboral",
      nivel: "IV Medio",
      icono: "⚖️",
      color: "#4f46e5",
      descripcion: "Conocerás los derechos y deberes de trabajadores y empleadores: contratos, jornada, descansos y término de la relación laboral.",
      drive: "https://drive.google.com/drive/folders/1HYcWXzv3sI2yoBzIIeZM3cd7wH4IrFy7",
      unidades: [
        { numero: 1, titulo: "El contrato de trabajo", descripcion: "Tipos de contrato, cláusulas y obligaciones de las partes." },
        { numero: 2, titulo: "Término de la relación laboral", descripcion: "Causales de despido, finiquito y protección de derechos." }
      ],
      recursos: [
        { titulo: "Carpeta de la asignatura en Drive", tipo: "enlace", unidad: 1, fecha: "2026-03-03", url: "https://drive.google.com/drive/folders/1HYcWXzv3sI2yoBzIIeZM3cd7wH4IrFy7", descripcion: "Todas las clases y guías de Legislación Laboral." }
      ],
      tareas: [],
      fechas: []
    },

    {
      id: "dp",
      sigla: "DP",
      nombre: "Dotación de Personal",
      nivel: "IV Medio",
      icono: "🧑‍💼",
      color: "#0891b2",
      descripcion: "Aprenderás cómo las empresas reclutan, seleccionan y contratan a su personal.",
      drive: "https://drive.google.com/drive/folders/1wiVjWbhzsQOzuImEXxeKTTKpWyFlJoIP",
      unidades: [
        { numero: 1, titulo: "Reclutamiento y selección", descripcion: "Publicar ofertas, revisar postulaciones y apoyar entrevistas." },
        { numero: 2, titulo: "Contratación e inducción", descripcion: "Documentos de contratación e incorporación de nuevas personas." }
      ],
      recursos: [
        { titulo: "Carpeta de la asignatura en Drive", tipo: "enlace", unidad: 1, fecha: "2026-03-03", url: "https://drive.google.com/drive/folders/1wiVjWbhzsQOzuImEXxeKTTKpWyFlJoIP", descripcion: "Todas las clases y guías de Dotación de Personal." }
      ],
      tareas: [],
      fechas: []
    },

    {
      id: "dbp",
      sigla: "DBP",
      nombre: "Desarrollo y Bienestar del Personal",
      nivel: "IV Medio",
      icono: "🌱",
      color: "#65a30d",
      descripcion: "Conocerás cómo las empresas capacitan a su personal y cuidan su bienestar y clima laboral.",
      drive: "https://drive.google.com/drive/folders/1ShgT1BXsJ59Jdi2gs0wLL5rsnHeDEQDC",
      unidades: [
        { numero: 1, titulo: "Capacitación y desarrollo", descripcion: "Detectar necesidades de capacitación y apoyar su organización." },
        { numero: 2, titulo: "Bienestar y clima laboral", descripcion: "Beneficios, prevención de riesgos y buen ambiente de trabajo." }
      ],
      recursos: [
        { titulo: "Carpeta de la asignatura en Drive", tipo: "enlace", unidad: 1, fecha: "2026-03-03", url: "https://drive.google.com/drive/folders/1ShgT1BXsJ59Jdi2gs0wLL5rsnHeDEQDC", descripcion: "Todas las clases y guías de Desarrollo y Bienestar del Personal." }
      ],
      tareas: [],
      fechas: []
    },

    {
      id: "crfol",
      sigla: "CRFOL",
      nombre: "Cálculo de Remuneraciones, Finiquitos y Obligaciones Laborales",
      nivel: "IV Medio",
      icono: "💰",
      color: "#b45309",
      descripcion: "Aprenderás a calcular sueldos, descuentos legales, horas extras y finiquitos según la normativa chilena.",
      drive: "https://drive.google.com/drive/folders/15sUDzHYcRKMj75rxdppJUu13RXhXWYzT",
      unidades: [
        { numero: 1, titulo: "Remuneraciones y descuentos legales", descripcion: "Sueldo base, gratificación, AFP, salud y cálculo de líquido a pagar." },
        { numero: 2, titulo: "Finiquitos y obligaciones laborales", descripcion: "Cálculo de finiquitos, cotizaciones y obligaciones del empleador." }
      ],
      recursos: [
        { titulo: "Carpeta de la asignatura en Drive", tipo: "enlace", unidad: 1, fecha: "2026-03-03", url: "https://drive.google.com/drive/folders/15sUDzHYcRKMj75rxdppJUu13RXhXWYzT", descripcion: "Todas las clases y guías de Cálculo de Remuneraciones." }
      ],
      tareas: [],
      fechas: []
    }
  ],

  /* ----------------------------------------------------------
     4) PREGUNTAS FRECUENTES
     Agrega o quita bloques { pregunta, respuesta } libremente.
     ---------------------------------------------------------- */
  preguntasFrecuentes: [
    {
      pregunta: "¿Dónde encuentro el material de una clase a la que falté?",
      respuesta: "Entra a la asignatura, busca la unidad correspondiente y revisa los recursos ordenados por fecha. También puedes abrir la carpeta de Drive de la asignatura, donde está todo el material."
    },
    {
      pregunta: "¿Cómo entrego una tarea?",
      respuesta: "Cada tarea indica su forma de entrega. Por lo general se comparte el documento o planilla al correo del profesor antes de la fecha límite."
    },
    {
      pregunta: "¿Qué hago si un enlace no me abre?",
      respuesta: "Asegúrate de haber iniciado sesión con tu correo institucional. Si el problema continúa, avísale al profesor indicando qué recurso intentaste abrir."
    },
    {
      pregunta: "¿Dónde veo las fechas de las evaluaciones?",
      respuesta: "En la sección 'Calendario' del menú están todas las fechas importantes de todas las asignaturas, y dentro de cada asignatura aparecen sus propias fechas."
    },
    {
      pregunta: "¿Puedo usar el portal desde el celular?",
      respuesta: "Sí, el portal está diseñado para funcionar bien en celulares, tablets y computadores."
    }
  ],

  /* ----------------------------------------------------------
     5) ETIQUETAS DE LOS TIPOS DE RECURSO
     Texto e ícono que se muestran para cada tipo. Si agregas un
     tipo nuevo aquí, ya puedes usarlo en los recursos de arriba.
     ---------------------------------------------------------- */
  tiposRecurso: {
    guia:         { etiqueta: "Guía",          icono: "📝" },
    presentacion: { etiqueta: "Presentación",  icono: "📽️" },
    evaluacion:   { etiqueta: "Evaluación",    icono: "✅" },
    enlace:       { etiqueta: "Enlace",        icono: "🔗" },
    refuerzo:     { etiqueta: "Refuerzo",      icono: "💪" },
    documento:    { etiqueta: "Documento",     icono: "📄" }
  }
};

/* ============================================================
   NO EDITAR DESDE AQUÍ HACIA ABAJO
   ------------------------------------------------------------
   Esta función entrega los datos al resto de la aplicación.
   Si el docente guardó cambios desde el panel (admin.html),
   esos cambios quedan en el navegador (localStorage) y tienen
   prioridad sobre este archivo. Esto deja el proyecto listo
   para, en el futuro, reemplazar esta función por una llamada
   a una base de datos o API sin tocar nada más.
   ============================================================ */
function obtenerDatos() {
  try {
    const guardado = localStorage.getItem("portal_datos");
    if (guardado) {
      const datos = JSON.parse(guardado);
      // Validación mínima: debe tener asignaturas para considerarse válido
      if (datos && Array.isArray(datos.asignaturas)) return datos;
    }
  } catch (e) {
    console.warn("No se pudieron leer los datos guardados, se usan los del archivo.", e);
  }
  return DATOS;
}
