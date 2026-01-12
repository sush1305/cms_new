import React, { useState, useEffect } from 'react';
import { Lesson, Status, ContentType, Role, Asset, AssetVariant, AssetType } from '../types';
import { api } from '../api';

interface LessonEditorProps {
  id: string;
  onBack: () => void;
  role: Role;
}

const LessonEditor: React.FC<LessonEditorProps> = ({ id, onBack, role }) => {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleMinutes, setScheduleMinutes] = useState('2');

  useEffect(() => {
    loadAssets();
  }, [id]);

  const loadAssets = async () => {
    try {
      const asts = await api.getAssets(id);
      setAssets(asts);
    } catch (err) {
      console.error('Failed to load assets', err);
    }
  };

  useEffect(() => {
    loadLesson();
  }, [id]);

  const loadLesson = async () => {
    try {
      const data = await api.getLesson(id);
      setLesson(data);
    } catch (error) {
      setError('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lesson) return;
    setSaving(true);
    try {
      await api.updateLesson(id, lesson);
      setError('');
    } catch (error) {
      setError('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const handleSchedulePublish = async () => {
    if (!lesson || !scheduleMinutes || isNaN(Number(scheduleMinutes))) return;
    const publishDate = new Date();
    publishDate.setMinutes(publishDate.getMinutes() + Number(scheduleMinutes));
    
    const updatedLesson = {
      ...lesson,
      status: Status.SCHEDULED,
      publish_at: publishDate.toISOString()
    };
    setLesson(updatedLesson);
    setScheduleModalOpen(false);
    
    // Save immediately
    setSaving(true);
    try {
      await api.updateLesson(id, updatedLesson);
      setError('');
    } catch (error) {
      setError('Failed to schedule lesson');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishNow = async () => {
    if (!lesson) return;
    const now = new Date().toISOString();
    
    const updatedLesson = {
      ...lesson,
      status: Status.PUBLISHED,
      publish_at: now,
      published_at: now
    };
    setLesson(updatedLesson);
    
    // Save immediately
    setSaving(true);
    try {
      await api.updateLesson(id, updatedLesson);
      setError('');
    } catch (error) {
      setError('Failed to publish lesson');
    } finally {
      setSaving(false);
    }
  };

  if (role === Role.VIEWER) {
    return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Access Denied</div>;
  }

  if (loading) {
    return <div className="p-20 text-center"><div className="animate-spin h-8 w-8 border-4 border-amber-400 border-t-transparent rounded-full mx-auto"></div></div>;
  }

  if (!lesson) {
    return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Lesson not found</div>;
  }

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
        <button onClick={onBack} className="hover:text-amber-600 transition-colors">Program</button>
        <span>/</span>
        <span className="text-slate-900">Edit Lesson</span>
      </nav>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Edit Lesson</h1>
          <p className="text-slate-500 mt-2 font-medium">Configure lesson details and publishing schedule.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-black text-amber-400 hover:bg-slate-800 font-black py-4 px-8 rounded-2xl shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center space-x-3 disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            )}
            <span className="text-xs uppercase tracking-widest">Save Changes</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 p-5 rounded-3xl text-xs font-black border border-red-100 text-center uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-12 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lesson Title</label>
                <input
                  type="text"
                  value={lesson.title}
                  onChange={(e) => setLesson({...lesson, title: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all uppercase tracking-tight"
                  aria-label="Lesson Title"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content Type</label>
                <select
                  value={lesson.content_type}
                  onChange={(e) => setLesson({...lesson, content_type: e.target.value as ContentType})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all"
                  aria-label="Content Type"
                >
                  {Object.values(ContentType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select
                  value={lesson.status}
                  onChange={(e) => setLesson({...lesson, status: e.target.value as Status})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all"
                  aria-label="Status"
                >
                  {Object.values(Status).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Language</label>
                <input
                  type="text"
                  value={lesson.content_language_primary}
                  onChange={(e) => setLesson({...lesson, content_language_primary: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all"
                  aria-label="Primary Language"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Available Languages</label>
                <input
                  type="text"
                  value={(lesson.content_languages_available || []).join(', ')}
                  onChange={(e) => setLesson({...lesson, content_languages_available: e.target.value.split(',').map(s => s.trim())})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all"
                  placeholder="e.g., en, hi"
                />
              </div>
              <div className="space-y-3">
                <label htmlFor="is-paid" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Is Paid Content</label>
                <input
                  id="is-paid"
                  type="checkbox"
                  checked={lesson.is_paid}
                  onChange={(e) => setLesson({...lesson, is_paid: e.target.checked})}
                  className="w-6 h-6 text-amber-400 bg-slate-50 border-2 border-slate-100 rounded focus:ring-amber-400 focus:ring-2"
                  aria-label="Is Paid Content"
                  title="Is Paid Content"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Content URLs</h3>
            {(lesson.content_languages_available || []).map(lang => (
              <div key={lang} className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{lang.toUpperCase()} URL</label>
                <input
                  type="url"
                  value={(lesson.content_urls_by_language || {})[lang] || ''}
                  onChange={(e) => setLesson({
                    ...lesson,
                    content_urls_by_language: {
                      ...(lesson.content_urls_by_language || {}),
                      [lang]: e.target.value
                    }
                  })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 focus:bg-white focus:border-amber-400 outline-none font-bold text-slate-800"
                  aria-label={`${lang.toUpperCase()} URL`}
                />
              </div>
            ))}

            <div className="pt-6">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Thumbnails</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                {[AssetVariant.PORTRAIT, AssetVariant.LANDSCAPE].map(variant => {
                  const asset = assets.find(a => a.variant === variant && a.asset_type === AssetType.THUMBNAIL);
                  return (
                    <div key={variant} className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{variant}</label>
                      <div className="aspect-[3/4] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.25rem] overflow-hidden flex items-center justify-center">
                        {asset ? (
                          <img src={asset.url} alt={variant} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-slate-300 text-[10px] font-black uppercase tracking-widest">Missing</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={async () => {
                          const url = prompt('Thumbnail URL:', asset?.url || '');
                          if (url === null) return;
                          try {
                            await api.createAsset({ parent_id: id, language: lesson.content_language_primary, variant, asset_type: AssetType.THUMBNAIL, url });
                            alert('Thumbnail updated');
                            loadAssets();
                          } catch (err) {
                            setError('Failed to update thumbnail');
                          }
                        }} className="bg-amber-400 text-black py-2 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Link Thumbnail</button>
                        {asset && (
                          <span className="text-[10px] font-black text-slate-400">{asset.url}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-8 border-t border-slate-200">
            <button
              onClick={() => setScheduleModalOpen(true)}
              className="flex-1 bg-amber-400 text-black hover:bg-amber-500 font-black py-4 px-8 rounded-2xl transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase text-sm tracking-widest"
            >
              📅 Schedule Publish
            </button>
            <button
              onClick={handlePublishNow}
              className="flex-1 bg-green-500 text-white hover:bg-green-600 font-black py-4 px-8 rounded-2xl transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase text-sm tracking-widest"
            >
              Publish Now
            </button>
          </div>
        </div>
      </div>

      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6 uppercase tracking-tight text-slate-900">Schedule Publish</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Minutes from now</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter minutes"
                  value={scheduleMinutes}
                  onChange={(e) => setScheduleMinutes(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-amber-400 outline-none font-bold"
                />
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-sm text-slate-700 font-bold">
                Will publish at: <span className="font-black">{new Date(new Date().getTime() + Number(scheduleMinutes || 0) * 60000).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={handleSchedulePublish} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all">
                Schedule
              </button>
              <button onClick={() => setScheduleModalOpen(false)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-black px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonEditor;
