import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const isLoggedIn = !!token;

  const readError = async (res) => {
    try {
      const t = await res.text();
      return t || res.statusText;
    } catch {
      return res.statusText || "Request failed";
    }
  };

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
      const data = await res.json();
      localStorage.setItem("admin_token", data.access_token);
      setToken(data.access_token);
      setEmail("");
      setPassword("");
      setTimeout(fetchUsers, 0);
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
  };

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok) throw new Error(await readError(res));
      setUsers(await res.json());
    } catch (err) {
      alert(`Liste alınamadı: ${err.message}`);
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
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok) throw new Error(await readError(res));
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      alert(`Güncelleme başarısız: ${err.message}`);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Bu kullanıcı silinsin mi?")) return;
    try {
      const res = await fetch(`${API}/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok) throw new Error(await readError(res));
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(`Silme başarısız: ${err.message}`);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchUsers();
    // eslint-disable-next-line
  }, [token]);

  // --------------------
  // LOGIN VIEW (THEMED)
  // --------------------
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

  // --------------------
  // ADMIN LIST VIEW
  // --------------------
  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-orange-900/10 pointer-events-none" />
      <div className="max-w-6xl mx-auto relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-white">Admin Paneli</h2>
          <div className="flex gap-3">
            <Button
              onClick={fetchUsers}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? "Yükleniyor..." : "Yenile"}
            </Button>
            <Button
              variant="outline"
              onClick={logout}
              className="border-orange-500/40 text-orange-300 hover:bg-orange-900/20"
            >
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
                    <tr
                      key={u.id}
                      className="border-t border-white/5 hover:bg-white/5 transition-colors"
                    >
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
      </div>
    </div>
  );
}
