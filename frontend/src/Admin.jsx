import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const API =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api";

export default function Admin() {
  // --- auth ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const isLoggedIn = !!token;

  // --- users ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- cases (admin görünümü: sadece ad ve id) ---
  const [casesAdmin, setCasesAdmin] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);

  const readError = async (res) => {
    try {
      const t = await res.text();
      return t || res.statusText;
    } catch {
      return res.statusText || "Request failed";
    }
  };

  // ---------------- AUTH ----------------
  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json(); // { access_token, token_type }
      localStorage.setItem("admin_token", data.access_token);
      setToken(data.access_token);
      setEmail("");
      setPassword("");
      setTimeout(() => {
        fetchUsers();
        fetchCasesAdmin();
      }, 0);
    } catch (err) {
      alert(`Giriş başarısız: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setToken("");
    setUsers([]);
    setCasesAdmin([]);
  };

  // ---------------- USERS ----------------
  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return logout();
      if (!res.ok) throw new Error(await readError(res));
      setUsers(await res.json());
    } catch (err) {
      alert(`Kullanıcı listesi alınamadı: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateBalance = async (id, newBalance) => {
    try {
      const res = await fetch(`${API}/admin/users/${id}/balance`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ balance: Number(newBalance) }),
      });
      if (res.status === 401) return logout();
      if (!res.ok) throw new Error(await readError(res));
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      alert(`Bakiye güncellenemedi: ${err.message}`);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Bu kullanıcı silinsin mi?")) return;
    try {
      const res = await fetch(`${API}/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return logout();
      if (!res.ok) throw new Error(await readError(res));
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(`Silme başarısız: ${err.message}`);
    }
  };

  // ---------------- CASES (ADMIN) ----------------
  // Sadece adlar ve id'ler gösterilecek; ekleme/silme admin uçlarıyla yapılır.
  const fetchCasesAdmin = async () => {
  if (!token) return;
  setCasesLoading(true);
  try {
    // 1) Admin endpoint'i dene (sadece ad + id dönüyor olmalı)
    let res = await fetch(`${API}/admin/cases`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (res.status === 401) {
      // token düşmüş olabilir
      logout();
      return;
    }

    // Admin endpoint yoksa (404) -> public'e fallback
    if (res.status === 404) {
      res = await fetch(`${API}/public/cases?limit=500`, { cache: "no-store" });
    }

    const text = await res.text();
    if (!res.ok) {
      const msg = text?.slice(0, 200) || `HTTP ${res.status}`;
      throw new Error(`Kasalar alınamadı: ${msg}`);
    }

    let data;
    try { data = text ? JSON.parse(text) : []; }
    catch { throw new Error("Geçersiz JSON"); }

    // admin/cases ise dizi [{_id,name},...] bekliyoruz
    // public/cases ise {items:[...]} / dizi
    let list;
    if (Array.isArray(data)) {
      list = data;
    } else if (data?.items || data?.data) {
      list = data.items || data.data || [];
    } else {
      list = [];
    }

    // her iki durumda normalize et
    const normalized = (list || []).map((x) => ({
      _id: x._id || x.id,
      name: x.name,
    })).filter(c => c._id && c.name);

    setCasesAdmin(normalized);
  } catch (err) {
    console.error("cases admin fetch error:", err);
    alert(err.message || "Kasalar alınamadı"); // görünür olsun
    setCasesAdmin([]);
  } finally {
    setCasesLoading(false);
  }
};


  const addCase = async (payload) => {
    try {
      const res = await fetch(`${API}/admin/cases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) return logout();
      if (!res.ok) throw new Error(await readError(res));
      await fetchCasesAdmin();
      alert("Kasa eklendi");
    } catch (err) {
      alert(`Kasa ekleme başarısız: ${err.message}`);
    }
  };

  const deleteCase = async (_id, name) => {
    if (!window.confirm(`Silinsin mi: ${name}?`)) return;
    try {
      const res = await fetch(`${API}/admin/cases/${_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return logout();
      if (!res.ok) throw new Error(await readError(res));
      await fetchCasesAdmin();
    } catch (err) {
      alert(`Kasa silme başarısız: ${err.message}`);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchUsers();
      fetchCasesAdmin();
    }
    // eslint-disable-next-line
  }, [token]);

  // ---------------- LOGIN VIEW ----------------
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-orange-900/20" />
        <Card className="w-full max-w-md relative z-10 bg-[#1a1a2e]/95 border-purple-500/20">
          <CardHeader>
            <div className="flex items-center justify-center mb-2">
              <img
                src="https://placehold.co/64x64/6b21a8/ffffff?text=AD"
                alt="Admin"
                className="h-16 w-16 rounded"
              />
            </div>
            <CardTitle className="text-center text-white">Admin Girişi</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Yönetici hesabınızla giriş yapın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={login} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-300">E-posta</label>
                <Input
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#0a0a0f] border-purple-500/30 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Şifre</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#0a0a0f] border-purple-500/30 text-white"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white font-semibold"
              >
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------- ADMIN VIEW ----------------
  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-orange-900/10 pointer-events-none" />
      <div className="max-w-6xl mx-auto relative z-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-white">Admin Paneli</h2>
          <div className="flex gap-3">
            <Button onClick={fetchUsers} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
              {loading ? "Yükleniyor..." : "Kullanıcıları Yenile"}
            </Button>
            <Button onClick={fetchCasesAdmin} disabled={casesLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
              {casesLoading ? "Yükleniyor..." : "Kasaları Yenile"}
            </Button>
            <Button variant="outline" onClick={logout} className="border-orange-500/40 text-orange-300 hover:bg-orange-900/20">
              Çıkış
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <Card className="bg-[#1a1a2e]/95 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Hesaplar</CardTitle>
            <CardDescription className="text-gray-400">
              Bakiye güncelleme ve kullanıcı silme işlemleri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-300">
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Bakiye</th>
                    <th className="px-3 py-2 font-medium">Rol</th>
                    <th className="px-3 py-2 font-medium text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-3 py-3 text-white">{u.email}</td>
                      <td className="px-3 py-3">
                        <Input
                          type="number"
                          defaultValue={u.balance}
                          onBlur={(e) => updateBalance(u.id, e.target.value)}
                          className="w-40 bg-[#0a0a0f] border-purple-500/30 text-white"
                        />
                      </td>
                      <td className="px-3 py-3 text-gray-300">{u.role}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end">
                          <Button
                            onClick={() => deleteUser(u.id)}
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Sil
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-3 py-6 text-center text-gray-400">
                        Kayıt yok
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Cases Management */}
        <Card className="bg-[#1a1a2e]/95 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Kasa Yönetimi</CardTitle>
            <CardDescription className="text-gray-400">
              Kasaları ekleyin veya silin (liste yalnızca kasa adlarını gösterir).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!token) return alert("Oturum yok");
                const form = e.currentTarget;
                const fd = new FormData(form);
                const payload = {
                  name: (fd.get("name") || "").toString().trim(),
                  price: Number(fd.get("price") || 0),
                  image: (fd.get("image") || "").toString().trim(),
                  isPremium: fd.get("isPremium") === "on",
                  isNew: fd.get("isNew") === "on",
                  isEvent: fd.get("isEvent") === "on",
                  contents: [],
                  contentsCount: Number(fd.get("contentsCount") || 0) || undefined,
                };
                if (!payload.name) return alert("İsim zorunlu");
                await addCase(payload);
                form.reset();
              }}
              className="grid grid-cols-1 md:grid-cols-6 gap-3"
            >
              <div className="md:col-span-2">
                <label className="text-sm text-gray-300">İsim *</label>
                <Input name="name" placeholder="Örn: Awakening" className="bg-[#0a0a0f] border-purple-500/30 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Fiyat</label>
                <Input name="price" type="number" step="0.01" placeholder="15.00" className="bg-[#0a0a0f] border-purple-500/30 text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-300">Görsel URL</label>
                <Input name="image" placeholder="https://..." className="bg-[#0a0a0f] border-purple-500/30 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-300">İçerik sayısı</label>
                <Input name="contentsCount" type="number" placeholder="20" className="bg-[#0a0a0f] border-purple-500/30 text-white" />
              </div>

              <div className="flex items-center gap-4 md:col-span-3">
                <label className="flex items-center gap-2 text-gray-300">
                  <input type="checkbox" name="isPremium" className="accent-purple-600" /> Premium
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input type="checkbox" name="isNew" className="accent-purple-600" /> Yeni
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input type="checkbox" name="isEvent" className="accent-purple-600" /> Event
                </label>
              </div>

              <div className="md:col-span-3 flex justify-end">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                  Kasa Ekle
                </Button>
              </div>
            </form>

            {/* Names list */}
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Kayıtlı Kasalar</div>
              <div className="rounded-lg border border-purple-500/20 divide-y divide-white/5 overflow-hidden">
                {casesAdmin.length === 0 && (
                  <div className="p-4 text-gray-400">{casesLoading ? "Yükleniyor..." : "Kayıt yok"}</div>
                )}
                {casesAdmin.map((c) => (
                  <div key={c._id} className="p-4 flex items-center justify-between">
                    <div className="text-white">{c.name}</div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => deleteCase(c._id, c.name)}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Sil
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
