/* ==================== SECCIÓN 1: ANIMACIÓN LOTTIE ==================== */
(() => {
  "use strict";
  const contenedor = document.querySelector(
    "#personaje .animacion-lottie"
  );
  if (!contenedor || !window.lottie) {
    console.error(
      "No se pudo iniciar Lottie: revisa el contenedor y la librería."
    );
    return;
  }
  // Evitar crear otra animación en el mismo contenedor.
  if (contenedor.dataset.lottieIniciado === "true") {
    console.warn("Lottie ya está iniciado en este contenedor.");
    return;
  }
  contenedor.dataset.lottieIniciado = "true";
  const personaje = window.lottie.loadAnimation({
    container: contenedor,
    renderer: "svg",
    loop: true,
    autoplay: false,
    path: "imagenes/Personaje_Lottie.json",
    rendererSettings: {
      preserveAspectRatio: "xMidYMid meet",
      progressiveLoad: true
    }
  });
  personaje.addEventListener("DOMLoaded", () => {
    personaje.playSegments([0, 390], true);
  });
  // Guardar la referencia por si necesitas depurar la animación.
  contenedor.lottieInstancia = personaje;
  personaje.addEventListener("data_failed", () => {
    console.error("No se pudo cargar Personaje_Lottie.json");
    delete contenedor.dataset.lottieIniciado;
  });
})();
/* ==================== SECCIÓN 1: TEXTO POPCORN POP ==================== */
(() => {
  "use strict";
  const textoVisible = document.querySelector("#texto-presentacion");
  const textoOriginal = document.querySelector("#texto-original");
  if (!textoVisible || !textoOriginal || !window.gsap || !window.SplitText) {
    console.warn("No se pudo iniciar Popcorn Pop.");
    return;
  }
  gsap.registerPlugin(SplitText);
  // Recuperar el texto completo del cuadro.
  textoVisible.textContent = textoOriginal.textContent.trim();
  // Separar el texto en caracteres individuales.
  const separacion = SplitText.create(textoVisible, {
    type: "chars",
    charsClass: "letra-popcorn",
    aria: "auto"
  });
  // Evitar que las letras se corten durante el movimiento.
  gsap.set(separacion.chars, {
    display: "inline-block",
    transformOrigin: "50% 100%"
  });
  // Efecto Popcorn Pop: cada letra aparece desde abajo,
  // crece y gira ligeramente en un orden aleatorio.
  gsap.from(separacion.chars, {
    scale: 0,
    y: 30,
    rotation: () => gsap.utils.random(-20, 20),
    opacity: 0,
    stagger: {
      each: 0.04,
      from: "start"
    },
    duration: 0.4,
    ease: "back.out(2)",
    delay: 0.5
  });
})();
/* ==================== SECCIÓN 1: REPRODUCTOR MUSICAL ==================== */
(() => {
  "use strict";
  // PLAYLIST LOCAL
  const playlist = [
    { src: "musica/B-Meowsic.mp3", title: "B-Meowsic .☘︎ ݁˖" },
    { src: "musica/Chat au Chocolat.mp3", title: "Chocolat ˖᯽ ݁˖" },
    { src: "musica/Waterfront Booossa.mp3", title: "Waterfront ⋆˚꩜｡" }
  ];
  const audio = new Audio();
  audio.preload = "auto";
  const anterior = document.getElementById("musica-anterior");
  const siguiente = document.getElementById("musica-siguiente");
  const botonPlay = document.getElementById("musica-play");
  const barraVolumen = document.getElementById("musica-volumen");
  const titulo = document.getElementById("musica-cancion");
  const estado = document.getElementById("musica-estado");
  const iconoPlay = botonPlay?.querySelector(".icono-play");
  const iconoPausa = botonPlay?.querySelector(".icono-pausa");
  if (
    !anterior || !siguiente || !botonPlay ||
    !barraVolumen || !titulo || !estado ||
    !iconoPlay || !iconoPausa
  ) {
    console.error("Reproductor: faltan elementos en el HTML.");
    return;
  }
  if (playlist.length === 0) {
    estado.textContent = "No hay canciones configuradas.";
    botonPlay.disabled = true;
    anterior.disabled = true;
    siguiente.disabled = true;
    return;
  }
  let indice = 0;
  let operacion = 0;
  let cambiandoCancion = false;
  // ICONOS
  function actualizarIcono(reproduciendo) {
    iconoPlay.hidden = reproduciendo;
    iconoPausa.hidden = !reproduciendo;
    botonPlay.setAttribute(
      "aria-label",
      reproduciendo ? "Pausar" : "Reproducir"
    );
    botonPlay.title = reproduciendo ? "Pausar" : "Reproducir";
  }
  // CARGAR PISTA
  function cargarCancion(nuevoIndice) {
    indice = (nuevoIndice + playlist.length) % playlist.length;
    operacion++;
    cambiandoCancion = true;
    audio.pause();
    audio.src = playlist[indice].src;
    audio.load();
    titulo.textContent = playlist[indice].title;
    actualizarIcono(false);
    estado.textContent = "Preparando canción...";
    cambiandoCancion = false;
  }
  // REPRODUCIR
  async function reproducir() {
    const idOperacion = ++operacion;
    try {
      await audio.play();
      // No aceptar respuestas de solicitudes antiguas.
      if (idOperacion !== operacion) return;
      actualizarIcono(true);
      estado.textContent = "Reproduciendo";
    } catch (error) {
      if (idOperacion !== operacion) return;
      actualizarIcono(false);
      if (error.name === "NotAllowedError") {
        estado.textContent = "Pulsa Play para iniciar la música";
      } else {
        estado.textContent = "No se pudo reproducir esta canción";
        console.error(
          "Error al reproducir:",
          playlist[indice].src,
          error
        );
      }
    }
  }
  // PAUSAR
  function pausar() {
    operacion++;
    audio.pause();
    actualizarIcono(false);
    estado.textContent = "Pausado";
  }
  // CAMBIAR DE PISTA Y REPRODUCIR
  function cambiarCancion(direccion) {
    cargarCancion(indice + direccion);
    reproducir();
  }
  // BOTÓN CENTRAL
  botonPlay.addEventListener("click", () => {
    if (audio.paused) {
      reproducir();
    } else {
      pausar();
    }
  });
  // ANTERIOR
  anterior.addEventListener("click", () => {
    cambiarCancion(-1);
  });
  // SIGUIENTE
  siguiente.addEventListener("click", () => {
    cambiarCancion(1);
  });
  // VOLUMEN
  function actualizarVolumen() {
    audio.volume = Math.max(
      0,
      Math.min(1, Number(barraVolumen.value) / 100)
    );
  }
  barraVolumen.addEventListener("input", actualizarVolumen);
  // ESTADO REAL DEL AUDIO
  audio.addEventListener("playing", () => {
    actualizarIcono(true);
    estado.textContent = "Reproduciendo";
  });
  audio.addEventListener("pause", () => {
    actualizarIcono(false);
    if (!cambiandoCancion && !audio.ended) {
      estado.textContent = "Pausado";
    }
  });
  // AL TERMINAR, PASAR A LA SIGUIENTE CANCIÓN
  audio.addEventListener("ended", () => {
    cambiarCancion(1);
  });
  // ERROR DE CARGA
  audio.addEventListener("error", () => {
    actualizarIcono(false);
    estado.textContent = "Error al cargar el archivo de audio";
    console.error(
      "No se pudo cargar:",
      playlist[indice].src,
      audio.error
    );
  });
  // INICIALIZACIÓN
  audio.volume = Number(barraVolumen.value) / 100;
  cargarCancion(0);
  // Intento de reproducción automática.
  // Si el navegador la bloquea, el usuario podrá pulsar Play.
  reproducir();
})();
/* ==================== INTERACCIONES SECCIÓN 2 ==================== */
(() => {
  "use strict";
  const seccion = document.getElementById("seccion-dos");
  if (!seccion) return;
  /* ---------- Historias con cambio cada 20 segundos ---------- */
  const historias = [
    ...seccion.querySelectorAll(".historia-texto")
  ];
  const botonesHistoria = [
    ...seccion.querySelectorAll("[data-ir-historia]")
  ];
  let historiaActual = 0;
  let temporizadorHistoria;
  let animacionTexto;
  function animarPalabrasDestacadas(contenedor) {
    if (!window.gsap) return;
    const palabras = contenedor.querySelectorAll(".ripple-wave");
    palabras.forEach((palabra) => {
      // Evitar envolver las letras más de una vez.
      if (palabra.dataset.wavePreparado === "true") return;
      palabra.dataset.wavePreparado = "true";
      const texto = palabra.textContent;
      palabra.replaceChildren();
      [...texto].forEach((caracter) => {
        const letra = document.createElement("span");
        letra.textContent = caracter === " " ? "\u00A0" : caracter;
        letra.style.display = "inline-block";
        palabra.appendChild(letra);
      });
    });
    const letras = contenedor.querySelectorAll(".ripple-wave span");
    if (!letras.length) return;
    if (animacionTexto) animacionTexto.kill();
    gsap.set(letras, { y: 0, scale: 1 });
    // Efecto ondulatorio: las letras suben en secuencia y regresan.
    animacionTexto = gsap.to(letras, {
      y: -4,
      scale: 1.04,
      duration: 0.35,
      stagger: {
        each: 0.025,
        repeat: 1,
        yoyo: true
      },
      ease: "sine.inOut"
    });
  }
  function mostrarHistoria(indice) {
    historiaActual = (indice + historias.length) % historias.length;
    historias.forEach((historia, i) => {
      historia.hidden = i !== historiaActual;
    });
    botonesHistoria.forEach((boton, i) => {
      boton.setAttribute(
        "aria-pressed",
        String(i === historiaActual)
      );
    });
    if (animacionTexto) {
      animacionTexto.kill();
      animacionTexto = null;
    }
    const historiaVisible = historias[historiaActual];
    if (historiaVisible) {
      animarPalabrasDestacadas(historiaVisible);
    }
    reiniciarTemporizador();
  }
  function reiniciarTemporizador() {
    window.clearTimeout(temporizadorHistoria);
    temporizadorHistoria = window.setTimeout(() => {
      mostrarHistoria(historiaActual + 1);
    }, 20000);
  }
  botonesHistoria.forEach((boton) => {
    boton.addEventListener("click", () => {
      mostrarHistoria(Number(boton.dataset.irHistoria));
    });
  });
  if (historias.length) {
    mostrarHistoria(0);
  }
  /* ---------- Cursor flotante con efecto de clic ---------- */
  const cursor = document.getElementById("cursor-decorativo");
  if (cursor && window.gsap) {
    const elementosObjetivo = [
      seccion.querySelector(".cuadro-sobre-mi"),
      seccion.querySelector(".tableta-contenedor"),
      seccion.querySelector(".historia-formacion"),
      seccion.querySelector(".estrella-seccion")
    ].filter(Boolean);
    let indiceObjetivo = 0;
    function moverCursor() {
      if (!elementosObjetivo.length) return;
      const objetivo = elementosObjetivo[
        indiceObjetivo % elementosObjetivo.length
      ];
      indiceObjetivo++;
      const limite = seccion.getBoundingClientRect();
      const caja = objetivo.getBoundingClientRect();
      const x = caja.left - limite.left + caja.width * 0.8;
      const y = caja.top - limite.top + caja.height * 0.8;
      gsap.to(cursor, {
        left: x,
        top: y,
        duration: 1.5,
        ease: "sine.inOut",
        onComplete: () => {
          gsap.timeline()
            .to(cursor, {
              scale: 0.78,
              duration: 0.12,
              ease: "power1.in"
            })
            .to(cursor, {
              scale: 1,
              duration: 0.18,
              ease: "back.out(2)"
            });
        }
      });
    }
    // El cursor se mueve entre los elementos, simulando pequeños clics.
    moverCursor();
    window.setInterval(moverCursor, 3500);
  }
})();
/* ==================== SECCIÓN 2: LOTTIE DEL CELULAR ==================== */
(() => {
  "use strict";
  const contenedor = document.getElementById("tableta-lottie");
  if (!contenedor || !window.lottie) {
    console.error("Celular: no se encontró #tableta-lottie o la librería Lottie.");
    return;
  }
  if (contenedor.dataset.lottieIniciado === "true") return;
  contenedor.dataset.lottieIniciado = "true";
  const animacion = window.lottie.loadAnimation({
    container: contenedor,
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: "imagenes/Celular.json",
    rendererSettings: { preserveAspectRatio: "xMidYMid meet" }
  });
  // Usa la proporción real de la animación para que no quede con márgenes ni recortada.
  animacion.addEventListener("DOMLoaded", () => {
    const datos = animacion.animationData || {};
    if (datos.w && datos.h) {
      contenedor.style.aspectRatio = `${datos.w} / ${datos.h}`;
    }
  });
})();
/* ==================== SECCIÓN 3: TABLAS CONECTADAS ==================== */
(() => {
  "use strict";
  /* ------------------------------------------------------------------
   * AJUSTES
   * ------------------------------------------------------------------ */
  /* Cuadro límite de cada tabla, en fracciones del tablero (0 a 1).
     Ninguna tabla puede salir de su cuadro, y los cuadros NO se tocan entre
     sí, así que las tablas nunca se montan unas sobre otras.
     Para dar más o menos recorrido, mueve estos números. */
  const ZONAS = {
    adobe: { izq: 0.03,  arr: 0.20,  der: 0.492, aba: 0.632 },
    arte:  { izq: 0.502, arr: 0.20,  der: 0.98,  aba: 0.632 },
    otros: { izq: 0.29,  arr: 0.638, der: 0.72,  aba: 0.96 }
  };
  /* Dónde se clava cada pin dentro de su tabla (0 a 1, medido en la referencia). */
  const ANCLAJES = {
    adobe: { x: 0.906, y: 0.056 },   // esquina superior derecha
    arte:  { x: 0.926, y: 0.099 },   // esquina superior derecha
    otros: { x: 0.057, y: 0.010 }    // esquina superior izquierda
  };
  const FISICA = {
    rigidezReposo: 0.035,         // fuerza con la que vuelven a su punto
    amortiguacionReposo: 0.72,    // menor = más rebote
    rigidezArrastre: 0.14,        // qué tan pegada sigue la tabla al puntero
    amortiguacionArrastre: 0.62,
    tramoLibre: 0.70,             // % del recorrido que se mueve 1:1 antes de "tensarse"
    hoverAlcance: 0.006,          // movimiento al pasar el mouse (fracción del ancho)
    hoverEmpuje: 0.04,            // impulso según la velocidad del mouse
    balanceo: 0.10,               // giro leve al moverse (como colgada del pin)
    balanceoMax: 1.5,             // grados
    /* Iconos: siguen a su tabla con un resorte propio */
    rigidezIcono: 0.08,
    amortiguacionIcono: 0.68,     // menor = más rebote
    iconoSeparacionMax: 0.18,     // cuánto pueden despegarse (fracción de su tamaño)
    iconoAlcance: 0.05,           // desplazamiento hacia el cursor al pasar por encima
    iconoEmpuje: 0.08,            // impulso según la velocidad del mouse
    escalaHover: 1.06,
    escalaAgarrado: 1.04,
    inclinacionPorDesvio: 0.15,   // giro según cuánto se retrasa respecto a su tabla
    inclinacionHover: 6           // grados de inclinación hacia el cursor
  };
  const reducirMovimiento =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* ------------------------------------------------------------------ */
  function iniciarTablero() {
    const tablero = document.getElementById("tablero-tablas");
    const svg = document.getElementById("tablero-conexiones");
    if (!tablero || !svg) {
      console.error("Tablero: no se encontró #tablero-tablas o su SVG.");
      return;
    }
    const hilos = {
      adobeArte: document.getElementById("hilo-adobe-arte"),
      adobeOtros: document.getElementById("hilo-adobe-otros"),
      arteOtros: document.getElementById("hilo-arte-otros")
    };
    const leerGiro = (el) => {
      const t = getComputedStyle(el).transform;
      if (!t || t === "none") return 0;
      const v = t.match(/matrix\(([^)]+)\)/);
      if (!v) return 0;
      const [a, b] = v[1].split(",").map(Number);
      return Math.atan2(b, a) * 180 / Math.PI;
    };
    const tablas = ["adobe", "arte", "otros"].map((nombre) => {
      const el = document.getElementById(`tabla-${nombre}`);
      return {
        nombre,
        el,
        pin: document.getElementById(`pin-${nombre}`),
        brillo: document.getElementById(`brillo-${nombre}`),
        giroBase: el ? leerGiro(el) : 0,
        angulo: 0,
        balanceo: 0,
        x: 0, y: 0,           // desplazamiento actual respecto a su punto
        vx: 0, vy: 0,         // velocidad
        tx: 0, ty: 0,         // hacia dónde la empuja el resorte
        arrastre: null,
        w: 0, h: 0, cx: 0, cy: 0,
        minX: 0, maxX: 0, minY: 0, maxY: 0
      };
    });
    if (
      tablas.some(b => !b.el || !b.pin || !b.brillo) ||
      Object.values(hilos).some(el => !el)
    ) {
      console.error("Tablero: faltan imágenes, pines o líneas en el HTML.");
      return;
    }
    tablas.forEach(b => { b.angulo = b.giroBase; });
    const porNombre = Object.fromEntries(tablas.map(b => [b.nombre, b]));
    /* ---------------- Iconos de aplicaciones ---------------- */
    const iconos = Array.from(tablero.querySelectorAll(".icono-app"))
      .map((el, i) => {
        const b = porNombre[el.dataset.tabla];
        const base = el.querySelector("img");
        if (!b || !base) return null;
        base.classList.add("icono-base");
        // Dos copias en silueta blanca: una para el barrido de luz y otra para el reflejo del cursor
        ["icono-barrido", "icono-foco"].forEach((clase) => {
          const capa = base.cloneNode();
          capa.className = `icono-capa ${clase}`;
          capa.alt = "";
          capa.setAttribute("aria-hidden", "true");
          el.appendChild(capa);
        });
        el.style.setProperty("--brillo", el.dataset.brillo || "#f0c070");
        el.style.setProperty("--retraso", `${(i * 0.85) % 7}s`);   // cada uno brilla a su tiempo
        return {
          el, b,
          fx: parseFloat(el.dataset.x), fy: parseFloat(el.dataset.y),
          fw: parseFloat(el.dataset.w),
          giro: parseFloat(el.dataset.giro) || 0,
          aspecto: parseFloat(el.dataset.aspecto) || 1,
          w: 0, h: 0,
          x: 0, y: 0, vx: 0, vy: 0,        // posición y velocidad propias
          escala: 1, ve: 0,                // escala y su velocidad (rebote)
          inclinacion: 0,
          mx: 0.5, my: 0.5,                // dónde está el cursor dentro del icono (0 a 1)
          hover: false, agarrado: false
        };
      })
      .filter(Boolean);
    let ancho = 0;
    let alto = 0;
    let raf = 0;
    let ultimo = 0;
    const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
    /* Movimiento "elástico": 1:1 hasta cierto punto y luego se va tensando
       hasta que es imposible pasar del borde de la zona. */
    function suave(d, maximo) {
      if (maximo <= 0) return 0;
      const a = Math.abs(d);
      const libre = maximo * FISICA.tramoLibre;
      if (a <= libre) return d;
      const resto = maximo - libre;
      return Math.sign(d) * (libre + resto * Math.tanh((a - libre) / resto));
    }
    const suaveEje = (d, min, max) => (d >= 0 ? suave(d, max) : suave(d, -min));
    /* Mide las tablas y calcula hasta dónde puede moverse cada una. */
    function medir() {
      const W = tablero.clientWidth;
      const H = tablero.clientHeight;
      if (!W || !H) return false;
      if (ancho && Math.abs(W - ancho) > 0.5) {
        const k = W / ancho;     // el tablero cambió de tamaño: escala el estado
        tablas.forEach(b => {
          b.x *= k; b.y *= k; b.vx *= k; b.vy *= k; b.tx *= k; b.ty *= k;
        });
      }
      ancho = W;
      alto = H;
      for (const b of tablas) {
        const w = b.el.offsetWidth;
        const h = b.el.offsetHeight;
        const rad = b.giroBase * Math.PI / 180;
        const c = Math.abs(Math.cos(rad));
        const s = Math.abs(Math.sin(rad));
        // medias dimensiones de la caja que ocupa la tabla ya girada
        const mitadX = (w * c + h * s) / 2;
        const mitadY = (w * s + h * c) / 2;
        // left/top del CSS = centro de la tabla
        const cx = b.el.offsetLeft;
        const cy = b.el.offsetTop;
        const z = ZONAS[b.nombre];
        b.w = w; b.h = h; b.cx = cx; b.cy = cy;
        b.minX = Math.min(0, z.izq * W + mitadX - cx);
        b.maxX = Math.max(0, z.der * W - mitadX - cx);
        b.minY = Math.min(0, z.arr * H + mitadY - cy);
        b.maxY = Math.max(0, z.aba * H - mitadY - cy);
        b.x = limitar(b.x, b.minX, b.maxX);
        b.y = limitar(b.y, b.minY, b.maxY);
      }
      // Tamaño de cada icono: proporcional al ancho de su tabla
      for (const ic of iconos) {
        ic.w = ic.fw * ic.b.w;
        ic.h = ic.w / ic.aspecto;
        ic.el.style.width = `${ic.w}px`;
        ic.el.style.height = `${ic.h}px`;
      }
      return true;
    }
    function aplicar(b) {
      b.el.style.transform =
        `translate(${b.x}px, ${b.y}px) rotate(${b.angulo}deg)`;
    }
    /* Posición real del pin: gira junto con su tabla. */
    function posicionPin(b) {
      const A = ANCLAJES[b.nombre];
      const rad = b.angulo * Math.PI / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      const lx = (A.x - 0.5) * b.w;
      const ly = (A.y - 0.5) * b.h;
      return {
        x: b.cx + b.x + lx * c - ly * s,
        y: b.cy + b.y + lx * s + ly * c
      };
    }
    /* Punto de la tabla donde está "pegado" el icono (gira y se mueve con ella). */
    function anclaIcono(ic) {
      const b = ic.b;
      const rad = b.angulo * Math.PI / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      const lx = (ic.fx - 0.5) * b.w;
      const ly = (ic.fy - 0.5) * b.h;
      return {
        x: b.cx + b.x + lx * c - ly * s,
        y: b.cy + b.y + lx * s + ly * c
      };
    }
    function aplicarIcono(ic) {
      const giro = ic.b.angulo + ic.giro + ic.inclinacion;
      ic.el.style.transform =
        `translate(${ic.x - ic.w / 2}px, ${ic.y - ic.h / 2}px) ` +
        `rotate(${giro}deg) scale(${ic.escala})`;
    }
    function colocarIcono(ic) {
      const P = anclaIcono(ic);
      ic.x = P.x; ic.y = P.y;
      ic.vx = 0; ic.vy = 0;
      ic.escala = 1; ic.ve = 0; ic.inclinacion = 0;
      aplicarIcono(ic);
      ic.el.classList.add("listo");
    }
    function clasificarIcono(ic) {
      ic.el.classList.toggle("activo", ic.hover || ic.agarrado);
      ic.el.classList.toggle("agarrado", ic.agarrado);
    }
    function actualizarConexiones() {
      if (!ancho || !alto) return;
      svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
      const grosor = Math.max(3.5, ancho * 0.006);   // hilos más gruesos
      const radio = Math.max(8, ancho * 0.0153);     // pines proporcionales a la referencia
      const pts = {};
      for (const b of tablas) {
        const p = posicionPin(b);
        pts[b.nombre] = p;
        b.pin.setAttribute("cx", p.x);
        b.pin.setAttribute("cy", p.y);
        b.pin.setAttribute("r", radio);
        b.pin.style.strokeWidth = Math.max(1.5, radio * 0.12);
        b.brillo.setAttribute("cx", p.x - radio * 0.32);
        b.brillo.setAttribute("cy", p.y - radio * 0.32);
        b.brillo.setAttribute("r", radio * 0.34);
      }
      const unir = (linea, a, b) => {
        linea.setAttribute("x1", a.x);
        linea.setAttribute("y1", a.y);
        linea.setAttribute("x2", b.x);
        linea.setAttribute("y2", b.y);
        linea.style.strokeWidth = grosor;
      };
      unir(hilos.adobeArte, pts.adobe, pts.arte);
      unir(hilos.adobeOtros, pts.adobe, pts.otros);
      unir(hilos.arteOtros, pts.arte, pts.otros);
    }
    /* ---------------- Física (resorte hacia su punto) ---------------- */
    function paso(t) {
      const dt = Math.min((t - ultimo) / 16.667, 2);
      ultimo = t;
      let activo = false;
      for (const b of tablas) {
        const sujeta = !!b.arrastre;
        const k = sujeta ? FISICA.rigidezArrastre : FISICA.rigidezReposo;
        const d = sujeta ? FISICA.amortiguacionArrastre : FISICA.amortiguacionReposo;
        const roce = Math.pow(d, dt);
        b.vx = (b.vx + (b.tx - b.x) * k * dt) * roce;
        b.vy = (b.vy + (b.ty - b.y) * k * dt) * roce;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        // Tope duro: jamás sale de su cuadro
        if (b.x < b.minX) { b.x = b.minX; if (b.vx < 0) b.vx = 0; }
        if (b.x > b.maxX) { b.x = b.maxX; if (b.vx > 0) b.vx = 0; }
        if (b.y < b.minY) { b.y = b.minY; if (b.vy < 0) b.vy = 0; }
        if (b.y > b.maxY) { b.y = b.maxY; if (b.vy > 0) b.vy = 0; }
        // Giro leve, como si colgara del pin
        const objetivo = reducirMovimiento
          ? 0
          : limitar(b.vx * FISICA.balanceo, -FISICA.balanceoMax, FISICA.balanceoMax);
        b.balanceo += (objetivo - b.balanceo) * 0.2 * dt;
        b.angulo = b.giroBase + b.balanceo;
        const quieta =
          !sujeta &&
          Math.abs(b.tx - b.x) < 0.05 && Math.abs(b.ty - b.y) < 0.05 &&
          Math.abs(b.vx) < 0.05 && Math.abs(b.vy) < 0.05 &&
          Math.abs(b.balanceo) < 0.02;
        if (quieta) {
          b.x = b.tx; b.y = b.ty; b.vx = 0; b.vy = 0;
          b.balanceo = 0; b.angulo = b.giroBase;
        } else {
          activo = true;
        }
        aplicar(b);
      }
      // Los iconos van tras su tabla con su propio resorte
      for (const ic of iconos) {
        const P = anclaIcono(ic);
        const sobre = ic.hover || ic.agarrado;
        const vivo = !reducirMovimiento;
        // Al pasar el cursor, el icono se desplaza un poco hacia él
        const alcance = ic.w * FISICA.iconoAlcance;
        const tx = P.x + (vivo && sobre ? (ic.mx - 0.5) * 2 * alcance : 0);
        const ty = P.y + (vivo && sobre ? (ic.my - 0.5) * 2 * alcance : 0);
        const escalaObj = !vivo ? 1
          : ic.agarrado ? FISICA.escalaAgarrado
          : ic.hover ? FISICA.escalaHover : 1;
        if (!vivo) {
          ic.x = tx; ic.y = ty; ic.vx = 0; ic.vy = 0;
          ic.escala = 1; ic.ve = 0; ic.inclinacion = 0;
        } else {
          const roce = Math.pow(FISICA.amortiguacionIcono, dt);
          ic.vx = (ic.vx + (tx - ic.x) * FISICA.rigidezIcono * dt) * roce;
          ic.vy = (ic.vy + (ty - ic.y) * FISICA.rigidezIcono * dt) * roce;
          ic.x += ic.vx * dt;
          ic.y += ic.vy * dt;
          // Nunca se despega del todo de su tabla
          const dx = ic.x - P.x;
          const dy = ic.y - P.y;
          const dist = Math.hypot(dx, dy);
          const tope = ic.w * FISICA.iconoSeparacionMax;
          if (dist > tope) {
            ic.x = P.x + dx / dist * tope;
            ic.y = P.y + dy / dist * tope;
          }
          // Escala con rebote
          ic.ve = (ic.ve + (escalaObj - ic.escala) * 0.22 * dt) * Math.pow(0.72, dt);
          ic.escala += ic.ve * dt;
        }
        // Se inclina según lo que se retrasa y hacia donde está el cursor
        const inclObj = vivo
          ? limitar(
              (ic.x - P.x) * FISICA.inclinacionPorDesvio +
              (sobre ? (ic.mx - 0.5) * FISICA.inclinacionHover : 0),
              -12, 12)
          : 0;
        ic.inclinacion += (inclObj - ic.inclinacion) * 0.25 * dt;
        const quieto =
          Math.abs(tx - ic.x) < 0.05 && Math.abs(ty - ic.y) < 0.05 &&
          Math.abs(ic.vx) < 0.05 && Math.abs(ic.vy) < 0.05 &&
          Math.abs(escalaObj - ic.escala) < 0.002 && Math.abs(ic.ve) < 0.002 &&
          Math.abs(inclObj - ic.inclinacion) < 0.05;
        if (quieto) {
          ic.x = tx; ic.y = ty; ic.vx = 0; ic.vy = 0;
          ic.escala = escalaObj; ic.ve = 0; ic.inclinacion = inclObj;
        } else {
          activo = true;
        }
        aplicarIcono(ic);
      }
      actualizarConexiones();
      raf = activo ? requestAnimationFrame(paso) : 0;
    }
    function despertar() {
      if (raf) return;
      ultimo = performance.now();
      raf = requestAnimationFrame(paso);
    }
    /* ---------------- Interacción ---------------- */
    const esDeLaTabla = (nodo, b) =>
      !!nodo && (
        nodo === b.el ||
        (nodo.closest && iconos.some(ic => ic.b === b && ic.el === nodo.closest(".icono-app")))
      );
    function iniciarArrastre(e, b) {
      if (e.button !== undefined && e.button !== 0) return;
      b.arrastre = {
        id: e.pointerId,
        px: e.clientX, py: e.clientY,
        x0: b.x, y0: b.y
      };
      if (b.el.setPointerCapture) b.el.setPointerCapture(e.pointerId);
      b.el.classList.add("arrastrando");
      e.preventDefault();
      despertar();
    }
    function moverPuntero(e, b) {
      const a = b.arrastre;
      if (a && a.id === e.pointerId) {
        b.tx = suaveEje(a.x0 + e.clientX - a.px, b.minX, b.maxX);
        b.ty = suaveEje(a.y0 + e.clientY - a.py, b.minY, b.maxY);
        e.preventDefault();
        despertar();
        return;
      }
      // Pasar el mouse por encima: un pequeño empujón elástico
      if (a || e.pointerType !== "mouse" || reducirMovimiento) return;
      const r = b.el.getBoundingClientRect();
      const nx = limitar((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
      const ny = limitar((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
      const alcance = ancho * FISICA.hoverAlcance;
      b.tx = limitar(nx * alcance, b.minX, b.maxX);
      b.ty = limitar(ny * alcance, b.minY, b.maxY);
      b.vx += limitar(e.movementX * FISICA.hoverEmpuje, -3, 3);
      b.vy += limitar(e.movementY * FISICA.hoverEmpuje, -3, 3);
      despertar();
    }
    function soltar(e, b) {
      if (!b.arrastre || b.arrastre.id !== e.pointerId) return;
      b.arrastre = null;
      b.el.classList.remove("arrastrando");
      iconos.forEach((ic) => {
        if (ic.b === b && ic.agarrado) { ic.agarrado = false; clasificarIcono(ic); }
      });
      b.tx = 0; b.ty = 0;           // el resorte la devuelve a su punto
      despertar();
    }
    tablas.forEach((b) => {
      b.el.addEventListener("pointerdown", (e) => iniciarArrastre(e, b));
      b.el.addEventListener("pointermove", (e) => moverPuntero(e, b));
      b.el.addEventListener("pointerup", (e) => soltar(e, b));
      b.el.addEventListener("pointercancel", (e) => soltar(e, b));
      b.el.addEventListener("lostpointercapture", (e) => soltar(e, b));
      b.el.addEventListener("pointerleave", (e) => {
        if (b.arrastre || esDeLaTabla(e.relatedTarget, b)) return;
        b.tx = 0; b.ty = 0;
        despertar();
      });
    });
    /* ---------------- Interacción de los iconos ---------------- */
    iconos.forEach((ic) => {
      const b = ic.b;
      const ubicarCursor = (e) => {
        ic.mx = limitar(e.offsetX / ic.w, 0, 1);
        ic.my = limitar(e.offsetY / ic.h, 0, 1);
        ic.el.style.setProperty("--mx", `${ic.mx * 100}%`);
        ic.el.style.setProperty("--my", `${ic.my * 100}%`);
      };
      const empujar = (e, f) => {
        if (reducirMovimiento) return;
        ic.vx += limitar(e.movementX * FISICA.iconoEmpuje * f, -4, 4);
        ic.vy += limitar(e.movementY * FISICA.iconoEmpuje * f, -4, 4);
      };
      ic.el.addEventListener("pointerenter", (e) => {
        ic.hover = true;
        ubicarCursor(e);
        empujar(e, 1.5);
        clasificarIcono(ic);
        despertar();
      });
      ic.el.addEventListener("pointermove", (e) => {
        ubicarCursor(e);
        empujar(e, 0.5);
        moverPuntero(e, b);          // la tabla también reacciona al pasar el mouse
        despertar();
      });
      ic.el.addEventListener("pointerleave", (e) => {
        ic.hover = false;
        clasificarIcono(ic);
        if (!b.arrastre && !esDeLaTabla(e.relatedTarget, b)) {
          b.tx = 0; b.ty = 0;
        }
        despertar();
      });
      // Agarrar un icono arrastra su tabla completa
      ic.el.addEventListener("pointerdown", (e) => {
        ic.agarrado = true;
        ubicarCursor(e);
        clasificarIcono(ic);
        iniciarArrastre(e, b);
      });
    });
    /* ---------------- Cuadros límite visibles (solo para ajustar) ---------------- */
    if (new URLSearchParams(window.location.search).has("zonas")) {
      for (const [nombre, z] of Object.entries(ZONAS)) {
        const caja = document.createElement("div");
        caja.className = "zona-limite";
        caja.dataset.zona = nombre;
        caja.style.left = `${z.izq * 100}%`;
        caja.style.top = `${z.arr * 100}%`;
        caja.style.width = `${(z.der - z.izq) * 100}%`;
        caja.style.height = `${(z.aba - z.arr) * 100}%`;
        tablero.insertBefore(caja, tablero.firstChild);
      }
    }
    /* ---------------- Arranque y cambios de tamaño ---------------- */
    function refrescar() {
      if (!medir()) return;
      tablas.forEach(aplicar);
      iconos.forEach(colocarIcono);
      actualizarConexiones();
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(refrescar).observe(tablero);
    } else {
      window.addEventListener("resize", refrescar);
    }
    Promise.all(
      tablas.map(b => {
        if (b.el.complete && b.el.naturalWidth > 0) return Promise.resolve();
        return new Promise(resolve => {
          b.el.addEventListener("load", resolve, { once: true });
          b.el.addEventListener("error", resolve, { once: true });
        });
      })
    ).then(refrescar);
    refrescar();
    console.info("Tablero de tablas inicializado correctamente.");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarTablero, { once: true });
  } else {
    iniciarTablero();
  }
})();
/* ==================== SECCIÓN 4: PROYECTOS ==================== */
(() => {
  "use strict";
  /* ------------------------------------------------------------------
     CONTENIDO DE LOS PROYECTOS
     Para cambiar un proyecto edita su bloque. Por ahora los 3 son iguales.
       logo   : imagen del logo (arrastrable)
       fotos  : 3 imágenes, se muestran en los 3 marcos
       titulo : encabezado de la hoja
       texto  : descripción de la hoja
       redes  : iconos (icono, url, nombre)
     ------------------------------------------------------------------ */
  const PROYECTO_BASE = {
    nombre: "Proyecto",
    logo: "imagenes/TT Logo.svg",
    fotos: ["fotos/foto1.jpg", "fotos/foto2.jpg", "fotos/foto3.jpg"],
    titulo: "",   // déjalo vacío para no mostrar título (como en la referencia)
    texto:
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy " +
      "nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi " +
      "enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis " +
      "nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in " +
      "hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla",
    redes: [
      { icono: "imagenes/Insta_Icon.svg",  url: "#", nombre: "Instagram" },
      { icono: "imagenes/Tiktok_Icon.svg", url: "#", nombre: "TikTok" }
    ]
  };
  const PROYECTOS = [
    { ...PROYECTO_BASE, nombre: "Proyecto 1" },   // ← reemplaza con el proyecto 1
    { ...PROYECTO_BASE, nombre: "Proyecto 2" },   // ← reemplaza con el proyecto 2
    { ...PROYECTO_BASE, nombre: "Proyecto 3" }    // ← reemplaza con el proyecto 3
  ];
  /* ------------------------------------------------------------------ */
  const contenedor = document.getElementById("proyecto-contenido");
  const anterior = document.getElementById("proyecto-anterior");
  const siguiente = document.getElementById("proyecto-siguiente");
  const estado = document.getElementById("proyecto-estado");
  if (!contenedor || !anterior || !siguiente) {
    console.warn("Sección 4: faltan elementos en el HTML.");
    return;
  }
  let actual = 0;
  let ocupado = false;
  const hayGsap = () => typeof window.gsap !== "undefined";
  const sinMovimiento = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Rebote suave al pulsar (flechas e iconos de redes)
  function rebotar(el) {
    el.classList.remove("rebota");
    void el.offsetWidth;
    el.classList.add("rebota");
    el.addEventListener("animationend", () => el.classList.remove("rebota"), { once: true });
  }
  // Logo arrastrable: vuelve a su punto al soltarlo
  function activarArrastre(el) {
    let id = null;
    let x0 = 0;
    let y0 = 0;
    el.addEventListener("pointerdown", ev => {
      if (ocupado) return;
      id = ev.pointerId;
      x0 = ev.clientX;
      y0 = ev.clientY;
      el.setPointerCapture(id);
      el.classList.add("arrastrando");
      if (hayGsap()) gsap.killTweensOf(el);
      ev.preventDefault();
    });
    el.addEventListener("pointermove", ev => {
      if (ev.pointerId !== id) return;
      const dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      if (hayGsap()) gsap.set(el, { x: dx, y: dy });
      else el.style.translate = `${dx}px ${dy}px`;
    });
    const soltar = ev => {
      if (ev.pointerId !== id) return;
      id = null;
      el.classList.remove("arrastrando");
      if (hayGsap()) {
        gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.45)" });
      } else {
        el.style.translate = "";
      }
    };
    el.addEventListener("pointerup", soltar);
    el.addEventListener("pointercancel", soltar);
    el.addEventListener("dragstart", ev => ev.preventDefault());
  }
  function crear(tag, clase, atributos = {}) {
    const el = document.createElement(tag);
    if (clase) el.className = clase;
    Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }
  // Dibuja un proyecto dentro del contenedor.
  function montar(indice) {
    const p = PROYECTOS[indice];
    const nodos = [];
    const logo = crear("img", "p-logo", {
      src: p.logo,
      alt: `Logo de ${p.nombre}`,
      draggable: "false"
    });
    activarArrastre(logo);
    nodos.push(logo);
    p.fotos.slice(0, 3).forEach((src, i) => {
      const marco = crear("figure", `p-foto p-foto-${i + 1}`);
      const img = crear("img", "", {
        src,
        alt: `Foto ${i + 1} de ${p.nombre}`,
        loading: "lazy",
        draggable: "false"
      });
      // Si la foto aún no existe, el marco se queda vacío con su borde.
      img.addEventListener("error", () => { img.style.visibility = "hidden"; });
      marco.appendChild(img);
      nodos.push(marco);
    });
    const hoja = crear("div", "p-hoja");
    hoja.appendChild(crear("img", "p-hoja-fondo", {
      src: "imagenes/Hoja Info.svg",
      alt: "",
      "aria-hidden": "true"
    }));
    const texto = crear("div", "p-hoja-texto");
    if (p.titulo) {
      const h3 = crear("h3");
      h3.textContent = p.titulo;
      texto.appendChild(h3);
    }
    const parrafo = crear("p");
    parrafo.textContent = p.texto;
    texto.appendChild(parrafo);
    hoja.appendChild(texto);
    nodos.push(hoja);
    const redes = crear("div", "p-redes");
    p.redes.forEach(r => {
      const a = crear("a", "p-red", { href: r.url, "aria-label": r.nombre });
      if (/^https?:/i.test(r.url)) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      a.appendChild(crear("img", "", { src: r.icono, alt: "", draggable: "false" }));
      redes.appendChild(a);
    });
    nodos.push(redes);
    contenedor.replaceChildren(...nodos);
    actual = indice;
    if (estado) estado.textContent = `${p.nombre}, ${indice + 1} de ${PROYECTOS.length}`;
    return nodos;
  }
  /* Transición "borrador": lo viejo se borra con un barrido y lo nuevo
     se descubre con otro, objeto por objeto. */
  function ir(delta) {
    if (ocupado) return;
    const destino = (actual + delta + PROYECTOS.length) % PROYECTOS.length;
    if (!hayGsap() || sinMovimiento()) {
      montar(destino);
      return;
    }
    ocupado = true;
    const adelante = delta > 0;
    const visible = "inset(0% 0% 0% 0%)";
    const borrado = adelante ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)";
    const oculto = adelante ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)";
    const viejos = [...contenedor.children];
    gsap.fromTo(
      viejos,
      { clipPath: visible, opacity: 1 },
      {
        clipPath: borrado,
        opacity: 0,
        duration: 0.42,
        ease: "power2.in",
        stagger: 0.06,
        onComplete() {
          const nuevos = montar(destino);
          gsap.fromTo(
            nuevos,
            { clipPath: oculto, opacity: 0 },
            {
              clipPath: visible,
              opacity: 1,
              duration: 0.5,
              ease: "power2.out",
              stagger: 0.07,
              clearProps: "clipPath,opacity",
              onComplete() { ocupado = false; }
            }
          );
        }
      }
    );
  }
  anterior.addEventListener("click", () => { rebotar(anterior); ir(-1); });
  siguiente.addEventListener("click", () => { rebotar(siguiente); ir(1); });
  // Iconos de redes: rebote suave al presionar
  contenedor.addEventListener("click", ev => {
    const red = ev.target.closest(".p-red");
    if (!red) return;
    rebotar(red);
    if (red.getAttribute("href") === "#") ev.preventDefault();
  });
  montar(0);
})();