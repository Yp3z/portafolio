/* ==================== VISOR 3D (pantalla del teléfono) ====================
   Muestra LowPoly.glb sobre un fondo de estrellas y una cuadrícula verde en perspectiva,
   con los colores de tu paleta. Los botones del teléfono controlan el modelo:
     izquierda / derecha → gira el modelo
     más / menos         → acerca / aleja la cámara (hasta un límite)
   Un toque hace un paso; mantenerlo presionado lo repite de forma continua.

   NOTA: usa módulos ES y carga el .glb con fetch, así que la página debe abrirse desde un
   servidor (Live Server, hosting, etc.), no con doble clic sobre el archivo. */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* ------------------------------------------------------------------
 * AJUSTES
 * ------------------------------------------------------------------ */
const MODELO = "imagenes/LowPoly.glb";

const COLORES = {
  verde: "#a6a665",        // líneas de la cuadrícula
  verdeClaro: "#d3cf9f",   // líneas principales (cada 5 celdas)
  crema: "#ede1c9",        // estrellas y luz
  sombra: "rgba(26, 20, 14, "
};

const VISTA = {
  fov: 34,                 // grados (campo de visión vertical)
  alturaCamara: 0.5,       // altura de la cámara: baja, para ver la cuadrícula en perspectiva
  objetivoY: 0.9,          // hacia dónde mira (altura del modelo)
  distancia: 4.3,          // distancia inicial
  distMin: 2.4,            // límite al acercarse
  distMax: 6.4,            // límite al alejarse
  altoModelo: 1.8          // el modelo se escala a esta altura
};

const CONTROL = {
  pasoGiro: 0.5,           // radianes por toque (~29°)
  velGiro: 1.7,            // radianes por segundo al mantener presionado
  pasoZoom: 0.55,          // unidades por toque
  velZoom: 1.9,            // unidades por segundo al mantener presionado
  retardoRepeticion: 220,  // ms antes de que mantener presionado empiece a repetir
  suavizado: 9             // más alto = respuesta más rápida
};

/* Aspecto pixelado (tipo Nintendo DS): la escena se dibuja en baja resolución y se amplía sin suavizar,
   las texturas no se suavizan y el cielo usa una paleta limitada con tramado (dithering).
   Para volver al aspecto liso: activo: false. */
const PIXELADO = {
  activo: true,
  columnas: 500        // ancho del render en píxeles (menos = píxeles más grandes)
};


const CUADRICULA = { celda: 0.8, grosor: 1.4, grosorPixel: 1.2, cerca: 7, lejos: 60 };
const ESTRELLAS = { cantidad: 1200, radio: 180 };

// Medidas de LowPoly.glb por si el cálculo automático fallara (tamaño y centro del modelo)
const MEDIDAS_RESPALDO = { alto: 1.951, minY: -0.345, cx: 0.004, cz: 0.31 };

const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

/* ------------------------------------------------------------------
 * CONTROL (lógica pura de giro y zoom; no depende de three.js)
 * ------------------------------------------------------------------ */
function crearControl(cfg, vista) {
  const est = { rot: 0, rotObj: 0, dist: vista.distancia, distObj: vista.distancia };
  const activas = { izquierda: 0, derecha: 0, mas: 0, menos: 0 };   // 0 = suelta · otro = instante en que se presionó

  function paso(accion) {
    if (accion === "izquierda") est.rotObj -= cfg.pasoGiro;
    else if (accion === "derecha") est.rotObj += cfg.pasoGiro;
    else if (accion === "mas") est.distObj -= cfg.pasoZoom;
    else if (accion === "menos") est.distObj += cfg.pasoZoom;
    est.distObj = limitar(est.distObj, vista.distMin, vista.distMax);
  }
  function accion(nombre, fase, ahora) {
    if (!(nombre in activas)) return;
    if (fase === "inicio") { activas[nombre] = ahora || 1; paso(nombre); }
    else if (fase === "fin") { activas[nombre] = 0; }
  }
  function actualizar(dt, ahora) {
    const sostenida = (n) => activas[n] && ahora - activas[n] > cfg.retardoRepeticion;
    if (sostenida("izquierda")) est.rotObj -= cfg.velGiro * dt;
    if (sostenida("derecha")) est.rotObj += cfg.velGiro * dt;
    if (sostenida("mas")) est.distObj -= cfg.velZoom * dt;
    if (sostenida("menos")) est.distObj += cfg.velZoom * dt;
    est.distObj = limitar(est.distObj, vista.distMin, vista.distMax);
    const k = 1 - Math.exp(-cfg.suavizado * dt);
    est.rot += (est.rotObj - est.rot) * k;
    est.dist += (est.distObj - est.dist) * k;
  }
  return { est, accion, actualizar };
}

