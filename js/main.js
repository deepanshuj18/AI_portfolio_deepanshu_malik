// ─── Global State ───────────────────────────────────────────────────────────
let scene, camera, renderer, avatar;
let recognition, synthesis;
let isListening = false;
let isSpeaking = false;
let currentLanguage = 'en-US';
let voiceSupported = false;
let speechSupported = false;
let permissionGranted = false;

// ─── Knowledge Base ──────────────────────────────────────────────────────────
const knowledgeBase = {
    "what are your skills": "I specialise in GenAI & LLMs (Gemini, RAG, Prompt Engineering, AI Agents), Machine Learning (TabNet, XGBoost, Scikit-learn, SHAP/LIME), Backend (FastAPI, Node.js, Express), Frontend (React, Next.js, Tailwind CSS), Cloud (AWS EC2/S3/IAM, Docker, Linux), and Databases (MongoDB, MySQL).",
    "tell me about yourself": "I'm Deepanshu Malik, an AI Engineer specialising in LLM systems, document intelligence, and scalable ML platforms. I've built production-ready GenAI applications at Wattmonk Technologies that power real-world solar proposal workflows and social media automation.",
    "what is your experience": "I interned at Wattmonk Technologies (Oct 2025–Jan 2026) as an AI Engineer. I built a Utility Bill Document Intelligence pipeline with 85-95% extraction accuracy, and a Social Media Post Generation Agent that reduced manual content creation by 80% using Gemini LLM.",
    "what projects have you worked on": "My key projects are: (1) Utility Bill AI Agent — live at solaragenthub.com with GitHub case study. (2) AI-Powered RAG Chatbot — contextual Q&A over PDFs using Gemini + Pinecone. (3) WBC Diagnostic System v2.0 — breast cancer prediction with TabNet + SHAP explainability. (4) Social Media Post Generation Agent — live at postmaker.framesense.ai.",
    "show me your projects": "Here are my featured projects! Scroll to the Projects section to see all 4 with live demos and GitHub links.",
    "what is the utility bill agent": "The Utility Bill AI Agent is a production system at solaragenthub.com. It uses Gemini Vision to extract structured data from utility bills (85-95% accuracy), then generates solar ROI proposals using NREL PVWatts API. Built with FastAPI + MongoDB + Docker on AWS.",
    "what is the rag chatbot": "The RAG Chatbot enables contextual Q&A over PDF documents using Retrieval-Augmented Generation. It uses Gemini embeddings with Pinecone vector search for semantic retrieval, backed by a scalable async FastAPI API. GitHub: github.com/deepanshuj18/Rag-chatbot-0",
    "what certifications do you have": "I hold: AWS Cloud Practitioner, Linux Essentials (Cisco), Generative AI (Infosys 2025), and AI/ML (Infosys). I was also a Finalist at College Hackathon 2024 and led a 3-member team to build a real-time chat app.",
    "how can i contact you": "You can reach Deepanshu at malikdeepanshu15@gmail.com or call +91 9220922230. Connect on LinkedIn (Deepanshu Malik) or GitHub (github.com/deepanshuj18). Use the contact form on this page to send a message directly!",
    "book a meeting": "I'd love to schedule a meeting! Let me open the scheduling interface for you.",
    "schedule a meeting": "I'd love to schedule a meeting! Let me open the scheduling interface for you.",
    "show me your resume": "I'll redirect you to get my resume. Please contact me at malikdeepanshu15@gmail.com for my latest resume!",
    "what technologies do you use": "I work with Python, Gemini API, FastAPI, React, Next.js, Tailwind CSS, MongoDB, MySQL, Docker, AWS (EC2, S3, IAM), Pinecone, Scikit-learn, XGBoost, TabNet, SHAP, LIME, Node.js, and more.",
    "where do you work": "I recently interned at Wattmonk Technologies as an AI Engineer, building production GenAI systems for solar energy workflows and social media automation.",
    "what is wattmonk": "Wattmonk Technologies is a solar energy company where I interned as an AI Engineer from Oct 2025 to Jan 2026. I built the Utility Bill AI Agent and Social Media Post Generation Agent there.",
    "hello": "Hello! Welcome to Deepanshu Malik's AI-powered portfolio. I can tell you about his LLM projects, ML skills, work experience at Wattmonk, or help schedule a meeting. What would you like to know?",
    "hi": "Hi there! I'm Deepanshu's AI assistant. Ask me about his projects, skills, or experience!",
    "help": "I can help you explore Deepanshu's portfolio! Try asking: 'What projects have you worked on?', 'What are your skills?', 'Tell me about your experience at Wattmonk', or 'How can I contact you?'"
};

