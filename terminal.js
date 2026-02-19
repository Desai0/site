/* ═══════════════════════════════════════════════════════════
   DESAICHK PORTFOLIO — TERMINAL.JS
   Hidden Easter Egg Terminal (Ctrl+`)
   ═══════════════════════════════════════════════════════════ */

'use strict';

const termState = {
  history: [], historyIdx: -1,
  open: false, startTime: Date.now(), cmdCount: 0,
};

const overlay    = document.getElementById('terminalOverlay');
const termInput  = document.getElementById('terminalInput');
const termOutput = document.getElementById('terminalOutput');
const termBody   = document.getElementById('terminalBody');
const termClose  = document.getElementById('termClose');

/* ── OPEN / CLOSE ────────────────────────────────────────── */
function openTerminal() {
  overlay.classList.add('active');
  termState.open = true;
  setTimeout(() => termInput?.focus(), 200);
}
function closeTerminal() {
  overlay.classList.remove('active');
  termState.open = false;
}

/* ── KEY BINDINGS ────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === '`') {
    e.preventDefault();
    termState.open ? closeTerminal() : openTerminal();
    return;
  }
  if (e.key === 'Escape' && termState.open) { closeTerminal(); return; }
  if (!termState.open || document.activeElement !== termInput) return;

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (termState.historyIdx < termState.history.length - 1) {
      termState.historyIdx++;
      termInput.value = termState.history[termState.history.length - 1 - termState.historyIdx];
    }
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (termState.historyIdx > 0) {
      termState.historyIdx--;
      termInput.value = termState.history[termState.history.length - 1 - termState.historyIdx];
    } else {
      termState.historyIdx = -1;
      termInput.value = '';
    }
  }
});

termClose?.addEventListener('click', closeTerminal);
overlay?.addEventListener('click', e => { if (e.target === overlay) closeTerminal(); });
overlay?.addEventListener('click', () => termInput?.focus());

/* ── SUBMIT ──────────────────────────────────────────────── */
termInput?.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const raw = termInput.value.trim();
  if (!raw) return;
  termState.history.push(raw);
  termState.historyIdx = -1;
  termState.cmdCount++;
  termInput.value = '';

  appendCmd(raw);
  const lines = run(raw.toLowerCase().trim());
  lines.forEach(l => appendLine(l));
  appendSep();
  termBody.scrollTop = termBody.scrollHeight;
});

/* ── TAB COMPLETION ──────────────────────────────────────── */
const COMMANDS = [
  'help','about','projects','skills','contact','setup','chromasync','neuro',
  'whoami','uname','ls','cat','github','telegram','palette','matrix','uptime',
  'history','clear','exit','sudo','vim','htop','top','ping','arch','btw','vpn',
  'xray','git','nmap','hire',
];
termInput?.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const v = termInput.value.trim().toLowerCase();
  if (!v) return;
  const m = COMMANDS.find(c => c.startsWith(v));
  if (m) termInput.value = m;
});

/* ── RENDER ──────────────────────────────────────────────── */
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function appendCmd(text) {
  const d = document.createElement('div');
  d.className = 'term-line-cmd';
  d.innerHTML = `<span class="t-prompt">desaichk@portfolio:~$</span> <span>${esc(text)}</span>`;
  termOutput.appendChild(d);
}
function appendLine({ html, text, cls = '' }) {
  const d = document.createElement('div');
  d.className = `term-line-result ${cls}`;
  d.innerHTML = html || esc(text || '');
  termOutput.appendChild(d);
}
function appendSep() {
  const hr = document.createElement('hr');
  hr.className = 'term-separator';
  termOutput.appendChild(hr);
}

const r  = (text, cls = '') => ({ text, cls });
const rh = (html, cls = '') => ({ html, cls });
const nl = ()               => r('');

/* ══════════════════════════════════════════════════════════
   COMMAND REGISTRY
   ══════════════════════════════════════════════════════════ */