/* ------------------------------------------------------------------
 * CIELO PIXELADO (degradado con tramado ordenado sobre una paleta fija)
 * Dibuja en "datos" (RGBA, w x h) el mismo degradado del CSS: cielo oscuro, horizonte con
 * resplandor verde y suelo oscuro. Los colores se limitan a esta paleta (de marrón oscuro a
 * tu verde oliva) y se tramean con una matriz Bayer 4x4 entre tonos vecinos.
 * ------------------------------------------------------------------ */
const PALETA_CIELO = [
  [58, 54, 38], [70, 65, 45], [82, 76, 52], [92, 89, 55],
  [102, 102, 58], [116, 115, 66], [128, 127, 72], [140, 140, 80]
];
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Posición (decimal) de un color a lo largo de la paleta: el punto más cercano de la polilínea
function posicionEnPaleta(col) {
  let mejor = 0, mejorD = Infinity;
  for (let j = 0; j < PALETA_CIELO.length - 1; j++) {
    const a = PALETA_CIELO[j], b = PALETA_CIELO[j + 1];
    let dd = 0, ab = 0;
    for (let k = 0; k < 3; k++) { ab += (b[k] - a[k]) ** 2; dd += (col[k] - a[k]) * (b[k] - a[k]); }
    const u = limitar(dd / Math.max(1e-6, ab), 0, 1);
    let dist = 0;
    for (let k = 0; k < 3; k++) dist += (a[k] + (b[k] - a[k]) * u - col[k]) ** 2;
    if (dist < mejorD) { mejorD = dist; mejor = j + u; }
  }
  return mejor;
}

function pintarCielo(datos, w, h, horizonte) {
  // [posición, color]: arriba → horizonte → suelo
  const paradas = [
    [0, [62, 57, 41]],
    [Math.max(0.01, horizonte - 0.02), [88, 84, 54]],
    [horizonte, [100, 98, 58]],
    [1, [66, 61, 43]]
  ];
  const verde = [140, 140, 80];
  const max = PALETA_CIELO.length - 1;
  for (let y = 0; y < h; y++) {
    const t = (y + 0.5) / h;
    let i = 0;
    while (i < paradas.length - 2 && t > paradas[i + 1][0]) i++;
    const [t0, c0] = paradas[i];
    const [t1, c1] = paradas[i + 1];
    const f = limitar((t - t0) / Math.max(1e-6, t1 - t0), 0, 1);
    // resplandor del horizonte (sube hasta 0.22 y baja)
    let g = t < horizonte ? (t - (horizonte - 0.10)) / 0.10 : (horizonte + 0.08 - t) / 0.08;
    g = limitar(g, 0, 1) * 0.22;
    const col = [0, 1, 2].map((k) => {
      const base = c0[k] + (c1[k] - c0[k]) * f;
      return base + (verde[k] - base) * g;
    });
    const pos = posicionEnPaleta(col);          // una sola posición por fila: sin manchas de color
    for (let x = 0; x < w; x++) {
      const u = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      const c = PALETA_CIELO[limitar(Math.floor(pos + u), 0, max)];
      const o = (y * w + x) * 4;
      datos[o] = c[0]; datos[o + 1] = c[1]; datos[o + 2] = c[2]; datos[o + 3] = 255;
    }
  }
}

/* ------------------------------------------------------------------
 * ESCENA
 * ------------------------------------------------------------------ */
const contenedor = document.getElementById("visor-3d");
const escenario = document.getElementById("visor-escena");

if (contenedor) iniciar();

function mensaje(texto) {
  let el = contenedor.querySelector(".visor-mensaje");
  if (!texto) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.className = "visor-mensaje";
    contenedor.appendChild(el);
  }
  el.textContent = texto;
}

