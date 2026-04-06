"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/StatCard";
import GradeBadge from "@/components/GradeBadge";
import type { Grade } from "@/lib/database.types";

interface Zone {
  id: string;
  name: string;
  icon: string;
  color: string;
  creature_count: number;
  plant_count: number;
  ecosystem_type: string;
}

interface Creature {
  id: string;
  name: string;
  type: string;
  grade: Grade;
  growth_stage: string;
  zone_id: string | null;
}

interface Setting {
  key: string;
  value: string;
  description: string | null;
}

export default function Dashboard() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [byproductCount, setByproductCount] = useState(0);
  const [accessCount, setAccessCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [zonesRes, creaturesRes, settingsRes, byproductsRes, accessRes] =
        await Promise.all([
          supabase.from("zones").select("*"),
          supabase.from("creatures").select("*"),
          supabase.from("garden_settings").select("*"),
          supabase.from("byproducts").select("id", { count: "exact" }),
          supabase.from("access_keys").select("id", { count: "exact" }),
        ]);

      setZones((zonesRes.data as Zone[]) || []);
      setCreatures((creaturesRes.data as Creature[]) || []);
      setSettings((settingsRes.data as Setting[]) || []);
      setByproductCount(byproductsRes.count || 0);
      setAccessCount(accessRes.count || 0);
      setLoading(false);
    }
    fetchData();
  }, []);

  const plants = creatures.filter((c) => c.type === "plant");
  const animals = creatures.filter((c) => c.type !== "plant");
  const exGrade = creatures.filter((c) => c.grade === "Ex");
  const growthSetting = settings.find((s) => s.key === "growth_mode");
  const pollutionShield = settings.find((s) => s.key === "pollution_shield");

  const growthLabel: Record<string, string> = {
    off: "OFF",
    stage1: "1단계 (2배속)",
    stage2: "2단계 (즉시)",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <span className="text-4xl block mb-4">🌳</span>
          <p className="text-foreground/50">정원 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Ciel&apos;s Garden 대시보드</h1>
        <p className="text-foreground/50 text-sm mt-1">
          세계수와 호수를 중심으로 펼쳐진 마법 정원의 현황
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="🗺️" label="구역" value={zones.length} sub="활성 구역" />
        <StatCard icon="🌱" label="식물" value={plants.length} color="text-green-400" />
        <StatCard icon="🦊" label="생물" value={animals.length} color="text-orange-400" />
        <StatCard icon="💎" label="부산물" value={byproductCount} color="text-purple-400" />
      </div>

      {/* 시스템 상태 & 구역 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-xl p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4">⚙️ 시스템 상태</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-foreground/70">성장 모드</span>
              <span className="text-sm font-medium text-accent">
                {growthLabel[growthSetting?.value || "stage1"]}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-foreground/70">오염 방지</span>
              <span
                className={`text-sm font-medium ${pollutionShield?.value === "true" ? "text-accent" : "text-danger"}`}
              >
                {pollutionShield?.value === "true" ? "✅ 활성" : "❌ 비활성"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-foreground/70">출입 패스키</span>
              <span className="text-sm font-medium text-info">{accessCount}명 등록</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-foreground/70">Ex급 개체</span>
              <span className="text-sm font-medium text-warning">{exGrade.length}개</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4">🗺️ 구역 현황</h2>
          <div className="space-y-2">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-card-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{zone.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{zone.name}</p>
                    <p className="text-xs text-foreground/40">{zone.ecosystem_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-foreground/50">
                  <span>🌱 {zone.plant_count}</span>
                  <span>🦊 {zone.creature_count}</span>
                </div>
              </div>
            ))}
            {zones.length === 0 && (
              <p className="text-sm text-foreground/40 text-center py-4">
                구역 데이터가 없습니다
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 최근 동식물 */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h2 className="text-lg font-semibold mb-4">🌿 최근 등록된 동식물</h2>
        {creatures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-foreground/50 border-b border-border">
                  <th className="text-left py-2 px-3">이름</th>
                  <th className="text-left py-2 px-3">유형</th>
                  <th className="text-left py-2 px-3">등급</th>
                  <th className="text-left py-2 px-3">성장 단계</th>
                </tr>
              </thead>
              <tbody>
                {creatures.slice(0, 10).map((c) => (
                  <tr key={c.id} className="border-b border-border/30 hover:bg-card-hover">
                    <td className="py-2 px-3 font-medium">{c.name}</td>
                    <td className="py-2 px-3 text-foreground/60">
                      {c.type === "plant"
                        ? "🌱 식물"
                        : c.type === "animal"
                          ? "🦊 동물"
                          : c.type === "spirit"
                            ? "✨ 영체"
                            : "🔮 기타"}
                    </td>
                    <td className="py-2 px-3">
                      <GradeBadge grade={c.grade} />
                    </td>
                    <td className="py-2 px-3 text-foreground/60">{c.growth_stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-foreground/40 text-center py-8">
            등록된 동식물이 없습니다. 동식물 관리에서 추가하세요.
          </p>
        )}
      </div>
    </div>
  );
}