function run(raw) {
  const parts = raw.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  switch (cmd) {

    case 'help': case '?':
      return [
        rh(`<span class="highlight">═══ Desaichk Portfolio Terminal ═══</span>`), nl(),
        rh(`  <span class="highlight">about</span>        — Who is Desaichk`),
        rh(`  <span class="highlight">projects</span>     — All projects`),
        rh(`  <span class="highlight">skills</span>       — Tech stack`),
        rh(`  <span class="highlight">contact</span>      — Contacts`),
        rh(`  <span class="highlight">setup</span>        — Hardware & OS`),
        rh(`  <span class="highlight">chromasync</span>   — Main project details`),
        rh(`  <span class="highlight">neuro</span>        — CR Neuro AI bot`),
        rh(`  <span class="highlight">whoami</span>       — Current user`),
        rh(`  <span class="highlight">uname</span>        — System info`),
        rh(`  <span class="highlight">ls [dir]</span>     — List directory`),
        rh(`  <span class="highlight">cat [file]</span>   — Read file`),
        rh(`  <span class="highlight">git log</span>      — Commit log`),
        rh(`  <span class="highlight">htop</span>         — Processes`),
        rh(`  <span class="highlight">ping [host]</span>  — Ping`),
        rh(`  <span class="highlight">nmap</span>         — Scan employer`),
        rh(`  <span class="highlight">github</span>       — Open GitHub profile`),
        rh(`  <span class="highlight">telegram</span>     — Open Telegram`),
        rh(`  <span class="highlight">palette</span>      — Switch ChromaSync color`),
        rh(`  <span class="highlight">matrix</span>       — 🐇 Follow the rabbit`),
        rh(`  <span class="highlight">arch</span>         — I use Arch btw`),
        rh(`  <span class="highlight">hire</span>         — 👔 Hire Desaichk`),
        rh(`  <span class="highlight">uptime</span>       — Session uptime`),
        rh(`  <span class="highlight">history</span>      — Command history`),
        rh(`  <span class="highlight">clear</span>        — Clear terminal`),
        rh(`  <span class="highlight">exit</span>         — Close terminal`),
        nl(), r('Tab — autocomplete  ·  ↑↓ — history', 'dim'),
      ];

    case 'whoami':
      return [r('desaichk', 'highlight')];

    case 'uname':
      return [
        r('Linux arch 6.12.0-ARCH #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux'),
        r('CPU: Intel Core i5-13600KF  GPU: RTX 5070 Ti  Phone: OnePlus 12', 'dim'),
      ];

    case 'about':
      return [
        rh(`<span class="highlight">Desaichk</span> — 19 y.o. developer, Saint Petersburg, Russia`), nl(),
        r('• Student of Software Development'),
        r('• C++ / C# / Python / JS — core stack'),
        r('• Deep dives: Android ROMs, custom firmware, neural nets, VPN'),
        r('• Flashed dozens of ROMs, recovered soft+hard bricks, EDL tricks'),
        r('• Self-hosted Xray VPN: XHTTP + Nginx + SelfSteal + CDN'),
        r('• Hosts server for a friend, set up Entware on routers'),
        nl(),
        rh(`Telegram: <span class="success">@desaichk</span>`),
        rh(`GitHub:   <span class="success">github.com/Desai0</span>`),
        rh(`Email:    <span class="success">kolobokevgenij83@gmail.com</span>`),
        rh(`City:     <span class="success">Saint Petersburg, UTC+3</span>`),
      ];

    case 'projects': case 'ls projects/': case 'ls projects':
      return [
        rh(`<span class="highlight">★  REPO                  LANG           DESCRIPTION</span>`), nl(),
        rh(`<span class="success">16</span>  ChromaSync            JavaScript    Adaptive Yandex Music theme`),
        rh(`<span class="success"> 5</span>  CR_Neuro              Python/C++    Clash Royale AI bot`),
        rh(`<span class="success"> 2</span>  Task-Manager-Rebuild  C++/Electron  System task manager`),
        rh(`<span class="success"> 0</span>  OOP_Project_Shashki   C++           Checkers with OOP`),
        rh(`<span class="success"> 0</span>  Zmeya-Game            C++           Snake game`),
        rh(`<span class="success"> 0</span>  MineSwapper           C++           Minesweeper`),
        nl(), r('Total: ★ 23', 'dim'),
      ];

    case 'chromasync':
      return [
        rh(`<span class="highlight">ChromaSync</span> — Adaptive Yandex Music theme`), nl(),
        r('★ 16 stars  |  JavaScript  |  github.com/Desai0/ChromaSync'), nl(),
        r('🌈 Chameleon effect — extracts album art palette, recolors UI'),
        r('🌠 Parallax background with smooth cross-fade transitions'),
        r('💥 Beat Pulse: RAW (direct bit response) and OSU modes'),
        r('☯  Zen Mode — full screen artwork, just music and beats'),
        r('💬 Track comments via Telegram nickname'),
        r('⚡ MutationObserver + debounce — zero performance impact'),
        r('🔒 Race condition protection with unique request IDs'),
        r('🎨 Accent color: auto from palette or manual with color picker'),
        nl(),
        r('Supported palettes: Vibrant, Muted, DarkVibrant, and more', 'dim'),
      ];

    case 'neuro': case 'cr_neuro':
      return [
        rh(`<span class="highlight">CR Neuro</span> — Clash Royale AI Agent`), nl(),
        r('★ 5 stars  |  Python + C++  |  github.com/Desai0/CR_Neuro'), nl(),
        r('👁  Vision:   YOLOv12 — detects units, towers, cards in real-time'),
        r('🧠 Brain:    Game state analysis, elixir economy, attack/defense'),
        r('🖐  Actions:  PyAutoGUI mouse simulation for card placement'),
        r('💾 State:    Structured game memory (health, positions, cards)'),
        nl(),
        r('Stack: Python 3 · YOLOv12 · Tesseract OCR · OpenCV · MSS'),
        r('       C++ optimizer DLL · Threading · Reinforcement Learning'),
        r('Training: supervised on demos + RL (carrot and stick)', 'dim'),
      ];

    case 'skills': case 'cat skills.txt':
      return [
        rh(`<span class="highlight">Tech Stack:</span>`), nl(),
        rh(`Core:      <span class="success">C++ (85%) · C#/.NET (75%) · Python (65%) · JS (60%)</span>`),
        rh(`Data:      <span class="success">PostgreSQL · SQLite · JSON APIs · TCP/IP Sockets</span>`),
        rh(`AI/ML:     <span class="success">YOLOv12 · Tesseract OCR · OpenCV · RL · Neural Nets</span>`),
        rh(`Systems:   <span class="success">Arch Linux · Android ROM/Root · Bash · VPN/Xray/Nginx</span>`),
        rh(`Desktop:   <span class="success">Electron · Win32 API · IPC</span>`),
        rh(`Concepts:  <span class="success">OOP · Multithreading · MutationObserver · Debounce</span>`),
        nl(), r('I use Arch btw :3', 'dim'),
      ];

    case 'contact':
      return [
        rh(`<span class="highlight">Contact Desaichk:</span>`), nl(),
        rh(`  Telegram  →  <span class="success">@desaichk</span>                  (fastest response)`),
        rh(`  GitHub    →  <span class="success">github.com/Desai0</span>`),
        rh(`  Email     →  <span class="success">kolobokevgenij83@gmail.com</span>`),
        nl(), r('Open to: work offers, collaborations, interesting tasks', 'dim'),
      ];

    case 'setup': case 'cat setup.json':
      return [
        rh(`<span class="json">{</span>`),
        rh(`<span class="json">  "phone":  "OnePlus 12 (rooted, custom ROM)",</span>`),
        rh(`<span class="json">  "gpu":    "RTX 5070 Ti",</span>`),
        rh(`<span class="json">  "cpu":    "Intel Core i5-13600KF",</span>`),
        rh(`<span class="json">  "os":     "Arch Linux (I use Arch btw)",</span>`),
        rh(`<span class="json">  "os2":    "Windows 11 (when forced)",</span>`),
        rh(`<span class="json">  "server": "self-hosted, Xray XHTTP + Nginx + SelfSteal + CDN",</span>`),
        rh(`<span class="json">  "router": "Entware + VPN bypass (zapret)",</span>`),
        rh(`<span class="json">  "extras": "animated phone wallpapers, custom ROMs, EDL tricks"</span>`),
        rh(`<span class="json">}</span>`),
      ];

    case 'ls':
      if (args[0] && (args[0].startsWith('proj') || args[0] === 'projects/')) return run('projects');
      return [
        rh(`<span class="dim">drwxr-xr-x</span>  <span class="highlight">projects/</span>`),
        rh(`<span class="dim">-rw-r--r--</span>  <span class="success">skills.txt</span>`),
        rh(`<span class="dim">-rw-r--r--</span>  <span class="success">about.md</span>`),
        rh(`<span class="dim">-rw-r--r--</span>  <span class="success">setup.json</span>`),
        rh(`<span class="dim">-rw-r--r--</span>  <span class="success">contact.txt</span>`),
        rh(`<span class="dim">drwx------</span>  <span class="error">.secrets/</span>   <span class="dim">(permission denied)</span>`),
      ];

    case 'cat':
      if (!args[0]) return [r('Usage: cat [filename]', 'error')];
      if (args[0] === 'skills.txt') return run('skills');
      if (args[0] === 'about.md') return run('about');
      if (args[0] === 'contact.txt') return run('contact');
      if (args[0] === 'setup.json') return run('setup');
      if (args[0].includes('secret')) return [r('Permission denied', 'error'), r('Nice try :)', 'dim')];
      return [r(`cat: ${esc(args[0])}: No such file or directory`, 'error')];

    case 'github':
      window.open('https://github.com/Desai0', '_blank');
      return [rh(`<span class="success">Opening github.com/Desai0...</span>`)];

    case 'telegram':
      window.open('https://t.me/desaichk', '_blank');
      return [rh(`<span class="success">Opening t.me/desaichk...</span>`)];

    case 'palette':
      if (typeof switchPalette === 'function' && typeof currentPaletteIdx !== 'undefined') {
        const ni = (currentPaletteIdx + 1) % CHROMA_PALETTES.length;
        switchPalette(ni);
        const p = CHROMA_PALETTES[ni];
        return [
          rh(`<span class="success">Switched to: ${p.name}</span>`),
          rh(`<span class="dim">from: rgb(${p.from})  →  to: rgb(${p.to})</span>`),
        ];
      }
      return [r('palette not available', 'error')];

    case 'matrix':
      matrixEffect();
      return [
        rh(`<span class="success">Wake up, Desaichk...</span>`),
        r('The Matrix has you.', 'dim'),
        rh(`<span class="highlight">Follow the white rabbit. 🐇</span>`),
      ];

    case 'uptime': {
      const s = Math.floor((Date.now() - termState.startTime) / 1000);
      return [
        r(`Session: ${Math.floor(s/60)}m ${s%60}s`),
        r(`Commands: ${termState.cmdCount}`, 'dim'),
      ];
    }

    case 'history':
      if (!termState.history.length) return [r('No history yet', 'dim')];
      return termState.history.slice(-15).map((c, i) =>
        rh(`  <span class="dim">${String(i+1).padStart(3)}</span>  ${esc(c)}`)
      );

    case 'clear': case 'cls':
      termOutput.innerHTML = '';
      return [];

    case 'exit': case 'quit': case 'close':
      setTimeout(closeTerminal, 300);
      return [r('Closing terminal...', 'dim')];

    /* ── Easter eggs ── */
    case 'sudo':
      return [r('Permission denied. This is a portfolio, not a root shell.', 'error'), r('Nice try though :3', 'dim')];

    case 'rm':
      return args.some(a => a.includes('r')) ? [r('Refusing to rm the portfolio.', 'error'), r(':)', 'dim')] : [r('rm: missing operand', 'error')];

    case 'vim': case 'nvim': case 'nano':
      return [
        r(`Opening ${cmd}...`, 'success'), nl(),
        r('Just kidding. How do you exit vim?', 'dim'),
        rh(`<span class="highlight">:q!</span>  — I use Arch btw, obviously I know.`),
      ];

    case 'htop': case 'top':
      return [
        rh(`<span class="highlight">  PID   USER     CPU%   MEM%   COMMAND</span>`),
        rh(`<span class="success"> 1337</span>  desai    42.0   18.2   <span class="highlight">chromasync</span>`),
        rh(`<span class="dim"> 2048</span>  desai     8.5    4.1   cr_neuro`),
        rh(`<span class="dim"> 4096</span>  desai     2.3    2.0   portfolio`),
        rh(`<span class="dim"> 8192</span>  desai     0.1    0.5   bash`),
        nl(), r('q to quit (just kidding)', 'dim'),
      ];

    case 'ping': {
      const host = args[0] || 'github.com';
      return [
        rh(`PING ${esc(host)}: 56 bytes of data`),
        rh(`64 bytes: icmp_seq=0 ttl=55 <span class="success">time=11.4ms</span>`),
        rh(`64 bytes: icmp_seq=1 ttl=55 <span class="success">time=12.1ms</span>`),
        rh(`64 bytes: icmp_seq=2 ttl=55 <span class="success">time=11.8ms</span>`),
        rh(`--- 3 packets: <span class="success">0% loss</span>, avg 11.8ms`),
      ];
    }

    case 'arch': case 'btw':
      return [
        rh(`<span class="success">I use Arch, btw.</span>`), nl(),
        rh(`       <span class="highlight">/\\</span>`),
        rh(`      <span class="highlight">/  \\</span>`),
        rh(`     <span class="highlight">/\\   \\</span>`),
        rh(`    <span class="highlight">/  __  \\</span>`),
        rh(`   <span class="highlight">/  (  )  \\</span>`),
        rh(`  <span class="highlight">/ __|  |__ \\</span>`),
        rh(` <span class="highlight">/_-''    ''-_\\</span>`),
        nl(), r('Rolling release. Minimal. Fast. Customizable. Mine.', 'dim'),
      ];

    case 'xray': case 'vpn':
      return [
        rh(`<span class="highlight">VPN Setup:</span>`), nl(),
        r('Protocol:  Xray XHTTP'),
        r('Proxy:     Nginx reverse proxy'),
        r('Stealth:   SelfSteal (traffic masking)'),
        r('CDN:       Cloudflare'),
        rh(`Status:    <span class="success">● Running</span>`),
        nl(),
        r('Also: zapret bypass, Entware router tweaks', 'dim'),
      ];

    case 'git':
      if (args[0] === 'log') {
        return [
          rh(`<span class="highlight">commit a1b2c3d</span> (HEAD → main)`),
          r('Author: Desaichk <kolobokevgenij83@gmail.com>', 'dim'),
          r('Date:   2026', 'dim'), nl(),
          r('    feat: ChromaSync — beat pulse, zen mode, TG comments'), nl(),
          rh(`<span class="highlight">commit d4e5f6g</span>`),
          r('    feat: CR Neuro — YOLOv12 + RL training'), nl(),
          rh(`<span class="highlight">commit h7i8j9k</span>`),
          r('    feat: Task Manager — C++ backend + Electron'),
        ];
      }
      return [r(`git: unknown subcommand '${esc(args[0] || '')}' — try 'git log'`, 'dim')];

    case 'nmap':
      return [
        rh(`<span class="highlight">Scanning employer...</span>`),
        rh(`Nmap 7.95 — Host: employer.com`),
        rh(`PORT      STATE  SERVICE`),
        rh(`22/tcp    open   ssh`),
        rh(`80/tcp    open   http`),
        rh(`443/tcp   open   https`),
        rh(`9000/tcp  open   <span class="success">ready-to-hire: YES</span>`), nl(),
        r('Hire this dev already.', 'dim'),
      ];

    case 'hire':
      return [
        rh(`<span class="success">✓ Request received!</span>`), nl(),
        r('Thank you for your interest in hiring Desaichk!'),
        rh(`Fastest: Telegram <span class="highlight">@desaichk</span>`),
        rh(`Email:   <span class="highlight">kolobokevgenij83@gmail.com</span>`), nl(),
        r('Available for work, interesting projects, collaborations.', 'dim'),
      ];

    default:
      return [
        r(`bash: ${esc(raw)}: command not found`, 'error'),
        r(`Type 'help' to see available commands.`, 'dim'),
      ];
  }
}

