'use strict';

/* ── CHROMA PALETTES ─────────────────────────────────────── */
const CHROMA_PALETTES = [
  { name: 'Violet Night',  from: [162, 89,  255], to: [255, 107, 107], accent: [162, 89, 255] },
  { name: 'Ocean Drift',   from: [0,   180, 216], to: [72,  202, 228], accent: [0,   180, 216] },
  { name: 'Sunset Pulse',  from: [255, 107, 107], to: [255, 193, 7  ], accent: [255, 107, 107] },
  { name: 'Emerald Beat',  from: [78,  205, 196], to: [162, 89,  255], accent: [78,  205, 196] },
  { name: 'Neon Rush',     from: [255, 0,   128], to: [100, 0,   255], accent: [255, 0,   128] },
  { name: 'Arctic Storm',  from: [100, 181, 246], to: [48,  63,  159], accent: [100, 181, 246] },
];

const DEMO_TRACKS = [
  { name: 'Violet Night',  artist: 'ChromaSync · Demo', palette: 0 },
  { name: 'Ocean Drift',   artist: 'ChromaSync · Demo', palette: 1 },
  { name: 'Sunset Pulse',  artist: 'ChromaSync · Demo', palette: 2 },
  { name: 'Emerald Beat',  artist: 'ChromaSync · Demo', palette: 3 },
  { name: 'Neon Rush',     artist: 'ChromaSync · Demo', palette: 4 },
  { name: 'Arctic Storm',  artist: 'ChromaSync · Demo', palette: 5 },
];

/* ── STATE ───────────────────────────────────────────────── */
let currentPaletteIdx = 0;
let targetPalette     = { ...CHROMA_PALETTES[0] };
let currentPalette    = {
  from: [...CHROMA_PALETTES[0].from],
  to:   [...CHROMA_PALETTES[0].to],
};
let lerpProgress = 1;
let currentTrackIdx = 0;
let isPlaying = true;
let trackInterval = null;

/* ── CANVAS ──────────────────────────────────────────────── */
const canvas = document.getElementById('chromaCanvas');
const ctx    = canvas.getContext('2d');
let canvasW, canvasH, time = 0;
let particles = [];

function resizeCanvas() {
  canvasW = canvas.width  = window.innerWidth;
  canvasH = canvas.height = window.innerHeight;
}