// ─── Initialization ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    checkVoiceSupport();
    initVoiceRecognition();
    initThreeJS();
    setupNavigation();
    setupHamburger();
    showWelcomeModal();
    observeElements();
});

// ─── Voice Support Detection ──────────────────────────────────────────────────
function checkVoiceSupport() {
    voiceSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    speechSupported = 'speechSynthesis' in window;
    updateAIAvatar();
}

function updateAIAvatar() {
    const avatarEl = document.getElementById('aiAvatar');
    const micIcon = avatarEl.querySelector('.mic-icon');

    if (!voiceSupported && !speechSupported) {
        micIcon.textContent = '💬';
        avatarEl.title = 'Click for text chat (Voice not supported)';
    } else if (!permissionGranted) {
        micIcon.textContent = '🎤';
        avatarEl.title = 'Click to enable voice chat';
    } else {
        micIcon.textContent = '🎤';
        avatarEl.title = 'Voice chat enabled – Click to talk';
    }
}

// ─── Welcome Modal ────────────────────────────────────────────────────────────
function showWelcomeModal() {
    document.getElementById('welcomeModal').style.display = 'flex';
}

function startIntroduction() {
    document.getElementById('welcomeModal').style.display = 'none';
    setTimeout(() => {
        speakText("Welcome to Deepanshu Malik's AI-powered portfolio! I'm your AI assistant. You can interact with me using voice commands or text chat. Try asking 'What are your skills' or 'Show me your projects'!");
    }, 500);
}

// ─── Voice Recognition ────────────────────────────────────────────────────────
function initVoiceRecognition() {
    if (voiceSupported) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentLanguage;

        recognition.onstart = () => {
            isListening = true;
            updateAIStatus('listening');
            showVoiceVisualizer();
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            processVoiceCommand(transcript);
        };

        recognition.onerror = (event) => {
            handleSpeechError(event.error);
            updateAIStatus('ready');
            hideVoiceVisualizer();
        };

        recognition.onend = () => {
            isListening = false;
            updateAIStatus('ready');
            hideVoiceVisualizer();
        };
    }

    if (speechSupported) {
        synthesis = window.speechSynthesis;
    }
}

function handleSpeechError(error) {
    switch (error) {
        case 'not-allowed':
            showNotification("Microphone access is required for voice features. Please allow microphone access or use text chat.", 'error');
            showPermissionModal();
            break;
        case 'no-speech':
            showNotification("No speech detected. Please try again or use text chat.", 'warning');
            setTimeout(showChatInterface, 2000);
            break;
        case 'audio-capture':
            showNotification("No microphone found. Please check your connection or use text chat.", 'warning');
            setTimeout(showChatInterface, 2000);
            break;
        case 'network':
            showNotification("Network error. Please check your internet connection or use text chat.", 'warning');
            setTimeout(showChatInterface, 2000);
            break;
        default:
            showNotification("Voice recognition unavailable. Switching to text chat.", 'info');
            setTimeout(showChatInterface, 1000);
    }
}

function processVoiceCommand(command) {
    // Navigation commands
    if (command.includes('go to') || command.includes('show me')) {
        if (command.includes('about') || command.includes('skills')) {
            scrollToSection('about');
            speakText("Here's information about my background and skills.");
        } else if (command.includes('projects') || command.includes('work')) {
            scrollToSection('projects');
            speakText("These are some of my featured projects.");
        } else if (command.includes('contact') || command.includes('get in touch')) {
            scrollToSection('contact');
            speakText("Here's how you can get in touch with me.");
        } else if (command.includes('meeting') || command.includes('avatar')) {
            scrollToSection('meeting');
            speakText("Meet my digital twin! You can interact with my 3D avatar here.");
        }
        return;
    }

    if (command.includes('download') && command.includes('resume')) {
        downloadResume();
        speakText("I'm downloading my resume for you now!");
        return;
    }

    if (command.includes('book') || command.includes('schedule') || command.includes('meeting')) {
        scheduleMeeting();
        speakText("I'd love to schedule a meeting with you! Let me open the scheduler.");
        return;
    }

    if (command.includes('dark') || command.includes('light') || command.includes('theme')) {
        toggleTheme();
        speakText("I've switched the theme for you!");
        return;
    }

    const response = findBestMatch(command);
    speakText(response || "I'm not sure about that. Try asking 'What are your skills' or 'Tell me about yourself'.");
}

