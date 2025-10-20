import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { statistics } from '../mockData'; // sadece istatistikler mock'tan
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Package,
  ArrowUp,
  Swords,
  FileText,
  Users,
  Gamepad2,
  Shield,
  Wrench,
  Clock
} from 'lucide-react';

const API =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://127.0.0.1:8000/api';

const iconMap = {
  'package': Package,
  'arrow-up': ArrowUp,
  'sword': Swords,
  'file-contract': FileText,
  'users': Users
};

const Home = () => {
  // --- Kasalar (DB'den) ---
  const [allCases, setAllCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState('');

  // --- Balance state (DB'den) ---
  const [balance, setBalance] = useState(null);
  const [balLoading, setBalLoading] = useState(true);

  // basit debounce (gerekirse)
  const debounced = useMemo(() => {
    let t; return (cb) => { clearTimeout(t); t = setTimeout(cb, 200); };
  }, []);

  // Kasaları çek
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setCasesLoading(true); setCasesError('');
      try {
        // 24-32 kayıt yeterli; UI zaten slice ediyor
        const url = `${API}/public/cases?limit=32`;
        const res = await fetch(url, { credentials: 'include', cache: 'no-store', signal: ac.signal });
        const text = await res.text(); // body YALNIZCA bir kez
        if (!res.ok) {
          const msg = text?.slice(0, 200) || `HTTP ${res.status}`;
          throw new Error(`Kasa listesi alınamadı: ${msg}`);
        }
        let data; try { data = text ? JSON.parse(text) : []; } catch { throw new Error('Geçersiz JSON'); }
        const list = Array.isArray(data) ? data : (data?.items || data?.data || []);
        if (!Array.isArray(list)) throw new Error('Beklenmeyen yanıt şeması');
        setAllCases(list);
      } catch (e) {
        setAllCases([]);
        setCasesError(e.message || 'Kasa listesi çekilemedi');
        // burada toast kullanmak istersen import edip gösterebilirsin
        console.error('cases fetch error:', e);
      } finally {
        setCasesLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  // Featured: DB’de featured alanı yoksa isNew veya isPremium’dan türet
  const featuredCases = (allCases
    .filter(c => c?.featured || c?.isNew || c?.isPremium)
    .slice(0, 3)
  );
  // Eğer filtre boş dönerse, ilk üç kaydı göster
  const fallbackFeatured = featuredCases.length ? featuredCases : allCases.slice(0, 3);

  // Recent grid: ilk 8 kayıt
  const recentCases = allCases.slice(0, 8);

  // Balance çek
  useEffect(() => {
    const email = localStorage.getItem('user_email');
    if (!email) {
      setBalLoading(false);
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        setBalLoading(true);
        const res = await fetch(
          `${API}/public/user-by-email?email=${encodeURIComponent(email)}`,
          { signal: ac.signal }
        );
        const text = await res.text();
        if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
        const data = text ? JSON.parse(text) : {};
        setBalance(Number(data.balance ?? 0));
      } catch (e) {
        console.error('balance fetch error:', e);
        setBalance(null);
      } finally {
        setBalLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const formatMoney = (v) =>
    typeof v === 'number'
      ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—';

  return (
    <div className="min-h-screen">
      {/* Hero Section - Featured Cases */}
      <section className="relative bg-gradient-to-br from-purple-900/30 via-[#1a1a2e] to-orange-900/30 py-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iIzhhNWNmNiIgc3Ryb2tlLXdpZHRoPSIuNSIgb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-20"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          {/* Top right: Balance + Admin */}
          <div className="flex justify-end items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a2e]/90 border border-purple-500/30 shadow-sm">
              <span className="text-xs uppercase tracking-wide text-gray-300">Bakiye</span>
              <span className="text-white font-semibold">
                {balLoading ? 'Yükleniyor…' : `$ ${formatMoney(balance)}`}
              </span>
            </div>
            <Link to="/admin">
              <Button className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white font-semibold shadow-lg">
                Admin Paneli
              </Button>
            </Link>
          </div>

          {/* Featured grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-12">
            {/* Featured Case 1 */}
            {!casesLoading && !casesError && fallbackFeatured[0] && (
              <Link to={`/case/${fallbackFeatured[0]._id || fallbackFeatured[0].id}`}>
                <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 hover:scale-[1.02] overflow-hidden group cursor-pointer">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        {fallbackFeatured[0].isNew && (
                          <Badge className="bg-orange-500 text-white mb-2">YENİ</Badge>
                        )}
                        <h3 className="text-2xl font-bold text-white mb-2">{fallbackFeatured[0].name}</h3>
                        <p className="text-gray-400">4 SAATLIK ÇEKİLİŞ</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-8 h-12 bg-purple-600 rounded"></div>
                        <div className="w-8 h-12 bg-yellow-600 rounded"></div>
                        <div className="w-8 h-12 bg-blue-600 rounded"></div>
                      </div>
                    </div>

                    <div className="relative aspect-video mb-4 rounded-lg overflow-hidden">
                      <img
                        src={fallbackFeatured[0].image}
                        alt={fallbackFeatured[0].name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">AWP | FT ST</p>
                        <p className="text-lg font-semibold text-white">Atheris</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-500">
                          $ {Number(fallbackFeatured[0].price).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-400 flex items-center gap-2 justify-end mt-2">
                          <Clock size={14} />
                          <span>00:34:41</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Featured Case 2 */}
            {!casesLoading && !casesError && fallbackFeatured[1] && (
              <Link to={`/case/${fallbackFeatured[1]._id || fallbackFeatured[1].id}`}>
                <Card className="bg-gradient-to-br from-red-900/50 to-red-800/30 border-red-500/30 hover:border-red-400/60 transition-all duration-300 hover:scale-[1.02] overflow-hidden group cursor-pointer">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        {(fallbackFeatured[1].isPremium || fallbackFeatured[1].type === 'premium') && (
                          <Badge className="bg-yellow-500 text-black mb-2 font-bold">PREMIUM</Badge>
                        )}
                        <h3 className="text-2xl font-bold text-white mb-2">{fallbackFeatured[1].name}</h3>
                        <p className="text-gray-400">PREMIUM ÇEKİLİŞ</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-8 h-12 bg-purple-600 rounded"></div>
                        <div className="w-8 h-12 bg-yellow-600 rounded"></div>
                        <div className="w-8 h-12 bg-blue-600 rounded"></div>
                      </div>
                    </div>

                    <div className="relative aspect-video mb-4 rounded-lg overflow-hidden">
                      <img
                        src={fallbackFeatured[1].image}
                        alt={fallbackFeatured[1].name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">★ Huntsman Knife | MW ST</p>
                        <p className="text-lg font-semibold text-white">Crimson Web</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-500">
                          $ {Number(fallbackFeatured[1].price).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-400 flex items-center gap-2 justify-end mt-2">
                          <Clock size={14} />
                          <span>03:22:02</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="bg-[#16162e] py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {statistics.map((stat, index) => {
              const Icon = iconMap[stat.icon];
              return (
                <div key={index} className="flex items-center gap-3 p-4 bg-[#1a1a2e] rounded-lg border border-orange-500/20 hover:border-orange-500/40 transition-colors">
                  {Icon && <Icon className="text-orange-500" size={24} />}
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Game Modes Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <button className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
              <Gamepad2 size={20} />
              <span className="font-semibold">CS 2</span>
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-[#1a1a2e] hover:bg-[#252540] rounded-lg transition-colors">
              <Shield size={20} />
              <span className="font-semibold">DOTA 2</span>
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-[#1a1a2e] hover:bg-[#252540] rounded-lg transition-colors">
              <Wrench size={20} />
              <span className="font-semibold">RUST</span>
            </button>
          </div>

          <div className="relative h-[400px] rounded-2xl overflow-hidden">
            <img
              src="https://placehold.co/1200x400/4B0082/ffffff?text=ESPORTS+EVENT"
              alt="Esports Event"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items:end">
              <div className="p-8 w-full">
                <h2 className="text-4xl font-bold text-white mb-4">ESPORTS EVENT</h2>
                <p className="text-gray-300 mb-4">En büyük turnuvaları takip edin ve özel kasaları açın!</p>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8">
                  Şimdi Keşfet
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Cases */}
      <section className="py-12 px-4 bg-[#16162e]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8">Popüler Kasalar</h2>

          {casesLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[360px] rounded-xl bg-[#1a1a2e] border border-purple-500/20 animate-pulse" />
              ))}
            </div>
          )}

          {!casesLoading && !casesError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentCases.map(caseItem => {
            const cid = caseItem._id || caseItem.id;
            return (
              <Card key={cid} className="bg-[#1a1a2e] border-purple-500/20 hover:border-purple-500/60 transition-all duration-300 hover:scale-105 overflow-hidden group cursor-pointer">
                <CardContent className="p-0">
                  <div className="relative aspect-[3/4]">
                    <img
                      src={caseItem.image}
                      alt={caseItem.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {caseItem.isNew && (
                      <Badge className="absolute top-2 right-2 bg-orange-500 text-white">YENİ</Badge>
                    )}
                    {(caseItem.isPremium || caseItem.type === 'premium') && (
                      <Badge className="absolute top-2 right-2 bg-yellow-500 text-black font-bold">PREMIUM</Badge>
                    )}
                  </div>

                  {/* p-4 alanı komple Link: tıklayınca yönlendirir */}
                  <Link to={`/case/${cid}`} className="block p-8">
                    <h3 className="text-lg font-bold text-white mb-2">{caseItem.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-500">
                        $ {Number(caseItem.price).toFixed(2)}
                      </span>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        Aç
                      </Button>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            );
          })}

            </div>
          )}

          {!casesLoading && casesError && (
            <div className="text-center py-12">
              <p className="text-red-400">{casesError}</p>
            </div>
          )}

          <div className="text-center mt-8">
            <Link to="/cases">
              <Button className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white font-semibold px-8 py-6 text-lg">
                Tüm Kasaları Görüntüle
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
