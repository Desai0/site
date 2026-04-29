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
});

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
        g.setAttribute("transform", `translate(${w/2}, ${h/2}) skewX(${angle}) rotate(-2) translate(${-w/2}, ${-h/2})`);
        
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
        g.setAttribute("transform", `translate(${w/2}, ${h/2}) rotate(${angle}) translate(${-w/2}, ${-h/2})`);
        const pathD = buildHorizontalScribble(w, h, passes, jitter);
        const path = createPath(pathD, color, strokeWidth, 1);
        g.appendChild(path);
    } else if (type === 'box') {
        g.setAttribute("transform", `translate(${w/2}, ${h/2}) rotate(${angle}) translate(${-w/2}, ${-h/2})`);
        const pathD = buildBoxScribble(w, h, passes, jitter);
        const path = createPath(pathD, color, strokeWidth, 1);
        g.appendChild(path);
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
    let x = -jitter/2 + (Math.random()-0.5)*jitter, y = -jitter/2 + (Math.random()-0.5)*jitter;
    d += `M ${x} ${y} `;
    
    for (let p = 0; p < passes; p++) {
        // Добавляем рандомный вылет и для длин сторон, чтобы углы "перехлестывались" по-разному
        // Верхняя грань
        x = w + jitter/2 + (Math.random()-0.5)*jitter; y = -jitter/2 + (Math.random()-0.5)*jitter;
        d += `L ${x} ${y} `;
        // Правая грань
        x = w + jitter/2 + (Math.random()-0.5)*jitter; y = h + jitter/2 + (Math.random()-0.5)*jitter;
        d += `L ${x} ${y} `;
        // Нижняя грань
        x = -jitter/2 + (Math.random()-0.5)*jitter; y = h + jitter/2 + (Math.random()-0.5)*jitter;
        d += `L ${x} ${y} `;
        // Левая грань
        x = -jitter/2 + (Math.random()-0.5)*jitter; y = -jitter/2 + (Math.random()-0.5)*jitter;
        d += `L ${x} ${y} `;
    }
    return d;
}
