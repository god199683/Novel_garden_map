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
  x: number; // 0~100 퍼센트
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
  // Supabase에도 저장 시도
  supabase
    .from("garden_settings")
    .upsert({ key: "zone_positions", value: JSON.stringify(positions), description: "맵 구역 위치 데이터" }, { onConflict: "key" })
    .then(() => {});
}

export default function MapPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [positions, setPositions] = useState<Record<string, Position>>(DEFAULT_POSITIONS);
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      const [zonesRes, settingsRes] = await Promise.all([
        supabase.from("zones").select("*"),
        supabase.from("garden_settings").select("*").eq("key", "zone_positions").single(),
      ]);
      setZones((zonesRes.data as Zone[]) || []);

      // Supabase에 저장된 위치가 있으면 우선 사용
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
      setLoading(false);
    }
    fetchData();
  }, []);

  const getPos = useCallback(
    (key: string): Position => {
      if (positions[key]) return positions[key];
      // 새 구역은 빈 공간에 배치
      const idx = zones.filter((z) => !positions[z.name]).indexOf(zones.find((z) => z.name === key)!);
      return { x: 10 + (idx % 4) * 22, y: 80, w: 16, h: 14 };
    },
    [positions, zones]
  );

  const handleMouseDown = useCallback(
    (key: string, e: React.MouseEvent) => {
      if (!editMode || !mapRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = mapRef.current.getBoundingClientRect();
      const pos = getPos(key);
      const mouseXPct = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseYPct = ((e.clientY - rect.top) / rect.height) * 100;
      setDragOffset({ x: mouseXPct - pos.x, y: mouseYPct - pos.y });
      setDragging(key);
    },
    [editMode, getPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const pos = getPos(dragging);
      const x = Math.max(0, Math.min(100 - pos.w, ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x));
      const y = Math.max(0, Math.min(100 - pos.h, ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y));
      setPositions((prev) => ({ ...prev, [dragging]: { ...pos, x, y } }));
    },
    [dragging, dragOffset, getPos]
  );

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setDragging(null);
      savePositions(positions);
    }
  }, [dragging, positions]);

  const resetPositions = () => {
    setPositions({ ...DEFAULT_POSITIONS });
    savePositions({ ...DEFAULT_POSITIONS });
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🗺️ 정원 맵</h1>
          <p className="text-foreground/50 text-sm mt-1">
            {editMode ? "구역과 건물을 드래그하여 원하는 위치로 이동하세요" : "세계수와 호수를 중심으로 구역을 시각적으로 확인합니다"}
          </p>
        </div>
        <div className="flex gap-2">
          {editMode && (
            <button
              onClick={resetPositions}
              className="px-4 py-2 bg-danger/20 text-danger rounded-lg text-sm font-medium hover:bg-danger/30"
            >
              초기화
            </button>
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
        </div>
      </div>

      <div className="flex gap-6">
        {/* 맵 영역 */}
        <div
          ref={mapRef}
          className={`relative bg-card rounded-2xl border-2 overflow-hidden flex-1 ${
            editMode ? "border-accent border-dashed" : "border-border"
          }`}
          style={{ minHeight: "560px", userSelect: "none" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 배경 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, #d4f5e0 0%, #b8e6cc 30%, #a3d9b8 60%, #8ecba5 100%)",
            }}
          />

          {/* 울타리 */}
          <div
            className="absolute inset-3 rounded-xl border-4 border-dashed"
            style={{ borderColor: "#8B7355" }}
          />

          {/* 편집 모드 안내 */}
          {editMode && (
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "rgba(74,168,216,0.9)", color: "white" }}
            >
              드래그하여 위치를 변경하세요
            </div>
          )}

          {/* 세계수 */}
          <div
            className={`absolute flex flex-col items-center justify-center z-10 ${editMode ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === "__worldtree" ? "opacity-70" : ""}`}
            style={{ top: `${worldtree.y}%`, left: `${worldtree.x}%`, width: `${worldtree.w}%`, height: `${worldtree.h}%` }}
            onMouseDown={(e) => handleMouseDown("__worldtree", e)}
          >
            <span className="text-6xl drop-shadow-lg">🌳</span>
            <span
              className="text-xs font-bold mt-1 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.85)", color: "#1e3a5f" }}
            >
              세계수
            </span>
          </div>

          {/* 호수 */}
          <div
            className={`absolute z-0 ${editMode ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === "__lake" ? "opacity-70" : ""}`}
            style={{
              top: `${lake.y}%`,
              left: `${lake.x}%`,
              width: `${lake.w}%`,
              height: `${lake.h}%`,
              background:
                "radial-gradient(ellipse, rgba(96,185,235,0.6) 0%, rgba(96,185,235,0.2) 70%, transparent 100%)",
              borderRadius: "50%",
            }}
            onMouseDown={(e) => handleMouseDown("__lake", e)}
          >
            <div className="flex items-center justify-center h-full">
              <span className="text-3xl opacity-70">💧</span>
            </div>
          </div>

          {/* 저택 */}
          <div
            className={`absolute flex flex-col items-center z-10 ${editMode ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === "__mansion" ? "opacity-70" : ""}`}
            style={{ top: `${mansion.y}%`, left: `${mansion.x}%`, width: `${mansion.w}%`, height: `${mansion.h}%` }}
            onMouseDown={(e) => handleMouseDown("__mansion", e)}
          >
            <span className="text-4xl drop-shadow">🏡</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.85)", color: "#1e3a5f" }}
            >
              저택
            </span>
          </div>

          {/* 구역들 */}
          {zones.map((zone) => {
            const pos = getPos(zone.name);
            return (
              <div
                key={zone.id}
                className={`absolute z-20 rounded-xl border-2 flex flex-col items-center justify-center transition-shadow ${
                  editMode
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-pointer hover:scale-105"
                } ${selectedZone?.id === zone.id && !editMode ? "ring-4 ring-accent shadow-xl" : ""} ${
                  dragging === zone.name ? "opacity-70 shadow-2xl" : "hover:shadow-lg"
                }`}
                style={{
                  top: `${pos.y}%`,
                  left: `${pos.x}%`,
                  width: `${pos.w}%`,
                  height: `${pos.h}%`,
                  background: `${zone.color}30`,
                  borderColor: zone.color,
                  transition: dragging === zone.name ? "none" : "box-shadow 0.2s, transform 0.2s",
                }}
                onMouseDown={(e) => {
                  if (editMode) {
                    handleMouseDown(zone.name, e);
                  } else {
                    setSelectedZone(zone);
                  }
                }}
              >
                <span className="text-2xl">{zone.icon}</span>
                <span className="text-xs font-semibold" style={{ color: "#1e3a5f" }}>
                  {zone.name}
                </span>
                <span className="text-[10px] opacity-60" style={{ color: "#1e3a5f" }}>
                  {zone.ecosystem_type}
                </span>
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

        {/* 구역 정보 패널 */}
        <div className="w-72 shrink-0">
          {selectedZone && !editMode ? (
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
              <span className="text-3xl block mb-3">{editMode ? "✏️" : "👆"}</span>
              <p className="text-sm">
                {editMode
                  ? "구역, 세계수, 호수, 저택을\n드래그하여 이동할 수 있습니다"
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