function findBestMatch(input) {
    for (const key of Object.keys(knowledgeBase)) {
        if (input.includes(key) || key.includes(input.split(' ')[0])) {
            return knowledgeBase[key];
        }
    }
    return null;
}

// ─── Text-to-Speech ───────────────────────────────────────────────────────────
function speakText(text) {
    // Always show text notification first
    showSpeechNotification(text);

    if (!speechSupported || !synthesis) return;

    try {
        synthesis.cancel();
        isSpeaking = true;
        updateAIStatus('speaking');

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        utterance.onerror = () => {
            isSpeaking = false;
            updateAIStatus('ready');
        };

        utterance.onend = () => {
            isSpeaking = false;
            updateAIStatus('ready');
        };

        const voices = synthesis.getVoices();
        if (voices.length > 0) {
            const preferred = voices.find(v => v.lang.startsWith('en') && v.default) || voices[0];
            if (preferred) utterance.voice = preferred;
        }

        synthesis.speak(utterance);
    } catch (err) {
        isSpeaking = false;
        updateAIStatus('ready');
    }
}

function showSpeechNotification(text) {
    const notification = document.createElement('div');
    notification.className = 'notification ai-response';
    notification.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:10px;">
            <div style="font-size:1.2rem;">🤖</div>
            <div style="flex:1;">${text}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => { if (notification.parentElement) notification.remove(); }, 8000);
}

// ─── AI Assistant Toggle ──────────────────────────────────────────────────────
function toggleVoiceAssistant() {
    if (isListening) {
        if (recognition) recognition.stop();
        showNotification("Voice listening stopped", 'info');
    } else if (!isSpeaking) {
        if (!voiceSupported || !recognition) {
            showChatInterface();
            showNotification("Using text chat – Voice features unavailable", 'info');
        } else {
            startVoiceInteraction();
        }
    }
}

function startVoiceInteraction() {
    if (!voiceSupported || !recognition) {
        showChatInterface();
        showNotification("Voice recognition not supported. Using text chat instead.", 'info');
        return;
    }

    if (!isListening && !isSpeaking) {
        try {
            recognition.start();
            showNotification("Voice recognition started! Speak now.", 'success');
            permissionGranted = true;
            updateAIAvatar();
        } catch (error) {
            permissionGranted = false;
            updateAIAvatar();
            if (error.name === 'NotAllowedError') {
                showNotification("Microphone access needed. Click the mic icon in your browser address bar.", 'warning');
                showPermissionModal();
            } else {
                showChatInterface();
                showNotification("Voice recognition unavailable. Using text chat instead.", 'info');
            }
        }
    }
}

function updateAIStatus(status) {
    document.getElementById('aiAvatar').className = 'ai-avatar ' + status;
}

function showVoiceVisualizer() {
    document.getElementById('voiceVisualizer').style.display = 'flex';
}

function hideVoiceVisualizer() {
    document.getElementById('voiceVisualizer').style.display = 'none';
}

// ─── Three.js 3D Avatar ────────────────────────────────────────────────────────
const AVATAR_PARTS = {};   // Named references to avoid magic indices

function initThreeJS() {
    const container = document.getElementById('three-container');
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Lights — key light from front-right, soft fill from left, ambient base
    scene.add(new THREE.AmbientLight(0x8899bb, 0.5));          // cool ambient
    const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.2); // warm key
    keyLight.position.set(3, 6, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xaabbff, 0.4); // cool fill
    fillLight.position.set(-4, 3, 2);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);  // rim from behind
    rimLight.position.set(0, 4, -5);
    scene.add(rimLight);

    createAvatar();
    createEnvironment();

    camera.position.set(0, 2.0, 4.2);
    camera.lookAt(0, 1.6, 0);

    animate();

    window.addEventListener('resize', onWindowResize);
}

