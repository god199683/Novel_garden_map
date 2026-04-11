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

const DEFAULT_POSITIONS: Record<string, Position> = {
  "세계수 주변": { x: 35, y: 30, w: 22, h: 22 },
  "호수 구역": { x: 30, y: 55, w: 20, h: 18 },
  "저택 정원": { x: 55, y: 10, w: 22, h: 20 },
  "약초 밭": { x: 10, y: 15, w: 18, h: 20 },
  "영수 서식지": { x: 60, y: 60, w: 20, h: 20 },
  __worldtree: { x: 43, y: 33, w: 14, h: 18 },
  __lake: { x: 38, y: 50, w: 24, h: 16 },
  __mansion: { x: 40, y: 3, w: 20, h: 12 },
};

const MIN_SIZE = 8; // 최소 크기 (%)

function loadPositions(): Record<string, Position> {
  if (typeof window === "undefined") return DEFAULT_POSITIONS;
  try {
    const saved = localStorage.getItem("garden_map_positions");
    if (saved) {
      return { ...DEFAULT_POSITIONS, ...JSON.parse(saved) };
    }
  } catch {}
  return { ...DEFAULT_POSITIONS };
}

function savePositions(positions: Record<string, Position>) {
  localStorage.setItem("garden_map_positions", JSON.stringify(positions));
  supabase
    .from("garden_settings")
    .upsert(
      { key: "zone_positions", value: JSON.stringify(positions), description: "맵 구역 위치 데이터" },
      { onConflict: "key" }
    )
    .then(() => {});
}

type DragMode = "move" | "resize-tl" | "resize-tr" | "resize-bl" | "resize-br" | "resize-t" | "resize-b" | "resize-l" | "resize-r";

