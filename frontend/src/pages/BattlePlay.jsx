/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const API =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://127.0.0.1:8000/api';

const SPIN_MS   = 5000;   // animasyon süresi
const STRIP_LEN = 120;    // kart sayısı
const WIN_INDEX = 90;     // merkeze gelecek index

export default function BattlePlay() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');
  const [battle, setBattle] = useState(null); // { players, mode, rounds: [{case: {name, price, image, contents?}, rolls:[{player,...}]}] }

  // rounds çalışırken:
  const [curr, setCurr] = useState(-1);
  const [spinning, setSpinning] = useState(false);
  const [finished, setFinished] = useState(false);

  // oyuncu → şerit kartları
  const [strips, setStrips] = useState({});              // { [player]: Item[] }
  const spinnerRefs = useRef({});                        // { [player]: HTMLDivElement }

  // oyuncu toplamları ve kazandığı drop listeleri
  const [totals, setTotals] = useState({});              // { [player]: number }
  const [wonItems, setWonItems] = useState({});          // { [player]: Item[] }

  // ------------------ CORE HELPERS ------------------

  // Case içeriği yoksa sahte item üret
  const fakeItem = (i) => ({
    label: `Item ${i + 1}`,
    rarityName: 'Mil-Spec',
    rarityColor: '#4B69FF',
    value: Number((5 + Math.random() * 25).toFixed(2)),
    key: `f-${i}-${Math.random().toString(36).slice(2)}`,
  });

  // Rarite ağırlıklı seçim (case.contents beklenen alanlar: rarity, rarityName, rarityColor, price/name)
  const pickWeightedFromCase = (caseObj) => {
    const list = Array.isArray(caseObj?.contents) ? caseObj.contents : [];
    if (!list.length) return fakeItem(0);

    // havuzları kur
    const pools = {
      knife: list.filter(x => x.rarity === 'knife'),
      covert: list.filter(x => x.rarity === 'covert'),
      classified: list.filter(x => x.rarity === 'classified'),
      restricted: list.filter(x => x.rarity === 'restricted'),
      milspec: list.filter(x => x.rarity === 'milspec'),
      low: list.filter(x => x.rarity === 'consumer' || x.rarity === 'industrial'),
    };

    const r = Math.random() * 100;
    let pool =
      r < 0.5  ? pools.knife :
      r < 2    ? pools.covert :
      r < 7    ? pools.classified :
      r < 20   ? pools.restricted :
      r < 50   ? pools.milspec :
                 pools.low;
    if (!pool || !pool.length) pool = list;

    const raw = pool[Math.floor(Math.random() * pool.length)];
    return {
      label: raw.name || `${raw.weapon || ''} ${raw.skinName || ''}`.trim() || 'Drop',
      rarityName: raw.rarityName || raw.rarity || 'Unknown',
      rarityColor: raw.rarityColor || '#888',
      value: Number(raw.price ?? raw.value ?? 0),
      key: `r-${Math.random().toString(36).slice(2)}`,
    };
  };

  const makeStripWithWinner = (caseObj, winner) => {
    const arr = Array.from({ length: STRIP_LEN }, (_, i) => {
      const it = pickWeightedFromCase(caseObj);
      return { ...it, key: `${it.key}-${i}` };
    });
    const w = winner || pickWeightedFromCase(caseObj);
    arr[WIN_INDEX] = { ...w, key: 'WINNER' };
    return { arr, winner: w };
  };

  const computeTargetTranslate = (el) => {
    try {
      if (!el || el.children.length < 2) return 0;
      const a = el.children[0].getBoundingClientRect();
      const b = el.children[1].getBoundingClientRect();
      const step = (b.left + b.width / 2) - (a.left + a.width / 2);
      const targetCenter = (a.left + a.width / 2) + step * WIN_INDEX;
      const mid = window.innerWidth / 2;
      return -(targetCenter - mid);
    } catch { return 0; }
  };

  // Case içeriği yoksa bir defa daha dene (isimle tek case çekme)
  const ensureCaseWithContents = async (roughCase) => {
    if (Array.isArray(roughCase?.contents) && roughCase.contents.length) return roughCase;
    try {
      const q = encodeURIComponent(roughCase?.name || '');
      const res = await fetch(`${API}/public/cases?search=${q}&limit=1`, { cache: 'no-store' });
      if (!res.ok) return roughCase;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items || data.data || []);
      if (list?.[0]) return list[0];
    } catch {}
    return roughCase; // yine de dön
  };

  // ------------------ FETCH BATTLE ------------------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/public/battles/${id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        // state’leri başlat
        const t = {};
        const w = {};
        (data.players || []).forEach(p => { t[p] = 0; w[p] = []; });
        setTotals(t);
        setWonItems(w);

        // şerit sözlüğünü de boş hazırla
        const sp = {};
        (data.players || []).forEach(p => { sp[p] = []; });
        setStrips(sp);

        setBattle(data);
      } catch (e) {
        setFatal(e.message || 'Savaş bilgisi alınamadı');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ------------------ START BATTLE ------------------
  const startBattle = async () => {
    try {
      setFatal('');
      const res = await fetch(`${API}/public/battles/${id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'Başlatılamadı');
      const data = text ? JSON.parse(text) : {};
      setBattle(data);
      setCurr(0);
    } catch (e) {
      setFatal(e.message || 'Başlatma hatası');
    }
  };

  // ------------------ PLAY ROUND ------------------
  useEffect(() => {
    (async () => {
      if (!battle || curr < 0) return;
      const rounds = battle.rounds || [];
      if (curr >= rounds.length) return;

      // bu round’un kasasını düzgünleştir
      const caseObj = await ensureCaseWithContents(rounds[curr].case);

      // her oyuncu için şerit üret (kazananlar backend’den gelebilir; yoksa client seçer)
      const next = { ...strips };
      const rolledWinners = []; // {player, winner}

      (rounds[curr].rolls || battle.players || []).forEach((entry) => {
        const player = typeof entry === 'string' ? entry : entry.player;
        const result = makeStripWithWinner(caseObj, entry?.winner); // winner varsa kullan
        next[player] = result.arr;
        rolledWinners.push({ player, winner: result.winner });
      });

      setStrips(next);

      // DOM render‘ını bekle → animasyonu başlat
      requestAnimationFrame(() => {
        setSpinning(true);

        (rounds[curr].rolls || battle.players || []).forEach((entry) => {
          const player = typeof entry === 'string' ? entry : entry.player;
          const ref = spinnerRefs.current[player];
          if (!ref) return;

          // reset + hedefe kaydır
          ref.style.transition = 'none';
          ref.style.transform = 'translateX(0px)';
          void ref.getBoundingClientRect();

          const tx = computeTargetTranslate(ref);
          ref.style.transition = `transform ${SPIN_MS / 1000}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
          ref.style.transform = `translateX(${tx}px)`;
        });

        // tüm oyuncular bitince round tamamlanır
        let ended = 0;
        const onEndOne = () => {
          ended += 1;
          if (ended >= (battle.players || []).length) {
            setSpinning(false);

            // kazançları kaydet
            const t = { ...totals };
            const w = { ...wonItems };
            rolledWinners.forEach(({ player, winner }) => {
              t[player] = Number((t[player] + (Number(winner.value) || 0)).toFixed(2));
              w[player] = [...(w[player] || []), winner];
            });
            setTotals(t);
            setWonItems(w);

            // sıradaki raund
            setTimeout(() => {
              if (curr + 1 < (battle.rounds || []).length) setCurr(curr + 1);
              else setFinished(true);
            }, 600);
          }
        };

        (battle.players || []).forEach((player) => {
          const ref = spinnerRefs.current[player];
          if (!ref) return;
          const handler = () => {
            ref.removeEventListener('transitionend', handler);
            onEndOne();
          };
          ref.addEventListener('transitionend', handler);
        });
      });
    })();
  }, [curr, battle]);

  // ------------------ FINISH / WINNER ------------------
  const winnerKey = (() => {
    let best = null, bestVal = -1;
    Object.entries(totals).forEach(([p, v]) => { if (v > bestVal) { best = p; bestVal = v; } });
    return finished ? best : null;
  })();

  const finishOnServer = async () => {
    try {
      await fetch(`${API}/public/battles/${id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totals, winner: winnerKey, drops: wonItems }),
      });
    } catch { /* sessizce geç */ }
  };

  useEffect(() => { if (finished && winnerKey) finishOnServer(); }, [finished, winnerKey]);

  // ------------------ RENDER ------------------
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-300">Yükleniyor…</div>;
  }
  if (fatal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="bg-[#1a1a2e] border-red-500/30">
          <CardContent className="p-6 text-center">
            <div className="text-red-400 font-semibold mb-2">Hata</div>
            <div className="text-gray-300 mb-4">{fatal}</div>
            <Button onClick={() => navigate('/battles')} className="bg-purple-600 hover:bg-purple-700">Savaş listesine dön</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!battle) return null;

  const players = battle.players || [];
  const rounds = battle.rounds || [];
  const activeCase = curr >= 0 && curr < rounds.length ? rounds[curr].case : null;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Üst bilgi */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-400">
            <span>Mod:</span> <span className="text-white font-semibold ml-1">{battle.mode || '-'}</span>
            <span className="ml-6">Oyuncular:</span> <span className="text-white font-semibold ml-1">{players.length}</span>
          </div>
          <Button onClick={() => navigate('/battles')} variant="outline" className="border-purple-500/40 text-purple-200 hover:bg-purple-900/20">Geri</Button>
        </div>

        {/* Başlat ya da aktif kasa */}
        {!activeCase ? (
          <Card className="mb-6 bg-[#1a1a2e] border-purple-500/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-white font-semibold">Savaşı başlat</div>
              <Button onClick={startBattle} disabled={spinning} className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white">
                Başlat
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 bg-[#1a1a2e] border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              {activeCase.image ? (
                <img src={activeCase.image} alt="" className="w-20 h-20 rounded-lg object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-white/5 flex items-center justify-center text-2xl">🧰</div>
              )}
              <div>
                <div className="text-gray-300 text-sm">Açılan kasa</div>
                <div className="text-xl font-bold text-white">{activeCase.name}</div>
                <div className="text-green-400 font-semibold">$ {Number(activeCase.price).toFixed(2)}</div>
              </div>
              <div className="ml-auto">
                <Badge className="bg-purple-600 text-white">{curr + 1} / {rounds.length}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Oyuncu şeritleri */}
        <div className="space-y-8">
          {players.map((p) => {
            const items = strips[p] || [];
            return (
              <Card key={p} className="bg-[#16162e] border-purple-500/20 overflow-hidden">
                <CardContent className="p-0">
                  <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <div className="text-white font-semibold">{p}</div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-white/10 text-green-400">Toplam: $ {Number(totals[p] || 0).toFixed(2)}</Badge>
                      <Badge className="bg-orange-500 text-white">{spinning ? 'Açılıyor…' : (curr >= 0 ? `Round ${curr + 1}` : 'Hazır')}</Badge>
                    </div>
                  </div>

                  <div className="relative">
                    {/* merkez çizgisi */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-yellow-500 z-10" />
                    <div
                      ref={(el) => { spinnerRefs.current[p] = el; }}
                      className="flex gap-3 py-6 px-2 will-change-transform"
                    >
                      {items.map((itm, i) => (
                        <div
                          key={`${itm.key}-${i}`}
                          className="min-w-[160px] h-[200px] bg-[#1a1a2e] rounded-lg border-2 flex flex-col items-center justify-center p-3"
                          style={{ borderColor: itm.rarityColor || '#666' }}
                        >
                          <div className="text-xs text-gray-400 mb-1 text-center w-full truncate">{itm.rarityName || '—'}</div>
                          <div className="w-full h-16 mb-2 bg-black/30 rounded flex items-center justify-center">
                            <div className="text-3xl">🔫</div>
                          </div>
                          <div className="text-sm font-semibold text-white text-center w-full truncate">{itm.label || 'Drop'}</div>
                          <div className="text-green-500 font-bold mt-1">$ {(Number(itm.value) || 0).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* o oyuncunun kazandığı drop’lar (küçük rozetler) */}
                  {(wonItems[p]?.length || 0) > 0 && (
                    <div className="px-4 pb-4 flex flex-wrap gap-2">
                      {wonItems[p].map((w, idx) => (
                        <Badge key={`${p}-w-${idx}`} className="bg-white/10 text-white">
                          {w.label} • ${Number(w.value).toFixed(2)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* BİTİŞ */}
        {finished && (
          <Card className="mt-8 bg-[#1a1a2e] border-green-500/30">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-white mb-2">Savaş bitti 🎉</div>
              <div className="text-gray-300 mb-4">
                Kazanan: <span className="text-green-400 font-semibold">{winnerKey}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto mb-6">
                {Object.entries(totals).map(([k, v]) => (
                  <div key={k} className="p-3 rounded bg-white/5 flex items-center justify-between">
                    <div className="text-white">{k}</div>
                    <div className="text-green-400 font-bold">$ {Number(v).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                <Button onClick={() => { setCurr(-1); setFinished(false); setTotals({}); setWonItems({}); }} className="bg-purple-600 hover:bg-purple-700">Tekrar</Button>
                <Button onClick={() => navigate('/battles')} variant="outline" className="border-purple-500/40 text-purple-200 hover:bg-purple-900/20">Savaş Listesi</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
