/* ==================================================================
   Spain Silicon Valley Summit — scroll-driven 3D stage
   ------------------------------------------------------------------
   One WebGL scene sits fixed behind the whole top of the site and is
   driven entirely by scroll position through #zone:

     0.00  hero      · dusk sky, bridge in 3/4 view on the LEFT
     0.22  partners  · golden hour, camera swings in and drops to the deck
     0.42  why       · morning, THROUGH the near tower onto the roadway
     0.54  summit    · mid-span, past the overhead gantries
     0.66  speakers  · bright day, billboards along the rail
     0.78  team      · approaching the far tower
     0.88  ——        · THROUGH the far tower
     1.00  arrival   · out over the bay, facing the finale portal

   The whole page lives inside #zone, so the entire scroll is one flight.

   The sky, fog, sun direction, light colour and FOV are all keyframed
   on the same progress value, so the background is never a flat block
   of colour — it is a place you travel through.

   Degrades gracefully: no WebGL or prefers-reduced-motion → the CSS
   gradient sky in .stage__sky stays as the background instead.
   ================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { DRACOLoader } from './vendor/DRACOLoader.js';

/* ------------------------------------------------------------------
   TUNABLES — the model is a real-world survey mesh, so everything is
   derived from its measured bounding box at load time rather than
   hard-coded. These fractions are the only hand-set numbers.
   ------------------------------------------------------------------ */
const CFG = {
  span:       220,    // world units the bridge's longest axis is scaled to
  /* The three numbers below were measured off the loaded mesh by raycasting
     it (roadway surface, side girders, tower positions) rather than guessed —
     the model's bounding box is much taller and wider than the structure. */
  deckFrac:   0.3693, // puts the roadway surface exactly at y = 0
  halfWidth:  2.86,   // flag poles stand on the walkway, inside the truss line
  waterDrop:  7.0,    // water sits this far below the roadway
  boatDraft:  0.26,   // how far the hull sits below the waterline, as a
                      // fraction of the model's full height. The model's
                      // height includes the mast, so this has to be well
                      // above the visual waterline or the rudder and prop
                      // hang out in the open.
  flagEvery:  14,     // spacing of the flag poles along the deck
  flagCount:  13,     // flags per side
  flagFrom:   88,     // z of the first flag (near end, closest to the hero camera)
  debug:      false,  // log model measurements and clip stats
};

const canvas = document.getElementById('stageCanvas');
const zone   = document.getElementById('zone');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- small helpers ---------- */
/* Drops every triangle whose world-space centroid sits below a given height.
   Used on the boat: one of its meshes (the cabin) also carries geometry that
   hangs under the hull, so it cannot simply be hidden wholesale. */
function clipBelow(root, yCut) {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let removed = 0;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const geo = o.geometry, pos = geo.attributes.position, mw = o.matrixWorld;
    const below = () => ((a.y + b.y + c.y) / 3) < yCut;
    if (geo.index) {
      const idx = geo.index.array, keep = [];
      let cut = 0;
      for (let i = 0; i < idx.length; i += 3) {
        a.fromBufferAttribute(pos, idx[i]).applyMatrix4(mw);
        b.fromBufferAttribute(pos, idx[i + 1]).applyMatrix4(mw);
        c.fromBufferAttribute(pos, idx[i + 2]).applyMatrix4(mw);
        if (below()) { cut++; continue; }
        keep.push(idx[i], idx[i + 1], idx[i + 2]);
      }
      if (cut) { geo.setIndex(keep); removed += cut; }
    } else {
      for (let i = 0; i + 2 < pos.count; i += 3) {
        a.fromBufferAttribute(pos, i).applyMatrix4(mw);
        b.fromBufferAttribute(pos, i + 1).applyMatrix4(mw);
        c.fromBufferAttribute(pos, i + 2).applyMatrix4(mw);
        if (below()) { removed++; for (let k = 0; k < 3; k++) pos.setXYZ(i + k, 0, -9999, 0); }
      }
      if (removed) pos.needsUpdate = true;
    }
  });
  return removed;
}

/* Drops triangles whose world-space centroid sits inside the traffic envelope,
   but ONLY within the given z bands. A full-length box looked reasonable and
   removed 56% of the model — the deck carries most of its geometry just above
   the road line — so this is aimed squarely at the tower cross-braces, which
   are the only thing that actually spans the carriageway at driving height. */
function clearCarriageway(root, xInner, xOuter, yLo, yHi, zBands) {
  const inBand = (z) => { for (let i = 0; i < zBands.length; i++) if (z > zBands[i][0] && z < zBands[i][1]) return true; return false; };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3();
  let removed = 0, total = 0;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const geo = o.geometry, pos = geo.attributes.position, mw = o.matrixWorld;
    const blocks = () => {
      m.copy(a).add(b).add(c).multiplyScalar(1 / 3);
      const ax = Math.abs(m.x);
      return inBand(m.z) && ax >= xInner && ax < xOuter && m.y > yLo && m.y < yHi;
    };
    if (geo.index) {
      const idx = geo.index.array, keep = [];
      total += idx.length / 3;
      for (let i = 0; i < idx.length; i += 3) {
        a.fromBufferAttribute(pos, idx[i]).applyMatrix4(mw);
        b.fromBufferAttribute(pos, idx[i + 1]).applyMatrix4(mw);
        c.fromBufferAttribute(pos, idx[i + 2]).applyMatrix4(mw);
        if (blocks()) { removed++; continue; }
        keep.push(idx[i], idx[i + 1], idx[i + 2]);
      }
      if (removed) geo.setIndex(keep);
    } else {
      total += pos.count / 3;
      for (let i = 0; i + 2 < pos.count; i += 3) {
        a.fromBufferAttribute(pos, i).applyMatrix4(mw);
        b.fromBufferAttribute(pos, i + 1).applyMatrix4(mw);
        c.fromBufferAttribute(pos, i + 2).applyMatrix4(mw);
        if (blocks()) { removed++; for (let k = 0; k < 3; k++) pos.setXYZ(i + k, 0, -9999, 0); }
      }
      if (removed) pos.needsUpdate = true;
    }
  });
  if (CFG.debug) console.log('[scene] carriageway clip:', removed, 'of', total, '(' + (100 * removed / total).toFixed(1) + '%)');
  return removed;
}
const clamp  = (v, a, b) => Math.min(Math.max(v, a), b);
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