function createAvatar() {
    avatar = new THREE.Group();

    // ── Shared materials ──────────────────────────────────────────────────────
    const mSkin = new THREE.MeshPhongMaterial({ color: 0xF0C090, shininess: 40 });
    const mHair = new THREE.MeshPhongMaterial({ color: 0x1A0C00, shininess: 15 });
    const mShirt = new THREE.MeshPhongMaterial({ color: 0x2255CC, shininess: 30 });
    const mPants = new THREE.MeshPhongMaterial({ color: 0x1C2040, shininess: 10 });
    const mShoe = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 60 });
    const mWhite = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
    const mIris = new THREE.MeshPhongMaterial({ color: 0x3B2A1A });
    const mPupil = new THREE.MeshPhongMaterial({ color: 0x060606 });
    const mLip = new THREE.MeshPhongMaterial({ color: 0xBB6655, shininess: 60 });
    const mCollr = new THREE.MeshPhongMaterial({ color: 0xEEEEEE });

    // ── Head ─────────────────────────────────────────────────────────────────
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 32), mSkin);
    head.scale.y = 1.12;
    head.position.set(0, 2.62, 0);

    // Hair — hemisphere cap on top
    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.445, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
        mHair
    );
    hair.position.set(0, 2.76, -0.03);

    // Ears
    function makeEar(xSign) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), mSkin);
        ear.scale.z = 0.45;
        ear.position.set(xSign * 0.43, 2.62, 0.0);
        return ear;
    }

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.28, 16), mSkin);
    neck.position.set(0, 2.19, 0);

    // ── Eyes ─────────────────────────────────────────────────────────────────
    function makeEye(xSign) {
        const g = new THREE.Group();
        // Sclera (white)
        const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 20), mWhite);
        // Iris
        const iris = new THREE.Mesh(new THREE.CircleGeometry(0.047, 20), mIris);
        iris.position.z = 0.073;
        // Pupil
        const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.026, 20), mPupil);
        pupil.position.z = 0.074;
        // Eyelid tint (upper half cover)
        const lid = new THREE.Mesh(
            new THREE.SphereGeometry(0.078, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.38),
            mSkin
        );
        lid.rotation.x = 0.28;
        lid.position.y = 0.01;
        g.add(sclera, iris, pupil, lid);
        g.position.set(xSign * 0.155, 2.68, 0.35);
        return g;
    }
    const leftEyeGroup = makeEye(-1);
    const rightEyeGroup = makeEye(1);

    // ── Nose ─────────────────────────────────────────────────────────────────
    const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.04), mSkin);
    noseBridge.position.set(0, 2.56, 0.4);
    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), mSkin);
    noseTip.scale.set(1.3, 0.85, 1.4);
    noseTip.position.set(0, 2.48, 0.42);
    const nostrilL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), new THREE.MeshPhongMaterial({ color: 0xD0907A }));
    nostrilL.position.set(-0.055, 2.47, 0.41);
    const nostrilR = nostrilL.clone();
    nostrilR.position.x = 0.055;

    // ── Mouth / Lips ─────────────────────────────────────────────────────────
    const upperLip = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 8), mLip);
    upperLip.scale.set(1.5, 0.55, 0.75);
    upperLip.position.set(0, 2.435, 0.39);
    const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 8), mLip);
    lowerLip.scale.set(1.6, 0.5, 0.78);
    lowerLip.position.set(0, 2.405, 0.39);

    // ── Torso (shirt) ────────────────────────────────────────────────────────
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.29, 1.1, 20), mShirt);
    torso.position.set(0, 1.45, 0);

    // Collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.14, 16), mCollr);
    collar.position.set(0, 2.0, 0);

    // Shoulder caps
    function makeShoulder(xSign) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mShirt);
        s.scale.y = 0.9;
        s.position.set(xSign * 0.52, 1.86, 0);
        return s;
    }

    // ── Arms ─────────────────────────────────────────────────────────────────
    function makeArm(xSign) {
        const g = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.62, 12), mShirt);
        upper.position.y = -0.31;
        const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.072, 0.58, 12), mSkin);
        lower.position.y = -0.91;
        // Hand (rough palm + thumb bump)
        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.07), mSkin);
        palm.position.y = -1.3;
        const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.12, 8), mSkin);
        thumb.rotation.z = xSign * -0.9;
        thumb.position.set(xSign * 0.09, -1.3, 0);
        g.add(upper, lower, palm, thumb);
        g.position.set(xSign * 0.52, 1.86, 0);
        g.rotation.z = xSign * 0.15;
        return g;
    }
    const leftArm = makeArm(-1);
    const rightArm = makeArm(1);

    // ── Pelvis / Waistband ───────────────────────────────────────────────────
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.22, 20), mPants);
    pelvis.position.set(0, 0.89, 0);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.06, 20), new THREE.MeshPhongMaterial({ color: 0x6B4226, shininess: 80 }));
    belt.position.set(0, 1.01, 0);

    // ── Legs ─────────────────────────────────────────────────────────────────
    function makeLeg(xSign) {
        const g = new THREE.Group();
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.115, 0.65, 14), mPants);
        thigh.position.y = -0.325;
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.082, 0.6, 14), mPants);
        shin.position.y = -0.95;
        // Shoe
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.34), mShoe);
        shoe.position.set(xSign * 0.02, -1.31, 0.055);
        const heel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.1), mShoe);
        heel.position.set(0, -1.33, -0.11);
        g.add(thigh, shin, shoe, heel);
        g.position.set(xSign * 0.16, 0.89, 0);
        return g;
    }
    const leftLeg = makeLeg(-1);
    const rightLeg = makeLeg(1);

    // ── Assemble ─────────────────────────────────────────────────────────────
    avatar.add(
        // Head parts
        head, hair, makeEar(-1), makeEar(1), neck,
        leftEyeGroup, rightEyeGroup,
        noseBridge, noseTip, nostrilL, nostrilR,
        upperLip, lowerLip,
        // Body
        torso, collar, belt,
        makeShoulder(-1), makeShoulder(1),
        leftArm, rightArm,
        pelvis,
        leftLeg, rightLeg
    );

    // Named references for animations
    AVATAR_PARTS.head = head;
    AVATAR_PARTS.leftArm = leftArm;
    AVATAR_PARTS.rightArm = rightArm;

    scene.add(avatar);
}

