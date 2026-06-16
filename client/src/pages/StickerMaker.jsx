import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const PRESET_STICKERS = [
  { name: '甜蜜愛心', emoji: '❤️', bg: '#ffe4e6' },
  { name: '閃亮星星', emoji: '⭐', bg: '#fefce8' },
  { name: '幸運四葉', emoji: '🍀', bg: '#dcfce7' },
  { name: '月夜浪漫', emoji: '🌙', bg: '#1e1b4b' },
  { name: '甜蜜飛吻', emoji: '😘', bg: '#fdf2f8' },
  { name: '可愛貓咪', emoji: '🐱', bg: '#fff7ed' },
  { name: '草莓甜心', emoji: '🍓', bg: '#fff1f2' },
  { name: '粉嫩花朵', emoji: '🌸', bg: '#fdf4ff' },
  { name: '開心慶祝', emoji: '🎉', bg: '#ecfdf5' },
  { name: '溫暖擁抱', emoji: '🤗', bg: '#fffbeb' },
];

function makeEmojiSticker(emoji, bgColor, size = 300) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `${size * 0.52}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  return canvas.toDataURL('image/png');
}

export default function StickerMaker() {
  const { couple } = useAuth();
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#e11d48');
  const [brushSize, setBrushSize] = useState(6);
  const [text, setText] = useState('');
  const [stickerName, setStickerName] = useState('');
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const lastPos = useRef(null);
  const uploadRef = useRef();

  // Undo / Redo stacks
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!couple) return;
    api.get('/stickers').then(r => setStickers(r.data.stickers || [])).catch(() => {});
  }, [couple]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const snapshot = () => {
    const canvas = canvasRef.current;
    return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  };

  const pushHistory = () => {
    undoStack.current.push(snapshot());
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  const undo = () => {
    if (!undoStack.current.length) return;
    redoStack.current.push(snapshot());
    canvasRef.current.getContext('2d').putImageData(undoStack.current.pop(), 0, 0);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  };

  const redo = () => {
    if (!redoStack.current.length) return;
    undoStack.current.push(snapshot());
    canvasRef.current.getContext('2d').putImageData(redoStack.current.pop(), 0, 0);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  };

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    pushHistory();
    setIsDrawing(true);
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = (e) => { e?.preventDefault(); setIsDrawing(false); lastPos.current = null; };

  const addText = () => {
    if (!text.trim()) return;
    pushHistory();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${brushSize * 4}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    setText('');
  };

  const clearCanvas = () => {
    pushHistory();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const loadImageToCanvas = (file) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      pushHistory();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const saveSticker = async () => {
    if (!stickerName.trim()) { setError('請輸入貼圖名稱'); return; }
    setError(''); setLoading(true);
    try {
      const image_data = canvasRef.current.toDataURL('image/png');
      const res = await api.post('/stickers', { name: stickerName, image_data });
      setStickers([res.data.sticker, ...stickers]);
      setStickerName(''); clearCanvas();
      setSuccess('貼圖已儲存！');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) { setError(err.response?.data?.error || '儲存失敗'); }
    finally { setLoading(false); }
  };

  const generatePresets = async () => {
    setGenLoading(true);
    setSuccess('');
    setError('');
    try {
      const results = [];
      for (const p of PRESET_STICKERS) {
        const image_data = makeEmojiSticker(p.emoji, p.bg);
        const res = await api.post('/stickers', { name: p.name, image_data });
        results.push(res.data.sticker);
      }
      setStickers(prev => [...results, ...prev]);
      setSuccess('已生成 10 個預設貼圖！');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('生成失敗，請稍後再試'); }
    finally { setGenLoading(false); }
  };

  const deleteSticker = async (id) => {
    if (!window.confirm('刪除這個貼圖？')) return;
    try {
      await api.delete(`/stickers/${id}`);
      setStickers(stickers.filter(s => s.id !== id));
    } catch (err) { alert(err.response?.data?.error || '刪除失敗'); }
  };

  if (!couple) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="text-5xl mb-4">🎨</div>
        <p className="text-gray-500">請先連結另一半才能建立貼圖</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-rose-700">貼圖工坊 🎨</h2>
        {stickers.length === 0 && (
          <button onClick={generatePresets} disabled={genLoading}
            className="bg-rose-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-60">
            {genLoading ? '生成中...' : '✨ 生成預設貼圖'}
          </button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        {[{ id: 'draw', label: '✏️ 手繪' }, { id: 'upload', label: '📷 上傳圖片' }].map(({ id, label }) => (
          <button key={id} onClick={() => setMode(id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === id ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'upload' && (
        <>
          <div onClick={() => uploadRef.current.click()}
            className="border-2 border-dashed border-rose-200 rounded-xl p-5 text-center cursor-pointer hover:bg-rose-50 transition-all mb-3">
            <p className="text-gray-400 text-sm">點擊從相簿選擇圖片</p>
            <p className="text-gray-300 text-xs mt-1">圖片會載入畫布，可繼續添加文字</p>
          </div>
          <input ref={uploadRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files[0]) loadImageToCanvas(e.target.files[0]); }} />
        </>
      )}

      {/* Canvas + undo/redo */}
      <div className="bg-white rounded-2xl shadow-md p-3 mb-3">
        <canvas
          ref={canvasRef} width={300} height={300}
          className="w-full border border-rose-100 rounded-xl touch-none cursor-crosshair bg-white"
          style={{ aspectRatio: '1 / 1' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
        {/* Undo / Redo bar */}
        <div className="flex gap-2 mt-2 justify-center">
          <button onClick={undo} disabled={!canUndo}
            className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 disabled:opacity-30 transition-all">
            ↩ 上一步
          </button>
          <button onClick={redo} disabled={!canRedo}
            className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 disabled:opacity-30 transition-all">
            ↪ 下一步
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 space-y-4">
        {/* Color picker */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 w-12">顏色</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-10 h-10 rounded-xl cursor-pointer border border-rose-200" />
          <div className="flex gap-2 flex-wrap">
            {['#e11d48','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#000000','#ffffff'].map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 w-12">筆刷</label>
          <input type="range" min={1} max={30} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))}
            className="flex-1 accent-rose-500" />
          <span className="text-sm text-gray-500 w-6 text-right">{brushSize}</span>
        </div>

        {/* Add text */}
        <div className="flex gap-2">
          <input type="text" value={text} onChange={e => setText(e.target.value)}
            placeholder="加入文字到畫布..."
            className="flex-1 border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
          <button onClick={addText} className="bg-rose-100 hover:bg-rose-200 text-rose-600 font-medium px-4 py-2 rounded-xl text-sm">
            加入
          </button>
        </div>

        {/* Save row */}
        <div className="flex gap-2">
          <button onClick={clearCanvas}
            className="border border-rose-300 text-rose-500 hover:bg-rose-50 font-medium py-2 px-3 rounded-xl text-sm">
            清除
          </button>
          <input type="text" value={stickerName} onChange={e => setStickerName(e.target.value)}
            placeholder="貼圖名稱"
            className="flex-1 border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
          <button onClick={saveSticker} disabled={loading}
            className="bg-rose-500 hover:bg-rose-600 text-white font-medium py-2 px-3 rounded-xl text-sm disabled:opacity-60">
            {loading ? '儲存中' : '儲存'}
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2 text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-600 rounded-xl px-3 py-2 text-sm">{success}</div>}
      </div>

      {/* Sticker grid */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-700">我們的貼圖 ({stickers.length})</h3>
        {stickers.length > 0 && (
          <button onClick={generatePresets} disabled={genLoading}
            className="text-xs text-rose-400 font-medium disabled:opacity-50">
            {genLoading ? '生成中...' : '✨ 補充預設貼圖'}
          </button>
        )}
      </div>

      {stickers.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">🎨</div>
          <p className="text-sm">還沒有貼圖，點擊上方生成預設貼圖或自己畫！</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 pb-4">
          {stickers.map(s => (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm p-2 group relative">
              <img src={s.image_data} alt={s.name} className="w-full aspect-square object-contain rounded-xl" />
              <p className="text-xs text-gray-500 text-center mt-1 truncate">{s.name}</p>
              <button onClick={() => deleteSticker(s.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
