import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const CUTE_STICKERS = [
  {
    name: '生氣熊熊',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M50,92 C30,80 15,60 20,45 C23,35 32,38 30,28 C28,18 38,18 40,26 C42,16 50,18 50,26 C50,18 58,16 60,26 C62,18 72,18 70,28 C68,38 77,35 80,45 C85,60 70,80 50,92Z" fill="#FF7A2D"/>
      <path d="M50,88 C33,77 20,59 25,46 C27,38 35,41 33,32 C31,24 39,24 41,31 C43,23 50,25 50,31 C50,25 57,23 59,31 C61,24 69,24 67,32 C65,41 73,38 75,46 C80,59 67,77 50,88Z" fill="#FFA040"/>
      <circle cx="28" cy="44" r="10" fill="#777"/>
      <circle cx="72" cy="44" r="10" fill="#777"/>
      <circle cx="28" cy="44" r="6" fill="#999"/>
      <circle cx="72" cy="44" r="6" fill="#999"/>
      <circle cx="50" cy="65" r="27" fill="#888"/>
      <ellipse cx="50" cy="72" rx="15" ry="10" fill="#AAA"/>
      <circle cx="40" cy="61" r="7" fill="white"/>
      <circle cx="60" cy="61" r="7" fill="white"/>
      <circle cx="41" cy="62" r="4" fill="#111"/>
      <circle cx="61" cy="62" r="4" fill="#111"/>
      <circle cx="42.5" cy="60.5" r="1.5" fill="white"/>
      <circle cx="62.5" cy="60.5" r="1.5" fill="white"/>
      <line x1="33" y1="53" x2="46" y2="57" stroke="#444" stroke-width="3" stroke-linecap="round"/>
      <line x1="67" y1="53" x2="54" y2="57" stroke="#444" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="50" cy="69" rx="6" ry="4" fill="#555"/>
      <path d="M42,78 Q50,73 58,78" stroke="#555" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M28,86 Q38,79 46,86 Q50,89 54,86 Q62,79 72,86" stroke="#666" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    name: '吃麵兔兔',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <ellipse cx="35" cy="20" rx="8" ry="22" fill="#EEE" transform="rotate(-8,35,20)"/>
      <ellipse cx="65" cy="20" rx="8" ry="22" fill="#EEE" transform="rotate(8,65,20)"/>
      <ellipse cx="35" cy="20" rx="4.5" ry="17" fill="#FFB6C1" transform="rotate(-8,35,20)"/>
      <ellipse cx="65" cy="20" rx="4.5" ry="17" fill="#FFB6C1" transform="rotate(8,65,20)"/>
      <circle cx="50" cy="54" r="28" fill="#F5F5F5"/>
      <ellipse cx="50" cy="62" rx="13" ry="9" fill="#E8E8E8"/>
      <circle cx="32" cy="57" r="8" fill="#FFB6C1" opacity="0.45"/>
      <circle cx="68" cy="57" r="8" fill="#FFB6C1" opacity="0.45"/>
      <path d="M37,48 Q42,44 47,48" stroke="#555" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M53,48 Q58,44 63,48" stroke="#555" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="59" rx="4" ry="2.5" fill="#FFB6C1"/>
      <path d="M44,66 Q50,71 56,66" stroke="#CCC" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="84" rx="18" ry="7" fill="#FF8C42"/>
      <path d="M32,84 Q50,95 68,84" fill="#FF8C42"/>
      <path d="M37,81 Q44,77 51,81 Q58,77 65,81" stroke="white" stroke-width="2" fill="none"/>
      <path d="M24,73 Q30,80 32,84" stroke="#DDD" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M76,73 Q70,80 68,84" stroke="#DDD" stroke-width="5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    name: '開心圓圓',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="52" r="38" fill="white" stroke="#E0E0E0" stroke-width="1.5"/>
      <circle cx="32" cy="59" r="10" fill="#FFB6C1" opacity="0.55"/>
      <circle cx="68" cy="59" r="10" fill="#FFB6C1" opacity="0.55"/>
      <circle cx="40" cy="47" r="4.5" fill="#333"/>
      <circle cx="60" cy="47" r="4.5" fill="#333"/>
      <circle cx="41.5" cy="45.5" r="1.8" fill="white"/>
      <circle cx="61.5" cy="45.5" r="1.8" fill="white"/>
      <path d="M37,62 Q50,73 63,62" stroke="#555" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    name: '粉嫩兔兔',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <ellipse cx="35" cy="24" rx="9" ry="23" fill="#FF9EC4" transform="rotate(-8,35,24)"/>
      <ellipse cx="65" cy="24" rx="9" ry="23" fill="#FF9EC4" transform="rotate(8,65,24)"/>
      <ellipse cx="35" cy="24" rx="5" ry="18" fill="#FFD6E8" transform="rotate(-8,35,24)"/>
      <ellipse cx="65" cy="24" rx="5" ry="18" fill="#FFD6E8" transform="rotate(8,65,24)"/>
      <ellipse cx="50" cy="78" rx="22" ry="24" fill="#FF9EC4"/>
      <circle cx="50" cy="54" r="26" fill="#FF9EC4"/>
      <path d="M38,30 Q44,34 50,30 Q56,34 62,30 Q56,26 50,30 Q44,26 38,30Z" fill="#FF6BA0"/>
      <circle cx="50" cy="30" r="3.5" fill="#FF6BA0"/>
      <circle cx="41" cy="51" r="6" fill="white"/>
      <circle cx="59" cy="51" r="6" fill="white"/>
      <circle cx="42" cy="52" r="3.5" fill="#222"/>
      <circle cx="60" cy="52" r="3.5" fill="#222"/>
      <circle cx="43.5" cy="50.5" r="1.2" fill="white"/>
      <circle cx="61.5" cy="50.5" r="1.2" fill="white"/>
      <path d="M47,60 Q50,63 53,60" fill="#FF6BA0"/>
      <path d="M44,64 Q50,69 56,64" stroke="#FF9EC4" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="78" rx="14" ry="17" fill="#FFD6E8"/>
      <path d="M72,43 C68,39 74,35 72,43Z" fill="#FF6BA0"/>
      <path d="M72,43 C76,39 70,35 72,43Z" fill="#FF6BA0"/>
      <ellipse cx="72" cy="45" rx="4" ry="3" fill="#FF6BA0"/>
    </svg>`,
  },
  {
    name: '睡覺熊熊',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="20" cy="15" r="2" fill="#C8B4FF" opacity="0.8"/>
      <circle cx="82" cy="12" r="2" fill="#C8B4FF" opacity="0.8"/>
      <ellipse cx="55" cy="74" rx="35" ry="18" fill="#888"/>
      <circle cx="87" cy="70" r="7" fill="#AAA"/>
      <circle cx="27" cy="62" r="21" fill="#888"/>
      <circle cx="14" cy="47" r="9" fill="#888"/>
      <circle cx="14" cy="47" r="5.5" fill="#AAA"/>
      <circle cx="38" cy="44" r="8" fill="#888"/>
      <circle cx="38" cy="44" r="4.5" fill="#AAA"/>
      <ellipse cx="27" cy="68" rx="13" ry="9" fill="#AAA"/>
      <path d="M19,59 Q24,55 30,59" stroke="#666" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M22,57 Q24,53.5 27,57" stroke="#666" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="27" cy="65" rx="5" ry="3.5" fill="#666"/>
      <path d="M22,72 Q27,76 32,72" stroke="#888" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <text x="55" y="50" font-size="13" font-weight="bold" fill="#BBB" font-family="sans-serif">z</text>
      <text x="63" y="37" font-size="17" font-weight="bold" fill="#AAA" font-family="sans-serif">Z</text>
      <text x="74" y="24" font-size="21" font-weight="bold" fill="#999" font-family="sans-serif">Z</text>
    </svg>`,
  },
  {
    name: '愛心眼睛',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="57" r="32" fill="#FFCBA4"/>
      <circle cx="26" cy="34" r="11" fill="#FFCBA4"/>
      <circle cx="74" cy="34" r="11" fill="#FFCBA4"/>
      <circle cx="26" cy="34" r="6.5" fill="#FFB6C1"/>
      <circle cx="74" cy="34" r="6.5" fill="#FFB6C1"/>
      <ellipse cx="50" cy="66" rx="16" ry="11" fill="#FFAD8F"/>
      <path d="M33,52 C33,48 37,46 40,48.5 C43,46 47,48 47,52 C47,57 40,63 40,63 C40,63 33,57 33,52Z" fill="#FF4B6E"/>
      <path d="M53,52 C53,48 57,46 60,48.5 C63,46 67,48 67,52 C67,57 60,63 60,63 C60,63 53,57 53,52Z" fill="#FF4B6E"/>
      <ellipse cx="50" cy="64" rx="5.5" ry="4" fill="#E8946A"/>
      <path d="M40,72 Q50,80 60,72" stroke="#E8946A" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="30" cy="64" r="8" fill="#FF9EC4" opacity="0.45"/>
      <circle cx="70" cy="64" r="8" fill="#FF9EC4" opacity="0.45"/>
      <path d="M14,22 C14,20 16,19 17,20.5 C18,19 20,20 20,22 C20,24.5 17,27 17,27 C17,27 14,24.5 14,22Z" fill="#FF4B6E" opacity="0.9"/>
      <path d="M79,16 C79,14 81,13 82,14.5 C83,13 85,14 85,16 C85,18.5 82,21 82,21 C82,21 79,18.5 79,16Z" fill="#FF4B6E" opacity="0.9"/>
    </svg>`,
  },
  {
    name: '加油兔兔',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="13" cy="36" r="12" fill="#FF6B6B" opacity="0.9"/>
      <circle cx="9" cy="32" r="7" fill="#FF9E9E"/>
      <circle cx="16" cy="28" r="5" fill="#FFCECE"/>
      <circle cx="87" cy="36" r="12" fill="#FF6B6B" opacity="0.9"/>
      <circle cx="91" cy="32" r="7" fill="#FF9E9E"/>
      <circle cx="84" cy="28" r="5" fill="#FFCECE"/>
      <path d="M30,64 Q19,51 14,39" stroke="#EEE" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M70,64 Q81,51 86,39" stroke="#EEE" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="38" cy="22" rx="9" ry="23" fill="#F0F0F0" transform="rotate(-10,38,22)"/>
      <ellipse cx="62" cy="22" rx="9" ry="23" fill="#F0F0F0" transform="rotate(10,62,22)"/>
      <ellipse cx="38" cy="22" rx="5" ry="18" fill="#FFB6C1" transform="rotate(-10,38,22)"/>
      <ellipse cx="62" cy="22" rx="5" ry="18" fill="#FFB6C1" transform="rotate(10,62,22)"/>
      <ellipse cx="50" cy="80" rx="20" ry="22" fill="#F0F0F0"/>
      <circle cx="50" cy="57" r="26" fill="#F5F5F5"/>
      <circle cx="41" cy="54" r="5.5" fill="white"/>
      <circle cx="59" cy="54" r="5.5" fill="white"/>
      <circle cx="42" cy="55" r="3.5" fill="#333"/>
      <circle cx="60" cy="55" r="3.5" fill="#333"/>
      <circle cx="43.5" cy="53.5" r="1.2" fill="white"/>
      <circle cx="61.5" cy="53.5" r="1.2" fill="white"/>
      <ellipse cx="50" cy="61" rx="4" ry="2.5" fill="#FFB6C1"/>
      <path d="M41,67 Q50,75 59,67" stroke="#BBB" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="35" cy="61" r="8" fill="#FFB6C1" opacity="0.45"/>
      <circle cx="65" cy="61" r="8" fill="#FFB6C1" opacity="0.45"/>
    </svg>`,
  },
  {
    name: '哭哭臉',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="52" r="36" fill="#FFFDE0"/>
      <path d="M35,69 Q33,77 35,83 Q37,77 35,69Z" fill="#88CCFF"/>
      <path d="M32,74 Q28,83 31,89 Q34,83 32,74Z" fill="#88CCFF"/>
      <path d="M65,69 Q67,77 65,83 Q63,77 65,69Z" fill="#88CCFF"/>
      <path d="M68,74 Q72,83 69,89 Q66,83 68,74Z" fill="#88CCFF"/>
      <circle cx="39" cy="47" r="9" fill="white"/>
      <circle cx="61" cy="47" r="9" fill="white"/>
      <circle cx="40" cy="49" r="5.5" fill="#64B5F6"/>
      <circle cx="62" cy="49" r="5.5" fill="#64B5F6"/>
      <circle cx="38.5" cy="47" r="2" fill="#1565C0"/>
      <circle cx="60.5" cy="47" r="2" fill="#1565C0"/>
      <circle cx="40" cy="45.5" r="1.5" fill="white"/>
      <circle cx="62" cy="45.5" r="1.5" fill="white"/>
      <path d="M31,38 Q38,35 43,39" stroke="#AAA" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M69,38 Q62,35 57,39" stroke="#AAA" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M37,66 Q50,59 63,66" stroke="#AAA" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="30" cy="58" r="9" fill="#FFB6C1" opacity="0.5"/>
      <circle cx="70" cy="58" r="9" fill="#FFB6C1" opacity="0.5"/>
    </svg>`,
  },
  {
    name: '比心熊熊',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="26" cy="36" r="10" fill="#888"/>
      <circle cx="74" cy="36" r="10" fill="#888"/>
      <circle cx="26" cy="36" r="6" fill="#AAA"/>
      <circle cx="74" cy="36" r="6" fill="#AAA"/>
      <circle cx="50" cy="58" r="28" fill="#888"/>
      <ellipse cx="50" cy="67" rx="16" ry="11" fill="#AAA"/>
      <circle cx="41" cy="54" r="7" fill="white"/>
      <circle cx="59" cy="54" r="7" fill="white"/>
      <circle cx="42" cy="55" r="4" fill="#222"/>
      <circle cx="60" cy="55" r="4" fill="#222"/>
      <circle cx="43.5" cy="53.5" r="1.5" fill="white"/>
      <circle cx="61.5" cy="53.5" r="1.5" fill="white"/>
      <ellipse cx="50" cy="65" rx="6" ry="4" fill="#666"/>
      <path d="M42,73 Q50,79 58,73" stroke="#666" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="64" r="8" fill="#FFB6C1" opacity="0.5"/>
      <circle cx="68" cy="64" r="8" fill="#FFB6C1" opacity="0.5"/>
      <path d="M18,85 Q23,76 30,82 Q34,86 38,80 Q42,74 50,72" stroke="#777" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M82,85 Q77,76 70,82 Q66,86 62,80 Q58,74 50,72" stroke="#777" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M40,70 C40,66 44,64 47,66.5 C50,64 54,66 54,70 C54,75 50,79 50,79 C50,79 40,75 40,70Z" fill="#FF4B6E" opacity="0.85"/>
    </svg>`,
  },
  {
    name: '撒花慶祝',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="15" cy="18" r="4" fill="#FF6B6B" opacity="0.9"/>
      <circle cx="28" cy="10" r="3" fill="#FFD93D" opacity="0.9"/>
      <circle cx="72" cy="10" r="3" fill="#6BCB77" opacity="0.9"/>
      <circle cx="85" cy="18" r="4" fill="#4D96FF" opacity="0.9"/>
      <rect x="20" y="22" width="5" height="5" fill="#FF6B6B" opacity="0.8" transform="rotate(30,22,25)"/>
      <rect x="74" y="22" width="5" height="5" fill="#FFD93D" opacity="0.8" transform="rotate(45,77,25)"/>
      <rect x="12" y="35" width="4" height="4" fill="#6BCB77" opacity="0.8" transform="rotate(20,14,37)"/>
      <rect x="84" y="35" width="4" height="4" fill="#FF6B6B" opacity="0.8" transform="rotate(60,86,37)"/>
      <ellipse cx="38" cy="22" rx="9" ry="23" fill="#F0F0F0" transform="rotate(-10,38,22)"/>
      <ellipse cx="62" cy="22" rx="9" ry="23" fill="#F0F0F0" transform="rotate(10,62,22)"/>
      <ellipse cx="38" cy="22" rx="5" ry="18" fill="#FFB6C1" transform="rotate(-10,38,22)"/>
      <ellipse cx="62" cy="22" rx="5" ry="18" fill="#FFB6C1" transform="rotate(10,62,22)"/>
      <circle cx="50" cy="60" r="28" fill="#F5F5F5"/>
      <ellipse cx="50" cy="69" rx="14" ry="9" fill="#E8E8E8"/>
      <circle cx="41" cy="56" r="5.5" fill="white"/>
      <circle cx="59" cy="56" r="5.5" fill="white"/>
      <circle cx="42" cy="57" r="3.5" fill="#333"/>
      <circle cx="60" cy="57" r="3.5" fill="#333"/>
      <circle cx="43.5" cy="55.5" r="1.2" fill="white"/>
      <circle cx="61.5" cy="55.5" r="1.2" fill="white"/>
      <ellipse cx="50" cy="66" rx="4" ry="2.5" fill="#FFB6C1"/>
      <path d="M42,73 Q50,80 58,73" stroke="#CCC" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="34" cy="63" r="8" fill="#FFB6C1" opacity="0.45"/>
      <circle cx="66" cy="63" r="8" fill="#FFB6C1" opacity="0.45"/>
      <path d="M26,76 Q18,68 22,58" stroke="#DDD" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M74,76 Q82,68 78,58" stroke="#DDD" stroke-width="6" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
];

function makeStickerFromSvg(svgString, size = 300) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
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
      for (const p of CUTE_STICKERS) {
        const image_data = await makeStickerFromSvg(p.svg);
        if (!image_data) continue;
        const res = await api.post('/stickers', { name: p.name, image_data });
        results.push(res.data.sticker);
      }
      setStickers(prev => [...results, ...prev]);
      setSuccess(`已生成 ${results.length} 個可愛貼圖！`);
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
