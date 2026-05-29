import React, { useState, useEffect, useRef } from "react";
import { Camera, CameraOff, FileText, Clock, Trash2, Check, X, ShieldAlert, Sparkles, Image as ImageIcon } from "lucide-react";

export interface HourlyLog {
  id: string;
  time: string;
  activity: string;
  photoUrl?: string; // base64 string
  type: "photo" | "text_only";
}

interface HourlyCheckInProps {
  butlerName: string;
  butlerAvatar: string;
}

export default function HourlyCheckIn({ butlerName, butlerAvatar }: HourlyCheckInProps) {
  const [logs, setLogs] = useState<HourlyLog[]>(() => {
    const saved = localStorage.getItem("tempus_hourly_logs");
    return saved ? JSON.parse(saved) : [];
  });

  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(3600); // 1 hour in seconds
  const [activity, setActivity] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load and Save logs
  useEffect(() => {
    localStorage.setItem("tempus_hourly_logs", JSON.stringify(logs));
  }, [logs]);

  // Clock countdown for hourly notification
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger notification popup!
          setIsOpen(true);
          return 3600; // Reset to 1 hour
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format countdown string
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("無法開啟您的攝像頭。可能是因為權限被拒絕，或是您正使用無攝像頭的裝置。您仍可使用純文字模式記錄喔！");
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Take Snapshot
  const takeSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(-1, 1); // Mirror effect helper
        ctx.drawImage(videoRef.current, -320, 0, 320, 240);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  // Save the hour log
  const handleSaveLog = () => {
    if (!activity.trim()) return;

    const newLog: HourlyLog = {
      id: `log-${Date.now()}`,
      time: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
      activity: activity.trim(),
      photoUrl: capturedPhoto || undefined,
      type: capturedPhoto ? "photo" : "text_only",
    };

    setLogs((prev) => [newLog, ...prev]);
    // Reset states
    setActivity("");
    setCapturedPhoto(null);
    stopCamera();
    setIsOpen(false);
  };

  // Close the popup and clean up camera
  const handleClose = () => {
    stopCamera();
    setCapturedPhoto(null);
    setIsOpen(false);
  };

  const handleDeleteLog = (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  // Trigger quick test popup
  const forceTrigger = () => {
    setIsOpen(true);
    // Auto initiate camera if user allows
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 md:p-8 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-mono">
            <Clock className="h-4 w-4 text-orange-400" />
            【TEMPUS_NOW】每小時時光切片日誌
          </h2>
          <p className="text-[10px] text-zinc-550 font-mono uppercase tracking-widest">// ATTENTION WATCHER</p>
        </div>
        
        {/* Timer countdown badge */}
        <div className="px-3 py-1.5 rounded-full bg-zinc-950 border border-zinc-850 text-right flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-zinc-500 font-mono">下一次檢核：</span>
          <span className="text-xs font-bold text-orange-400 font-mono">{formatTime(countdown)}</span>
        </div>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed font-sans font-medium">
        保持對「當下的覺察」是心理學對抗時間盲感的黃金法則。系統每隔 1 小時會跳出拍照檢核提示，督促您記錄當時正在做什麼，以此捕捉您的大腦流失的黑洞時光。
      </p>

      {/* Trigger Simulate button */}
      <div className="flex gap-3">
        <button
          id="simulate-now-btn"
          onClick={forceTrigger}
          className="text-xs px-4 py-2 bg-orange-600/10 border border-orange-500/20 text-orange-400 hover:bg-orange-600 hover:text-white rounded-xl transition font-mono font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Camera className="h-4 w-4" /> 模擬彈出每小時拍照提醒
        </button>
      </div>

      {/* Hourly Grid list logs */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-widest">今日時光切片歷史記錄</h4>
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-zinc-650 text-xs font-mono">
            尚未有任何小時檢核切片。點擊上方模擬，或靜待一小時。
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-zinc-850 bg-zinc-950 p-3.5 flex flex-col justify-between gap-3 text-xs relative group hover:border-zinc-800 transition"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-850 text-[10px] text-zinc-400 font-bold font-mono">
                    ⏰ {log.time}
                  </span>
                  <button
                    id={`delete-hourlog-${log.id}`}
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-1 text-zinc-600 hover:text-rose-450 opacity-0 group-hover:opacity-100 transition rounded hover:bg-rose-500/10"
                    title="刪除切片"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex gap-3 items-center">
                  {log.photoUrl ? (
                    <div className="h-14 w-14 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 relative flex items-center justify-center">
                      <img src={log.photoUrl} alt="Snippet" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-zinc-900/60 border border-dashed border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                  )}
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed font-medium line-clamp-3">
                    {log.activity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hourly Pop-up Dialog Overlay Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-4 animate-in fade-in duration-300">
            {/* Corner Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Custom Butler Warning Header */}
            <div className="flex items-start gap-3.5 bg-orange-600/10 border border-orange-500/25 p-4 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 text-7xl opacity-5 font-bold select-none">{butlerAvatar}</div>
              <span className="text-3xl shrink-0 select-none">{butlerAvatar}</span>
              <div className="space-y-1">
                <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest font-mono">
                  🚨 {butlerName} 敲門檢核中！
                </h3>
                <p className="text-xs text-zinc-200 leading-relaxed font-sans italic">
                  「主人！你剛才這一個小時到底在幹嘛？休想在我的手掌心裡神隱！」
                </p>
              </div>
            </div>

            {/* Camera / written snap panel selector */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                  第一步：抓取工作狀態 (相機拍一張或直接使用文字)
                </label>
                
                {/* Visual Camera Canvas or Placeholder screen */}
                <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950 h-[180px] overflow-hidden flex flex-col items-center justify-center">
                  {capturedPhoto ? (
                    // Show captured snapshot photo
                    <div className="absolute inset-0">
                      <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          setCapturedPhoto(null);
                          startCamera();
                        }}
                        className="absolute bottom-3 right-3 bg-zinc-900 border border-zinc-750 p-2 text-xs text-orange-400 rounded-xl hover:text-white flex items-center gap-1 font-mono transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> 重新拍照
                      </button>
                    </div>
                  ) : isCameraActive ? (
                    // Show Live Camera video feed API
                    <div className="absolute inset-0 flex flex-col">
                      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                        <button
                          onClick={takeSnapshot}
                          className="bg-emerald-500 text-zinc-950 text-xs px-4 py-2 rounded-xl font-bold font-sans hover:bg-emerald-400 flex items-center gap-1.5 transition active:scale-95"
                        >
                          <Camera className="h-3.5 w-3.5" /> 立即按下快門
                        </button>
                        <button
                          onClick={stopCamera}
                          className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-3 py-2 rounded-xl hover:text-white transition"
                        >
                          關閉相機
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Show Camera placeholder screen with start action
                    <div className="text-center p-4 space-y-3">
                      <div className="text-zinc-700 flex justify-center">
                        <CameraOff className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-[11px] text-zinc-400 font-bold">攝像頭目前處於休眠模式</h5>
                        <p className="text-[9px] text-zinc-600 max-w-[280px] mx-auto">
                          點擊下方按鈕啟動前置相機進行現況取證，若無相機權限可直接打字記錄。
                        </p>
                      </div>
                      <button
                        onClick={startCamera}
                        className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 rounded-xl px-4 py-1.5 transition font-semibold font-mono"
                      >
                        📸 啟用視訊取證模式
                      </button>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-x-2 bottom-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-400 font-medium">
                      {cameraError}
                    </div>
                  )}
                </div>
              </div>

              {/* Activity description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                  第二步：誠實回報 (剛剛一小時在忙什麼？)
                </label>
                <textarea
                  id="hourly-activity-textarea"
                  rows={2}
                  className="w-full text-xs bg-zinc-950 border border-zinc-850 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 placeholder-zinc-700 font-sans"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder="例如：我剛才又不受控制地滑了 PTT 和一堆 Reels 短影音，耽誤了 20 分鐘；或是 剛才非常專注在跟行銷對齊下一季簡報。"
                />
              </div>
            </div>

            {/* Actions submit */}
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={handleClose}
                className="text-xs bg-zinc-950 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 px-4 py-2.5 rounded-xl transition"
              >
                稍後檢核
              </button>
              <button
                id="save-checked-log-btn"
                onClick={handleSaveLog}
                disabled={!activity.trim()}
                className={`text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition ${
                  !activity.trim()
                    ? "bg-zinc-850 text-zinc-650 cursor-not-allowed"
                    : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/10 cursor-pointer"
                }`}
              >
                <Check className="h-4 w-4" /> 誠實遞交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
