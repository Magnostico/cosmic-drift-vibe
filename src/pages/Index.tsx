import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';
import { SpaceAudioEngine } from '../lib/spaceAudio';
import { dampingFactor, explosionScale, FLIGHT_TUNING, gearForThrust, VESSEL_SCALE } from '../lib/flightTuning';
import { calculateMissionProgress, formatMissionDistance, getMissionByIndex, type Mission } from '../lib/missions';
import '../styles/universe.css';

const Index = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container || initialized.current) return;
    initialized.current = true;

    // ════════════════════════════════════════════════════════════
    //  UNIVERSE V3.0 — STELLAR EDITION
    // ════════════════════════════════════════════════════════════

    // Preserve existing camera calibration; actual hull dimensions are independent.
    const TARGET_SHIP_SIZE = 0.045;
    const GLOBAL_SPEED_SCALE = 0.01;
    const G_CONSTANT = 0.0000008;
    const animationGroup = new TWEEN.Group();
    let animationTime = 0;
    const visualTokens = getComputedStyle(document.documentElement);
    const sceneColor = (name: string) => visualTokens.getPropertyValue(name).trim();

    let activeScene = 'milkyWay';
    let flightModeActive = false;
    let timeMultiplier = 1;
    let gravityEnabled = false;
    let showOrbits = false;
    let orreryMode = false;
    let isTransitioning = false;
    let toastTimeout: ReturnType<typeof setTimeout>;
    const audio = new SpaceAudioEngine();
    let audioInitialized = false;
    const initAudio = () => { if (!audioInitialized) { audio.init(); audioInitialized = true; } };

    // ── RENDERER ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.0000005, 3000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const cameraLight = new THREE.PointLight(0xffffff, 0, 100);
    camera.add(cameraLight);

    const clock = new THREE.Clock();

    // ════════════════════════════════════════════════════════════
    //  MILKY WAY
    // ════════════════════════════════════════════════════════════
    const sceneMW = new THREE.Scene();
    sceneMW.fog = new THREE.FogExp2(0x000000, 0.018);
    const mwGroup = new THREE.Group();
    sceneMW.add(mwGroup);

    function createParticleTex() {
      const c = document.createElement('canvas'); c.width = 32; c.height = 32;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(16,16,0,16,16,16);
      g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.4,'rgba(255,255,255,0.3)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,32,32);
      return new THREE.CanvasTexture(c);
    }

    const mwGeo = new THREE.BufferGeometry();
    const mwPos = new Float32Array(80000 * 3);
    const mwCol = new Float32Array(80000 * 3);
    for (let i = 0; i < 80000; i++) {
      const i3 = i * 3;
      const r = Math.pow(Math.random(), 0.5) * 8;
      const spin = r * 1.5;
      const branch = ((i % 5) / 5) * Math.PI * 2;
      mwPos[i3]   = Math.cos(branch + spin) * r + (Math.random()-0.5)*0.4*r;
      mwPos[i3+1] = (Math.random()-0.5)*0.12*r;
      mwPos[i3+2] = Math.sin(branch + spin) * r + (Math.random()-0.5)*0.4*r;
      const col = new THREE.Color('#ffb28a').lerp(new THREE.Color('#4fc3f7'), r/8);
      mwCol[i3]=col.r; mwCol[i3+1]=col.g; mwCol[i3+2]=col.b;
    }
    mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPos, 3));
    mwGeo.setAttribute('color', new THREE.BufferAttribute(mwCol, 3));
    mwGroup.add(new THREE.Points(mwGeo, new THREE.PointsMaterial({
      size:0.04, vertexColors:true, map:createParticleTex(),
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false
    })));

    const anchor = new THREE.Object3D(); anchor.position.set(4, 0, 2); mwGroup.add(anchor);

    // ════════════════════════════════════════════════════════════
    //  SOLAR SYSTEM
    // ════════════════════════════════════════════════════════════
    const sceneSS = new THREE.Scene();
    sceneSS.add(new THREE.AmbientLight(sceneColor('--scene-fill'), 1.6));

    const sunLight = new THREE.PointLight(sceneColor('--scene-sunlight'), 5.5, 1200, 0.4);
    sunLight.castShadow = false;
    sceneSS.add(sunLight);

    // Subtle global hemisphere fill to give soft detail on shaded sides of planets
    const hemiLight = new THREE.HemisphereLight(sceneColor('--scene-sky'), sceneColor('--scene-shadow'), 0.9);
    sceneSS.add(hemiLight);

    // Bloom composer
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(sceneSS, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.65, 0.3, 0.9
    );
    composer.addPass(bloomPass);

    const texLoader = new THREE.TextureLoader();
    texLoader.crossOrigin = "Anonymous";

    // ── SUN ──
    const sunMat = new THREE.MeshBasicMaterial({
      map: texLoader.load('https://wsrv.nl/?url=www.solarsystemscope.com/textures/download/2k_sun.jpg&output=jpg')
    });
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(6, 64, 64), sunMat);
    sunMesh.userData = { name:"The Sun", type:"Yellow Dwarf Star", mass:"1.99 × 10³⁰ kg", radius: 12, radiusStr:"696,340 km", period:"—", temp:"5,500°C (surface)", moons:"0" };
    sceneSS.add(sunMesh);

    // Sun corona glow
    const coronaGeo = new THREE.SphereGeometry(7.6, 32, 32);
    const coronaMat = new THREE.ShaderMaterial({
      uniforms: { c: { value: 0.35 }, p: { value: 4.0 }, glowColor: { value: new THREE.Color(0xffbb55) } },
      vertexShader: `
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(vec3(modelViewMatrix * vec4(position, 1.0)));
          intensity = pow(0.65 - dot(vNormal, vNormel), 3.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          gl_FragColor = vec4(glowColor * intensity, intensity * 0.9);
        }`,
      side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    });
    sceneSS.add(new THREE.Mesh(coronaGeo, coronaMat));

    // ── ATMOSPHERE SHADER FACTORY ──
    function createAtmosphere(planetRadius: number, color: string, scale=1.15) {
      const geo = new THREE.SphereGeometry(planetRadius * scale, 32, 32);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          c: { value: 0.4 }, p: { value: 5.0 },
          glowColor: { value: new THREE.Color(color) },
          viewVector: { value: new THREE.Vector3() }
        },
        vertexShader: `
          uniform vec3 viewVector;
          varying float intensity;
          void main() {
            vec3 vNormal = normalize(normalMatrix * normal);
            vec3 vNormel = normalize(normalMatrix * viewVector);
            intensity = pow(max(0.0, 0.5 - dot(vNormal, vNormel)), 4.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 glowColor;
          varying float intensity;
          void main() {
            gl_FragColor = vec4(glowColor, intensity);
          }`,
        side: THREE.FrontSide, blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false
      });
      return new THREE.Mesh(geo, mat);
    }

    // ── RING TEXTURE ──
    function createRingTex(type: string) {
      const c = document.createElement('canvas'); c.width=1024; c.height=1024;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(512,512,0,512,512,512);
      g.addColorStop(0,'rgba(0,0,0,0)');
      if (type === 'saturn') {
        g.addColorStop(0.52,'rgba(0,0,0,0)'); g.addColorStop(0.53,'rgba(200,185,155,0.4)');
        g.addColorStop(0.60,'rgba(225,210,175,0.95)'); g.addColorStop(0.70,'rgba(215,200,165,0.9)');
        g.addColorStop(0.80,'rgba(195,182,148,0.85)'); g.addColorStop(0.83,'rgba(0,0,0,0)');
        g.addColorStop(0.86,'rgba(185,172,140,0.7)'); g.addColorStop(0.93,'rgba(0,0,0,0)');
      } else {
        g.addColorStop(0.74,'rgba(0,0,0,0)'); g.addColorStop(0.75,'rgba(180,210,255,0.15)');
        g.addColorStop(0.85,'rgba(0,0,0,0)'); g.addColorStop(0.88,'rgba(210,235,255,0.8)');
        g.addColorStop(0.92,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0)');
      }
      ctx.fillStyle = g; ctx.fillRect(0,0,1024,1024);
      return new THREE.CanvasTexture(c);
    }

    // ── PLANET DATA ──
    const planetsData = [
      { name:'Mercury', r:0.5,  a:12,  e:0.205,  speed:0.008,   tex:'2k_mercury.jpg',     tilt:0.034,  atm:null as string|null,        mass:'3.30×10²³ kg',  radius:'2,439 km', period:'88 days',  temp:'-180 to 430°C', moons:'0', isEarth:false, ring:false, uranusRing:false },
      { name:'Venus',   r:1.2,  a:18,  e:0.006,  speed:0.003,   tex:'2k_venus_surface.jpg',tilt:177.4, atm:'#ffdd99',   mass:'4.87×10²⁴ kg',  radius:'6,051 km', period:'225 days', temp:'462°C avg',     moons:'0', isEarth:false, ring:false, uranusRing:false },
      { name:'Earth',   r:1.3,  a:26,  e:0.016,  speed:0.002,   tex:'',                    tilt:23.5,  atm:'#5599ff',   mass:'5.97×10²⁴ kg',  radius:'6,371 km', period:'365 days', temp:'-89 to 58°C',  moons:'1', isEarth:true, ring:false, uranusRing:false },
      { name:'Mars',    r:0.7,  a:34,  e:0.093,  speed:0.0016,  tex:'2k_mars.jpg',         tilt:25.2,  atm:'#ff6633',   mass:'6.42×10²³ kg',  radius:'3,389 km', period:'687 days', temp:'-140 to 20°C',  moons:'2', isEarth:false, ring:false, uranusRing:false },
      { name:'Jupiter', r:3.5,  a:52,  e:0.048,  speed:0.0004,  tex:'2k_jupiter.jpg',      tilt:3.1,   atm:'#cc9966',   mass:'1.90×10²⁷ kg',  radius:'71,492 km',period:'12 yrs',   temp:'-110°C (clouds)',moons:'95', isEarth:false, ring:false, uranusRing:false },
      { name:'Saturn',  r:2.8,  a:72,  e:0.056,  speed:0.00018, tex:'2k_saturn.jpg',       tilt:26.7,  atm:'#ddbb88',   mass:'5.68×10²⁶ kg',  radius:'60,268 km',period:'29 yrs',   temp:'-140°C avg',    moons:'146', isEarth:false, ring:true, uranusRing:false },
      { name:'Uranus',  r:2.0,  a:92,  e:0.046,  speed:0.00008, tex:'2k_uranus.jpg',       tilt:97.8,  atm:'#88ddee',   mass:'8.68×10²⁵ kg',  radius:'25,362 km',period:'84 yrs',  temp:'-195°C avg',    moons:'28', isEarth:false, ring:false, uranusRing:true },
      { name:'Neptune', r:1.9,  a:112, e:0.011,  speed:0.00002, tex:'2k_neptune.jpg',      tilt:28.3,  atm:'#4466ff',   mass:'1.02×10²⁶ kg',  radius:'24,622 km',period:'165 yrs',  temp:'-200°C avg',    moons:'16', isEarth:false, ring:false, uranusRing:false },
      { name:'Pluto',   r:0.3,  a:134, e:0.248,  speed:0.000008,tex:'2k_mars.jpg',         tilt:122.5, atm:'#ffaaaa',   mass:'1.30×10²² kg',  radius:'1,188 km', period:'248 yrs',  temp:'-230°C avg',    moons:'5', isEarth:false, ring:false, uranusRing:false },
    ];

    const interactables: THREE.Mesh[] = [sunMesh];
    const ssBodies: any[] = [];
    const atmosphereMeshes: THREE.Mesh[] = [];
    const orbitLineObjects: THREE.Line[] = [];

    planetsData.forEach(d => {
      const sys = new THREE.Object3D();
      sceneSS.add(sys);
      let mat;

      if (d.isEarth) {
        mat = new THREE.MeshStandardMaterial({
          map: texLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg'),
          normalMap: texLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg'),
          roughness: 0.7
        });
      } else {
        const url = 'https://wsrv.nl/?url=www.solarsystemscope.com/textures/download/' + d.tex + '&output=jpg';
        mat = new THREE.MeshStandardMaterial({ map: texLoader.load(url), roughness: 0.85 });
      }

      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), mat);
      mesh.scale.set(d.r, d.r, d.r);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.z = THREE.MathUtils.degToRad(d.tilt);
      mesh.userData = { name:d.name, type:'Planet', radius:d.r,
        mass:d.mass, radiusStr:d.radius, period:d.period, temp:d.temp, moons:d.moons };

      sys.add(mesh);
      interactables.push(mesh);
      ssBodies.push({ type:'planet', system:sys, mesh:mesh, a:d.a, e:d.e, speed:d.speed, angle:Math.random()*6.28, gravMass: d.r * 500 });

      if (d.atm) {
        const atmMesh = createAtmosphere(d.r, d.atm);
        mesh.add(atmMesh);
        atmosphereMeshes.push(atmMesh);
      }

      // Orbit lines
      const orbitPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        const b = d.a;
        orbitPts.push(new THREE.Vector3(
          b * Math.cos(a) - (b * d.e), 0,
          b * Math.sqrt(1 - d.e*d.e) * Math.sin(a)
        ));
      }
      const orbitLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(orbitPts),
        new THREE.LineBasicMaterial({ color: 0x1a3a5a, transparent: true, opacity: 0.5, depthWrite: false })
      );
      orbitLine.visible = false;
      sceneSS.add(orbitLine);
      orbitLineObjects.push(orbitLine);

      // Earth extras
      if (d.isEarth) {
        const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(1.02, 64, 64), new THREE.MeshStandardMaterial({
          map: texLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'),
          transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        mesh.add(cloudMesh);

        const mSys = new THREE.Object3D(); sys.add(mSys);
        const mMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 48, 48), new THREE.MeshStandardMaterial({
          map: texLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg'),
          bumpMap: texLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_bump_1k.jpg'),
          bumpScale: 0.02, roughness: 0.9
        }));
        mMesh.position.x = 3.2;
        mMesh.castShadow = true; mMesh.receiveShadow = true;
        mMesh.userData = { name:'The Moon', type:'Natural Satellite', radius:0.3, mass:'7.35×10²² kg', radiusStr:'1,737 km', period:'27 days', temp:'-173 to 127°C', moons:'0' };
        interactables.push(mMesh);
        mSys.add(mMesh);
        ssBodies.push({ type:'moon', pivot:mSys, speed:0.02, mesh:mMesh, gravMass:10 });
      }

      // Saturn / Uranus rings
      if (d.ring || d.uranusRing) {
        const type = d.ring ? 'saturn' : 'uranus';
        const pSize = type === 'saturn' ? 14 : 10;
        const rMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(pSize, pSize),
          new THREE.MeshStandardMaterial({
            map: createRingTex(type), side: THREE.DoubleSide,
            transparent: true, depthWrite: false, roughness: 0.8
          })
        );
        rMesh.receiveShadow = true;
        if (type === 'saturn') rMesh.rotation.x = Math.PI/2 - 0.46;
        else { rMesh.rotation.x = Math.PI/2; rMesh.rotation.y = Math.PI/2; }
        mesh.add(rMesh);
      }

      // Jupiter: Galilean moons
      if (d.name === 'Jupiter') {
        const galileanMoons = [
          { name:'Io',       dist:5.0, speed:0.12, r:0.35, color:0xddcc88 },
          { name:'Europa',   dist:6.8, speed:0.06, r:0.28, color:0xaabbcc },
          { name:'Ganymede', dist:9.2, speed:0.03, r:0.45, color:0x998877 },
          { name:'Callisto', dist:12.5,speed:0.014,r:0.42, color:0x778899 },
        ];
        galileanMoons.forEach(gm => {
          const gSys = new THREE.Object3D(); sys.add(gSys);
          const gMesh = new THREE.Mesh(new THREE.SphereGeometry(gm.r, 32, 32),
            new THREE.MeshStandardMaterial({ color: gm.color, roughness: 0.9 }));
          gMesh.position.x = gm.dist;
          gMesh.castShadow = true;
          gMesh.userData = { name:gm.name, type:'Galilean Moon', radius:gm.r, mass:'—', radiusStr:'—', period:'—', temp:'—', moons:'0' };
          interactables.push(gMesh);
          gSys.add(gMesh);
          ssBodies.push({ type:'moon', pivot:gSys, speed:gm.speed, mesh:gMesh, gravMass:5 });
        });
      }

      // Saturn: Titan
      if (d.name === 'Saturn') {
        const titanSys = new THREE.Object3D(); sys.add(titanSys);
        const titanMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32),
          new THREE.MeshStandardMaterial({ color: 0xcc9944, roughness: 0.7 }));
        titanMesh.position.x = 9;
        titanMesh.castShadow = true;
        const titanAtm = createAtmosphere(0.5, '#cc7700', 1.3);
        titanMesh.add(titanAtm);
        atmosphereMeshes.push(titanAtm);
        titanMesh.userData = { name:"Titan", type:"Moon", radius:0.5, mass:'1.35×10²³ kg', radiusStr:'2,575 km', period:'16 days', temp:'-179°C avg', moons:'0' };
        interactables.push(titanMesh);
        titanSys.add(titanMesh);
        ssBodies.push({ type:'moon', pivot:titanSys, speed:0.008, mesh:titanMesh, gravMass:8 });
      }
    });

    // ── ASTEROID BELT ──
    const astMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.95 });
    const astBelt = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.1, 0), astMat, 8000);
    const dMat = new THREE.Object3D();
    const asteroidBodies: { pos: THREE.Vector3; radius: number }[] = [];

    for (let i = 0; i < 8000; i++) {
      const dist = 40 + Math.random() * 7; const ang = Math.random() * Math.PI * 2;
      const x = Math.cos(ang) * dist;
      const y = (Math.random() - 0.5) * 2;
      const z = Math.sin(ang) * dist;
      dMat.position.set(x, y, z);
      dMat.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      const s = Math.random() * 0.8 + 0.2; dMat.scale.set(s,s,s);
      dMat.updateMatrix(); astBelt.setMatrixAt(i, dMat.matrix);

      // Store position and bounding radius for physical collision check
      asteroidBodies.push({ pos: new THREE.Vector3(x, y, z), radius: 0.1 * s });
    }
    sceneSS.add(astBelt);

    // ── KUIPER BELT ──
    const kuiperMat = new THREE.MeshStandardMaterial({ color: 0x556688, roughness: 0.95 });
    const kuiperBelt = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.08, 0), kuiperMat, 5000);
    for (let i = 0; i < 5000; i++) {
      const dist = 128 + Math.random() * 20;
      const ang  = Math.random() * Math.PI * 2;
      dMat.position.set(Math.cos(ang)*dist, (Math.random()-0.5)*4, Math.sin(ang)*dist);
      dMat.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      const s = Math.random() * 0.7 + 0.2; dMat.scale.set(s,s,s);
      dMat.updateMatrix(); kuiperBelt.setMatrixAt(i, dMat.matrix);
    }
    sceneSS.add(kuiperBelt);

    // ── STAR FIELD ──
    function makeStarLayer(count: number, rMin: number, rMax: number, size: number, opacity: number) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      const c1 = new THREE.Color(0x0a1c4a);
      const c2 = new THREE.Color(0x3a1a0a);
      const c3 = new THREE.Color(0x88bbff);
      const c4 = new THREE.Color(0xffeedd);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const dd = rMin + Math.random() * (rMax - rMin);
        const ys = (Math.random()-0.5) * (rMin * 0.5);
        pos[i*3] = Math.cos(a)*dd; pos[i*3+1] = ys; pos[i*3+2] = Math.sin(a)*dd;
        const mix = Math.random();
        const c = mix > 0.85 ? c4 : (mix > 0.6 ? c3 : (mix > 0.3 ? c1 : c2));
        col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        size, vertexColors: true, transparent: true, opacity, depthWrite: false
      }));
      pts.rotation.x = Math.PI / 5;
      return pts;
    }
    const starLayer1 = makeStarLayer(18000, 350, 700, 1.8, 0.8);
    const starLayer2 = makeStarLayer(8000, 700, 1500, 2.5, 0.5);
    sceneSS.add(starLayer1);
    sceneSS.add(starLayer2);

    // ════════════════════════════════════════════════════════════
    //  FLIGHT SIMULATOR & SPACE COMBAT SYSTEM
    // ════════════════════════════════════════════════════════════
    const playerShip = new THREE.Group();
    const shipVelocity = new THREE.Vector3();
    const shipAngularVelocity = new THREE.Vector3();
    const keys = { up:false, down:false, left:false, right:false, space:false, q:false, e:false, brake:false, fire:false };
    let engineGlow: THREE.PointLight | null = null;
    let currentThrust = 0.0002;
    let throttleEnvelope = 0;
    let visualBank = 0;
    let trailEmission = 0;
    const gravityAccumulator = new THREE.Vector3();

    // ── PLAYER HEALTH & COMBAT STATS ──
    const PLAYER_MAX_HEALTH = 100;
    let playerHealth = PLAYER_MAX_HEALTH;
    let enemiesKilled = 0;
    let totalScore = 0;
    let currentMissionIndex = 0;
    let lastPlayerShotTime = 0;
    const PLAYER_FIRE_COOLDOWN = 0.16; // rapid dual plasma cannons

    // ════════════════════════════════════════════════════════════
    //  TWEEN.JS COMBAT, DEFLECTOR SHIELD & CINEMATIC CAMERA SYSTEM
    // ════════════════════════════════════════════════════════════
    // 1. Weapon Recoil Kickback
    const recoilState = { z: 0, pitch: 0 };
    function fireWeaponRecoil() {
      new TWEEN.Tween(recoilState, animationGroup)
        .to({ z: 0.007, pitch: -0.012 }, 35)
        .easing(TWEEN.Easing.Quadratic.Out)
        .chain(
          new TWEEN.Tween(recoilState, animationGroup)
            .to({ z: 0, pitch: 0 }, 90)
            .easing(TWEEN.Easing.Back.Out)
        )
        .start(animationTime);
    }

    // 2. Aerodynamic Barrel Roll (Evasive Manoeuvre)
    let isBarrelRolling = false;
    const barrelRollState = { z: 0 };
    function triggerBarrelRoll(direction: 1 | -1) {
      if (isBarrelRolling || isExploded || !flightModeActive) return;
      isBarrelRolling = true;
      initAudio();
      audio.playTransition();
      showToast(`⚡ MANOBRA EVASIVA: BARREL ROLL ${direction > 0 ? 'DIREITA' : 'ESQUERDA'}!`);
      showScorePopup('🛡 EVASÃO: BARREL ROLL!', '#00e5ff');

      barrelRollState.z = 0;
      new TWEEN.Tween(barrelRollState, animationGroup)
        .to({ z: direction * Math.PI * 2 }, 550)
        .easing(TWEEN.Easing.Cubic.Out)
        .onComplete(() => {
          barrelRollState.z = 0;
          isBarrelRolling = false;
        })
        .start(animationTime);
    }

    // 3. Sniper Aim / Target Focus Zoom
    let isAimZoomed = false;
    const fovState = { fov: 60 };
    let aimZoomTween: any = null;
    function setAimZoom(active: boolean) {
      if (isAimZoomed === active || (active && (!flightModeActive || isExploded))) return;
      isAimZoomed = active;
      if (aimZoomTween) aimZoomTween.stop();
      aimZoomTween = new TWEEN.Tween(fovState, animationGroup)
        .to({ fov: active ? 36 : 60 }, 280)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
          camera.fov = fovState.fov;
          camera.updateProjectionMatrix();
        })
        .start(animationTime);

      const crosshair = document.getElementById('flight-crosshair');
      if (crosshair) {
        crosshair.style.transition = 'transform 0.25s ease, border-color 0.25s ease';
        crosshair.style.transform = `translate(-50%, -50%) scale(${active ? 1.4 : 1.0})`;
        crosshair.style.borderColor = active ? '#ff0055' : '#00e5ff';
      }
    }

    // 4. Hexagonal Energy Deflector Shield
    const shieldGeo = new THREE.SphereGeometry(VESSEL_SCALE.playerLength * 0.85, 24, 24);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.visible = false;
    playerShip.add(shieldMesh);

    function triggerShieldPulse() {
      shieldMesh.visible = true;
      shieldMesh.scale.set(0.65, 0.65, 0.65);
      shieldMat.opacity = 0.95;

      new TWEEN.Tween(shieldMesh.scale, animationGroup)
        .to({ x: 1.3, y: 1.3, z: 1.3 }, 320)
        .easing(TWEEN.Easing.Back.Out)
        .start(animationTime);

      new TWEEN.Tween(shieldMat, animationGroup)
        .to({ opacity: 0 }, 380)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
          shieldMesh.visible = false;
        })
        .start(animationTime);
    }

    // 5. Cinematic Floating Score Popup
    function showScorePopup(text: string, color = '#00ffcc') {
      const popup = document.createElement('div');
      popup.className = 'score-popup-item';
      popup.innerText = text;
      popup.style.cssText = `
        position: fixed;
        left: 50%;
        top: 42%;
        transform: translate(-50%, -50%) scale(0.7);
        font-family: 'Rajdhani', sans-serif;
        font-size: 24px;
        font-weight: 700;
        color: ${color};
        text-shadow: 0 0 10px ${color}, 0 0 20px #000;
        pointer-events: none;
        z-index: 9999;
        opacity: 1;
        letter-spacing: 2px;
        transition: transform 0.9s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.9s ease-out;
      `;
      document.body.appendChild(popup);

      requestAnimationFrame(() => {
        popup.style.transform = 'translate(-50%, calc(-50% - 45px)) scale(1.15)';
        popup.style.opacity = '0';
      });

      // Guaranteed auto-cleanup
      setTimeout(() => {
        if (popup.parentNode) popup.remove();
      }, 950);
    }

    // ── HIGH-FIDELITY 3D CINEMATIC EXPLOSION SYSTEM (Inspired by Stylized 3D Fireball Mesh & PBR Shaders) ──
    let isExploded = false;
    let explosionTimer = 0;
    let cameraShakeIntensity = 0;
    const EXPLOSION_RESPAWN_DELAY = 1.8;

    // 1. Dynamic Flash Light
    const explosionLight = new THREE.PointLight(sceneColor('--blast-fire'), 0, 0.1, 1.2);
    sceneSS.add(explosionLight);

    // 2. Volumetric 3D Fireball Core (The Original Deforming Organic Plumes Mesh)
    const fireballGeo = new THREE.IcosahedronGeometry(0.8, 4);
    // Custom displacement shader for billowing fiery clouds with hot white/yellow core, deep orange edges and smoke dissipation
    const fireballMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uProgress: { value: 0.0 }, // 0 = start of explosion, 1 = dissipated
        uColorCore: { value: new THREE.Color(sceneColor('--blast-core')) },
        uColorFire: { value: new THREE.Color(sceneColor('--blast-fire')) },
        uColorDark: { value: new THREE.Color(sceneColor('--blast-ember')) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vNoise;

        // Simplex / Perlin noise generator
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          // Deform mesh outward into turbulent stylized plumes (Original organic 3D model)
          float n = snoise(position * 3.5 + vec3(0.0, 0.0, uTime * 2.0));
          float n2 = snoise(position * 7.0 - vec3(uTime * 1.5));
          vNoise = n * 0.7 + n2 * 0.3;

          // Expansion scale curve: rapid blast then slow billow
          // Expansion belongs to the shared scale curve, not a second hidden multiplier.
          vec3 displaced = position + normal * (vNoise * 0.22);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColorCore;
        uniform vec3 uColorFire;
        uniform vec3 uColorDark;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vNoise;

        void main() {
          // Heat gradient from core to plume tips
          float heat = clamp(vNoise + (1.0 - uProgress * 1.1), 0.0, 1.0);
          vec3 col = mix(uColorDark, uColorFire, smoothstep(0.05, 0.5, heat));
          col = mix(col, uColorCore, smoothstep(0.55, 0.9, heat));

          float alpha = clamp((1.0 - uProgress) * (1.0 - uProgress), 0.0, 1.0);
          if (alpha <= 0.005) discard;
          gl_FragColor = vec4(col * (0.8 + (1.0 - uProgress) * 1.1), alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const fireballMesh = new THREE.Mesh(fireballGeo, fireballMat);
    fireballMesh.visible = false;
    sceneSS.add(fireballMesh);

    // Cooling gas follows the flash, with normal blending instead of a glowing white sphere.
    const smokeMat = new THREE.MeshBasicMaterial({
      color: sceneColor('--blast-smoke'), transparent: true, opacity: 0,
      depthWrite: false,
    });
    const smokeMesh = new THREE.Mesh(fireballGeo, smokeMat);
    smokeMesh.visible = false;
    sceneSS.add(smokeMesh);
    let activeSmokeTween: TWEEN.Tween<{ scale: number; opacity: number }> | null = null;
    let activeDebrisTween: TWEEN.Tween<{ emissive: number }> | null = null;

    // 3. Dense Fiery & Plasma Particle Burst System (450 High-Speed Embers)
    const EXP_PARTICLE_COUNT = 450;
    const expParticles: {
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
      size: number;
      color: THREE.Color;
      rotSpeed: number;
    }[] = [];
    const expGeo = new THREE.BufferGeometry();
    const expPos = new Float32Array(EXP_PARTICLE_COUNT * 3);
    const expCol = new Float32Array(EXP_PARTICLE_COUNT * 3);
    const expSizes = new Float32Array(EXP_PARTICLE_COUNT);
    expGeo.setAttribute('position', new THREE.BufferAttribute(expPos, 3));
    expGeo.setAttribute('color', new THREE.BufferAttribute(expCol, 3));
    expGeo.setAttribute('particleScale', new THREE.BufferAttribute(expSizes, 1));

    const fireTex = (() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 128;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255, 255, 255, 1)');
      g.addColorStop(0.18, 'rgba(255, 220, 80, 0.95)');
      g.addColorStop(0.45, 'rgba(255, 90, 15, 0.7)');
      g.addColorStop(0.75, 'rgba(180, 20, 0, 0.3)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    })();

    const expMat = new THREE.PointsMaterial({
      size: VESSEL_SCALE.playerLength * 0.045, vertexColors: true, map: fireTex,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true
    });
    expMat.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float particleScale;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <logdepthbuf_vertex>',
        'gl_PointSize *= particleScale;\n#include <logdepthbuf_vertex>'
      );
    };
    const expPoints = new THREE.Points(expGeo, expMat);
    expPoints.frustumCulled = false;
    expPoints.visible = false;
    sceneSS.add(expPoints);

    // 4. Shrapnel & Debris Fragments (55 Glowing Hull Shards with Fiery Edge Trails)
    const DEBRIS_COUNT = 55;
    const debrisGroup = new THREE.Group();
    debrisGroup.visible = false;
    sceneSS.add(debrisGroup);

    const debrisPieces: {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      rotVel: THREE.Vector3;
      life: number;
    }[] = [];
    const shardGeo = new THREE.TetrahedronGeometry(0.35, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: sceneColor('--blast-hull'),
      emissive: sceneColor('--blast-ember'),
      emissiveIntensity: 2.5,
      roughness: 0.3,
      metalness: 0.95
    });

    for (let i = 0; i < DEBRIS_COUNT; i++) {
      const shardMesh = new THREE.Mesh(shardGeo, shardMat.clone());
      const s = 0.5 + Math.random() * 1.4;
      // Proportional scale on original shard geometry
      shardMesh.scale.set(s * 0.045, s * (0.4 + Math.random() * 1.2) * 0.045, s * 0.045);
      debrisGroup.add(shardMesh);
      debrisPieces.push({
        mesh: shardMesh,
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        life: 0
      });
    }

    // 5. Dual Spherical Shockwaves (Inner High-Energy Blast + Outer Dissipating Corona)
    const shockwaveGeo = new THREE.RingGeometry(0.1, 0.8, 64);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: sceneColor('--blast-fire'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveMesh.visible = false;
    sceneSS.add(shockwaveMesh);

    const shockwaveSphereGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const shockwaveSphereMat = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.5 },
        p: { value: 3.5 },
        glowColor: { value: new THREE.Color(sceneColor('--blast-fire')) },
        opacityVal: { value: 0.0 }
      },
      vertexShader: `
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(vec3(modelViewMatrix * vec4(position, 1.0)));
          intensity = pow(max(0.001, 0.7 - dot(vNormal, vNormel)), 3.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float opacityVal;
        varying float intensity;
        void main() {
          gl_FragColor = vec4(glowColor * intensity * 2.0, intensity * opacityVal);
        }`,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    const shockwaveSphere = new THREE.Mesh(shockwaveSphereGeo, shockwaveSphereMat);
    shockwaveSphere.visible = false;
    sceneSS.add(shockwaveSphere);

    let activeExplosionTween: any = null;
    let activeShockwaveTween: any = null;
    let activeSphereTween: any = null;
    let activeLightTween: any = null;
    let activeShakeTween: any = null;

    function triggerExplosion(impactPoint: THREE.Vector3, impactObjName = 'Space Object', isPlayer = true) {
      if (isPlayer && isExploded) return;
      const vesselLength = isPlayer ? VESSEL_SCALE.playerLength : VESSEL_SCALE.enemyLength;
      const blast = explosionScale(vesselLength);
      explosionTimer = EXPLOSION_RESPAWN_DELAY;
      explosionLight.distance = blast.lightRange;
      expMat.size = blast.sparkSize;

      if (isPlayer) {
        if (isExploded) return;
        isExploded = true;
        playerHealth = 0;
        updateHealthHUD();

        // Audio burst with multi-stage synthesis
        initAudio();
        audio.playExplosion();

        // UI HUD feedback
        showToast(`💥 CRITICAL IMPACT: DESTROYED BY ${impactObjName.toUpperCase()}`);

        // Hide ship visuals & halt physics
        playerShip.visible = false;
        shipVelocity.set(0, 0, 0);
        shipAngularVelocity.set(0, 0, 0);
      } else {
        // Enemy ship explosion sound & camera shake
        initAudio();
        audio.playExplosion();
        audio.playKillScore();
        enemiesKilled++;
        totalScore += 100;
        showToast(`🎯 TARGET DESTROYED: ${impactObjName.toUpperCase()} (+100 PTS)`);
        updateCombatStatsHUD();
      }

      // Camera Shake via Tween.js
      if (activeShakeTween) activeShakeTween.stop();
      const proximity = Math.min(1, vesselLength * 16 / Math.max(camera.position.distanceTo(impactPoint), vesselLength));
      const shakeObj = { intensity: (isPlayer ? 0.12 : 0.04) * proximity };
      activeShakeTween = new TWEEN.Tween(shakeObj, animationGroup)
        .to({ intensity: 0 }, isPlayer ? 950 : 450)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
          cameraShakeIntensity = shakeObj.intensity;
        })
        .start(animationTime);

      // 1. Dynamic Flash Light (calibrated realistic glow via Tween.js)
      explosionLight.position.copy(impactPoint);
      if (activeLightTween) activeLightTween.stop();
      const lightObj = { intensity: isPlayer ? 0.65 : 0.4 };
      explosionLight.intensity = lightObj.intensity;
      activeLightTween = new TWEEN.Tween(lightObj, animationGroup)
        .to({ intensity: 0 }, 420)
        .easing(TWEEN.Easing.Exponential.Out)
        .onUpdate(() => {
          explosionLight.intensity = lightObj.intensity;
        })
        .start(animationTime);

      // 2. 3D Volumetric Fireball Mesh (Proportional realistic expansion via Tween.js)
      fireballMesh.position.copy(impactPoint);
      fireballMat.uniforms.uProgress.value = 0.0;
      fireballMat.uniforms.uTime.value = 0.0;
      fireballMesh.visible = true;

      if (activeExplosionTween) activeExplosionTween.stop();
      const fbObj = { progress: 0.0, scale: blast.coreStart };
      fireballMesh.scale.setScalar(blast.coreStart);
      const targetScale = blast.coreEnd;
      activeExplosionTween = new TWEEN.Tween(fbObj, animationGroup)
        .to({ progress: 1.0, scale: targetScale }, 850)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
          fireballMat.uniforms.uProgress.value = fbObj.progress;
          fireballMesh.scale.setScalar(fbObj.scale);
        })
        .onComplete(() => {
          fireballMesh.visible = false;
        })
        .start(animationTime);

      if (activeSmokeTween) activeSmokeTween.stop();
      smokeMesh.position.copy(impactPoint);
      smokeMesh.scale.setScalar(blast.coreStart);
      smokeMat.opacity = 0;
      smokeMesh.visible = true;
      const smokeObj = { scale: blast.coreStart, opacity: 0 };
      activeSmokeTween = new TWEEN.Tween(smokeObj, animationGroup)
        .to({ scale: blast.smokeEnd, opacity: 1 }, 1550)
        .onUpdate(() => {
          smokeMesh.scale.setScalar(smokeObj.scale);
          smokeMat.opacity = Math.sin(smokeObj.opacity * Math.PI) * 0.24;
        })
        .onComplete(() => { smokeMesh.visible = false; })
        .start(animationTime);

      // 3. Shockwave Ring & Corona Sphere via Tween.js (Scaled to fit vessel)
      shockwaveMesh.position.copy(impactPoint);
      shockwaveMesh.quaternion.copy(isPlayer ? playerShip.quaternion : new THREE.Quaternion().random());
      shockwaveMesh.visible = true;
      if (activeShockwaveTween) activeShockwaveTween.stop();
      const ringObj = { scale: blast.ringStart, opacity: 0.75 };
      shockwaveMesh.scale.setScalar(blast.ringStart);
      shockwaveMat.opacity = ringObj.opacity;
      activeShockwaveTween = new TWEEN.Tween(ringObj, animationGroup)
        .to({ scale: blast.ringEnd, opacity: 0 }, 520)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
          shockwaveMesh.scale.setScalar(ringObj.scale);
          shockwaveMat.opacity = ringObj.opacity;
        })
        .onComplete(() => {
          shockwaveMesh.visible = false;
        })
        .start(animationTime);

      shockwaveSphere.position.copy(impactPoint);
      shockwaveSphere.visible = true;
      if (activeSphereTween) activeSphereTween.stop();
      const sphereObj = { scale: blast.sphereStart, opacity: 0.65 };
      shockwaveSphere.scale.setScalar(blast.sphereStart);
      activeSphereTween = new TWEEN.Tween(sphereObj, animationGroup)
        .to({ scale: blast.sphereEnd, opacity: 0 }, 450)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          shockwaveSphere.scale.setScalar(sphereObj.scale);
          shockwaveSphereMat.uniforms.opacityVal.value = sphereObj.opacity;
        })
        .onComplete(() => {
          shockwaveSphere.visible = false;
        })
        .start(animationTime);

      // 4. Dense High-Velocity Ember Particles Burst (Realistic micro-sparks)
      expParticles.length = 0;
      for (let i = 0; i < EXP_PARTICLE_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const speed = blast.sparkSpeed * (0.3 + Math.random() * 0.7);
        const vel = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi)
        ).multiplyScalar(speed);

        const colors = ['--blast-core', '--blast-fire', '--blast-ember'].map(token => new THREE.Color(sceneColor(token)));
        const color = colors[Math.floor(Math.random() * colors.length)];

        expParticles.push({
          pos: impactPoint.clone().add(new THREE.Vector3((Math.random()-0.5)*blast.spawnSpread, (Math.random()-0.5)*blast.spawnSpread, (Math.random()-0.5)*blast.spawnSpread)),
          vel,
          life: 1.0,
          maxLife: 0.9 + Math.random() * 0.8,
          size: 0.4 + Math.random() * 1.0,
          color,
          rotSpeed: (Math.random() - 0.5) * 6
        });
      }
      expPoints.visible = true;

      // 5. Shrapnel Debris Shards (45 realistic Hull Panels)
      debrisGroup.visible = true;
      debrisPieces.forEach(dp => {
        dp.mesh.position.copy(impactPoint);
        dp.mesh.visible = true;
        const speed = blast.sparkSpeed * (0.2 + Math.random() * 0.5);
        dp.mesh.scale.setScalar(blast.debrisScale * (0.5 + Math.random()));
        dp.vel.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(speed);
        dp.rotVel.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        );
        dp.life = 1.0;
        (dp.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.5;
      });

      // Shrapnel emissive cooling via Tween.js
      const debrisCool = { emissive: 2.5 };
      if (activeDebrisTween) activeDebrisTween.stop();
      activeDebrisTween = new TWEEN.Tween(debrisCool, animationGroup)
        .to({ emissive: 0 }, 1400)
        .easing(TWEEN.Easing.Exponential.Out)
        .onUpdate(() => {
          debrisPieces.forEach(dp => {
            (dp.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = debrisCool.emissive;
          });
        })
        .onComplete(() => {
          debrisGroup.visible = false;
        })
        .start(animationTime);
    }

    function updateExplosion(dt: number) {
      if (explosionTimer <= 0 && cameraShakeIntensity <= 0) {
        fireballMesh.visible = false;
        smokeMesh.visible = false;
        shockwaveMesh.visible = false;
        shockwaveSphere.visible = false;
        expPoints.visible = false;
        debrisGroup.visible = false;
        explosionLight.intensity = 0;
        return;
      }

      if (explosionTimer > 0) {
        explosionTimer -= dt;

        // Rotate Volumetric Fireball Mesh in space
        if (fireballMesh.visible) {
          fireballMat.uniforms.uTime.value += dt;
          fireballMesh.rotation.y += dt * 1.5;
          fireballMesh.rotation.z += dt * 1.0;
        }

        // 3. Update Ember & Fire Particles
        let activeParticles = 0;
        for (let i = 0; i < expParticles.length; i++) {
          const p = expParticles[i];
          if (p.life > 0) {
            p.life -= dt / p.maxLife;
            p.pos.addScaledVector(p.vel, dt);
            p.vel.multiplyScalar(Math.exp(-1.8 * dt));
            const t = Math.max(0, p.life);

            expPos[i * 3] = p.pos.x;
            expPos[i * 3 + 1] = p.pos.y;
            expPos[i * 3 + 2] = p.pos.z;

            expSizes[i] = p.size * t * (1.0 + (1.0 - t) * 1.8);

            // Transition: Pure Incandescent White -> Radiant Yellow -> Red-Orange -> Dark Charcoal Ash
            expCol[i * 3] = p.color.r * (t > 0.25 ? 1.0 : t * 4.0);
            expCol[i * 3 + 1] = p.color.g * (t > 0.5 ? 1.0 : (t > 0.15 ? t * 2.0 : 0));
            expCol[i * 3 + 2] = p.color.b * (t > 0.75 ? 1.0 : (t > 0.35 ? t * 1.0 : 0));
            activeParticles++;
          } else {
            expSizes[i] = 0;
          }
        }
        expGeo.attributes.position.needsUpdate = true;
        expGeo.attributes.color.needsUpdate = true;
        expGeo.attributes.particleScale.needsUpdate = true;
        if (activeParticles === 0) expPoints.visible = false;

        // 4. Update Hull Shards Debris
        debrisPieces.forEach(dp => {
          if (dp.life > 0) {
            dp.life -= dt / 1.8;
            dp.mesh.position.addScaledVector(dp.vel, dt);
            dp.mesh.rotation.x += dp.rotVel.x * dt;
            dp.mesh.rotation.y += dp.rotVel.y * dt;
            dp.mesh.rotation.z += dp.rotVel.z * dt;
            if (dp.life <= 0) dp.mesh.visible = false;
          }
        });

        // Hide all elements when timer expires
        if (explosionTimer <= 0) {
          fireballMesh.visible = false;
          smokeMesh.visible = false;
          shockwaveMesh.visible = false;
          shockwaveSphere.visible = false;
          expPoints.visible = false;
          debrisGroup.visible = false;
          explosionLight.intensity = 0;
          if (isExploded) respawnShip();
        }
      }

      // Dynamic Camera Shake Decay
      if (cameraShakeIntensity > 0) {
        const shake = cameraShakeIntensity * 0.18;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        camera.position.z += (Math.random() - 0.5) * shake;
      }
    }

    function updateHealthHUD() {
      const fill = document.getElementById('player-health-fill');
      const text = document.getElementById('player-health-text');
      if (fill && text) {
        const pct = Math.max(0, Math.min(100, Math.round(playerHealth)));
        fill.style.width = pct + '%';
        text.innerText = `${pct}%`;
        fill.className = 'health-bar-fill';
        if (pct <= 25) {
          fill.classList.add('critical');
        } else if (pct <= 55) {
          fill.classList.add('warning');
        }
      }
    }

    function updateCombatStatsHUD() {
      const scoreEl = document.getElementById('combat-kills-text');
      if (scoreEl) {
        scoreEl.innerText = `${totalScore}`;
      }
      const enemyCountEl = document.getElementById('combat-enemies-text');
      if (enemyCountEl) {
        const activeCount = enemyShips.filter(e => e.active).length;
        enemyCountEl.innerText = `${activeCount}`;
      }
    }

    function respawnShip() {
      isExploded = false;
      playerHealth = PLAYER_MAX_HEALTH;
      updateHealthHUD();
      playerShip.visible = true;
      playerShip.position.set(30, 5, 0);
      playerShip.quaternion.set(0, 0, 0, 1);
      shipVelocity.set(0, 0, 0);
      shipAngularVelocity.set(0, 0, 0);

      // Clean up explosion artifacts
      fireballMesh.visible = false;
      smokeMesh.visible = false;
      expPoints.visible = false;
      debrisGroup.visible = false;
      shockwaveMesh.visible = false;
      shockwaveSphere.visible = false;
      explosionLight.intensity = 0;

      showToast("🚀 SHIELDS RECHARGED & SHIP RESPAWNED AT SAFE ORBIT");
    }

    // ── ENGINE PARTICLE TRAIL ──
    const trailParticles: { pos: THREE.Vector3; life: number; maxLife: number }[] = [];
    const TRAIL_COUNT = 300;
    const trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(TRAIL_COUNT * 3);
    const trailCol = new Float32Array(TRAIL_COUNT * 3);
    const trailSizes = new Float32Array(TRAIL_COUNT);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    trailGeo.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));

    const trailTex = (() => {
      const c = document.createElement('canvas'); c.width=16; c.height=16;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(8,8,0,8,8,8);
      g.addColorStop(0,'rgba(100,200,255,1)'); g.addColorStop(0.4,'rgba(50,120,255,0.6)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,16,16);
      return new THREE.CanvasTexture(c);
    })();

    const trailMat = new THREE.PointsMaterial({
      size: VESSEL_SCALE.playerLength * 0.16, vertexColors: true, map: trailTex,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true
    });
    const trailPoints = new THREE.Points(trailGeo, trailMat);
    sceneSS.add(trailPoints);

    for (let i = 0; i < TRAIL_COUNT; i++) {
      trailParticles.push({ pos: new THREE.Vector3(), life: 0, maxLife: 0 });
    }
    let trailIndex = 0;

    function spawnTrailParticle() {
      const exhaust = new THREE.Vector3(0, 0, VESSEL_SCALE.playerLength * 0.55).applyMatrix4(playerShip.matrixWorld);
      const p = trailParticles[trailIndex % TRAIL_COUNT];
      p.pos.copy(exhaust);
      p.life = 1.0;
      p.maxLife = 1.0;
      trailIndex++;
    }

    function updateTrail(dt: number) {
      for (let i = 0; i < TRAIL_COUNT; i++) {
        const p = trailParticles[i];
        if (p.life > 0) p.life -= dt * 4;
        const t = Math.max(0, p.life);
        trailPos[i*3] = p.pos.x;
        trailPos[i*3+1] = p.pos.y;
        trailPos[i*3+2] = p.pos.z;
        trailSizes[i] = t * 0.06;
        const hot = t > 0.7;
        trailCol[i*3] = hot ? 0.5 : t * 0.1;
        trailCol[i*3+1] = hot ? 0.8*t : t * 0.5;
        trailCol[i*3+2] = t;
      }
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.attributes.color.needsUpdate = true;
      trailGeo.attributes.size.needsUpdate = true;
    }

    function buildProceduralShip() {
      // Sleek sci-fi reconnaissance cruiser fuselage
      const hullMat = new THREE.MeshStandardMaterial({
        color: 0x95a5b5,
        metalness: 0.85,
        roughness: 0.25
      });
      const darkMat = new THREE.MeshStandardMaterial({
        color: 0x1f242b,
        metalness: 0.9,
        roughness: 0.3
      });
      const glowMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ccff,
        emissiveIntensity: 2.0
      });

      const shipMeshGroup = new THREE.Group();
      shipMeshGroup.name = "TheShipModel";

      // Main aerodynamic needle fuselage
      const fuselage = new THREE.Mesh(new THREE.ConeGeometry(TARGET_SHIP_SIZE * 0.22, TARGET_SHIP_SIZE, 8), hullMat);
      fuselage.rotation.x = -Math.PI / 2;
      shipMeshGroup.add(fuselage);

      // Cockpit canopy (cyan glowing visor)
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(TARGET_SHIP_SIZE * 0.12, TARGET_SHIP_SIZE * 0.08, TARGET_SHIP_SIZE * 0.25), glowMat);
      canopy.position.set(0, TARGET_SHIP_SIZE * 0.06, -TARGET_SHIP_SIZE * 0.1);
      shipMeshGroup.add(canopy);

      // Left & Right Swept Delta Wings
      const wingGeo = new THREE.BufferGeometry();
      const wingVertices = new Float32Array([
        // Left wing triangle
        0, 0, -TARGET_SHIP_SIZE * 0.1,
        -TARGET_SHIP_SIZE * 0.65, 0, TARGET_SHIP_SIZE * 0.45,
        0, 0, TARGET_SHIP_SIZE * 0.35,
        // Right wing triangle
        0, 0, -TARGET_SHIP_SIZE * 0.1,
        0, 0, TARGET_SHIP_SIZE * 0.35,
        TARGET_SHIP_SIZE * 0.65, 0, TARGET_SHIP_SIZE * 0.45,
      ]);
      wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
      wingGeo.computeVertexNormals();
      const wings = new THREE.Mesh(wingGeo, darkMat);
      shipMeshGroup.add(wings);

      // Twin Engine Thruster Blocks
      const engineGeo = new THREE.CylinderGeometry(TARGET_SHIP_SIZE * 0.06, TARGET_SHIP_SIZE * 0.08, TARGET_SHIP_SIZE * 0.25, 6);
      engineGeo.rotateX(Math.PI / 2);
      const engLeft = new THREE.Mesh(engineGeo, darkMat);
      engLeft.position.set(-TARGET_SHIP_SIZE * 0.18, 0, TARGET_SHIP_SIZE * 0.35);
      const engRight = new THREE.Mesh(engineGeo, darkMat);
      engRight.position.set(TARGET_SHIP_SIZE * 0.18, 0, TARGET_SHIP_SIZE * 0.35);
      shipMeshGroup.add(engLeft);
      shipMeshGroup.add(engRight);

      // Engine Exhaust Nozzle Glows
      const nozzleGeo = new THREE.CircleGeometry(TARGET_SHIP_SIZE * 0.06, 8);
      const nozzleLeft = new THREE.Mesh(nozzleGeo, glowMat);
      nozzleLeft.position.set(-TARGET_SHIP_SIZE * 0.18, 0, TARGET_SHIP_SIZE * 0.48);
      const nozzleRight = new THREE.Mesh(nozzleGeo, glowMat);
      nozzleRight.position.set(TARGET_SHIP_SIZE * 0.18, 0, TARGET_SHIP_SIZE * 0.48);
      shipMeshGroup.add(nozzleLeft);
      shipMeshGroup.add(nozzleRight);

      // Rear Engine Light
      engineGlow = new THREE.PointLight(0x00ddff, 0.4, TARGET_SHIP_SIZE * 15);
      engineGlow.position.set(0, 0, TARGET_SHIP_SIZE * 0.5);
      shipMeshGroup.add(engineGlow);

      shipMeshGroup.scale.setScalar(VESSEL_SCALE.playerLength / (TARGET_SHIP_SIZE * 1.3));
      playerShip.add(shipMeshGroup);
    }
    buildProceduralShip();
    playerShip.position.set(30, 5, 0);
    sceneSS.add(playerShip);

    // ════════════════════════════════════════════════════════════
    //  STAR WARS TIE-DEFENDER FLEET & LASER CANNON SYSTEM
    // ════════════════════════════════════════════════════════════
    let customEnemyModelTemplate: THREE.Group | null = null;

    interface LaserBolt {
      mesh: THREE.Mesh;
      dir: THREE.Vector3;
      prevPos: THREE.Vector3;
      speed: number;
      life: number;
      maxLife: number;
      isPlayer: boolean;
    }

    interface EnemyShip {
      mesh: THREE.Group;
      velocity: THREE.Vector3;
      health: number;
      maxHealth: number;
      active: boolean;
      fireCooldown: number;
      engineLight: THREE.PointLight;
      patrolAngle: number;
      orbitRadius: number;
      orbitSpeed: number;
      orbitHeight: number;
    }

    // ── HIGH-ENERGY LASER CANNON SYSTEM & IMPACT PARTICLES ──
    const laserBolts: LaserBolt[] = [];
    const MAX_LASERS = 140;

    // Player Neon Cyan Plasma & Glowing Core
    const playerLaserCoreGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 0.18, 8);
    playerLaserCoreGeo.rotateX(Math.PI / 2);
    const playerLaserCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const playerLaserHaloGeo = new THREE.CylinderGeometry(0.0065, 0.0065, 0.22, 8);
    playerLaserHaloGeo.rotateX(Math.PI / 2);
    const playerLaserHaloMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    // Enemy Green Plasma Cannon
    const enemyLaserCoreGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.20, 8);
    enemyLaserCoreGeo.rotateX(Math.PI / 2);
    const enemyLaserCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const enemyLaserHaloGeo = new THREE.CylinderGeometry(0.0075, 0.0075, 0.24, 8);
    enemyLaserHaloGeo.rotateX(Math.PI / 2);
    const enemyLaserHaloMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    // Muzzle Flash Dynamic Light
    const muzzleFlashLight = new THREE.PointLight(0x00e5ff, 0, 15, 2.0);
    playerShip.add(muzzleFlashLight);

    // Laser Impact Plasma Sparks System (150 particles pool)
    const IMPACT_MAX = 150;
    interface ImpactSpark {
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
      size: number;
      color: THREE.Color;
    }
    const impactSparks: ImpactSpark[] = [];
    const impactGeo = new THREE.BufferGeometry();
    const impactPos = new Float32Array(IMPACT_MAX * 3);
    const impactCol = new Float32Array(IMPACT_MAX * 3);
    const impactSizes = new Float32Array(IMPACT_MAX);
    impactGeo.setAttribute('position', new THREE.BufferAttribute(impactPos, 3));
    impactGeo.setAttribute('color', new THREE.BufferAttribute(impactCol, 3));
    impactGeo.setAttribute('size', new THREE.BufferAttribute(impactSizes, 1));

    const impactMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    const impactPoints = new THREE.Points(impactGeo, impactMat);
    sceneSS.add(impactPoints);

    function spawnLaserImpact(hitPos: THREE.Vector3, isPlayer = true) {
      const sparkColor = isPlayer ? new THREE.Color(0x00f0ff) : new THREE.Color(0xff5522);
      const sparkCount = 14;

      for (let i = 0; i < sparkCount; i++) {
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(0.08 + Math.random() * 0.22);

        if (impactSparks.length < IMPACT_MAX) {
          impactSparks.push({
            pos: hitPos.clone(),
            vel,
            life: 1.0,
            maxLife: 0.25 + Math.random() * 0.35,
            size: 0.8 + Math.random() * 1.5,
            color: sparkColor.clone().lerp(new THREE.Color(0xffffff), Math.random() * 0.6)
          });
        } else {
          // Recycle oldest
          const sp = impactSparks[Math.floor(Math.random() * impactSparks.length)];
          sp.pos.copy(hitPos);
          sp.vel.copy(vel);
          sp.life = 1.0;
          sp.maxLife = 0.25 + Math.random() * 0.35;
        }
      }
    }

    function updateLaserImpacts(dt: number) {
      for (let i = 0; i < IMPACT_MAX; i++) {
        if (i < impactSparks.length) {
          const sp = impactSparks[i];
          if (sp.life > 0) {
            sp.life -= dt / sp.maxLife;
            sp.pos.addScaledVector(sp.vel, dt * 35.0);
            sp.vel.multiplyScalar(Math.pow(0.85, dt * 60));
            const t = Math.max(0, sp.life);
            impactPos[i * 3] = sp.pos.x;
            impactPos[i * 3 + 1] = sp.pos.y;
            impactPos[i * 3 + 2] = sp.pos.z;
            impactSizes[i] = sp.size * t * 0.05;
            impactCol[i * 3] = sp.color.r * t;
            impactCol[i * 3 + 1] = sp.color.g * t;
            impactCol[i * 3 + 2] = sp.color.b * t;
          } else {
            impactSizes[i] = 0;
          }
        } else {
          impactSizes[i] = 0;
        }
      }
      impactGeo.attributes.position.needsUpdate = true;
      impactGeo.attributes.color.needsUpdate = true;
      impactGeo.attributes.size.needsUpdate = true;
    }

    function spawnLaserBolt(origin: THREE.Vector3, direction: THREE.Vector3, isPlayer = true) {
      if (laserBolts.length >= MAX_LASERS) {
        const old = laserBolts.shift();
        if (old) sceneSS.remove(old.mesh);
      }

      const boltGroup = new THREE.Group();
      const coreMesh = new THREE.Mesh(isPlayer ? playerLaserCoreGeo : enemyLaserCoreGeo, isPlayer ? playerLaserCoreMat : enemyLaserCoreMat);
      const haloMesh = new THREE.Mesh(isPlayer ? playerLaserHaloGeo : enemyLaserHaloGeo, isPlayer ? playerLaserHaloMat : enemyLaserHaloMat);
      boltGroup.add(coreMesh);
      boltGroup.add(haloMesh);

      boltGroup.position.copy(origin);
      boltGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction.clone().normalize());

      sceneSS.add(boltGroup);
      laserBolts.push({
        mesh: boltGroup as any,
        dir: direction.clone().normalize(),
        prevPos: origin.clone(),
        speed: isPlayer ? 2.6 : 1.5,
        life: 0,
        maxLife: isPlayer ? 1.8 : 2.2,
        isPlayer
      });
    }

    // ── BUILD STAR WARS TIE-DEFENDER INSPIRED ENEMY SHIPS ──
    // Inspired by Sketchfab 94382b81ef0748d598816e1842ad9a86
    // Uses loaded custom Star Wars GLTF model or procedural TIE-Defender
    function createTieDefenderShip(): THREE.Group {
      const enemyGroup = new THREE.Group();
      // Visual scale calibrated for space combat visibility
      const scale = VESSEL_SCALE.enemyLength / 2.5;

      if (customEnemyModelTemplate) {
        const clonedModel = customEnemyModelTemplate.clone(true);
        clonedModel.traverse((child: any) => {
          if (child.isMesh && child.material) {
            child.material.side = THREE.DoubleSide;
            child.frustumCulled = false;
          }
        });
        enemyGroup.add(clonedModel);

        // High Intensity Red Ion Engine Exhaust Glow
        const engLight = new THREE.PointLight(0xff2200, 2.2, scale * 18);
        engLight.position.set(0, 0, scale * 0.32);
        enemyGroup.add(engLight);

        return enemyGroup;
      }

      const hullMat = new THREE.MeshStandardMaterial({
        color: 0x5a6978,
        metalness: 0.8,
        roughness: 0.25,
        emissive: 0x111922,
        emissiveIntensity: 0.5
      });
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x2b3842,
        metalness: 0.85,
        roughness: 0.3,
        emissive: 0x0a141c,
        emissiveIntensity: 0.4
      });
      const solarPanelMat = new THREE.MeshStandardMaterial({
        color: 0x101a24,
        metalness: 0.95,
        roughness: 0.15,
        emissive: 0x050f18,
        emissiveIntensity: 0.6
      });
      const redEyeMat = new THREE.MeshBasicMaterial({
        color: 0xff1744
      });
      const redGlowHaloMat = new THREE.MeshBasicMaterial({
        color: 0xff3d00,
        wireframe: true,
        transparent: true,
        opacity: 0.45
      });
      const greenLaserMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });

      // 1. Central Spherical Command Pod (Ball Cockpit)
      const pod = new THREE.Mesh(new THREE.SphereGeometry(scale * 0.28, 16, 16), hullMat);
      enemyGroup.add(pod);

      // 2. Front Viewport Window (Iconic Imperial Red Viewport)
      const viewport = new THREE.Mesh(new THREE.CylinderGeometry(scale * 0.13, scale * 0.14, scale * 0.09, 8), redEyeMat);
      viewport.rotation.x = Math.PI / 2;
      viewport.position.set(0, 0, -scale * 0.25);
      enemyGroup.add(viewport);

      // Red Cockpit Point Light (Illuminates the fighter's front in deep space)
      const cockpitGlow = new THREE.PointLight(0xff1744, 1.2, scale * 8);
      cockpitGlow.position.set(0, 0, -scale * 0.3);
      enemyGroup.add(cockpitGlow);

      // 3. Three Radial Pylons (Tri-Wing Symmetry at 0, 120, 240 degrees)
      const angles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
      angles.forEach((angle) => {
        const wingMount = new THREE.Group();
        wingMount.rotation.z = angle;

        // Heavy Pylon strut connecting pod to wing
        const strut = new THREE.Mesh(new THREE.BoxGeometry(scale * 0.09, scale * 0.48, scale * 0.14), hullMat);
        strut.position.set(0, scale * 0.35, 0);
        wingMount.add(strut);

        // Angled Dagger Solar Wing Assembly
        const wing = new THREE.Mesh(new THREE.BoxGeometry(scale * 0.28, scale * 0.85, scale * 0.05), wingMat);
        wing.position.set(0, scale * 0.82, scale * 0.04);
        wing.rotation.x = -Math.PI / 10;
        wingMount.add(wing);

        // Solar Grid insets
        const panel = new THREE.Mesh(new THREE.BoxGeometry(scale * 0.24, scale * 0.76, scale * 0.055), solarPanelMat);
        panel.position.set(0, scale * 0.82, scale * 0.04);
        panel.rotation.x = -Math.PI / 10;
        wingMount.add(panel);

        // Solar Panel Glowing Edge Trim
        const edgeTrim = new THREE.Mesh(new THREE.BoxGeometry(scale * 0.26, scale * 0.78, scale * 0.06), redGlowHaloMat);
        edgeTrim.position.set(0, scale * 0.82, scale * 0.04);
        edgeTrim.rotation.x = -Math.PI / 10;
        wingMount.add(edgeTrim);

        // Wingtip Laser Cannon Barrels
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(scale * 0.025, scale * 0.025, scale * 0.26, 6), hullMat);
        cannon.rotation.x = Math.PI / 2;
        cannon.position.set(0, scale * 1.25, -scale * 0.06);
        const cannonTip = new THREE.Mesh(new THREE.SphereGeometry(scale * 0.032, 6, 6), greenLaserMat);
        cannonTip.position.set(0, scale * 1.25, -scale * 0.19);
        wingMount.add(cannon);
        wingMount.add(cannonTip);

        enemyGroup.add(wingMount);
      });

      // 4. Rear Twin Ion Engines
      const engineMesh = new THREE.Mesh(new THREE.CylinderGeometry(scale * 0.11, scale * 0.11, scale * 0.18, 8), hullMat);
      engineMesh.rotation.x = Math.PI / 2;
      engineMesh.position.set(0, 0, scale * 0.24);
      enemyGroup.add(engineMesh);

      // High Intensity Red Ion Engine Exhaust Glow
      const engLight = new THREE.PointLight(0xff2200, 2.0, scale * 18);
      engLight.position.set(0, 0, scale * 0.32);
      enemyGroup.add(engLight);

      const ionExhaust = new THREE.Mesh(new THREE.CircleGeometry(scale * 0.09, 8), new THREE.MeshBasicMaterial({ color: 0xff3300 }));
      ionExhaust.position.set(0, 0, scale * 0.33);
      enemyGroup.add(ionExhaust);

      return enemyGroup;
    }

    const enemyShips: EnemyShip[] = [];
    const ENEMY_COUNT = 6;

    // Spawn Enemy TIE-Defender Fleet stationed in orbital rings & near starting flight sector
    function initEnemyFleet() {
      // Clear existing if any
      enemyShips.forEach(e => sceneSS.remove(e.mesh));
      enemyShips.length = 0;

      // Spawn zones safely positioned in defensive planetary orbits
      const spawnZones = [
        { radius: 38.0, height: 4.8, speed: 0.14, baseAngle: 0.8 },
        { radius: 44.0, height: -3.5, speed: -0.12, baseAngle: 1.6 },
        { radius: 52.0, height: 5.2, speed: 0.10, baseAngle: 2.5 },
        { radius: 58.0, height: -2.0, speed: -0.09, baseAngle: 3.4 },
        { radius: 64.0, height: 3.5, speed: 0.08, baseAngle: 4.2 },
        { radius: 72.0, height: -4.0, speed: -0.07, baseAngle: 5.1 }
      ];

      for (let i = 0; i < ENEMY_COUNT; i++) {
        const zone = spawnZones[i % spawnZones.length];
        const shipMesh = createTieDefenderShip();
        const engLight = shipMesh.children.find(c => c instanceof THREE.PointLight) as THREE.PointLight;

        const enemy: EnemyShip = {
          mesh: shipMesh,
          velocity: new THREE.Vector3(),
          health: 60,
          maxHealth: 60,
          active: true,
          fireCooldown: 1.0 + Math.random() * 2.0,
          engineLight: engLight,
          patrolAngle: zone.baseAngle,
          orbitRadius: zone.radius,
          orbitSpeed: zone.speed,
          orbitHeight: zone.height
        };

        const x = Math.cos(enemy.patrolAngle) * enemy.orbitRadius;
        const z = Math.sin(enemy.patrolAngle) * enemy.orbitRadius;
        enemy.mesh.position.set(x, enemy.orbitHeight, z);

        sceneSS.add(enemy.mesh);
        enemyShips.push(enemy);
      }

      updateCombatStatsHUD();
    }

    initEnemyFleet();

    // ════════════════════════════════════════════════════════════
    //  3D HOLOGRAPHIC WAYPOINT BEACON & MISSION CAMPAIGN SYSTEM
    // ════════════════════════════════════════════════════════════
    const beaconGroup = new THREE.Group();
    beaconGroup.name = 'MissionBeacon';
    beaconGroup.visible = false;

    const beaconCrystalGeo = new THREE.OctahedronGeometry(0.42, 0);
    const beaconCrystalMat = new THREE.MeshStandardMaterial({
      color: 0x76cfe3,
      emissive: 0x76cfe3,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.9,
    });
    const beaconCrystal = new THREE.Mesh(beaconCrystalGeo, beaconCrystalMat);
    beaconGroup.add(beaconCrystal);

    const beaconRing1Geo = new THREE.TorusGeometry(0.85, 0.025, 8, 36);
    const beaconRingMat = new THREE.MeshStandardMaterial({
      color: 0x76cfe3,
      emissive: 0x76cfe3,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
    });
    const beaconRing1 = new THREE.Mesh(beaconRing1Geo, beaconRingMat);
    beaconGroup.add(beaconRing1);

    const beaconRing2Geo = new THREE.TorusGeometry(1.25, 0.02, 8, 36);
    const beaconRing2Mat = beaconRingMat.clone();
    beaconRing2Mat.color.setHex(0x7cdbb0);
    beaconRing2Mat.emissive.setHex(0x7cdbb0);
    const beaconRing2 = new THREE.Mesh(beaconRing2Geo, beaconRing2Mat);
    beaconGroup.add(beaconRing2);

    const beaconBeamGeo = new THREE.CylinderGeometry(0.06, 0.3, 5.5, 16, 1, true);
    const beaconBeamMat = new THREE.MeshBasicMaterial({
      color: 0x76cfe3,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const beaconBeam = new THREE.Mesh(beaconBeamGeo, beaconBeamMat);
    beaconGroup.add(beaconBeam);

    const beaconPointLight = new THREE.PointLight(0x76cfe3, 1.5, 18);
    beaconGroup.add(beaconPointLight);

    sceneSS.add(beaconGroup);

    const currentBeaconTargetPos = new THREE.Vector3();
    let missionInitialDistance = 45;
    let lastMissionId = -1;

    function getMissionWorldPosition(mission: Mission, out: THREE.Vector3): boolean {
      if (mission.targetName === 'Asteroid Belt') {
        const offset = mission.targetOffset || { x: 43.5, y: 0.3, z: 0 };
        out.set(offset.x, offset.y, offset.z);
        return true;
      }
      if (mission.targetName === 'The Sun' || mission.targetName === 'Sun') {
        sunMesh.getWorldPosition(out);
        if (mission.targetOffset) {
          out.x += mission.targetOffset.x;
          out.y += mission.targetOffset.y;
          out.z += mission.targetOffset.z;
        }
        return true;
      }
      const body = ssBodies.find((b: any) => b.mesh?.userData?.name === mission.targetName);
      if (body && body.mesh) {
        body.mesh.getWorldPosition(out);
        if (mission.targetOffset) {
          out.x += mission.targetOffset.x;
          out.y += mission.targetOffset.y;
          out.z += mission.targetOffset.z;
        }
        return true;
      }
      return false;
    }

    function updateMissionHUD() {
      const mission = getMissionByIndex(currentMissionIndex);
      if (!mission) return;

      const titleEl = document.getElementById('mission-title-text');
      const descEl = document.getElementById('mission-desc-text');
      const rewardEl = document.getElementById('mission-reward-text');
      const markerNameEl = document.getElementById('mission-marker-name');

      if (titleEl) titleEl.innerText = mission.title;
      if (descEl) descEl.innerText = mission.briefing;
      if (rewardEl) rewardEl.innerText = `+${mission.reward} PTS`;
      if (markerNameEl) markerNameEl.innerText = mission.targetName.toUpperCase();
    }

    // ════════════════════════════════════════════════════════════
    //  EVENTS
    // ════════════════════════════════════════════════════════════
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      initAudio();
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code==='ArrowUp')    keys.up=true;
      if (e.code==='ArrowDown')  keys.down=true;
      if (e.code==='ArrowLeft')  keys.left=true;
      if (e.code==='ArrowRight') keys.right=true;
      if (e.code==='KeyA' || e.key==='a' || e.key==='A') { keys.fire=true; }
      if (e.code==='Space')  { keys.space=true; }
      if (e.code==='KeyQ') {
        keys.q=true;
        triggerBarrelRoll(-1);
      }
      if (e.code==='KeyE') {
        keys.e=true;
        triggerBarrelRoll(1);
      }
      if (e.code==='KeyZ') {
        setAimZoom(true);
      }
      if (e.code==='ShiftLeft'||e.code==='ShiftRight') keys.brake=true;
      if (flightModeActive && !e.repeat) {
        const thr: Record<string, [number, string]> = { Digit1:[0.0002,"SCENIC CRUISE"], Digit2:[0.001,"IMPULSE"], Digit3:[0.005,"COMBAT"], Digit4:[0.02,"HYPERDRIVE"] };
        if (thr[e.code]) { currentThrust = thr[e.code][0]; showToast("THRUST: "+thr[e.code][1]); audio.playGearShift(Object.keys(thr).indexOf(e.code)+1); }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code==='ArrowUp')    keys.up=false;
      if (e.code==='ArrowDown')  keys.down=false;
      if (e.code==='ArrowLeft')  keys.left=false;
      if (e.code==='ArrowRight') keys.right=false;
      if (e.code==='KeyA' || e.key==='a' || e.key==='A') { keys.fire=false; }
      if (e.code==='Space')  { keys.space=false; }
      if (e.code==='KeyQ')   keys.q=false;
      if (e.code==='KeyE')   keys.e=false;
      if (e.code==='KeyZ') {
        setAimZoom(false);
      }
      if (e.code==='ShiftLeft'||e.code==='ShiftRight') keys.brake=false;
    };

    const onMouseDown = (e: MouseEvent) => {
      initAudio();
      if (flightModeActive) {
        if (e.button === 0 && !(e.target as HTMLElement).closest('button')) {
          keys.fire = true;
        } else if (e.button === 2) {
          setAimZoom(true);
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        keys.fire = false;
      } else if (e.button === 2) {
        setAimZoom(false);
      }
    };

    const releaseControls = () => {
      for (const key of Object.keys(keys) as Array<keyof typeof keys>) keys[key] = false;
      throttleEnvelope = 0;
      audio.updateThrust(0);
      setAimZoom(false);
    };
    const onVisibilityChange = () => { if (document.hidden) releaseControls(); };

    const onContextMenu = (e: MouseEvent) => {
      if (flightModeActive) e.preventDefault();
    };

    const unlockAudioHandler = () => {
      initAudio();
    };

    window.addEventListener('blur', releaseControls);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointerdown', unlockAudioHandler);
    window.addEventListener('touchstart', unlockAudioHandler);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let targetPlanet: THREE.Mesh | null = null;
    let targetPlanetData: any = null;

    const onClick = (e: MouseEvent) => {
      if (activeScene!=='solarSystem'||flightModeActive||(e.target as HTMLElement).tagName==='BUTTON'||(e.target as HTMLElement).closest('#target-marker')) return;
      mouse.x = (e.clientX/window.innerWidth)*2-1;
      mouse.y = -(e.clientY/window.innerHeight)*2+1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      const hit = hits.find(h => interactables.includes(h.object as THREE.Mesh));
      if (hit) {
        initAudio();
        audio.playPlanetClick();
        let clickedMesh = hit.object as THREE.Mesh;
        const name = clickedMesh.userData?.name;
        if (name) {
          if (name === 'The Sun') {
            clickedMesh = sunMesh;
          } else {
            const body = ssBodies.find((b: any) => b.mesh?.userData?.name === name);
            if (body) clickedMesh = body.mesh;
          }
        }
        targetPlanet = clickedMesh;
        
        targetPlanetData = ssBodies.find((b: any) => b.mesh===targetPlanet);
        isTransitioning = true;
        cameraLight.intensity = 1.0;
        const d = targetPlanet.userData;
        document.getElementById('info-title')!.innerText = d.name;
        document.getElementById('info-subtitle')!.innerText = d.type||'Celestial Body';
        document.getElementById('planet-stats')!.style.display = 'block';
        document.getElementById('stat-mass')!.innerText = d.mass||'—';
        document.getElementById('stat-radius')!.innerText = d.radiusStr||'—';
        document.getElementById('stat-period')!.innerText = d.period||'—';
        document.getElementById('stat-temp')!.innerText = d.temp||'—';
        document.getElementById('stat-moons')!.innerText = d.moons||'—';
        document.getElementById('btn-back-system')!.style.display = 'block';
        document.getElementById('crosshair')!.style.display = 'block';
        document.getElementById('dynamic-hud')!.style.display = 'block';
        document.getElementById('ss-info-card')!.classList.remove('panel-hidden');
        document.getElementById('btn-toggle-ss-info')!.innerText = '✖ Hide';
      }
    };
    window.addEventListener('click', onClick);

    // ════════════════════════════════════════════════════════════
    //  UI HANDLERS
    // ════════════════════════════════════════════════════════════
    function showToast(msg: string) {
      const t = document.getElementById('toast-message')!;
      t.innerText = msg; t.style.opacity = '1';
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => t.style.opacity='0', 2200);
    }

    const fadeOverlay = document.getElementById('fade-overlay')!;

    function initMilkyWay() {
      activeScene = 'milkyWay';
      camera.position.set(3, 4, 6);
      controls.target.set(0, 0, 0);
      controls.maxDistance = 20; controls.minDistance = 1;
      document.getElementById('ui-milky-way')!.classList.remove('hidden-ui');
      document.getElementById('ui-solar-system')!.classList.add('hidden-ui');
      document.getElementById('target-marker')!.style.display = 'flex';
      document.getElementById('gravity-indicator')!.style.display = 'none';
      document.getElementById('flight-hud')!.style.display = 'none';
      const combatHud = document.getElementById('combat-hud');
      if (combatHud) combatHud.style.display = 'none';
      const combatCrosshair = document.getElementById('combat-crosshair');
      if (combatCrosshair) combatCrosshair.style.display = 'none';
      const enemyHudContainer = document.getElementById('enemy-hud-container');
      if (enemyHudContainer) enemyHudContainer.style.display = 'none';
      document.getElementById('planet-navigator')!.style.display = 'none';
    }

    // ── TRAVEL STATE ──
    let travelTarget: THREE.Mesh | null = null;
    const travelStartPos = new THREE.Vector3();
    const travelStartTarget = new THREE.Vector3();
    let isTraveling = false;
    const TRAVEL_DURATION = 2.0; // seconds

    function travelToPlanet(mesh: THREE.Mesh) {
      if (isTraveling) return;
      initAudio();
      audio.playTransition();

      const d = mesh.userData;
      const targetName = d.name || 'Celestial Body';

      // Set as clicked planet too
      travelTarget = mesh;
      targetPlanet = mesh;
      targetPlanetData = ssBodies.find((b: any) => b.mesh === mesh);
      cameraLight.intensity = 1.0;

      document.getElementById('info-title')!.innerText = d.name || 'Celestial Body';
      document.getElementById('info-subtitle')!.innerText = d.type || 'Celestial Body';
      document.getElementById('planet-stats')!.style.display = 'block';
      document.getElementById('stat-mass')!.innerText = d.mass || '—';
      document.getElementById('stat-radius')!.innerText = d.radiusStr || '—';
      document.getElementById('stat-period')!.innerText = d.period || '—';
      document.getElementById('stat-temp')!.innerText = d.temp || '—';
      document.getElementById('stat-moons')!.innerText = d.moons || '—';
      document.getElementById('btn-back-system')!.style.display = 'block';
      document.getElementById('crosshair')!.style.display = 'block';
      document.getElementById('dynamic-hud')!.style.display = 'block';
      document.getElementById('ss-info-card')!.classList.remove('panel-hidden');
      document.getElementById('btn-toggle-ss-info')!.innerText = '✖ Hide';

      // Update active nav button
      document.querySelectorAll('#planet-navigator button').forEach(btn => btn.classList.remove('nav-active'));
      const navBtn = document.getElementById('nav-' + d.name);
      if (navBtn) navBtn.classList.add('nav-active');

      const wp = new THREE.Vector3();
      mesh.getWorldPosition(wp);
      const r = mesh.userData.radius || 4;

      if (flightModeActive) {
        isTraveling = true;
        showToast(`🌌 HIPERSALTO INICIADO: RUMO A ${targetName.toUpperCase()}!`);
        showScorePopup(`🌌 WARP 9: ${targetName.toUpperCase()}`, '#ffaa00');

        shipVelocity.set(0, 0, 0);
        shipAngularVelocity.set(0, 0, 0);
        // Warp spaceship to planet orbit
        const destPos = new THREE.Vector3(wp.x + r * 3.5, wp.y + r * 0.8, wp.z + r * 3.5);
        new TWEEN.Tween(playerShip.position, animationGroup)
          .to({ x: destPos.x, y: destPos.y, z: destPos.z }, 1200)
          .easing(TWEEN.Easing.Cubic.InOut)
          .onComplete(() => {
            isTraveling = false;
            showToast(`✅ ÓRBITA ALCANÇADA: ${targetName.toUpperCase()}`);
          })
          .start(animationTime);

        // Smoothly orient ship towards planet
        const lookTgt = wp.clone();
        const curQuat = playerShip.quaternion.clone();
        const tgtQuat = new THREE.Quaternion().setFromRotationMatrix(
          new THREE.Matrix4().lookAt(destPos, lookTgt, new THREE.Vector3(0, 1, 0))
        );
        const qObj = { t: 0 };
        new TWEEN.Tween(qObj, animationGroup)
          .to({ t: 1 }, 1200)
          .easing(TWEEN.Easing.Cubic.InOut)
          .onUpdate(() => {
            playerShip.quaternion.copy(curQuat).slerp(tgtQuat, qObj.t);
          })
          .start(animationTime);

      } else {
        isTraveling = true;
        showToast("TRAVELING TO " + targetName.toUpperCase());

        const destPos = new THREE.Vector3(wp.x + r * 3, wp.y + r * 1.5, wp.z + r * 3);
        const fovObj = { fov: camera.fov };

        new TWEEN.Tween(fovObj, animationGroup)
          .to({ fov: 85 }, 350)
          .easing(TWEEN.Easing.Quadratic.In)
          .onUpdate(() => {
            camera.fov = fovObj.fov;
            camera.updateProjectionMatrix();
          })
          .chain(
            new TWEEN.Tween(fovObj, animationGroup)
              .to({ fov: 60 }, 650)
              .easing(TWEEN.Easing.Cubic.Out)
              .onUpdate(() => {
                camera.fov = fovObj.fov;
                camera.updateProjectionMatrix();
              })
              .onComplete(() => {
                isTraveling = false;
              })
          )
          .start(animationTime);

        new TWEEN.Tween(camera.position, animationGroup)
          .to({ x: destPos.x, y: destPos.y, z: destPos.z }, 1000)
          .easing(TWEEN.Easing.Cubic.InOut)
          .start(animationTime);

        new TWEEN.Tween(controls.target, animationGroup)
          .to({ x: wp.x, y: wp.y, z: wp.z }, 1000)
          .easing(TWEEN.Easing.Cubic.InOut)
          .start(animationTime);
      }
    }

    // Smooth easing function
    function easeInOutCubic(t: number): number {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function initSolarSystem() {
      activeScene = 'solarSystem';
      camera.position.set(0, 60, 120);
      controls.target.set(0, 0, 0);
      controls.maxDistance = 350; controls.minDistance = 2;
      document.getElementById('ui-milky-way')!.classList.add('hidden-ui');
      document.getElementById('ui-solar-system')!.classList.remove('hidden-ui');
      document.getElementById('target-marker')!.style.display = 'none';
      document.getElementById('planet-navigator')!.style.display = 'flex';
    }

    initMilkyWay();

    document.getElementById('target-marker')!.onclick = () => {
      initAudio();
      audio.playTransition();
      fadeOverlay.style.opacity = '1';
      setTimeout(() => { initSolarSystem(); fadeOverlay.style.opacity = '0'; }, 1000);
    };

    document.getElementById('btn-back-galaxy')!.addEventListener('click', () => {
      initAudio(); audio.playTransition();
      document.querySelectorAll('.score-popup-item').forEach(el => el.remove());
      setAimZoom(false);
      beaconGroup.visible = false;
      const markerEl = document.getElementById('mission-nav-marker');
      if (markerEl) markerEl.style.display = 'none';
      fadeOverlay.style.opacity = '1';
      setTimeout(() => {
        flightModeActive = false; gravityEnabled = false; orreryMode = false;
        controls.enabled = true; targetPlanet = null;
        document.getElementById('btn-flight-mode')!.innerText = '🚀 Pilot Ship';
        document.getElementById('btn-flight-mode')!.className = 'btn-success';
        document.getElementById('btn-gravity')!.className = '';
        document.getElementById('btn-orrery')!.className = '';
        document.getElementById('btn-back-system')!.style.display = 'none';
        document.getElementById('crosshair')!.style.display = 'none';
        document.getElementById('dynamic-hud')!.style.display = 'none';
        document.getElementById('orrery-label')!.style.display = 'none';
        document.getElementById('planet-stats')!.style.display = 'none';
        initMilkyWay(); fadeOverlay.style.opacity = '0';
      }, 1000);
    });

    document.getElementById('btn-back-system')!.addEventListener('click', () => {
      targetPlanet = null; targetPlanetData = null;
      isTransitioning = true; cameraLight.intensity = 0;
      document.getElementById('btn-back-system')!.style.display = 'none';
      document.getElementById('crosshair')!.style.display = 'none';
      document.getElementById('dynamic-hud')!.style.display = 'none';
      document.getElementById('planet-stats')!.style.display = 'none';
      document.getElementById('info-title')!.innerText = 'Solar System';
      document.getElementById('info-subtitle')!.innerText = 'Interactive Environment';
    });

    document.getElementById('btn-flight-mode')!.onclick = () => {
      initAudio();
      flightModeActive = !flightModeActive;
      audio.playToggle(flightModeActive);
      controls.enabled = !flightModeActive;
      targetPlanet = null;
      document.getElementById('btn-back-system')!.style.display = 'none';
      document.getElementById('crosshair')!.style.display = 'none';
      document.getElementById('dynamic-hud')!.style.display = 'none';
      document.getElementById('planet-stats')!.style.display = 'none';
      document.getElementById('flight-hud')!.style.display = flightModeActive ? 'flex' : 'none';
      const combatHud = document.getElementById('combat-hud');
      if (combatHud) combatHud.style.display = flightModeActive ? 'flex' : 'none';
      const combatCrosshair = document.getElementById('combat-crosshair');
      if (combatCrosshair) combatCrosshair.style.display = flightModeActive ? 'block' : 'none';
      const enemyHudContainer = document.getElementById('enemy-hud-container');
      if (enemyHudContainer) enemyHudContainer.style.display = flightModeActive ? 'block' : 'none';

      if (flightModeActive) {
        document.getElementById('btn-flight-mode')!.innerText = '✖ Exit Flight';
        document.getElementById('btn-flight-mode')!.className = 'btn-danger';
        const off = new THREE.Vector3(0, TARGET_SHIP_SIZE * 0.9 + 0.02, TARGET_SHIP_SIZE * 3.8 + 0.08).applyMatrix4(playerShip.matrixWorld);
        camera.position.copy(off);
        updateHealthHUD();
        updateCombatStatsHUD();
        updateMissionHUD();
        showToast("SPACE COMBAT ENGAGED ── A / SPACE / CLICK / F TO FIRE · 1-4 SPEED");
      } else {
        document.querySelectorAll('.score-popup-item').forEach(el => el.remove());
        setAimZoom(false);
        beaconGroup.visible = false;
        const markerEl = document.getElementById('mission-nav-marker');
        if (markerEl) markerEl.style.display = 'none';
        document.getElementById('btn-flight-mode')!.innerText = '🚀 Pilot Ship';
        document.getElementById('btn-flight-mode')!.className = 'btn-success';
        isTransitioning = true;
        const mesh = playerShip.getObjectByName('TheShipModel');
        if (mesh) mesh.visible = true;
      }
    };

    document.getElementById('btn-toggle-orbits')!.addEventListener('click', () => {
      initAudio(); showOrbits = !showOrbits; audio.playToggle(showOrbits);
      orbitLineObjects.forEach(l => l.visible = showOrbits);
      document.getElementById('btn-toggle-orbits')!.className = showOrbits ? 'btn-active' : '';
      showToast(showOrbits ? "ORBITAL PATHS: ON" : "ORBITAL PATHS: OFF");
    });

    document.getElementById('btn-orrery')!.addEventListener('click', () => {
      initAudio(); orreryMode = !orreryMode; audio.playToggle(orreryMode);
      document.getElementById('btn-orrery')!.className = orreryMode ? 'btn-active' : '';
      document.getElementById('orrery-label')!.style.display = orreryMode ? 'block' : 'none';
      if (orreryMode) {
        orbitLineObjects.forEach(l => l.visible = true);
        isTransitioning = false;
        camera.position.set(0, 280, 0);
        controls.target.set(0, 0, 0);
        showToast("ORRERY MODE — TOP-DOWN ORBITAL VIEW");
      } else {
        orbitLineObjects.forEach(l => l.visible = showOrbits);
        camera.position.set(0, 60, 120);
      }
    });

    document.getElementById('btn-gravity')!.addEventListener('click', () => {
      initAudio(); gravityEnabled = !gravityEnabled; audio.playToggle(gravityEnabled);
      document.getElementById('btn-gravity')!.className = gravityEnabled ? 'btn-active' : '';
      document.getElementById('gravity-indicator')!.style.display = gravityEnabled ? 'block' : 'none';
      document.getElementById('grav-status')!.innerText = gravityEnabled ? 'ON' : 'OFF';
      document.getElementById('fhud-grav-row')!.style.display = gravityEnabled ? 'flex' : 'none';
      showToast(gravityEnabled ? "⚛ NEWTONIAN GRAVITY ACTIVE" : "GRAVITY DISABLED");
    });

    function setTime(val: number, id: string) {
      timeMultiplier = val;
      ['btn-pause','btn-1x','btn-50x','btn-200x'].forEach(b => document.getElementById(b)!.className = '');
      document.getElementById(id)!.className = 'btn-active';
    }
    document.getElementById('btn-pause')!.onclick = () => setTime(0, 'btn-pause');
    document.getElementById('btn-1x')!.onclick = () => setTime(1, 'btn-1x');
    document.getElementById('btn-50x')!.onclick = () => setTime(50, 'btn-50x');
    document.getElementById('btn-200x')!.onclick = () => setTime(200, 'btn-200x');

    document.getElementById('btn-toggle-mw-info')!.addEventListener('click', () => {
      const c = document.getElementById('mw-info-card')!;
      c.classList.toggle('panel-hidden');
      document.getElementById('btn-toggle-mw-info')!.innerText = c.classList.contains('panel-hidden') ? 'ℹ Info' : '✖ Hide';
    });
    document.getElementById('btn-toggle-ss-info')!.addEventListener('click', () => {
      const c = document.getElementById('ss-info-card')!;
      c.classList.toggle('panel-hidden');
      document.getElementById('btn-toggle-ss-info')!.innerText = c.classList.contains('panel-hidden') ? 'ℹ Info' : '✖ Hide';
    });

    function applyShipModel(scene: THREE.Group) {
      playerShip.clear();
      const model = scene;
      model.traverse((child: any) => {
        if (child.isMesh && child.material) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material.isMeshStandardMaterial) {
            child.material.metalness = Math.min(child.material.metalness, 0.45);
            child.material.roughness = Math.max(child.material.roughness, 0.35);
            child.material.needsUpdate = true;
          }
        }
      });
      const box = new THREE.Box3().setFromObject(model);
      const sz = new THREE.Vector3(); box.getSize(sz);
      const scale = VESSEL_SCALE.playerLength / (Math.max(sz.x, sz.y, sz.z) || 1);
      model.scale.setScalar(scale);
      const sc = new THREE.Box3().setFromObject(model);
      const ctr = new THREE.Vector3(); sc.getCenter(ctr);
      model.position.sub(ctr);
      const wrap = new THREE.Group();
      wrap.add(model);
      wrap.name = "TheShipModel";
      // Facing forward (-Z flight trajectory)
      wrap.rotation.y = 0;
      playerShip.add(wrap);
      engineGlow = new THREE.PointLight(0x00e5ff, 2.5, VESSEL_SCALE.playerLength * 8);
      engineGlow.position.set(0, 0, VESSEL_SCALE.playerLength * 0.5);
      playerShip.add(engineGlow);
    }

    function applyEnemyModel(scene: THREE.Group, modelName = 'Star Wars Vessel') {
      const model = scene;
      model.traverse((child: any) => {
        if (child.isMesh && child.material) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material.isMeshStandardMaterial) {
            child.material.metalness = Math.min(child.material.metalness, 0.5);
            child.material.roughness = Math.max(child.material.roughness, 0.3);
            child.material.needsUpdate = true;
          }
        }
      });
      const box = new THREE.Box3().setFromObject(model);
      const sz = new THREE.Vector3(); box.getSize(sz);
      const targetDim = VESSEL_SCALE.enemyLength;
      const scale = targetDim / Math.max(sz.x, sz.y, sz.z);
      model.scale.setScalar(scale);
      const sc = new THREE.Box3().setFromObject(model);
      const ctr = new THREE.Vector3(); sc.getCenter(ctr);
      model.position.sub(ctr);
      const wrap = new THREE.Group();
      wrap.add(model);
      // Facing forward along dogfight trajectory
      wrap.rotation.y = 0;

      customEnemyModelTemplate = wrap;

      // Rebuild & update all active enemy ships immediately
      initEnemyFleet();
      showToast(`⚔ Modelo Star Wars carregado: ${modelName}`);
    }

    // ── ASSET URL RESOLVER (SUPPORTS GITHUB PAGES, RELATIVE PATHS & ROOT HOSTS) ──
    const getAssetUrl = (path: string) => {
      const clean = path.startsWith('/') ? path.slice(1) : path;
      const base = import.meta.env.BASE_URL || './';
      return base.endsWith('/') ? `${base}${clean}` : `${base}/${clean}`;
    };

    // ── AUTOMATIC STAR WARS ENEMY FLEET & PLAYER SPACESHIP LOADER ──
    const gltfLoader = new GLTFLoader();

    // 1. Auto-load bundled player spaceship model
    gltfLoader.load(getAssetUrl('models/spaceship.glb'), (gltf) => {
      applyShipModel(gltf.scene);
      console.log('Player spaceship loaded automatically from models/spaceship.glb');
    }, undefined, (err) => {
      console.warn('Default spaceship model failed to load:', err);
    });

    // 2. Auto-search and load Star Wars 3D model for enemy fleet
    const starWarsCandidateFiles = [
      'starwars.glb', 'star_wars.glb', 'star-wars.glb',
      'tie_defender.glb', 'tie_fighter.glb', 'tie.glb',
      'star-wars-space-ship.glb', 'starwars_spaceship.glb'
    ];

    function tryLoadStarWarsCandidates(index = 0) {
      if (index >= starWarsCandidateFiles.length) {
        // Fallback: auto-clone and style 3D spaceship model with Star Wars Imperial livery & red ion engines
        gltfLoader.load(getAssetUrl('models/spaceship.glb'), (gltf) => {
          const enemyModel = gltf.scene.clone(true);
          enemyModel.traverse((child: any) => {
            if (child.isMesh && child.material) {
              child.material = child.material.clone();
              if (child.material.color) {
                child.material.color.setHex(0x3a4856); // Imperial dark steel
              }
              if (child.material.emissive) {
                child.material.emissive.setHex(0x1a0505);
                child.material.emissiveIntensity = 0.6;
              }
            }
          });
          applyEnemyModel(enemyModel, 'Imperial Star Wars Fighter');
          console.log('Imperial Star Wars fleet initialized with 3D mesh');
        });
        return;
      }

      const filename = starWarsCandidateFiles[index];
      gltfLoader.load(
        getAssetUrl(`models/${filename}`),
        (gltf) => {
          applyEnemyModel(gltf.scene, filename);
          console.log(`Successfully loaded Star Wars model from models/${filename}`);
        },
        undefined,
        () => {
          tryLoadStarWarsCandidates(index + 1);
        }
      );
    }
    tryLoadStarWarsCandidates(0);

    // ── DRAG & DROP 3D / AUDIO FILES DIRECTLY ONTO WINDOW ──
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      initAudio();
      const files = Array.from(e.dataTransfer?.files || []);

      // Check audio files (.mp3, .wav, .ogg)
      const audioFile = files.find(f => /\.(mp3|wav|ogg)$/i.test(f.name));
      if (audioFile) {
        const blobUrl = URL.createObjectURL(audioFile);
        const isLaser = /laser|gun|shot|roblox|fire|pew/i.test(audioFile.name);
        if (isLaser) {
          audio.loadCustomAudio('laser', blobUrl);
          audio.playPlayerLaser();
          showToast(`🔫 Som de laser carregado: ${audioFile.name}`);
        } else {
          audio.loadCustomAudio('explosion', blobUrl);
          audio.playExplosion();
          showToast(`💥 Som de explosão carregado: ${audioFile.name}`);
        }
      }

      // Check 3D models (.glb, .gltf)
      const glbFile = files.find(f => f.name.endsWith('.glb') || f.name.endsWith('.gltf'));
      if (glbFile) {
        const blobUrl = URL.createObjectURL(glbFile);
        gltfLoader.load(blobUrl, (gltf) => {
          applyEnemyModel(gltf.scene, glbFile.name);
          showToast(`✨ Modelo Star Wars carregado: ${glbFile.name}`);
          URL.revokeObjectURL(blobUrl);
        }, undefined, (err) => {
          console.error('Failed to parse dropped 3D model:', err);
          showToast('❌ Erro ao carregar arquivo 3D arrastado');
        });
      }
    });

    // ── GOOGLE ARTS & CULTURE CELESTIAL 3D MODELS ──
    const celestialModels: {
      name: string;
      file: string;
      targetDiameter: number;
      tiltDeg: number;
      isSun?: boolean;
      isMoon?: boolean;
    }[] = [
      { name: 'The Sun', file: 'sun.glb', targetDiameter: 12, tiltDeg: 7.25, isSun: true },
      { name: 'Mercury', file: 'mercury.glb', targetDiameter: 1.0, tiltDeg: 0.034 },
      { name: 'Venus', file: 'venus.glb', targetDiameter: 2.4, tiltDeg: 177.4 },
      { name: 'Earth', file: 'earth.glb', targetDiameter: 2.6, tiltDeg: 23.5 },
      { name: 'The Moon', file: 'moon.glb', targetDiameter: 0.6, tiltDeg: 6.68, isMoon: true },
      { name: 'Mars', file: 'mars.glb', targetDiameter: 1.4, tiltDeg: 25.2 },
      { name: 'Jupiter', file: 'jupiter.glb', targetDiameter: 7.0, tiltDeg: 3.1 },
      { name: 'Saturn', file: 'saturn.glb', targetDiameter: 5.6, tiltDeg: 26.7 },
      { name: 'Uranus', file: 'uranus.glb', targetDiameter: 4.0, tiltDeg: 97.8 },
      { name: 'Neptune', file: 'neptune.glb', targetDiameter: 3.8, tiltDeg: 28.3 },
      { name: 'Pluto', file: 'pluto.glb', targetDiameter: 0.6, tiltDeg: 122.5 }
    ];

    function loadModelSequential(index: number) {
      if (index >= celestialModels.length) return;
      const cfg = celestialModels[index];

      gltfLoader.load(getAssetUrl(`models/${cfg.file}`), (gltf) => {
        let targetMesh: THREE.Mesh | null = null;
        let parentSys: THREE.Object3D | null = null;
        let bodyRef: any = null;

        if (cfg.isSun) {
          targetMesh = sunMesh;
          parentSys = sceneSS;
        } else if (cfg.isMoon) {
          const mBody = ssBodies.find((b: any) => b.type === 'moon' && b.mesh?.userData?.name === 'The Moon');
          if (mBody) {
            targetMesh = mBody.mesh;
            parentSys = mBody.pivot;
            bodyRef = mBody;
          }
        } else {
          const pBody = ssBodies.find((b: any) => b.type === 'planet' && b.mesh?.userData?.name === cfg.name);
          if (pBody) {
            targetMesh = pBody.mesh;
            parentSys = pBody.system;
            bodyRef = pBody;
          }
        }

        if (targetMesh && parentSys) {
          // Hide old procedural sphere mesh while preserving position and raycast data
          targetMesh.visible = false;
          const bodyData = targetMesh.userData;

          // Center and normalize scale
          const model = gltf.scene;
          model.name = `${cfg.name}_3DModel`;

          const bbox = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          bbox.getCenter(center);
          model.position.sub(center);

          const size = new THREE.Vector3();
          bbox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const scale = cfg.targetDiameter / maxDim;
          model.scale.setScalar(scale);

          // Adjust materials while keeping standard lighting
          model.traverse((child: any) => {
            if (child.isMesh) {
              if (cfg.isSun) {
                child.castShadow = false;
                child.receiveShadow = false;
                if (child.material) {
                  if (child.material.isMeshStandardMaterial) {
                    child.material.emissive = new THREE.Color(0xffbb44);
                    child.material.emissiveIntensity = 1.0;
                  }
                }
              } else {
                child.castShadow = false;
                child.receiveShadow = false;
                if (child.material) {
                  if (child.material.isMeshStandardMaterial) {
                    child.material.roughness = 0.65;
                    child.material.metalness = 0.05;
                  }
                  child.material.needsUpdate = true;
                }
              }
              child.userData = bodyData;
              interactables.push(child);
            }
          });

          // Pivot with axial tilt
          const pivot = new THREE.Group();
          pivot.name = `${cfg.name}_3DPivot`;
          pivot.rotation.z = THREE.MathUtils.degToRad(cfg.tiltDeg);
          pivot.add(model);

          if (cfg.isMoon) {
            pivot.position.copy(targetMesh.position);
          }

          parentSys.add(pivot);

          if (bodyRef) {
            bodyRef.custom3DPivot = pivot;
          } else if (cfg.isSun) {
            (sunMesh as any).custom3DPivot = pivot;
          }
        }

        setTimeout(() => loadModelSequential(index + 1), 60);
      }, undefined, (err) => {
        console.warn(`Could not load model for ${cfg.name}:`, err);
        setTimeout(() => loadModelSequential(index + 1), 60);
      });
    }

    loadModelSequential(0);

    const onResize = () => {
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // ── PLANET NAVIGATOR BUTTONS ──
    const moonBody = ssBodies.find((b: any) => b.type === 'moon' && b.mesh?.userData?.name === 'The Moon');
    const navBodies = [
      { name: 'The Sun', mesh: sunMesh },
      ...planetsData.map((p) => {
        const body = ssBodies.find((b: any) => b.mesh?.userData?.name === p.name);
        return { name: p.name, mesh: body?.mesh as THREE.Mesh };
      }),
      ...(moonBody ? [{ name: 'The Moon', mesh: moonBody.mesh as THREE.Mesh }] : [])
    ].filter(b => b.mesh);

    navBodies.forEach(b => {
      const btn = document.getElementById('nav-' + b.name);
      if (btn) btn.addEventListener('click', () => travelToPlanet(b.mesh));
    });

    // ════════════════════════════════════════════════════════════
    //  ANIMATION LOOP
    // ════════════════════════════════════════════════════════════
    let animFrameId: number;

    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      animationTime += dt * 1000;
      animationGroup.update(animationTime);

      if (activeScene === 'milkyWay') {
        controls.update();
        mwGroup.rotation.y += 0.012 * dt;
        const sp = anchor.position.clone().project(camera);
        const mk = document.getElementById('target-marker')!;
        mk.style.left = `${(sp.x*.5+.5)*window.innerWidth}px`;
        mk.style.top = `${(sp.y*-.5+.5)*window.innerHeight}px`;
        renderer.render(sceneMW, camera);
      } else {
        sunMesh.rotation.y += 0.0003 * GLOBAL_SPEED_SCALE * dt * FLIGHT_TUNING.referenceFps * timeMultiplier;
        if ((sunMesh as any).custom3DPivot) {
          (sunMesh as any).custom3DPivot.rotation.y += 0.0003 * GLOBAL_SPEED_SCALE * dt * FLIGHT_TUNING.referenceFps * timeMultiplier;
        }
        astBelt.rotation.y += 0.0002 * GLOBAL_SPEED_SCALE * dt * FLIGHT_TUNING.referenceFps * timeMultiplier;
        kuiperBelt.rotation.y += 0.00005 * GLOBAL_SPEED_SCALE * dt * FLIGHT_TUNING.referenceFps * timeMultiplier;
        starLayer1.rotation.y += 0.00003 * dt;
        starLayer2.rotation.y -= 0.00001 * dt;

        ssBodies.forEach((b: any) => {
          if (b.type === 'planet') {
            b.angle += b.speed * GLOBAL_SPEED_SCALE * dt * FLIGHT_TUNING.referenceFps * timeMultiplier;
            b.system.position.set(
              b.a * Math.cos(b.angle) - (b.a * b.e),
              0,
              b.a * Math.sqrt(1 - b.e*b.e) * Math.sin(b.angle)
            );
            b.mesh.rotation.y += 0.004 * GLOBAL_SPEED_SCALE * dt * FLIGHT_TUNING.referenceFps * timeMultiplier;
            if (b.custom3DPivot) {
              b.custom3DPivot.rotation.y += 0.004 * GLOBAL_SPEED_SCALE * dt * FLIGHT_TUNING.referenceFps * timeMultiplier;
            }
          } else if (b.type === 'moon') {
            b.pivot.rotation.y += b.speed * GLOBAL_SPEED_SCALE * dt * FLIGHT_TUNING.referenceFps * timeMultiplier;
            b.mesh.rotation.y += 0.008 * GLOBAL_SPEED_SCALE * dt * FLIGHT_TUNING.referenceFps * timeMultiplier;
            if (b.custom3DPivot) {
              b.custom3DPivot.rotation.y += 0.008 * GLOBAL_SPEED_SCALE * dt * FLIGHT_TUNING.referenceFps * timeMultiplier;
            }
          }
        });

        atmosphereMeshes.forEach(atm => {
          const mat = atm.material as THREE.ShaderMaterial;
          if (mat.uniforms && mat.uniforms.viewVector) {
            const wPos = new THREE.Vector3();
            atm.getWorldPosition(wPos);
            mat.uniforms.viewVector.value.copy(camera.position).sub(wPos).normalize();
          }
        });

        // Flight physics
        if (flightModeActive) {
          const currentSpeed = shipVelocity.length();
          const gearLevel = gearForThrust(currentThrust);
          const movementRatio = Math.min(currentSpeed / Math.max(currentThrust * 300, 0.001), 1);
          const turnAuthority = 0.65 + 0.35 * movementRatio;
          const canControl = !isExploded && !isTraveling;
          const pitchInput = canControl ? Number(keys.up) - Number(keys.down) : 0;
          const yawInput = canControl ? Number(keys.left) - Number(keys.right) : 0;
          const steeringBlend = dampingFactor(FLIGHT_TUNING.steeringResponse, dt);
          shipAngularVelocity.x += (pitchInput * FLIGHT_TUNING.pitchRate * turnAuthority - shipAngularVelocity.x) * steeringBlend;
          shipAngularVelocity.y += (yawInput * FLIGHT_TUNING.turnRate * turnAuthority - shipAngularVelocity.y) * steeringBlend;
          visualBank += (-yawInput * FLIGHT_TUNING.bankAngle - visualBank) * steeringBlend;
          const mesh = playerShip.getObjectByName('TheShipModel');
          if (mesh) {
            mesh.rotation.z = visualBank + barrelRollState.z;
            mesh.position.z = recoilState.z;
            mesh.rotation.x = recoilState.pitch;
          }
          if (canControl) {
            const dq = new THREE.Quaternion().setFromEuler(new THREE.Euler(
              shipAngularVelocity.x * dt, shipAngularVelocity.y * dt, 0, 'YXZ'
            ));
            playerShip.quaternion.multiply(dq).normalize();
          }
          const braking = canControl && keys.brake;
          const thrusting = canControl && keys.space && !braking;
          throttleEnvelope += ((thrusting ? 1 : 0) - throttleEnvelope) * dampingFactor(FLIGHT_TUNING.throttleResponse, dt);
          if (canControl) {
            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(playerShip.quaternion);
            shipVelocity.addScaledVector(dir, currentThrust * 60 * throttleEnvelope * dt);
            if (braking) shipVelocity.multiplyScalar(Math.exp(-FLIGHT_TUNING.brakeDrag * dt));
          }
          if (thrusting) {
            trailEmission += dt * FLIGHT_TUNING.trailRate;
            while (trailEmission >= 1) { spawnTrailParticle(); trailEmission--; }
          } else trailEmission = 0;
          audio.updateThrust(throttleEnvelope * Math.min(currentThrust / 0.02, 1));
          if (engineGlow) {
            engineGlow.intensity += (throttleEnvelope * 1.4 - engineGlow.intensity) * dampingFactor(10, dt);
          }

          // Newtonian gravity
          if (gravityEnabled) {
            gravityAccumulator.set(0,0,0);
            let nearestBody: string | null = null; let nearestDist = Infinity; let nearestForce = 0;

            const shipPos = playerShip.position;
            const toSun = sunMesh.position.clone().sub(shipPos);
            const sunDist = Math.max(toSun.length(), 6);
            const sunForce = G_CONSTANT * 100000 / (sunDist * sunDist);
            gravityAccumulator.add(toSun.normalize().multiplyScalar(sunForce));
            if (sunDist < nearestDist) { nearestDist = sunDist; nearestBody = 'Sun'; nearestForce = sunForce; }

            ssBodies.forEach((b: any) => {
              const wp = new THREE.Vector3(); b.mesh.getWorldPosition(wp);
              const toBod = wp.clone().sub(shipPos);
              const dist = Math.max(toBod.length(), b.mesh.userData.radius || 1);
              const mass = b.gravMass || 100;
              const force = G_CONSTANT * mass / (dist * dist);
              gravityAccumulator.add(toBod.normalize().multiplyScalar(force));
              if (dist < nearestDist) { nearestDist = dist; nearestBody = b.mesh.userData.name||'?'; nearestForce = force; }
            });

            shipVelocity.add(gravityAccumulator.multiplyScalar(dt));

            document.getElementById('grav-body')!.innerText = nearestBody || '—';
            document.getElementById('grav-force')!.innerText = (nearestForce * 1e6).toFixed(3);
            document.getElementById('fhud-grav')!.innerText = (nearestForce * 1e6).toFixed(3);
          }

          if (currentSpeed > 0.000001) {
            const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(playerShip.quaternion);
            const fwdSpeed = shipVelocity.dot(fwd);
            const pureFwd = fwd.clone().multiplyScalar(fwdSpeed);
            shipVelocity.lerp(pureFwd, dampingFactor(FLIGHT_TUNING.lateralGrip, dt));
          }
          shipVelocity.multiplyScalar(Math.exp(-FLIGHT_TUNING.drag * dt));

          if (!isExploded) {
            if (!isTraveling) playerShip.position.addScaledVector(shipVelocity, dt * FLIGHT_TUNING.referenceFps);
            playerShip.updateMatrixWorld(true);

            // ── PLAYER FIRING LASER CANNONS ──
            if (keys.fire && (clock.getElapsedTime() - lastPlayerShotTime >= PLAYER_FIRE_COOLDOWN)) {
              lastPlayerShotTime = clock.getElapsedTime();
              initAudio();
              audio.playPlayerLaser();
              fireWeaponRecoil();

              const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(playerShip.quaternion);
              const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerShip.quaternion);

              // Smart Aim-Assist: If crosshair is near an enemy, gimbal laser direction towards target
              let fireDir = fwd.clone();
              let bestDot = 0.88;
              let targetPos: THREE.Vector3 | null = null;
              enemyShips.forEach(e => {
                if (!e.active) return;
                const toE = new THREE.Vector3().subVectors(e.mesh.position, playerShip.position).normalize();
                const dot = fwd.dot(toE);
                if (dot > bestDot) {
                  bestDot = dot;
                  targetPos = e.mesh.position;
                }
              });

              if (targetPos) {
                const toTarget = new THREE.Vector3().subVectors(targetPos, playerShip.position).normalize();
                fireDir = fwd.clone().lerp(toTarget, 0.45).normalize();
              }

              // Dual wingtip laser salvos
              const leftNozzle = playerShip.position.clone()
                .addScaledVector(right, -VESSEL_SCALE.playerLength * 0.4)
                .addScaledVector(fwd, VESSEL_SCALE.playerLength * 0.5);
              const rightNozzle = playerShip.position.clone()
                .addScaledVector(right, VESSEL_SCALE.playerLength * 0.4)
                .addScaledVector(fwd, VESSEL_SCALE.playerLength * 0.5);

              spawnLaserBolt(leftNozzle, fireDir, true);
              spawnLaserBolt(rightNozzle, fireDir, true);

              // Muzzle Flash Light flash
              muzzleFlashLight.intensity = 2.8;
            }

            muzzleFlashLight.intensity = Math.max(0, muzzleFlashLight.intensity - dt * 22.0);

            // ── COLLISION DETECTION ──
            const shipPos = playerShip.position;
            const shipRadius = VESSEL_SCALE.playerLength * 0.5;

            // 1. Collision with Sun (radius ~ 6.0)
            const sunDist = shipPos.distanceTo(sunMesh.position);
            if (sunDist < 6.0 + shipRadius) {
              shipPos.sub(sunMesh.position).normalize().multiplyScalar(6.0 + shipRadius).add(sunMesh.position);
              triggerExplosion(shipPos.clone(), 'The Sun', true);
            }

            // 2. Collision with Planets & Moons
            if (!isExploded) {
              for (const b of ssBodies) {
                const wp = new THREE.Vector3();
                b.mesh.getWorldPosition(wp);
                const bodyRadius = b.mesh.userData?.radius || (b.type === 'moon' ? 0.3 : 1.0);
                const dist = shipPos.distanceTo(wp);
                if (dist < bodyRadius + shipRadius) {
                  // Resolve to the surface so a tiny vessel's blast is not buried by a large frame step.
                  shipPos.sub(wp).normalize().multiplyScalar(bodyRadius + shipRadius).add(wp);
                  triggerExplosion(shipPos.clone(), b.mesh.userData?.name || 'Celestial Body', true);
                  break;
                }
              }
            }

            // 3. Physical 3D Contact Collision with Individual Asteroids
            if (!isExploded) {
              const rXZ = Math.sqrt(shipPos.x * shipPos.x + shipPos.z * shipPos.z);
              if (rXZ >= 39.0 && rXZ <= 48.0 && Math.abs(shipPos.y) <= 1.8) {
                for (let i = 0; i < asteroidBodies.length; i += 3) {
                  const ast = asteroidBodies[i];
                  if (shipPos.distanceTo(ast.pos) < (ast.radius + shipRadius)) {
                    triggerExplosion(shipPos.clone(), 'Asteroid Impact', true);
                    break;
                  }
                }
              }
            }

            // Regenerate Shields when not under fire (+10%/sec)
            if (!isExploded && playerHealth < PLAYER_MAX_HEALTH) {
              playerHealth = Math.min(PLAYER_MAX_HEALTH, playerHealth + 10.0 * dt);
              updateHealthHUD();
            }
          }

          // ── ENEMY TIE FLEET AI & COMBAT UPDATE ──
          let hasLockedTarget = false;
          const crosshairEl = document.getElementById('combat-crosshair');

          enemyShips.forEach((enemy) => {
            if (!enemy.active) return;

            const distToPlayer = enemy.mesh.position.distanceTo(playerShip.position);

            // Orbit patrol or engage player in dogfight
            if (flightModeActive && !isExploded && distToPlayer < 25.0) {
              // ENGAGEMENT DOGFIGHT MODE: Swarm & pursue player ship
              const toPlayer = new THREE.Vector3().subVectors(playerShip.position, enemy.mesh.position);
              const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
                new THREE.Matrix4().lookAt(enemy.mesh.position, playerShip.position, new THREE.Vector3(0, 1, 0))
              );
              enemy.mesh.quaternion.slerp(targetQuat, dampingFactor(2.5, dt));

              // Fly towards attack distance (~1.8 units away)
              const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.mesh.quaternion);
              const desiredSpeed = distToPlayer > 3.0 ? 0.6 : (distToPlayer < 1.5 ? -0.2 : 0.1);
              enemy.mesh.position.addScaledVector(forward, desiredSpeed * dt * 10);

              // Enemy green plasma laser firing
              enemy.fireCooldown -= dt;
              if (enemy.fireCooldown <= 0 && distToPlayer < 18.0) {
                enemy.fireCooldown = 1.2 + Math.random() * 1.5;
                initAudio();
                audio.playEnemyLaser();

                // Fire from 3 tri-wing cannon tips
                const shootOrigin = enemy.mesh.position.clone().addScaledVector(forward, 0.1);
                // Slight aim scatter
                const aimDir = toPlayer.clone().normalize();
                aimDir.x += (Math.random() - 0.5) * 0.06;
                aimDir.y += (Math.random() - 0.5) * 0.06;
                aimDir.z += (Math.random() - 0.5) * 0.06;
                aimDir.normalize();

                spawnLaserBolt(shootOrigin, aimDir, false);
              }

              // Check if player's reticle is aimed directly at this enemy
              const playerFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(playerShip.quaternion);
              const playerToEnemy = new THREE.Vector3().subVectors(enemy.mesh.position, playerShip.position).normalize();
              if (playerFwd.dot(playerToEnemy) > 0.985) {
                hasLockedTarget = true;
              }

              // Ramming collision check with player
              if (distToPlayer < (VESSEL_SCALE.playerLength + VESSEL_SCALE.enemyLength) * 0.5 && !isExploded) {
                triggerExplosion(enemy.mesh.position.clone(), 'Enemy TIE Fighter', false);
                enemy.active = false;
                enemy.mesh.visible = false;
                playerHealth -= 40;
                updateHealthHUD();
                if (playerHealth <= 0) {
                  triggerExplosion(playerShip.position.clone(), 'Ship Collision', true);
                }
              }
            } else {
              // PATROL ORBIT MODE: Orbit around the solar system
              enemy.patrolAngle += enemy.orbitSpeed * dt * 0.2;
              const tx = Math.cos(enemy.patrolAngle) * enemy.orbitRadius;
              const tz = Math.sin(enemy.patrolAngle) * enemy.orbitRadius;
              const nextPos = new THREE.Vector3(tx, enemy.orbitHeight, tz);
              const forward = new THREE.Vector3().subVectors(nextPos, enemy.mesh.position).normalize();
              if (forward.lengthSq() > 0.001) {
                const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
                  new THREE.Matrix4().lookAt(enemy.mesh.position, nextPos, new THREE.Vector3(0, 1, 0))
                );
                enemy.mesh.quaternion.slerp(targetQuat, dampingFactor(6.32, dt));
              }
              enemy.mesh.position.copy(nextPos);
            }
          });

          // Update HUD target lock crosshair
          if (crosshairEl) {
            if (hasLockedTarget) crosshairEl.classList.add('locked');
            else crosshairEl.classList.remove('locked');
          }

          // Project Enemy 3D Positions to Screen Space HUD Brackets
          const enemyHudContainer = document.getElementById('enemy-hud-container');
          if (enemyHudContainer && flightModeActive) {
            enemyShips.forEach((enemy, idx) => {
              const tagEl = document.getElementById(`enemy-tag-${idx}`);
              if (!tagEl) return;

              if (!enemy.active || isExploded) {
                tagEl.style.display = 'none';
                return;
              }

              // Vector in camera space
              const screenPos = enemy.mesh.position.clone().project(camera);
              const isBehind = screenPos.z > 1.0;
              const dist = enemy.mesh.position.distanceTo(playerShip.position);

              if (isBehind || screenPos.x < -1.1 || screenPos.x > 1.1 || screenPos.y < -1.1 || screenPos.y > 1.1 || dist > 45.0) {
                tagEl.style.display = 'none';
              } else {
                tagEl.style.display = 'block';
                const px = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
                const py = (screenPos.y * -0.5 + 0.5) * window.innerHeight;
                tagEl.style.transform = `translate(${px}px, ${py}px)`;

                const distEl = document.getElementById(`enemy-dist-${idx}`);
                if (distEl) {
                  distEl.innerText = `${(dist * 100).toFixed(0)}m · ${Math.round((enemy.health / enemy.maxHealth) * 100)}%`;
                }
              }
            });
          }

          // ── UPDATE & COLLIDE ALL ACTIVE LASER BOLTS ──
          for (let i = laserBolts.length - 1; i >= 0; i--) {
            const bolt = laserBolts[i];
            bolt.life += dt;
            const nextPos = bolt.mesh.position.clone().addScaledVector(bolt.dir, bolt.speed * dt * 50);
            const sweepLine = new THREE.Line3(bolt.prevPos, nextPos);
            bolt.mesh.position.copy(nextPos);

            let hit = false;
            const closestPt = new THREE.Vector3();

            if (bolt.isPlayer) {
              // Check hit against active enemies with generous hitbox (0.75 units)
              for (const enemy of enemyShips) {
                if (!enemy.active) continue;
                sweepLine.closestPointToPoint(enemy.mesh.position, true, closestPt);
                const d = closestPt.distanceTo(enemy.mesh.position);
                if (d < 0.75) {
                  hit = true;
                  initAudio();
                  audio.playHitImpact();
                  spawnLaserImpact(closestPt.clone(), true);
                  enemy.health -= 30;

                  // Visual damage spark
                  if (enemy.health <= 0) {
                    enemy.active = false;
                    enemy.mesh.visible = false;
                    enemiesKilled++;
                    updateCombatStatsHUD();
                    audio.playKillScore();
                    triggerExplosion(enemy.mesh.position.clone(), 'Star Wars Fighter', false);
                    showScorePopup('🎯 +100 PTS • ALVO DESTRUÍDO!', '#00ffcc');

                    // Respawn enemy after delay to keep the dogfight intense
                    setTimeout(() => {
                      enemy.health = enemy.maxHealth;
                      enemy.active = true;
                      enemy.mesh.visible = true;
                      const randomAngle = Math.random() * Math.PI * 2;
                      enemy.mesh.position.set(
                        Math.cos(randomAngle) * enemy.orbitRadius,
                        enemy.orbitHeight,
                        Math.sin(randomAngle) * enemy.orbitRadius
                      );
                      updateCombatStatsHUD();
                    }, 7000);
                  }
                  break;
                }
              }
            } else {
              // Enemy laser hitting player
              if (!isExploded) {
                sweepLine.closestPointToPoint(playerShip.position, true, closestPt);
                const d = closestPt.distanceTo(playerShip.position);
                if (d < 0.45) {
                  hit = true;
                  initAudio();
                  if (isBarrelRolling) {
                    spawnLaserImpact(closestPt.clone(), false);
                    showScorePopup('⚡ LASER DESVIADO!', '#00e5ff');
                  } else {
                    audio.playHitImpact();
                    spawnLaserImpact(closestPt.clone(), false);
                    triggerShieldPulse();
                    cameraShakeIntensity = Math.max(cameraShakeIntensity, 0.35);
                    playerHealth -= 5;
                    updateHealthHUD();

                    if (playerHealth <= 0) {
                      triggerExplosion(playerShip.position.clone(), 'Imperial Turbolasers', true);
                    }
                  }
                }
              }
            }

            bolt.prevPos.copy(bolt.mesh.position);

            // Remove decayed or collided laser bolts
            if (hit || bolt.life >= bolt.maxLife) {
              sceneSS.remove(bolt.mesh);
              laserBolts.splice(i, 1);
            }
          }

          updateTrail(dt);
          updateLaserImpacts(dt);
          updateExplosion(dt);

          // ── MISSION & HOLOGRAPHIC WAYPOINT UPDATE ──
          if (!isExploded) {
            const activeMission = getMissionByIndex(currentMissionIndex);
            if (activeMission) {
              if (lastMissionId !== activeMission.id) {
                lastMissionId = activeMission.id;
                updateMissionHUD();
                if (getMissionWorldPosition(activeMission, currentBeaconTargetPos)) {
                  missionInitialDistance = Math.max(20, playerShip.position.distanceTo(currentBeaconTargetPos));
                }
              }

              if (getMissionWorldPosition(activeMission, currentBeaconTargetPos)) {
                beaconGroup.position.copy(currentBeaconTargetPos);
                beaconGroup.visible = true;

                // Animate holographic beacon
                beaconRing1.rotation.x += 1.4 * dt;
                beaconRing1.rotation.y += 0.9 * dt;
                beaconRing2.rotation.y -= 1.6 * dt;
                beaconRing2.rotation.z += 1.1 * dt;
                beaconCrystal.position.y = Math.sin(animationTime * 0.0035) * 0.15;
                beaconCrystal.rotation.y += 2.0 * dt;
                beaconPointLight.intensity = 1.2 + Math.sin(animationTime * 0.006) * 0.5;

                const distToTarget = playerShip.position.distanceTo(currentBeaconTargetPos);

                // Update HUD distance & progress
                const distEl = document.getElementById('mission-dist-text');
                const barEl = document.getElementById('mission-bar-fill');
                const markerDistEl = document.getElementById('mission-marker-dist');
                if (distEl) distEl.innerText = formatMissionDistance(distToTarget);
                if (markerDistEl) markerDistEl.innerText = formatMissionDistance(distToTarget);
                if (barEl) {
                  const progress = calculateMissionProgress(distToTarget, activeMission.completionRadius, missionInitialDistance);
                  barEl.style.width = `${progress}%`;
                }

                // 2D Viewport marker projection
                const markerEl = document.getElementById('mission-nav-marker');
                if (markerEl) {
                  const screenPos = currentBeaconTargetPos.clone().project(camera);
                  const toTarget = currentBeaconTargetPos.clone().sub(camera.position);
                  const cameraDir = new THREE.Vector3();
                  camera.getWorldDirection(cameraDir);
                  const inFront = toTarget.dot(cameraDir) > 0;

                  if (inFront && screenPos.z < 1.0) {
                    const screenX = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
                    const screenY = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
                    markerEl.style.left = `${screenX}px`;
                    markerEl.style.top = `${screenY}px`;
                    markerEl.style.display = 'block';
                  } else {
                    markerEl.style.display = 'none';
                  }
                }

                // Check mission completion
                if (distToTarget <= activeMission.completionRadius) {
                  totalScore += activeMission.reward;
                  initAudio();
                  audio.playMissionComplete();
                  showScorePopup(`🏆 MISSÃO CUMPRIDA! +${activeMission.reward} PTS`, '#7cdbb0');
                  showToast(`🎉 OBJETIVO CONCLUÍDO: ${activeMission.title}! RECOMPENSA: +${activeMission.reward} PTS`);
                  updateCombatStatsHUD();

                  // Celebratory ring pulse via Tween.js
                  const pulseObj = { scale: 1.0, opacity: 0.9 };
                  new TWEEN.Tween(pulseObj, animationGroup)
                    .to({ scale: 3.5, opacity: 0 }, 750)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .onUpdate(() => {
                      beaconRing2.scale.setScalar(pulseObj.scale);
                      beaconRing2Mat.opacity = pulseObj.opacity;
                    })
                    .onComplete(() => {
                      beaconRing2.scale.setScalar(1.0);
                      beaconRing2Mat.opacity = 0.85;
                    })
                    .start(animationTime);

                  currentMissionIndex++;
                  const nextMission = getMissionByIndex(currentMissionIndex);
                  updateMissionHUD();
                  if (getMissionWorldPosition(nextMission, currentBeaconTargetPos)) {
                    missionInitialDistance = Math.max(20, playerShip.position.distanceTo(currentBeaconTargetPos));
                  }
                }
              }
            }
          } else {
            beaconGroup.visible = false;
            const markerEl = document.getElementById('mission-nav-marker');
            if (markerEl) markerEl.style.display = 'none';
          }

          document.getElementById('fhud-speed')!.innerText = isExploded ? '0.00000' : shipVelocity.length().toFixed(5);
          const thrPct = ({0.0002:5, 0.001:25, 0.005:60, 0.02:100} as any)[currentThrust] || 5;
          document.getElementById('fhud-thrust-bar')!.style.width = isExploded ? '0%' : (thrPct + '%');
          document.getElementById('fhud-thrust')!.innerText = isExploded ? 'DESTROYED' : ('LVL ' + gearLevel);
          const altFromSun = playerShip.position.length().toFixed(1);
          document.getElementById('fhud-alt')!.innerText = altFromSun + ' AU';

          const mesh2 = playerShip.getObjectByName('TheShipModel');
          if (mesh2) mesh2.visible = !isExploded;
          bloomPass.strength = isExploded ? 0.9 : 0.65;
          const cOff = isExploded
            ? new THREE.Vector3(0, TARGET_SHIP_SIZE * 3.2 + 0.8, TARGET_SHIP_SIZE * 7.5 + 2.0).applyMatrix4(playerShip.matrixWorld)
            : new THREE.Vector3(0, TARGET_SHIP_SIZE * 0.9 + 0.02, TARGET_SHIP_SIZE * 3.8 + 0.08).applyMatrix4(playerShip.matrixWorld);
          camera.position.copy(cOff);
          const lookTgt = isExploded
            ? playerShip.position.clone()
            : new THREE.Vector3(0, TARGET_SHIP_SIZE * 0.2, -TARGET_SHIP_SIZE * 8 - 0.2).applyMatrix4(playerShip.matrixWorld);
          const upVec = new THREE.Vector3(0,1,0).applyQuaternion(playerShip.quaternion);
          if (mesh2 && !isExploded) {
            const sf = new THREE.Vector3(0,0,-1).applyQuaternion(playerShip.quaternion);
            upVec.applyAxisAngle(sf, mesh2.rotation.z * 0.5);
          }
          const tq = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(camera.position, lookTgt, upVec)
          );
          camera.quaternion.slerp(tq, dampingFactor(isExploded ? 13.4 : 6.32, dt));
        } else {
          beaconGroup.visible = false;
          const markerEl = document.getElementById('mission-nav-marker');
          if (markerEl) markerEl.style.display = 'none';
          controls.update();
          updateExplosion(dt);
        }

        // Travel is owned by Tween.js; the flight camera keeps its fixed offset.
        if (targetPlanet && !flightModeActive && !isTraveling) {
          const wp = new THREE.Vector3(); targetPlanet.getWorldPosition(wp);
          controls.target.copy(wp);
          if (isTransitioning) {
            const r = targetPlanet.userData.radius || 4;
            const dp = new THREE.Vector3(wp.x+r*3, wp.y+r*1.5, wp.z+r*3);
            camera.position.lerp(dp, dampingFactor(3.08, dt));
            if (camera.position.distanceTo(dp) < 0.5) isTransitioning = false;
          }
          if (targetPlanetData && targetPlanetData.type === 'planet') {
            const dist = Math.sqrt(targetPlanetData.system.position.x**2 + targetPlanetData.system.position.z**2);
            document.getElementById('hud-distance')!.innerText = `Distance: ${(dist*3.8).toFixed(1)} M km`;
            document.getElementById('hud-orbit')!.innerText = `Orbit: ${(targetPlanetData.angle % (Math.PI*2) * 180/Math.PI).toFixed(1)}°`;
            document.getElementById('hud-speed')!.innerText = `Speed: ${(targetPlanetData.speed*100).toFixed(4)} au/s`;
          } else if (targetPlanetData && targetPlanetData.type === 'moon') {
            document.getElementById('hud-distance')!.innerText = `Distance: Orbiting Planet`;
            document.getElementById('hud-orbit')!.innerText = `Orbit: Satellite`;
            document.getElementById('hud-speed')!.innerText = `Speed: ${(targetPlanetData.speed*100).toFixed(4)} au/s`;
          } else if (targetPlanet.userData.name === "The Sun") {
            document.getElementById('hud-distance')!.innerText = `Distance: 0.0 M km`;
            document.getElementById('hud-orbit')!.innerText = `Orbit: Center`;
            document.getElementById('hud-speed')!.innerText = `Speed: 0.0000 au/s`;
          }
        } else if (isTransitioning && !flightModeActive && !orreryMode) {
          const dp = new THREE.Vector3(controls.target.x, 60, controls.target.z+120);
          camera.position.lerp(dp, dampingFactor(3.08, dt));
          if (camera.position.distanceTo(dp) < 1.0) isTransitioning = false;
        }

        composer.render();
      }

      animFrameId = requestAnimationFrame(tick);
    };

    tick();

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameId);
      animationGroup.removeAll();
      sceneSS.remove(smokeMesh);
      smokeMat.dispose();
      sceneSS.remove(beaconGroup);
      beaconCrystalGeo.dispose(); beaconCrystalMat.dispose();
      beaconRing1Geo.dispose(); beaconRingMat.dispose();
      beaconRing2Geo.dispose(); beaconRing2Mat.dispose();
      beaconBeamGeo.dispose(); beaconBeamMat.dispose();
      window.removeEventListener('blur', releaseControls);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('pointerdown', unlockAudioHandler);
      window.removeEventListener('touchstart', unlockAudioHandler);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      audio.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="universe-root">
      <div id="canvas-container" ref={canvasRef} />
      <div id="fade-overlay" />
      <div id="crosshair" />
      <div id="orrery-label">◉ ORRERY MODE — TOP VIEW</div>

      {/* MILKY WAY UI */}
      <div id="ui-milky-way" className="ui-layer">
        <div className="top-nav">
          <button id="btn-toggle-mw-info">ℹ Info</button>
        </div>
        <div className="info-panel panel-hidden" id="mw-info-card" style={{ position:'absolute', top:'68px', left:'20px' }}>
          <h1 className="mw-title">Milky Way</h1>
          <h2>Our Galactic Home</h2>
          <ul className="fact-list mw-list">
            <li><strong>Type:</strong> Barred Spiral Galaxy</li>
            <li><strong>Diameter:</strong> ~100,000–120,000 light-years</li>
            <li><strong>Stars:</strong> 100–400 billion estimated</li>
            <li><strong>Location:</strong> Orion–Cygnus Arm</li>
            <li><strong>Age:</strong> ~13.6 billion years</li>
          </ul>
        </div>
        <div className="controls-hint" id="mw-hint">▼ Click the marker to enter the Solar System</div>
      </div>

      {/* SOLAR SYSTEM UI */}
      <div id="ui-solar-system" className="ui-layer hidden-ui">
        <div className="top-nav">
          <button id="btn-back-galaxy" className="btn-danger">🌌 Galaxy</button>
          <button id="btn-back-system" className="btn-danger" style={{ display:'none' }}>☀ Free View</button>
          <button id="btn-flight-mode" className="btn-success">🚀 Pilot Ship</button>
          <button id="btn-toggle-orbits">◯ Orbits</button>
          <button id="btn-orrery">⊙ Orrery</button>
          <button id="btn-gravity">⚛ Gravity</button>
          <button id="btn-toggle-ss-info">ℹ Info</button>
        </div>

        <div className="info-panel panel-hidden" id="ss-info-card" style={{ position:'absolute', top:'68px', left:'20px' }}>
          <h1 id="info-title">Solar System</h1>
          <h2 id="info-subtitle">Interactive Environment</h2>
          <ul className="fact-list" id="info-facts">
            <li><strong>Combat:</strong> Key A = Fire Lasers · Defend against Imperial TIE Fleet</li>
            <li><strong>Flight:</strong> Arrows = pitch/yaw · Space = thrust · Shift = brake</li>
            <li><strong>Gears:</strong> Keys 1–4 for speed levels (Cruise, Impulse, Combat, Hyperdrive)</li>
            <li><strong>Health:</strong> Real-time Hull Integrity bar with critical damage warnings</li>
            <li><strong>Explosions:</strong> Volumetric 3D fireball and shrapnel on ship destruction</li>
            <li><strong>Orbits & Orrery:</strong> Toggle orbital paths and top-down solar mechanics</li>
          </ul>
          <div id="planet-stats" style={{ display:'none', marginTop:'14px' }}>
            <div style={{ borderTop:'1px solid rgba(79,195,247,0.15)', paddingTop:'12px', marginBottom:'8px', fontSize:'0.72rem', color:'#3a6080', letterSpacing:'1px', textTransform:'uppercase' }}>Planetary Data</div>
            <div className="planet-stat"><span>Mass</span><span id="stat-mass">—</span></div>
            <div className="planet-stat"><span>Radius</span><span id="stat-radius">—</span></div>
            <div className="planet-stat"><span>Orbital Period</span><span id="stat-period">—</span></div>
            <div className="planet-stat"><span>Surface Temp</span><span id="stat-temp">—</span></div>
            <div className="planet-stat"><span>Moons</span><span id="stat-moons">—</span></div>
          </div>
          <div id="dynamic-hud" className="dynamic-hud">
            <div id="hud-distance">Distance: —</div>
            <div id="hud-orbit">Orbit Angle: —</div>
            <div id="hud-speed">Speed: —</div>
          </div>
        </div>

        <div id="planet-navigator">
          <span className="nav-label">🚀 Travel:</span>
          <button id="nav-The Sun"><span className="planet-dot" style={{ background:'#ffdd44' }} />Sun</button>
          <button id="nav-Mercury"><span className="planet-dot" style={{ background:'#aaaaaa' }} />Mercury</button>
          <button id="nav-Venus"><span className="planet-dot" style={{ background:'#ddaa66' }} />Venus</button>
          <button id="nav-Earth"><span className="planet-dot" style={{ background:'#4488ff' }} />Earth</button>
          <button id="nav-The Moon"><span className="planet-dot" style={{ background:'#e0e0e0' }} />Moon</button>
          <button id="nav-Mars"><span className="planet-dot" style={{ background:'#cc4422' }} />Mars</button>
          <button id="nav-Jupiter"><span className="planet-dot" style={{ background:'#cc9955' }} />Jupiter</button>
          <button id="nav-Saturn"><span className="planet-dot" style={{ background:'#ddbb77' }} />Saturn</button>
          <button id="nav-Uranus"><span className="planet-dot" style={{ background:'#77ccdd' }} />Uranus</button>
          <button id="nav-Neptune"><span className="planet-dot" style={{ background:'#3355cc' }} />Neptune</button>
          <button id="nav-Pluto"><span className="planet-dot" style={{ background:'#cc8888' }} />Pluto</button>
        </div>

        <div id="time-controls">
          <span className="time-label">⏱ Time:</span>
          <button id="btn-pause">⏸ Pause</button>
          <button id="btn-1x" className="btn-active">▶ 1×</button>
          <button id="btn-50x">⏩ 50×</button>
          <button id="btn-200x">⏭ 200×</button>
        </div>

        {/* COMBAT HUD: HEALTH BAR, ENEMY STATS & MISSION CARD */}
        <div id="combat-hud">
          <div className="combat-card">
            <div className="combat-header">
              <span>HULL INTEGRITY</span>
              <span id="player-health-text" style={{ color: '#00e676' }}>100%</span>
            </div>
            <div className="health-bar-container">
              <div id="player-health-fill" className="health-bar-fill" style={{ width: '100%' }} />
            </div>
            <div className="combat-stats">
              <span>ENEMIES: <strong id="combat-enemies-text" style={{ color: '#ff5252' }}>6</strong></span>
              <span>SCORE: <strong id="combat-kills-text" style={{ color: '#00e5ff' }}>0</strong></span>
            </div>
            <div className="combat-controls-tip">
              ⚔ KEY A: CANNONS · SPACE: THRUST · 1-4: GEARS
            </div>
          </div>

          {/* ACTIVE MISSION OBJECTIVE CARD */}
          <div className="mission-card" id="mission-hud-card">
            <div className="mission-header">
              <span className="mission-badge">OBJETIVO ATIVO</span>
              <span className="mission-reward" id="mission-reward-text">+250 PTS</span>
            </div>
            <div className="mission-title" id="mission-title-text">1. Reconhecimento Lunar</div>
            <div className="mission-desc" id="mission-desc-text">Aproxime-se do sinalizador orbital na Lua</div>
            <div className="mission-progress-row">
              <span>DISTÂNCIA</span>
              <span id="mission-dist-text">—</span>
            </div>
            <div className="mission-bar-container">
              <div className="mission-bar-fill" id="mission-bar-fill" style={{ width: '0%' }} />
            </div>
          </div>
        </div>

        <div id="gravity-indicator">
          <div>⚛ GRAVITY: <span id="grav-status">OFF</span></div>
          <div>Nearest: <span id="grav-body">—</span></div>
          <div>Pull: <span id="grav-force">0.00</span> m/s²</div>
        </div>

        <div id="flight-hud">
          <div className="hud-row">
            <span>SPEED</span>
            <span className="hud-value" id="fhud-speed">0.000</span>
          </div>
          <div className="hud-row">
            <span>THRUST</span>
            <div className="hud-bar"><div className="hud-fill" id="fhud-thrust-bar" style={{ width:'0%' }} /></div>
            <span className="hud-value" id="fhud-thrust">LVL 1</span>
          </div>
          <div className="hud-row">
            <span>ALT</span>
            <span className="hud-value" id="fhud-alt">—</span>
          </div>
          <div className="hud-row" id="fhud-grav-row" style={{ display:'none' }}>
            <span>GRAV PULL</span>
            <span className="hud-value" id="fhud-grav">0.00</span>
          </div>
        </div>

      </div>

      {/* COMBAT TARGETING RETICLE */}
      <div id="combat-crosshair">
        <div className="ch-circle" />
      </div>

      {/* DYNAMIC ENEMY 3D HUD TARGET BOXES */}
      <div id="enemy-hud-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4, display: 'none' }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            id={`enemy-tag-${i}`}
            className="enemy-target-tag"
            style={{ display: 'none' }}
          >
            <div className="target-box" />
            <div className="target-info">
              <span className="target-name">TIE-DEFENDER #{i + 1}</span>
              <span id={`enemy-dist-${i}`} className="target-dist">0m</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3D HOLOGRAPHIC MISSION WAYPOINT HUD */}
      <div id="mission-nav-marker">
        <div className="mission-marker-box">
          <div className="mission-marker-diamond" />
          <div className="mission-marker-info">
            <span id="mission-marker-name">THE MOON</span>
            <span id="mission-marker-dist">—</span>
          </div>
        </div>
      </div>

      {/* TARGET MARKER */}
      <div id="target-marker">
        <div className="marker-label">Solar System</div>
        <div className="arrow-down" />
        <div className="marker-glow" />
      </div>

      <div id="toast-message">—</div>
    </div>
  );
};

export default Index;
