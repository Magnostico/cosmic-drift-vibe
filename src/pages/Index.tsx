import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SpaceAudioEngine } from '../lib/spaceAudio';
import '../styles/universe.css';

const Index = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || initialized.current) return;
    initialized.current = true;

    // ════════════════════════════════════════════════════════════
    //  UNIVERSE V3.0 — STELLAR EDITION
    // ════════════════════════════════════════════════════════════

    const TARGET_SHIP_SIZE = 0.00001;
    const GLOBAL_SPEED_SCALE = 0.01;
    const G_CONSTANT = 0.0000008;

    let activeScene = 'milkyWay';
    let flightModeActive = false;
    let timeMultiplier = 1;
    let gravityEnabled = false;
    let showOrbits = false;
    let orreryMode = false;
    let isTransitioning = false;
    let cameraView = 'chase';
    let cockpitYAngle = 0; // radians, user-adjustable cockpit camera Y rotation
    let toastTimeout: ReturnType<typeof setTimeout>;
    const audio = new SpaceAudioEngine();
    let audioInitialized = false;
    const initAudio = () => { if (!audioInitialized) { audio.init(); audioInitialized = true; } };

    // ── RENDERER ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasRef.current.appendChild(renderer.domElement);

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
    sceneSS.add(new THREE.AmbientLight(0x222233, 1.2));

    const sunLight = new THREE.PointLight(0xfffbe8, 3.0, 500);
    sunLight.decay = 1;
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 500;
    sceneSS.add(sunLight);

    // Bloom composer
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(sceneSS, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 1.4, 0.5, 0.82
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
    const coronaGeo = new THREE.SphereGeometry(7.2, 32, 32);
    const coronaMat = new THREE.ShaderMaterial({
      uniforms: { c: { value: 0.3 }, p: { value: 4.5 }, glowColor: { value: new THREE.Color(0xffdd88) } },
      vertexShader: `
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(vec3(modelViewMatrix * vec4(position, 1.0)));
          intensity = pow(0.6 - dot(vNormal, vNormel), 4.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          gl_FragColor = vec4(glowColor * intensity, intensity * 0.8);
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
    for (let i = 0; i < 8000; i++) {
      const dist = 40 + Math.random() * 7; const ang = Math.random() * Math.PI * 2;
      dMat.position.set(Math.cos(ang)*dist, (Math.random()-0.5)*2, Math.sin(ang)*dist);
      dMat.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      const s = Math.random() * 0.8 + 0.2; dMat.scale.set(s,s,s);
      dMat.updateMatrix(); astBelt.setMatrixAt(i, dMat.matrix);
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
    //  FLIGHT SIMULATOR
    // ════════════════════════════════════════════════════════════
    const playerShip = new THREE.Group();
    const shipVelocity = new THREE.Vector3();
    const shipAngularVelocity = new THREE.Vector3();
    const keys = { up:false, down:false, left:false, right:false, space:false, q:false, e:false, brake:false };
    let engineGlow: THREE.PointLight | null = null;
    let currentThrust = 0.0002;
    const cockpitGroup = new THREE.Group();
    cockpitGroup.name = "CockpitModel";
    cockpitGroup.visible = false;
    let cockpitLoaded = false;
    // Expose cockpit angle adjustment to UI buttons
    (window as any).__cockpitRotLeft = () => { cockpitYAngle += Math.PI / 8; const deg = Math.round((cockpitYAngle * 180 / Math.PI) % 360); const el = document.getElementById('cockpit-angle-val'); if (el) el.innerText = deg + '°'; };
    (window as any).__cockpitRotRight = () => { cockpitYAngle -= Math.PI / 8; const deg = Math.round((cockpitYAngle * 180 / Math.PI) % 360); const el = document.getElementById('cockpit-angle-val'); if (el) el.innerText = deg + '°'; };
    (window as any).__cockpitRotReset = () => { cockpitYAngle = 0; const el = document.getElementById('cockpit-angle-val'); if (el) el.innerText = '0°'; };
    // Interior light for cockpit view - ambient so it illuminates evenly
    const cockpitLight = new THREE.AmbientLight(0xccccdd, 0);
    // Also a dim directional from above for depth
    const cockpitDirLight = new THREE.DirectionalLight(0xffffff, 0);
    cockpitDirLight.position.set(0, TARGET_SHIP_SIZE * 0.5, -TARGET_SHIP_SIZE * 0.3);
    const gravityAccumulator = new THREE.Vector3();

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
      size: 0.0004, vertexColors: true, map: trailTex,
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
      const exhaust = new THREE.Vector3(0, 0, TARGET_SHIP_SIZE * 0.6).applyMatrix4(playerShip.matrixWorld);
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
        trailSizes[i] = t * 0.002;
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
      const mat = new THREE.MeshStandardMaterial({ color: 0x9aaabb, metalness: 0.8, roughness: 0.3 });
      const body = new THREE.Mesh(new THREE.ConeGeometry(TARGET_SHIP_SIZE * 0.2, TARGET_SHIP_SIZE, 8), mat);
      body.rotation.x = -Math.PI / 2;
      body.name = "TheShipModel";
      playerShip.add(body);
    }
    buildProceduralShip();
    playerShip.position.set(30, 5, 0);
    playerShip.add(cockpitGroup);
    sceneSS.add(playerShip);
    sceneSS.add(cockpitLight);
    sceneSS.add(cockpitDirLight);

    // ════════════════════════════════════════════════════════════
    //  EVENTS
    // ════════════════════════════════════════════════════════════
    const onKeyDown = (e: KeyboardEvent) => {
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code==='ArrowUp')    keys.up=true;
      if (e.code==='ArrowDown')  keys.down=true;
      if (e.code==='ArrowLeft')  keys.left=true;
      if (e.code==='ArrowRight') keys.right=true;
      if (e.code==='Space')  keys.space=true;
      if (e.code==='KeyQ')   keys.q=true;
      if (e.code==='KeyE')   keys.e=true;
      if (e.code==='ShiftLeft'||e.code==='ShiftRight') keys.brake=true;
      if (flightModeActive) {
        const thr: Record<string, [number, string]> = { Digit1:[0.0002,"SCENIC CRUISE"], Digit2:[0.001,"IMPULSE"], Digit3:[0.005,"COMBAT"], Digit4:[0.02,"HYPERDRIVE"] };
        if (thr[e.code]) { currentThrust = thr[e.code][0]; showToast("THRUST: "+thr[e.code][1]); audio.playGearShift(Object.keys(thr).indexOf(e.code)+1); }
        if (e.code==='KeyC') {
          if (cameraView === 'chase') {
            cameraView = 'cockpit';
            cockpitGroup.visible = cockpitLoaded;
            showToast("COCKPIT VIEW");
          } else {
            cameraView = 'chase';
            cockpitGroup.visible = false;
            showToast("CHASE CAM");
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code==='ArrowUp')    keys.up=false;
      if (e.code==='ArrowDown')  keys.down=false;
      if (e.code==='ArrowLeft')  keys.left=false;
      if (e.code==='ArrowRight') keys.right=false;
      if (e.code==='Space')  keys.space=false;
      if (e.code==='KeyQ')   keys.q=false;
      if (e.code==='KeyE')   keys.e=false;
      if (e.code==='ShiftLeft'||e.code==='ShiftRight') keys.brake=false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

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
        targetPlanet = hit.object as THREE.Mesh;
        
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
      document.getElementById('planet-navigator')!.style.display = 'none';
    }

    // ── TRAVEL STATE ──
    let travelTarget: THREE.Mesh | null = null;
    let travelProgress = 0;
    let travelStartPos = new THREE.Vector3();
    let travelStartTarget = new THREE.Vector3();
    let isTraveling = false;
    const TRAVEL_DURATION = 2.0; // seconds

    function travelToPlanet(mesh: THREE.Mesh) {
      if (flightModeActive || isTraveling) return;
      initAudio();
      audio.playTransition();

      travelTarget = mesh;
      travelProgress = 0;
      travelStartPos.copy(camera.position);
      travelStartTarget.copy(controls.target);
      isTraveling = true;

      // Set as clicked planet too
      targetPlanet = mesh;
      targetPlanetData = ssBodies.find((b: any) => b.mesh === mesh);
      cameraLight.intensity = 1.0;

      const d = mesh.userData;
      document.getElementById('info-title')!.innerText = d.name;
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

      showToast("TRAVELING TO " + d.name.toUpperCase());
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
      if (flightModeActive) {
        document.getElementById('btn-flight-mode')!.innerText = '✖ Exit Flight';
        document.getElementById('btn-flight-mode')!.className = 'btn-danger';
        const off = new THREE.Vector3(0, TARGET_SHIP_SIZE * 0.8, TARGET_SHIP_SIZE * 3.5).applyMatrix4(playerShip.matrixWorld);
        camera.position.copy(off);
        showToast("FLIGHT MODE ── C = COCKPIT · 1-4 THRUST · SHIFT = BRAKE");
      } else {
        document.getElementById('btn-flight-mode')!.innerText = '🚀 Pilot Ship';
        document.getElementById('btn-flight-mode')!.className = 'btn-success';
        isTransitioning = true;
        cameraView = 'chase';
        cockpitGroup.visible = false;
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

    document.getElementById('btn-upload-model')!.addEventListener('click', () => document.getElementById('file-input')!.click());
    document.getElementById('file-input')!.addEventListener('change', (event: any) => {
      const files = Array.from(event.target.files) as File[];
      const main = files.find(f => f.name.endsWith('.gltf')||f.name.endsWith('.glb'));
      if (!main) return;
      const fileMap: Record<string, string> = {}; files.forEach(f => fileMap[f.name] = URL.createObjectURL(f));
      const mgr = new THREE.LoadingManager();
      mgr.setURLModifier((url: string) => fileMap[url.split('/').pop()!] || url);
      new GLTFLoader(mgr).load(fileMap[main.name], (gltf: any) => {
        // Remove old ship model and engine glow, but keep cockpitGroup
        const toRemove = playerShip.children.filter(c => c !== cockpitGroup);
        toRemove.forEach(c => playerShip.remove(c));
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const sz = new THREE.Vector3(); box.getSize(sz);
        const scale = TARGET_SHIP_SIZE / Math.max(sz.x, sz.y, sz.z);
        model.scale.setScalar(scale);
        const sc = new THREE.Box3().setFromObject(model);
        const ctr = new THREE.Vector3(); sc.getCenter(ctr);
        model.position.sub(ctr);
        const wrap = new THREE.Group(); wrap.add(model); wrap.name = "TheShipModel"; wrap.rotation.y = Math.PI;
        playerShip.add(wrap);
        engineGlow = new THREE.PointLight(0x44aaff, 0, TARGET_SHIP_SIZE*600);
        engineGlow.position.set(0, 0, TARGET_SHIP_SIZE*0.8);
        playerShip.add(engineGlow);
        showToast("SHIP MODEL LOADED — Q/E TO CALIBRATE");
      });
    });

    // ── COCKPIT MODEL UPLOAD ──
    document.getElementById('btn-upload-cockpit')!.addEventListener('click', () => document.getElementById('cockpit-file-input')!.click());
    document.getElementById('cockpit-file-input')!.addEventListener('change', (event: any) => {
      const files = Array.from(event.target.files) as File[];
      const main = files.find(f => f.name.endsWith('.gltf')||f.name.endsWith('.glb'));
      if (!main) return;
      const fileMap: Record<string, string> = {}; files.forEach(f => fileMap[f.name] = URL.createObjectURL(f));
      const mgr = new THREE.LoadingManager();
      mgr.setURLModifier((url: string) => fileMap[url.split('/').pop()!] || url);
      new GLTFLoader(mgr).load(fileMap[main.name], (gltf: any) => {
        // Clear old cockpit models (keep lights out of group, they're in sceneSS)
        while (cockpitGroup.children.length > 0) cockpitGroup.remove(cockpitGroup.children[0]);
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const sz = new THREE.Vector3(); box.getSize(sz);
        const maxDim = Math.max(sz.x, sz.y, sz.z);
        // Scale cockpit to same reference size as the ship
        const scale = TARGET_SHIP_SIZE / maxDim;
        model.scale.setScalar(scale);
        // Re-center after scaling
        const sc = new THREE.Box3().setFromObject(model);
        const ctr = new THREE.Vector3(); sc.getCenter(ctr);
        model.position.sub(ctr);
        // Don't rotate - keep cockpit aligned with ship direction (-Z forward)
        // Make all cockpit materials double-sided, reduce emissive, and use proper materials
        model.traverse((child: any) => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m: any) => {
              m.side = THREE.DoubleSide;
              // Prevent bloom from blowing out cockpit
              if (m.emissive) m.emissive.setScalar(0);
              if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 0;
            });
          }
        });
        cockpitGroup.add(model);
        cockpitLoaded = true;
        cockpitGroup.visible = (cameraView === 'cockpit');
        showToast("COCKPIT LOADED — PRESS C IN FLIGHT MODE");
        console.log('Cockpit loaded, scale:', scale, 'size:', sz);
      });
    });

    const onResize = () => {
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // ── PLANET NAVIGATOR BUTTONS ──
    const navBodies = [{ name: 'The Sun', mesh: sunMesh }, ...planetsData.map((p, i) => {
      const body = ssBodies.find((b: any) => b.mesh?.userData?.name === p.name);
      return { name: p.name, mesh: body?.mesh as THREE.Mesh };
    })].filter(b => b.mesh);

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

      if (activeScene === 'milkyWay') {
        controls.update();
        mwGroup.rotation.y += 0.0002;
        const sp = anchor.position.clone().project(camera);
        const mk = document.getElementById('target-marker')!;
        mk.style.left = `${(sp.x*.5+.5)*window.innerWidth}px`;
        mk.style.top = `${(sp.y*-.5+.5)*window.innerHeight}px`;
        renderer.render(sceneMW, camera);
      } else {
        sunMesh.rotation.y += 0.0003 * GLOBAL_SPEED_SCALE * timeMultiplier;
        astBelt.rotation.y += 0.0002 * GLOBAL_SPEED_SCALE * timeMultiplier;
        kuiperBelt.rotation.y += 0.00005 * GLOBAL_SPEED_SCALE * timeMultiplier;
        starLayer1.rotation.y += 0.00003 * dt;
        starLayer2.rotation.y -= 0.00001 * dt;

        ssBodies.forEach((b: any) => {
          if (b.type === 'planet') {
            b.angle += b.speed * GLOBAL_SPEED_SCALE * timeMultiplier;
            b.system.position.set(
              b.a * Math.cos(b.angle) - (b.a * b.e),
              0,
              b.a * Math.sqrt(1 - b.e*b.e) * Math.sin(b.angle)
            );
            b.mesh.rotation.y += 0.004 * GLOBAL_SPEED_SCALE * timeMultiplier;
          } else if (b.type === 'moon') {
            b.pivot.rotation.y += b.speed * GLOBAL_SPEED_SCALE * timeMultiplier;
            b.mesh.rotation.y += 0.008 * GLOBAL_SPEED_SCALE * timeMultiplier;
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
          let gearLevel = 1;
          if (currentThrust >= 0.005) gearLevel = 4;
          else if (currentThrust >= 0.001) gearLevel = 3;
          else if (currentThrust >= 0.0002) gearLevel = 2;
          const theoreticalMax = currentThrust * 300;
          const movementRatio = Math.min(currentSpeed / theoreticalMax, 1.0) || 0;
          const turnAuthority = movementRatio * (gearLevel * 0.25);
          const pitchAccel = 0.4 * turnAuthority * dt;

          if (keys.up) shipAngularVelocity.x += pitchAccel;
          if (keys.down) shipAngularVelocity.x -= pitchAccel;

          const mesh = playerShip.getObjectByName('TheShipModel');
          if (mesh) {
            if (keys.q) mesh.rotation.y += 1.0 * dt;
            if (keys.e) mesh.rotation.y -= 1.0 * dt;
            let targetBank = 0;
            if (keys.left) targetBank = -0.6 * turnAuthority;
            if (keys.right) targetBank = 0.6 * turnAuthority;
            const bankSpeed = 1.0 + 2.0 * turnAuthority;
            mesh.rotation.z += (targetBank - mesh.rotation.z) * bankSpeed * dt;
            shipAngularVelocity.y = mesh.rotation.z * -0.6 * turnAuthority;
          }
          shipAngularVelocity.x *= Math.pow(0.01, dt);
          const dq = new THREE.Quaternion().setFromEuler(new THREE.Euler(
            shipAngularVelocity.x * dt * 60,
            shipAngularVelocity.y * dt * 60,
            0, 'YXZ'
          ));
          playerShip.quaternion.multiply(dq).normalize();

          let targetGlow = 0;
          if (keys.space) {
            const dir = new THREE.Vector3(0,0,-1).applyQuaternion(playerShip.quaternion);
            shipVelocity.add(dir.multiplyScalar(currentThrust * 60 * dt));
            targetGlow = 2.5;
            for (let i = 0; i < 3; i++) spawnTrailParticle();
            audio.updateThrust(Math.min(currentThrust / 0.02, 1));
          } else if (keys.brake) {
            shipVelocity.multiplyScalar(Math.pow(0.1, dt));
            targetGlow = 0.8;
            audio.updateThrust(0.15);
          } else {
            audio.updateThrust(0);
          }

          if (engineGlow) engineGlow.intensity += (targetGlow - engineGlow.intensity) * 10 * dt;

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
            shipVelocity.lerp(pureFwd, 4.0 * dt);
          }
          shipVelocity.multiplyScalar(Math.pow(0.8, dt));
          playerShip.position.add(shipVelocity);
          playerShip.updateMatrixWorld(true);

          updateTrail(dt);

          document.getElementById('fhud-speed')!.innerText = shipVelocity.length().toFixed(5);
          const thrPct = ({0.0002:5, 0.001:25, 0.005:60, 0.02:100} as any)[currentThrust] || 5;
          document.getElementById('fhud-thrust-bar')!.style.width = thrPct + '%';
          document.getElementById('fhud-thrust')!.innerText = 'LVL ' + gearLevel;
          const altFromSun = playerShip.position.length().toFixed(1);
          document.getElementById('fhud-alt')!.innerText = altFromSun + ' AU';

          if (cameraView === 'cockpit') {
            const mesh2 = playerShip.getObjectByName('TheShipModel');
            if (mesh2) mesh2.visible = false;
            cockpitGroup.visible = cockpitLoaded;
            cockpitLight.intensity = 0.6;
            cockpitDirLight.intensity = 0.4;
            bloomPass.strength = 0.3;
            // Camera at pilot seat: centered inside ship
            const cPos = new THREE.Vector3(0, TARGET_SHIP_SIZE * 0.05, 0).applyMatrix4(playerShip.matrixWorld);
            camera.position.copy(cPos);
            // Copy ship orientation then apply user-adjustable cockpit angle
            camera.quaternion.copy(playerShip.quaternion);
            const cockpitRotFix = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), cockpitYAngle);
            camera.quaternion.multiply(cockpitRotFix);
            // Show cockpit angle controls
            const cCtrl = document.getElementById('cockpit-controls');
            if (cCtrl) cCtrl.style.display = 'flex';
          } else {
            const mesh2 = playerShip.getObjectByName('TheShipModel');
            if (mesh2) mesh2.visible = true;
            cockpitGroup.visible = false;
            cockpitLight.intensity = 0;
            cockpitDirLight.intensity = 0;
            bloomPass.strength = 1.4;
            const cCtrl = document.getElementById('cockpit-controls');
            if (cCtrl) cCtrl.style.display = 'none';
            const cOff = new THREE.Vector3(0, TARGET_SHIP_SIZE*0.8, TARGET_SHIP_SIZE*3.5).applyMatrix4(playerShip.matrixWorld);
            camera.position.copy(cOff);
            const lookTgt = new THREE.Vector3(0, TARGET_SHIP_SIZE*0.3, -TARGET_SHIP_SIZE*10).applyMatrix4(playerShip.matrixWorld);
            const upVec = new THREE.Vector3(0,1,0).applyQuaternion(playerShip.quaternion);
            if (mesh2) {
              const sf = new THREE.Vector3(0,0,-1).applyQuaternion(playerShip.quaternion);
              upVec.applyAxisAngle(sf, mesh2.rotation.z * 0.5);
            }
            const tq = new THREE.Quaternion().setFromRotationMatrix(
              new THREE.Matrix4().lookAt(camera.position, lookTgt, upVec)
            );
            camera.quaternion.slerp(tq, 0.1);
          }
        } else {
          controls.update();
        }

        // Smooth travel animation
        if (isTraveling && travelTarget) {
          travelProgress += dt / TRAVEL_DURATION;
          if (travelProgress >= 1) {
            travelProgress = 1;
            isTraveling = false;
            isTransitioning = false;
          }
          const t = easeInOutCubic(Math.min(travelProgress, 1));
          const wp = new THREE.Vector3(); travelTarget.getWorldPosition(wp);
          const r = travelTarget.userData.radius || 4;
          const destPos = new THREE.Vector3(wp.x + r * 3, wp.y + r * 1.5, wp.z + r * 3);

          camera.position.lerpVectors(travelStartPos, destPos, t);
          controls.target.lerpVectors(travelStartTarget, wp, t);
        }
        // Focus on clicked planet (non-travel)
        else if (targetPlanet && !flightModeActive) {
          const wp = new THREE.Vector3(); targetPlanet.getWorldPosition(wp);
          controls.target.copy(wp);
          if (isTransitioning) {
            const r = targetPlanet.userData.radius || 4;
            const dp = new THREE.Vector3(wp.x+r*3, wp.y+r*1.5, wp.z+r*3);
            camera.position.lerp(dp, 0.05);
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
          camera.position.lerp(dp, 0.05);
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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      audio.dispose();
      if (canvasRef.current && renderer.domElement.parentNode === canvasRef.current) {
        canvasRef.current.removeChild(renderer.domElement);
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
          <button id="btn-upload-model" className="btn-purple">📂 Load Ship</button>
          <input type="file" id="file-input" accept=".glb,.gltf,.bin" multiple style={{ display:'none' }} />
          <button id="btn-upload-cockpit" className="btn-cockpit">🎯 Load Cockpit</button>
          <input type="file" id="cockpit-file-input" accept=".glb,.gltf,.bin" multiple style={{ display:'none' }} />
          <button id="btn-toggle-orbits">◯ Orbits</button>
          <button id="btn-orrery">⊙ Orrery</button>
          <button id="btn-gravity">⚛ Gravity</button>
          <button id="btn-toggle-ss-info">ℹ Info</button>
        </div>

        <div className="info-panel panel-hidden" id="ss-info-card" style={{ position:'absolute', top:'68px', left:'20px' }}>
          <h1 id="info-title">Solar System</h1>
          <h2 id="info-subtitle">Interactive Environment</h2>
          <ul className="fact-list" id="info-facts">
            <li><strong>Orbits:</strong> Toggle visible paths with ◯ Orbits</li>
            <li><strong>Orrery:</strong> Top-down view of all orbits</li>
            <li><strong>Gravity:</strong> Real Newtonian gravity on ship</li>
            <li><strong>Flight:</strong> Arrows = pitch/yaw · Space = thrust · Shift = brake</li>
            <li><strong>Gears:</strong> Keys 1–4 for thrust levels</li>
            <li><strong>View:</strong> C = cockpit / chase cam</li>
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

        {/* COCKPIT ANGLE CONTROLS */}
        <div id="cockpit-controls" style={{
          display: 'none', position: 'fixed', bottom: '140px', left: '50%', transform: 'translateX(-50%)',
          gap: '8px', alignItems: 'center', zIndex: 40, pointerEvents: 'auto',
          background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,165,0,0.4)', borderRadius: '8px', padding: '8px 16px'
        }}>
          <button onClick={() => (window as any).__cockpitRotLeft?.()} style={{
            background: 'rgba(255,165,0,0.2)', border: '1px solid rgba(255,165,0,0.5)', color: '#ffa500',
            borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '14px'
          }}>◀ Rot Left</button>
          <span id="cockpit-angle-val" style={{ color: '#ffa500', fontFamily: 'monospace', fontSize: '14px', minWidth: '40px', textAlign: 'center' }}>0°</span>
          <button onClick={() => (window as any).__cockpitRotRight?.()} style={{
            background: 'rgba(255,165,0,0.2)', border: '1px solid rgba(255,165,0,0.5)', color: '#ffa500',
            borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '14px'
          }}>Rot Right ▶</button>
          <button onClick={() => (window as any).__cockpitRotReset?.()} style={{
            background: 'rgba(255,50,50,0.2)', border: '1px solid rgba(255,50,50,0.5)', color: '#ff5555',
            borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px'
          }}>Reset</button>
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
