import React, { useState, useMemo, useEffect } from 'react';
import { Plus, ExternalLink, Edit2, Trash2, ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import { SavedLink } from '../../types';

const STORAGE_KEY = 'ledger_important_links';
const CATEGORIES = ['Work', 'Finance', 'Personal', 'Shopping', 'Other'];

function loadLinks(): SavedLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLinks(links: SavedLink[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function LinksView() {
  const [links, setLinks] = useState<SavedLink[]>(loadLinks);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formError, setFormError] = useState('');

  useEffect(() => { saveLinks(links); }, [links]);

  const filtered = useMemo<SavedLink[]>(() => {
    const q = search.toLowerCase();
    return q
      ? links.filter(l => l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q))
      : links;
  }, [links, search]);

  const grouped = useMemo<Record<string, SavedLink[]>>(() => {
    const map: Record<string, SavedLink[]> = {};
    for (const cat of CATEGORIES) {
      const items = filtered.filter(l => l.category === cat);
      if (items.length > 0) map[cat] = items;
    }
    const knownSet = new Set<string>(CATEGORIES);
    const otherCats = Array.from(new Set<string>(filtered.map(l => l.category))).filter(c => !knownSet.has(c));
    for (const cat of otherCats) {
      map[cat] = filtered.filter(l => l.category === cat);
    }
    return map;
  }, [filtered]);

  const openAdd = () => {
    setEditingId(null);
    setFormTitle('');
    setFormUrl('');
    setFormCategory(CATEGORIES[0]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (link: SavedLink) => {
    setEditingId(link.id);
    setFormTitle(link.title);
    setFormUrl(link.url);
    setFormCategory(link.category);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formTitle.trim()) { setFormError('Title is required.'); return; }
    const url = normalizeUrl(formUrl);
    if (!url) { setFormError('URL is required.'); return; }
    try { new URL(url); } catch { setFormError('Enter a valid URL.'); return; }

    if (editingId) {
      setLinks(prev => prev.map(l => l.id === editingId ? { ...l, title: formTitle.trim(), url, category: formCategory } : l));
    } else {
      const newLink: SavedLink = {
        id: crypto.randomUUID(),
        title: formTitle.trim(),
        url,
        category: formCategory,
        createdAt: Date.now(),
      };
      setLinks(prev => [newLink, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const toggleCategory = (cat: string) => {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <span className="font-sans text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-medium">
            Quick Access
          </span>
          <h1 className="font-sans font-semibold text-xl text-gray-900 dark:text-gray-50 mt-0.5 tracking-tight">
            Important Links
          </h1>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-sans text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          Add Link
        </button>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search links..."
          className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans"
        />
        <span className="font-sans text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap px-1">
          {filtered.length} {filtered.length === 1 ? 'link' : 'links'}
        </span>
      </div>

      {/* Grouped link cards */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
          <Link2 size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            {search ? 'No links match your search.' : 'No links saved yet. Click "+ Add Link" to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(Object.entries(grouped) as [string, SavedLink[]][]).map(([cat, items]) => {
            const isCollapsed = collapsed[cat];
            return (
              <div key={cat} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-semibold text-sm text-gray-700 dark:text-gray-200">{cat}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-sans text-[10px] font-medium">
                      {items.length}
                    </span>
                  </div>
                  {isCollapsed
                    ? <ChevronRight size={15} className="text-gray-400 dark:text-gray-500" />
                    : <ChevronDown size={15} className="text-gray-400 dark:text-gray-500" />
                  }
                </button>

                {/* Link rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map(link => (
                      <div key={link.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        {/* Clickable link area */}
                        <button
                          onClick={() => openLink(link.url)}
                          className="flex-1 min-w-0 text-left"
                          title={link.url}
                        >
                          <p className="font-sans font-semibold text-sm text-gray-900 dark:text-gray-50 flex items-center gap-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {link.title}
                            <ExternalLink size={12} className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
                          </p>
                          <p className="font-sans text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                            {link.url}
                          </p>
                        </button>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEdit(link)}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(link.id)}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center font-sans text-[11px] text-gray-400 dark:text-gray-600">
        Links are stored locally in your browser only — never uploaded to any server.
      </p>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-sans font-semibold text-gray-900 dark:text-gray-50">
                {editingId ? 'Edit Link' : 'Add New Link'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-50">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Link Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Company Intranet"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans"
                />
              </div>
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">URL</label>
                <input
                  type="text"
                  required
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans"
                />
              </div>
              <div>
                <label className="block font-sans text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Category</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {formError && (
                <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">{formError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-sans font-medium text-sm text-gray-700 dark:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-sans font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
