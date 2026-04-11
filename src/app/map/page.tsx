"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Zone {
  id: string;
  name: string;
  description: string | null;
  ecosystem_type: string;
  climate: string | null;
  creature_count: number;
  plant_count: number;
  color: string;
  icon: string;
}

interface Position {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MapMarker {
  id: string;
  emoji: string;
  label: string;
  x: number;
  y: number;
  size: number; // 1~3
}

// 핵심 요소: 세계수(+주변), 호수(+구역), 저택(+정원) 통합
const CORE_ELEMENTS = [
  { key: "__worldtree", emoji: "🌳", label: "세계수", zoneName: "세계수 주변" },
  { key: "__lake", emoji: "💧", label: "호수", zoneName: "호수 구역" },
  { key: "__mansion", emoji: "🏡", label: "저택", zoneName: "저택 정원" },
];
const CORE_ZONE_NAMES = CORE_ELEMENTS.map((c) => c.zoneName);

const DEFAULT_POSITIONS: Record<string, Position> = {
  __worldtree: { x: 35, y: 28, w: 26, h: 26 },
  __lake: { x: 28, y: 50, w: 28, h: 22 },
  __mansion: { x: 50, y: 5, w: 26, h: 22 },
  "약초 밭": { x: 5, y: 15, w: 18, h: 20 },
  "영수 서식지": { x: 60, y: 60, w: 20, h: 20 },
};

const DEFAULT_MARKERS: MapMarker[] = [
  { id: "m1", emoji: "🌸", label: "벚꽃", x: 75, y: 8, size: 2 },
  { id: "m2", emoji: "🍄", label: "버섯", x: 85, y: 20, size: 2 },
  { id: "m3", emoji: "🦋", label: "나비", x: 88, y: 80, size: 2 },
  { id: "m4", emoji: "🌿", label: "풀", x: 5, y: 45, size: 2 },
  { id: "m5", emoji: "✨", label: "빛", x: 75, y: 30, size: 1 },
  { id: "m6", emoji: "✨", label: "빛", x: 20, y: 68, size: 1 },
];

const MARKER_EMOJIS = ["🌸", "🍄", "🦋", "🌿", "✨", "🌺", "🍀", "🐦", "🌻", "💎", "🔮", "🕯️", "🪴", "🌾", "🍃", "🐝", "🐛", "🦌", "🐿️", "🦉", "⭐", "🌙", "🔥", "❄️", "💫", "🪨", "🏵️"];

const MIN_SIZE = 8;

function loadPositions(): Record<string, Position> {
  if (typeof window === "undefined") return DEFAULT_POSITIONS;
  try {
    const saved = localStorage.getItem("garden_map_positions");
    if (saved) return { ...DEFAULT_POSITIONS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_POSITIONS };
}

function savePositions(positions: Record<string, Position>) {
  localStorage.setItem("garden_map_positions", JSON.stringify(positions));
  supabase.from("garden_settings").upsert(
    { key: "zone_positions", value: JSON.stringify(positions), description: "맵 구역 위치 데이터" },
    { onConflict: "key" }
  ).then(() => {});
}

function loadMarkers(): MapMarker[] {
  if (typeof window === "undefined") return DEFAULT_MARKERS;
  try {
    const saved = localStorage.getItem("garden_map_markers");
    if (saved) return JSON.parse(saved);
  } catch {}
  return [...DEFAULT_MARKERS];
}

function saveMarkers(markers: MapMarker[]) {
  localStorage.setItem("garden_map_markers", JSON.stringify(markers));
  supabase.from("garden_settings").upsert(
    { key: "map_markers", value: JSON.stringify(markers), description: "맵 장식 마커 데이터" },
    { onConflict: "key" }
  ).then(() => {});
}

type DragMode = "move" | "resize-tl" | "resize-tr" | "resize-bl" | "resize-br" | "resize-t" | "resize-b" | "resize-l" | "resize-r";

export default function MapPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null); // zone name or core key
  const [positions, setPositions] = useState<Record<string, Position>>(DEFAULT_POSITIONS);
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>("move");
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState<Position>({ x: 0, y: 0, w: 0, h: 0 });
  const mapRef = useRef<HTMLDivElement>(null);