/* ── MATH UTILS ──────────────────────────────────────────── */
const lerp = (a, b, t) => a + (b - a) * t;
const lerpCol = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/* ── PARTICLES ───────────────────────────────────────────── */
class Particle {
  constructor() { this.reset(true); }
  reset(init = false) {
    // Спавн в случайной точке по всему экрану
    this.x = Math.random() * canvasW;
    this.y = Math.random() * canvasH;
    this.r = Math.random() * 2.5 + 0.5;
    // Медленный дрейф в случайном направлении
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    // При инициализации — разброс по фазе, иначе все мигают синхронно
    this.life = init ? Math.random() : 0;
    this.lifeStep = 2 / (Math.random() * 180 + 60);
    this.opacity = Math.random() * 0.6 + 0.15;
    this.palIdx = Math.floor(Math.random() * CHROMA_PALETTES.length);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life += this.lifeStep;
    // Умерла — респавн в новой случайной точке
    if (this.life >= 1) this.reset();
  }
  draw() {
    const alpha = this.opacity * Math.sin(this.life * Math.PI);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = rgb(CHROMA_PALETTES[this.palIdx].from, alpha);
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  const n = Math.min(120, Math.floor(canvasW * canvasH / 9000));
  for (let i = 0; i < n; i++) particles.push(new Particle());
}

/* ── OFFSCREEN GRID (рисуется один раз при старте/ресайзе) ── */
let gridCanvas = null;
function buildGrid() {
  gridCanvas = document.createElement('canvas');
  gridCanvas.width  = canvasW;
  gridCanvas.height = canvasH;
  const gc = gridCanvas.getContext('2d');
  gc.strokeStyle = 'rgba(162,89,255,0.025)';
  gc.lineWidth = 1;
  const gs = 80;
  gc.beginPath();
  for (let x = 0; x <= canvasW; x += gs) { gc.moveTo(x, 0); gc.lineTo(x, canvasH); }
  for (let y = 0; y <= canvasH; y += gs) { gc.moveTo(0, y); gc.lineTo(canvasW, y); }
  gc.stroke();
}

/* ── DRAW FRAME ──────────────────────────────────────────── */
function drawFrame() {
  time += 0.005;

  // Lerp palette
  if (lerpProgress < 1) {
    lerpProgress = Math.min(1, lerpProgress + 0.007);
    currentPalette.from = lerpCol(currentPalette.from, targetPalette.from, lerpProgress);
    currentPalette.to   = lerpCol(currentPalette.to,   targetPalette.to,   lerpProgress);
  }

  ctx.clearRect(0, 0, canvasW, canvasH);

  // Background blobs
  const maxDim = Math.max(canvasW, canvasH);
  const blobs = [
    { x: 0.15 + Math.sin(time * 0.7) * 0.05, y: 0.3  + Math.cos(time * 0.5) * 0.06, r: 0.4,  c: currentPalette.from, a: 0.13 },
    { x: 0.85 + Math.cos(time * 0.6) * 0.04, y: 0.75 + Math.sin(time * 0.8) * 0.04, r: 0.35, c: currentPalette.to,   a: 0.10 },
    { x: 0.5  + Math.sin(time * 0.4) * 0.08, y: 0.5  + Math.cos(time * 0.4) * 0.06, r: 0.28, c: currentPalette.from, a: 0.05 },
  ];
  for (const b of blobs) {
    const gx = b.x * canvasW, gy = b.y * canvasH;
    const gr = b.r * maxDim;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, rgb(b.c, b.a));
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Grid из offscreen canvas
  if (gridCanvas) ctx.drawImage(gridCanvas, 0, 0);

  // Particles
  particles.forEach(p => { p.update(); p.draw(); });

  // Scan line
  const sy = (time * 28) % canvasH;
  const sg = ctx.createLinearGradient(0, sy - 2, 0, sy + 2);
  sg.addColorStop(0, 'transparent');
  sg.addColorStop(0.5, rgb(currentPalette.from, 0.045));
  sg.addColorStop(1, 'transparent');
  ctx.fillStyle = sg;
  ctx.fillRect(0, sy - 2, canvasW, 4);
}

/* ── PALETTE SWITCH ──────────────────────────────────────── */
function switchPalette(idx) {
  currentPaletteIdx = ((idx % CHROMA_PALETTES.length) + CHROMA_PALETTES.length) % CHROMA_PALETTES.length;
  targetPalette = CHROMA_PALETTES[currentPaletteIdx];
  lerpProgress = 0;

  const [r, g, b] = targetPalette.accent;
  document.documentElement.style.setProperty('--accent', `rgb(${r},${g},${b})`);

  updateChromaDemo();
  updateMockup();
  updateCursorColor();
}

/* ── CHROMA DEMO PLAYER ──────────────────────────────────── */
function updateChromaDemo() {
  const pal   = CHROMA_PALETTES[currentPaletteIdx];
  const track = DEMO_TRACKS[currentTrackIdx % DEMO_TRACKS.length];
  const from  = `rgb(${pal.from})`;
  const to    = `rgb(${pal.to})`;
  const fromA = `rgba(${pal.from},0.35)`;

  const grad = document.getElementById('albumGradient');
  if (grad) grad.style.background = `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;

  document.querySelectorAll('.album-pulse-ring').forEach(r => r.style.borderColor = from);

  const player = document.querySelector('.chroma-player');
  if (player) {
    player.style.background = `linear-gradient(135deg, ${fromA} 0%, rgba(8,8,16,0.85) 60%)`;
    player.style.boxShadow   = `0 40px 80px rgba(0,0,0,0.4), 0 0 60px rgba(${pal.from},0.25)`;
  }

  const pf = document.querySelector('.progress-fill');
  if (pf) pf.style.background = from;

  const pb = document.getElementById('playBtn');
  if (pb) { pb.style.background = from; pb.style.borderColor = from; pb.style.boxShadow = `0 0 22px rgba(${pal.from},0.5)`; }

  const dt = document.getElementById('demoTrack');   if (dt) dt.textContent = track.name;
  const da = document.getElementById('demoArtist');  if (da) da.textContent = track.artist;
}

function updateMockup() {
  const pal  = CHROMA_PALETTES[currentPaletteIdx];
  const from = `rgb(${pal.from})`;
  // Accent bar под скриншотом меняет цвет вместе с палитрой
  const mp = document.getElementById('mockupProg');
  if (mp) mp.style.background = from;
}

/* ── TRACK CONTROLS ──────────────────────────────────────── */
function nextTrack() {
  currentTrackIdx = (currentTrackIdx + 1) % DEMO_TRACKS.length;
  switchPalette(DEMO_TRACKS[currentTrackIdx].palette);
}
function prevTrack() {
  currentTrackIdx = (currentTrackIdx - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length;
  switchPalette(DEMO_TRACKS[currentTrackIdx].palette);
}
function autoPlay() {
  clearInterval(trackInterval);
  if (isPlaying) trackInterval = setInterval(nextTrack, 8000);
}

/* ── CURSOR ──────────────────────────────────────────────── */
function updateCursorColor() {
  const pal = CHROMA_PALETTES[currentPaletteIdx];
  const [r, g, b] = pal.from;
  const normal = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="rgba(${r},${g},${b},0.8)"/><circle cx="12" cy="12" r="6" fill="none" stroke="rgba(${r},${g},${b},0.4)" stroke-width="1" opacity="0.6"/></svg>') 12 12, auto`;
  const hover  = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="rgba(${r},${g},${b},0.6)"/><circle cx="16" cy="16" r="10" fill="none" stroke="rgba(${r},${g},${b},0.3)" stroke-width="1.5" opacity="0.7"/></svg>') 16 16, pointer`;
  document.body.style.cursor = normal;
  document.querySelectorAll('a, button, .project-card, .contact-card, .cloud-tag, .ctrl-btn, .feature-chip').forEach(el => {
    el.style.cursor = hover;
  });
}

/* ── TYPING EFFECT ───────────────────────────────────────── */
const PHRASES = [
  'System programmer',
  'AI & neural nets enthusiast',
  'Linux & Android hacker',
  'UI customization fanatic',
  'Self-hosted VPN wizard',
  'ChromaSync creator',
];
let phraseIdx = 0, charIdx = 0, typing = true;
const typedEl = document.getElementById('typedText');

function typeEffect() {
  if (!typedEl) return;
  const phrase = PHRASES[phraseIdx];
  if (typing) {
    typedEl.textContent = phrase.slice(0, ++charIdx);
    if (charIdx >= phrase.length) { typing = false; setTimeout(typeEffect, 2000); return; }
    setTimeout(typeEffect, 55);
  } else {
    typedEl.textContent = phrase.slice(0, --charIdx);
    if (charIdx <= 0) {
      typing = true;
      phraseIdx = (phraseIdx + 1) % PHRASES.length;
      setTimeout(typeEffect, 400);
      return;
    }
    setTimeout(typeEffect, 28);
  }
}

/* ── NAVBAR SCROLL ───────────────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

/* ── SCROLL REVEAL ───────────────────────────────────────── */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.project-card, .featured-project, .skill-category, .contact-card, .about-layout, .tech-tags-cloud, .principles-card').forEach(el => {
  el.classList.add('reveal');
  revealObs.observe(el);
});

