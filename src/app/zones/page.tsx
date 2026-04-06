"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Zone {
  id: string;
  name: string;
  description: string | null;
  ecosystem_type: string;
  climate: string | null;
  auto_feed: boolean;
  auto_environment: boolean;
  creature_count: number;
  plant_count: number;
  color: string;
  icon: string;
}

const ECOSYSTEM_OPTIONS = ["기본", "신성림", "수생", "정원", "농경", "마법숲", "사막", "동굴", "설원"];
const ICON_OPTIONS = ["🌳", "💧", "🏡", "🌿", "🦊", "🌸", "🍄", "🔥", "❄️", "🌙", "⚡", "🪨"];

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    ecosystem_type: "기본",
    climate: "온화",
    color: "#4ade80",
    icon: "🌿",
  });

  useEffect(() => {
    fetchZones();
  }, []);

  async function fetchZones() {
    const { data } = await supabase.from("zones").select("*").order("created_at");
    setZones((data as Zone[]) || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await supabase.from("zones").update(form).eq("id", editingId);
    } else {
      await supabase.from("zones").insert({
        ...form,
        auto_feed: true,
        auto_environment: true,
        creature_count: 0,
        plant_count: 0,
      });
    }
    resetForm();
    fetchZones();
  }

  async function handleDelete(id: string) {
    if (!confirm("이 구역을 삭제하시겠습니까?")) return;
    await supabase.from("zones").delete().eq("id", id);
    fetchZones();
  }

  function startEdit(zone: Zone) {
    setForm({
      name: zone.name,
      description: zone.description || "",
      ecosystem_type: zone.ecosystem_type,
      climate: zone.climate || "온화",
      color: zone.color,
      icon: zone.icon,
    });
    setEditingId(zone.id);
    setShowForm(true);
  }

  function resetForm() {
    setForm({ name: "", description: "", ecosystem_type: "기본", climate: "온화", color: "#4ade80", icon: "🌿" });
    setEditingId(null);
    setShowForm(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96"><p className="text-foreground/50">로딩 중...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">🗺️ 구역 관리</h1>
          <p className="text-foreground/50 text-sm mt-1">정원 내부 구역을 관리하고 생태계를 설정합니다</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-accent text-background rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
        >
          {showForm ? "취소" : "+ 구역 추가"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 border border-border mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-foreground/70 mb-1">구역 이름</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">생태계 유형</label>
              <select
                value={form.ecosystem_type}
                onChange={(e) => setForm({ ...form, ecosystem_type: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              >
                {ECOSYSTEM_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">기후</label>
              <input
                type="text"
                value={form.climate}
                onChange={(e) => setForm({ ...form, climate: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">아이콘</label>
              <div className="flex gap-2 flex-wrap">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    type="button"
                    key={icon}
                    onClick={() => setForm({ ...form, icon })}
                    className={`text-xl p-1.5 rounded-lg transition-colors ${form.icon === icon ? "bg-accent/30 ring-2 ring-accent" : "hover:bg-card-hover"}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">색상</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-20 bg-background border border-border rounded-lg cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-foreground/70 mb-1">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm h-20 resize-none"
            />
          </div>
          <button type="submit" className="px-6 py-2 bg-accent text-background rounded-lg text-sm font-medium hover:bg-accent/80">
            {editingId ? "수정" : "추가"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map((zone) => (
          <div key={zone.id} className="bg-card rounded-xl p-5 border border-border card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{zone.icon}</span>
                <div>
                  <h3 className="font-semibold">{zone.name}</h3>
                  <p className="text-xs text-foreground/40">{zone.ecosystem_type} · {zone.climate}</p>
                </div>
              </div>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
            </div>
            {zone.description && (
              <p className="text-sm text-foreground/60 mb-3">{zone.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-foreground/50 mb-4">
              <span>🌱 식물 {zone.plant_count}</span>
              <span>🦊 생물 {zone.creature_count}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-foreground/40 mb-3">
              <span>{zone.auto_feed ? "✅" : "❌"} 자동 먹이</span>
              <span>{zone.auto_environment ? "✅" : "❌"} 맞춤 환경</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(zone)} className="px-3 py-1 text-xs bg-info/20 text-info rounded hover:bg-info/30">
                수정
              </button>
              <button onClick={() => handleDelete(zone.id)} className="px-3 py-1 text-xs bg-danger/20 text-danger rounded hover:bg-danger/30">
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {zones.length === 0 && (
        <div className="text-center py-16 text-foreground/40">
          <span className="text-4xl block mb-4">🗺️</span>
          <p>등록된 구역이 없습니다</p>
        </div>
      )}
    </div>
  );
}
