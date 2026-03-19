'use strict';

/* ДАННЫЕ И ПАЛИТРЫ */
const PALETTES = [
  { from: '162, 89, 255', to: '255, 107, 107', name: 'Violet Night' },
  { from: '0, 180, 216', to: '72, 202, 228', name: 'Ocean Drift' },
  { from: '255, 107, 107', to: '255, 193, 7', name: 'Sunset Pulse' },
];

let currentPaletteIndex = 0;
let isPlaying = true;
let trackTimer = null;

/* ФОНОВЫЙ КАНВАС */
const canvas = document.getElementById('chromaCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];
let time = 0;

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Создаем простые частицы-кружочки
function initParticles() {
  particles = [];
  if (!canvas) return;
  let count = window.innerWidth > 800 ? 50 : 20;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.1
    });
  }
}

// Отрисовка каждого кадра
function drawFrame() {
  if (!ctx || !canvas) return;

  ctx.fillStyle = 'rgba(8, 8, 16, 1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let currentColors = PALETTES[currentPaletteIndex];

  // большие размытые пятна
  let gradient1 = ctx.createRadialGradient(canvas.width * 0.2, canvas.height * 0.3, 0, canvas.width * 0.2, canvas.height * 0.3, 400);
  gradient1.addColorStop(0, `rgba(${currentColors.from}, 0.15)`);
  gradient1.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient1;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let gradient2 = ctx.createRadialGradient(canvas.width * 0.8, canvas.height * 0.7, 0, canvas.width * 0.8, canvas.height * 0.7, 400);
  gradient2.addColorStop(0, `rgba(${currentColors.to}, 0.15)`);
  gradient2.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient2;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // частицы
  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    p.x += p.speedX;
    p.y += p.speedY;

    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${currentColors.from}, ${p.opacity})`;
    ctx.fill();
  }

  requestAnimationFrame(drawFrame);
}


/* ЛОГИКА СМЕНЫ ЦВЕТОВ И ПЛЕЕРА */
function updateColors() {
  let colors = PALETTES[currentPaletteIndex];

  // главные CSS-переменные
  document.documentElement.style.setProperty('--accent', `rgb(${colors.from})`);
  document.documentElement.style.setProperty('--accent2', `rgb(${colors.to})`);

  // плеер-превью
  const grad = document.getElementById('albumGradient');
  if (grad) grad.style.background = `linear-gradient(135deg, rgb(${colors.from}) 0%, rgb(${colors.to}) 100%)`;

  const playBtn = document.getElementById('playBtn');
  if (playBtn) {
    playBtn.style.background = `rgb(${colors.from})`;
    playBtn.style.borderColor = `rgb(${colors.from})`;
  }
}

function nextTrack() {
  currentPaletteIndex = (currentPaletteIndex + 1) % PALETTES.length;
  updateColors();
}

function prevTrack() {
  currentPaletteIndex = (currentPaletteIndex - 1 + PALETTES.length) % PALETTES.length;
  updateColors();
}

function togglePlay() {
  isPlaying = !isPlaying;
  let playBtn = document.getElementById('playBtn');
  if (playBtn) {
    playBtn.textContent = isPlaying ? '▶' : '⏸';
  }

  clearInterval(trackTimer);
  if (isPlaying) {
    trackTimer = setInterval(nextTrack, 5000);
  }
}


/* АНИМАЦИЯ ПЕЧАТАЮЩЕГОСЯ ТЕКСТА */
const phrases = ['System programmer', 'AI enthusiast', 'C++ & JS developer', 'ChromaSync creator'];
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeWriter() {
  const typedEl = document.getElementById('typedText');
  if (!typedEl) return;

  let currentPhrase = phrases[phraseIndex];

  if (isDeleting) {
    // Удаляем по одному символу
    typedEl.textContent = currentPhrase.substring(0, charIndex - 1);
    charIndex--;
  } else {
    // Печатаем по одному символу
    typedEl.textContent = currentPhrase.substring(0, charIndex + 1);
    charIndex++;
  }

  // Логика переключения состояний
  let delay = 100;

  if (!isDeleting && charIndex === currentPhrase.length) {
    delay = 2000;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    delay = 500;
  } else if (isDeleting) {
    // Скорость стирания
    delay = 50;
  }

  setTimeout(typeWriter, delay);
}


/* ФИЛЬТРАЦИЯ ПРОЕКТОВ */
function initProjectFilter() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  // Перебираем все кнопки фильтра
  for (let i = 0; i < filterButtons.length; i++) {
    let btn = filterButtons[i];

    btn.addEventListener('click', function () {
      // Убираем класс 'active' у всех кнопок и даем только нажатой
      for (let j = 0; j < filterButtons.length; j++) {
        filterButtons[j].classList.remove('active');
      }
      btn.classList.add('active');

      // Получаем категорию, которую нужно показать
      let category = btn.getAttribute('data-filter');

      // Проходим по всем карточкам проектов
      for (let k = 0; k < projectCards.length; k++) {
        let card = projectCards[k];
        let cardCategory = card.getAttribute('data-category');

        if (category === 'all' || category === cardCategory) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      }
    });
  }
}


/* ПОЯВЛЕНИЕ ЭЛЕМЕНТОВ ПРИ ПРОКРУТКЕ */
function initScrollReveal() {
  const elementsToReveal = document.querySelectorAll('.reveal');

  // Функция, которая проверяет, виден ли элемент на экране
  function checkReveal() {
    let windowHeight = window.innerHeight;

    for (let i = 0; i < elementsToReveal.length; i++) {
      let element = elementsToReveal[i];
      // Получаем позицию элемента относительно окна
      let positionFromTop = element.getBoundingClientRect().top;

      // Если элемент дошел до видимой зоны - добавляем класс visible
      if (positionFromTop - windowHeight <= -100) {
        element.classList.add('visible');
      }
    }
  }

  // Проверяем элементы при прокрутке и один раз при загрузке
  window.addEventListener('scroll', checkReveal);
  checkReveal();
}


/* ИНИЦИАЛИЗАЦИЯ */
document.addEventListener('DOMContentLoaded', function () {
  // 1. Настраиваем канвас
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  initParticles();
  if (canvas) {
    requestAnimationFrame(drawFrame);
  }

  // 2. Настраиваем плеер
  let btnNext = document.getElementById('nextBtn');
  let btnPrev = document.getElementById('prevBtn');
  let btnPlay = document.getElementById('playBtn');

  if (btnNext) btnNext.addEventListener('click', nextTrack);
  if (btnPrev) btnPrev.addEventListener('click', prevTrack);
  if (btnPlay) btnPlay.addEventListener('click', togglePlay);

  updateColors();
  trackTimer = setInterval(nextTrack, 5000);

  // текст и другие скрипты
  typeWriter();
  initProjectFilter();
  initScrollReveal();

  // затемнение меню при скролле
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
});