export default function MapPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
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
  // 맵 캔버스 크기 (기본 100%, 확장 가능)
  const [mapSize, setMapSize] = useState(100);

  // 구역 합치기
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [zonesRes, settingsRes] = await Promise.all([
        supabase.from("zones").select("*"),
        supabase.from("garden_settings").select("*").eq("key", "zone_positions").single(),
      ]);
      setZones((zonesRes.data as Zone[]) || []);

      if (settingsRes.data?.value) {
        try {
          const saved = JSON.parse(settingsRes.data.value);
          setPositions({ ...DEFAULT_POSITIONS, ...saved });
          localStorage.setItem("garden_map_positions", JSON.stringify(saved));
        } catch {
          setPositions(loadPositions());
        }
      } else {
        setPositions(loadPositions());
      }

      // 맵 크기 로드
      const sizeRes = await supabase.from("garden_settings").select("*").eq("key", "map_size").single();
      if (sizeRes.data?.value) {
        try {
          setMapSize(JSON.parse(sizeRes.data.value));
        } catch {}
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  const getPos = useCallback(
    (key: string): Position => {
      if (positions[key]) return positions[key];
      const idx = zones.filter((z) => !positions[z.name]).indexOf(zones.find((z) => z.name === key)!);
      return { x: 10 + (idx % 4) * 22, y: 80, w: 16, h: 14 };
    },
    [positions, zones]
  );

  // --- 드래그 (이동 + 리사이즈) ---
  const handleMouseDown = useCallback(
    (key: string, e: React.MouseEvent, mode: DragMode = "move") => {
      if (!editMode || !mapRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = mapRef.current.getBoundingClientRect();
      const mouseXPct = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseYPct = ((e.clientY - rect.top) / rect.height) * 100;
      setDragStart({ x: mouseXPct, y: mouseYPct });
      setDragStartPos({ ...getPos(key) });
      setDragMode(mode);
      setDragging(key);
    },
    [editMode, getPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // 팬 처리
      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setPan({ x: panStartOffset.x + dx, y: panStartOffset.y + dy });
        return;
      }

      if (!dragging || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const mouseXPct = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseYPct = ((e.clientY - rect.top) / rect.height) * 100;
      const dx = mouseXPct - dragStart.x;
      const dy = mouseYPct - dragStart.y;
      const sp = dragStartPos;

      let newPos: Position;

      if (dragMode === "move") {
        newPos = {
          ...sp,
          x: Math.max(0, Math.min(100 - sp.w, sp.x + dx)),
          y: Math.max(0, Math.min(100 - sp.h, sp.y + dy)),
        };
      } else {
        // 리사이즈
        let { x, y, w, h } = sp;
        if (dragMode.includes("r") && !dragMode.includes("l")) {
          // 오른쪽
          w = Math.max(MIN_SIZE, Math.min(100 - x, sp.w + dx));
        }
        if (dragMode.includes("l") && dragMode !== "resize-bl") {
          // 왼쪽 (tl, l)
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
        if (dragMode.includes("b") && dragMode !== "resize-bl") {
          h = Math.max(MIN_SIZE, Math.min(100 - y, sp.h + dy));
        }
        if (dragMode.includes("t")) {
          const newY = Math.max(0, sp.y + dy);
          h = Math.max(MIN_SIZE, sp.h - (newY - sp.y));
          if (h > MIN_SIZE) y = newY;
        }
        newPos = { x, y, w, h };
      }

      setPositions((prev) => ({ ...prev, [dragging]: newPos }));
    },
    [dragging, dragMode, dragStart, dragStartPos, isPanning, panStart, panStartOffset]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (dragging) {
      setDragging(null);
      savePositions(positions);
    }
  }, [dragging, positions, isPanning]);

  // 줌 (마우스 휠)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.3, Math.min(5, prev + delta)));
    },
    []
  );

  // 빈 공간 클릭 시 팬 시작
  const handleMapMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // 맵 배경을 직접 클릭했을 때만 팬
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

  const resetPositions = () => {
    setPositions({ ...DEFAULT_POSITIONS });
    savePositions({ ...DEFAULT_POSITIONS });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const saveMapSize = (size: number) => {
    setMapSize(size);
    supabase
      .from("garden_settings")
      .upsert({ key: "map_size", value: JSON.stringify(size), description: "맵 캔버스 크기" }, { onConflict: "key" })
      .then(() => {});
  };

  // 구역 합치기
  const toggleMergeSelect = (zoneId: string) => {
    setMergeSelection((prev) =>
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  };

  const executeMerge = async () => {
    if (mergeSelection.length < 2) return;
    const selectedZones = zones.filter((z) => mergeSelection.includes(z.id));
    const primary = selectedZones[0];
    const others = selectedZones.slice(1);

    // 합산
    const totalCreatures = selectedZones.reduce((s, z) => s + z.creature_count, 0);
    const totalPlants = selectedZones.reduce((s, z) => s + z.plant_count, 0);

    // 위치: 선택된 구역들의 바운딩 박스
    const allPos = selectedZones.map((z) => getPos(z.name));
    const minX = Math.min(...allPos.map((p) => p.x));
    const minY = Math.min(...allPos.map((p) => p.y));
    const maxX = Math.max(...allPos.map((p) => p.x + p.w));
    const maxY = Math.max(...allPos.map((p) => p.y + p.h));

    // primary 구역 업데이트
    await supabase
      .from("zones")
      .update({
        creature_count: totalCreatures,
        plant_count: totalPlants,
        description: `${primary.description || ""} [합병: ${others.map((z) => z.name).join(", ")}]`.trim(),
      })
      .eq("id", primary.id);

    // 나머지 구역의 동식물을 primary로 이전 (creatures, byproducts)
    for (const other of others) {
      await supabase.from("creatures").update({ zone_id: primary.id }).eq("zone_id", other.id);
      await supabase.from("byproducts").update({ source_zone_id: primary.id }).eq("source_zone_id", other.id);
      await supabase.from("zones").delete().eq("id", other.id);
    }

    // 위치 업데이트
    const newPositions = { ...positions };
    newPositions[primary.name] = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    others.forEach((z) => delete newPositions[z.name]);
    setPositions(newPositions);
    savePositions(newPositions);

    // 리셋
    setMergeMode(false);
    setMergeSelection([]);

    // 데이터 새로고침
    const { data } = await supabase.from("zones").select("*").order("created_at");
    setZones((data as Zone[]) || []);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-foreground/50">맵 데이터를 불러오는 중...</p>
      </div>
    );
  }

  const worldtree = getPos("__worldtree");
  const lake = getPos("__lake");
  const mansion = getPos("__mansion");

  // 리사이즈 핸들 렌더러
  const renderResizeHandles = (key: string) => {
    if (!editMode) return null;
    const handleClass = "absolute z-50 bg-accent border-2 border-white rounded-sm shadow";
    const sz = 10;
    return (
      <>
        {/* 꼭짓점 */}
        <div className={handleClass} style={{ top: -sz / 2, left: -sz / 2, width: sz, height: sz, cursor: "nw-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-tl")} />
        <div className={handleClass} style={{ top: -sz / 2, right: -sz / 2, width: sz, height: sz, cursor: "ne-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-tr")} />
        <div className={handleClass} style={{ bottom: -sz / 2, left: -sz / 2, width: sz, height: sz, cursor: "sw-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-bl")} />
        <div className={handleClass} style={{ bottom: -sz / 2, right: -sz / 2, width: sz, height: sz, cursor: "se-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-br")} />
        {/* 변 */}
        <div className={handleClass} style={{ top: -sz / 2, left: "50%", marginLeft: -sz / 2, width: sz, height: sz, cursor: "n-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-t")} />
        <div className={handleClass} style={{ bottom: -sz / 2, left: "50%", marginLeft: -sz / 2, width: sz, height: sz, cursor: "s-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-b")} />
        <div className={handleClass} style={{ top: "50%", left: -sz / 2, marginTop: -sz / 2, width: sz, height: sz, cursor: "w-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-l")} />
        <div className={handleClass} style={{ top: "50%", right: -sz / 2, marginTop: -sz / 2, width: sz, height: sz, cursor: "e-resize" }} onMouseDown={(e) => handleMouseDown(key, e, "resize-r")} />
      </>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🗺️ 정원 맵</h1>
          <p className="text-foreground/50 text-sm mt-1">
            {mergeMode
              ? "합칠 구역을 2개 이상 선택한 후 합치기를 누르세요"
              : editMode
              ? "구역을 드래그하여 이동, 모서리를 드래그하여 크기 조절"
              : "세계수와 호수를 중심으로 구역을 시각적으로 확인합니다"}
          </p>
        </div>
        <div className="flex gap-2">
          {mergeMode ? (
            <>
              <button
                onClick={executeMerge}
                disabled={mergeSelection.length < 2}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mergeSelection.length >= 2
                    ? "bg-accent text-white hover:bg-accent/80"
                    : "bg-card border border-border text-foreground/30 cursor-not-allowed"
                }`}
              >
                🔗 합치기 ({mergeSelection.length}개 선택)
              </button>
              <button
                onClick={() => { setMergeMode(false); setMergeSelection([]); }}
                className="px-4 py-2 bg-card border border-border text-foreground/70 rounded-lg text-sm font-medium hover:bg-card-hover"
              >
                취소
              </button>
            </>
          ) : (
            <>
              {editMode && (
                <>
                  <button
                    onClick={() => { setMergeMode(true); setMergeSelection([]); }}
                    className="px-4 py-2 bg-info/20 text-info rounded-lg text-sm font-medium hover:bg-info/30"
                  >
                    🔗 구역 합치기
                  </button>
                  <button
                    onClick={resetPositions}
                    className="px-4 py-2 bg-danger/20 text-danger rounded-lg text-sm font-medium hover:bg-danger/30"
                  >
                    초기화
                  </button>
                </>
              )}
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  editMode
                    ? "bg-accent text-white"
                    : "bg-card border border-border text-foreground/70 hover:bg-card-hover"
                }`}
              >
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
          className={`relative rounded-2xl border-2 overflow-hidden flex-1 ${
            editMode ? "border-accent border-dashed" : "border-border"
          }`}
          style={{ minHeight: "560px", cursor: isPanning ? "grabbing" : editMode ? "grab" : "default" }}
          onWheel={handleWheel}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 줌·팬 트랜스폼 컨테이너 */}
          <div
            ref={mapRef}
            className="absolute origin-top-left"
            style={{
              width: `${mapSize}%`,
              height: `${mapSize}%`,
              minWidth: "560px",
              minHeight: "560px",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              userSelect: "none",
              position: "relative",
            }}
            data-pannable="true"
          >
            {/* 배경 */}
            <div
              className="absolute inset-0"
              data-pannable="true"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, #d4f5e0 0%, #b8e6cc 30%, #a3d9b8 60%, #8ecba5 100%)",
              }}
            />

            {/* 울타리 */}
            <div
              className="absolute inset-3 rounded-xl border-4 border-dashed pointer-events-none"
              style={{ borderColor: "#8B7355" }}
            />

            {/* 편집 모드 안내 */}
            {editMode && !mergeMode && (
              <div
                className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full text-xs font-medium pointer-events-none"
                style={{ background: "rgba(74,168,216,0.9)", color: "white" }}
              >
                드래그: 이동 · 모서리: 크기 조절 · 빈 곳 드래그: 이동 · 휠: 줌
              </div>
            )}

            {mergeMode && (
              <div
                className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full text-xs font-medium pointer-events-none"
                style={{ background: "rgba(59,130,246,0.9)", color: "white" }}
              >
                합칠 구역을 클릭하여 선택하세요
              </div>
            )}

            {/* 세계수 */}
            <div
              className={`absolute flex flex-col items-center justify-center z-10 ${editMode && !mergeMode ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === "__worldtree" ? "opacity-70" : ""}`}
              style={{ top: `${worldtree.y}%`, left: `${worldtree.x}%`, width: `${worldtree.w}%`, height: `${worldtree.h}%` }}
              onMouseDown={(e) => !mergeMode && handleMouseDown("__worldtree", e)}
            >
              <span className="text-6xl drop-shadow-lg">🌳</span>
              <span
                className="text-xs font-bold mt-1 px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.85)", color: "#1e3a5f" }}
              >
                세계수
              </span>
              {renderResizeHandles("__worldtree")}
            </div>

            {/* 호수 */}
            <div
              className={`absolute z-0 ${editMode && !mergeMode ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === "__lake" ? "opacity-70" : ""}`}
              style={{
                top: `${lake.y}%`,
                left: `${lake.x}%`,
                width: `${lake.w}%`,
                height: `${lake.h}%`,
                background:
                  "radial-gradient(ellipse, rgba(96,185,235,0.6) 0%, rgba(96,185,235,0.2) 70%, transparent 100%)",
                borderRadius: "50%",
              }}
              onMouseDown={(e) => !mergeMode && handleMouseDown("__lake", e)}
            >
              <div className="flex items-center justify-center h-full">
                <span className="text-3xl opacity-70">💧</span>
              </div>
              {renderResizeHandles("__lake")}
            </div>

            {/* 저택 */}
            <div
              className={`absolute flex flex-col items-center z-10 ${editMode && !mergeMode ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === "__mansion" ? "opacity-70" : ""}`}
              style={{ top: `${mansion.y}%`, left: `${mansion.x}%`, width: `${mansion.w}%`, height: `${mansion.h}%` }}
              onMouseDown={(e) => !mergeMode && handleMouseDown("__mansion", e)}
            >
              <span className="text-4xl drop-shadow">🏡</span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.85)", color: "#1e3a5f" }}
              >
                저택
              </span>
              {renderResizeHandles("__mansion")}
            </div>

            {/* 구역들 */}
            {zones.map((zone) => {
              const pos = getPos(zone.name);
              const isMergeSelected = mergeSelection.includes(zone.id);
              return (
                <div
                  key={zone.id}
                  className={`absolute z-20 rounded-xl border-2 flex flex-col items-center justify-center transition-shadow ${
                    mergeMode
                      ? "cursor-pointer"
                      : editMode
                      ? "cursor-grab active:cursor-grabbing"
                      : "cursor-pointer hover:scale-105"
                  } ${selectedZone?.id === zone.id && !editMode && !mergeMode ? "ring-4 ring-accent shadow-xl" : ""} ${
                    isMergeSelected ? "ring-4 ring-blue-500 shadow-xl" : ""
                  } ${dragging === zone.name ? "opacity-70 shadow-2xl" : "hover:shadow-lg"}`}
                  style={{
                    top: `${pos.y}%`,
                    left: `${pos.x}%`,
                    width: `${pos.w}%`,
                    height: `${pos.h}%`,
                    background: isMergeSelected ? `${zone.color}60` : `${zone.color}30`,
                    borderColor: isMergeSelected ? "#3b82f6" : zone.color,
                    transition: dragging === zone.name ? "none" : "box-shadow 0.2s, transform 0.2s",
                  }}
                  onMouseDown={(e) => {
                    if (mergeMode) {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleMergeSelect(zone.id);
                    } else if (editMode) {
                      handleMouseDown(zone.name, e);
                    } else {
                      setSelectedZone(zone);
                    }
                  }}
                >
                  {isMergeSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-30">
                      ✓
                    </div>
                  )}
                  <span className="text-2xl">{zone.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: "#1e3a5f" }}>
                    {zone.name}
                  </span>
                  <span className="text-[10px] opacity-60" style={{ color: "#1e3a5f" }}>
                    {zone.ecosystem_type}
                  </span>
                  {renderResizeHandles(zone.name)}
                </div>
              );
            })}

            {/* 장식 */}
            <span className="absolute text-lg opacity-40 pointer-events-none" style={{ top: "75%", left: "8%" }}>🌸</span>
            <span className="absolute text-lg opacity-40 pointer-events-none" style={{ top: "20%", left: "85%" }}>🍄</span>
            <span className="absolute text-lg opacity-40 pointer-events-none" style={{ top: "80%", left: "88%" }}>🦋</span>
            <span className="absolute text-lg opacity-40 pointer-events-none" style={{ top: "45%", left: "5%" }}>🌿</span>
            <span className="absolute text-sm opacity-30 pointer-events-none" style={{ top: "30%", left: "75%" }}>✨</span>
            <span className="absolute text-sm opacity-30 pointer-events-none" style={{ top: "68%", left: "20%" }}>✨</span>
          </div>
        </div>

        {/* 사이드 패널 */}
        <div className="w-72 shrink-0">
          {selectedZone && !editMode && !mergeMode ? (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{selectedZone.icon}</span>
                <div>
                  <h3 className="font-bold text-lg">{selectedZone.name}</h3>
                  <p className="text-xs text-foreground/50">{selectedZone.ecosystem_type} · {selectedZone.climate}</p>
                </div>
              </div>
              {selectedZone.description && (
                <p className="text-sm text-foreground/70 mb-4">{selectedZone.description}</p>
              )}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-foreground/60">🌱 식물</span>
                  <span className="font-semibold">{selectedZone.plant_count}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-foreground/60">🦊 생물</span>
                  <span className="font-semibold">{selectedZone.creature_count}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-foreground/60">🎨 색상</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-border" style={{ background: selectedZone.color }} />
                    <span className="text-xs text-foreground/40">{selectedZone.color}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-5 text-center text-foreground/40">
              <span className="text-3xl block mb-3">{mergeMode ? "🔗" : editMode ? "✏️" : "👆"}</span>
              <p className="text-sm whitespace-pre-line">
                {mergeMode
                  ? "합칠 구역을 2개 이상 클릭하세요.\n첫 번째 선택한 구역에 나머지가 합쳐집니다."
                  : editMode
                  ? "드래그: 이동\n모서리/변: 크기 조절\n빈 곳 드래그: 맵 이동\n마우스 휠: 줌"
                  : "맵에서 구역을 클릭하면\n상세 정보가 표시됩니다"}
              </p>
            </div>
          )}

          {/* 범례 */}
          <div className="bg-card rounded-xl border border-border p-4 mt-4">
            <h4 className="text-sm font-semibold mb-3">범례</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span>🌳</span> <span className="text-foreground/60">세계수</span>
              </div>
              <div className="flex items-center gap-2">
                <span>💧</span> <span className="text-foreground/60">호수</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🏡</span> <span className="text-foreground/60">저택</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border-2 border-dashed" style={{ borderColor: "#8B7355" }} />
                <span className="text-foreground/60">울타리</span>
              </div>
              {zones.map((z) => (
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
