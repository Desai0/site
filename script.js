document.addEventListener("DOMContentLoaded", () => {
  const roll = document.getElementById("paperRoll");

  window.addEventListener("scroll", () => {
    // Получаем текущую прокрутку
    const scrollY = window.scrollY;

    // Сдвигаем точки на цилиндре вниз, зеркально движению обычной страницы
    if (roll) {
      roll.style.backgroundPosition = `12px ${scrollY * 0.6}px, 0 0`;
    }
  });

  // --- Универсальная система генерации штриховок и подчеркиваний ---
  const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
      generateScribble(entry.target);
    }
  });

  // Ищем все элементы, которым нужна штриховка или подчеркивание
  document.querySelectorAll('.pencil-block, [data-scribble]').forEach(block => {
    observer.observe(block);
  });

  // Инициализация следа от курсора
  initCursorTrail();
});

function initCursorTrail() {
  const container = document.querySelector('.notebook-page');
  if (!container) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'cursorTrail';
  Object.assign(canvas.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '200', // Поверх всего контента, но pointerEvents:none не блокирует клики
    pointerEvents: 'none',
    opacity: '0.4'
  });
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let lastX = null;
  let lastY = null;
  let isDrawing = false;

  function resize() {
    // При ресайзе просто сбрасываем размеры под контейнер
    // В рамках портала это допустимо, чтобы не грузить память
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    ctx.strokeStyle = 'rgba(50, 50, 50, 0.2)';
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
  }

  window.addEventListener('resize', resize);
  resize();

  // Следим за изменением размера контента через ResizeObserver
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function getPos(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function draw(e) {
    const { x, y } = getPos(e);

    if (lastX === null) {
      lastX = x;
      lastY = y;
      return;
    }

    // Проверяем зажатие ПКМ (buttons — это битовая маска, 2 — правая кнопка)
    const isRightMB = e.buttons !== undefined && (e.buttons & 2);

    ctx.lineWidth = isRightMB ? 2 : 0.8;
    ctx.strokeStyle = isRightMB ? 'rgba(30, 30, 30, 0.4)' : 'rgba(50, 50, 50, 0.2)';

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastX = x;
    lastY = y;
  }

  // Отключаем контекстное меню, чтобы можно было рисовать правой кнопкой
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  let lastTime = 0;
  const fpsInterval = 1000 / 50; // ~20ms для 50 FPS

  function drawThrottled(e) {
    const now = performance.now();
    if (now - lastTime >= fpsInterval) {
      lastTime = now;
      draw(e);
    }
  }

  window.addEventListener('mousemove', drawThrottled);

  window.addEventListener('touchstart', (e) => {
    const { x, y } = getPos(e);
    lastX = x;
    lastY = y;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    draw(e);
  }, { passive: true });
}