function createEnvironment() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshPhongMaterial({ color: 0x333333, transparent: true, opacity: 0.7 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const PARTICLE_COUNT = 500;
    const posArray = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 50;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMesh = new THREE.Points(
        particlesGeo,
        new THREE.PointsMaterial({ size: 0.05, color: 0x00ffff, transparent: true, opacity: 0.6 })
    );
    scene.add(particlesMesh);
}

function animate() {
    requestAnimationFrame(animate);
    if (avatar) {
        avatar.rotation.y += 0.005;
        AVATAR_PARTS.head.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
    }
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('three-container');
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// ─── Avatar Interaction ───────────────────────────────────────────────────────
function talkToAvatar() {
    speakText("Hello! I'm Deepanshu's digital twin. I can tell you about his work, skills, and help you schedule a meeting. What would you like to know?");

    if (AVATAR_PARTS.leftArm && AVATAR_PARTS.rightArm) {
        const animId = setInterval(() => {
            AVATAR_PARTS.leftArm.rotation.z = Math.sin(Date.now() * 0.01) * 0.5 + 0.3;
            AVATAR_PARTS.rightArm.rotation.z = -Math.sin(Date.now() * 0.01) * 0.5 - 0.3;
        }, 16);
        setTimeout(() => clearInterval(animId), 3000);
    }
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToSection(link.getAttribute('href').substring(1));
            // Close hamburger on mobile
            document.querySelector('.nav-links').classList.remove('open');
        });
    });

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            if (scrollY >= section.offsetTop - 200) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href').substring(1) === current);
        });
    });
}

function setupHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (!hamburger) return;
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
}

function scrollToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    document.querySelector('.theme-toggle').textContent = isDark ? '☀️' : '🌙';
}

// ─── Resume Download ──────────────────────────────────────────────────────────
function downloadResume() {
    showNotification("Thank you for your interest! Please contact me directly via email or LinkedIn for a copy of my resume.", 'info');
    speakText("Please contact me directly for my resume.");
}

// ─── Schedule Meeting ─────────────────────────────────────────────────────────
function scheduleMeeting() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;">
            <div style="background:rgba(30,30,60,0.97);backdrop-filter:blur(20px);padding:2rem;border-radius:20px;text-align:center;max-width:400px;border:1px solid rgba(255,255,255,0.2);color:white;">
                <h3 style="margin-bottom:1rem;">📅 Schedule a Meeting</h3>
                <p style="margin-bottom:1.5rem;opacity:0.9;">Would you like to schedule a 30-minute call with Deepanshu?</p>
                <div style="display:flex;gap:1rem;justify-content:center;">
                    <button id="scheduleYes" class="btn btn-primary">Yes, Schedule Now</button>
                    <button id="scheduleNo"  class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('scheduleYes').onclick = () => {
        document.body.removeChild(modal);
        speakText("Great! Opening the scheduling interface for you.");
        window.open('https://calendly.com/deepanshumalik0110/30min', '_blank');
    };

    document.getElementById('scheduleNo').onclick = () => {
        document.body.removeChild(modal);
        speakText("No problem! Feel free to schedule anytime.");
    };
}

