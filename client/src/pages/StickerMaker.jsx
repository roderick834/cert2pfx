import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function StickerMaker() {
  const { couple } = useAuth();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#e11d48');
  const [brushSize, setBrushSize] = useState(6);
  const [text, setText] = useState('');
  const [stickerName, setStickerName] = useState('');
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const lastPos = useRef(null);

  useEffect(() => {
    if (!couple) return;
    api.get('/stickers')
      .then((res) => setStickers(res.data.stickers || []))
      .catch(() => {});
  }, [couple]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
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

  const stopDraw = (e) => {
    e && e.preventDefault();
    setIsDrawing(false);
    lastPos.current = null;
  };

  const addText = () => {
    if (!text.trim()) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${brushSize * 4}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    setText('');
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveSticker = async () => {
    if (!stickerName.trim()) {
      setError('Please enter a sticker name');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const canvas = canvasRef.current;
      const image_data = canvas.toDataURL('image/png');
      const res = await api.post('/stickers', { name: stickerName, image_data });
      setStickers([res.data.sticker, ...stickers]);
      setStickerName('');
      clearCanvas();
      setSuccess('Sticker saved!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save sticker');
    } finally {
      setLoading(false);
    }
  };

  const deleteSticker = async (id) => {
    if (!window.confirm('Delete this sticker?')) return;
    try {
      await api.delete(`/stickers/${id}`);
      setStickers(stickers.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (!couple) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8">
        <div className="text-5xl mb-4">🎨</div>
        <p className="text-gray-500">Connect with your partner first to create stickers.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-rose-700 mb-4">Sticker Maker 🎨</h2>

      {/* Canvas */}
      <div className="bg-white rounded-2xl shadow-md p-3 mb-4">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="w-full border border-rose-100 rounded-xl touch-none cursor-crosshair bg-white"
          style={{ aspectRatio: '1 / 1' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 space-y-4">
        {/* Color */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 w-20">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded-xl cursor-pointer border border-rose-200"
          />
          <div className="flex gap-2 flex-wrap">
            {['#e11d48', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#000000', '#ffffff'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 w-20">Size</label>
          <input
            type="range"
            min={1}
            max={30}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 accent-rose-500"
          />
          <span className="text-sm text-gray-500 w-8 text-right">{brushSize}</span>
        </div>

        {/* Add text */}
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add text to canvas..."
            className="flex-1 border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <button
            onClick={addText}
            className="bg-rose-100 hover:bg-rose-200 text-rose-600 font-medium px-4 py-2 rounded-xl text-sm transition-all"
          >
            Add
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={clearCanvas}
            className="flex-1 border border-rose-300 text-rose-500 hover:bg-rose-50 font-medium py-2 rounded-xl text-sm transition-all"
          >
            Clear
          </button>
          <input
            type="text"
            value={stickerName}
            onChange={(e) => setStickerName(e.target.value)}
            placeholder="Sticker name"
            className="flex-1 border border-rose-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <button
            onClick={saveSticker}
            disabled={loading}
            className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-medium py-2 rounded-xl text-sm transition-all disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 rounded-xl px-3 py-2 text-sm">{success}</div>
        )}
      </div>

      {/* Existing stickers */}
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Our Stickers ({stickers.length})</h3>
      {stickers.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">🎨</div>
          <p className="text-sm">No stickers yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {stickers.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm p-2 group relative">
              <img src={s.image_data} alt={s.name} className="w-full aspect-square object-contain rounded-xl" />
              <p className="text-xs text-gray-500 text-center mt-1 truncate">{s.name}</p>
              <button
                onClick={() => deleteSticker(s.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