function generateScribble(container) {
  let svg = container.querySelector('.scribble-svg');
  if (svg) {
    svg.remove();
  }

  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("scribble-svg");

  svg.style.position = "absolute";
  svg.style.top = "50%";
  svg.style.left = "50%";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.zIndex = "-1";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";

  const rect = container.getBoundingClientRect();
  let w = rect.width || 400;
  let h = rect.height || 300;

  // Считываем параметры (если их нет, используем дефолты для .pencil-block)
  const type = container.dataset.scribbleType || 'fill'; // fill, underline, box
  const color = container.dataset.scribbleColor || 'rgba(30, 30, 30, 0.4)';
  const strokeWidth = parseFloat(container.dataset.scribbleStroke) || 2.5;
  const step = parseFloat(container.dataset.scribbleStep) || 12; // Плотность штриха
  const jitter = parseFloat(container.dataset.scribbleJitter) || 20; // Небрежность
  const angle = parseFloat(container.dataset.scribbleAngle) || (type === 'fill' ? -20 : 0); // Поворот
  const passes = parseInt(container.dataset.scribblePasses) || 2; // Количество слоев/линий
  const widthMult = parseFloat(container.dataset.scribbleWidth) || 1.0;
  const heightMult = parseFloat(container.dataset.scribbleHeight) || 1.0;

  w *= widthMult;
  h *= heightMult;

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.style.transform = `translate(-50%, -50%)`;

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

  if (type === 'fill') {
    g.setAttribute("transform", `translate(${w / 2}, ${h / 2}) skewX(${angle}) rotate(-2) translate(${-w / 2}, ${-h / 2})`);

    for (let p = 0; p < passes; p++) {
      const currentStep = step + (p * 4);
      const currentJitter = jitter + (p * 5);
      const currentWidth = strokeWidth + (p * 0.5);
      const opacityMod = 1 - (p * 0.2);

      const pathD = buildVerticalZigZag(w, h, currentStep, currentJitter);
      const path = createPath(pathD, color, currentWidth, opacityMod);
      g.appendChild(path);
    }
  } else if (type === 'underline') {
    g.setAttribute("transform", `translate(${w / 2}, ${h / 2}) rotate(${angle}) translate(${-w / 2}, ${-h / 2})`);
    const pathD = buildHorizontalScribble(w, h, passes, jitter);
    const path = createPath(pathD, color, strokeWidth, 1);
    g.appendChild(path);
  } else if (type === 'box') {
    g.setAttribute("transform", `translate(${w / 2}, ${h / 2}) rotate(${angle}) translate(${-w / 2}, ${-h / 2})`);
    const pathD = buildBoxScribble(w, h, passes, jitter);
    const path = createPath(pathD, color, strokeWidth, 1);
    g.appendChild(path);
  } else if (type === 'heart') {
    g.setAttribute("transform", `translate(${w / 2}, ${h / 2}) rotate(${angle}) translate(${-w / 2}, ${-h / 2})`);
    for (let p = 0; p < passes; p++) {
      const pathD = buildHeartScribble(w, h, jitter + (p * 2));
      const path = createPath(pathD, color, strokeWidth, 1 - (p * 0.2));
      g.appendChild(path);
    }
  } else if (type === 'star') {
    g.setAttribute("transform", `translate(${w / 2}, ${h / 2}) rotate(${angle}) translate(${-w / 2}, ${-h / 2})`);
    for (let p = 0; p < passes; p++) {
      const pathD = buildStarScribble(w, h, jitter + (p * 2));
      const path = createPath(pathD, color, strokeWidth, 1 - (p * 0.2));
      g.appendChild(path);
    }
  } else if (type === 'circle') {
    g.setAttribute("transform", `translate(${w / 2}, ${h / 2}) rotate(${angle}) translate(${-w / 2}, ${-h / 2})`);
    for (let p = 0; p < passes; p++) {
      const pathD = buildCircleScribble(w, h, jitter + (p * 2));
      const path = createPath(pathD, color, strokeWidth, 1 - (p * 0.2));
      g.appendChild(path);
    }
  }

  svg.appendChild(g);

  // Если у контейнера не задано позиционирование, ставим relative чтобы SVG не улетел
  if (window.getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  container.appendChild(svg);
}

function createPath(d, color, strokeWidth, opacityMod) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", strokeWidth);
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("filter", "url(#rough-edge)");
  path.style.opacity = opacityMod;
  return path;
}

function buildVerticalZigZag(w, h, step, jitter) {
  const strokes = Math.ceil(w / step) + 15;
  let d = "";
  let currentX = -40;

  for (let i = 0; i < strokes; i++) {
    const yTop = (Math.random() - 0.5) * jitter * 1.5;
    const yBottom = h + (Math.random() - 0.5) * jitter * 1.5;
    const xOffset1 = (Math.random() - 0.5) * step * 0.8;
    const xOffset2 = (Math.random() - 0.5) * step * 0.8;

    if (i === 0) d += `M ${currentX + xOffset1} ${yTop} `;

    d += `L ${currentX + (step / 2) + xOffset2} ${yBottom} `;
    currentX += step;
    d += `L ${currentX + xOffset1} ${yTop} `;
  }
  return d;
}

function buildHorizontalScribble(w, h, passes, jitter) {
  let d = "";
  const yPos = h - (jitter / 4);
  // Стартуем с небольшой случайной погрешностью
  let currentX = -jitter + (Math.random() - 0.5) * jitter * 1.5;
  let currentY = yPos + (Math.random() - 0.5) * jitter;

  d += `M ${currentX} ${currentY} `;

  for (let p = 0; p < passes; p++) {
    const isGoingRight = (p % 2 === 0);
    // Добавляем случайный вылет (randomExtent), чтобы штрихи были разной длины
    const randomExtent = (Math.random() - 0.5) * jitter * 2.5;
    const targetX = isGoingRight ? (w + jitter + randomExtent) : (-jitter + randomExtent);

    const segments = 3;
    const stepX = (targetX - currentX) / segments;

    for (let i = 1; i <= segments; i++) {
      currentX += stepX;
      currentY = yPos + (Math.random() - 0.5) * jitter;
      d += `L ${currentX} ${currentY} `;
    }
  }
  return d;
}

