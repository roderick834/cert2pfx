import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const TYPE_LABELS = { photo: '照片', video: '影片', text: '文字' };
const TYPE_ICONS  = { photo: '📷', video: '🎬', text: '📝' };

function formatDateHeader(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const weekDays = ['週日','週一','週二','週三','週四','週五','週六'];
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    + ' ' + weekDays[d.getDay()];
}

function groupByDate(memories) {
  const groups = {};
  memories.forEach(m => {
    const d = (m.date || m.created_at || '').split('T')[0];
    if (!groups[d]) groups[d] = [];
    groups[d].push(m);
  });
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function PhotoViewer({ files }) {
  const [idx, setIdx] = useState(0);
  const touchX = useRef(null);
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(files.length - 1, i + 1));
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchX.current = null;
  };
  if (!files.length) return null;
  return (
    <div className="relative w-full h-full bg-black select-none"
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <img src={files[idx]} alt="" className="absolute inset-0 w-full h-full object-contain" />
      {files.length > 1 && (
        <>
          <button onClick={prev} disabled={idx === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white text-xl flex items-center justify-center disabled:opacity-20">‹</button>
          <button onClick={next} disabled={idx === files.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white text-xl flex items-center justify-center disabled:opacity-20">›</button>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {files.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/40'}`} />
            ))}
          </div>
          <div className="absolute top-3 right-3 bg-black/50 rounded-full px-2.5 py-1 text-white text-xs font-medium">
            {idx + 1}/{files.length}
          </div>
        </>
      )}
    </div>
  );
}

