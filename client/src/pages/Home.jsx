import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const TYPE_LABELS = { photo: '📷 照片', video: '🎬 影片', text: '📝 文字' };

function MemoryCard({ memory, currentUserId }) {
  const isMe = memory.user_id === currentUserId;
  const date = new Date(memory.date || memory.created_at).toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-fade-in">
      {memory.type === 'photo' && memory.file_path && (
        <img
          src={memory.file_path}
          alt="memory"
          className="w-full object-cover max-h-72"
        />
      )}
      {memory.type === 'video' && memory.file_path && (
        <video
          src={memory.file_path}
          controls
          className="w-full max-h-72 bg-black"
        />
      )}
      <div className="p-4">
        {memory.content && (
          <p className="text-gray-700 text-sm leading-relaxed mb-2">{memory.content}</p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{isMe ? '你' : memory.username} • {TYPE_LABELS[memory.type]}</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, couple } = useAuth();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('text');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    if (!couple) return;
    api.get('/memories')
      .then((res) => setMemories(res.data.memories))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [couple]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('date', date);
      if (content) formData.append('content', content);
      if (file) formData.append('file', file);

      const res = await api.post('/memories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMemories([res.data.memory, ...memories]);
      setShowForm(false);
      setContent('');
      setFile(null);
      setType('text');
    } catch (err) {
      setError(err.response?.data?.error || '上傳失敗');
    } finally {
      setSubmitting(false);
    }
  };

  if (!couple) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="text-5xl mb-4">💔</div>
        <p className="text-gray-500">請先在「我們」頁面連結另一半</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-rose-700">我們的回憶</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all"
        >
          {showForm ? '✕ 取消' : '+ 新增'}
        </button>
      </div>

      {/* Add Memory Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-red-50 text-red-600 rounded-xl px-3 py-2 text-sm">{error}</div>
            )}
            <div className="flex gap-2">
              {['text', 'photo', 'video'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setFile(null); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    type === t ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-400 hover:bg-rose-100'
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            {type === 'text' && (
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                placeholder="寫下這個回憶..."
                className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              />
            )}
            {(type === 'photo' || type === 'video') && (
              <>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={2}
                  placeholder="附上說明（選填）"
                  className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                />
                <div
                  onClick={() => fileRef.current.click()}
                  className="border-2 border-dashed border-rose-200 rounded-xl p-6 text-center cursor-pointer hover:bg-rose-50 transition-all"
                >
                  {file ? (
                    <span className="text-rose-500 text-sm font-medium">{file.name}</span>
                  ) : (
                    <span className="text-gray-400 text-sm">點擊選擇{type === 'photo' ? '圖片' : '影片'}</span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept={type === 'photo' ? 'image/*' : 'video/*'}
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-60 text-sm"
            >
              {submitting ? '上傳中...' : '儲存回憶 ❤️'}
            </button>
          </form>
        </div>
      )}

      {/* Memory list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">載入中...</div>
      ) : memories.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📸</div>
          <p className="text-gray-400 text-sm">還沒有回憶，快去新增第一個吧！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} currentUserId={user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