function buildBoxScribble(w, h, passes, jitter) {
  let d = "";
  let x = -jitter / 2 + (Math.random() - 0.5) * jitter, y = -jitter / 2 + (Math.random() - 0.5) * jitter;
  d += `M ${x} ${y} `;

  for (let p = 0; p < passes; p++) {
    // Добавляем рандомный вылет и для длин сторон, чтобы углы "перехлестывались" по-разному
    // Верхняя грань
    x = w + jitter / 2 + (Math.random() - 0.5) * jitter; y = -jitter / 2 + (Math.random() - 0.5) * jitter;
    d += `L ${x} ${y} `;
    // Правая грань
    x = w + jitter / 2 + (Math.random() - 0.5) * jitter; y = h + jitter / 2 + (Math.random() - 0.5) * jitter;
    d += `L ${x} ${y} `;
    // Нижняя грань
    x = -jitter / 2 + (Math.random() - 0.5) * jitter; y = h + jitter / 2 + (Math.random() - 0.5) * jitter;
    d += `L ${x} ${y} `;
    // Левая грань
    x = -jitter / 2 + (Math.random() - 0.5) * jitter; y = -jitter / 2 + (Math.random() - 0.5) * jitter;
    d += `L ${x} ${y} `;
  }
  return d;
}

function buildHeartScribble(w, h, jitter) {
  const cx = w / 2, cy = h / 2;
  const s = Math.min(w, h) * 0.45;
  const j = () => (Math.random() - 0.5) * jitter;

  // Рисуем сердце из двух кривых Безье с небрежностью
  return `M ${cx + j()} ${cy + s * 0.7 + j()} 
          C ${cx - s * 1.2 + j()} ${cy - s * 0.5 + j()} ${cx + j()} ${cy - s * 1.1 + j()} ${cx + j()} ${cy - s * 0.2 + j()}
          M ${cx + j()} ${cy - s * 0.2 + j()}
          C ${cx + j()} ${cy - s * 1.1 + j()} ${cx + s * 1.2 + j()} ${cy - s * 0.5 + j()} ${cx + j()} ${cy + s * 0.7 + j()}`;
}

function buildStarScribble(w, h, jitter) {
  const cx = w / 2, cy = h / 2;
  const s = Math.min(w, h) * 0.45;
  const j = () => (Math.random() - 0.5) * jitter;
  const points = [];
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
    points.push({ x: cx + Math.cos(angle) * s + j(), y: cy + Math.sin(angle) * s + j() });
    const innerAngle = angle + Math.PI / 5;
    points.push({ x: cx + Math.cos(innerAngle) * s * 0.45 + j(), y: cy + Math.sin(innerAngle) * s * 0.45 + j() });
  }
  return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
}

function buildCircleScribble(w, h, jitter) {
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.45;
  const j = () => (Math.random() - 0.5) * jitter;

  const p1 = { x: cx, y: cy - r + j() };
  const p2 = { x: cx + r + j(), y: cy };
  const p3 = { x: cx, y: cy + r + j() };
  const p4 = { x: cx - r + j(), y: cy };

  const k = r * 0.55228;

  return `M ${p1.x} ${p1.y} 
          C ${p1.x + k + j()} ${p1.y + j()} ${p2.x + j()} ${p2.y - k + j()} ${p2.x} ${p2.y}
          C ${p2.x + j()} ${p2.y + k + j()} ${p3.x + k + j()} ${p3.y + j()} ${p3.x} ${p3.y}
          C ${p3.x - k + j()} ${p3.y + j()} ${p4.x + j()} ${p4.y + k + j()} ${p4.x} ${p4.y}
          C ${p4.x + j()} ${p4.y - k + j()} ${p1.x - k + j()} ${p1.y + j()} ${p1.x} ${p1.y}`;
}

// Contact letter form -> mailto
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".letter-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(form);

    const name = data.get("name") || "Unknown";
    const email = data.get("email") || "no email";
    const subject = data.get("subject") || "Portfolio contact";
    const message = data.get("message") || "";

    const body = [
      `From: ${name}`,
      `Contact: ${email}`,
      "",
      message
    ].join("\n");

    const mailto = `mailto:kolobokevgenij83@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  });
});
