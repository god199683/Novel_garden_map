"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface AccessKey {
  id: string;
  holder_name: string;
  role: "owner" | "partner" | "family" | "pet" | "guest";
  is_active: boolean;
  granted_at: string;
  expires_at: string | null;
}

const ROLES: { value: AccessKey["role"]; label: string; icon: string; color: string }[] = [
  { value: "owner", label: "소유주", icon: "👑", color: "text-warning" },
  { value: "partner", label: "파트너", icon: "💫", color: "text-purple" },
  { value: "family", label: "가족", icon: "🏠", color: "text-warning" },
  { value: "pet", label: "펫", icon: "🐾", color: "text-accent" },
  { value: "guest", label: "손님", icon: "🎫", color: "text-info" },
];

export default function AccessPage() {
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    holder_name: "",
    role: "guest" as AccessKey["role"],
    is_active: true,
    expires_at: "",
  });

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    const { data } = await supabase.from("access_keys").select("*").order("granted_at");
    setKeys((data as AccessKey[]) || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, expires_at: form.expires_at || null };
    if (editingId) {
      await supabase.from("access_keys").update(payload).eq("id", editingId);
    } else {
      await supabase.from("access_keys").insert(payload);
    }
    resetForm();
    fetchKeys();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("access_keys").update({ is_active: !current }).eq("id", id);
    fetchKeys();
  }

  async function handleDelete(id: string) {
    if (!confirm("이 패스키를 삭제하시겠습니까?")) return;
    await supabase.from("access_keys").delete().eq("id", id);
    fetchKeys();
  }

  function startEdit(k: AccessKey) {
    setForm({
      holder_name: k.holder_name,
      role: k.role,
      is_active: k.is_active,
      expires_at: k.expires_at ? k.expires_at.split("T")[0] : "",
    });
    setEditingId(k.id);
    setShowForm(true);
  }

  function getDefaultExpiry() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }

  function resetForm() {
    setForm({ holder_name: "", role: "guest", is_active: true, expires_at: getDefaultExpiry() });
    setEditingId(null);
    setShowForm(false);
  }

  if (loading) return <div className="flex items-center justify-center h-96"><p className="text-foreground/50">로딩 중...</p></div>;

  const activeCount = keys.filter((k) => k.is_active).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">🔑 출입 관리</h1>
          <p className="text-foreground/50 text-sm mt-1">소유주와 패스키 소유자들 외 출입 불가</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-4 py-2 bg-accent text-background rounded-lg text-sm font-medium hover:bg-accent/80">
          {showForm ? "취소" : "+ 패스키 발급"}
        </button>
      </div>

      {/* 역할별 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {ROLES.map((r) => {
          const count = keys.filter((k) => k.role === r.value && k.is_active).length;
          return (
            <div key={r.value} className="bg-card rounded-xl p-4 border border-border text-center">
              <span className="text-2xl block mb-2">{r.icon}</span>
              <p className={`text-2xl font-bold ${r.color}`}>{count}</p>
              <p className="text-xs text-foreground/50">{r.label}</p>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-foreground/40 mb-4">활성 패스키: {activeCount} / 전체: {keys.length}</p>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 border border-border mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-foreground/70 mb-1">소유자 이름</label>
              <input type="text" value={form.holder_name} onChange={(e) => setForm({ ...form, holder_name: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">역할</label>
              <select value={form.role} onChange={(e) => {
                const role = e.target.value as AccessKey["role"];
                if (role === "guest") {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  setForm({ ...form, role, expires_at: d.toISOString().split("T")[0] });
                } else {
                  setForm({ ...form, role, expires_at: "" });
                }
              }} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">만료일 (선택)</label>
              <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="px-6 py-2 bg-accent text-background rounded-lg text-sm font-medium hover:bg-accent/80">
            {editingId ? "수정" : "발급"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {keys.map((k) => {
          const role = ROLES.find((r) => r.value === k.role)!;
          return (
            <div key={k.id} className={`bg-card rounded-xl p-4 border border-border flex items-center justify-between ${!k.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-4">
                <span className="text-2xl">{role.icon}</span>
                <div>
                  <p className="font-medium">{k.holder_name}</p>
                  <div className="flex items-center gap-3 text-xs text-foreground/40 mt-1">
                    <span className={role.color}>{role.label}</span>
                    <span>발급: {new Date(k.granted_at).toLocaleDateString("ko-KR")}</span>
                    {k.expires_at && <span>만료: {new Date(k.expires_at).toLocaleDateString("ko-KR")}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleActive(k.id, k.is_active)}
                  className={`px-3 py-1 text-xs rounded ${k.is_active ? "bg-accent/20 text-accent" : "bg-danger/20 text-danger"}`}
                >
                  {k.is_active ? "활성" : "비활성"}
                </button>
                <button onClick={() => startEdit(k)} className="px-2 py-1 text-xs bg-info/20 text-info rounded hover:bg-info/30">수정</button>
                <button onClick={() => handleDelete(k.id)} className="px-2 py-1 text-xs bg-danger/20 text-danger rounded hover:bg-danger/30">삭제</button>
              </div>
            </div>
          );
        })}
        {keys.length === 0 && (
          <div className="text-center py-16 text-foreground/40">
            <span className="text-4xl block mb-4">🔑</span>
            <p>등록된 패스키가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