function MemoryDetail({ memory, onClose, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(memory.content || '');
  const [editDate, setEditDate] = useState((memory.date || memory.created_at || '').split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [addingFiles, setAddingFiles] = useState(false);
  const [localFiles, setLocalFiles] = useState(memory.files || []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const addFileRef = useRef();

  const isPhoto = memory.type === 'photo';
  const isVideo = memory.type === 'video';
  const hasMedia = (isPhoto || isVideo) && localFiles.length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/memories/${memory.id}`, { content: editContent, date: editDate });
      onUpdate({ ...memory, content: editContent, date: editDate, files: localFiles });
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const handleAddFiles = async (e) => {
    const picked = Array.from(e.target.files);
    if (!picked.length) return;
    setAddingFiles(true);
    try {
      const fd = new FormData();
      picked.forEach(f => fd.append('files', f));
      const res = await api.post(`/memories/${memory.id}/files`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLocalFiles(res.data.files);
      onUpdate({ ...memory, content: editContent, date: editDate, files: res.data.files });
    } catch {}
    setAddingFiles(false);
    e.target.value = '';
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/memories/${memory.id}`);
      onDelete(memory.id);
      onClose();
    } catch {}
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex-shrink-0 bg-black/80 backdrop-blur-sm px-4 py-3 flex items-center gap-2">
        <span className="text-white/70 text-sm flex-1 truncate">{TYPE_ICONS[memory.type]} {formatDateHeader(editDate)}</span>
        <button onClick={() => { setEditing(e => !e); setConfirmDelete(false); }}
          className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white">
          {editing ? '✕' : '✏️'}
        </button>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white text-xl">✕</button>
      </div>

      {hasMedia && !editing && (
        <div className={editContent ? 'flex-1 min-h-0' : 'flex-1'}>
          {isPhoto && <PhotoViewer files={localFiles} />}
          {isVideo && <video src={localFiles[0]} controls className="w-full h-full object-contain bg-black" playsInline />}
        </div>
      )}

      {!editing && editContent && (
        <div className={`flex-shrink-0 px-4 py-4 ${hasMedia ? 'bg-black/80 backdrop-blur-sm max-h-40 overflow-y-auto border-t border-white/10' : 'flex-1 overflow-y-auto'}`}>
          <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{editContent}</p>
        </div>
      )}

      {!hasMedia && !editContent && !editing && (
        <div className="flex-1 flex items-center justify-center text-white/40 text-sm">無內容</div>
      )}

      {editing && (
        <div className="flex-1 overflow-y-auto bg-gray-900 px-4 py-4 space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">日期</label>
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-white/10 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">說明文字</label>
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
              placeholder="寫下這個回憶..."
              className="w-full bg-gray-800 text-white rounded-xl px-3 py-2.5 text-sm border border-white/10 focus:outline-none resize-none" />
          </div>
          {isPhoto && localFiles.length > 0 && (
            <div>
              <label className="text-xs text-white/50 mb-2 block">目前照片（{localFiles.length} 張）</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {localFiles.map((f, i) => (
                  <img key={i} src={f} alt="" className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                ))}
              </div>
            </div>
          )}
          {isPhoto && (
            <>
              <button onClick={() => addFileRef.current.click()} disabled={addingFiles}
                className="w-full border-2 border-dashed border-white/20 rounded-xl py-3 text-white/60 text-sm hover:border-rose-400 hover:text-rose-400 transition-colors disabled:opacity-50">
                {addingFiles ? '上傳中...' : '＋ 追加照片'}
              </button>
              <input ref={addFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddFiles} />
            </>
          )}
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl disabled:opacity-60 text-sm">
            {saving ? '儲存中...' : '儲存變更'}
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full border border-red-500/40 text-red-400 py-2.5 rounded-xl text-sm hover:bg-red-500/10 transition-colors">
              刪除這個回憶
            </button>
          ) : (
            <div className="bg-red-900/30 rounded-xl p-3 space-y-2">
              <p className="text-red-300 text-sm text-center">確定要刪除？此操作無法復原</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 border border-white/20 text-white/70 py-2 rounded-xl text-sm">取消</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-60">
                  {deleting ? '刪除中...' : '確定刪除'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Between-style memory card
function MemoryCard({ memory, user, onClick }) {
  const [liked, setLiked] = useState(
    () => JSON.parse(localStorage.getItem('liked_memories') || '[]').includes(memory.id)
  );

  const toggleLike = (e) => {
    e.stopPropagation();
    const likes = JSON.parse(localStorage.getItem('liked_memories') || '[]');
    const next = liked ? likes.filter(id => id !== memory.id) : [...likes, memory.id];
    localStorage.setItem('liked_memories', JSON.stringify(next));
    setLiked(!liked);
  };

  const isMe = memory.user_id === user?.id;
  const thumb = memory.files?.[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-fade-in" onClick={onClick}>
      {/* Photo/video */}
      {thumb && memory.type === 'photo' && (
        <img src={thumb} alt="" className="w-full object-cover" style={{ maxHeight: 320, minHeight: 160 }} />
      )}
      {memory.type === 'video' && thumb && (
        <div className="w-full bg-gray-100 flex flex-col items-center justify-center" style={{ height: 140 }}>
          <span className="text-5xl">🎬</span>
          <span className="text-xs text-gray-400 mt-1">點擊播放</span>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-3 pb-1">
        {/* Avatar + name row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
            {memory.avatar
              ? <img src={memory.avatar} alt="" className="w-full h-full object-cover" />
              : (memory.username?.[0]?.toUpperCase() || '?')}
          </div>
          <span className="text-sm font-medium text-gray-700">{isMe ? '你' : memory.username}</span>
          {memory.files?.length > 1 && (
            <span className="ml-auto text-xs text-gray-400">{memory.files.length} 張</span>
          )}
        </div>

        {/* Caption */}
        {memory.content && (
          <p className="text-gray-600 text-sm leading-snug line-clamp-3 mb-2">{memory.content}</p>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-50">
        <button onClick={toggleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${liked ? 'text-rose-500 bg-rose-50' : 'text-gray-400 hover:text-rose-400 hover:bg-rose-50'}`}>
          {liked ? '❤️' : '🤍'}
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300">
          <span>💬</span>
        </div>
        <div className="ml-auto">
          <span className="text-xs bg-rose-50 text-rose-400 px-2 py-0.5 rounded-full font-medium">
            {TYPE_ICONS[memory.type]} {TYPE_LABELS[memory.type]}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Memories() {
  const { user, couple } = useAuth();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('text');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    if (!couple) return;
    api.get('/memories')
      .then(r => setMemories(r.data.memories))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [couple]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('type', type); fd.append('date', date);
      if (content) fd.append('content', content);
      files.forEach(f => fd.append('files', f));
      const r = await api.post('/memories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMemories([r.data.memory, ...memories]);
      setShowForm(false); setContent(''); setFiles([]); setType('text');
      setDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      setError(err.response?.data?.error || '上傳失敗');
    } finally { setSubmitting(false); }
  };

  const handleUpdate = (updated) => {
    setMemories(ms => ms.map(m => m.id === updated.id ? { ...m, ...updated } : m));
    setSelected(updated);
  };

  const handleDelete = (id) => {
    setMemories(ms => ms.filter(m => m.id !== id));
    setSelected(null);
  };

  if (!couple) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="text-5xl mb-4">💔</div>
        <p className="text-gray-500">請先連結另一半</p>
      </div>
    );
  }

  const grouped = groupByDate(memories);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-rose-50 z-10">
        <h2 className="text-base font-bold text-rose-700">我們的回憶</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-rose-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-sm">
          {showForm ? '✕ 取消' : '+ 新增'}
        </button>
      </div>

      {/* New memory form */}
      {showForm && (
        <div className="mx-4 bg-white rounded-2xl shadow-sm p-4 mb-4 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="bg-red-50 text-red-600 rounded-xl px-3 py-2 text-sm">{error}</div>}
            <div className="flex gap-2">
              {['text', 'photo', 'video'].map(t => (
                <button key={t} type="button" onClick={() => { setType(t); setFiles([]); }}
                  className={`flex-1 py-1.5 rounded-xl text-sm font-medium ${type === t ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-400'}`}>
                  {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            {type === 'text' ? (
              <textarea required value={content} onChange={e => setContent(e.target.value)}
                rows={4} placeholder="寫下這個回憶..."
                className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
            ) : (
              <>
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  rows={2} placeholder="附上說明（選填）"
                  className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
                <div onClick={() => fileRef.current.click()}
                  className="border-2 border-dashed border-rose-200 rounded-xl p-4 text-center cursor-pointer hover:bg-rose-50 transition-colors">
                  {files.length > 0
                    ? <span className="text-rose-500 text-sm font-medium">已選擇 {files.length} 個{type === 'photo' ? '圖片' : '影片'}</span>
                    : <span className="text-gray-400 text-sm">點擊選擇{type === 'photo' ? '圖片（可多選）' : '影片'}</span>}
                </div>
                <input ref={fileRef} type="file"
                  accept={type === 'photo' ? 'image/*' : 'video/*'}
                  multiple={type === 'photo'}
                  className="hidden"
                  onChange={e => setFiles(Array.from(e.target.files))} />
              </>
            )}
            <button type="submit" disabled={submitting}
              className="w-full bg-rose-500 text-white font-semibold py-2.5 rounded-xl disabled:opacity-60 text-sm">
              {submitting ? '上傳中...' : '儲存回憶 ❤️'}
            </button>
          </form>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : memories.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📸</div>
          <p className="text-gray-400 text-sm">還沒有回憶，快去新增第一個吧！</p>
        </div>
      ) : (
        <div className="space-y-6 px-4">
          {grouped.map(([date, items]) => (
            <div key={date}>
              {/* Date section header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                  {formatDateHeader(date)}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              {/* Cards for this date */}
              <div className="space-y-3">
                {items.map(m => (
                  <MemoryCard key={m.id} memory={m} user={user} onClick={() => setSelected(m)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <MemoryDetail
          memory={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
