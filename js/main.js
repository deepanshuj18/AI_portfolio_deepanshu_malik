/* ═══════════════════════════════════════════════════════════════════════════
   ITOM-INSPIRED 3D SKETCHBOOK PORTFOLIO — main.js
   Straight Corridor + Mouse Look + Room Doors on Sides
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── 1. Knowledge Base ────────────────────────────────────────────────────────
const portfolioData = {
    about: {
        name: "Deepanshu Malik", role: "AI Engineer",
        summary: "I'm an AI Engineer specializing in LLM systems, document intelligence, and scalable ML platforms.",
        location: "Noida, India",
    },
    experience: [{ company: "Wattmonk Technologies", role: "AI Engineer Intern", period: "Oct 2025 - Jan 2026", details: "Built an automated Utility Bill AI pipeline." }],
    projects: [{ name: "Utility Bill AI Agent" }, { name: "AI-Powered RAG Chatbot" }, { name: "WBC Diagnostic System" }],
    skills: { ai: ["Gemini", "RAG"], backend: ["FastAPI"], frontend: ["React"], devops: ["AWS"] },
    contact: { email: "malikdeepanshu15@gmail.com", phone: "+91 9220922230" }
};

// ─── 2. State ─────────────────────────────────────────────────────────────────
let scene, camera, renderer;
let worldHeight = 6000;
let currentZone = 0;
let oceanMesh = null;

// Camera walk position (scroll-driven, straight line)
let walkZ = 5; // start outside

// Mouse-look rotation
let cameraYaw = 0;        // current yaw (radians)
let targetCameraYaw = 0;  // for smooth lerping

// Doors
let entranceDoors = [];
let entranceOpen = false;
let roomDoors = [];        // { mesh, zoneId, open, group, rotY, wallSide }
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Room entry
let isInsideRoom = false;
let lerpingCamera = false;
let cameraTargetPos = new THREE.Vector3();
let cameraTargetLookAt = new THREE.Vector3();

// Corridor layout
const CORRIDOR_HALF_W = 4;
const CORRIDOR_START_Z = -8;   // entrance wall
const CORRIDOR_END_Z = -70;    // where it opens to dock
const ROOM_HEIGHT = 5;

// Room positions along the corridor (Z coords, which wall)
const ROOMS = [
    { z: -20, side: 'right', zoneId: 2, label: 'THE LAB', description: 'Projects & AI Agents' },
    { z: -35, side: 'left',  zoneId: 3, label: 'THE STUDIO', description: 'Skills & Experience' },
    { z: -50, side: 'right', zoneId: 4, label: 'ABOUT', description: 'My background & Resume' },
];

// ─── 3. Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initWorld();
    document.getElementById('scroll-container').style.height = `${worldHeight}px`;

    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.body.style.overflowY = 'auto';
        updateCamera();
    }, 1500);

    // Scroll = walk forward
    window.addEventListener('scroll', () => {
        if (!isInsideRoom && !lerpingCamera) requestAnimationFrame(updateCamera);
    });

    // Mouse and Trackpad controls
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: false });

    // Click = interact with doors
    window.addEventListener('click', onMouseClick);

    window.addEventListener('resize', onWindowResize);
});

// ─── 4. Three.js Scene ────────────────────────────────────────────────────────
function initWorld() {
    const canvas = document.getElementById('world-canvas');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f3ef);
    scene.fog = new THREE.Fog(0xf5f3ef, 15, 80);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 150);
    camera.position.set(0, 1.6, 5);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.35);
    dl.position.set(5, 10, 5);
    scene.add(dl);

    buildWorld();
    createQuoteFrames();
    renderer.setAnimationLoop(renderLoop);
}

// ─── Wall helper ──────────────────────────────────────────────────────────────
function makeWall(x, y, z, w, h, ry, color) {
    const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: color || 0xf0eeea, side: THREE.DoubleSide })
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
}

function makeCeiling(x, z, w, d) {
    const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshBasicMaterial({ color: 0xe8e6e0, side: THREE.DoubleSide })
    );
    m.rotation.x = Math.PI / 2;
    m.position.set(x, ROOM_HEIGHT, z);
    scene.add(m);
}

function createBillboard(path, w, h, pos) {
    const tex = new THREE.TextureLoader().load(path, t => {
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        if (renderer.capabilities.getMaxAnisotropy) {
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
    });
    const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide })
    );
    m.position.set(...pos);
    scene.add(m);
    return m;
}

// ─── Build the World ──────────────────────────────────────────────────────────
function buildWorld() {
    // Floor
    const fTex = new THREE.TextureLoader().load('assets/textures/wood_floor.png', t => {
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        if (renderer.capabilities.getMaxAnisotropy) {
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
    });
    fTex.wrapS = fTex.wrapT = THREE.RepeatWrapping; fTex.repeat.set(30, 30);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ map: fTex }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // ── OUTDOOR: Welcoming area (Z > -8) ──
    // Brick exterior wall with door hole
    const bTex = new THREE.TextureLoader().load('assets/textures/brick_wall.png', t => {
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        if (renderer.capabilities.getMaxAnisotropy) {
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
    });
    bTex.wrapS = bTex.wrapT = THREE.RepeatWrapping; bTex.repeat.set(4, 2);
    const extWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 15), new THREE.MeshBasicMaterial({ map: bTex }));
    extWall.position.set(0, 5, CORRIDOR_START_Z);
    extWall.renderOrder = 0; // render wall behind doors
    scene.add(extWall);

    // Welcome boy (avatar) standing in front
    createBillboard('assets/sprites/avatar.png', 2.5, 5, [2.5, 2.5, -4]);
    // Tree
    createBillboard('assets/sprites/tree.png', 6, 8, [-5, 4, -6]);
    // Cat
    createBillboard('assets/sprites/cat.png', 0.8, 1, [-1.5, 0.5, -5]);
    // Name sign
    createBillboard('assets/sprites/sign_name.png', 2.5, 0.8, [0, 5.8, CORRIDOR_START_Z + 0.1]);

    // Entrance double doors
    buildEntranceDoors();

    // ── CORRIDOR: straight from Z=-8 to Z=-70 ──
    const corrLen = Math.abs(CORRIDOR_END_Z - CORRIDOR_START_Z);
    const corrMidZ = (CORRIDOR_START_Z + CORRIDOR_END_Z) / 2;

    // Left wall
    makeWall(-CORRIDOR_HALF_W, ROOM_HEIGHT / 2, corrMidZ, corrLen, ROOM_HEIGHT, Math.PI / 2);
    // Right wall
    makeWall(CORRIDOR_HALF_W, ROOM_HEIGHT / 2, corrMidZ, corrLen, ROOM_HEIGHT, -Math.PI / 2);
    // Ceiling
    makeCeiling(0, corrMidZ, CORRIDOR_HALF_W * 2, corrLen);

    // ── ROOM DOORS on the corridor walls ──
    ROOMS.forEach(room => {
        buildRoomDoor(room);
    });

    // ── DOCK / OCEAN at the end ──
    const wTex = new THREE.TextureLoader().load('assets/textures/ocean_waves.png', t => {
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        if (renderer.capabilities.getMaxAnisotropy) {
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
    });
    wTex.wrapS = wTex.wrapT = THREE.RepeatWrapping; wTex.repeat.set(10, 10);
    oceanMesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ map: wTex }));
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(0, -0.5, -100);
    scene.add(oceanMesh);
    createBillboard('assets/sprites/lighthouse.png', 8, 15, [-15, 7, -100]);
    createBillboard('assets/sprites/paper_boat.png', 1.5, 1, [3, 0, -75]);
}

// ─── Entrance Doors ───────────────────────────────────────────────────────────
function buildEntranceDoors() {
    const tex = new THREE.TextureLoader().load('assets/sprites/door_portfolio.png', t => {
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        if (renderer.capabilities.getMaxAnisotropy) {
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
    });
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: true });

    const DOOR_Z_OFFSET = 0.5; // push doors forward to eliminate z-fighting with wall

    const gL = new THREE.PlaneGeometry(1.25, 4);
    const uvL = gL.attributes.uv.array;
    for (let i = 0; i < uvL.length; i += 2) uvL[i] *= 0.5;
    gL.translate(0.625, 0, 0);
    const dL = new THREE.Mesh(gL, mat);
    dL.position.set(-1.25, 2, CORRIDOR_START_Z + DOOR_Z_OFFSET);
    dL.renderOrder = 1; // render doors on top of wall
    scene.add(dL);

    const gR = new THREE.PlaneGeometry(1.25, 4);
    const uvR = gR.attributes.uv.array;
    for (let i = 0; i < uvR.length; i += 2) uvR[i] = uvR[i] * 0.5 + 0.5;
    gR.translate(-0.625, 0, 0);
    const dR = new THREE.Mesh(gR, mat);
    dR.position.set(1.25, 2, CORRIDOR_START_Z + DOOR_Z_OFFSET);
    dR.renderOrder = 1;
    scene.add(dR);

    entranceDoors = [dL, dR];
}

// ─── Room Door ────────────────────────────────────────────────────────────────
function buildRoomDoor(room) {
    const tex = new THREE.TextureLoader().load('assets/sprites/door_portfolio.png', t => {
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        if (renderer.capabilities.getMaxAnisotropy) {
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
    });
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: true });

    const geo = new THREE.PlaneGeometry(2.5, 4);
    geo.translate(1.25, 0, 0); // pivot at left edge
    const doorMesh = new THREE.Mesh(geo, mat);
    doorMesh.position.set(-1.25, 0, 0);
    doorMesh.renderOrder = 1;

    const group = new THREE.Group();
    // Offset door slightly into the corridor to prevent z-fighting with wall
    const wallOffset = room.side === 'left' ? 0.15 : -0.15;
    const x = (room.side === 'left' ? -CORRIDOR_HALF_W : CORRIDOR_HALF_W) + wallOffset;
    const rotY = room.side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    group.position.set(x, 2, room.z);
    group.rotation.y = rotY;
    group.add(doorMesh);
    scene.add(group);

    // Label above door — also offset to avoid z-fighting
    const labelX = room.side === 'left' ? -CORRIDOR_HALF_W + 0.2 : CORRIDOR_HALF_W - 0.2;
    const labelSign = createBillboard('assets/sprites/sign_name.png', 1.8, 0.5, [labelX, 4.5, room.z]);
    labelSign.rotation.y = rotY;

    roomDoors.push({
        mesh: doorMesh, zoneId: room.zoneId, open: false,
        group, rotY, side: room.side, z: room.z,
        label: room.label, description: room.description
    });
}

// ─── 5. Camera: Scroll = Walk, Mouse Drag = Look ─────────────────────────────
function updateCamera() {
    const scrollTop = window.scrollY;
    const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
    const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
    document.getElementById('scrollProgress').style.width = `${progress * 100}%`;

    // Walk along Z axis: from Z=5 (outside) to Z=CORRIDOR_END_Z
    walkZ = 5 - progress * (5 - CORRIDOR_END_Z);

    // Infinite Loop Logic: If user walks past the desk at the end, jump back to entrance
    if (walkZ < -78) {
        const targetZ = -15;
        const targetProgress = (5 - targetZ) / (5 - CORRIDOR_END_Z);
        const targetScroll = targetProgress * maxScroll;
        
        // Use 'auto' or 'instant' for immediate teleport without smooth scrolling animation
        window.scrollTo({ top: targetScroll, behavior: 'auto' });
        walkZ = targetZ; // immediately update walkZ so we don't render the frame at -78
    }

    // Zone detection
    let newZone = 0;
    if (walkZ > CORRIDOR_START_Z) newZone = 0;       // outside
    else if (walkZ > -15) newZone = 1;                // hallway entrance
    else if (walkZ > -27) newZone = 2;                // near Lab
    else if (walkZ > -42) newZone = 3;                // near Studio
    else if (walkZ > -57) newZone = 4;                // near About
    else newZone = 5;                                 // Dock

    // Auto-close entrance doors when user scrolls back outside
    if (entranceOpen && walkZ > CORRIDOR_START_Z + 0.5) {
        entranceOpen = false;
        let closeAngle = entranceDoors[0].rotation.y;
        const closeDoors = () => {
            closeAngle -= 0.06;
            if (closeAngle <= 0) {
                closeAngle = 0;
                entranceDoors[0].rotation.y = 0;
                entranceDoors[1].rotation.y = 0;
                entranceDoors[0].material.color.setHex(0xffffff);
            } else {
                entranceDoors[0].rotation.y = closeAngle;
                entranceDoors[1].rotation.y = -closeAngle;
                requestAnimationFrame(closeDoors);
            }
        };
        closeDoors();
    }

    if (newZone !== currentZone) {
        currentZone = newZone;
        const labels = ["ENTRANCE", "WELCOME", "THE LAB", "THE STUDIO", "ABOUT", "CONTACT"];
        document.getElementById('zoneLabel').textContent = labels[currentZone];

        if (currentZone === 5) {
            const p = document.querySelector('.content-panel[data-zone="5"]');
            if (p) setTimeout(() => p.classList.add('visible'), 300);
        } else if (!isInsideRoom) {
            document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('visible'));
        }
    }

    applyCameraTransform();
}

function applyCameraTransform() {
    // Minimal bob effect for stability
    const bob = Math.sin(walkZ * 2) * 0.008;
    camera.position.set(0, 1.6 + bob, walkZ);

    // Look direction based on yaw
    const lookX = Math.sin(cameraYaw) * 10;
    const lookZ = walkZ - Math.cos(cameraYaw) * 10;
    camera.lookAt(lookX, 1.6, lookZ);
}

// ─── 6. Mouse & Trackpad Look ─────────────────────────────────────────────────
let isDragging = false;
let dragStartX = 0;
let dragStartYaw = 0;

function onMouseDown(e) {
    if (isInsideRoom || lerpingCamera) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartYaw = targetCameraYaw;
}

function onMouseMove(e) {
    // Always update coords for raycaster and tooltips
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    window.screenMouseX = e.clientX;
    window.screenMouseY = e.clientY;

    if (isInsideRoom || lerpingCamera) return;

    if (isDragging) {
        const dx = e.clientX - dragStartX;
        const maxYaw = Math.PI * 0.40;
        targetCameraYaw = Math.max(-maxYaw, Math.min(maxYaw, dragStartYaw + dx * 0.003));
    }
}

function onMouseUp() {
    isDragging = false;
}

function onWheel(e) {
    if (isInsideRoom || lerpingCamera) return;
    
    // If scrolling horizontally more than vertically, treat as look left/right
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault(); // Prevent browser back/forward swipe navigation
        targetCameraYaw -= e.deltaX * 0.002;
        const maxYaw = Math.PI * 0.40;
        targetCameraYaw = Math.max(-maxYaw, Math.min(maxYaw, targetCameraYaw));
    }
}

// ─── 7. Click Interactions ────────────────────────────────────────────────────
function onMouseClick(event) {
    if (isInsideRoom || lerpingCamera) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Entrance doors
    if (!entranceOpen && entranceDoors.length) {
        if (raycaster.intersectObjects(entranceDoors).length > 0) {
            entranceOpen = true;
            entranceDoors[0].material.color.setHex(0x8b4513);
            
            // Realistic entrance: Walk to door, open, then walk in
            lerpingCamera = true;
            cameraTargetPos.set(0, 1.6, CORRIDOR_START_Z + 2);
            cameraTargetLookAt.set(0, 1.6, CORRIDOR_START_Z - 10);
            
            lerpCameraToTarget(() => {
                let a = 0;
                const openDoors = () => {
                    a += 0.04;
                    entranceDoors[0].rotation.y = a;
                    entranceDoors[1].rotation.y = -a;
                    if (a < Math.PI / 2.2) {
                        requestAnimationFrame(openDoors);
                    } else {
                        // Door is open, give control back before scrolling
                        lerpingCamera = false;
                        // Smoothly scroll the camera well inside the corridor
                        const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
                        const targetZ = -15;
                        const targetProgress = (5 - targetZ) / (5 - CORRIDOR_END_Z);
                        const targetScroll = targetProgress * maxScroll;
                        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
                    }
                };
                openDoors();
            });
            return;
        }
    }

    // Room doors
    if (roomDoors.length) {
        const hits = raycaster.intersectObjects(roomDoors.map(d => d.mesh));
        if (hits.length) {
            const door = roomDoors.find(d => d.mesh === hits[0].object);
            if (door && !door.open) enterRoom(door);
        }
    }
}

// ─── 8. Room Entry / Exit ─────────────────────────────────────────────────────
function enterRoom(doorObj) {
    if (doorObj.open || isInsideRoom || lerpingCamera) return;
    document.body.style.cursor = 'default';
    
    // Freeze scrolling so walkZ doesn't change
    document.body.style.overflowY = 'hidden';

    // 1. Walk to the door and face it
    lerpingCamera = true;
    cameraTargetPos.set(0, 1.6, doorObj.z);
    
    const lookX = doorObj.side === 'left' ? -10 : 10;
    cameraTargetLookAt.set(lookX, 1.6, doorObj.z);

    lerpCameraToTarget(() => {
        // 2. Open door
        doorObj.open = true;
        doorObj.mesh.material.color.setHex(0x8b4513);

        let angle = 0;
        const swing = () => {
            angle += 0.06;
            doorObj.mesh.rotation.y = angle;
            if (angle < Math.PI / 2) {
                requestAnimationFrame(swing);
            } else {
                // 3. Walk inside
                isInsideRoom = true;

                const intoX = doorObj.side === 'left' ? -CORRIDOR_HALF_W - 3 : CORRIDOR_HALF_W + 3;
                cameraTargetPos.set(intoX, 1.6, doorObj.z);

                const deepX = doorObj.side === 'left' ? -CORRIDOR_HALF_W - 10 : CORRIDOR_HALF_W + 10;
                cameraTargetLookAt.set(deepX, 1.6, doorObj.z);

                lerpCameraToTarget(() => {
                    lerpingCamera = false;
                    const panel = document.querySelector(`.content-panel[data-zone="${doorObj.zoneId}"]`);
                    if (panel) panel.classList.add('visible');
                });
            }
        };
        swing();
    });
}

window.exitRoom = function () {
    if (!isInsideRoom) return;
    document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('visible'));

    lerpingCamera = true;
    
    // 1. Walk back out to corridor, facing the opposite direction or straight ahead
    const openDoor = roomDoors.find(d => d.open);
    const zPos = openDoor ? openDoor.z : walkZ;
    cameraTargetPos.set(0, 1.6, zPos);

    // Look straight down the hallway
    cameraTargetLookAt.set(0, 1.6, zPos - 10);

    lerpCameraToTarget(() => {
        isInsideRoom = false;
        
        // Restore scrolling
        document.body.style.overflowY = 'auto';
        
        // Sync walkZ with current scroll so we don't jump
        cameraYaw = 0; 
        targetCameraYaw = 0; // reset target yaw

        if (openDoor) {
            let angle = openDoor.mesh.rotation.y;
            const closeSwing = () => {
                angle -= 0.06;
                if (angle > 0) {
                    openDoor.mesh.rotation.y = angle;
                    requestAnimationFrame(closeSwing);
                } else {
                    openDoor.mesh.rotation.y = 0;
                    openDoor.mesh.material.color.setHex(0xffffff);
                    openDoor.open = false;
                    lerpingCamera = false;
                    applyCameraTransform();
                }
            };
            closeSwing();
        } else {
            lerpingCamera = false;
            applyCameraTransform();
        }
    });
};

function lerpCameraToTarget(onComplete) {
    let prog = 0;
    const sp = camera.position.clone();
    const sd = new THREE.Vector3();
    camera.getWorldDirection(sd);
    const sl = sp.clone().add(sd.multiplyScalar(5));

    const tick = () => {
        prog += 0.03;
        if (prog > 1) prog = 1;
        const t = prog < 0.5 ? 2 * prog * prog : -1 + (4 - 2 * prog) * prog;
        camera.position.lerpVectors(sp, cameraTargetPos, t);
        camera.lookAt(new THREE.Vector3().lerpVectors(sl, cameraTargetLookAt, t));
        if (prog < 1) requestAnimationFrame(tick);
        else if (onComplete) onComplete();
    };
    tick();
}

// ─── Render Loop ──────────────────────────────────────────────────────────────
function renderLoop() {
    if (oceanMesh) {
        oceanMesh.material.map.offset.y -= 0.001;
        oceanMesh.material.map.offset.x += 0.0005;
    }

    if (!isInsideRoom && !lerpingCamera) {
        // Smoothly interpolate current yaw towards target yaw
        cameraYaw += (targetCameraYaw - cameraYaw) * 0.05;
        applyCameraTransform();
        
        // Tooltip logic
        raycaster.setFromCamera(mouse, camera);
        let hoveredDoor = null;
        
        if (roomDoors.length) {
            const hits = raycaster.intersectObjects(roomDoors.map(d => d.mesh));
            if (hits.length) {
                hoveredDoor = roomDoors.find(d => d.mesh === hits[0].object);
            }
        }
        if (!hoveredDoor && !entranceOpen && entranceDoors.length) {
            if (raycaster.intersectObjects(entranceDoors).length > 0) {
                hoveredDoor = { label: "ENTRANCE", description: "Step inside my portfolio" };
            }
        }

        const tooltip = document.getElementById('door-tooltip');
        if (hoveredDoor && tooltip) {
            tooltip.innerHTML = `<strong>${hoveredDoor.label || 'DOOR'}</strong><br><span style="font-family:var(--font-body); font-size:0.85rem; color:var(--ink-light);">${hoveredDoor.description}</span>`;
            tooltip.style.left = window.screenMouseX + 'px';
            tooltip.style.top = window.screenMouseY + 'px';
            tooltip.classList.add('visible');
            document.body.style.cursor = 'pointer';
        } else if (tooltip) {
            tooltip.classList.remove('visible');
            document.body.style.cursor = 'default';
        }
    } else {
        const tooltip = document.getElementById('door-tooltip');
        if (tooltip) tooltip.classList.remove('visible');
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ─── 9. Voice & AI ───────────────────────────────────────────────────────────
let isListening = false, isSpeaking = false, recognition = null;
let synthesis = window.speechSynthesis, voiceSupported = false;

function setupVoiceRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    voiceSupported = true;
    recognition = new SR();
    recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';
    recognition.onstart = () => { isListening = true; updateAvatarState(); showNotification('Listening...', 'info'); };
    recognition.onresult = (e) => { handleUserQuery(e.results[0][0].transcript.toLowerCase()); };
    recognition.onerror = (e) => {
        if (e.error === 'not-allowed') showPermissionModal();
        else showNotification(`Voice error: ${e.error}`, 'error');
        isListening = false; updateAvatarState();
    };
    recognition.onend = () => { isListening = false; updateAvatarState(); };
}

function toggleVoiceAssistant() {
    if (!voiceSupported) { showNotification('Voice not supported', 'warning'); showChatFallback(); return; }
    if (isListening) recognition.stop(); else startVoiceInteraction();
}
function startVoiceInteraction() {
    if (isSpeaking) { synthesis.cancel(); isSpeaking = false; updateAvatarState(); }
    try { recognition.start(); } catch (e) {}
}

function handleUserQuery(q) {
    let r = "I'm not sure about that. Ask about Deepanshu's skills or experience.";
    if (q.includes('about') || q.includes('who')) r = portfolioData.about.summary;
    else if (q.includes('experience')) r = 'Deepanshu worked at Wattmonk Technologies as an AI Engineer Intern.';
    else if (q.includes('project')) r = 'Key projects include Utility Bill AI Agent and RAG Chatbot.';
    else if (q.includes('skill')) r = 'Core skills include Gemini, RAG, FastAPI, React, and AWS.';
    showNotification(r, 'ai-response'); speak(r);
    addChatMessage(q, 'user'); addChatMessage(r, 'ai');
}

function speak(text) {
    if (!window.speechSynthesis) return;
    synthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onstart = () => { isSpeaking = true; updateAvatarState(); };
    u.onend = () => { isSpeaking = false; updateAvatarState(); };
    synthesis.speak(u);
}

function updateAvatarState() {
    const av = document.getElementById('aiAvatar'), vis = document.getElementById('voiceVisualizer');
    if (!av) return;
    if (isListening) { av.classList.add('listening'); av.classList.remove('speaking'); if (vis) vis.style.display = 'flex'; }
    else if (isSpeaking) { av.classList.add('speaking'); av.classList.remove('listening'); if (vis) vis.style.display = 'flex'; }
    else { av.classList.remove('listening', 'speaking'); if (vis) vis.style.display = 'none'; }
}

function showChatFallback() { document.getElementById('chatFallback').style.display = 'flex'; }
function closeChatFallback() { document.getElementById('chatFallback').style.display = 'none'; }
function useChatFallback() { closePermissionModal(); showChatFallback(); }
function handleChatInput(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('chatInput');
        if (input.value.trim()) { handleUserQuery(input.value.trim()); input.value = ''; }
    }
}
function addChatMessage(text, sender) {
    const cm = document.getElementById('chatMessages');
    const d = document.createElement('div'); d.className = `chat-message ${sender}`; d.textContent = text;
    cm.appendChild(d); cm.scrollTop = cm.scrollHeight;
}

function showNotification(message, type = 'info') {
    const old = document.querySelector('.notification'); if (old) old.remove();
    const n = document.createElement('div'); n.className = `notification ${type}`;
    const s = document.createElement('span'); s.textContent = message; n.appendChild(s);
    const c = document.createElement('button'); c.className = 'notification-close'; c.innerHTML = '\u00d7'; c.onclick = () => n.remove(); n.appendChild(c);
    document.body.appendChild(n);
    setTimeout(() => { if (document.body.contains(n)) n.remove(); }, type === 'ai-response' ? 8000 : 4000);
}

function showPermissionModal() { document.getElementById('permissionModal').style.display = 'flex'; }
function closePermissionModal() { document.getElementById('permissionModal').style.display = 'none'; }
function retryVoicePermission() { closePermissionModal(); startVoiceInteraction(); }
function sendMessageWithFormSubmit() {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');

    if (!nameInput.value || !emailInput.value || !messageInput.value) {
        showNotification('Please fill all fields.', 'error'); 
        return;
    }

    showNotification('Sending message...', 'info');

    // Use FormSubmit.co for direct email without a backend
    fetch("https://formsubmit.co/ajax/malikdeepanshu15@gmail.com", {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            name: nameInput.value,
            email: emailInput.value,
            message: messageInput.value,
            _subject: "New contact from your 3D Portfolio!"
        })
    })
    .then(response => response.json())
    .then(data => {
        showNotification('Message sent successfully!', 'success');
        // Clear fields
        nameInput.value = '';
        emailInput.value = '';
        messageInput.value = '';
    })
    .catch(error => {
        console.error("FormSubmit Error:", error);
        // Fallback to mailto if the API is blocked or fails
        showNotification('Falling back to email client...', 'warning');
        const subject = encodeURIComponent(`Portfolio Contact from ${nameInput.value}`);
        const body = encodeURIComponent(`Name: ${nameInput.value}\nEmail: ${emailInput.value}\n\nMessage:\n${messageInput.value}`);
        window.location.href = `mailto:malikdeepanshu15@gmail.com?subject=${subject}&body=${body}`;
    });
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); toggleVoiceAssistant(); }
    if (e.code === 'Escape') {
        if (isInsideRoom) exitRoom();
        if (isListening && recognition) recognition.stop();
        closeChatFallback(); closePermissionModal();
    }
});

setupVoiceRecognition();

// ─── Scenery Quote Frames ──────────────────────────────────────────────────
function createQuoteFrames() {
    const quotes = [
        {
            z: -10, side: 'left', image: 'assets/sprites/cityscape.png',
            quote: "The best way to predict the future is to invent it.", author: "Alan Kay"
        },
        {
            z: -17, side: 'left', image: 'assets/sprites/paper_boat.png',
            quote: "Imagination is more important than knowledge.", author: "Albert Einstein"
        },
        {
            z: -27, side: 'right', image: 'assets/sprites/lighthouse.png',
            quote: "Technology is a useful servant but a dangerous master.", author: "Christian Lous Lange"
        },
        {
            z: -42, side: 'left', image: 'assets/sprites/tree.png',
            quote: "AI will not replace you. A person using AI will.", author: "Anonymous"
        }
    ];

    document.fonts.ready.then(() => {
        quotes.forEach(q => {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');

            // Dark Brown Frame
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Inner Paper
            ctx.fillStyle = '#fdfbf7';
            ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

            // Subtle inner shadow / line
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#2c2c2c';
            ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#2c2c2c';

            const renderCanvas = () => {
                const texture = new THREE.CanvasTexture(canvas);
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearFilter;
                texture.needsUpdate = true;
                
                const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                const geometry = new THREE.PlaneGeometry(4, 4);
                const mesh = new THREE.Mesh(geometry, material);
                
                mesh.position.y = 2.5;
                mesh.position.z = q.z;
                
                if (q.side === 'left') {
                    mesh.position.x = -CORRIDOR_HALF_W + 0.1;
                    mesh.rotation.y = Math.PI / 2;
                } else {
                    mesh.position.x = CORRIDOR_HALF_W - 0.1;
                    mesh.rotation.y = -Math.PI / 2;
                }
                
                scene.add(mesh);
            };

            const img = new Image();
            img.onload = () => {
                const imgSize = 460;
                const imgX = (canvas.width - imgSize) / 2;
                const imgY = 120;
                ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
                
                // Draw a small border around the image itself
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#3e2723';
                ctx.strokeRect(imgX, imgY, imgSize, imgSize);
                
                ctx.font = '60px "Caveat", cursive';
                const wrapText = (text, x, y, maxWidth, lineHeight) => {
                    const words = text.split(' ');
                    let line = '';
                    for (let n = 0; n < words.length; n++) {
                        const testLine = line + words[n] + ' ';
                        const metrics = ctx.measureText(testLine);
                        const testWidth = metrics.width;
                        if (testWidth > maxWidth && n > 0) {
                            ctx.fillText(line, x, y);
                            line = words[n] + ' ';
                            y += lineHeight;
                        } else {
                            line = testLine;
                        }
                    }
                    ctx.fillText(line, x, y);
                    return y;
                };

                const finalY = wrapText('"' + q.quote + '"', canvas.width / 2, 720, 800, 70);
                
                ctx.font = 'bold 35px "Courier Prime", monospace';
                ctx.fillText('- ' + q.author, canvas.width / 2, finalY + 80);

                renderCanvas();
            };
            img.src = q.image;
        });
    });
}