function iniciar() {
  const sinMovimiento =
    !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !PIXELADO.activo, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    mensaje("Tu navegador no pudo iniciar el visor 3D.");
    return;
  }
  renderer.setClearColor(0x000000, 0);          // transparente: el cielo es un degradado CSS
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  if (PIXELADO.activo) canvas.style.imageRendering = "pixelated";   // ampliar sin suavizar
  contenedor.insertBefore(canvas, contenedor.firstChild);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(VISTA.fov, 0.64, 0.1, 500);
  const control = crearControl(CONTROL, VISTA);

  /* ---------- Luces (fijas: al girar el modelo cambia cómo le llega la luz) ---------- */
  escena.add(new THREE.HemisphereLight(0xede1c9, 0x6a5a45, 1.15));
  const sol = new THREE.DirectionalLight(0xfff1d8, 1.5);
  sol.position.set(2.5, 3.5, 4);
  escena.add(sol);

  /* ---------- Cuadrícula en perspectiva (shader: líneas nítidas que se desvanecen con la distancia) ---------- */
  const cuadricula = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(COLORES.verde) },
        uColorMayor: { value: new THREE.Color(COLORES.verdeClaro) },
        uCelda: { value: CUADRICULA.celda },
        uGrosor: { value: CUADRICULA.grosor },
        uDuro: { value: PIXELADO.activo ? 1 : 0 },
        uCerca: { value: CUADRICULA.cerca },
        uLejos: { value: CUADRICULA.lejos }
      },
      vertexShader: `
        varying vec3 vMundo;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vMundo = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        varying vec3 vMundo;
        uniform vec3 uColor;
        uniform vec3 uColorMayor;
        uniform float uCelda;
        uniform float uGrosor;
        uniform float uDuro;
        uniform float uCerca;
        uniform float uLejos;
        float bayer4(vec2 p) {
          float m[16] = float[16](0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.);
          int i = int(mod(p.x, 4.0)) + 4 * int(mod(p.y, 4.0));
          return (m[i] + 0.5) / 16.0;
        }
        float linea(vec2 c, float grosor) {
          vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
          float l = min(g.x, g.y);
          return 1.0 - clamp(l - (grosor - 1.0) * 0.5, 0.0, 1.0);
        }
        void main() {
          vec2 c = vMundo.xz / uCelda;
          float menor = linea(c, uGrosor);
          float mayor = linea(c / 5.0, uGrosor * 1.5);
          float d = length(vMundo.xz - cameraPosition.xz);
          float fade = 1.0 - smoothstep(uCerca, uLejos, d);
          float a = max(menor * 0.85, mayor) * fade;
          if (uDuro > 0.5) {
            // Modo pixelado: líneas nítidas y desvanecimiento con tramado en lugar de transparencia suave
            float linea = step(0.4, max(menor, mayor));
            a = linea * (fade > bayer4(gl_FragCoord.xy) ? 1.0 : 0.0);
          }
          if (a < 0.003) discard;
          gl_FragColor = vec4(mix(uColor, uColorMayor, step(0.4, mayor)), a);
          #include <colorspace_fragment>
        }`
    })
  );
  cuadricula.rotation.x = -Math.PI / 2;
  cuadricula.renderOrder = 0;
  escena.add(cuadricula);

  /* ---------- Estrellas (en el sector de cielo que ve la cámara) ---------- */
  const uniformsEstrellas = {
    uDuro: { value: PIXELADO.activo ? 1 : 0 },
    uTiempo: { value: 0 },
    uPR: { value: 1 },
    uColor: { value: new THREE.Color(COLORES.crema) }
  };
  {
    const n = ESTRELLAS.cantidad;
    const pos = new Float32Array(n * 3);
    const tam = new Float32Array(n);
    const alfa = new Float32Array(n);
    const fase = new Float32Array(n);
    const vel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const az = (Math.random() * 2 - 1) * 0.42;           // a los lados del frente (-Z)
      const el = 0.01 + Math.random() * 0.85;              // sobre el horizonte
      pos[i * 3] = Math.sin(az) * Math.cos(el) * ESTRELLAS.radio;
      pos[i * 3 + 1] = Math.sin(el) * ESTRELLAS.radio;
      pos[i * 3 + 2] = -Math.cos(az) * Math.cos(el) * ESTRELLAS.radio;
      tam[i] = 1.0 + Math.pow(Math.random(), 3) * 2.0;     // casi todas pequeñas
      alfa[i] = 0.35 + Math.random() * 0.65;
      fase[i] = Math.random() * Math.PI * 2;
      vel[i] = 0.5 + Math.random() * 1.1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aTam", new THREE.BufferAttribute(tam, 1));
    geo.setAttribute("aAlfa", new THREE.BufferAttribute(alfa, 1));
    geo.setAttribute("aFase", new THREE.BufferAttribute(fase, 1));
    geo.setAttribute("aVel", new THREE.BufferAttribute(vel, 1));
    const estrellas = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: uniformsEstrellas,
        vertexShader: `
          attribute float aTam;
          attribute float aAlfa;
          attribute float aFase;
          attribute float aVel;
          uniform float uTiempo;
          uniform float uPR;
          varying float vAlfa;
          void main() {
            vAlfa = aAlfa * (0.78 + 0.22 * sin(uTiempo * aVel + aFase));
            gl_PointSize = max(1.0, floor(aTam * uPR + 0.5));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uDuro;
          varying float vAlfa;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = uDuro > 0.5 ? vAlfa : smoothstep(0.5, 0.2, d) * vAlfa;   // pixelado: puntos cuadrados
            if (a < 0.01) discard;
            gl_FragColor = vec4(uColor, a);
            #include <colorspace_fragment>
          }`
      })
    );
    estrellas.frustumCulled = false;
    estrellas.renderOrder = -1;
    escena.add(estrellas);
  }

  /* ---------- Sombra suave bajo los pies ---------- */
  {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, COLORES.sombra + "0.6)");
    r.addColorStop(0.55, COLORES.sombra + "0.28)");
    r.addColorStop(1, COLORES.sombra + "0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sombra = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 1.7),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.004;
    sombra.renderOrder = 1;
    escena.add(sombra);
  }

  /* ---------- Modelo (dentro de un pivote que gira) ---------- */
  const pivote = new THREE.Group();
  escena.add(pivote);

  mensaje("Cargando modelo…");
  new GLTFLoader().load(
    MODELO,
    (gltf) => {
      const modelo = gltf.scene;
      modelo.updateMatrixWorld(true);

      // Medir el modelo (con su pose) para centrarlo, apoyarlo en el suelo y escalarlo
      let alto = MEDIDAS_RESPALDO.alto, minY = MEDIDAS_RESPALDO.minY;
      let cx = MEDIDAS_RESPALDO.cx, cz = MEDIDAS_RESPALDO.cz;
      try {
        const caja = new THREE.Box3().setFromObject(modelo, true);
        const tam = caja.getSize(new THREE.Vector3());
        const cen = caja.getCenter(new THREE.Vector3());
        if (isFinite(tam.y) && tam.y > 0.01) { alto = tam.y; minY = caja.min.y; cx = cen.x; cz = cen.z; }
      } catch (e) { /* se usan las medidas de respaldo */ }

      const esc = VISTA.altoModelo / alto;
      modelo.scale.setScalar(esc);
      modelo.position.set(-cx * esc, -minY * esc, -cz * esc);

      const anisotropia = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      modelo.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;                       // los modelos con esqueleto no deben desaparecer
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (!m || !m.map) return;
          m.map.anisotropy = anisotropia;
          if (PIXELADO.activo) {                       // texturas nítidas, sin suavizar
            m.map.magFilter = THREE.NearestFilter;
            m.map.minFilter = THREE.NearestMipmapLinearFilter;
            m.map.needsUpdate = true;
          }
        });
      });
      pivote.add(modelo);
      mensaje("");
    },
    undefined,
    () => mensaje("No se pudo cargar el modelo 3D (revisa la ruta de LowPoly.glb y que la página corra en un servidor).")
  );

  /* ---------- Tamaño y horizonte ---------- */
  function actualizarHorizonte() {
    // Dónde queda el horizonte en la pantalla (para que el degradado del cielo coincida con la cuadrícula)
    const sube = Math.atan((VISTA.objetivoY - VISTA.alturaCamara) / control.est.dist);
    const h = (1 + Math.tan(sube) / Math.tan((VISTA.fov * Math.PI) / 360)) / 2;
    contenedor.style.setProperty("--horizonte", `${(h * 100).toFixed(2)}%`);
  }
  // Cielo pixelado: lienzo del mismo tamaño que el render, usado como fondo de la escena
  let cielo = null;      // { lienzo, ctx, textura, w, h }
  let cieloH = -1;
  function pintarFondo(forzar) {
    if (!PIXELADO.activo || !cielo) return;
    const horizonte = parseFloat(contenedor.style.getPropertyValue("--horizonte")) / 100 || 0.62;
    if (!forzar && Math.abs(horizonte - cieloH) < 0.003) return;
    cieloH = horizonte;
    const img = cielo.ctx.createImageData(cielo.w, cielo.h);
    pintarCielo(img.data, cielo.w, cielo.h, horizonte);
    cielo.ctx.putImageData(img, 0, 0);
    cielo.textura.needsUpdate = true;
  }
  function crearCielo(w, h) {
    if (cielo) cielo.textura.dispose();
    const lienzo = document.createElement("canvas");
    lienzo.width = w;
    lienzo.height = h;
    const textura = new THREE.CanvasTexture(lienzo);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.magFilter = THREE.NearestFilter;
    textura.minFilter = THREE.NearestFilter;
    textura.generateMipmaps = false;
    cielo = { lienzo, ctx: lienzo.getContext("2d"), textura, w, h };
    escena.background = textura;
    pintarFondo(true);
  }
  function ajustar() {
    const w = contenedor.clientWidth;
    const h = contenedor.clientHeight;
    if (!w || !h) return;
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    actualizarHorizonte();
    if (PIXELADO.activo) {
      const rw = PIXELADO.columnas;
      const rh = Math.max(16, Math.round((PIXELADO.columnas * h) / w));
      renderer.setPixelRatio(1);
      renderer.setSize(rw, rh, false);                 // se dibuja pequeño y el CSS lo amplía
      uniformsEstrellas.uPR.value = 0.8;
      cuadricula.material.uniforms.uGrosor.value = CUADRICULA.grosorPixel;
      if (!cielo || cielo.w !== rw || cielo.h !== rh) crearCielo(rw, rh);
      else pintarFondo(true);
    } else {
      const pr = Math.min(window.devicePixelRatio || 1, 1.75);
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      uniformsEstrellas.uPR.value = pr;
      cuadricula.material.uniforms.uGrosor.value = CUADRICULA.grosor * pr;
    }
  }
  if ("ResizeObserver" in window) new ResizeObserver(ajustar).observe(contenedor);
  else window.addEventListener("resize", ajustar);
  ajustar();

  /* ---------- Botones del teléfono ---------- */
  if (escenario) {
    escenario.addEventListener("visor3d:control", (e) => {
      const d = e.detail || {};
      control.accion(d.accion, d.fase, performance.now());
    });
  }

  /* ---------- Bucle de dibujo (se pausa cuando el visor no está en pantalla) ---------- */
  let raf = 0;
  let ultimo = performance.now();
  let visible = true;
  let horizonteAnterior = -1;

  function dibujar(t) {
    raf = requestAnimationFrame(dibujar);
    const dt = Math.min((t - ultimo) / 1000, 0.05);
    ultimo = t;
    control.actualizar(dt, t);

    pivote.rotation.y = control.est.rot;
    camara.position.set(0, VISTA.alturaCamara, control.est.dist);
    camara.lookAt(0, VISTA.objetivoY, 0);
    if (Math.abs(control.est.dist - horizonteAnterior) > 0.002) {
      horizonteAnterior = control.est.dist;
      actualizarHorizonte();
      pintarFondo(false);
    }
    uniformsEstrellas.uTiempo.value = sinMovimiento ? 0 : t / 1000;
    renderer.render(escena, camara);
  }
  function arrancar() {
    if (raf || !visible) return;
    ultimo = performance.now();
    raf = requestAnimationFrame(dibujar);
  }
  function detener() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entradas) => {
      visible = entradas[0].isIntersecting;
      if (visible) arrancar(); else detener();
    }, { threshold: 0.01 }).observe(contenedor);
  }
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    detener();
    mensaje("Se perdió el contexto gráfico. Recarga la página.");
  });
  arrancar();
}