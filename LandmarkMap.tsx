import React, { useEffect, useState } from "react";
import { Landmark } from "../types";
import { Search, Plus, Compass } from "lucide-react";

interface LandmarkMapProps {
  landmarks: Landmark[];
  selectedLandmarkId: string | null;
  onSelectLandmark: (id: string) => void;
  onMapClickCoords: (lat: number, lng: number) => void;
  onAddLandmarkDirect?: (name: string, emoji: string, desc: string, lat: number, lng: number) => void;
}

export default function LandmarkMap({
  landmarks,
  selectedLandmarkId,
  onSelectLandmark,
  onMapClickCoords,
  onAddLandmarkDirect,
}: LandmarkMapProps) {
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: 24.1506,
    lng: 120.6845, // Default center: NUTC, Taichung
  });
  const [zoom, setZoom] = useState(14);

  // Focus and pan map center when a landmark is selected from parent
  useEffect(() => {
    if (selectedLandmarkId) {
      const selected = landmarks.find((l) => l.id === selectedLandmarkId);
      if (selected && selected.lat && selected.lng) {
        setCenter({ lat: selected.lat, lng: selected.lng });
        setZoom(16);
      }
    }
  }, [selectedLandmarkId, landmarks]);

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 md:p-6 shadow-xl space-y-4">
      {/* Top static information header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-805/60">
        <div className="space-y-0.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-mono">
            <Compass className="h-4 w-4 text-emerald-400" />
            實地定位面盤大腦
          </h3>
          <p className="text-[10px] text-zinc-550">
            🗺️ 目前正在使用：Google Maps 網頁嵌入防衛版 (免金鑰)
          </p>
        </div>
      </div>

      {/* Render Google Maps Embedded (No API Key Required!) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[11px] font-bold text-zinc-350 font-mono whitespace-nowrap">
              Google 網頁嵌入地圖 (免金鑰・高精度 real-world 街景)
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            與 Google Maps 公開端點即時連動
          </span>
        </div>

        <GoogleMapsEmbedComponent
          landmarks={landmarks}
          selectedLandmarkId={selectedLandmarkId}
          onSelectLandmark={onSelectLandmark}
          onAddLandmarkDirect={onAddLandmarkDirect}
          center={center}
          setCenter={setCenter}
          zoom={zoom}
          setZoom={setZoom}
        />
      </div>

      {/* Select Landmark Status Feedback */}
      {selectedLandmarkId && (
        <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-3 flex items-center justify-between text-xs font-sans transition-all">
          {(() => {
            const current = landmarks.find((l) => l.id === selectedLandmarkId);
            if (!current) return null;
            return (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl bg-zinc-900 p-2 rounded-xl border border-zinc-800">{current.emoji}</span>
                  <div>
                    <h5 className="font-bold text-white leading-tight flex items-center gap-1">
                      {current.name}
                    </h5>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5 max-w-[200px] sm:max-w-xs">
                      {current.description || `座標: ${current.lat?.toFixed(5)}, ${current.lng?.toFixed(5)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-extrabold font-mono">
                    已追蹤選取
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// COMPONENT: GOOGLE MAPS EMBEDDED COMPONENT (Free / No Key Google Maps)
// -------------------------------------------------------------------------
function GoogleMapsEmbedComponent({
  landmarks,
  selectedLandmarkId,
  onSelectLandmark,
  onAddLandmarkDirect,
  center,
  setCenter,
  zoom,
  setZoom,
}: {
  landmarks: Landmark[];
  selectedLandmarkId: string | null;
  onSelectLandmark: (id: string) => void;
  onAddLandmarkDirect?: (name: string, emoji: string, desc: string, lat: number, lng: number) => void;
  center: { lat: number; lng: number };
  setCenter: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedSearchResult, setSelectedSearchResult] = useState<any>(null);

  const [placeFormName, setPlaceFormName] = useState("");
  const [placeFormEmoji, setPlaceFormEmoji] = useState("📍");
  const [placeFormDesc, setPlaceFormDesc] = useState("");

  const getEmbedUrl = () => {
    let qString = "";
    if (selectedLandmarkId) {
      const selected = landmarks.find((l) => l.id === selectedLandmarkId);
      if (selected) {
        qString = selected.description || selected.name || `${selected.lat},${selected.lng}`;
      }
    } else if (selectedSearchResult) {
      qString = selectedSearchResult.display_name.split(",")[0] || selectedSearchResult.display_name;
    } else {
      qString = `${center.lat},${center.lng}`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(qString)}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`;
  };

  const handleSearchOSMAddress = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setSelectedSearchResult(null);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery.trim()
      )}&limit=6&accept-language=zh-TW,zh;q=0.9,en`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "TempusArmorDefenseClock/1.0",
        },
      });

      if (!response.ok) {
        throw new Error("Search server response failed");
      }

      const list = await response.json();
      if (list && list.length > 0) {
        setSearchResults(list);
      } else {
        setSearchResults([]);
        setSearchError("找不到該地點，請嘗試輸入更詳細的地址或知名路名。");
      }
    } catch (err: any) {
      console.error(err);
      setSearchError("地址解析系統繁忙中，請稍後再試。");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (p: any) => {
    setSearchResults([]);
    const latVal = parseFloat(p.lat);
    const lngVal = parseFloat(p.lon);

    if (latVal && lngVal) {
      // Clear parent's selection state so map shows the searched address
      onSelectLandmark("");

      const coords = { lat: latVal, lng: lngVal };
      setCenter(coords);
      setZoom(15);
      setSelectedSearchResult(p);

      // Guess details to pre-populate custom place registration
      const titleShort = p.display_name.split(",")[0] || "搜尋定位地標";
      setPlaceFormName(titleShort);
      setPlaceFormEmoji("📍");
      setPlaceFormDesc(p.display_name);
    }
  };

  const handleSaveLandmark = () => {
    if (!placeFormName.trim()) return;

    let targetLat = center.lat;
    let targetLng = center.lng;

    if (selectedSearchResult) {
      targetLat = parseFloat(selectedSearchResult.lat);
      targetLng = parseFloat(selectedSearchResult.lon);
    }

    if (onAddLandmarkDirect) {
      onAddLandmarkDirect(
        placeFormName.trim(),
        placeFormEmoji,
        placeFormDesc.trim() || "自訂時間地表",
        targetLat,
        targetLng
      );
    }

    setSelectedSearchResult(null);
  };

  return (
    <div className="space-y-3 relative h-full flex flex-col">
      {/* Search Input bar */}
      <div className="space-y-1.5 relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-zinc-550 pointer-events-none">
              <Search className="h-3.5 w-3.5" />
            </span>
            <input
              type="text"
              placeholder="搜尋學校、咖啡店、辦公室等... 直接聚焦嵌入地圖"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchOSMAddress();
                }
              }}
              className="w-full bg-zinc-950 border border-zinc-805 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-emerald-500 font-sans transition"
            />
          </div>
          <button
            type="button"
            onClick={handleSearchOSMAddress}
            disabled={isSearching}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2 rounded-xl text-xs font-black font-mono transition flex items-center gap-1.5 shrink-0 select-none cursor-pointer"
          >
            {isSearching ? <span className="animate-spin text-xs">🌀</span> : "SEARCH"}
          </button>
        </div>

        {searchError && (
          <div className="text-[10px] text-rose-450 font-medium px-2 py-1 bg-rose-500/5 rounded-lg border border-rose-500/10">
            {searchError}
          </div>
        )}

        {/* Autocomplete Popup */}
        {searchResults.length > 0 && (
          <div className="absolute top-10 left-0 right-0 bg-zinc-950/98 border border-zinc-800 rounded-xl max-h-[180px] overflow-y-auto p-1.5 divide-y divide-zinc-900 shadow-2xl z-[9999]">
            {searchResults.map((place, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSearchResult(place)}
                className="p-2 hover:bg-zinc-900/60 rounded-lg transition flex justify-between items-center text-xs cursor-pointer text-zinc-200"
              >
                <div className="flex-1 pr-4 min-w-0">
                  <div className="font-bold text-white truncate text-[11px] leading-tight">
                    {place.display_name.split(",")[0] || "搜尋结果"}
                  </div>
                  <div className="text-[9px] text-zinc-500 truncate mt-0.5 leading-relaxed">
                    {place.display_name || "臺灣"}
                  </div>
                </div>
                <span className="text-[8px] bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded-md font-extrabold font-mono border border-emerald-500/20 shrink-0 select-none">
                  定位並查看
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Embedded Iframe Container */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950" style={{ height: "350px" }}>
        <iframe
          title="Google Maps Embed"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={getEmbedUrl()}
        />

        {/* Dynamic add panel if we searched a place */}
        {selectedSearchResult && (
          <div className="absolute bottom-3 left-3 right-3 bg-zinc-950/96 border border-emerald-500/35 rounded-2xl p-4 shadow-2xl z-[1000] space-y-3 font-sans max-w-[340px]">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-[9px] font-black text-emerald-400 font-mono uppercase tracking-widest flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  MAP_EMBED 搜尋定位
                </h4>
                <p className="text-[12px] font-bold text-white mt-1 leading-tight line-clamp-1">
                  {placeFormName || "新常用地點"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSearchResult(null);
                }}
                className="text-zinc-500 hover:text-white text-xs p-1 cursor-pointer transition select-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 font-sans">
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="符號"
                  value={placeFormEmoji}
                  onChange={(e) => setPlaceFormEmoji(e.target.value)}
                  className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 text-center text-xs text-white placeholder-zinc-700 font-sans focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="地名 (例如: 辦公室)"
                  value={placeFormName}
                  onChange={(e) => setPlaceFormName(e.target.value)}
                  className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 px-3 text-xs text-white placeholder-zinc-650 font-sans focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Recommendation Emojis */}
              <div className="flex gap-1 items-center justify-start flex-wrap col-span-4 justify-items-stretch">
                <span className="text-[9px] text-zinc-550 font-mono">推薦符號:</span>
                {["🎒", "☕", "🏢", "🍽️", "🏠", "📍", "🏋️", "🌳"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setPlaceFormEmoji(emoji)}
                    className={`text-[10px] p-0.5 px-1.5 hover:bg-zinc-850 rounded-md border transition cursor-pointer select-none ${
                      placeFormEmoji === emoji
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold"
                        : "bg-zinc-900 border-zinc-850 text-zinc-400"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="備註描述"
                value={placeFormDesc}
                onChange={(e) => setPlaceFormDesc(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 px-3 text-xs text-white placeholder-zinc-700 font-sans focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-1.5 text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedSearchResult(null);
                }}
                className="px-3 py-1.5 text-zinc-400 hover:text-white transition cursor-pointer font-sans"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveLandmark}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl transition flex items-center gap-1 cursor-pointer select-none font-sans shadow-lg shadow-emerald-500/10"
              >
                <Plus className="h-3 w-3 stroke-[3]" /> 直接錄入常用地標
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedLandmarkId && (
        <div className="text-[10px] text-zinc-500 bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex items-center justify-between font-mono">
          <span>ℹ️ 提示: 正使用 Google 全景嵌入瀏覽選定地圖點。</span>
          <button
            type="button"
            onClick={() => {
              const selected = landmarks.find((l) => l.id === selectedLandmarkId);
              if (selected) {
                const query = selected.description || selected.name || `${selected.lat},${selected.lng}`;
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank");
              }
            }}
            className="text-emerald-400 hover:underline hover:text-emerald-300 font-bold cursor-pointer"
          >
            外部瀏覽 ↗
          </button>
        </div>
      )}
    </div>
  );
}
