'use strict';

// Основная функция, которая запустится после загрузки страницы
document.addEventListener('DOMContentLoaded', function () {
    initProgressBar();
    initScrollToTop();
    initComments();
});

/* ПРОГРЕСС ИНДИКАТОР ЧТЕНИЯ */
function initProgressBar() {
    let progressBar = document.getElementById('progressBar');
    if (!progressBar) return;

    window.addEventListener('scroll', function () {
        // Сколько прокрутили сверху
        let scrolled = document.documentElement.scrollTop;
        // Общая высота страницы минус высота окна
        let totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

        if (totalHeight > 0) {
            let percentage = (scrolled / totalHeight) * 100;
            progressBar.style.width = percentage + '%';
        }
    });
}

/* КНОПКА ВОЗВРАТА НАВЕРХ */
function initScrollToTop() {
    let btn = document.getElementById('scrollTopBtn');
    if (!btn) return;

    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            btn.style.opacity = '1';
            btn.style.visibility = 'visible';
            btn.style.transform = 'translateY(0)';
        } else {
            btn.style.opacity = '0';
            btn.style.visibility = 'hidden';
            btn.style.transform = 'translateY(20px)';
        }
    });

    // Возврат в начало по клику
    btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* СИСТЕМА КОММЕНТАРИЕВ */
function initComments() {
    let commentsList = document.getElementById('commentsList');
    let commentsCountEl = document.getElementById('commentsCount');
    let submitBtn = document.querySelector('#commentForm .btn-primary');

    if (!commentsList || !submitBtn) return;

    let nameInput = document.getElementById('commentName');
    let textInput = document.getElementById('commentText');
    let nameError = document.getElementById('nameError');
    let textError = document.getElementById('textError');

    let totalCommentsCount = 0;

    let initialComments = [
        {
            name: "Александр",
            text: "Отличная статья! Всегда интересовало, как работает ChromaSync под капотом.",
            date: "14.03.2026, 15:30",
            likes: 5
        },
        {
            name: "Мария",
            text: "Zen Mode это просто находка, спасибо за разработку.",
            date: "15.03.2026, 09:15",
            likes: 2
        }
    ];

    // Рендер стартовых комментариев
    for (let i = 0; i < initialComments.length; i++) {
        createCommentElement(initialComments[i].name, initialComments[i].text, initialComments[i].date, initialComments[i].likes);
    }

    // Обработка кнопки "Отправить"
    submitBtn.addEventListener('click', function (event) {
        // Отменяем стандартную отправку формы
        event.preventDefault();

        let isValid = true;
        let nameValue = nameInput.value.trim();
        let textValue = textInput.value.trim();

        // Проверка имени
        if (nameValue.length < 2) {
            nameError.style.display = 'block';
            isValid = false;
        } else {
            nameError.style.display = 'none';
        }

        // Проверка текста
        if (textValue.length === 0) {
            textError.style.display = 'block';
            isValid = false;
        } else {
            textError.style.display = 'none';
        }

        // Если все правильно, добавляем комментарий
        if (isValid) {
            let now = new Date();
            let dateString = now.toLocaleDateString() + ', ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            createCommentElement(nameValue, textValue, dateString, 0);

            nameInput.value = '';
            textInput.value = '';
        }
    });

    // Функция создания верстки одного комментария
    function createCommentElement(authorName, textContent, dateStr, initialLikes) {
        let commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';

        commentDiv.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">` + authorName + `</span>
                <span class="comment-date">` + dateStr + `</span>
            </div>
            <div class="comment-text">` + textContent + `</div>
            <div class="comment-footer">
                <button class="like-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="like-icon">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span class="like-count">` + initialLikes + `</span>
                </button>
                <button class="like-btn" style="color:var(--text-dim);">Ответить</button>
            </div>
        `;

        let likeBtn = commentDiv.querySelector('.like-btn');
        let likeIcon = commentDiv.querySelector('.like-icon');
        let likeCountSpan = commentDiv.querySelector('.like-count');
        let currentLikes = initialLikes;

        likeBtn.addEventListener('click', function () {
            currentLikes = currentLikes + 1;
            likeCountSpan.textContent = currentLikes;
            likeBtn.style.color = "var(--accent2)";
            likeIcon.style.fill = "var(--accent2)";
            likeIcon.style.stroke = "var(--accent2)";
        });

        commentsList.insertBefore(commentDiv, commentsList.firstChild);

        totalCommentsCount = totalCommentsCount + 1;
        if (commentsCountEl) {
            commentsCountEl.textContent = totalCommentsCount;
        }
    }
}
