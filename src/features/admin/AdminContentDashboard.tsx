import React, { useState, useEffect } from 'react';
import '../../admin.css';
import { Plus, Edit2, Trash2, UploadCloud, Save, X, Image as ImageIcon, Play, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { FitnessService, FitnessContent, FitnessCategory } from '../../services/FitnessService';
import { useToast } from '../../components/ui/ToastProvider';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';

export const AdminContentDashboard: React.FC = () => {
  const toast = useToast();
  const [contentList, setContentList] = useState<FitnessContent[]>([]);
  const [categories, setCategories] = useState<FitnessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FitnessContent>>({});
  const [contentToDelete, setContentToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contentToDelete) {
          e.preventDefault();
          setContentToDelete(null);
        } else if (isEditing) {
          e.preventDefault();
          setIsEditing(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contentToDelete, isEditing]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: contentData } = await supabase.from('fitness_content').select('*').order('created_at', { ascending: false });
      const { data: catData } = await supabase.from('fitness_categories').select('*');
      setContentList(contentData || []);
      setCategories(catData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const action = editForm.id ? 'update' : 'insert';
      
      const res = await fetch('/api/admin-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action, payload: editForm, table: 'fitness_content' })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save content');
      }

      setIsEditing(false);
      setEditForm({});
      toast.success('Saved', 'Content updated successfully.');
      loadData();
    } catch (err) {
      console.error('Save failed', err);
      toast.error('Save Failed', err instanceof Error ? err.message : 'Failed to save content.');
    }
  };

  const handleDelete = (id: string) => {
    triggerHapticLight();
    setContentToDelete(id);
  };

  const executeDelete = async (id: string) => {
    try {
      triggerHapticLight();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch('/api/admin-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: 'delete', payload: { id }, table: 'fitness_content' })
      });
      triggerHapticSuccess();
      toast.success('Deactivated', 'Content item has been successfully deactivated.');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Deactivation Failed', 'Failed to deactivate content item.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fitness-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('fitness-content').getPublicUrl(filePath);
      setEditForm({ ...editForm, cover_image_url: data.publicUrl });
      toast.success('Uploaded', 'Cover image uploaded successfully.');
    } catch (error) {
      console.error('Error uploading image: ', error);
      toast.error('Upload Failed', error instanceof Error ? error.message : 'Error uploading image to storage.');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading CMS...</div>;
  
    const getTypeColor = (type: string) => {
      switch(type) {
        case 'breathwork': return 'bg-teal-50 text-teal-600 border-teal-100';
        case 'meditation': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'soundscape': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        case 'article': return 'bg-blue-50 text-blue-600 border-blue-100';
        default: return 'bg-slate-50 text-slate-600 border-slate-100';
      }
    };

    return (
      <div className="relative min-h-screen bg-slate-50 font-sans pb-24 overflow-hidden">
        {/* Ambient Gradient Background for Glassmorphism */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/30 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200/30 blur-[120px] pointer-events-none" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-purple-200/20 blur-[100px] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto p-6 lg:p-10 relative z-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Content Studio</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Manage clinical protocols, therapeutic breathwork, and soundscapes</p>
          </div>
          <button 
            onClick={() => { setEditForm({ type: 'breathwork', difficulty: 'Beginner', is_active: true, equipment: [] }); setIsEditing(true); }}
            className="bg-slate-900 text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-300 font-semibold"
          >
            <Plus size={18} /> New Content
          </button>
        </div>
  
        {isEditing ? (
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100 p-8 transform transition-all">
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800">{editForm.id ? 'Edit Content' : 'Create Content'}</h2>
              <button onClick={() => setIsEditing(false)} className="p-2.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
  
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title</label>
                  <input 
                    type="text" 
                    value={editForm.title || ''}
                    onChange={e => setEditForm({...editForm, title: e.target.value})}
                    placeholder="e.g. 4-7-8 Vagal Tone Reset"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subtitle</label>
                  <input 
                    type="text" 
                    value={editForm.subtitle || ''}
                    onChange={e => setEditForm({...editForm, subtitle: e.target.value})}
                    placeholder="e.g. Parasympathetic Nervous System Modulation"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
  
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type</label>
                    <select 
                      value={editForm.type || 'breathwork'}
                      onChange={e => setEditForm({...editForm, type: e.target.value as any})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white appearance-none"
                    >
                      <option value="breathwork">Breathwork Protocol</option>
                      <option value="meditation">Meditation</option>
                      <option value="soundscape">Soundscape</option>
                      <option value="article">Clinical Article</option>
                    </select>
                  </div>
  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                    <select 
                      value={editForm.category_id || ''}
                      onChange={e => setEditForm({...editForm, category_id: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white appearance-none"
                    >
                      <option value="">Select Category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Difficulty</label>
                    <select 
                      value={editForm.difficulty || 'Beginner'}
                      onChange={e => setEditForm({...editForm, difficulty: e.target.value as any})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white appearance-none"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Athlete">Athlete</option>
                    </select>
                  </div>
                </div>
  
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Media URL (Video/Audio)</label>
                    <input 
                      type="text" 
                      value={editForm.video_url || editForm.audio_url || ''}
                      onChange={e => setEditForm({...editForm, video_url: e.target.value, audio_url: e.target.value})}
                      placeholder="https://..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duration (min)</label>
                    <input 
                      type="number" 
                      value={editForm.duration_minutes || ''}
                      onChange={e => setEditForm({...editForm, duration_minutes: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Calories</label>
                    <input 
                      type="number" 
                      value={editForm.calories_estimate || ''}
                      onChange={e => setEditForm({...editForm, calories_estimate: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
  
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                  <textarea 
                    value={editForm.description || ''}
                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl h-32 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                  />
                </div>
              </div>
  
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cover Image</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-3xl p-4 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden h-56 hover:bg-slate-100 transition-colors group">
                    {editForm.cover_image_url ? (
                      <>
                        <img src={editForm.cover_image_url} alt="Cover preview" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                          <label className="cursor-pointer bg-white text-slate-900 px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 shadow-lg hover:scale-105 transition-transform">
                            <UploadCloud size={18} /> Replace Image
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors w-full h-full">
                        <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <ImageIcon size={24} />
                        </div>
                        <span className="font-semibold text-sm text-slate-600">Upload Cover Image</span>
                        <span className="text-xs text-slate-400 mt-1">16:9 aspect ratio recommended</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={editForm.is_premium || false} onChange={e => setEditForm({...editForm, is_premium: e.target.checked})} className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5 border-slate-300 transition-all" />
                    <span className="text-sm font-semibold text-slate-700">Premium Content</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={editForm.is_featured || false} onChange={e => setEditForm({...editForm, is_featured: e.target.checked})} className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5 border-slate-300 transition-all" />
                    <span className="text-sm font-semibold text-slate-700">Featured (Hero)</span>
                  </label>
                </div>
              </div>
            </div>
  
            <div className="mt-10 flex justify-end gap-4 pt-6 border-t border-slate-100">
              <button onClick={() => setIsEditing(false)} className="px-6 py-3 rounded-full font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} className="px-6 py-3 rounded-full font-semibold text-white bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 flex items-center gap-2 transition-all">
                <Save size={18} /> Save Content
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* Header Row */}
            <div className="px-6 py-3 flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
               <div className="w-[45%]">Content</div>
               <div className="w-[20%]">Type</div>
               <div className="w-[15%]">Performance</div>
               <div className="w-[10%]">Status</div>
               <div className="w-[10%] text-right">Actions</div>
            </div>

            {/* List */}
            {contentList.map(content => (
              <div key={content.id} className="bg-white/40 backdrop-blur-xl rounded-[24px] p-4 flex items-center border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:bg-white/60 transition-all duration-300 group">
                
                {/* Content Info */}
                <div className="w-[45%] flex items-center gap-5">
                  {content.cover_image_url ? (
                    <img src={content.cover_image_url} alt="" className="w-20 h-20 rounded-[18px] object-cover bg-slate-50 shadow-sm" />
                  ) : (
                    <div className="w-20 h-20 rounded-[18px] bg-white/50 backdrop-blur-md flex items-center justify-center text-slate-300 border border-white/50 shadow-sm">
                      <ImageIcon size={28} />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-slate-900 text-lg mb-0.5 group-hover:text-emerald-600 transition-colors">{content.title}</div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                      <span>{content.difficulty}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>{content.duration_minutes} min</span>
                    </div>
                  </div>
                </div>

                {/* Type */}
                <div className="w-[20%]">
                  <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getTypeColor(content.type)}`}>
                    {content.type}
                  </span>
                </div>

                {/* Stats */}
                <div className="w-[15%] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                    <CheckCircle size={15} className="text-emerald-500" />
                    {content.completed_count || 0} <span className="text-slate-400 font-medium text-xs">done</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                    <Play size={15} className="text-blue-500 ml-0.5" />
                    {content.started_count || 0} <span className="text-slate-400 font-medium text-xs">plays</span>
                  </div>
                </div>

                {/* Status */}
                <div className="w-[10%]">
                  {content.is_active ? (
                    <span className="inline-flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1.5 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-slate-500 text-sm font-bold bg-slate-100 px-3 py-1.5 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span> Draft
                    </span>
                  )}
                </div>

                {/* Actions - Always Visible but gentle */}
                <div className="w-[10%] flex items-center justify-end gap-2 pr-4">
                  <button onClick={() => { setEditForm(content); setIsEditing(true); }} className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-50 bg-slate-50 transition-colors" title="Edit">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(content.id)} className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-red-600 rounded-full hover:bg-red-50 bg-slate-50 transition-colors" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>

              </div>
            ))}
            
            {contentList.length === 0 && (
              <div className="text-center py-24 bg-white rounded-[32px] border border-slate-100 border-dashed">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-300">
                  <ImageIcon size={36} />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Your studio is empty</h3>
                <p className="text-slate-500 font-medium">Click "New Content" to publish your first program.</p>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Deactivation Confirmation Modal */}
        {contentToDelete && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Deactivate Content Confirmation"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '20px'
            }}
            onClick={() => setContentToDelete(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Deactivate Content"
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: '28px',
                maxWidth: '420px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                border: '1px solid #E2E8F0'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Trash2 size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
                Deactivate Content
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: '0 0 24px' }}>
                Are you sure you want to deactivate this content item? It will be safely archived from patient dashboards.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setContentToDelete(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (contentToDelete) {
                      executeDelete(contentToDelete);
                      setContentToDelete(null);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    background: '#EF4444',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
