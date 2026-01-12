import fetch from 'node-fetch';
import assert from 'assert';

// If API_BASE is set, use it and do NOT start an in-process server (useful for dockerized testing)
const EXTERNAL_BASE = process.env.API_BASE || '';
console.log('[E2E] EXTERNAL_BASE:', EXTERNAL_BASE);
let BASE = EXTERNAL_BASE;
if (!BASE) {
  // Start server in-process on a non-default port to avoid conflicts for local tests
  process.env.TEST_PORT = process.env.TEST_PORT || '4001';
  console.log('[E2E] No external base provided — starting local server');
  import('../src/server');
  BASE = `http://localhost:${process.env.TEST_PORT}`;
} else {
  console.log('[E2E] Using external API base:', BASE);
}

async function waitForHealth(timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return true;
    } catch (e) {
      // ignore
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server did not become healthy in time');
}

async function main() {
  console.log('[E2E] Waiting for server health...');
  await waitForHealth();
  console.log('[E2E] Server healthy');

  // Login as admin (offline seeded)
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@chaishorts.com', password: 'admin123' })
  });
  assert(loginRes.ok, 'Admin login failed');
  const loginJson = await loginRes.json();
  const token = loginJson.token;
  console.log('[E2E] Logged in as admin');

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // Create a temporary user
  const newUserPayload = { username: 'Temp Editor', email: `temp${Date.now()}@example.com`, password: 'tempPass123', role: 'editor' };
  const createUserRes = await fetch(`${BASE}/api/users`, { method: 'POST', headers: authHeaders, body: JSON.stringify(newUserPayload) });
  assert(createUserRes.status === 201, 'Create user failed');
  const createdUser = await createUserRes.json();
  console.log('[E2E] Created user', createdUser.email);

  // Delete the user
  const delRes = await fetch(`${BASE}/api/users/${createdUser.id}`, { method: 'DELETE', headers: authHeaders });
  assert(delRes.status === 204, 'Delete user failed');
  console.log('[E2E] Deleted user');

  // Create program
  const programPayload = { title: 'E2E Program', description: 'Testing program', language_primary: 'en', languages_available: ['en'], status: 'draft', topicIds: [] };
  const createProgRes = await fetch(`${BASE}/api/programs`, { method: 'POST', headers: authHeaders, body: JSON.stringify(programPayload) });
  assert(createProgRes.status === 201, 'Create program failed');
  const program = await createProgRes.json();
  console.log('[E2E] Created program', program.id);

  // Create term
  const termPayload = { term_number: 1, title: 'Term 1' };
  const createTermRes = await fetch(`${BASE}/api/programs/${program.id}/terms`, { method: 'POST', headers: authHeaders, body: JSON.stringify(termPayload) });
  assert(createTermRes.status === 201, 'Create term failed');
  const term = await createTermRes.json();
  console.log('[E2E] Created term', term.id);

  // Create scheduled lesson (publish_at in the past to trigger immediate publish)
  const past = new Date(Date.now() - 60 * 1000).toISOString();
  const lessonPayload = {
    term_id: term.id,
    lesson_number: 1,
    title: 'E2E Lesson',
    content_type: 'video',
    duration_ms: 60000,
    is_paid: false,
    content_language_primary: 'en',
    content_languages_available: ['en'],
    content_urls_by_language: { en: 'https://cdn.example.com/video.mp4' },
    subtitle_languages: [],
    subtitle_urls_by_language: {},
    status: 'scheduled',
    publish_at: past
  };

  const createLessonRes = await fetch(`${BASE}/api/terms/${term.id}/lessons`, { method: 'POST', headers: authHeaders, body: JSON.stringify(lessonPayload) });
  assert(createLessonRes.status === 201, 'Create lesson failed');
  const lesson = await createLessonRes.json();
  console.log('[E2E] Created lesson', lesson.id, 'status', lesson.status);

  // Simulate worker by calling in-process store worker (only works in offline mode)
  try {
    const store = await import('../store');
    // @ts-ignore
    if (store.db && typeof store.db.processScheduled === 'function') {
      // give server a moment to persist
      await new Promise(r => setTimeout(r, 500));
      // process scheduled
      // @ts-ignore
      store.db.processScheduled();
      console.log('[E2E] Invoked in-process scheduled processor');
    }
  } catch (e) {
    console.warn('[E2E] Could not invoke in-process worker:', e.message || e);
  }

  // Fetch lesson and confirm published
  const getLessonRes = await fetch(`${BASE}/api/lessons/${lesson.id}`, { headers: authHeaders });
  assert(getLessonRes.ok, 'Fetching lesson failed');
  const updatedLesson = await getLessonRes.json();
  console.log('[E2E] Lesson status after worker:', updatedLesson.status, 'published_at:', updatedLesson.published_at);
  assert(updatedLesson.status === 'published', 'Lesson was not published by worker');

  // Fetch public catalog - program should be published (auto-published when lesson published)
  const catalogRes = await fetch(`${BASE}/api/catalog/programs`);
  assert(catalogRes.ok, 'Fetching catalog failed');
  const catalog = await catalogRes.json();
  console.log('[E2E] Catalog items count:', catalog.items.length || catalog.length || 0);

  console.log('[E2E] All tests passed');
  process.exit(0);
}

main().catch(err => {
  console.error('[E2E] Test failed:', err);
  process.exit(1);
});