  // 줌 & 팬
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });
  const [mapSize, setMapSize] = useState(100);

  // 구역 합치기
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);

  // 마커 (범례/장식)
  const [markers, setMarkers] = useState<MapMarker[]>(DEFAULT_MARKERS);
  const [showMarkerForm, setShowMarkerForm] = useState(false);
  const [markerForm, setMarkerForm] = useState({ emoji: "🌸", label: "", size: 2 });
  const [draggingMarker, setDraggingMarker] = useState<string | null>(null);
  const [markerDragStart, setMarkerDragStart] = useState({ x: 0, y: 0, mx: 0, my: 0 });

  useEffect(() => {
    async function fetchData() {
      const [zonesRes, settingsRes, sizeRes, markersRes] = await Promise.all([
        supabase.from("zones").select("*"),
        supabase.from("garden_settings").select("*").eq("key", "zone_positions").single(),
        supabase.from("garden_settings").select("*").eq("key", "map_size").single(),
        supabase.from("garden_settings").select("*").eq("key", "map_markers").single(),
      ]);
      setZones((zonesRes.data as Zone[]) || []);

      if (settingsRes.data?.value) {
        try {
          const saved = JSON.parse(settingsRes.data.value);
          setPositions({ ...DEFAULT_POSITIONS, ...saved });
          localStorage.setItem("garden_map_positions", JSON.stringify(saved));
        } catch { setPositions(loadPositions()); }
      } else {
        setPositions(loadPositions());
      }

      if (sizeRes.data?.value) {
        try { setMapSize(JSON.parse(sizeRes.data.value)); } catch {}
      }

      if (markersRes.data?.value) {
        try { setMarkers(JSON.parse(markersRes.data.value)); } catch { setMarkers(loadMarkers()); }
      } else {
        setMarkers(loadMarkers());
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  // 핵심이 아닌 일반 구역만
  const regularZones = zones.filter((z) => !CORE_ZONE_NAMES.includes(z.name));
  // 핵심 구역의 Zone 데이터 (있으면)
  const getCoreZone = (zoneName: string) => zones.find((z) => z.name === zoneName);

  const getPos = useCallback(
    (key: string): Position => {
      if (positions[key]) return positions[key];
      const idx = regularZones.filter((z) => !positions[z.name]).indexOf(regularZones.find((z) => z.name === key)!);
      return { x: 10 + (idx % 4) * 22, y: 80, w: 16, h: 14 };
    },
    [positions, regularZones]
  );

  // 드래그
  const handleMouseDown = useCallback(
    (key: string, e: React.MouseEvent, mode: DragMode = "move") => {
      if (!editMode || !mapRef.current) return;
      e.preventDefault(); e.stopPropagation();
      const rect = mapRef.current.getBoundingClientRect();
      setDragStart({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
      setDragStartPos({ ...getPos(key) });
      setDragMode(mode);
      setDragging(key);
    },
    [editMode, getPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({ x: panStartOffset.x + e.clientX - panStart.x, y: panStartOffset.y + e.clientY - panStart.y });
        return;
      }

      // 마커 드래그
      if (draggingMarker && mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        setMarkers((prev) => prev.map((m) => m.id === draggingMarker ? { ...m, x, y } : m));
        return;
      }

      if (!dragging || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const mouseXPct = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseYPct = ((e.clientY - rect.top) / rect.height) * 100;
      const dx = mouseXPct - dragStart.x;
      const dy = mouseYPct - dragStart.y;
      const sp = dragStartPos;

      if (dragMode === "move") {
        setPositions((prev) => ({
          ...prev,
          [dragging]: { ...sp, x: Math.max(0, Math.min(100 - sp.w, sp.x + dx)), y: Math.max(0, Math.min(100 - sp.h, sp.y + dy)) },
        }));
      } else {
        let { x, y, w, h } = sp;
        if (dragMode.includes("r") && !dragMode.includes("l")) w = Math.max(MIN_SIZE, Math.min(100 - x, sp.w + dx));
        if (dragMode.includes("l") && dragMode !== "resize-bl") {
          const newX = Math.max(0, sp.x + dx);
          w = Math.max(MIN_SIZE, sp.w - (newX - sp.x));
          if (w > MIN_SIZE) x = newX;
        }
        if (dragMode === "resize-bl") {
          const newX = Math.max(0, sp.x + dx);
          w = Math.max(MIN_SIZE, sp.w - (newX - sp.x));
          if (w > MIN_SIZE) x = newX;
          h = Math.max(MIN_SIZE, Math.min(100 - y, sp.h + dy));
        }
        if (dragMode.includes("b") && dragMode !== "resize-bl") h = Math.max(MIN_SIZE, Math.min(100 - y, sp.h + dy));
        if (dragMode.includes("t")) {
          const newY = Math.max(0, sp.y + dy);
          h = Math.max(MIN_SIZE, sp.h - (newY - sp.y));
          if (h > MIN_SIZE) y = newY;
        }
        setPositions((prev) => ({ ...prev, [dragging]: { x, y, w, h } }));
      }
    },
    [dragging, dragMode, dragStart, dragStartPos, isPanning, panStart, panStartOffset, draggingMarker]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) { setIsPanning(false); return; }
    if (draggingMarker) { setDraggingMarker(null); saveMarkers(markers); return; }
    if (dragging) { setDragging(null); savePositions(positions); }
  }, [dragging, positions, isPanning, draggingMarker, markers]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.3, Math.min(5, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  const handleMapMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.pannable === "true") {
        if (editMode && !dragging) {
          setIsPanning(true);
          setPanStart({ x: e.clientX, y: e.clientY });
          setPanStartOffset({ ...pan });
        }
      }
    },
    [editMode, dragging, pan]
  );

  const resetPositions = () => { setPositions({ ...DEFAULT_POSITIONS }); savePositions({ ...DEFAULT_POSITIONS }); };
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const saveMapSize = (size: number) => {
    setMapSize(size);
    supabase.from("garden_settings").upsert({ key: "map_size", value: JSON.stringify(size), description: "맵 캔버스 크기" }, { onConflict: "key" }).then(() => {});
  };

  // 합치기
  const toggleMergeSelect = (zoneId: string) => {
    setMergeSelection((prev) => prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]);
  };

  const executeMerge = async () => {
    if (mergeSelection.length < 2) return;
    const selectedZones = zones.filter((z) => mergeSelection.includes(z.id));
    const primary = selectedZones[0];
    const others = selectedZones.slice(1);
    const totalCreatures = selectedZones.reduce((s, z) => s + z.creature_count, 0);
    const totalPlants = selectedZones.reduce((s, z) => s + z.plant_count, 0);
    const allPos = selectedZones.map((z) => getPos(z.name));
    const minX = Math.min(...allPos.map((p) => p.x));
    const minY = Math.min(...allPos.map((p) => p.y));
    const maxX = Math.max(...allPos.map((p) => p.x + p.w));
    const maxY = Math.max(...allPos.map((p) => p.y + p.h));

    await supabase.from("zones").update({ creature_count: totalCreatures, plant_count: totalPlants, description: `${primary.description || ""} [합병: ${others.map((z) => z.name).join(", ")}]`.trim() }).eq("id", primary.id);
    for (const other of others) {
      await supabase.from("creatures").update({ zone_id: primary.id }).eq("zone_id", other.id);
      await supabase.from("byproducts").update({ source_zone_id: primary.id }).eq("source_zone_id", other.id);
      await supabase.from("zones").delete().eq("id", other.id);
    }
    const newPositions = { ...positions };
    newPositions[primary.name] = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    others.forEach((z) => delete newPositions[z.name]);
    setPositions(newPositions);
    savePositions(newPositions);
    setMergeMode(false);
    setMergeSelection([]);
    const { data } = await supabase.from("zones").select("*").order("created_at");
    setZones((data as Zone[]) || []);
  };

  // 마커 추가/삭제
  const addMarker = () => {
    if (!markerForm.emoji) return;
    const newMarker: MapMarker = {
      id: Date.now().toString(),
      emoji: markerForm.emoji,
      label: markerForm.label || markerForm.emoji,
      x: 50,
      y: 50,
      size: markerForm.size,
    };
    const updated = [...markers, newMarker];
    setMarkers(updated);
    saveMarkers(updated);
    setShowMarkerForm(false);
    setMarkerForm({ emoji: "🌸", label: "", size: 2 });
  };

  const deleteMarker = (id: string) => {
    const updated = markers.filter((m) => m.id !== id);
    setMarkers(updated);
    saveMarkers(updated);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><p className="text-foreground/50">맵 데이터를 불러오는 중...</p></div>;
  }

  const isSpecialMode = mergeMode;

  // 선택된 구역/핵심 정보
  const getSelectedInfo = () => {
    if (!selectedZone) return null;
    const core = CORE_ELEMENTS.find((c) => c.key === selectedZone);
    if (core) {
      const coreZ = getCoreZone(core.zoneName);
      return { icon: core.emoji, name: core.label, ecosystem: coreZ?.ecosystem_type || "-", climate: coreZ?.climate || "-", description: coreZ?.description, plantCount: coreZ?.plant_count || 0, creatureCount: coreZ?.creature_count || 0, color: coreZ?.color || "#4ade80" };
    }
    const zone = zones.find((z) => z.name === selectedZone);
    if (zone) return { icon: zone.icon, name: zone.name, ecosystem: zone.ecosystem_type, climate: zone.climate, description: zone.description, plantCount: zone.plant_count, creatureCount: zone.creature_count, color: zone.color };
    return null;
  };

  const sizeClass = (s: number) => s === 1 ? "text-sm" : s === 3 ? "text-2xl" : "text-lg";

  // 리사이즈 핸들
  const renderResizeHandles = (key: string) => {
    if (!editMode || isSpecialMode) return null;
    const hc = "absolute z-50 bg-accent border-2 border-white rounded-sm shadow";
    const sz = 10;
    return (
      <>
        <div className={hc} style={{ top: -sz/2, left: -sz/2, width: sz, height: sz, cursor: "nw-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-tl")} />
        <div className={hc} style={{ top: -sz/2, right: -sz/2, width: sz, height: sz, cursor: "ne-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-tr")} />
        <div className={hc} style={{ bottom: -sz/2, left: -sz/2, width: sz, height: sz, cursor: "sw-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-bl")} />
        <div className={hc} style={{ bottom: -sz/2, right: -sz/2, width: sz, height: sz, cursor: "se-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-br")} />
        <div className={hc} style={{ top: -sz/2, left: "50%", marginLeft: -sz/2, width: sz, height: sz, cursor: "n-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-t")} />
        <div className={hc} style={{ bottom: -sz/2, left: "50%", marginLeft: -sz/2, width: sz, height: sz, cursor: "s-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-b")} />
        <div className={hc} style={{ top: "50%", left: -sz/2, marginTop: -sz/2, width: sz, height: sz, cursor: "w-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-l")} />
        <div className={hc} style={{ top: "50%", right: -sz/2, marginTop: -sz/2, width: sz, height: sz, cursor: "e-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-r")} />
      </>
    );
  };

  const selectedInfo = getSelectedInfo();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🗺️ 정원 맵</h1>
          <p className="text-foreground/50 text-sm mt-1">
            {mergeMode ? "합칠 구역을 2개 이상 선택한 후 합치기를 누르세요"
              : editMode ? "구역을 드래그하여 이동, 모서리를 드래그하여 크기 조절"
              : "세계수와 호수를 중심으로 구역을 시각적으로 확인합니다"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {mergeMode ? (
            <>
              <button onClick={executeMerge} disabled={mergeSelection.length < 2}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${mergeSelection.length >= 2 ? "bg-accent text-white hover:bg-accent/80" : "bg-card border border-border text-foreground/30 cursor-not-allowed"}`}>
                🔗 합치기 ({mergeSelection.length}개)
              </button>
              <button onClick={() => { setMergeMode(false); setMergeSelection([]); }}
                className="px-4 py-2 bg-card border border-border text-foreground/70 rounded-lg text-sm font-medium hover:bg-card-hover">취소</button>
            </>
          ) : (
            <>
              {editMode && (
                <>
                  <button onClick={() => { setMergeMode(true); setMergeSelection([]); }}
                    className="px-4 py-2 bg-info/20 text-info rounded-lg text-sm font-medium hover:bg-info/30">🔗 구역 합치기</button>
                  <button onClick={resetPositions}
                    className="px-4 py-2 bg-danger/20 text-danger rounded-lg text-sm font-medium hover:bg-danger/30">초기화</button>
                </>
              )}
              <button onClick={() => setEditMode(!editMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${editMode ? "bg-accent text-white" : "bg-card border border-border text-foreground/70 hover:bg-card-hover"}`}>
                {editMode ? "✓ 편집 완료" : "✏️ 위치 편집"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 줌 & 맵 크기 컨트롤 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-1.5">
          <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))} className="w-7 h-7 flex items-center justify-center rounded hover:bg-card-hover text-sm font-bold">−</button>
          <span className="text-xs text-foreground/60 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(5, z + 0.2))} className="w-7 h-7 flex items-center justify-center rounded hover:bg-card-hover text-sm font-bold">+</button>
          <button onClick={resetView} className="ml-1 px-2 py-1 text-xs text-foreground/50 hover:text-foreground rounded hover:bg-card-hover">맞춤</button>
        </div>
        <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-1.5">
          <span className="text-xs text-foreground/60">맵 크기:</span>
          <button onClick={() => saveMapSize(Math.max(50, mapSize - 25))} className="w-7 h-7 flex items-center justify-center rounded hover:bg-card-hover text-sm font-bold">−</button>
          <span className="text-xs text-foreground/60 min-w-[3rem] text-center">{mapSize}%</span>
          <button onClick={() => saveMapSize(mapSize + 25)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-card-hover text-sm font-bold">+</button>
          <button onClick={() => saveMapSize(100)} className="ml-1 px-2 py-1 text-xs text-foreground/50 hover:text-foreground rounded hover:bg-card-hover">기본</button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 맵 뷰포트 */}
        <div
          className={`relative rounded-2xl border-2 overflow-hidden flex-1 ${editMode ? "border-accent border-dashed" : "border-border"}`}
          style={{ minHeight: "560px", cursor: isPanning ? "grabbing" : editMode ? "grab" : "default" }}
          onWheel={handleWheel} onMouseDown={handleMapMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        >
          <div ref={mapRef} className="absolute origin-top-left"
            style={{ width: `${mapSize}%`, height: `${mapSize}%`, minWidth: "560px", minHeight: "560px", transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, userSelect: "none", position: "relative" }}
            data-pannable="true"
          >
            {/* 배경 */}
            <div className="absolute inset-0" data-pannable="true"
              style={{ background: "radial-gradient(ellipse at 50% 50%, #d4f5e0 0%, #b8e6cc 30%, #a3d9b8 60%, #8ecba5 100%)" }} />

            {/* 울타리 */}
            <div className="absolute inset-3 rounded-xl border-4 border-dashed pointer-events-none" style={{ borderColor: "#8B7355" }} />

            {/* 편집 안내 */}
            {editMode && !isSpecialMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full text-xs font-medium pointer-events-none"
                style={{ background: "rgba(74,168,216,0.9)", color: "white" }}>
                드래그: 이동 · 모서리: 크기 조절 · 장식도 드래그 가능
              </div>
            )}
            {mergeMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full text-xs font-medium pointer-events-none"
                style={{ background: "rgba(59,130,246,0.9)", color: "white" }}>
                합칠 구역을 클릭하여 선택하세요
              </div>
            )}

            {/* 핵심 요소: 세계수, 호수, 저택 (각각 구역 통합) */}
            {CORE_ELEMENTS.map((core) => {
              const pos = getPos(core.key);
              const coreZ = getCoreZone(core.zoneName);
              const isLake = core.key === "__lake";
              return (
                <div
                  key={core.key}
                  className={`absolute flex flex-col items-center justify-center ${isLake ? "z-0" : "z-10"} ${editMode && !isSpecialMode ? "cursor-grab active:cursor-grabbing" : !isSpecialMode ? "cursor-pointer hover:shadow-lg" : ""} ${dragging === core.key ? "opacity-70" : ""} ${selectedZone === core.key && !editMode ? "ring-4 ring-accent shadow-xl" : ""}`}
                  style={{
                    top: `${pos.y}%`, left: `${pos.x}%`, width: `${pos.w}%`, height: `${pos.h}%`,
                    ...(isLake ? {
                      background: "radial-gradient(ellipse, rgba(96,185,235,0.5) 0%, rgba(96,185,235,0.15) 70%, transparent 100%)",
                      borderRadius: "50%",
                    } : {
                      background: coreZ ? `${coreZ.color}25` : "rgba(255,255,255,0.2)",
                      borderRadius: "16px",
                      border: `2px solid ${coreZ?.color || "#8ecba5"}50`,
                    }),
                    transition: dragging === core.key ? "none" : "box-shadow 0.2s",
                  }}
                  onMouseDown={(e) => {
                    if (isSpecialMode) return;
                    if (editMode) handleMouseDown(core.key, e);
                    else setSelectedZone(core.key);
                  }}
                >
                  <span className={core.key === "__worldtree" ? "text-6xl drop-shadow-lg" : core.key === "__mansion" ? "text-4xl drop-shadow" : "text-3xl opacity-70"}>
                    {core.emoji}
                  </span>
                  <span className="text-xs font-bold mt-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.85)", color: "#1e3a5f" }}>
                    {core.label}
                  </span>
                  {coreZ && (
                    <span className="text-[10px] opacity-50 mt-0.5" style={{ color: "#1e3a5f" }}>{coreZ.ecosystem_type}</span>
                  )}
                  {renderResizeHandles(core.key)}
                </div>
              );
            })}

            {/* 일반 구역들 (핵심 구역 제외) */}
            {regularZones.map((zone) => {
              const pos = getPos(zone.name);
              const isMergeSelected = mergeSelection.includes(zone.id);
              return (
                <div
                  key={zone.id}
                  className={`absolute z-20 rounded-xl border-2 flex flex-col items-center justify-center transition-shadow ${
                    mergeMode ? "cursor-pointer" : editMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer hover:scale-105"
                  } ${selectedZone === zone.name && !editMode && !mergeMode ? "ring-4 ring-accent shadow-xl" : ""} ${
                    isMergeSelected ? "ring-4 ring-blue-500 shadow-xl" : ""
                  } ${dragging === zone.name ? "opacity-70 shadow-2xl" : "hover:shadow-lg"}`}
                  style={{
                    top: `${pos.y}%`, left: `${pos.x}%`, width: `${pos.w}%`, height: `${pos.h}%`,
                    background: isMergeSelected ? `${zone.color}60` : `${zone.color}30`,
                    borderColor: isMergeSelected ? "#3b82f6" : zone.color,
                    transition: dragging === zone.name ? "none" : "box-shadow 0.2s, transform 0.2s",
                  }}
                  onMouseDown={(e) => {
                    if (mergeMode) { e.preventDefault(); e.stopPropagation(); toggleMergeSelect(zone.id); }
                    else if (editMode) handleMouseDown(zone.name, e);
                    else setSelectedZone(zone.name);
                  }}
                >
                  {isMergeSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-30">✓</div>
                  )}
                  <span className="text-2xl">{zone.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: "#1e3a5f" }}>{zone.name}</span>
                  <span className="text-[10px] opacity-60" style={{ color: "#1e3a5f" }}>{zone.ecosystem_type}</span>
                  {renderResizeHandles(zone.name)}
                </div>
              );
            })}

            {/* 마커 (장식) */}
            {markers.map((marker) => (
              <div
                key={marker.id}
                className={`absolute ${sizeClass(marker.size)} ${editMode ? "cursor-grab active:cursor-grabbing" : ""} ${draggingMarker === marker.id ? "opacity-60 scale-125" : ""}`}
                style={{ top: `${marker.y}%`, left: `${marker.x}%`, transform: "translate(-50%, -50%)", opacity: editMode ? 0.8 : 0.4, transition: draggingMarker === marker.id ? "none" : "opacity 0.2s" }}
                title={marker.label}
                onMouseDown={(e) => {
                  if (!editMode) return;
                  e.preventDefault(); e.stopPropagation();
                  setDraggingMarker(marker.id);
                }}
              >
                {marker.emoji}
                {editMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMarker(marker.id); }}
                    className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center hover:bg-red-600"
                  >✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 사이드 패널 */}
        <div className="w-72 shrink-0">
          {selectedInfo && !editMode && !isSpecialMode ? (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{selectedInfo.icon}</span>
                <div>
                  <h3 className="font-bold text-lg">{selectedInfo.name}</h3>
                  <p className="text-xs text-foreground/50">{selectedInfo.ecosystem} · {selectedInfo.climate}</p>
                </div>
              </div>
              {selectedInfo.description && <p className="text-sm text-foreground/70 mb-4">{selectedInfo.description}</p>}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-foreground/60">🌱 식물</span>
                  <span className="font-semibold">{selectedInfo.plantCount}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-foreground/60">🦊 생물</span>
                  <span className="font-semibold">{selectedInfo.creatureCount}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-foreground/60">🎨 색상</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-border" style={{ background: selectedInfo.color }} />
                    <span className="text-xs text-foreground/40">{selectedInfo.color}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-5 text-center text-foreground/40">
              <span className="text-3xl block mb-3">{mergeMode ? "🔗" : editMode ? "✏️" : "👆"}</span>
              <p className="text-sm whitespace-pre-line">
                {mergeMode ? "합칠 구역을 2개 이상 클릭하세요.\n첫 번째 선택한 구역에 나머지가 합쳐집니다."
                  : editMode ? "드래그: 이동\n모서리/변: 크기 조절\n장식: 드래그로 이동, ✕로 삭제"
                  : "맵에서 구역을 클릭하면\n상세 정보가 표시됩니다"}
              </p>
            </div>
          )}

          {/* 장식 마커 관리 */}
          <div className="bg-card rounded-xl border border-border p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">🎨 장식 (범례)</h4>
              <button
                onClick={() => setShowMarkerForm(!showMarkerForm)}
                className="text-xs px-2 py-1 bg-accent/20 text-accent rounded hover:bg-accent/30"
              >
                {showMarkerForm ? "취소" : "+ 추가"}
              </button>
            </div>

            {showMarkerForm && (
              <div className="mb-3 p-3 bg-background rounded-lg border border-border space-y-2">
                <div>
                  <label className="text-[10px] text-foreground/50 block mb-1">아이콘</label>
                  <div className="flex flex-wrap gap-1">
                    {MARKER_EMOJIS.map((e) => (
                      <button key={e} onClick={() => setMarkerForm({ ...markerForm, emoji: e })}
                        className={`text-lg p-0.5 rounded ${markerForm.emoji === e ? "bg-accent/30 ring-1 ring-accent" : "hover:bg-card-hover"}`}>{e}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-foreground/50 block mb-1">라벨</label>
                  <input type="text" value={markerForm.label} onChange={(e) => setMarkerForm({ ...markerForm, label: e.target.value })}
                    placeholder="이름 (선택)" className="w-full text-xs bg-card border border-border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="text-[10px] text-foreground/50 block mb-1">크기</label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((s) => (
                      <button key={s} onClick={() => setMarkerForm({ ...markerForm, size: s })}
                        className={`text-xs px-2 py-1 rounded ${markerForm.size === s ? "bg-accent text-white" : "bg-card-hover"}`}>
                        {s === 1 ? "소" : s === 2 ? "중" : "대"}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={addMarker} className="w-full text-xs py-1.5 bg-accent text-white rounded hover:bg-accent/80">추가</button>
              </div>
            )}

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {markers.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-card-hover">
                  <span><span className="mr-1">{m.emoji}</span> {m.label}</span>
                  <button onClick={() => deleteMarker(m.id)} className="text-danger/60 hover:text-danger text-[10px]">삭제</button>
                </div>
              ))}
              {markers.length === 0 && <p className="text-[10px] text-foreground/30 text-center py-2">장식이 없습니다</p>}
            </div>
          </div>

          {/* 범례 */}
          <div className="bg-card rounded-xl border border-border p-4 mt-4">
            <h4 className="text-sm font-semibold mb-3">범례</h4>
            <div className="space-y-2 text-xs">
              {CORE_ELEMENTS.map((c) => (
                <div key={c.key} className="flex items-center gap-2">
                  <span>{c.emoji}</span> <span className="text-foreground/60">{c.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border-2 border-dashed" style={{ borderColor: "#8B7355" }} />
                <span className="text-foreground/60">울타리</span>
              </div>
              {regularZones.map((z) => (
                <div key={z.id} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: z.color }} />
                  <span className="text-foreground/60">{z.icon} {z.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