/* ── SKILL BARS ──────────────────────────────────────────── */
const skillObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.skill-fill').forEach((f, i) => {
        setTimeout(() => f.classList.add('animated'), 200 + i * 80);
      });
      skillObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });
document.querySelectorAll('.skill-category').forEach(el => skillObs.observe(el));

/* ── 3D TILT ─────────────────────────────────────────────── */
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r  = card.getBoundingClientRect();
    const rx = ((e.clientY - r.top  - r.height / 2) / r.height) * -10;
    const ry = ((e.clientX - r.left - r.width  / 2) / r.width)  *  10;
    card.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* ── SMOOTH ANCHORS ──────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

/* ── PARALLAX ON HERO VISUAL (throttled via rAF) ─────────── */
const heroVisual = document.querySelector('.hero-visual');
let parallaxPending = false;
let parallaxX = 0, parallaxY = 0;
document.addEventListener('mousemove', e => {
  if (!heroVisual) return;
  parallaxX = (e.clientX / window.innerWidth  - 0.5);
  parallaxY = (e.clientY / window.innerHeight - 0.5);
  if (!parallaxPending) {
    parallaxPending = true;
    requestAnimationFrame(() => {
      heroVisual.style.transform = `translate(${parallaxX * 14}px, ${parallaxY * 9}px)`;
      parallaxPending = false;
    });
  }
}, { passive: true });

/* ── MAIN LOOP (30 FPS cap — фон не нуждается в 60fps) ────── */
let loopActive = true;
let lastFrameTime = 0;
const FRAME_INTERVAL = 1000 / 30;

function mainLoop(ts) {
  requestAnimationFrame(mainLoop);
  if (!loopActive) return;
  if (ts - lastFrameTime < FRAME_INTERVAL) return;
  lastFrameTime = ts;
  drawFrame();
}

// Стоп canvas когда вкладка скрыта
document.addEventListener('visibilitychange', () => {
  loopActive = !document.hidden;
});

/* ── INIT ────────────────────────────────────────────────── */
function init() {
  resizeCanvas();
  buildGrid();
  initParticles();
  window.addEventListener('resize', () => { resizeCanvas(); buildGrid(); initParticles(); });

  document.getElementById('nextBtn')?.addEventListener('click', nextTrack);
  document.getElementById('prevBtn')?.addEventListener('click', prevTrack);
  document.getElementById('playBtn')?.addEventListener('click', () => {
    isPlaying = !isPlaying;
    document.getElementById('playBtn').textContent = isPlaying ? '▶' : '⏸';
    autoPlay();
  });

  switchPalette(0);
  autoPlay();
  typeEffect();
  mainLoop(0);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
