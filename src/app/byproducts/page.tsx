"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import GradeBadge from "@/components/GradeBadge";
import type { Grade } from "@/lib/database.types";

interface Byproduct {
  id: string;
  name: string;
  source_creature_id: string | null;
  source_zone_id: string | null;
  grade: Grade;
  quantity: number;
  category: string;
  description: string | null;
}
interface Zone { id: string; name: string; icon: string; }
interface Creature { id: string; name: string; }

const GRADES: Grade[] = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS", "Ex"];
const CATEGORIES = ["약재", "광물", "식재료", "마법재료", "영약", "씨앗", "가죽/깃털", "기타"];

export default function ByproductsPage() {
  const [items, setItems] = useState<Byproduct[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", source_creature_id: "", source_zone_id: "", grade: "F" as Grade, quantity: 1, category: "기타", description: "",
  });

  useEffect(() => {
    Promise.all([
      supabase.from("byproducts").select("*").order("grade", { ascending: false }),
      supabase.from("zones").select("id,name,icon"),
      supabase.from("creatures").select("id,name"),
    ]).then(([bRes, zRes, cRes]) => {
      setItems((bRes.data as Byproduct[]) || []);
      setZones((zRes.data as Zone[]) || []);
      setCreatures((cRes.data as Creature[]) || []);
      setLoading(false);
    });
  }, []);

  async function fetchItems() {
    const { data } = await supabase.from("byproducts").select("*").order("grade", { ascending: false });
    setItems((data as Byproduct[]) || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      source_creature_id: form.source_creature_id || null,
      source_zone_id: form.source_zone_id || null,
    };
    if (editingId) {
      await supabase.from("byproducts").update(payload).eq("id", editingId);
    } else {
      await supabase.from("byproducts").insert(payload);
    }
    resetForm();
    fetchItems();
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("byproducts").delete().eq("id", id);
    fetchItems();
  }

  function startEdit(b: Byproduct) {
    setForm({
      name: b.name, source_creature_id: b.source_creature_id || "", source_zone_id: b.source_zone_id || "",
      grade: b.grade, quantity: b.quantity, category: b.category, description: b.description || "",
    });
    setEditingId(b.id);
    setShowForm(true);
  }

  function resetForm() {
    setForm({ name: "", source_creature_id: "", source_zone_id: "", grade: "F", quantity: 1, category: "기타", description: "" });
    setEditingId(null);
    setShowForm(false);
  }

  if (loading) return <div className="flex items-center justify-center h-96"><p className="text-foreground/50">로딩 중...</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">💎 부산물 / 채집품</h1>
          <p className="text-foreground/50 text-sm mt-1">정원에서 얻은 부산물과 채집품 관리 (Ex급까지 등급 상승 가능)</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-4 py-2 bg-accent text-background rounded-lg text-sm font-medium hover:bg-accent/80">
          {showForm ? "취소" : "+ 아이템 추가"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 border border-border mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-foreground/70 mb-1">이름</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">카테고리</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">등급</label>
              <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value as Grade })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">수량</label>
              <input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">원천 동식물</label>
              <select value={form.source_creature_id} onChange={(e) => setForm({ ...form, source_creature_id: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">없음</option>
                {creatures.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">원천 구역</label>
              <select value={form.source_zone_id} onChange={(e) => setForm({ ...form, source_zone_id: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">없음</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.icon} {z.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-foreground/70 mb-1">설명</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm h-20 resize-none" />
          </div>
          <button type="submit" className="px-6 py-2 bg-accent text-background rounded-lg text-sm font-medium hover:bg-accent/80">
            {editingId ? "수정" : "추가"}
          </button>
        </form>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-foreground/50 border-b border-border bg-background/30">
                <th className="text-left py-3 px-4">이름</th>
                <th className="text-left py-3 px-4">카테고리</th>
                <th className="text-left py-3 px-4">등급</th>
                <th className="text-left py-3 px-4">수량</th>
                <th className="text-left py-3 px-4">원천</th>
                <th className="text-left py-3 px-4">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const creature = creatures.find((c) => c.id === b.source_creature_id);
                const zone = zones.find((z) => z.id === b.source_zone_id);
                return (
                  <tr key={b.id} className="border-b border-border/30 hover:bg-card-hover">
                    <td className="py-3 px-4 font-medium">{b.name}</td>
                    <td className="py-3 px-4 text-foreground/60">{b.category}</td>
                    <td className="py-3 px-4"><GradeBadge grade={b.grade} /></td>
                    <td className="py-3 px-4">{b.quantity}</td>
                    <td className="py-3 px-4 text-foreground/60 text-xs">
                      {creature && <span>{creature.name}</span>}
                      {creature && zone && <span> · </span>}
                      {zone && <span>{zone.icon} {zone.name}</span>}
                      {!creature && !zone && "-"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(b)} className="px-2 py-1 text-xs bg-info/20 text-info rounded hover:bg-info/30">수정</button>
                        <button onClick={() => handleDelete(b.id)} className="px-2 py-1 text-xs bg-danger/20 text-danger rounded hover:bg-danger/30">삭제</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {items.length === 0 && (
          <div className="text-center py-16 text-foreground/40">
            <span className="text-4xl block mb-4">💎</span>
            <p>등록된 부산물이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