// ─── Contact Form ─────────────────────────────────────────────────────────────
function sendMessageWithFormSubmit() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();

    if (!name || !email || !message) {
        showNotification("Please fill in all fields before submitting.", 'warning');
        speakText("Please fill in all the required fields in the contact form.");
        return;
    }

    const form = document.createElement('form');
    form.action = 'https://formsubmit.co/f81db7f1222bca0aae86e346aedc3365';
    form.method = 'POST';
    form.style.display = 'none';

    [
        { name: 'name', value: name },
        { name: 'email', value: email },
        { name: 'message', value: message },
        { name: '_subject', value: 'New Portfolio Contact Form Submission' },
        { name: '_captcha', value: 'false' },
        { name: '_next', value: window.location.href }
    ].forEach(({ name, value }) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('message').value = '';

    showNotification(`Thank you ${name}! Your message has been sent. I'll get back to you soon at ${email}.`, 'success');
    speakText(`Thank you ${name}! Your message has been received. I'll get back to you soon!`);
}

// ─── Scroll Animations ────────────────────────────────────────────────────────
function observeElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('slide-up');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.skill-card, .project-card').forEach(el => observer.observe(el));
}

// ─── Notification System ──────────────────────────────────────────────────────
function showNotification(message, type = 'info') {
    document.querySelectorAll('.notification:not(.ai-response)').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        <div>${message}</div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => { if (notification.parentElement) notification.remove(); }, 5000);
    notification.addEventListener('click', () => notification.remove());
}

// ─── Permission Modal ─────────────────────────────────────────────────────────
function showPermissionModal() { document.getElementById('permissionModal').style.display = 'flex'; }
function closePermissionModal() { document.getElementById('permissionModal').style.display = 'none'; }

function retryVoicePermission() {
    closePermissionModal();
    showNotification("Trying voice recognition again...", 'info');
    setTimeout(startVoiceInteraction, 1000);
}

function useChatFallback() {
    closePermissionModal();
    showChatInterface();
    showNotification("Text chat is ready! Ask me anything about Deepanshu's work.", 'success');
}

// ─── Chat Fallback ────────────────────────────────────────────────────────────
function showChatInterface() {
    document.getElementById('chatFallback').style.display = 'flex';
    document.getElementById('chatInput').focus();
    const avatarEl = document.getElementById('aiAvatar');
    avatarEl.querySelector('.mic-icon').textContent = '💬';
    avatarEl.title = 'Text chat active';
}

function closeChatFallback() {
    document.getElementById('chatFallback').style.display = 'none';
    const avatarEl = document.getElementById('aiAvatar');
    avatarEl.querySelector('.mic-icon').textContent = '🎤';
    avatarEl.title = 'Click to try voice chat';
}

function handleChatInput(event) {
    if (event.key !== 'Enter') return;

    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    addChatMessage(message, 'user');
    input.value = '';

    setTimeout(() => {
        const response = findBestMatch(message.toLowerCase()) ||
            "I'm not sure about that. Try asking 'What are your skills?' or 'Tell me about yourself'.";
        addChatMessage(response, 'ai');
        speakText(response);
        handleChatCommands(message.toLowerCase());
    }, 500);
}

function addChatMessage(message, sender) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-message ${sender}`;
    div.textContent = message;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function handleChatCommands(message) {
    if (message.includes('download') && message.includes('resume')) {
        downloadResume();
    } else if (message.includes('book') || message.includes('schedule') || message.includes('meeting')) {
        scheduleMeeting();
    } else if (message.includes('go to') || message.includes('show me')) {
        if (message.includes('about') || message.includes('skills')) scrollToSection('about');
        else if (message.includes('projects') || message.includes('work')) scrollToSection('projects');
        else if (message.includes('contact')) scrollToSection('contact');
        else if (message.includes('meeting') || message.includes('avatar')) scrollToSection('meeting');
    }
}

// ─── Language Support ─────────────────────────────────────────────────────────
function changeLanguage(lang) {
    currentLanguage = lang;
    if (recognition) recognition.lang = lang;
    const messages = {
        'en-US': 'Language changed to English',
        'hi-IN': 'भाषा हिंदी में बदली गई',
        'es-ES': 'Idioma cambiado a español'
    };
    speakText(messages[lang] || messages['en-US']);
}

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.ctrlKey) {
        e.preventDefault();
        startVoiceInteraction();
    }
    if (e.code === 'Escape' && isListening && recognition) {
        recognition.stop();
    }
});

// ─── Global Error Handling ────────────────────────────────────────────────────
window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
});
