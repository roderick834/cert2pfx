import { useState, useEffect } from 'react';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return; }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (installed) {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-green-500 text-sm">✅ 已安裝為 App</span>
      </div>
    );
  }

  const handleInstall = async () => {
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    } else {
      // Chrome but prompt not available yet — show manual guide
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstall}
        className="w-full flex items-center gap-3 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all text-sm"
      >
        <span className="text-xl">📲</span>
        <div className="text-left">
          <p className="font-bold leading-tight">安裝 App 到主畫面</p>
          <p className="text-xs text-white/70 mt-0.5">離線可用・可接收通知</p>
        </div>
        <span className="ml-auto text-white/60 text-lg">›</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowIOSGuide(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 space-y-5"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">加入主畫面</h3>
              <button onClick={() => setShowIOSGuide(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-lg leading-none">
                ×
              </button>
            </div>

            {isIOS() ? (
              <div className="space-y-4">
                <Step n={1} icon="⬆️" text={<>點擊底部工具列的 <strong>分享</strong> 按鈕</>} />
                <Step n={2} icon="📋" text={<>向下捲動，選擇「<strong>加入主畫面</strong>」</>} />
                <Step n={3} icon="✅" text={<>點右上角「<strong>新增</strong>」確認</>} />
                <Step n={4} icon="🔔" text={<>從桌面圖示打開 App，再去設定開啟通知</>} />
                <div className="bg-amber-50 rounded-2xl p-4 text-xs text-amber-700 flex gap-2">
                  <span className="text-base">💡</span>
                  <span>iOS 只有從<strong>主畫面 App 圖示</strong>開啟時才能使用推播通知</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Step n={1} icon="⋮" text={<>點擊瀏覽器右上角的 <strong>選單（⋮）</strong></>} />
                <Step n={2} icon="📲" text={<>選擇「<strong>安裝應用程式</strong>」或「<strong>加入主畫面</strong>」</>} />
                <Step n={3} icon="✅" text={<>點「<strong>安裝</strong>」確認</>} />
              </div>
            )}

            <button onClick={() => setShowIOSGuide(false)}
              className="w-full bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl text-sm">
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, icon, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 font-bold text-xs flex-shrink-0">
        {n}
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-xl">{icon}</span>
        <p className="text-sm text-gray-700">{text}</p>
      </div>
    </div>
  );
}
