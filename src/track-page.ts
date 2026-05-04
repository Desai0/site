const SUBMIT_ENDPOINT = '/api/tracks/submit';
const LOOKUP_ENDPOINT_BASE = '/api/tracks';

const submitForm = document.querySelector('.track-submit-form') as HTMLFormElement | null;
const lookupForm = document.querySelector('.track-lookup-form') as HTMLFormElement | null;

if (submitForm) {
  submitForm.addEventListener('submit', handleSubmitRequest);
}

if (lookupForm) {
  lookupForm.addEventListener('submit', handleLookupRequest);
}

async function handleSubmitRequest(event: SubmitEvent) {
  event.preventDefault();

  const form = event.currentTarget as HTMLFormElement;
  const statusBox = form.querySelector('[data-role="submit-status"]') as HTMLDivElement | null;
  const formData = new FormData(form);

  const payload = {
    title: String(formData.get('title') || '').trim(),
    artist: String(formData.get('artist') || '').trim(),
    sourceLink: String(formData.get('sourceLink') || '').trim(),
  };

  setStatus(statusBox, 'Отправка заявки на сервер...', 'pending');

  try {
    const response = await fetch(SUBMIT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(extractError(data, `Server returned ${response.status}`));
    }

    const trackId = data?.id ?? data?.trackId ?? 'unknown';
    setStatus(
      statusBox,
      `Заявка принята. Track id: ${trackId}. Сервер теперь может искать download link.`,
      'success'
    );
    form.reset();
  } catch (error) {
    setStatus(
      statusBox,
      `Не удалось отправить заявку: ${getErrorMessage(error)}.`,
      'error'
    );
  }
}

async function handleLookupRequest(event: SubmitEvent) {
  event.preventDefault();

  const form = event.currentTarget as HTMLFormElement;
  const statusBox = form.querySelector('[data-role="lookup-status"]') as HTMLDivElement | null;
  const resultCard = form.querySelector('[data-role="lookup-result"]') as HTMLElement | null;
  const formData = new FormData(form);
  const trackId = String(formData.get('trackId') || '').trim();

  if (!trackId) {
    setStatus(statusBox, 'Нужно указать id трека.', 'error');
    if (resultCard) {
      resultCard.hidden = true;
    }
    return;
  }

  setStatus(statusBox, `Запрос трека #${trackId}...`, 'pending');

  try {
    const response = await fetch(`${LOOKUP_ENDPOINT_BASE}/${encodeURIComponent(trackId)}`);
    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(extractError(data, `Server returned ${response.status}`));
    }

    renderLookupResult(form, data);
    if (resultCard) {
      resultCard.hidden = false;
    }
    setStatus(statusBox, `Трек #${trackId} загружен из backend.`, 'success');
  } catch (error) {
    if (resultCard) {
      resultCard.hidden = true;
    }
    setStatus(
      statusBox,
      `Не удалось получить ссылку: ${getErrorMessage(error)}.`,
      'error'
    );
  }
}

function renderLookupResult(form: HTMLFormElement, data: Record<string, unknown>) {
  setText(form, 'id', String(data.id ?? data.trackId ?? '-'));
  setText(form, 'title', String(data.title ?? data.trackTitle ?? '-'));
  setText(form, 'artist', String(data.artist ?? '-'));
  setText(form, 'status', String(data.status ?? 'ready'));

  const downloadUrl = String(data.downloadUrl ?? data.link ?? data.url ?? '');
  const downloadLink = form.querySelector('[data-field="downloadUrl"]') as HTMLAnchorElement | null;

  if (!downloadLink) {
    return;
  }

  if (!downloadUrl) {
    downloadLink.removeAttribute('href');
    downloadLink.textContent = 'not available';
    return;
  }

  downloadLink.href = downloadUrl;
  downloadLink.textContent = downloadUrl;
}

function setText(form: HTMLFormElement, field: string, value: string) {
  const node = form.querySelector(`[data-field="${field}"]`);
  if (node) {
    node.textContent = value;
  }
}

function setStatus(
  element: HTMLDivElement | null,
  message: string,
  state: 'pending' | 'success' | 'error'
) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.dataset.state = state;
}

async function readJson(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
}

function extractError(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const message = (data as { error?: unknown; message?: unknown }).error
    ?? (data as { error?: unknown; message?: unknown }).message;

  return typeof message === 'string' && message.trim() ? message : fallback;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
}
