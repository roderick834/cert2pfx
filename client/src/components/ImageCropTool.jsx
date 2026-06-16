import { useState, useRef } from 'react';

export default function ImageCropTool({ file, onSave, onCancel }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [imgSrc] = useState(() => URL.createObjectURL(file));
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const gesture = useRef({ type: null, startTx: 0, startTy: 0, startX: 0, startY: 0, startDist: 0, startScale: 1 });

  const initCentered = () => {
    const img = imgRef.current;
    const cont = containerRef.current;
    if (!img || !cont) return;
    const s = Math.max(cont.clientWidth / img.naturalWidth, cont.clientHeight / img.naturalHeight);
    setScale(s);
    setTx((cont.clientWidth  - img.naturalWidth  * s) / 2);
    setTy((cont.clientHeight - img.naturalHeight * s) / 2);
  };

  const dist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      gesture.current = { type: 'pan', startTx: tx, startTy: ty, startX: e.touches[0].clientX, startY: e.touches[0].clientY, startDist: 0, startScale: scale };
    } else if (e.touches.length >= 2) {
      gesture.current = { type: 'pinch', startTx: tx, startTy: ty, startX: 0, startY: 0, startDist: dist(e.touches), startScale: scale };
    }
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    const g = gesture.current;
    if (g.type === 'pan' && e.touches.length === 1) {
      setTx(g.startTx + e.touches[0].clientX - g.startX);
      setTy(g.startTy + e.touches[0].clientY - g.startY);
    } else if (g.type === 'pinch' && e.touches.length >= 2) {
      setScale(Math.max(0.1, g.startScale * dist(e.touches) / g.startDist));
    }
  };

  const onTouchEnd = (e) => { e.preventDefault(); gesture.current.type = null; };

  const handleSave = () => {
    const img = imgRef.current;
    const cont = containerRef.current;
    if (!img || !cont) return;
    const cW = cont.clientWidth, cH = cont.clientHeight;
    const canvas = document.createElement('canvas');
    canvas.width = cW * 2; canvas.height = cH * 2;
    const ctx = canvas.getContext('2d');
    const r = 2;
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight,
      tx * r, ty * r, img.naturalWidth * scale * r, img.naturalHeight * scale * r);
    onSave(canvas.toDataURL('image/jpeg', 0.88));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 bg-black">
        <button onClick={onCancel} className="text-white/60 text-sm">取消</button>
        <span className="text-white font-semibold text-sm">選取範圍</span>
        <button onClick={handleSave} className="text-rose-400 font-bold text-sm">完成</button>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden bg-black flex-1 touch-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          ref={imgRef} src={imgSrc} alt="" onLoad={initCentered} draggable={false}
          style={{
            position: 'absolute', left: 0, top: 0, maxWidth: 'none',
            transform: `translate(${tx}px,${ty}px) scale(${scale})`, transformOrigin: '0 0',
            pointerEvents: 'none', userSelect: 'none',
          }}
        />
        <div className="absolute inset-0 pointer-events-none border-2 border-white/30"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)',
            backgroundSize: '33.33% 33.33%',
          }}
        />
      </div>

      <div className="flex-shrink-0 flex flex-col items-center gap-2 px-6 py-5 bg-black">
        <div className="w-full flex items-center gap-3">
          <span className="text-white/50 text-lg">−</span>
          <input type="range" min={0.1} max={5} step={0.01} value={scale}
            onChange={e => setScale(Number(e.target.value))} className="flex-1 accent-rose-400" />
          <span className="text-white/50 text-lg">+</span>
        </div>
        <p className="text-white/40 text-xs">拖動調整位置 · 捏合或滑桿縮放</p>
      </div>
    </div>
  );
}
