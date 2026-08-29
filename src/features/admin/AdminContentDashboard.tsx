import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UploadCloud, Save, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { FitnessService, FitnessContent, FitnessCategory } from '../../services/FitnessService';

export const AdminContentDashboard: React.FC = () => {
  const [contentList, setContentList] = useState<FitnessContent[]>([]);
  const [categories, setCategories] = useState<FitnessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FitnessContent>>({});

  useEffect(() => {
    loadData();
  }, []);

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
      loadData();
    } catch (err) {
      console.error('Save failed', err);
      alert('Save failed. See console.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this content?')) return;
    try {
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
      loadData();
    } catch (err) {
      console.error(err);
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
    } catch (error) {
      console.error('Error uploading image: ', error);
      alert('Upload failed');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading CMS...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Management</h1>
          <p className="text-slate-500 text-sm">Manage fitness, meditations, and sports programs</p>
        </div>
        <button 
          onClick={() => { setEditForm({ type: 'workout', difficulty: 'Beginner', is_active: true, equipment: [] }); setIsEditing(true); }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700"
        >
          <Plus size={18} /> New Content
        </button>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-semibold">{editForm.id ? 'Edit Content' : 'Create Content'}</h2>
            <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={editForm.title || ''}
                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="e.g. 5-Min Fat Torch"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
                <input 
                  type="text" 
                  value={editForm.subtitle || ''}
                  onChange={e => setEditForm({...editForm, subtitle: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select 
                    value={editForm.type || 'workout'}
                    onChange={e => setEditForm({...editForm, type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="workout">Workout</option>
                    <option value="meditation">Meditation</option>
                    <option value="soundscape">Soundscape</option>
                    <option value="article">Article</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select 
                    value={editForm.category_id || ''}
                    onChange={e => setEditForm({...editForm, category_id: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="">Select Category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                  <select 
                    value={editForm.difficulty || 'Beginner'}
                    onChange={e => setEditForm({...editForm, difficulty: e.target.value as any})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Athlete">Athlete</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Media URL (Video/Audio)</label>
                  <input 
                    type="text" 
                    value={editForm.video_url || editForm.audio_url || ''}
                    onChange={e => setEditForm({...editForm, video_url: e.target.value, audio_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
                  <input 
                    type="number" 
                    value={editForm.duration_minutes || ''}
                    onChange={e => setEditForm({...editForm, duration_minutes: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Calories</label>
                  <input 
                    type="number" 
                    value={editForm.calories_estimate || ''}
                    onChange={e => setEditForm({...editForm, calories_estimate: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  value={editForm.description || ''}
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg h-32 outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cover Image</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden h-48">
                  {editForm.cover_image_url ? (
                    <>
                      <img src={editForm.cover_image_url} alt="Cover preview" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <label className="cursor-pointer bg-white text-slate-900 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                          <UploadCloud size={16} /> Replace Image
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center text-slate-500 hover:text-emerald-600 transition-colors">
                      <ImageIcon size={32} className="mb-2" />
                      <span className="font-medium text-sm">Upload Cover Image</span>
                      <span className="text-xs text-slate-400 mt-1">16:9 recommended</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.is_premium || false} onChange={e => setEditForm({...editForm, is_premium: e.target.checked})} className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5 border-slate-300" />
                  <span className="text-sm font-medium text-slate-700">Premium Content</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.is_featured || false} onChange={e => setEditForm({...editForm, is_featured: e.target.checked})} className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5 border-slate-300" />
                  <span className="text-sm font-medium text-slate-700">Featured (Hero)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setIsEditing(false)} className="px-5 py-2 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">
              Cancel
            </button>
            <button onClick={handleSave} className="px-5 py-2 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
              <Save size={18} /> Save Content
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Content</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Stats</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {contentList.map(content => (
                <tr key={content.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {content.cover_image_url ? (
                        <img src={content.cover_image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-900">{content.title}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{content.difficulty} • {content.duration_minutes} min</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                      {content.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900 font-medium">{content.completed_count || 0} <span className="text-slate-400 font-normal">completes</span></div>
                    <div className="text-slate-500 text-xs mt-0.5">{content.started_count || 0} starts</div>
                  </td>
                  <td className="px-6 py-4">
                    {content.is_active ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Draft
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditForm(content); setIsEditing(true); }} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(content.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {contentList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No content found. Click "New Content" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