/* ── MATRIX EFFECT ───────────────────────────────────────── */
function matrixEffect() {
  const c = document.createElement('canvas');
  c.width  = window.innerWidth;
  c.height = window.innerHeight;
  c.style.cssText = 'position:fixed;inset:0;z-index:2000;pointer-events:none;';
  document.body.appendChild(c);
  const x = c.getContext('2d');

  const chars  = 'アイウエオ01ChromaSyncDesaichkLinuxArch';
  const cols   = Math.floor(c.width / 20);
  const drops  = Array.from({ length: cols }, () => Math.random() * 30 | 0);
  const speeds = Array.from({ length: cols }, () => Math.random() * 1.5 + 0.5);
  let frame = 0;

  const INTERVAL = 33; // ~30fps
  let lastTime = 0;
  function draw(ts) {
    if (ts - lastTime >= INTERVAL) {
      lastTime = ts;
      frame++;
      x.fillStyle = 'rgba(0,0,0,0.06)';
      x.fillRect(0, 0, c.width, c.height);
      x.font = '14px monospace';

      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        x.fillStyle = frame < 10 ? '#0f0' : `hsl(${(i * 10 + frame * 3) % 360}, 100%, 55%)`;
        x.fillText(ch, i * 20, drops[i] * 20);
        if (drops[i] * 20 > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += speeds[i];
      }

      if (frame > 130) {
        c.style.transition = 'opacity 1s';
        c.style.opacity = '0';
        setTimeout(() => c.remove(), 1000);
        return;
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
