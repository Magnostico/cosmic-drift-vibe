# Celestial Navigator

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Universe - V3.0 Stellar Edition</title>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;600&family=Exo+2:wght@100;300;400&display=swap" rel="stylesheet">
    <style>
        :root {
            --accent: #4fc3f7;
            --accent2: #ffb347;
            --danger: #ff4d4d;
            --success: #4dff91;
            --purple: #b44dff;
            --glass: rgba(8, 14, 28, 0.82);
            --border: rgba(79, 195, 247, 0.18);
        }
        * { box-sizing: border-box; }
        body {
            margin: 0; padding: 0; overflow: hidden;
            background: #000;
            font-family: 'Exo 2', sans-serif;
            color: #fff;
            cursor: crosshair;
        }
        #canvas-container { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1; }

        #fade-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: #000; z-index: 100; opacity: 0; pointer-events: none;
            transition: opacity 1s ease-in-out;
        }

        /* ── TOP NAV ── */
        .top-nav {
            position: absolute; top: 20px; left: 20px;
            display: flex; gap: 8px; z-index: 5; pointer-events: auto; flex-wrap: wrap;
        }

        /* ── BUTTONS ── */
        button {
            background: var(--glass);
            color: #e0f4ff;
            border: 1px solid var(--border);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Rajdhani', sans-serif;
            font-size: 0.95rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            transition: all 0.2s;
            backdrop-filter: blur(10px);
        }
        button:hover {
            background: rgba(79, 195, 247, 0.25);
            border-color: var(--accent);
            box-shadow: 0 0 14px rgba(79, 195, 247, 0.35);
            color: #fff;
        }
        .btn-danger { border-color: rgba(255,77,77,0.4); }
        .btn-danger:hover { background: rgba(255,77,77,0.3); border-color: var(--danger); box-shadow: 0 0 14px rgba(255,77,77,0.35); }
        .btn-success { border-color: rgba(77,255,145,0.4); }
        .btn-success:hover { background: rgba(77,255,145,0.25); border-color: var(--success); box-shadow: 0 0 14px rgba(77,255,145,0.35); }
        .btn-purple { border-color: rgba(180,77,255,0.4); }
        .btn-purple:hover { background: rgba(180,77,255,0.3); border-color: var(--purple); box-shadow: 0 0 14px rgba(180,77,255,0.35); }
        .btn-active { background: rgba(79, 195, 247, 0.4) !important; border-color: var(--accent) !important; }

        /* ── INFO PANEL ── */
        .info-panel {
            background: var(--glass);
            backdrop-filter: blur(16px);
            padding: 22px 28px;
            border-radius: 12px;
            border: 1px solid var(--border);
            max-width: 380px;
            pointer-events: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
            transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .panel-hidden { opacity: 0 !important; pointer-events: none !important; transform: translateX(-120%) !important; }

        h1 {
            margin: 0 0 4px 0;
            font-family: 'Rajdhani', sans-serif;
            font-size: 2rem; font-weight: 600; letter-spacing: 3px; text-transform: uppercase;
            background: linear-gradient(90deg, var(--accent2), #ff6b35);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .mw-title { background: linear-gradient(90deg, #ffb28a, var(--accent)); -webkit-background-clip: text; }
        h2 { margin: 0 0 16px 0; font-size: 0.85rem; color: #5d7fa0; font-weight: 400; letter-spacing: 1px; text-transform: uppercase; }
        .fact-list { list-style: none; padding: 0; margin: 0; }
        .fact-list li {
            margin-bottom: 10px; font-size: 0.88rem; line-height: 1.5;
            display: flex; align-items: flex-start; color: #a8c8e8;
        }
        .fact-list li::before { content: '◆'; color: var(--accent2); margin-right: 10px; font-size: 0.7rem; margin-top: 3px; }
        .mw-list li::before { color: var(--accent); }

        /* ── CONTROLS HINT ── */
        .controls-hint {
            position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: var(--glass); padding: 10px 24px;
            border-radius: 20px; font-size: 0.8rem; letter-spacing: 1.5px; text-transform: uppercase;
            animation: pulse 2.5s infinite; pointer-events: auto; cursor: pointer;
            border: 1px solid var(--border); backdrop-filter: blur(8px); color: #7ab8d4;
            white-space: nowrap;
        }

        /* ── TARGET MARKER ── */
        #target-marker {
            position: absolute; transform: translate(-50%, -100%);
            cursor: pointer; z-index: 10; pointer-events: auto;
            display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .arrow-down {
            width: 0; height: 0;
            border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 16px solid var(--accent2);
            animation: bounce 1s infinite; filter: drop-shadow(0 0 6px rgba(255,179,71,0.8));
        }
        .marker-label { color: var(--accent2); font-size: 0.7rem; font-family: 'Rajdhani', sans-serif; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; }
        .marker-glow { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--accent2); background: rgba(255,179,71,0.2); animation: ping 2s infinite; }

        /* ── TIME CONTROLS ── */
        #time-controls {
            position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
            display: flex; gap: 6px; align-items: center; pointer-events: auto; z-index: 3;
        }
        .time-label { font-size: 0.75rem; color: var(--accent); font-family: 'Rajdhani', sans-serif; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-right: 4px; }

        /* ── DYNAMIC HUD ── */
        .dynamic-hud {
            margin-top: 16px; padding: 12px 16px;
            background: rgba(79,195,247,0.07);
            border: 1px solid rgba(79,195,247,0.2);
            border-radius: 8px;
            font-family: 'Rajdhani', sans-serif;
            font-size: 0.88rem; color: #7ab8d4; display: none; line-height: 1.8;
        }

        /* ── TOAST ── */
        #toast-message {
            position: absolute; top: 100px; left: 50%; transform: translateX(-50%);
            background: var(--glass); border: 1px solid var(--accent);
            padding: 9px 20px; border-radius: 6px;
            font-family: 'Rajdhani', sans-serif; color: var(--accent);
            font-weight: 600; font-size: 0.88rem; letter-spacing: 1px;
            opacity: 0; pointer-events: none; z-index: 200; transition: opacity 0.4s ease;
            backdrop-filter: blur(8px);
        }

        /* ── CROSSHAIR ── */
        #crosshair {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 22px; height: 22px;
            border: 2px solid rgba(79,195,247,0.4); border-radius: 50%;
            pointer-events: none; z-index: 2; display: none;
        }
        #crosshair::before, #crosshair::after {
            content: ''; position: absolute;
            background: rgba(79,195,247,0.4);
        }
        #crosshair::before { width: 1px; height: 10px; left: 50%; top: -14px; transform: translateX(-50%); }
        #crosshair::after { width: 10px; height: 1px; top: 50%; left: -14px; transform: translateY(-50%); }

        /* ── FLIGHT HUD (diegetic) ── */
        #flight-hud {
            position: absolute; bottom: 80px; right: 24px;
            display: none; flex-direction: column; gap: 6px;
            pointer-events: none; z-index: 5;
            font-family: 'Rajdhani', sans-serif;
        }
        .hud-row {
            display: flex; justify-content: space-between; align-items: center;
            background: var(--glass); border: 1px solid var(--border);
            padding: 6px 14px; border-radius: 6px; backdrop-filter: blur(8px);
            font-size: 0.82rem; color: var(--accent); letter-spacing: 1px; gap: 20px;
        }
        .hud-value { color: #fff; font-weight: 600; }
        .hud-bar { width: 80px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
        .hud-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.1s; }

        /* ── ORBIT TOGGLE ── */
        #orbit-lines-container { pointer-events: none; }

        /* ── PLANET INFO PANEL EXTRA ── */
        .planet-stat { display: flex; justify-content: space-between; font-size: 0.82rem; color: #6a90b0; margin-bottom: 5px; }
        .planet-stat span:last-child { color: #c8e4f8; font-weight: 600; }

        /* ── GRAVITY INDICATOR ── */
        #gravity-indicator {
            position: absolute; top: 24px; right: 24px;
            background: var(--glass); border: 1px solid var(--border);
            padding: 10px 18px; border-radius: 8px; backdrop-filter: blur(8px);
            font-family: 'Rajdhani', sans-serif; font-size: 0.82rem; color: #6a90b0;
            display: none; pointer-events: none; z-index: 5;
            line-height: 1.9;
        }
        #gravity-indicator span { color: var(--accent); font-weight: 600; }

        /* ── HIDDEN UI ── */
        .hidden-ui { opacity: 0; pointer-events: none !important; display: none !important; }

        /* ── UI LAYER ── */
        .ui-layer {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 2; pointer-events: none;
        }

        /* ── ORRERY MODE ── */
        #orrery-label {
            position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
            background: var(--glass); border: 1px solid var(--border);
            padding: 8px 20px; border-radius: 20px;
            font-family: 'Rajdhani', sans-serif; font-size: 0.8rem; color: var(--accent);
            letter-spacing: 2px; text-transform: uppercase;
            display: none; pointer-events: none; z-index: 6;
        }

        /* ── KEYFRAMES ── */
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes ping { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes scanline { 0% { top: -10%; } 100% { top: 110%; } }

        /* ── ENGINE TRAIL CANVAS ── */
        #trail-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; display: none; }
    </style>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>





◉ ORRERY MODE — TOP VIEW






    


        ℹ Info
    


    


        

Milky Way


        

Our Galactic Home


        


            

Type: Barred Spiral Galaxy


            

Diameter: ~100,000–120,000 light-years


            

Stars: 100–400 billion estimated


            

Location: Orion–Cygnus Arm


            

Age: ~13.6 billion years


        


    


    

▼ Click the marker to enter the Solar System






    


        🌌 Galaxy
        ☀ Free View
        🚀 Pilot Ship
        📂 Load Model
        
        ◯ Orbits
        ⊙ Orrery
        ⚛ Gravity
        ℹ Info
    



    


        

Solar System


        

Interactive Environment


        


            

Orbits: Toggle visible paths with ◯ Orbits


            

Orrery: Top-down view of all orbits


            

Gravity: Real Newtonian gravity on ship


            

Flight: Arrows = pitch/yaw · Space = thrust · Shift = brake


            

Gears: Keys 1–4 for thrust levels


            

View: C = cockpit / chase cam


        


        


            

Planetary Data


            

Mass—


            

Radius—


            

Orbital Period—


            

Surface Temp—


            

Moons—


        


        


            

Distance: —


            

Orbit Angle: —


            

Speed: —


        


    



    


        ⏱ Time:
        ⏸ Pause
        ▶ 1×
        ⏩ 50×
        ⏭ 200×
    



    
    


        

⚛ GRAVITY: OFF


        

Nearest: —


        

Pull: 0.00 m/s²


    



    
    


        


            SPEED
            0.000
        


        


            THRUST
            


            LVL 1
        


        


            ALT
            —
        


        


            GRAV PULL
            0.00
        


    






    

Solar System


    


    





—



Quero transformar esse codigo, exatamente esse em um projeto. Me ajuda

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c652a4a0-82f5-44ff-b181-417c8c9f54d3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
