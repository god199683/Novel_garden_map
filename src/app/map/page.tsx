"use client";

import { useEffect, useState } from "react";
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

// 고정 구역 위치 (중앙 세계수 기준 배치)
const ZONE_POSITIONS: Record<string, { top: string; left: string; width: string; height: string }> = {
  "세계수 주변": { top: "30%", left: "35%", width: "30%", height: "30%" },
  "호수 구역": { top: "55%", left: "30%", width: "25%", height: "22%" },
  "저택 정원": { top: "10%", left: "55%", width: "28%", height: "25%" },
  "약초 밭": { top: "15%", left: "10%", width: "22%", height: "25%" },
  "영수 서식지": { top: "60%", left: "60%", width: "25%", height: "25%" },
};

export default function MapPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  useEffect(() => {
    async function fetchZones() {
      const { data } = await supabase.from("zones").select("*");
      setZones((data as Zone[]) || []);
      setLoading(false);
    }
    fetchZones();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-foreground/50">맵 데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🗺️ 정원 맵</h1>
        <p className="text-foreground/50 text-sm mt-1">
          세계수와 호수를 중심으로 구역을 시각적으로 확인합니다
        </p>
      </div>

      <div className="flex gap-6">
        {/* 맵 영역 */}
        <div
          className="relative bg-card rounded-2xl border border-border overflow-hidden flex-1"
          style={{ minHeight: "560px" }}
        >
          {/* 배경 그라데이션 - 잔디 */}
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

          {/* 세계수 (중앙) */}
          <div
            className="absolute flex flex-col items-center justify-center z-10"
            style={{ top: "35%", left: "43%", width: "14%", height: "20%" }}
          >
            <span className="text-6xl drop-shadow-lg">🌳</span>
            <span
              className="text-xs font-bold mt-1 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.85)", color: "#1e3a5f" }}
            >
              세계수
            </span>
          </div>

          {/* 호수 (세계수 아래) */}
          <div
            className="absolute z-0"
            style={{
              top: "52%",
              left: "38%",
              width: "24%",
              height: "16%",
              background:
                "radial-gradient(ellipse, rgba(96,185,235,0.6) 0%, rgba(96,185,235,0.2) 70%, transparent 100%)",
              borderRadius: "50%",
            }}
          >
            <div className="flex items-center justify-center h-full">
              <span className="text-3xl opacity-70">💧</span>
            </div>
          </div>

          {/* 저택 */}
          <div
            className="absolute flex flex-col items-center z-10"
            style={{ top: "5%", left: "40%", width: "20%" }}
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
            const pos = ZONE_POSITIONS[zone.name];
            if (!pos) {
              // 등록되지 않은 구역은 하단에 배치
              const idx = zones.filter((z) => !ZONE_POSITIONS[z.name]).indexOf(zone);
              return (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZone(zone)}
                  className="absolute z-20 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg cursor-pointer flex flex-col items-center justify-center"
                  style={{
                    top: "82%",
                    left: `${10 + idx * 22}%`,
                    width: "18%",
                    height: "14%",
                    background: `${zone.color}30`,
                    borderColor: zone.color,
                  }}
                >
                  <span className="text-xl">{zone.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: "#1e3a5f" }}>
                    {zone.name}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone)}
                className={`absolute z-20 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg cursor-pointer flex flex-col items-center justify-center ${
                  selectedZone?.id === zone.id ? "ring-4 ring-accent shadow-xl scale-105" : ""
                }`}
                style={{
                  ...pos,
                  background: `${zone.color}30`,
                  borderColor: zone.color,
                }}
              >
                <span className="text-2xl">{zone.icon}</span>
                <span className="text-xs font-semibold" style={{ color: "#1e3a5f" }}>
                  {zone.name}
                </span>
                <span className="text-[10px] opacity-60" style={{ color: "#1e3a5f" }}>
                  {zone.ecosystem_type}
                </span>
              </button>
            );
          })}

          {/* 장식 요소 */}
          <span className="absolute text-lg opacity-40" style={{ top: "75%", left: "8%" }}>🌸</span>
          <span className="absolute text-lg opacity-40" style={{ top: "20%", left: "85%" }}>🍄</span>
          <span className="absolute text-lg opacity-40" style={{ top: "80%", left: "88%" }}>🦋</span>
          <span className="absolute text-lg opacity-40" style={{ top: "45%", left: "5%" }}>🌿</span>
          <span className="absolute text-sm opacity-30" style={{ top: "30%", left: "75%" }}>✨</span>
          <span className="absolute text-sm opacity-30" style={{ top: "68%", left: "20%" }}>✨</span>
        </div>

        {/* 구역 정보 패널 */}
        <div className="w-72 shrink-0">
          {selectedZone ? (
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
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ background: selectedZone.color }}
                    />
                    <span className="text-xs text-foreground/40">{selectedZone.color}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-5 text-center text-foreground/40">
              <span className="text-3xl block mb-3">👆</span>
              <p className="text-sm">맵에서 구역을 클릭하면<br />상세 정보가 표시됩니다</p>
            </div>
          )}

          {/* 범례 */}
          <div className="bg-card rounded-xl border border-border p-4 mt-4">
            <h4 className="text-sm font-semibold mb-3">범례</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span>🌳</span> <span className="text-foreground/60">세계수 (중앙)</span>
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
