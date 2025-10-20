import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Swords, Users, Plus, Lock, X } from 'lucide-react';

const API =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://127.0.0.1:8000/api';

const MODES = [
  { id: '1v1', label: '1v1', maxPlayers: 2 },
  { id: '1v1v1', label: '1v1v1', maxPlayers: 3 },
  { id: '1v1v1v1', label: '1v1v1v1', maxPlayers: 4 },
];

export default function Battles() {
  const [selectedMode, setSelectedMode] = useState('1v1');
  const [tab, setTab] = useState('active');

  // data
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal
  const [showCreate, setShowCreate] = useState(false);
  const [casesAll, setCasesAll] = useState([]);
  const [selCaseIds, setSelCaseIds] = useState([]);
  const [mode, setMode] = useState('1v1');
  const [isPrivate, setIsPrivate] = useState(false);
  const [entryPrice, setEntryPrice] = useState('');

  const email = localStorage.getItem('user_email') || 'player@hellcase.com';

  const readError = async (res) => {
    try { return (await res.text()) || res.statusText; }
    catch { return res.statusText || 'Request failed'; }
  };

  const fetchBattles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/public/battles?status=waiting`, { cache: 'no-store' });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const data = text ? JSON.parse(text) : [];
      setBattles(Array.isArray(data) ? data : (data.items || data.data || []));
    } catch (e) {
      console.error('battles fetch error:', e);
      setBattles([]);
    } finally {
      setLoading(false);
    }
  };

  // poll battles
  useEffect(() => {
    fetchBattles();
    const id = setInterval(fetchBattles, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modal açıldığında kasaları çek
  const fetchCases = async () => {
    try {
      const res = await fetch(`${API}/public/cases?limit=200`, { cache: 'no-store' });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const data = text ? JSON.parse(text) : [];
      const list = Array.isArray(data) ? data : (data.items || data.data || []);
      setCasesAll(list);
    } catch (e) {
      console.error('cases fetch error:', e);
      setCasesAll([]);
    }
  };

  const openCreate = () => {
    setShowCreate(true);
    setSelCaseIds([]);
    setMode('1v1');
    setIsPrivate(false);
    setEntryPrice('');
    fetchCases();
  };

  const toggleCase = (id) => {
    setSelCaseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const computedPrice = useMemo(() => {
    const sum = casesAll
      .filter((c) => selCaseIds.includes(c._id || c.id))
      .reduce((acc, c) => acc + Number(c.price || 0), 0);
    return sum;
  }, [casesAll, selCaseIds]);

  const createBattle = async (e) => {
    e.preventDefault();
    if (selCaseIds.length === 0) return alert('En az bir kasa seçin');
    try {
      const body = {
        creator_email: email,
        mode,
        case_ids: selCaseIds,
        entry_price: entryPrice ? Number(entryPrice) : undefined,
        is_private: isPrivate,
      };
      const res = await fetch(`${API}/public/battles`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readError(res));
      setShowCreate(false);
      setSelCaseIds([]);
      await fetchBattles();
    } catch (err) {
      alert(`Oluşturma başarısız: ${err.message}`);
    }
  };

  const joinBattle = async (id) => {
    try {
      const res = await fetch(`${API}/public/battles/${id}/join`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email }),
      });
      const msg = await readError(res);
      if (!res.ok) throw new Error(msg);
      await fetchBattles();
      alert('Savaşa katıldın.');
    } catch (err) {
      alert(`Katılma başarısız: ${err.message}`);
    }
  };

  const startBattle = async (id) => {
  try {
    const res = await fetch(`${API}/public/battles/${id}/start`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({}),
    });
    // Başarılı ise oynatma ekranına git (rounds'u orada animasyonla oynatıyoruz)
    if (res.ok) {
      window.location.href = `/battle/${id}/play`;
    } else {
      const msg = await res.text();
      alert(msg || 'Başlatma başarısız');
    }
  } catch (err) {
    alert(`Başlatma hatası: ${err.message}`);
  }
};

  const filtered = battles.filter(b =>
    selectedMode === 'all' ? true : b.mode === selectedMode
  );

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Swords className="text-red-500" size={40} />
            <h1 className="text-4xl font-bold text-white">Kasa Savaşları</h1>
            <Badge className="bg-orange-500 text-white">NEW</Badge>
          </div>
          <p className="text-gray-400 text-lg">Diğer oyuncularla yarışın ve en değerli skinleri kazanın!</p>
        </div>

        {/* Create Battle */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-red-900/50 to-orange-900/50 border-red-500/30">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-red-500/20 p-4 rounded-full">
                    <Plus className="text-red-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Savaş Oluştur</h3>
                    <p className="text-gray-300">Kendi kurallarınızla bir savaş başlatın</p>
                  </div>
                </div>
                <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-6 text-lg">
                  Yeni Savaş
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="mb-8">
          <TabsList className="bg-[#1a1a2e] border border-purple-500/20">
            <TabsTrigger value="active" className="data-[state=active]:bg-purple-600">Aktif Savaşlar</TabsTrigger>
            <TabsTrigger value="my" className="data-[state=active]:bg-purple-600">Savaşlarım (—)</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">Geçmiş</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {/* Mode Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <Button onClick={() => setSelectedMode('all')}
                className={`${selectedMode === 'all' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#1a1a2e] hover:bg-[#252540]'}`}>Tümü</Button>
              {MODES.map(m => (
                <Button key={m.id} onClick={() => setSelectedMode(m.id)}
                  className={`${selectedMode === m.id ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#1a1a2e] hover:bg-[#252540]'}`}>{m.label}</Button>
              ))}
            </div>

            {/* Battles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(battle => (
                <Card key={battle.id} className="bg-[#1a1a2e] border-red-500/20 hover:border-red-500/60 transition-all duration-300 hover:scale-105 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 p-4 border-b border-red-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-red-500 text-white font-bold">{battle.mode}</Badge>
                        {battle.is_private && <Lock className="text-yellow-500" size={16} />}
                      </div>
                      <div className="text-gray-300 text-sm">
                        Giriş Ücreti: <span className="text-green-400 font-semibold">$ {Number(battle.entry_price).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="mb-3">
                        <p className="text-gray-400 text-sm mb-1">Kasalar:</p>
                        <div className="flex flex-wrap gap-1">
                          {(battle.cases || []).map((c) => (
                            <Badge key={c._id} className="bg-purple-500/20 text-purple-300 text-xs">{c.name}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-gray-400 text-xs">Oyuncular</p>
                          <p className="text-white font-bold text-lg">
                            {(battle.players || []).length} / {battle.maxPlayers}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Durum</p>
                          <p className="text-white font-bold text-lg capitalize">
                            {battle.status}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {(battle.players || []).includes(email)
                          ? <Button onClick={() => startBattle(battle.id)} className="bg-red-600 hover:bg-red-700 text-white w-full">Başlat</Button>
                          : <Button onClick={() => joinBattle(battle.id)} className="bg-red-600 hover:bg-red-700 text-white w-full">Katıl</Button>
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!loading && filtered.length === 0 && (
              <div className="text-center py-20">
                <Swords className="mx-auto mb-4 text-gray-600" size={80} />
                <p className="text-gray-400 text-xl">Aktif savaş bulunamadı</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="my" className="mt-6">
            <div className="text-center py-20">
              <Swords className="mx-auto mb-4 text-gray-600" size={80} />
              <h3 className="text-2xl font-bold text-gray-400 mb-2">Henüz Savaşınız Yok</h3>
              <p className="text-gray-500 mb-6">Bir savaş oluşturun veya mevcut birine katılın</p>
              <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">Savaş Oluştur</Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="text-center py-20">
              <Swords className="mx-auto mb-4 text-gray-600" size={80} />
              <p className="text-gray-400 text-xl">Savaş geçmişiniz boş</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <Card className="bg-[#1a1a2e] border-purple-500/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Kasa Savaşları Nasıl Çalışır?</h3>
            <div className="space-y-3 text-gray-300">
              <p>• Bir savaşa katılın veya kendiniz oluşturun</p>
              <p>• Tüm oyuncular belirlenen kasaları açar</p>
              <p>• En yüksek toplam değere sahip oyuncu tüm ödülleri kazanır</p>
              <p>• 1v1, 1v1v1 veya 1v1v1v1 modlarında oynayın</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-3xl bg-[#1a1a2e] border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Yeni Savaş</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">
                <X />
              </button>
            </div>

            <form onSubmit={createBattle} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-300">Mod</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="mt-1 w-full bg-[#0a0a0f] border border-purple-500/30 text-white rounded-md p-2"
                  >
                    {MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Giriş Ücreti (opsiyonel)</label>
                  <Input
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder={`Örn: ${computedPrice.toFixed(2)}`}
                    className="bg-[#0a0a0f] border-purple-500/30 text-white"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-purple-600" />
                    Özel (private)
                  </label>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-300 mb-2">Kasalar (tıklayarak seç/çıkar):</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto pr-1">
                  {casesAll.map(c => {
                    const id = c._id || c.id;
                    const selected = selCaseIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleCase(id)}
                        className={`text-left p-3 rounded-lg border ${selected ? 'border-purple-400 bg-purple-400/10' : 'border-white/10 bg-white/5'} hover:border-purple-500/60`}
                      >
                        <div className="text-white font-semibold">{c.name}</div>
                        <div className="text-gray-400 text-sm">$ {Number(c.price).toFixed(2)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-gray-300">
                  Seçili kasa sayısı: <span className="text-white font-bold">{selCaseIds.length}</span> &nbsp;|&nbsp;
                  Toplam fiyat (öneri): <span className="text-green-400 font-bold">$ {computedPrice.toFixed(2)}</span>
                </div>
                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">Oluştur</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
