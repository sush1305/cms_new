import assert from 'assert';

import { db as store } from '../store';
import * as dbModule from '../src/db';

async function testWorkerProcessScheduled() {
  console.log('[Unit] testWorkerProcessScheduled');

  // Create program, term, scheduled lesson
  const prog = store.createProgram({ title: 'UT Program', description: 'u', language_primary: 'en' } as any);
  const term = store.createTerm({ program_id: prog.id, term_number: 1, title: 'T1' } as any);

  const lesson = store.createLesson({
    term_id: term.id,
    lesson_number: 1,
    title: 'Sched',
    content_type: 'video',
    duration_ms: 1000,
    is_paid: false,
    content_language_primary: 'en',
    content_languages_available: ['en'],
    content_urls_by_language: { en: 'u' },
    subtitle_languages: [],
    subtitle_urls_by_language: {},
    status: 'scheduled',
    publish_at: new Date(Date.now() - 1000).toISOString()
  } as any);

  // Ensure scheduled initially
  assert(lesson.status === 'scheduled');

  // Run processScheduled
  store.processScheduled();

  const updated = store.getLesson(lesson.id)!;
  assert(updated.status === 'published', 'Lesson should be published');
  assert(!!updated.published_at, 'published_at must be set');

  const updatedProgram = store.getProgram(prog.id)!;
  assert(updatedProgram.status === 'published', 'Program should be auto-published');

  console.log('[Unit] testWorkerProcessScheduled passed');
}

async function testDbPublishOffline() {
  console.log('[Unit] testDbPublishOffline');
  // Force db module into offline mode via exported setter
  (dbModule as any).setOffline(true);

  // Create program/term/lesson via store so db functions operate on store
  const prog = store.createProgram({ title: 'DBProg', description: '', language_primary: 'en' } as any);
  const term = store.createTerm({ program_id: prog.id, term_number: 2, title: 'T2' } as any);
  const lesson = store.createLesson({
    term_id: term.id,
    lesson_number: 1,
    title: 'L2',
    content_type: 'article',
    duration_ms: 0,
    is_paid: false,
    content_language_primary: 'en',
    content_languages_available: ['en'],
    content_urls_by_language: { en: 'u' },
    status: 'scheduled',
    publish_at: new Date(Date.now() - 1000).toISOString()
  } as any);

  // Call db.publishLesson
  const res = await dbModule.publishLesson(lesson.id);
  assert(res === true, 'publishLesson should return true');

  const updated = store.getLesson(lesson.id)!;
  assert(updated.status === 'published', 'db.publishLesson should mark published');

  console.log('[Unit] testDbPublishOffline passed');
}

async function run() {
  await testWorkerProcessScheduled();
  await testDbPublishOffline();
  console.log('[Unit] All unit tests passed');
}

run().catch(err => {
  console.error('[Unit] Tests failed', err);
  process.exit(1);
});
