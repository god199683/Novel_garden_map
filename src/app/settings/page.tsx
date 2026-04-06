"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ToggleSwitch from "@/components/ToggleSwitch";

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase.from("garden_settings").select("*");
    setSettings((data as Setting[]) || []);
    setLoading(false);
  }

  async function updateSetting(key: string, value: string) {
    await supabase.from("garden_settings").update({ value }).eq("key", key);
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  }

  function getSetting(key: string): string {
    return settings.find((s) => s.key === key)?.value || "";
  }

  const growthMode = getSetting("growth_mode");

  if (loading) return <div className="flex items-center justify-center h-96"><p className="text-foreground/50">로딩 중...</p></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">⚙️ 시스템 설정</h1>
        <p className="text-foreground/50 text-sm mt-1">정원 관리 시스템의 전역 설정을 관리합니다</p>
        <p className="text-xs text-warning mt-2">※ 소유주와 파트너, 펫, 손님에게는 시스템 영향 없음</p>
      </div>

      {/* 성장 시스템 */}
      <div className="bg-card rounded-xl p-6 border border-border mb-6">
        <h2 className="text-lg font-semibold mb-4">🌱 성장 시스템</h2>
        <div className="space-y-1 border-b border-border/50 pb-4 mb-4">
          <ToggleSwitch
            active={getSetting("infinite_growth") === "true"}
            onChange={(v) => updateSetting("infinite_growth", v ? "true" : "false")}
            label="무한 재배 및 성장"
            description="기본 On — Ex급 도달 시 성장 자동 정지"
          />
        </div>
        <div>
          <p className="text-sm font-medium mb-3">성장 단계 설정</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { value: "off", label: "OFF", desc: "성장 비활성화", icon: "⏸️" },
              { value: "stage1", label: "1단계", desc: "기본 성장 속도 2배", icon: "⏩" },
              { value: "stage2", label: "2단계", desc: "즉시 성장", icon: "⚡" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSetting("growth_mode", opt.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  growthMode === opt.value
                    ? "border-accent bg-accent/10 ring-2 ring-accent"
                    : "border-border hover:bg-card-hover"
                }`}
              >
                <span className="text-xl block mb-2">{opt.icon}</span>
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-xs text-foreground/50 mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-foreground/40 mt-3">
            ※ Ex급으로 성장 시 성장 멈춤
          </p>
        </div>
      </div>

      {/* 환경 시스템 */}
      <div className="bg-card rounded-xl p-6 border border-border mb-6">
        <h2 className="text-lg font-semibold mb-4">🛡️ 환경 보호</h2>
        <ToggleSwitch
          active={getSetting("pollution_shield") === "true"}
          onChange={(v) => updateSetting("pollution_shield", v ? "true" : "false")}
          label="오염 방지 마법"
          description="동식물과 내부 건물, 시설 모두 포함"
        />
        <ToggleSwitch
          active={getSetting("self_cleaning") === "true"}
          onChange={(v) => updateSetting("self_cleaning", v ? "true" : "false")}
          label="자가 세척 마법"
          description="상시 발동 — 동식물과 내부 건물, 시설 모두 포함"
        />
      </div>

      {/* 자동화 시스템 */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h2 className="text-lg font-semibold mb-4">🤖 자동화</h2>
        <ToggleSwitch
          active={getSetting("auto_classify") === "true"}
          onChange={(v) => updateSetting("auto_classify", v ? "true" : "false")}
          label="동식물 자동 분류"
          description="개체/쓰임새에 따라 자동으로 분류 및 구역 분리"
        />
        <ToggleSwitch
          active={getSetting("auto_environment") === "true"}
          onChange={(v) => updateSetting("auto_environment", v ? "true" : "false")}
          label="맞춤 환경 자동 제공"
          description="구역별 최적 환경을 자동으로 조절"
        />
        <ToggleSwitch
          active={getSetting("auto_feed") === "true"}
          onChange={(v) => updateSetting("auto_feed", v ? "true" : "false")}
          label="먹이 자동 제공"
          description="동물 개체에게 적합한 먹이를 자동 공급"
        />
      </div>
    </div>
  );
}