function init() {
  const draco = new DRACOLoader().setDecoderPath('./vendor/draco/').setDecoderConfig({ type: 'wasm' });
  const gltfLoader = new GLTFLoader().setDRACOLoader(draco);

  /* iOS gives a tab a few hundred megabytes and kills it without warning past
     that, so the phone build is measured rather than inherited. Multisampling
     is the single largest line item: a multisampled drawing buffer is roughly
     four times the memory of a plain one, ~23 MB against ~6 MB at this size,
     and it buys least on the display where the pixels are smallest. */
  const SMALL = window.innerWidth < 820;
  const ctxAttrs = { alpha: false, antialias: !SMALL, powerPreference: 'high-performance' };
  const gl = canvas.getContext('webgl2', ctxAttrs) || canvas.getContext('webgl', ctxAttrs);
  if (!gl) return;

  /* Claim the page as soon as we know WebGL is actually available — NOT after
     the first rendered frame. There is ~5 MB of models to fetch first, and
     until this class lands every DOM section the stage replaces is still
     painted, so the flat fallback version of the page flashed up on every
     load. If the bridge never arrives, the timer below hands the page back. */
  document.documentElement.classList.add('stage-on');
  const flatFallback = setTimeout(() => {
    if (!deckReady) {
      document.documentElement.classList.remove('stage-on');
      console.warn('[scene] bridge did not load in time — restoring the flat page');
    }
  }, 20000);

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: !SMALL });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, SMALL ? 1.25 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene  = new THREE.Scene();
  /* near is 0.25, not the usual 0.5: the camera flies through gaps in the
     lettering, and a band has to be taller than the near plane's own height
     (2*tan(fov/2)*near) or the letters get sliced open across the frame as
     it passes. Halving near halves the smallest gap the type can get away
     with. 0.25/900 still leaves ample depth precision for the far hills. */
  const camera = new THREE.PerspectiveCamera(42, 1, 0.25, 900);
  scene.fog = new THREE.FogExp2(0x4a3a52, 0.0038);

  /* ================= SKY ==========================================
     A dome centred on the camera. Three bands (zenith / horizon /
     ground) plus a sun disc and a wide bloom, all lerped by progress. */
  const SKY_UNIFORMS = {
    uZenith:  { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },   // warm, toward the sun
    uHorizCool: { value: new THREE.Color() }, // cool, away from it
    uGround:  { value: new THREE.Color() },
    uSunCol:  { value: new THREE.Color() },
    uSunDir:  { value: new THREE.Vector3() },
    uSunPow:  { value: 300 },
    uTime:    { value: 0 },
    uCloud:   { value: new THREE.Color() },   // lit face of the cloud deck
    uCloudSh: { value: new THREE.Color() },   // its shaded underside
    uCloudAmt:{ value: 0.7 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 40, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: SKY_UNIFORMS,
      vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uZenith, uHorizon, uHorizCool, uGround, uSunCol, uSunDir, uCloud, uCloudSh;
        uniform float uSunPow, uTime, uCloudAmt;
        varying vec3 vPos;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        float vnoise(vec2 p){
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                     mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }
        float fbm(vec2 p){
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 17.3; a *= 0.5; }
          return v;
        }
        void main(){
          vec3 d = normalize(vPos);
          float h = d.y;
          // A sunset is warm only where the sun is. Blend the horizon band
          // around the compass instead of ringing the whole dome in orange.
          float az = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0);
          vec3 hor = mix(uHorizCool, uHorizon, pow(az, 3.2));
          vec3 col = h > 0.0
            ? mix(hor, uZenith, pow(clamp(h * 2.9, 0.0, 1.0), 0.7))
            : mix(hor, uGround, pow(clamp(-h * 2.4, 0.0, 1.0), 0.5));
          /* Cloud deck. The dome direction is projected onto a flat plane so
             the noise reads as a ceiling overhead and compresses toward the
             horizon, the way real cloud cover does. */
          if (d.y > 0.005) {
            vec2 cp = d.xz / d.y * 0.30 + vec2(uTime * 0.0045, uTime * 0.0022);
            float n  = fbm(cp);
            float n2 = fbm(cp * 2.7 + 5.0);
            float cover = smoothstep(0.46, 0.78, n * 0.75 + n2 * 0.25);
            cover *= smoothstep(0.015, 0.20, d.y);          // thin out at the horizon
            cover *= smoothstep(0.98, 0.55, d.y);           // and directly overhead
            float lit = smoothstep(0.40, 0.80, n2);          // sun-facing edges
            vec3 cc = mix(uCloudSh, uCloud, lit);
            cc = mix(cc, uSunCol, pow(max(dot(d, normalize(uSunDir)), 0.0), 3.0) * 0.55);
            col = mix(col, cc, cover * uCloudAmt);
          }

          float sd = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSunCol * pow(sd, uSunPow) * 1.1;   // disc
          col += uSunCol * pow(sd, 26.0) * 0.26;     // tight halo
          col += uSunCol * pow(sd, 7.0) * 0.05;      // faint bloom
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
  sky.renderOrder = -2; scene.add(sky);

  /* ================= WATER ========================================
     A single plane with rolling highlights and a sun glitter path, so
     the bay reads as water without a reflection pass. */
  const WATER_UNIFORMS = {
    uTime:    { value: 0 },
    uDeep:    { value: new THREE.Color() },   // water close to camera
    uShallow: { value: new THREE.Color() },   // mid distance, lighter
    uHorizon: { value: new THREE.Color() },
    uSunCol:  { value: new THREE.Color() },
    uSunX:    { value: 0 },
  };
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(7000, 7000, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: WATER_UNIFORMS, fog: false, transparent: true, depthWrite: false,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime, uSunX; uniform vec3 uDeep, uShallow, uHorizon, uSunCol;
        varying vec3 vP;
        void main(){
          float dist = length(vP.xy);
          float near = smoothstep(10.0, 190.0, dist);
          float far  = smoothstep(150.0, 700.0, dist);
          vec3 base = mix(mix(uDeep, uShallow, near), uHorizon, far);
          /* Stylised, to sit with the low-poly bridge and headlands. A
             photographic chop map was tried and read as too literal against
             them — this is the flat-shaded version: crests lightened by a
             rolling swell, and sun glitter built from sines at incommensurate
             frequencies so it scatters instead of forming a lattice. */
          vec3 col = base;
          float w = sin(vP.x * 0.09 + uTime * 0.5) * 0.5 + sin(vP.y * 0.13 - uTime * 0.8) * 0.5
                  + sin((vP.x + vP.y) * 0.05 + uTime * 0.31);
          col += vec3(0.05, 0.06, 0.07) * max(w, 0.0) * (1.0 - far);

          float lane = exp(-pow((vP.x - uSunX) / 60.0, 2.0));
          float g = sin(vP.y * 1.31 + uTime * 1.2) * sin(vP.x * 2.17 - uTime * 0.9)
                  * sin((vP.x * 0.63 + vP.y * 0.41) + uTime * 0.5)
                  * sin((vP.y * 0.29 - vP.x * 0.19) - uTime * 0.37);
          col += uSunCol * pow(max(g, 0.0), 7.0) * lane * 0.45 * (1.0 - far * 0.7);
          // dissolve into the sky well inside the plane's own edge
          float a = 1.0 - smoothstep(760.0, 2100.0, dist);
          gl_FragColor = vec4(col, a);
        }`,
    })
  );
  water.rotation.x = -Math.PI / 2; water.renderOrder = -1; scene.add(water);

  /* ================= HEADLANDS ====================================
     Two rings of low-poly ridge line standing off at distance. Each is a
     cylinder whose top edge is pushed up by a sum of sines, so it reads as a
     continuous skyline from any bearing. Unlit and un-fogged: their haze is
     driven straight off the sky palette instead, which is what keeps distant
     hills sitting behind the air rather than in front of it. */
  const RIDGE_UNIFORMS = [];
  function headland(radius, maxH, seed, segs, haze) {
    const geo = new THREE.CylinderGeometry(radius, radius, 1, segs, 1, true);
    const p = geo.attributes.position;
    /* Six octaves at incommensurate frequencies, then a power curve to sharpen
       the peaks — four smooth octaves just gave rolling sine hills. */
    const prof = (a) => {
      const v = 0.44 + 0.26 * Math.sin(a * 1.7 + seed)
                     + 0.20 * Math.sin(a * 3.3 + seed * 1.9)
                     + 0.16 * Math.sin(a * 6.1 + seed * 2.7)
                     + 0.11 * Math.sin(a * 11.3 + seed * 3.9)
                     + 0.07 * Math.sin(a * 21.7 + seed * 5.3)
                     + 0.04 * Math.sin(a * 41.1 + seed * 7.1);
      return Math.pow(Math.max(v, 0.04), 1.7);
    };
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, p.getY(i) > 0 ? prof(Math.atan2(z, x)) * maxH : -90);
    }
    geo.computeVertexNormals();
    const u = {
      uPeak: { value: new THREE.Color() },
      uBase: { value: new THREE.Color() },
      uMaxH: { value: maxH },
      haze,
    };
    RIDGE_UNIFORMS.push(u);
    const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: u, side: THREE.BackSide, fog: false, depthWrite: true,
      vertexShader: `uniform float uMaxH; varying float vH;
        void main(){ vH = clamp(position.y / uMaxH, 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uPeak, uBase; varying float vH;
        void main(){ gl_FragColor = vec4(mix(uBase, uPeak, smoothstep(0.0, 0.75, vH)), 1.0); }`,
    }));
    mesh.position.y = -CFG.waterDrop;
    mesh.renderOrder = -1.5;   // after the sky dome, before the water
    return mesh;
  }
  const ridgeNear = headland(490, 58, 1.7, 340, 0.50);
  const ridgeFar  = headland(700, 92, 4.3, 340, 0.76);
  scene.add(ridgeFar, ridgeNear);

  /* ================= BOATS ========================================
     A real low-poly fishing vessel (models/fishing-boat.glb — a CC FBX run
     through Blender to Draco-compressed GLB, 83 KB) cloned across the bay.
     The prototype is normalised to one unit long and sunk to its waterline,
     so each instance just picks a length. Each tows a soft wake quad. */
  const finale = { group: null, mats: [] };     // the closing title, filled in below
  const boats = [];
  /* A flat white quad read as a card floating under the boat. This is a
     painted falloff instead: brightest just astern, fading to nothing along
     its length and out to both edges. */
  const wakeCv = document.createElement('canvas'); wakeCv.width = 64; wakeCv.height = 256;
  {
    const c = wakeCv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(0.18, 'rgba(255,255,255,.45)');
    g.addColorStop(0.6, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 256);
    const e = c.createLinearGradient(0, 0, 64, 0);
    e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(0.5, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = e; c.fillRect(0, 0, 64, 256);
  }
  const wakeTex = new THREE.CanvasTexture(wakeCv);
  const wakeMat = new THREE.MeshBasicMaterial({ map: wakeTex, transparent: true, opacity: 0.55, depthWrite: false });
  const wakeGeo = new THREE.PlaneGeometry(1, 1);

  const FLEET = [
    { len: 7.5,  x: -118, z:   40, dir:  1, sp: 0.9 },
    { len: 5.4,  x:  -76, z:  -70, dir:  1, sp: 1.2 },
    { len: 6.2,  x:  104, z:  -20, dir: -1, sp: 1.0 },
    { len: 13,   x: -168, z:  -14, dir:  1, sp: 1.9 },
    { len: 10,   x:  152, z:   72, dir: -1, sp: 1.5 },
    { len: 4.8,  x:   64, z:  122, dir: -1, sp: 1.1 },
    { len: 11,   x: -102, z:  150, dir:  1, sp: 1.7 },
    { len: 6.6,  x:   88, z: -128, dir:  1, sp: 1.3 },
    /* Placed by solving the opening frame: camera (34,13,94) looking at
       (2.5,4,42) at fov 42 puts this ~55% right and ~55% down. At its old
       (96,44) it sat 80 degrees off the view axis — well off screen. Slow,
       so it is still there a few seconds in. */
    { len: 8.5,  x:   28, z:   36, dir: -1, sp: 0.45 },
  ];

  gltfLoader.load('models/fishing-boat.glb', (gltf) => {
    const proto = gltf.scene;
    proto.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material) o.material.side = THREE.DoubleSide; } });

    /* Normalise to one unit stem to stern, centred, floating at y = 0.
       Box3.setFromObject reads matrixWorld, so the matrix has to be refreshed
       after every transform or the next measurement uses the old one. */
    proto.updateMatrixWorld(true);
    let b = new THREE.Box3().setFromObject(proto);
    let sz = b.getSize(new THREE.Vector3());
    proto.scale.setScalar(1 / Math.max(sz.x, sz.z));
    proto.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(proto);
    sz = b.getSize(new THREE.Vector3());
    const c = b.getCenter(new THREE.Vector3());
    proto.position.x -= c.x; proto.position.z -= c.z;
    proto.position.y -= b.min.y + sz.y * CFG.boatDraft;   // sit the hull down to its waterline
    proto.updateMatrixWorld(true);
    /* The model carries parts that hang well below the hull — rudder,
       propeller, and a few fittings the pack left at a stray Y. Anything
       entirely under the waterline is invisible on a real boat anyway, and
       these were reading as white cards floating beneath it. */
    {
      const pb = new THREE.Box3();
      let sunk = 0;
      proto.traverse((o) => {
        if (!o.isMesh) return;
        pb.setFromObject(o);
        if (pb.max.y < 0.03) { o.visible = false; sunk++; }
      });
      /* Whole-mesh culling is not enough: FB_M1_Cabin spans y -0.32 to 0.50,
         so it carries the cabin AND a plate hanging under the hull. Cut the
         submerged geometry off instead. */
      const shaved = clipBelow(proto, -0.055);
      if (CFG.debug) console.log('[scene] boat: hid', sunk, 'parts, shaved', shaved, 'underwater triangles');
    }
    const alongZ = sz.z >= sz.x;                     // which way the keel runs
    if (CFG.debug) console.log('[scene] boat raw size', sz.toArray().map((n) => +n.toFixed(2)).join(' x '));

    for (const f of FLEET) {
      const g = new THREE.Group();
      const hull = proto.clone(true);
      hull.scale.multiplyScalar(f.len);
      hull.position.multiplyScalar(f.len);
      if (!alongZ) hull.rotation.y = Math.PI / 2;    // point the bow down the keel axis
      g.add(hull);

      const wake = new THREE.Mesh(wakeGeo, wakeMat);
      wake.rotation.x = -Math.PI / 2;
      wake.scale.set(f.len * 0.7, f.len * 7, 1);
      wake.position.set(0, 0.04, f.len * 4.0);   // starts astern, trails away
      g.add(wake);

      g.position.set(f.x, -CFG.waterDrop, f.z);
      g.rotation.y = f.dir > 0 ? 0 : Math.PI;
      scene.add(g);
      boats.push({ m: g, ...f });
    }
  }, undefined, (err) => console.warn('[scene] boat model failed to load', err));

  /* ================= LIGHTS ======================================= */
  const amb  = new THREE.AmbientLight(0xffffff, 1.0); scene.add(amb);
  const key  = new THREE.DirectionalLight(0xffffff, 2.6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xFFCBA0, 1.9); fill.position.set(60, 26, 120); scene.add(fill);
  const bounce = new THREE.HemisphereLight(0xBFD8F5, 0x2A3350, 0.9); scene.add(bounce);

  /* ================= BRIDGE =======================================
     Loaded, recentred, aligned so the span runs along world Z (the
     direction the camera flies) and dropped so the roadway sits at
     y = 0. Everything else in the scene is placed off those numbers. */
  const bridge = new THREE.Group(); scene.add(bridge);
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xD2452F, roughness: 0.66, metalness: 0.04 });

  let deckReady = false;
  gltfLoader.load('models/golden-gate.glb', (gltf) => {
    const model = gltf.scene;
    model.traverse((o) => { if (o.isMesh) { o.material = bridgeMat; o.frustumCulled = false; } });

    let box  = new THREE.Box3().setFromObject(model);
    let size = box.getSize(new THREE.Vector3());
    if (CFG.debug) console.log('[scene] raw model size', size);

    // 1. scale so the longest horizontal axis becomes CFG.span
    const longest = Math.max(size.x, size.z);
    model.scale.setScalar(CFG.span / longest);

    // 2. re-measure, then centre on X/Z and put the roadway at y = 0
    box = new THREE.Box3().setFromObject(model);
    size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    model.position.x -= c.x;
    model.position.z -= c.z;
    model.position.y -= box.min.y + size.y * CFG.deckFrac;

    // 3. if the span runs along X, turn it to run along Z instead
    if (size.x > size.z) bridge.rotation.y = Math.PI / 2;

    bridge.add(model);
    bridge.updateMatrixWorld(true);
    /* Clear the traffic envelope.
       The GLB carries median barriers, kerb rails and — inside the tower mesh
       itself — cross-braces that sit right across the roadway at deck height.
       Hiding whole meshes cannot reach the braces (the tower is one mesh that
       also runs 20 units up), so this clips at triangle level: any triangle
       whose centroid falls inside the box the traffic drives through is
       dropped from the index. Everything outside it, towers included, is
       untouched. Runs once, on load. */
    /* Whole meshes that sit on the deck and inside the lanes — the model's
       median barrier — come out wholesale; that pass was already correct. */
    const wb = new THREE.Box3(), wc = new THREE.Vector3();
    let hidden = 0;
    model.traverse((o) => {
      if (!o.isMesh) return;
      wb.setFromObject(o); wb.getCenter(wc);
      if (Math.abs(wc.x) < 2.6 && wb.min.x > -2.9 && wb.max.x < 2.9 && wb.min.y > -0.35 && wb.max.y < 3.2) {
        o.visible = false; hidden++;
      }
    });
    /* Nothing is clipped from the towers. Measured outward from the centreline
       at the tower, the first surface is at x = 1.35 at EVERY height from the
       deck up to y = 13 — that is the leg itself, so the clear gap between the
       legs is only 2.7 units. Cutting a 4.9-wide carriageway through that meant
       deleting the legs' lower halves, which left them hanging in mid-air. The
       carriageway is sized to the gap instead.
       The one thing still cut is the tower's lower cross-brace, which spans
       the road at driving height. Because the legs begin at x = 1.35, a clip
       bounded at 1.28 stays strictly inside the gap and cannot touch them —
       every earlier attempt used a wider bound and amputated the legs.
       The deck edge is left alone: its whole structure lives in
       x = 2.65 .. 3.25 with surfaces at y = 0, 0.20 and 0.75, so the inner
       barrier and the outer railing are interleaved rather than separated, and
       removing just the inner one always took the parapet with it. */
    /* Measured: the leg's inner face is at x = 1.34 (left) / 1.35 (right) at
       the near tower. Clipping to 1.32 left only 0.02 of clearance, and the far
       tower is not perfectly mirrored — which is what ate a hole in its left
       leg. 1.15 keeps a fifth of a unit of margin; the sliver of brace that
       survives sits hard against the leg and reads as part of it. */
    /* Ceiling raised from 2.6 with the flight: the band cleared through the
     tower legs has to stay above the camera, and eye height moved up. Still
     only |x| < 1.15, which is inside the 2.7-unit clear gap between the
     legs — the portal a road passes through anyway. */
  const stripped = clearCarriageway(model, 0, 1.15, -1.2, 3.7, [[-64, -46], [46, 64]]);
    if (CFG.debug) console.log('[scene] hid', hidden, 'median meshes');
    if (CFG.debug) console.log('[scene] clipped', stripped, 'triangles out of the carriageway');
    if (CFG.debug) console.log('[scene] scaled size', size, 'deck at y=0, span along Z');

    // water sits at the foot of the towers
    water.position.y = -CFG.waterDrop;
    clearTimeout(flatFallback);
    deckReady = true;
    if (CFG.debug) {
      bridge.updateMatrixWorld(true);
      window.__stage = { size: size.toArray(), min: box.min.toArray(), max: box.max.toArray(), rotY: bridge.rotation.y };
    }
  }, undefined, (err) => console.warn('[scene] bridge failed to load', err));

  /* ================= GROUNDING ====================================
     The span read as floating: the towers met the water with no pier and the
     structure cast nothing onto the bay, so nothing tied the two together.
     Three cheap cues fix it — a pier cap at each tower, a foam collar where
     it breaks the surface, and a soft shadow running the length of the deck. */
  {
    const TOWER_Z = [55, -55];
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xA9A296, roughness: 0.95, metalness: 0.0 });

    // soft dark falloff, reused for the deck shadow and the pier shading
    const shCv = document.createElement('canvas'); shCv.width = 64; shCv.height = 64;
    {
      const c = shCv.getContext('2d');
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.55, 'rgba(0,0,0,.28)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    }
    const shTex = new THREE.CanvasTexture(shCv);
    const shMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, opacity: 0.85, depthWrite: false });

    // white foam collar where a pier breaks the surface
    const foamCv = document.createElement('canvas'); foamCv.width = 64; foamCv.height = 64;
    {
      const c = foamCv.getContext('2d');
      const g = c.createRadialGradient(32, 32, 12, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,.75)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    }
    const foamMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(foamCv), transparent: true, opacity: 0.7, depthWrite: false });

    const WL = -CFG.waterDrop;
    for (const tz of TOWER_Z) {
      // pier cap: a squat base standing proud of the water under the tower
      /* Sized to the tower it carries — the legs are only ±3 apart, so a wide
         apron reads as a concrete island rather than a pier. */
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5.2, 6.5, 18), concreteMat);
      pier.position.set(0, WL - 2.6, tz);
      scene.add(pier);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 0.4, 18), concreteMat);
      collar.position.set(0, WL + 0.5, tz);
      scene.add(collar);
      // foam ring at the waterline
      const foam = new THREE.Mesh(new THREE.PlaneGeometry(17, 17), foamMat);
      foam.rotation.x = -Math.PI / 2; foam.position.set(0, WL + 0.07, tz);
      scene.add(foam);
      // and its shadow on the bay
      const ps = new THREE.Mesh(new THREE.PlaneGeometry(21, 21), shMat);
      ps.rotation.x = -Math.PI / 2; ps.position.set(0, WL + 0.05, tz);
      scene.add(ps);
    }

    // the deck's own shadow, a long soft strip on the water beneath the span
    const deckShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shMat);
    deckShadow.rotation.x = -Math.PI / 2;
    deckShadow.scale.set(15, 205, 1);
    deckShadow.position.set(0, WL + 0.04, 0);
    scene.add(deckShadow);
  }

  /* ================= FLAGS ========================================
     Mounted on the deck railings, Spain down the left side and the
     United States down the right, repeating every CFG.flagEvery units
     so they belong to the bridge instead of floating in open sky. The
     camera flies between the two rows during the through-phase. */
  const texLoader = new THREE.TextureLoader();
  const flagTex = (url) => { const t = texLoader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const TEX_ES = flagTex('images/flag-spain.webp');
  const TEX_US = flagTex('images/flag-us.webp');

  const flagVert = `
    uniform float uTime, uPhase, uWind; varying vec2 vUv; varying float vShade;
    void main(){
      vUv = uv; vec3 p = position;
      float pole = uv.x;                        // 0 at the pole, 1 at the fly end
      float amp  = (0.16 + uWind * 0.10) * pole;
      float wave = sin(p.x * 5.0 + uTime * 3.0 + uPhase) * amp
                 + sin(p.y * 6.5 + uTime * 2.1 + uPhase) * amp * 0.4;
      p.z += wave;
      p.x -= pole * pole * 0.05;                // slight pull toward the pole
      float slope = cos(p.x * 5.0 + uTime * 3.0 + uPhase) * amp * 4.0;
      /* The cloth is unlit, so this shading term is the whole of its
         brightness. Centred at 0.68 it read markedly darker than everything
         around it in full daylight; centre it at 1.0 and let the wave swing
         either side of that. */
      vShade = clamp(1.02 + slope * 0.34, 0.72, 1.32);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`;
  const flagFrag = `
    uniform sampler2D uTex; varying vec2 vUv; varying float vShade;
    void main(){ gl_FragColor = vec4(texture2D(uTex, vUv).rgb * vShade, 1.0); }`;

  const flagMats = [];
  const FLAG_W = 1.75, FLAG_H = 1.12, POLE_H = 4.0;
  const flagGeo = new THREE.PlaneGeometry(FLAG_W, FLAG_H, 18, 10); flagGeo.translate(FLAG_W / 2, 0, 0);
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, POLE_H, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x9aa0ad, roughness: 0.42, metalness: 0.75 });

  const flags = new THREE.Group(); scene.add(flags);
  for (let i = 0; i < CFG.flagCount; i++) {
    const z = CFG.flagFrom - i * CFG.flagEvery;
    for (const side of [-1, 1]) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPhase: { value: (i * 1.7 + side) % 6.28 }, uWind: { value: 0.5 }, uTex: { value: side < 0 ? TEX_ES : TEX_US } },
        vertexShader: flagVert, fragmentShader: flagFrag, side: THREE.DoubleSide,
      });
      flagMats.push(mat);
      const wrap = new THREE.Group();
      const cloth = new THREE.Mesh(flagGeo, mat); cloth.position.y = POLE_H * 0.38;
      const staff = new THREE.Mesh(poleGeo, poleMat);
      wrap.add(cloth, staff);
      wrap.position.set(side * CFG.halfWidth, POLE_H / 2, z);
      // angled outward and slightly back down the span, so they read broadside
      // from the hero view and still catch the light on the way through
      wrap.rotation.y = side > 0 ? -0.55 : Math.PI + 0.55;
      flags.add(wrap);
    }
  }

  /* ================= ROADWAY ======================================
     The GLB is an open truss with no driving surface, so the deck is laid
     in as a tiling strip. images/road.webp is baked from a real asphalt
     scan with the lane markings drawn on at the right world scale, so one
     tile covers 6 x 24 world units. */
  const DECK_W = 2.5, DECK_FROM = 93, DECK_TO = -90;   // fits the 2.7-unit clear gap between the tower legs
  /* Sized to the structure, not to the frame. The suspender ropes either side
     of the carriageway sit at roughly x = +-2.1 at eye height; at 5.4 the
     widest line ran straight through them. */
  const SIGN_W = 4.2;
  /* Eye height for the whole crossing — the camera path, the slots threaded
     through the roadside type, and the middle row of the speaker wall all
     answer to this one number. */
  const DECK_EYE = 3.05;
  const TUNNEL_Z = -122;                                // where the road makes landfall
  const ROAD_TO = TUNNEL_Z + 2;                         // asphalt runs right into the portal
  const DECK_LEN = DECK_FROM - ROAD_TO, DECK_MID = (DECK_FROM + ROAD_TO) / 2;
  const roadTex = texLoader.load('images/road.webp');
  roadTex.colorSpace = THREE.SRGBColorSpace;
  roadTex.wrapS = THREE.ClampToEdgeWrapping; roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(1, DECK_LEN / 24);
  roadTex.anisotropy = 8;

  /* A slab, not a plane: it has thickness so the carriageway reads as part of
     the structure, flanked by kerbs and walkways that close the gap out to the
     railings. Its width is set so the asphalt stops just inside the model's own
     edge barrier — run it wider and the barrier appears to float on the road. */
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9A958C, roughness: 0.92, metalness: 0.0 });
  const roadMat  = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95, metalness: 0.0 });
  /* Only the top face is concrete. Seen from off the bridge the sides and
     underside have to be the structure's own red, or the deck reads as a grey
     slab laid across the truss. */
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(DECK_W, 0.3, DECK_LEN),
    [bridgeMat, bridgeMat, roadMat, bridgeMat, bridgeMat, bridgeMat]   // +x -x +y -y +z -z
  );
  slab.position.set(0, -0.1, DECK_MID);           // top face lands just above the truss
  scene.add(slab);

  const walkSides = [bridgeMat, bridgeMat, concrete, bridgeMat, bridgeMat, bridgeMat];
  for (const sx of [-1, 1]) {
    /* Walkway stops at the truss line (x ~ 3.0). It used to run out to 3.7 and
       stick out past the structure, which is what showed as grey from outside. */
    /* The walkway is deliberately raised to y = 0.60. The model's edge carries
       a row of gusset plates standing between the footway and the railing, and
       they cannot be cut away: measured, the left edge structure spans
       x = -2.44..-2.98 and the right 2.62..3.16, so it is not symmetric about
       the centreline and a mirrored band removes different parts on each side —
       and within either side the gussets share their exact x-range and surface
       heights (0.75 / 0.20 / 0) with the railing itself. Raising the footway to
       just under the rail's top chord buries their lower halves instead, so the
       edge reads as a solid parapet rather than a row of floating stubs. */
    const walk = new THREE.Mesh(new THREE.BoxGeometry(1.76, 1.2, DECK_LEN), walkSides);
    walk.position.set(sx * (DECK_W / 2 + 0.88), 0.0, DECK_MID);
    scene.add(walk);
    // kerb face, slightly proud so the edge catches the light
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.24, DECK_LEN), walkSides);
    kerb.position.set(sx * (DECK_W / 2 + 0.02), 0.0, DECK_MID);
    scene.add(kerb);
  }

  /* ================= DECK FASCIA ==================================
     The model's stiffening truss is open lattice, so from off the bridge the
     deck read as half built. This closes it with a ribbed panel on each side,
     matching the fluted fill on the tower cross-braces — the ribs are drawn
     to a canvas and tiled along the span rather than modelled. */
  {
    const rib = document.createElement('canvas'); rib.width = 128; rib.height = 16;
    {
      const c = rib.getContext('2d');
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 16);
      for (let x = 0; x < 128; x += 4) {
        c.fillStyle = 'rgba(0,0,0,.16)'; c.fillRect(x, 0, 1.6, 16);
        c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x + 1.8, 0, 0.8, 16);
      }
      // a slightly darker band top and bottom so the panel has an edge
      c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(0, 0, 128, 1.6); c.fillRect(0, 14.4, 128, 1.6);
    }
    const ribTex = new THREE.CanvasTexture(rib);
    ribTex.wrapS = THREE.RepeatWrapping; ribTex.wrapT = THREE.ClampToEdgeWrapping;
    ribTex.repeat.set(DECK_LEN / 3.2, 1);
    ribTex.anisotropy = 8;
    const fasciaMat = new THREE.MeshStandardMaterial({
      map: ribTex, color: 0xD2452F, roughness: 0.66, metalness: 0.04, side: THREE.DoubleSide,
    });
    /* Truss depth on the real bridge is about 0.28 of the deck width; at 3.1
       the fascia read as a slab. */
    const FH = 1.5, FY = -0.62, FX = 3.18;
    for (const sx of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(DECK_LEN, FH), fasciaMat);
      f.rotation.y = sx * Math.PI / 2;
      f.position.set(sx * FX, FY, DECK_MID);
      scene.add(f);
    }
    // and a plain soffit so the underside is not open either
    const soffit = new THREE.Mesh(new THREE.PlaneGeometry(FX * 2, DECK_LEN), bridgeMat);
    soffit.rotation.x = Math.PI / 2;
    soffit.position.set(0, FY - FH / 2, DECK_MID);
    scene.add(soffit);
  }

  /* ================= SIGNAGE ======================================
     Overhead gantries and roadside billboards carrying the summit's own
     information, drawn to <canvas> so the copy stays sharp at any distance
     and can be repainted when the page language changes. */
  const SANS  = "'Hanken Grotesk', system-ui, sans-serif";
  const SERIF = "'Fraunces', Georgia, serif";
  const MONO  = "'Space Mono', ui-monospace, monospace";





  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  const fit = (ctx, text, max, size, weight, family) => {
    let s = size;
    do { ctx.font = weight + ' ' + s + 'px ' + family; s -= 2; }
    while (ctx.measureText(text).width > max && s > 12);
    return s;
  };

  // Green MUTCD-style guide sign
  /* No panel, no green, no border — just the words. The canvas is transparent
     and the material cuts out on alpha, so what flies overhead is lettering
     rather than a highway sign. */
  function paintGantry(ctx, W, H, t) {
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(8,12,22,.55)'; ctx.shadowBlur = H * 0.06; ctx.shadowOffsetY = H * 0.018;
    ctx.fillStyle = '#E7B04A';
    ctx.font = '700 ' + (H * 0.13) + 'px ' + MONO;
    ctx.fillText(t.top, W / 2, H * 0.24);
    ctx.fillStyle = '#FFFFFF';
    fit(ctx, t.big, W * 0.94, H * 0.46, '700', SANS);
    ctx.fillText(t.big, W / 2, H * 0.70);
    ctx.shadowBlur = H * 0.04;
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.font = '700 ' + (H * 0.10) + 'px ' + MONO;
    ctx.fillText(t.sub, W / 2, H * 0.92);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }


  /* The roadside boards, portrait hoardings and partner roster that used to
     line the rails were removed with them — the speakers have the gallery now,
     and the messages are 3D type on the roadway. What is left is the gallery's
     own canvas faces. */
  const postMat = new THREE.MeshStandardMaterial({ color: 0x7C838F, roughness: 0.45, metalness: 0.7 });
  /* Everything that fades in as the flight reaches it: {mats, z, g, near, far}.
     The frame loop walks this and nothing else. */
  const signUnits = [];
  const painters = [];      // every canvas face, repainted on a language change
  const paintAllRef = {};   // late-loading portraits trigger a repaint through this

  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

  /* Paint once the webfonts are ready (otherwise the canvas bakes a fallback
     face), then repaint whenever main.js flips <html lang>. */
  const paintAll = () => { const l = document.documentElement.lang === 'es' ? 'es' : 'en'; painters.forEach((p) => p(l)); };
  paintAllRef.fn = paintAll;
  paintAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintAll);
  new MutationObserver(paintAll).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  /* ================= ROADSIDE MESSAGES ============================
     The two wayfinding messages, as extruded type standing on the roadway
     rather than canvas panels on a gantry — same treatment as the headline, so
     the camera flies through the leading between the big line and the one
     under it. models/signs.glb holds both, in both languages. */
  const roadSigns = [];
  {
    /* All at the one deck height now — a slot aimed at the wrong height is a
       slot the camera flies through a letter instead of. */
    const SIGN_PLACES = [{ i: 0, z: 30, y: DECK_EYE }, { i: 2, z: 12, y: DECK_EYE }, { i: 1, z: -40, y: DECK_EYE }];
    /* Leading, in WORLD units, because the two gaps answer to different things.
       The upper one is pure typography and was nearly two cap-heights of empty
       sky. The lower one is the slot the camera flies through, so it has to
       clear the near plane — 2*tan(60/2)*0.25 = 0.29 at the widest fov on the
       deck — or the letters get sliced open across the frame as you pass.
       Against a 0.42 cap height at SIGN_W these come out at 0.47 and 0.94 of a
       cap, where the model was carrying 1.9 and 1.1. */
    const LEAD_UP = 0.20, LEAD_THREAD = 0.40;
    gltfLoader.load('models/signs.glb', (g) => {
      for (const place of SIGN_PLACES) {
        const signCream = numMat.clone(), signGold = goldMat.clone(), signShade = shadowDark.clone();
        const holder = new THREE.Group();
        const en = new THREE.Group(), es = new THREE.Group();
        for (const child of g.scene.children.slice()) {
          const m = /^(EN|ES)(\d)_(\d)$/.exec(child.name);
          if (!m || +m[2] !== place.i) continue;
          const line = +m[3];
          const clone = child.clone(true);
          clone.traverse((o) => {
            if (!o.isMesh) return;
            o.material = line === 1 ? signCream : signGold;   // own instances, so fading
                                                             // these never touches the title
            o.frustumCulled = false;
          });
          clone.name = m[1] + '_' + line;
          (m[1] === 'ES' ? es : en).add(clone);
        }
        if (!en.children.length) continue;
        holder.add(en, es);
        holder.updateMatrixWorld(true);

        /* Scale comes off width alone, so it can be settled before the block is
           re-led — which is what lets the leading be specified in world units. */
        const bs = new THREE.Box3().setFromObject(en).getSize(new THREE.Vector3());
        const k = SIGN_W / Math.max(bs.x, 0.001);
        /* The threaded slot is the band under the biggest line, wherever the
           model happens to put it — keyed off measured height rather than off
           line numbering, which differs between the three sign blocks. */
        const leads = (i, rows) => {
          let tall = 0;
          for (let n = 1; n < rows.length; n++) if (rows[n].h > rows[tall].h) tall = n;
          return (i === tall ? LEAD_THREAD : LEAD_UP) / k;
        };
        const lay = stackBlock(en, leads);
        const layEs = stackBlock(es, leads);
        const slot = (l) => {
          let tall = 0;
          for (let n = 1; n < l.rows.length; n++) if (l.rows[n].h > l.rows[tall].h) tall = n;
          return l.gaps.length ? l.gaps[Math.min(tall, l.gaps.length - 1)] : 0;
        };

        /* A hard ink echo behind every letter. Cream on pale sky over pale
           green hills had almost nothing to separate it; the extruded sides
           alone were not carrying it. Added after the layout so it never
           inflates the boxes the leading is measured from. */
        for (const grp of [en, es]) {
          for (const row of grp.children.slice()) {
            /* Offset scaled to each line's own height, so the kicker does not
               wear the big line's shadow. */
            const o1 = new THREE.Box3().setFromObject(row).getSize(new THREE.Vector3()).y * 0.10;
            const sh = row.clone(true);
            sh.traverse((o) => { if (o.isMesh) { o.material = signShade; o.frustumCulled = false; } });
            sh.position.x += o1; sh.position.y -= o1; sh.position.z -= o1 * 2.2;
            grp.add(sh);
          }
        }
        const off = Math.max.apply(null, lay.rows.map((r) => r.h)) * 0.10;
        /* The shadow hangs below the big line, eating into the top of the slot,
           so drop the aim point by half of it to stay centred in the clear air
           that is actually left. */
        const gapY = slot(lay) - off / 2;
        /* Spanish lines are a different height, so its own slot sits at its own
           y — line the two up rather than letting the camera thread only one. */
        const gapEs = slot(layEs);
        es.position.y = gapY + off / 2 - gapEs;

        holder.scale.setScalar(k);
        holder.position.set(0, place.y - gapY * k, place.z);   // slot lands on the flight line
        holder.updateMatrixWorld(true);
        /* stackBlock grows downward from y = 0, so the block runs from the
           holder down by its own height. How far its middle sits above the
           flight line is what the camera has to make up for. */
        const rise = (holder.position.y - lay.height * k / 2) - place.y;

        scene.add(holder);
        const setLang = () => {
          const isEs = document.documentElement.lang === 'es';
          en.visible = !isEs; es.visible = isEs;
        };
        setLang();
        new MutationObserver(setLang).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
        roadSigns.push({ holder, z: place.z, rise });
        signUnits.push({ kind: 'sign', mats: [signCream, signGold, signShade], z: place.z, g: holder, last: -1, far: 18, near: 8 });
      }
    }, undefined, (err) => console.warn('[scene] road signs failed to load', err));
  }

  /* ================= SPEAKER GALLERY ==============================
     A header spanning the road with portrait cards strung beneath it on
     cables. Clicking a card flies the camera in to face it and flips it to
     the back, which carries the profile; a DOM panel offers LinkedIn and a
     way back. This is why the roadside hoardings went — the speakers get one
     proper place on the bridge instead of being scattered across billboards. */
  const GALLERY_Z = -6;
  /* Six ropes across the deck, three portraits on each — eighteen faces rather
     than a single row of six. The heading is the 3D sign at z = 12 (SIGN_PLACES
     i:2), set a little before this so it is read on approach. */
  /* The line-up. Names, roles and links are researched, not invented — but
     none of these people has agreed to speak here, so this is dressing for the
     design until the programme is real.

     PHOTOGRAPHS: drop a file at images/speaker-<slug>.webp and it appears on
     the card; nothing else to change. The slug is the name, lower case, without
     accents, spaces as hyphens — images/speaker-javier-olivan.webp and so on,
     or set `img` on an entry to override. Until such a file exists the card
     falls back to a monogram, which is deliberate: the stock portraits in
     images/ are of unrelated people, and one of those under a real name would
     misrepresent them. Portrait crops, roughly 3:4, read best. */
  const slug = (n) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const TBA = {
    en: { n: 'To be announced', r: 'Speaker', b: 'A short profile appears here once the line-up is confirmed.' },
    es: { n: 'Por confirmar', r: 'Ponente', b: 'Aquí aparecerá un perfil breve cuando se confirme el programa.' },
  };
  const SPEAKERS = [
    { url: 'https://www.linkedin.com/in/javierolivan/',
      en: { n: 'Javier Oliván', r: 'COO, Meta',
            b: 'Joined Facebook in 2007 to build its first non-English version — Spanish — and led international growth for fifteen years. Now runs business, operations and partnerships across Meta.' },
      es: { n: 'Javier Oliván', r: 'COO, Meta',
            b: 'Entró en Facebook en 2007 para construir su primera versión no inglesa: la española. Dirigió el crecimiento internacional quince años y hoy lleva negocio, operaciones y alianzas en Meta.' } },
    { url: 'https://www.linkedin.com/in/enriquelores/',
      en: { n: 'Enrique Lores', r: 'CEO, PayPal',
            b: 'Madrid-born, joined HP as an engineering intern in 1989 and led it as CEO from 2019 until early 2026, steering the split from Hewlett Packard Enterprise. Took over at PayPal in February 2026.' },
      es: { n: 'Enrique Lores', r: 'CEO, PayPal',
            b: 'Madrileño. Entró en HP como becario de ingeniería en 1989 y la dirigió como CEO de 2019 a principios de 2026, pilotando la escisión de Hewlett Packard Enterprise. Desde febrero de 2026 lidera PayPal.' } },
    { url: 'https://www.linkedin.com/in/pilarmanchon/',
      en: { n: 'Pilar Manchón', r: 'Sr. Director, AI Research Strategy, Google',
            b: 'Founded Indisys, an early virtual-assistant company acquired by Intel, then led conversational AI at Intel, Amazon and Roku. Advises the Spanish government on AI strategy.' },
      es: { n: 'Pilar Manchón', r: 'Directora sénior de estrategia de investigación en IA, Google',
            b: 'Fundó Indisys, pionera en asistentes virtuales, comprada por Intel. Después lideró IA conversacional en Intel, Amazon y Roku. Asesora al Gobierno de España en estrategia de IA.' } },
    { url: 'https://www.linkedin.com/in/cesarcernuda/',
      en: { n: 'César Cernuda', r: 'President, NetApp',
            b: 'Twenty-three years at Microsoft, where he ran Latin America and then Asia Pacific as a corporate vice president. Decorated by Spain for the commercial ties he built with the United States.' },
      es: { n: 'César Cernuda', r: 'Presidente, NetApp',
            b: 'Veintitrés años en Microsoft, donde dirigió Latinoamérica y después Asia-Pacífico como vicepresidente corporativo. Condecorado por España por los lazos comerciales tejidos con Estados Unidos.' } },
    { url: 'https://www.salesforce.com/company/miguel-milano-bio/',
      en: { n: 'Miguel Milano', r: 'President & COO, Salesforce',
            b: 'Ran Salesforce across APAC, EMEA and Latin America, left to be co-owner and CRO of Celonis, returned in 2023 and was promoted to operating chief in August 2026.' },
      es: { n: 'Miguel Milano', r: 'Presidente y COO, Salesforce',
            b: 'Dirigió Salesforce en Asia-Pacífico, EMEA y Latinoamérica, salió para ser copropietario y CRO de Celonis, volvió en 2023 y en agosto de 2026 ascendió a director de operaciones.' } },
    { url: 'https://www.linkedin.com/in/xamat/',
      en: { n: 'Xavier Amatriain', r: 'Chief AI & Data Officer, Expedia Group',
            b: 'Built the recommendation systems behind Netflix, led AI at Quora and LinkedIn, co-founded Curai Health, then ran product for AI at Google. Barcelona-born; IEEE and ACM Fellow.' },
      es: { n: 'Xavier Amatriain', r: 'Chief AI & Data Officer, Expedia Group',
            b: 'Construyó los sistemas de recomendación de Netflix, dirigió IA en Quora y LinkedIn, cofundó Curai Health y llevó producto de IA en Google. Barcelonés; IEEE y ACM Fellow.' } },
    { url: 'https://www.linkedin.com/in/nuriaoliver',
      en: { n: 'Nuria Oliver', r: 'Director, ELLIS Alicante',
            b: 'MIT Media Lab PhD, formerly a researcher at Microsoft Research and scientific director at Telefónica and Vodafone. Co-founded and directs ELLIS Alicante, on responsible AI.' },
      es: { n: 'Nuria Oliver', r: 'Directora, ELLIS Alicante',
            b: 'Doctora por el MIT Media Lab, investigadora en Microsoft Research y directora científica en Telefónica y Vodafone. Cofundó y dirige ELLIS Alicante, sobre IA responsable.' } },
    { url: 'https://www.linkedin.com/in/carme-artigas-7316513',
      en: { n: 'Carme Artigas', r: 'Co-Chair, UN AI Advisory Body',
            b: "Spain's first Secretary of State for Digitalisation and AI, and the Council presidency's chief negotiator on the EU AI Act. Co-founded and ran the big-data firm Synergic Partners." },
      es: { n: 'Carme Artigas', r: 'Copresidenta del Órgano Asesor de IA de la ONU',
            b: 'Primera secretaria de Estado de Digitalización e IA de España y negociadora jefe de la presidencia del Consejo en el Reglamento europeo de IA. Cofundadora y CEO de Synergic Partners.' } },
    { url: 'https://www.linkedin.com/in/inakiberenguer/',
      en: { n: 'Iñaki Berenguer', r: 'CEO & Co-founder, MITO AI',
            b: 'Three exits — Pixable, Contactive and CoverWallet, sold to Aon in 2020. Cambridge PhD, MIT MBA, taught at Stanford Engineering and invests through LifeX Ventures.' },
      es: { n: 'Iñaki Berenguer', r: 'CEO y cofundador, MITO AI',
            b: 'Tres salidas: Pixable, Contactive y CoverWallet, vendida a Aon en 2020. Doctor por Cambridge, MBA por el MIT, profesor en Stanford e inversor a través de LifeX Ventures.' } },
  ];
  /* Who has a portrait on disk. Only used for ordering — a card finds its own
     image by slug either way — but it decides what the wall leads with. */
  const PORTRAITS = ['javier-olivan', 'enrique-lores', 'pilar-manchon',
                     'nuria-oliver', 'carme-artigas', 'cesar-cernuda'];

  /* Eighteen hooks, nine names. The rest read "to be announced", which is the
     truthful state of a 2027 programme. Best first: a full card (portrait, name,
     profile, link), then the names still waiting on a photograph, then the
     unconfirmed. The wall is hung row by row (see `k * ROPES + r` below), so
     this order reads left to right, top to bottom. Array.sort is stable, so the
     order each group was written in survives. */
  const has = (sp) => PORTRAITS.indexOf(slug(sp.en.n)) >= 0;
  const ROSTER = SPEAKERS.slice().sort((a, b) => (has(b) ? 1 : 0) - (has(a) ? 1 : 0));
  while (ROSTER.length < 18) ROSTER.push({ url: null, en: TBA.en, es: TBA.es });

  const cards = [];
  /* Mesh.raycast ignores object.visible, so the gallery has to gate its own
     picking — otherwise a click out in the hero, where the cards are faded
     to nothing, still lands on one. */
  const gallery = { g: null };
  const CARD_W = 0.66, CARD_H = 0.86;      // the focus framing below solves against these

  {
    const ROPES = 6, PER_ROPE = 3;
    const CW = CARD_W, CH = CARD_H, TOP = 5.6, VGAP = 0.14, LANE = 0.62, HGAP = 0.1;
    const TOP_CARD_Y = 4.05;                       // top row; rows hang below it
    const gal = new THREE.Group();
    gal.position.z = GALLERY_Z;
    scene.add(gal);
    gallery.g = gal;

    const galMat = postMat.clone();
    const galMats = [galMat];
    for (const sx of [-2.86, 2.86]) {
      const p = box(0.16, TOP, 0.16, galMat); p.position.set(sx, TOP / 2, 0); gal.add(p);
    }
    const hbeam = box(6.0, 0.18, 0.2, galMat); hbeam.position.y = TOP; gal.add(hbeam);

    const halfRopes = ROPES / 2;
    for (let r = 0; r < ROPES; r++) {
      const side = r < halfRopes ? -1 : 1;
      const rj = r < halfRopes ? (halfRopes - 1 - r) : (r - halfRopes);
      const x = side * (LANE / 2 + CW / 2 + rj * (CW + HGAP));

      const hang = new THREE.Group();
      hang.position.set(x, 0, 0);
      const lowest = TOP_CARD_Y - (PER_ROPE - 1) * (CH + VGAP) - CH / 2;
      const cableLen = TOP - lowest;
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, cableLen, 6), galMat);
      cable.position.set(0, lowest + cableLen / 2, 0);
      hang.add(cable);

      for (let k = 0; k < PER_ROPE; k++) {
        const idx = k * ROPES + r;      // row-major: the top row fills first, left to right
        const sp = ROSTER[idx % ROSTER.length];
        const named = sp.en.n !== TBA.en.n;
        /* Four colourways off the site's palette, so a wall of cards reads as a
           deliberate set rather than eighteen of the same thing. */
        const TONES = [
          { bg: '#C0392B', fg: '#FBF4E4', mono: '#F6D08A' },
          { bg: '#E5B84B', fg: '#1B2030', mono: '#7A4A16' },
          { bg: '#1B2030', fg: '#FBF4E4', mono: '#E5B84B' },
          { bg: '#FBF4E4', fg: '#1B2030', mono: '#C0392B' },
        ];
        const tone = TONES[idx % TONES.length];
        const INK = '#171B24', CREAM = '#FBF4E4';

        /* Two resolutions. Eighteen cards hanging across the road only ever
           occupy a few hundred pixels each, but a focused one fills most of the
           viewport — at the wall's resolution its paragraph came up soft. The
           small size is what everything is built at; `hi()` re-cuts the canvas
           at focus resolution and back, so at most one card holds the large
           texture at a time. */
        /* The front lives on the wall, so it is built at wall resolution and
           re-cut when a card is focused. The back is never visible until the
           card turns over — it is facing away — so it is not built at all until
           then.

           Sized off the renderer's own drawing buffer rather than a fixed
           multiplier: 3x is right on one display and half of what is needed on
           the next, and it was the small type that showed it. The big serif name
           survived the upscale; the mono kicker and the body did not. */
        /* The wall is eighteen textures held at once: 23 MB at 512, 9 MB at 320.
           Same aspect, so the focus texture below is unaffected. */
        const CARD_PX = SMALL ? 320 : 512, CARD_PY = SMALL ? 418 : 668;
        const focusPx = () => Math.max(760, Math.min(2600, Math.round(renderer.domElement.height * 0.82)));
        const lang = () => (document.documentElement.lang === 'es' ? 'es' : 'en');
        /* One canvas, one size, painted once and repainted on a language change.
           Nothing is ever resized in place. */
        const mk = (px, py, draw) => {
          const cv = document.createElement('canvas');
          cv.width = px; cv.height = py;
          const tex = new THREE.CanvasTexture(cv);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = MAX_ANISO;      // these are read at a slant all across the wall
          const redraw = () => { const l = lang(); draw(cv.getContext('2d'), px, py, sp[l] || sp.en, l); tex.needsUpdate = true; };
          redraw();
          painters.push(redraw);
          return { tex };
        };

        /* A face's focus texture: a fresh canvas at the size it will actually be
           read at, swapped in while the card is focused and disposed on release.
           This replaces re-cutting the wall canvas by assigning cv.width, which
           is the step that kept coming back at wall resolution however large the
           multiplier was — the big serif name survived the upscale and the mono
           kicker and body did not, which is what gave it away. */
        const focusFace = (mat, wallTex, draw) => {
          let tex = null;
          const repaint = () => {
            if (!tex) return;
            const cv = tex.image, l = lang();
            draw(cv.getContext('2d'), cv.width, cv.height, sp[l] || sp.en, l);
            tex.needsUpdate = true;
          };
          painters.push(repaint);
          return (on) => {
            if (!on) {
              if (!tex) return;
              mat.map = wallTex; mat.needsUpdate = true;
              tex.dispose(); tex = null;
              return;
            }
            if (tex) return;
            const h = focusPx(), w = Math.round(h * CARD_PX / CARD_PY);
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            tex = new THREE.CanvasTexture(cv);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = MAX_ANISO;
            repaint();
            mat.map = tex; mat.needsUpdate = true;
          };
        };

        /* Wrap `text` into `max`-wide lines and paint them, returning the y the
           next block should start at. */
        const flow = (ctx, text, x, y, max, lh) => {
          let line = '';
          for (const w of String(text).split(' ')) {
            if (line && ctx.measureText(line + ' ' + w).width > max) { ctx.fillText(line, x, y); y += lh; line = w; }
            else line = line ? line + ' ' + w : w;
          }
          if (line) { ctx.fillText(line, x, y); y += lh; }
          return y;
        };
        const initials = (n) => n.split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase();

        /* A headshot if one has been supplied, the monogram until then. The
           image is fetched speculatively — a 404 simply leaves the monogram in
           place, so adding a file is the whole of the work. */
        const photo = { img: null };
        if (named) {
          const src = 'images/' + (sp.img || 'speaker-' + slug(sp.en.n)) + '.webp';
          const im = new Image();
          im.onload = () => { photo.img = im; if (paintAllRef.fn) paintAllRef.fn(); };
          im.src = src;
        }

        const drawFront = (ctx, W, H, t) => {
          ctx.fillStyle = tone.bg; ctx.fillRect(0, 0, W, H);
          const pad = W * 0.045;
          const plateY = H * 0.62;
          const im = photo.img;
          if (im && im.naturalWidth) {
            // cover-fit into the panel above the name plate
            const ax = pad, ay = pad, aw = W - pad * 2, ah = plateY - pad;
            ctx.save();
            ctx.beginPath(); ctx.rect(ax, ay, aw, ah); ctx.clip();
            const kk = Math.max(aw / im.naturalWidth, ah / im.naturalHeight);
            const dw = im.naturalWidth * kk, dh = im.naturalHeight * kk;
            ctx.drawImage(im, ax + (aw - dw) / 2, ay + (ah - dh) * 0.32, dw, dh);
            ctx.restore();
          } else {
            /* A monogram, not a photograph. See the note on ROSTER: a stock
               portrait under a real name would misrepresent the person. */
            ctx.textAlign = 'center'; ctx.fillStyle = tone.fg;
            const mark = named ? initials(t.n) : '?';
            fit(ctx, mark, W * 0.62, H * 0.42, '600', SERIF);
            ctx.fillText(mark, W / 2, H * 0.46);
          }
          ctx.strokeStyle = INK; ctx.lineWidth = W * 0.028;
          ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

          // name plate along the foot
          ctx.fillStyle = CREAM; ctx.fillRect(pad, plateY, W - pad * 2, H - plateY - pad);
          ctx.fillStyle = INK; ctx.fillRect(pad, plateY, W - pad * 2, W * 0.016);
          ctx.textAlign = 'left';
          ctx.fillStyle = INK;
          const nsz = fit(ctx, t.n, W * 0.84, H * 0.088, '600', SERIF);
          const y = plateY + H * 0.098;
          ctx.fillText(t.n, W * 0.10, y);
          ctx.fillStyle = tone.bg === CREAM ? '#A0731C' : tone.bg;
          ctx.font = '700 ' + (H * 0.036) + 'px ' + MONO;
          const org = String(t.r).split(',').pop().trim().toUpperCase();
          flow(ctx, org, W * 0.10, y + nsz * 0.95, W * 0.80, H * 0.048);
        };
        const front = mk(CARD_PX, CARD_PY, drawFront);

        const drawBack = (ctx, W, H, t) => {
          /* Same construction as the request form: cream stock, hard ink rule,
             gold mono kicker. The old card back was a dark glass panel and read
             as a different site. */
          ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
          const pad = W * 0.045;
          ctx.strokeStyle = INK; ctx.lineWidth = W * 0.028;
          ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
          const L = W * 0.11, MAXW = W * 0.78;
          ctx.textAlign = 'left';

          ctx.fillStyle = '#A0731C'; ctx.font = '700 ' + (H * 0.026) + 'px ' + MONO;
          let y = flow(ctx, String(t.r).toUpperCase(), L, H * 0.125, MAXW, H * 0.038);

          ctx.fillStyle = INK;
          const nsz = fit(ctx, t.n, MAXW, H * 0.078, '600', SERIF);
          y += H * 0.048;
          ctx.fillText(t.n, L, y);
          y += H * 0.03;

          ctx.fillStyle = '#C0392B'; ctx.fillRect(L, y, W * 0.16, W * 0.016);
          y += H * 0.062;

          ctx.fillStyle = 'rgba(23,27,36,.78)'; ctx.font = '400 ' + (H * 0.034) + 'px ' + SANS;
          y = flow(ctx, t.b || TBA.en.b, L, y, MAXW, H * 0.048);

          void nsz;
        };

        const frontMat = new THREE.MeshStandardMaterial({ map: front.tex, roughness: 0.55 });
        /* The back is never visible on the wall — the card is facing you — so it
           has no wall texture at all and is built only when one is focused. */
        const backMat = new THREE.MeshStandardMaterial({ color: 0xFBF4E4, roughness: 0.55 });
        const frontFocus = focusFace(frontMat, front.tex, drawFront);
        const backFocus = focusFace(backMat, null, drawBack);
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0x171B24, roughness: 0.6 });
        galMats.push(frontMat, backMat, edgeMat);
        const card = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, 0.05),
          [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat]);
        card.position.y = TOP_CARD_Y - k * (CH + VGAP);
        hang.add(card);

        const hi = (on) => { frontFocus(on); backFocus(on); };
        /* Where this one sits in the wall: r runs left to right across the
           ropes, k runs top to bottom down each one. The controls step by
           these rather than by array index — the array is filled rope by
           rope, so "next" used to walk down a column and jump to the top of
           the one beside it, which is nobody's idea of moving right. */
        cards.push({ card, hang, sp, flip: 0, target: 0, x, hi, col: r, row: k });
      }
      gal.add(hang);
    }
    // holds back with everything else until the camera is on it
    signUnits.push({ kind: 'gallery', mats: galMats, z: GALLERY_Z, g: gal, last: -1, far: 18, near: 8 });
  }

  /* ================= TAP CUE ======================================
     "Tap the card to see the profile" as an object in the scene instead of a
     line of mono type over it: a 3D pointer (models/cursor.glb) hangs in front
     of the focused card, taps it on a loop, and sends a ring out of the tip on
     each tap. Fades out the moment the card turns over — by then it has said
     what it had to say. */
  const hint = { g: null, wrap: null, ring: null, k: 0, at: new THREE.Vector3() };
  {
    const skin = new THREE.MeshStandardMaterial({ color: 0xFBF4E4, roughness: 0.42, transparent: true });
    const edge = new THREE.MeshStandardMaterial({ color: 0x171B24, roughness: 0.8, transparent: true });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xF7DCA0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    hint.mats = { skin, edge, ringMat };
    const g = new THREE.Group();
    g.visible = false; g.renderOrder = 5;
    scene.add(g);
    hint.g = g;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40), ringMat);
    ring.position.z = -0.03;
    g.add(ring);
    hint.ring = ring;

    gltfLoader.load('models/cursor.glb', (gl) => {
      const m = gl.scene;
      m.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(m);
      const sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      m.traverse((o) => { if (o.isMesh) { o.material = skin; o.frustumCulled = false; } });
      m.position.sub(c);                       // centre it before anything scales about the origin
      const core = new THREE.Group();
      core.add(m);
      /* An ink copy sat behind and offset, exactly as the lettering does it — a
         cream pointer over a cream card would otherwise vanish. It replaces a
         back-face outline scaled to 1.10, which on geometry a tenth of a unit
         thick came through as slivers rather than a silhouette: that is the
         broken wireframe look, not the model. */
      const sh = m.clone(true);
      sh.traverse((o) => { if (o.isMesh) { o.material = edge; o.frustumCulled = false; } });
      sh.position.x += sz.y * 0.05; sh.position.y -= sz.y * 0.05; sh.position.z -= sz.z * 1.2;
      core.add(sh);
      const wrap = new THREE.Group();
      wrap.add(core);
      wrap.scale.setScalar(0.085 / Math.max(sz.y, 0.001));
      g.add(wrap);
      hint.wrap = wrap;
    }, undefined, (err) => console.warn('[scene] cursor model failed to load', err));
  }

  /* ================= LANDFALL + TUNNEL ============================
     The deck used to stop dead over open water. The road runs off the truss
     onto an embankment and into a bore in the headland, so the page ends on an
     arrival instead of an edge. The closing message is 3D type standing in
     front of the hillside (see FINALE below), not a billboard. */
  {
    const rockMat  = new THREE.MeshStandardMaterial({ color: 0x8D8477, roughness: 0.98, metalness: 0.0 });
    /* Flat-shaded so the headland reads as faceted low-poly terrain rather
       than smooth green blobs — it sits better beside the hard-edged bridge.
       Darker than looks right in isolation: they sit 150-250 units out, where
       the haze washes a good third of the colour out of them. */
    const grass    = new THREE.MeshStandardMaterial({ color: 0x4F7A38, roughness: 1.0, metalness: 0.0, flatShading: true });
    const grassDk  = new THREE.MeshStandardMaterial({ color: 0x3B5C2B, roughness: 1.0, metalness: 0.0, flatShading: true });
    /* Cement, not cut earth. A hole in a grass bank read as a burrow; a real
       bore has a concrete headwall around it. */
    const cementMat = new THREE.MeshStandardMaterial({ color: 0xCBC6BA, roughness: 0.94, metalness: 0.0 });
    const cementDk  = new THREE.MeshStandardMaterial({ color: 0xA9A498, roughness: 0.96, metalness: 0.0 });
    /* Unlit. As a lit material the inside of the bore took the hemisphere
       light's GROUND colour on every downward-facing face — so the tunnel
       glowed green, which is the grass bouncing into it. A hole should read
       as a hole whatever the sky is doing. */
    const boreMat   = new THREE.MeshBasicMaterial({ color: 0x2B2D32, side: THREE.BackSide });
    const grp = new THREE.Group();

    // embankment carrying the road from the truss end to the portal face
    const emb = new THREE.Mesh(new THREE.BoxGeometry(DECK_W + 3.6, 9, DECK_TO - TUNNEL_Z + 6), rockMat);
    emb.position.set(0, -4.6, (DECK_TO + TUNNEL_Z) / 2);
    grp.add(emb);

    /* Wider than the carriageway and its shoulders — the mouth used to be
       narrower than the road running into it. */
    const AW = DECK_W + 5.0, AH = 6.4, R = AW / 2, BASE = -7;
    const HOLE = R + 0.35;                 // the bank's opening; the bore lines it
    const archHole = (r, h) => {
      const p = new THREE.Path();
      p.moveTo(r, BASE); p.lineTo(r, h - r);
      p.absarc(0, h - r, r, 0, Math.PI, false);
      p.lineTo(-r, BASE); p.closePath();
      return p;
    };

    /* The hillside is ONE extruded shape with the bore cut out of it, its top
       edge drawn as a ridge line. It used to be a small flat facade with
       spheres for hills — and the near sphere was radius 60 centred 18 units
       BEHIND the portal, so it reached 42 units in front of it and swallowed
       the arch whole. That is why there was never a hole to see. Terrain that
       owns the opening cannot cover it. */
    /* The ends of the ridge sink below the sea rather than stopping. This was a
       190-wide slab with a flat base sitting exactly on the waterline and hard
       vertical edges where it ran out — from the hero you could see it end, a
       green wall cut off in mid-air over the bay. Wider now, its foot well under
       the water, and the profile falls away to -12 at the extremes so the
       silhouette dips into the sea instead of being chopped. */
    const FW = 300, DEPTH = 34, SHAPE_BASE = -46;
    const ridge = (x) => {
      const u = Math.min(Math.abs(x) / (FW / 2), 1);
      const fade = Math.max(0, 1 - u * u * (3 - 2 * u));     // full height in the middle, gone at the ends
      const h = 21 + 7 * Math.sin(x * 0.055) + 4.5 * Math.sin(x * 0.13 + 1.7) + 2.5 * Math.sin(x * 0.31 + 0.6);
      return h * fade - 12 * (1 - fade);
    };
    const hill = new THREE.Shape();
    hill.moveTo(-FW / 2, SHAPE_BASE);
    hill.lineTo(FW / 2, SHAPE_BASE);
    for (let i = 0; i <= 96; i++) hill.lineTo(FW / 2 - (FW * i / 96), ridge(FW / 2 - (FW * i / 96)));
    hill.closePath();
    hill.holes.push(archHole(HOLE, AH + 0.35));
    /* No bevel. It was there to soften the crest, but ExtrudeGeometry bevels
       HOLES as well as the outline — a 3.2 bevel took this hole from 3.85 down
       to 0.65 at the face and flared it back out over the depth. That green
       funnel, and the small opening at the end of it, was the whole of what you
       could see through the portal. Flat-shaded low-poly wants a hard crest
       anyway. */
    const face = new THREE.Mesh(new THREE.ExtrudeGeometry(hill, {
      depth: DEPTH, bevelEnabled: false,
    }), grass);
    face.position.z = TUNNEL_Z - 1 - DEPTH;      // front face a clear 6 units behind the headwall
    grp.add(face);

    /* A concrete headwall standing proud of the bank, with the bore cut through
       it — so the edge of the opening is cement rather than grass. */
    /* Wide and low: a portal retaining wall across the foot of the bank,
       leaving the green above it clear for the closing title. */
    const HW = 26, HT = 7.2, HD = 2.6;
    const head = new THREE.Shape();
    head.moveTo(-HW / 2, BASE); head.lineTo(HW / 2, BASE);
    head.lineTo(HW / 2, HT); head.lineTo(-HW / 2, HT); head.closePath();
    head.holes.push(archHole(R, AH));
    const wall2 = new THREE.Mesh(new THREE.ExtrudeGeometry(head, { depth: HD, bevelEnabled: false }), cementMat);
    wall2.position.z = TUNNEL_Z + 2.4;
    grp.add(wall2);
    // cornice, and a raised arch band so the mouth has an edge to catch light
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(HW + 1.4, 0.9, HD + 0.9), cementDk);
    cornice.position.set(0, HT + 0.45, TUNNEL_Z + 2.4 + HD / 2 + 0.2);
    grp.add(cornice);
    // buttresses down each side, so the wall reads as built into the bank
    for (const sx of [-1, 1]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.7, HT + 0.6, HD + 1.6), cementDk);
      pier.position.set(sx * (HW / 2 - 0.5), (BASE + HT) / 2 + 0.3, TUNNEL_Z + 2.4 + HD / 2 + 0.5);
      grp.add(pier);
    }
    const band = new THREE.Shape();
    band.setFromPoints(archHole(R + 0.85, AH + 0.85).getPoints(56));
    band.holes.push(archHole(R, AH));
    const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(band, { depth: 0.7, bevelEnabled: false }), cementDk);
    ring.position.z = TUNNEL_Z + 2.4 + HD;
    grp.add(ring);

    // a dark bore behind the mouth so it reads as depth, not a hole to the sky
    /* Cut to the bank's own hole, not to the arch. At the bore's old radius
       there was a third of a unit of daylight between it and the wall of the
       bank's hole — and that hole is a thirty-unit tube of grass, which is
       exactly the green ring that showed through the mouth. Sized to the hole,
       it lines every part of the bank you can see through the opening.

       Back faces only, so the near half is culled and you look straight in. */
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(HOLE - 0.02, HOLE - 0.02, 44, 32, 1, true), boreMat);
    bore.rotation.x = Math.PI / 2;
    bore.position.set(0, AH - R, TUNNEL_Z + 5.4 - 22);
    grp.add(bore);
    /* Its own material: boreMat is BackSide, which culls exactly the face of the
       cap you are looking at — so the far end was invisible and the hills behind
       showed straight through the mouth as green. */
    /* Barely darker than the wall, so the far end reads as the void running out
       rather than a small door standing at the end of it. */
    const capMat = new THREE.MeshBasicMaterial({ color: 0x232529 });
    const cap = new THREE.Mesh(new THREE.CircleGeometry(HOLE, 32), capMat);
    cap.position.set(0, AH - R, TUNNEL_Z + 5.4 - 44);
    grp.add(cap);

    /* Ridge stacking away behind the hillside, purely for silhouette. Every
       centre is far enough back that the sphere's front (z + r) still clears
       the portal plane, and far enough below the waterline that only the upper
       cap shows — otherwise they read as balls rather than land. */
    for (const h of [
      { r: 72, x: -46, y: -50, z: TUNNEL_Z - 120, sy: 0.92, m: grassDk },
      { r: 78, x:  58, y: -54, z: TUNNEL_Z - 140, sy: 0.94, m: grass },
      { r: 95, x:  -8, y: -74, z: TUNNEL_Z - 210, sy: 0.88, m: grassDk },
    ]) {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(h.r, 9, 6), h.m);
      mound.scale.y = h.sy; mound.position.set(h.x, h.y, h.z);
      mound.rotation.y = h.x * 0.37;          // break the shared silhouette
      grp.add(mound);
    }

    scene.add(grp);
  }

  /* ================= TRAFFIC ======================================
     Five vehicles from the civil-service pack (models/vehicles.glb — the
     pack's 8 MB FBX reduced in Blender to the five that read as ordinary
     bridge traffic, Draco-compressed with 512px textures). Lane centres come
     straight off the baked road texture's own markings, and the models carry
     real metric dimensions so they are scaled by length rather than guessed.
     Right-hand traffic: vehicles heading away share the camera's side. */
  const LANES = [0.27, 0.73].map((f) => -DECK_W / 2 + DECK_W * f);   // one each way
  const M_PER_UNIT = 3.2;                 // the carriageway is ~15.7 m across
  const traffic = [];

  gltfLoader.load('models/vehicles.glb', (gltf) => {
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    /* One node per vehicle, but each node's mesh has a primitive per material,
       so three builds it as a Group. Take the nodes, not the primitives. */
    const protos = gltf.scene.children.map((o) => {
      const b = new THREE.Box3().setFromObject(o);
      if (b.isEmpty()) return null;
      const sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      return { o, lenM: Math.max(sz.x, sz.z), alongZ: sz.z >= sz.x, min: b.min.clone(), c };
    }).filter(Boolean);
    if (!protos.length) return;
    if (CFG.debug) console.log('[scene] vehicles:', protos.map((p) => p.o.name + ' ' + p.lenM.toFixed(2) + 'm').join(', '));

    let i = 0;
    /* Vehicles used to vanish at the end of the truss, well short of the
       portal. They now run the full length of tarmac and disappear a few
       units inside the bore, where the darkness hides the swap. */
    const TRAFFIC_END = TUNNEL_Z - 7;
    const PER_LANE = 9, GAP = (DECK_FROM - TRAFFIC_END) / PER_LANE;
    for (let li = 0; li < LANES.length; li++) {
      const lane = LANES[li];
      const away = lane > 0;
      for (let k = 0; k < PER_LANE; k++) {
        const p = protos[i % protos.length];
        const g = new THREE.Group();
        /* Never overwrite the node's own scale — the FBX carries a unit-scale
           factor. The metres-to-world conversion goes on a wrapper instead. */
        const v = p.o.clone(true);
        const inner = new THREE.Group();
        inner.add(v);
        inner.position.set(-p.c.x, -p.min.y, -p.c.z);   // centred, wheels at y = 0
        const holder = new THREE.Group();
        holder.scale.setScalar(1 / M_PER_UNIT);
        holder.add(inner);
        if (!p.alongZ) holder.rotation.y = Math.PI / 2;
        g.add(holder);
        // evenly spaced, with a per-lane phase so lanes never line up abreast
        g.position.set(lane, 0.06, TRAFFIC_END + k * GAP + li * (GAP / LANES.length));
        // These models face +Z, so it is the vehicles travelling -Z that need
        // turning around — not the oncoming ones.
        if (away) g.rotation.y = Math.PI;
        // real speeds: ~78 km/h is 21.7 m/s, which is 6.8 units/s at this scale
        const kmh = p.lenM > 8 ? 62 : 78 + (i % 3) * 9;
        g.userData = { sp: (away ? -1 : 1) * (kmh / 3.6) / M_PER_UNIT, lo: TRAFFIC_END, hi: DECK_FROM };
        scene.add(g); traffic.push(g); i++;
      }
    }
  }, undefined, (err) => console.warn('[scene] vehicles failed to load', err));

  /* ================= BIRDS ========================================
     models/birds.glb is a skinned, animated flock of five (190 KB, used as
     downloaded). Skinned meshes cannot be cloned with Object3D.clone without
     vendoring SkeletonUtils, so each flock is a separate load — the file is
     fetched once and just parsed twice. Each circles on its own radius. */
  const flocks = [];
  for (const b of [
    /* offX/ahead are relative to the camera, so each stays somewhere in the
       forward view for the whole flight instead of circling a fixed point and
       spending most of the scroll off-screen. `solo` keeps a single bird out of
       the five-strong flock, for the ones that should read as strays. */
    /* Heights and distances are set around the 3D headline (which stands on the
       view axis ~34 units out, near y = 11), so they cross the title rather
       than drifting across empty sky well above it. */
    { offX:  -8, ahead: 34, y: 13, r: 19, s: 0.40, sp: 0.22, tilt: 0.10 },   // crosses the letters
    { offX:  18, ahead: 47, y: 21, r: 20, s: 0.36, sp: 0.15, tilt: 0.07 },
    { offX: -22, ahead: 30, y: 14, r:  9, s: 0.26, sp: 0.32, tilt: 0.16, solo: true },
    { offX:  11, ahead: 33, y: 19, r: 11, s: 0.22, sp: 0.27, tilt: -0.13, solo: true },
    { offX:  -3, ahead: 43, y: 24, r: 15, s: 0.24, sp: 0.17, tilt: 0.05, solo: true },
  ]) {
    gltfLoader.load('models/birds.glb', (g) => {
      const f = g.scene;
      f.scale.setScalar(b.s);
      f.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
      if (b.solo) {
        // keep one bird of the five; the rest of the rig stays for the clip
        const birds = [];
        f.traverse((o) => { if (o.isSkinnedMesh || o.isMesh) birds.push(o); });
        birds.slice(1).forEach((o) => { o.visible = false; });
      }
      const mixer = new THREE.AnimationMixer(f);
      g.animations.forEach((clip) => mixer.clipAction(clip).play());
      scene.add(f);
      flocks.push({ mixer, f, cfg: b, t: Math.random() * Math.PI * 2 });
    }, undefined, (err) => console.warn('[scene] birds failed to load', err));
  }

  /* ================= CAMERA PATH ==================================
     Keyframed positions and look-at targets, sampled as two matched
     Catmull-Rom curves so the flight stays smooth end to end. */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const pathPos = new THREE.CatmullRomCurve3([
    /* The first three points run straight along the opening frame's view axis,
       so the 3D headline can stand centred on that line and the scroll flies
       the camera through the letterforms rather than past them. */
    V( 34,  13,    94),  // hero      — off to the right, bridge filling the left
    V( 24,  10.8,  78),  // ↓ down the view axis
    V( 14,   8.6,  62),  // ↓ through the headline
    V(  6,   5.4,  56),  // ↓ swinging onto the centreline
    /* DECK_EYE the whole way across. The flight used to run at 2.1 and climb to
       3.05 only for the speaker wall, which meant every message on the deck was
       read from below. One height for the whole crossing. */
    V(  0.6, 3.05, 50),  // ↓ down onto the roadway at the near tower (z=55)
    V(  0,   3.05, 44),  // why       — through the tower, on the deck
    V(  0,   3.05, 32),  // ↓
    V(  0,   3.05, 22),  // summit    — mid-span
    V(  0,   3.05, -4),  // speakers  — level with the middle row of the wall
    V(  0,   3.05,-30),  // team      — approaching the far tower
    V(  0,   3.05,-60),  // ——        — through the far tower (z=-55)
    V(  0,   3.1, -70),  // ↓ off the truss and onto the embankment
    V(  0,   3.4, -84),  // arrival   — on the approach, facing the tunnel mouth
  ]);
  const pathLook = new THREE.CatmullRomCurve3([
    V(  2.5, 4,    42),   // straight down the view axis at the opening
    V(  1.4, 3.4,  30),
    V(  0.5, 2.8,  16),
    V(  0.2, 2.4,   4),
    V(  0,   3.05, -8),   // level from here to the landfall: camera and target
    V(  0,   3.05,-20),   //   share a height, so the deck reads straight ahead
    V(  0,   3.05,-38),   //   rather than being looked down at
    V(  0,   3.05,-62),
    V(  0,   3.05,-80),
    V(  0,   3.05,-92),
    V(  0,   4.6,-100),
    V(  0,   7.6,-106),
    V(  0,   9.5,-112),   // the closing title above, the open bore below it
  ]);


  /* ================= 3D HEADLINE ==================================
     The hero title as real extruded geometry (models/headline.glb — Georgia
     Bold, the site's own serif fallback, extruded and Draco'd in Blender at
     185 KB). It is planted ON the camera path a little ahead of the start and
     turned to face the opening frame, so scrolling flies the camera straight
     through the letterforms and on down the bridge. Both languages are baked
     in as EN_* / ES_* and swapped on <html lang>. */
  /* Dark type with the red accent, as originally. The muddy brown cast it used
     to have was metalness reflecting the red bridge — that is now zero, and the
     separation it lacked comes from a light halo behind the letters instead of
     a darker colour. */
  /* Flat black and the brand red. Roughness is high and metalness zero so the
     faces stay their own colour — any shine and they pick up the red bridge as
     a brown cast. The extruded sides still catch the light, which is what
     gives the letters their depth. */
  const inkMat  = new THREE.MeshStandardMaterial({ color: 0x14171F, roughness: 0.78, metalness: 0.0 });
  const redMat  = new THREE.MeshStandardMaterial({ color: 0xC0392B, roughness: 0.74, metalness: 0.0 });
  /* A paler gold. The deeper tone sat too close in value to the blue water
     behind it and the event line all but vanished; this reads against both the
     bay and the red deck. */
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xF7DCA0, roughness: 0.46, metalness: 0.12 });

  /* Both text blocks are built the same way: EN_* / ES_* meshes in one GLB,
     split into two groups, stood on the opening frame's view axis and sized off
     the real frustum at that distance. pick() chooses the material per mesh. */
  /* A matte copy set slightly behind and down. The blocks face the camera
     head-on at the opening, so it reads as a drop shadow. Dark type needs a
     light one to lift off the bridge; light type needs a dark one. */
  const shadowLight = new THREE.MeshBasicMaterial({ color: 0xF7F4EE, transparent: true, opacity: 0.72 });
  const shadowDark  = new THREE.MeshBasicMaterial({ color: 0x0E1119, transparent: true, opacity: 0.42 });

  /* Re-run on resize: both text blocks are sized from the frustum's aspect at
     load time, so a rotated phone or a resized window would otherwise leave
     them cropped or stranded. */
  const refits = [];
  /* Re-lead a text block from its own measurements rather than trusting what
     Blender baked. Rows are ordered by where the model put them (so this never
     has to assume which line is the kicker), centred on x, and stacked with
     explicit leading. Returns the local y of each clear band between
     consecutive rows, top to bottom — that is what gets pinned to the flight
     line so the camera passes through a gap instead of through a letterform.

     The block's own top ends up at y = 0 and it grows downward, so the returned
     gaps are negative. Everything is in the group's LOCAL space: measure with
     the holder at identity or the boxes come back in world coordinates.

     `leads` is one number for every gap, an array of per-gap leads, or a
     function (i, rows) -> lead for the gap directly below rows[i]. */
  function stackBlock(grp, leads) {
    const V3 = () => new THREE.Vector3();
    grp.updateMatrixWorld(true);
    const rows = grp.children.map((c) => {
      const b = new THREE.Box3().setFromObject(c);
      return { c, y: b.getCenter(V3()).y, x: b.getCenter(V3()).x, h: b.getSize(V3()).y };
    }).sort((a, b) => b.y - a.y);
    const lead = typeof leads === 'function'
      ? (i) => leads(i, rows)
      : (i) => (Array.isArray(leads) ? (leads[i] !== undefined ? leads[i] : leads[leads.length - 1]) : leads);
    const gaps = [];
    let cursor = 0;                                  // running bottom edge of what is placed
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (i > 0) { gaps.push(cursor - lead(i - 1) / 2); cursor -= lead(i - 1); }
      r.c.position.y += cursor - (r.y + r.h / 2);
      r.c.position.x -= r.x;
      cursor -= r.h;
    }
    grp.updateMatrixWorld(true);
    return { gaps, height: -cursor, rows };
  }

  function loadTextBlock(url, pick, place, done, shadow) {
    gltfLoader.load(url, (g) => {
      const holder = new THREE.Group();
      const en = new THREE.Group(), es = new THREE.Group();
      /* The drop shadow used to be a fixed offset in model units, which made it
         read as a doubled image on any block whose type was set smaller than the
         headline's. Scale it to the tallest line instead. */
      let capH = 0.001;
      for (const child of g.scene.children) {
        child.updateMatrixWorld(true);
        capH = Math.max(capH, new THREE.Box3().setFromObject(child).getSize(new THREE.Vector3()).y);
      }
      const offXY = capH * 0.062, offZ = capH * 0.155;
      for (const child of g.scene.children.slice()) {
        const lang = child.name.slice(0, 2);
        child.traverse((o) => { if (o.isMesh) { o.material = pick(child.name); o.frustumCulled = false; } });
        const target = lang === 'ES' ? es : en;
        /* Face and shadow ride in one row group, so stackBlock() below sees a
           line as a single object rather than two overlapping ones. */
        const row = new THREE.Group();
        row.name = child.name;
        if (shadow) {
          const sh = child.clone(true);
          sh.traverse((o) => { if (o.isMesh) { o.material = shadow; o.frustumCulled = false; } });
          sh.position.x += offXY; sh.position.z -= offZ; sh.position.y -= offXY;
          row.add(sh);
        }
        row.add(child);
        target.add(row);
      }
      holder.add(en, es);
      place(holder, en, es);
      refits.push(() => place(holder, en, es));
      scene.add(holder);
      const setLang = () => {
        const isEs = document.documentElement.lang === 'es';
        en.visible = !isEs; es.visible = isEs;
      };
      setLang();
      new MutationObserver(setLang).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      done(holder, en, es);
    }, undefined, (err) => console.warn('[scene]', url, 'failed to load', err));
  }

  /* Where the opening frame is looking, and how wide the frame is out there. */
  function viewAxis(D) {
    const p0 = pathPos.getPoint(0, new THREE.Vector3());
    const l0 = pathLook.getPoint(0, new THREE.Vector3());
    const dir = l0.clone().sub(p0).normalize();
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(KEYS[0].fov) / 2) * D;
    return { p0, at: p0.clone().addScaledVector(dir, D), frameH: h, frameW: h * (window.innerWidth / window.innerHeight) };
  }

  /* What the headline settled on, so the stat row can hang off the title
     rather than off the frame. On a portrait phone the frame is barely half as
     wide as it is tall: a stat row parked at a fixed fraction of frame HEIGHT
     ended up an entire title away from a title that had itself shrunk. */
  const hero = { drop: null, titleW: null, refitStats: null };
  const headline = { en: null, es: null, mats: [inkMat, redMat], group: null };
  {
    const oldLoad = null; void oldLoad;

    loadTextBlock('models/headline.glb',
      // "Spain at" red, "Silicon Valley" black, the event line gold
      (name) => (name.endsWith('_0') ? redMat : name.endsWith('_2') ? goldMat : inkMat),
      (holder, en, es) => {
        holder.position.set(0, 0, 0); holder.rotation.set(0, 0, 0); holder.scale.setScalar(1);
        /* This runs again on every resize, and es carries an offset from the last
           pass — leave it in and setFromObject measures its children through it,
           so the alignment below would drift a little further each time. */
        en.position.set(0, 0, 0); es.position.set(0, 0, 0);
        holder.updateMatrixWorld(true);
        const v = viewAxis(34);
        const V3 = () => new THREE.Vector3();
        const bs = new THREE.Box3().setFromObject(en).getSize(V3());
        /* Leading in world units, so it can be reasoned about against the near
           plane rather than against a cap height that changes with the viewport. */
        /* The upper band is the one the camera threads, so it answers to the
           near plane. The lower one is only typography and can close right up. */
        /* Width first. Hold the title at the size the opening was asked to
           start at, but never let it run past 88% of the frame — which is what
           binds in portrait, where 51% of a narrow frame was a title a third
           the size it should be. */
        const WFRAC = clamp(0.51 * 1.94 / Math.max(v.frameW / v.frameH, 0.2), 0.51, 0.82);
        const hs = en.children.map((c) => new THREE.Box3().setFromObject(c).getSize(V3()).y);
        const sumH = hs.reduce((a, b) => a + b, 0);
        const capH = Math.max.apply(null, hs);
        /* The band the camera threads has to clear the near plane whatever the
           viewport — 2*tan(60/2)*0.25 — but above that floor both bands are
           proportional to the type, so the block keeps its proportions when the
           title shrinks. Fixed world leading made the gaps enormous on a phone. */
        const NEARH = 2 * Math.tan(THREE.MathUtils.degToRad(60) / 2) * camera.near;
        const fit1 = (kk) => {
          const cap = capH * kk;
          const up = Math.max(cap * 0.26, NEARH * 1.35);
          return { up, low: cap * 0.17, h: sumH * kk + up + cap * 0.17 };
        };
        let k = (v.frameW * WFRAC) / Math.max(bs.x, 0.001);
        let f = fit1(k);
        if (f.h > v.frameH * 0.66) { k *= (v.frameH * 0.66) / f.h; f = fit1(k); }
        const leads = (i) => (i === 0 ? f.up : f.low) / k;
        const lay = stackBlock(en, leads);
        const layEs = stackBlock(es, leads);
        /* Thread the band between "Spain at" and "Silicon Valley", not the one
           beneath it. Whichever band is pinned lands dead centre of frame — the
           camera flies straight down this axis — and with the lower one pinned,
           two big lines plus their leading all stacked above centre, which drove
           "Spain at" up into the navigation bar. Pinning the upper band puts the
           block's own centre within about 5% of the frame's. */
        const gapY = lay.gaps[0] !== undefined ? lay.gaps[0] : 0;
        /* Spanish lines are a different height, so its slot sits at its own y.
           Assigned, not accumulated: this runs again on every resize. */
        es.position.y = gapY - (layEs.gaps[0] !== undefined ? layEs.gaps[0] : 0);

        holder.position.copy(v.at);
        holder.lookAt(v.p0);
        holder.scale.setScalar(k);
        /* Slide the block so that band lands on the flight path: the camera runs
           straight down this axis and would otherwise plough through the inside
           of a letterform. */
        holder.translateY(-gapY * k);
        /* How far the block's foot sits below the view axis, and how wide the
           title came out — the stat row is placed against both. */
        hero.drop = gapY * k + lay.height * k;
        hero.titleW = bs.x * k;
        if (hero.refitStats) hero.refitStats();
      },
      (holder, en, es) => { headline.group = holder; headline.en = en; headline.es = es; }, shadowDark);
  }

  /* ================= 3D STAT ROW ==================================
     The hero's three figures, same treatment as the headline but set further
     down the view axis and lower in frame — so the flight passes the title
     first and the numbers a moment later, giving the opening real depth. */
  /* Light on dark rather than dark on light: these sit low in frame where the
     bridge itself passes behind them, and ink-on-red was unreadable. */
  const numMat = new THREE.MeshStandardMaterial({ color: 0xF7F4ED, roughness: 0.36, metalness: 0.1 });
  const labMat = goldMat;
  const stats3d = { mats: [numMat, labMat], group: null };
  loadTextBlock('models/stats.glb',
    (name) => (name.indexOf('_L') > 0 ? numMat : numMat),   // labels in cream too; gold read as mud at this size
    (holder, en, es) => {
      holder.position.set(0, 0, 0); holder.rotation.set(0, 0, 0); holder.scale.setScalar(1);
      holder.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(en);
      const bs = bb.getSize(new THREE.Vector3());
      const c = bb.getCenter(new THREE.Vector3());
      if (!en.userData.centred) { en.position.sub(c); es.position.sub(c); en.userData.centred = true; }
      /* Same depth as the title. Set further back, the screen-space offset
         needed to clear the headline worked out to ~18 world units, which put
         the whole row under the sea. At this distance the same drop keeps it
         above the deck and in open sky. */
      const v = viewAxis(34);
      holder.position.copy(v.at);
      holder.lookAt(v.p0);                           // same facing as the title
      /* Sized and placed against the TITLE, not the frame. Both were fractions
         of the frame before, which held on a wide desktop and fell apart in
         portrait: the title shrank to fit a narrow frame while the stat row
         stayed pinned a third of a tall frame below it. */
      const w = (hero.titleW !== null ? hero.titleW * 0.235 : v.frameW * 0.12);
      const sk = w / Math.max(bs.x, 0.001);
      holder.scale.setScalar(sk);
      const drop = (hero.drop !== null ? hero.drop : v.frameH * 0.25);
      holder.translateY(-(drop + bs.y * sk * 0.5 + v.frameH * 0.035));
    },
    (holder, en, es) => {
      stats3d.group = holder;
      /* The headline settles its own scale asynchronously; whichever GLB lands
         second, this makes sure the row is placed against the final title. */
      const myRefit = refits.length - 1;      // captured now; refits keeps growing
      hero.refitStats = () => { if (refits[myRefit]) refits[myRefit](); };
      hero.refitStats();
      void en; void es;
    }, shadowDark);

  /* ================= FINALE =======================================
     The closing message as extruded type standing in front of the headland,
     built exactly like the hero: two big lines the flight runs at and a gold
     event line under them. It replaces a canvas billboard on a gantry, which
     was the last piece of the old page still bolted to the bridge.

     Cream rather than ink for the second line — the hero has open sky behind
     it, this has a green hillside, and ink on that had nothing to separate it. */
  {
    const FINALE_Z = TUNNEL_Z + 7;      // clear of the hillside face at TUNNEL_Z + 2
    /* Own instances. Sharing redMat/goldMat/numMat with the hero would mean the
       finale's fade-in ran on the hero's letters too — the gold event line sits
       on goldMat, so it would have been invisible at the opening. */
    const fRed = redMat.clone(), fCream = numMat.clone(), fGold = goldMat.clone(), fShade = shadowDark.clone();
    loadTextBlock('models/finale.glb',
      (name) => (name.endsWith('_0') ? fRed : name.endsWith('_2') ? fGold : fCream),
      (holder, en, es) => {
        holder.position.set(0, 0, 0); holder.rotation.set(0, 0, 0); holder.scale.setScalar(1);
        en.position.set(0, 0, 0); es.position.set(0, 0, 0);
        holder.updateMatrixWorld(true);
        const V3 = () => new THREE.Vector3();
        const bs = new THREE.Box3().setFromObject(en).getSize(V3());
        /* Width against the frame at the arrival distance, so it holds its
           proportions on a phone the same way the hero does. */
        const D = Math.abs(-84 - FINALE_Z);
        const frameH = 2 * Math.tan(THREE.MathUtils.degToRad(54) / 2) * D;
        const frameW = frameH * (window.innerWidth / window.innerHeight);
        const WFRAC = clamp(0.72 * 1.94 / Math.max(frameW / frameH, 0.2), 0.72, 0.94);
        const hs = en.children.map((c) => new THREE.Box3().setFromObject(c).getSize(V3()).y);
        const capH = Math.max.apply(null, hs);
        let k = (frameW * WFRAC) / Math.max(bs.x, 0.001);
        const lead = () => ({ up: capH * k * 0.24, low: capH * k * 0.30 });
        let f = lead();
        const total = hs.reduce((a, b) => a + b, 0) * k + f.up + f.low;
        if (total > frameH * 0.42) { k *= (frameH * 0.42) / total; f = lead(); }
        const lay = stackBlock(en, (i) => (i === 0 ? f.up : f.low) / k);
        const layEs = stackBlock(es, (i) => (i === 0 ? f.up : f.low) / k);
        es.position.y = (lay.gaps[0] || 0) - (layEs.gaps[0] || 0);
        holder.scale.setScalar(k);
        /* Sat above the concrete headwall, so the type reads against the green
           bank and the mouth stays open underneath it — the point of the shot. */
        holder.position.set(0, 8.4 + lay.height * k, FINALE_Z);
      },
      (holder, en) => {
        finale.group = holder;
        holder.traverse((o) => { if (o.isMesh && finale.mats.indexOf(o.material) < 0) finale.mats.push(o.material); });
        void en;
      }, fShade);
  }

  /* ================= SKY KEYFRAMES ================================ */
  /* Full daylight the whole way through — the light shifts from clear morning
     to a warm late afternoon, but it never goes dark. The sun stays well up so
     no stage of the flight turns into a sunset. */
  const KEYS = [
    { t: 0.00, zen: 0x2C82D6, hor: 0xDCEDF9, horC: 0xCBE2F4, gnd: 0x4A85B4, sun: 0xFFFBEF, pow: 900,
      fog: 0xDCEBF7, den: 0.0030, keyC: 0xFFF8EC, keyI: 3.0, ambC: 0xC0D3E4, ambI: 2.2,
      deep: 0x3E93CC, shal: 0x63B4DE, sunDir: [-0.52, 0.46, -0.72], fov: 42,
      cld: 0xFFFFFF, cldS: 0xB8CDE2, cldA: 0.76, ridge: 0x6E8CAE },
    { t: 0.25, zen: 0x2A8CDE, hor: 0xE2F1FB, horC: 0xD2E7F6, gnd: 0x4C8AB8, sun: 0xFFFFFA, pow: 950,
      fog: 0xE0EEF9, den: 0.0032, keyC: 0xFFFCF4, keyI: 3.1, ambC: 0xC6D8E8, ambI: 2.25,
      deep: 0x3F97D0, shal: 0x68B8E0, sunDir: [-0.44, 0.54, -0.72], fov: 48,
      cld: 0xFFFFFF, cldS: 0xBCD1E5, cldA: 0.80, ridge: 0x718FB1 },
    { t: 0.50, zen: 0x2793E4, hor: 0xE8F4FC, horC: 0xDAECF8, gnd: 0x5090BE, sun: 0xFFFFFF, pow: 980,
      fog: 0xE6F1FA, den: 0.0034, keyC: 0xFFFFFF, keyI: 3.2, ambC: 0xCBDCEA, ambI: 2.3,
      deep: 0x419BD4, shal: 0x6CBBE2, sunDir: [-0.34, 0.60, -0.72], fov: 58,
      cld: 0xFFFFFF, cldS: 0xBFD4E7, cldA: 0.82, ridge: 0x7594B6 },
    { t: 0.80, zen: 0x2A8AD8, hor: 0xF2EFE6, horC: 0xD6E8F6, gnd: 0x5292BE, sun: 0xFFFDF2, pow: 800,
      fog: 0xEDECE4, den: 0.0034, keyC: 0xFFFAEC, keyI: 3.2, ambC: 0xCEDAE6, ambI: 2.3,
      deep: 0x4098D0, shal: 0x6DBAE0, sunDir: [-0.30, 0.50, -0.80], fov: 60,
      cld: 0xFFFFFF, cldS: 0xC2D3E4, cldA: 0.80, ridge: 0x7893B2 },
    /* Arrival: late afternoon. Warmer light and a longer sun, still full day. */
    { t: 1.00, zen: 0x2E86CE, hor: 0xFBE3C4, horC: 0xB9D2EC, gnd: 0x5691BA, sun: 0xFFF0D2, pow: 620,
      fog: 0xF0E0CC, den: 0.0034, keyC: 0xFFEFD4, keyI: 3.1, ambC: 0xD2DCE6, ambI: 2.25,
      deep: 0x4194C8, shal: 0x6FB6DC, sunDir: [-0.26, 0.38, -0.88], fov: 54,
      cld: 0xFFF4E4, cldS: 0xBACBDF, cldA: 0.76, ridge: 0x7B94B0 },
  ];

  // pre-build Colors so no allocation happens per frame
  KEYS.forEach((k) => {
    k.cZen = new THREE.Color(k.zen); k.cHor = new THREE.Color(k.hor); k.cGnd = new THREE.Color(k.gnd);
    k.cHorC = new THREE.Color(k.horC); k.cShal = new THREE.Color(k.shal);
    k.cCld = new THREE.Color(k.cld); k.cCldS = new THREE.Color(k.cldS); k.cRidge = new THREE.Color(k.ridge);
    k.cSun = new THREE.Color(k.sun); k.cFog = new THREE.Color(k.fog); k.cKey = new THREE.Color(k.keyC);
    k.cAmb = new THREE.Color(k.ambC); k.cDeep = new THREE.Color(k.deep);
    k.vSun = new THREE.Vector3(...k.sunDir).normalize();
  });

  const sunDir = new THREE.Vector3();
  const TMP_HAZE = new THREE.Color(), TMP_ROCK = new THREE.Color();
  function applySky(p) {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const f = smooth(a.t, b.t, p);

    SKY_UNIFORMS.uZenith.value.copy(a.cZen).lerp(b.cZen, f);
    SKY_UNIFORMS.uHorizon.value.copy(a.cHor).lerp(b.cHor, f);
    SKY_UNIFORMS.uHorizCool.value.copy(a.cHorC).lerp(b.cHorC, f);
    SKY_UNIFORMS.uGround.value.copy(a.cGnd).lerp(b.cGnd, f);
    SKY_UNIFORMS.uSunCol.value.copy(a.cSun).lerp(b.cSun, f);
    SKY_UNIFORMS.uSunPow.value = a.pow + (b.pow - a.pow) * f;
    sunDir.copy(a.vSun).lerp(b.vSun, f).normalize();
    SKY_UNIFORMS.uSunDir.value.copy(sunDir);

    SKY_UNIFORMS.uCloud.value.copy(a.cCld).lerp(b.cCld, f);
    SKY_UNIFORMS.uCloudSh.value.copy(a.cCldS).lerp(b.cCldS, f);
    SKY_UNIFORMS.uCloudAmt.value = a.cldA + (b.cldA - a.cldA) * f;

    // headlands take their haze straight from the sky they stand against
    const hz = TMP_HAZE.copy(a.cHorC).lerp(b.cHorC, f);
    const rk = TMP_ROCK.copy(a.cRidge).lerp(b.cRidge, f);
    for (const u of RIDGE_UNIFORMS) {
      u.uBase.value.copy(hz);
      u.uPeak.value.copy(rk).lerp(hz, u.haze);
    }

    WATER_UNIFORMS.uDeep.value.copy(a.cDeep).lerp(b.cDeep, f);
    WATER_UNIFORMS.uShallow.value.copy(a.cShal).lerp(b.cShal, f);
    WATER_UNIFORMS.uHorizon.value.copy(a.cHor).lerp(b.cHor, f);
    WATER_UNIFORMS.uSunCol.value.copy(a.cSun).lerp(b.cSun, f);

    scene.fog.color.copy(a.cFog).lerp(b.cFog, f);
    scene.fog.density = a.den + (b.den - a.den) * f;

    key.color.copy(a.cKey).lerp(b.cKey, f);
    key.intensity = a.keyI + (b.keyI - a.keyI) * f;
    key.position.copy(sunDir).multiplyScalar(200);
    amb.color.copy(a.cAmb).lerp(b.cAmb, f);
    amb.intensity = a.ambI + (b.ambI - a.ambI) * f;

    const fov = a.fov + (b.fov - a.fov) * f;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  /* ================= CARD FOCUS ==================================
     Clicking a portrait takes the camera off the scroll path and flies it in
     to face that card, which flips to its profile side. The scroll position is
     untouched, so releasing drops the flight back exactly where it was. */
  const rayc = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const focusPanel = document.getElementById('cardPanel');
  const focusLink = document.getElementById('cardLinkedinAt');   // the wrapper; see styles.css
  const LINK_P = new THREE.Vector3();
  const focusName = document.getElementById('cardName');
  const focusRole = document.getElementById('cardRole');
  let focused = null;                       // the card entry, or null
  let flipped = false;                      // has the focused card been turned over?
  /* The pose the camera is currently holding, and the one it is easing toward.
     Stepping between speakers only moves the target, so the camera glides
     across rather than cutting. */
  const focusPos = new THREE.Vector3(), focusLook = new THREE.Vector3();
  const focusPosTo = new THREE.Vector3(), focusLookTo = new THREE.Vector3();
  const focusVel = new THREE.Vector3(), focusLookVel = new THREE.Vector3(), SPRING_T = new THREE.Vector3();
  let focusPrimed = false;
  let focusK = 0;                           // 0 = on the path, 1 = fully on the card

  let sharp = null;                         // the one card currently at focus resolution
  const sharpen = (entry) => {
    if (sharp === entry) return;
    if (sharp && sharp.hi) sharp.hi(false);
    sharp = entry;
    if (sharp && sharp.hi) sharp.hi(true);
  };

  function openCard(entry) {
    /* Deliberately does NOT flip. The portrait comes forward first with a
       prompt, so turning it over stays the reader's move rather than something
       that happens at them. */
    if (focused && focused !== entry) focused.target = 0;
    focused = entry;
    sharpen(entry);
    flipped = false;
    entry.target = 0;
    const w = new THREE.Vector3();
    entry.card.getWorldPosition(w);
    focusLookTo.copy(w);
    /* Close enough that the flipped side is readable — it carries a role, a
       name and a paragraph. Solved rather than fixed at 2.5: on a portrait
       phone the frame is narrower than it is tall, and a distance that framed
       the card on a desktop cropped its sides off. */
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const dH = (CARD_H * 1.34) / (2 * tan);
    const dW = (CARD_W * 1.30) / (2 * tan * Math.max(camera.aspect, 0.2));
    focusPosTo.set(w.x, w.y, w.z + Math.max(dH, dW, 0.9));
    if (!focusPrimed) {            // first open: start from the target, the
      focusPos.copy(focusPosTo);   // focusK ramp already provides the ease-in
      focusLook.copy(focusLookTo);
      focusPrimed = true;
    }
    const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
    const t = entry.sp[lang] || entry.sp.en;
    if (focusName) focusName.textContent = t.n;
    if (focusRole) focusRole.textContent = t.r;
    if (focusPanel) focusPanel.hidden = false;
    document.body.classList.add('card-open');
    document.body.classList.remove('card-flipped');
    chrome();
  }

  /* Hands the DOM controls the state they render from: which way the exit
     button should read, and whether there is a profile to link to. */
  const chrome = () => window.__cardChrome && window.__cardChrome({
    flipped,
    url: (focused && focused.sp && focused.sp.url) || null,
    /* Which way there is somewhere to go, so the controls can grey out at the
       edges of the wall instead of silently doing nothing. */
    can: focused ? {
      l: !!cardAt(focused.col - 1, focused.row), r: !!cardAt(focused.col + 1, focused.row),
      u: !!cardAt(focused.col, focused.row - 1), d: !!cardAt(focused.col, focused.row + 1),
    } : null,
  });

  function flipCard() {
    if (!focused) return;
    flipped = !flipped;
    focused.target = flipped ? Math.PI : 0;
    document.body.classList.toggle('card-flipped', flipped);
    chrome();
  }
  const cardAt = (col, row) => {
    for (let i = 0; i < cards.length; i++) if (cards[i].col === col && cards[i].row === row) return cards[i];
    return null;
  };
  function stepCard(dx, dy) {
    if (!focused) return;
    const next = cardAt(focused.col + dx, focused.row + dy);
    if (next && next !== focused) openCard(next);
  }
  window.__flipCard = flipCard;
  window.__stepCard = stepCard;
  function closeCard() {
    if (focused) focused.target = 0;
    sharpen(null);
    focused = null;
    flipped = false;
    focusPrimed = false;
    if (focusPanel) focusPanel.hidden = true;
    document.body.classList.remove('card-open', 'card-flipped');
  }
  window.__closeCard = closeCard;

  /* Listen on the window, not the canvas: the stage sits at z-index 0 beneath
     the content layer, so pointer events never reach it directly. Anything the
     user could legitimately be clicking instead is skipped first. */
  const overUI = (e) => e.target.closest && e.target.closest('a, button, input, .cardui__foot, .nav');
  window.addEventListener('pointerdown', (e) => {
    if (overUI(e)) return;                  // let the panel's own buttons work
    if (!gallery.g || !gallery.g.visible) return;
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    rayc.setFromCamera(ndc, camera);
    const hit = rayc.intersectObjects(cards.map((c) => c.card), false)[0];
    /* Anywhere that is not a card is the way out — no aiming for a small
       control. Only meaningful while something is focused. */
    if (!hit) { if (focused) { e.preventDefault(); closeCard(); } return; }
    const entry = cards.find((c) => c.card === hit.object);
    if (!entry) return;
    e.preventDefault();
    if (focused === entry) flipCard();       // second click turns it over
    else openCard(entry);
  });
  const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  window.addEventListener('keydown', (e) => {
    if (!focused) return;
    if (e.key === 'Escape') { closeCard(); return; }
    const m = ARROWS[e.key];
    if (m) { e.preventDefault(); stepCard(m[0], m[1]); }
  });

  /* A pointer over a card should look clickable. */
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  window.addEventListener('pointermove', (e) => {
    if (!finePointer) return;               // touch has no hover to preview
    if (focused || overUI(e)) { canvas.style.cursor = ''; document.body.style.cursor = ''; return; }
    if (!gallery.g || !gallery.g.visible) { document.body.style.cursor = ''; return; }
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    rayc.setFromCamera(ndc, camera);
    document.body.style.cursor = rayc.intersectObjects(cards.map((c) => c.card), false).length ? 'pointer' : '';
  }, { passive: true });

  /* ================= SCROLL + POINTER ============================= */
  /* Scroll maps straight to path parameter. There used to be a warp here that
     traversed the band around the speaker wall at a third of the usual rate, so
     the reader got a beat to look at it — but it was piecewise linear, and its
     slope changed by a factor of three at each end of the band. Those two
     corners sat at scroll 0.48 and 0.77, which is the middle of the glide from
     the venue to the speakers and from the wall to the format: the camera
     tripled and un-tripled its speed halfway through two of the five
     transitions. That was the bump.

     The hold is not needed any more either — the wall has a station of its own
     now, so the reader stops there rather than being slowed past it. Every
     threshold downstream compares against this same number, so removing the
     warp shifts nothing: it only changes how much scrolling separates the
     stops. */
  /* Where the flight has something to stop and look at. main.js steps between
     these rather than letting the page scroll freely — one gesture, one frame.
     Given as scroll fractions, so the warp above is already accounted for.

     Found by searching the path for a camera z rather than written as scroll
     numbers: the path can be re-shaped without these silently drifting off the
     things they are meant to be looking at. Scroll fraction and path parameter
     are the same number, so these are both. */
  const tForZ = (z) => {                       // path z runs 94 down to -84, monotone
    let lo = 0, hi = 1, p = new THREE.Vector3();
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (pathPos.getPoint(mid, p).z > z) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  };
  /* Close enough to read the names. Solved rather than fixed: the wall is six
     units across and the cards run from y 1.6 to 4.5, and a distance that frames
     that on a wide desktop crops half the faces off a portrait phone. fov is ~59
     where this station sits (between the 0.50 and 0.80 sky keyframes); 57 leaves
     a little margin. */
  const galleryStation = () => {
    const tan = Math.tan(THREE.MathUtils.degToRad(57) / 2);
    const a = Math.max(window.innerWidth / window.innerHeight, 0.35);
    const d = Math.max(6.6 / (2 * tan * a), 3.6 / (2 * tan), 2.6);
    /* Eighteen cards six columns wide cannot all be legible in a portrait
       frame — fitting the full width put a phone thirteen units back, where the
       faces were thumbnails. Closer, with the outer columns running off the
       sides: the wall is an overview and reading happens on the card you tap. */
    return GALLERY_Z + (a < 1.05 ? Math.min(d, 6.2) : d);
  };
  /* Same solve for the roadside messages: the block is SIGN_W across and about
     1.6 tall with its leading, and the stations sat far enough back that it read
     as a caption rather than a statement. This brings it to about 70% of frame
     width on a desktop, and backs off on narrow viewports so it never crops. */
  const signStation = (z) => {
    const tan = Math.tan(THREE.MathUtils.degToRad(56) / 2);
    const a = Math.max(window.innerWidth / window.innerHeight, 0.35);
    /* 1.42 put the block at 70% of frame width, which is 37 degrees off axis
       at each end — far enough out that rectilinear projection visibly
       stretches the outer letters and turns their extruded sides toward you.
       1.68 is 59% and 31 degrees, which reads flat again. */
    return z + Math.max((SIGN_W * 1.68) / (2 * tan * a), 2.4 / (2 * tan), 2.6);
  };
  const buildStations = () => {
    /* The fade ranges are derived from where the flight actually stops, not
       written down. They were fixed at 18 -> 8, which is right when a station
       sits 3 units from its subject and useless when it sits 14: a phone framed
       every message at 30% opacity, because it was standing further back than
       the distance at which the thing had finished appearing. Fully up as the
       station is reached, and nothing at all until the step before it. */
    const dSign = signStation(0), dGal = galleryStation() - GALLERY_Z;
    for (let i = 0; i < signUnits.length; i++) {
      const u = signUnits[i];
      const d = u.kind === 'gallery' ? dGal : dSign;
      u.near = d + 1.2;
      u.far = d + 11;
      u.last = -1;                 // the range moved; force the next frame to repaint it
    }
    const before = window.__stations;
    window.__stations = [
      0,                            // the hero, title and bay
      tForZ(signStation(30)),       // on the deck, "La sede / Google HQ"
      tForZ(signStation(12)),       // "En escena / Los ponentes"
      tForZ(galleryStation()),      // the wall — eighteen faces, close enough to read
      tForZ(signStation(-40)),      // "Dos días / Solo con invitación"
      1,                            // the arrival, closing title over the portal
    ];
    /* main.js runs before this module and needs to know when the real numbers
       have landed — it was guessing with a timeout. */
    if (!before) window.dispatchEvent(new Event('stations'));
  };
  buildStations();

  let progress = 0, eased = 0, zoneTop = 0, zoneTotal = 1;
  /* Measured on resize, read per frame. Reading the rect inside a scroll
     listener meant the camera was driven by a signal the browser coalesces and
     delivers late — while the page was being scrolled FROM a frame callback.
     Several frames would share a stale value and then take the accumulated jump
     in one go, which is a jerk you can see. window.scrollY is current every
     frame and forces no layout. */
  const measureZone = () => {
    const r = zone.getBoundingClientRect();
    zoneTop = r.top + window.scrollY;
    zoneTotal = Math.max(r.height - window.innerHeight, 1);
  };
  /* And re-measured whenever the zone's own box moves, not just on a window
     resize. It changes after init more than once: `stage-on` takes the hero and
     arrival copy out of flow the moment WebGL is confirmed, and the webfonts
     reflow what is left. Cached from init, the total came out a couple of per
     cent short — and progress is scroll DIVIDED by it, so every station
     overshot. main.js scrolls to the right pixel either way, which is what made
     it look like the stations themselves had moved. */
  if ('ResizeObserver' in window) new ResizeObserver(measureZone).observe(zone);
  window.addEventListener('load', measureZone);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureZone);
  const readProgress = () => { progress = clamp((window.scrollY - zoneTop) / zoneTotal, 0, 1); };

  const mouse = { x: 0, y: 0 }, drift = { x: 0, y: 0 };
  /* Mouse only. pointermove fires for touch too, so on a phone the first tap
     parked the camera off-axis and left the hero title sitting a few per cent
     left of centre with no way to bring it back — there is no pointer to move
     away. A finger is not a hovering cursor. */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    /* Phones are fill-rate bound long before they are geometry bound, so cap
       the buffer harder on small screens than on a desktop display. */
    /* Raised from 1.75 on anything but a phone: at 1.75 a 2x display renders
       12% under its own resolution, which is a soft edge on every card face
       before the texture even comes into it. On a phone it goes the other way —
       buffer memory is the square of this number. */
    const cap = SMALL ? 1.25 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    for (let i = 0; i < refits.length; i++) refits[i]();
    buildStations();          // the wall's viewing distance answers to the aspect
    measureZone();
    readProgress();
  }
  window.addEventListener('resize', resize); resize();

  let onStage = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { onStage = es[0].isIntersecting; }, { threshold: 0 }).observe(zone);
  }

  /* ================= FRAME LOOP =================================== */
  const clock = new THREE.Clock();
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let firstFrame = true, lastFinaleFade = -1, lastHeadFade = -1, lastT = 0;

  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden || (!onStage && !firstFrame)) return;

    const t = clock.getElapsedTime();
    const dt = Math.min(t - lastT, 0.1); lastT = t;   // clamped so a tab-switch never teleports anything
    readProgress();                                   // current this frame, not last scroll event
    eased += (progress - eased) * 0.085;                 // lag the scroll for weight
    drift.x += (mouse.x - drift.x) * 0.045;
    drift.y += (mouse.y - drift.y) * 0.045;

    applySky(eased);

    // card flips ease toward their target angle
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (Math.abs(c.flip - c.target) > 0.001) {
        c.flip += (c.target - c.flip) * 0.12;
        c.card.rotation.y = c.flip;
      }
      // a gentle sway on the cables, stilled while one is being read
      if (focused === c && !flipped) {
        // a slow tilt back and forth: the card is asking to be turned
        c.card.rotation.y = c.flip + Math.sin(t * 2.1) * 0.13;
        c.hang.rotation.z = Math.sin(t * 2.1) * 0.012;
      } else {
        c.hang.rotation.z = focused ? c.hang.rotation.z * 0.9 : Math.sin(t * 0.7 + c.x) * 0.02;
      }
    }
    /* Critically damped springs rather than per-frame lerps. A raw lerp starts
       at full speed — which is what made stepping between speakers feel like a
       snap — and its rate changes with the frame rate. A spring eases out of
       rest and into it, and dt keeps it honest on a 120Hz display. */
    {
      const d = Math.min(dt, 0.05);
      focusK += ((focused ? 1 : 0) - focusK) * (1 - Math.exp(-d * 3.4));
      if (focused) {
        const w = 3.2, damp = 1 - 2 * w * d;
        SPRING_T.copy(focusPosTo).sub(focusPos).multiplyScalar(w * w * d);
        focusVel.multiplyScalar(damp).add(SPRING_T);
        focusPos.addScaledVector(focusVel, d);
        SPRING_T.copy(focusLookTo).sub(focusLook).multiplyScalar(w * w * d);
        focusLookVel.multiplyScalar(damp).add(SPRING_T);
        focusLook.addScaledVector(focusLookVel, d);
      } else { focusVel.set(0, 0, 0); focusLookVel.set(0, 0, 0); }
    }

    // camera rides the path; the mouse only nudges it
    pathPos.getPoint(eased, camPos);
    pathLook.getPoint(eased, camLook);

    /* Aim up as a message comes level. The camera has to pass through the gap
       UNDER the big line, which pins that gap to the flight line and leaves two
       thirds of the block above it — so looking straight down the road framed
       every sign high, with the kicker up under the navigation bar. Tilting the
       look rather than dropping the block keeps the gap where the camera needs
       it: the camera does not move, only where it points. */
    for (let i = 0; i < roadSigns.length; i++) {
      const rs = roadSigns[i];
      const ahead = camPos.z - rs.z;
      if (ahead < -1.5 || ahead > 16 || rs.rise <= 0) continue;
      /* Peaks where the station sits and releases either side of it. Divided by
         the distance because the same world offset needs a bigger angle the
         closer the sign is. */
      const w = Math.exp(-Math.pow((ahead - 3.0) / 5.0, 2));
      const tilt = Math.min(w * rs.rise / Math.max(ahead, 1.4), 0.16);   // radians
      camLook.y += tilt * camPos.distanceTo(camLook);
    }
    /* Damped harder and earlier than before: on the deck the camera is aimed
       down slots in the lettering only a third of a unit tall, and a nudge
       big enough to be felt out over the water will put it through a serif. */
    const nudge = 1 - smooth(0.28, 0.62, eased) * 0.82;
    const fk = focusK * focusK * (3 - 2 * focusK);   // soft at both ends of the trip in
    if (fk > 0.001) {
      camPos.lerp(focusPos, fk);
      camLook.lerp(focusLook, fk);
    }
    const dz = 1 - fk;
    /* Half the old throw (was 3.4 / 2.0). Enough parallax against the towers
       to read as depth, not enough to feel like the camera is being dragged. */
    camera.position.set(camPos.x + drift.x * 1.7 * nudge * dz, camPos.y - drift.y * 1.0 * nudge * dz, camPos.z);
    camera.lookAt(camLook);

    /* Park the LinkedIn button on the lower half of the focused card. Projected
       from the card's own geometry rather than positioned in CSS, so it lands
       inside the artwork at any viewport and follows the flight in. */
    if (focusLink) {
      const show = !!(focused && flipped && focused.sp && focused.sp.url && fk > 0.5);
      if (focusLink.hidden === show) focusLink.hidden = !show;
      if (show) {
        focused.card.getWorldPosition(LINK_P);
        LINK_P.y -= CARD_H * 0.30;
        LINK_P.project(camera);
        focusLink.style.left = ((LINK_P.x * 0.5 + 0.5) * window.innerWidth).toFixed(1) + 'px';
        focusLink.style.top = ((-LINK_P.y * 0.5 + 0.5) * window.innerHeight).toFixed(1) + 'px';
      }
    }

    if (hint.g) {
      const want = (focused && !flipped) ? 1 : 0;
      if (focused) focused.card.getWorldPosition(hint.at);
      hint.k += (want - hint.k) * (1 - Math.exp(-Math.min(dt, 0.05) * 7));
      const on = hint.k > 0.012 && fk > 0.02;
      if (hint.g.visible !== on) hint.g.visible = on;
      if (on) {
        /* One unhurried tap every ~1.7s: a push in over the first third of the
           cycle, then rest. The ring leaves the tip as the pointer lifts. */
        const cyc = (t * 0.58) % 1;
        const push = cyc < 0.34 ? Math.pow(Math.sin((cyc / 0.34) * Math.PI), 2) : 0;
        /* Low and to the right, clear of the name plate the card carries. */
        hint.g.position.set(hint.at.x + 0.17, hint.at.y - 0.24, hint.at.z + 0.13 - push * 0.06);
        hint.g.lookAt(camera.position);
        hint.g.scale.setScalar(hint.k * (1 - push * 0.09));
        const rp = cyc < 0.34 ? 0 : (cyc - 0.34) / 0.66;
        hint.ring.scale.setScalar(0.10 + rp * 0.26);
        hint.mats.ringMat.opacity = (1 - rp) * (1 - rp) * 0.6 * hint.k;
        hint.mats.skin.opacity = hint.k;
        hint.mats.edge.opacity = hint.k;
      }
    }

    sky.position.copy(camera.position);
    SKY_UNIFORMS.uTime.value = t;
    water.position.x = camera.position.x; water.position.z = camera.position.z;

    for (const b of boats) {
      b.m.position.z += b.dir * b.sp * dt;
      if (b.m.position.z >  320) b.m.position.z = -320;
      if (b.m.position.z < -320) b.m.position.z =  320;
      b.m.position.y = -CFG.waterDrop + Math.sin(t * 1.1 + b.x) * 0.04;
      b.m.rotation.z = Math.sin(t * 0.9 + b.z) * 0.035;
    }
    WATER_UNIFORMS.uTime.value = t;
    WATER_UNIFORMS.uSunX.value = camera.position.x + sunDir.x * 260;

    const wind = 0.45 + drift.x * 0.4 + Math.sin(t * 0.4) * 0.15;
    for (let i = 0; i < flagMats.length; i++) { const u = flagMats[i].uniforms; u.uTime.value = t; u.uWind.value = wind; }

    if (headline.group) {
      /* Gone by the time the camera is through it — it should read as a title
         the flight passes into, not a billboard parked on the bridge. */
      const hv = 1 - smooth(0.15, 0.23, eased);   // hold until the camera is past the letters
      if (headline.group.visible !== hv > 0.004) headline.group.visible = hv > 0.004;
      if (hv !== lastHeadFade) {
        lastHeadFade = hv;
        for (let i = 0; i < headline.mats.length; i++) {
          const m = headline.mats[i]; m.transparent = hv < 0.999; m.opacity = hv; m.depthWrite = hv > 0.5;
        }
      }
    }

    if (stats3d.group) {
      const sv3 = 1 - smooth(0.17, 0.25, eased);
      if (stats3d.group.visible !== sv3 > 0.004) stats3d.group.visible = sv3 > 0.004;
    }

    /* The arrival is the payoff, so the closing title stays out of the haze
       until the flight is most of the way down the deck. */
    if (finale.group) {
      /* Late. With the flight stepping station to station, 0.62-0.82 had the
         closing title three quarters up behind "Dos días" — two messages
         competing in one frame. It belongs to the last hop only. */
      const pv = smooth(0.84, 0.96, eased);
      if (finale.group.visible !== pv > 0.002) finale.group.visible = pv > 0.002;
      if (pv !== lastFinaleFade) {
        for (let i = 0; i < finale.mats.length; i++) {
          const m = finale.mats[i];
          if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
          const o = pv * m.userData.baseOpacity;
          m.transparent = o < 0.999; m.opacity = o; m.depthWrite = o > 0.5;
        }
        lastFinaleFade = pv;
      }
    }

    /* Each unit comes up only as the camera closes on it, and nothing else is
       up at the same time: the ranges are shorter than the spacing down the
       deck, so the flight meets the programme one piece at a time rather than
       reading it all at once through the truss. Only the flags carry from the
       hero.

       This used to sit inside `if (signs.visible)`, gated on a Group that had
       been emptied when the canvas gantries went. It defaulted to visible:true
       and sv is 0 at the hero, so the very first frame set it false and the
       loop below never ran once — every sign and card stayed at opacity 1 until
       the camera reached 22% scroll and switched it back on. */
    for (let i = 0; i < signUnits.length; i++) {
      const u = signUnits[i];
      /* Distance only. This used to be multiplied by sv, the scroll-position
         ramp, which held a sign at a third of its opacity at the very moment
         the camera drew level with it. Spacing down the deck (30, 12, -6, -40)
         is wider than the ramp, so each piece now has the road to itself. */
      const op = smooth(u.far, u.near, camPos.z - u.z);
      if (u.last === op) continue;
      u.last = op;
      u.g.visible = op > 0.004;
      for (let k = 0; k < u.mats.length; k++) {
        const m = u.mats[k];
        /* Some of these start translucent — the letter shadows sit at 0.42 —
           so fade against each material's own base rather than overwriting it. */
        if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
        const o = op * m.userData.baseOpacity;
        m.transparent = o < 0.999; m.opacity = o; m.depthWrite = o > 0.5;
      }
    }

    for (let i = 0; i < traffic.length; i++) {
      const v = traffic[i];
      v.position.z += v.userData.sp * dt;     // sp is units/second, signed by heading
      if (v.position.z > v.userData.hi) v.position.z = v.userData.lo;
      if (v.position.z < v.userData.lo) v.position.z = v.userData.hi;
    }

    for (let i = 0; i < flocks.length; i++) {
      const fl = flocks[i], c = fl.cfg;
      fl.mixer.update(dt);
      fl.t += c.sp * dt;
      fl.f.position.set(
        camPos.x + c.offX + Math.cos(fl.t) * c.r,
        c.y + Math.sin(fl.t * 1.7) * 1.8,
        camPos.z - c.ahead + Math.sin(fl.t) * c.r * 0.6
      );
      fl.f.rotation.y = -fl.t;                       // face along the circle
      fl.f.rotation.z = c.tilt;                      // bank into the turn
    }

    if (CFG.debug && window.__stage) { window.__stage.cam = camera.position.toArray(); window.__stage.look = camLook.toArray(); window.__stage.t = eased; }
    renderer.render(scene, camera);
    if (firstFrame && deckReady) { firstFrame = false; canvas.classList.add('is-on'); }
  }
  readProgress();
  frame();
}

if (canvas && zone && !reduce) init();
