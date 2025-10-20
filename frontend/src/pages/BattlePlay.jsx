/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const API =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  'http://127.0.0.1:8000/api';

const SPIN_MS = 5000;
const STRIP_LEN = 100;
const WIN_INDEX = 70;

export default function BattlePlay() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');
  const [battle, setBattle] = useState(null);

  const [rounds, setRounds] = useState([]); // backend’den gelecek
  const [curr, setCurr] = useState(-1);     // aktif round
  const [spinning, setSpinning] = useState(false);
  const [finished, setFinished] = useState(false);

  // Her oyuncu için şerit state + ref
  const [strips, setStrips] = useState({});            // { [player]: Item[] }
  const spinnerRefs = useRef({});                      // { [player]: HTMLDivElement }

  // ---------------- Fetch battle ----------------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/public/battles/${id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setBattle(data);
        // şerit state’ini oyunculara göre hazırla
        const init = {};
        (data.players || []).forEach(p => (init[p] = []));
        setStrips(init);
      } catch (e) {
        setFatal(e.message || 'Savaş bilgisi alınamadı');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ---------------- Helpers ----------------
  const computeTargetTranslate = (el) => {
    try {
      if (!el || el.children.length < 2) return 0;
      const a = el.children[0].getBoundingClientRect();
      const b = el.children[1].getBoundingClientRect();
      const step = (b.left + b.width / 2) - (a.left + a.width / 2);
      const targetCenter = (a.left + a.width / 2) + step * WIN_INDEX;
      const mid = window.innerWidth / 2;
      return -(targetCenter - mid);
    } catch {
      return 0;
    }
  };

  const makeStripWithWinner = (winner) => {
    const fake = (i) => ({
      label: `Item ${i}`,
      rarityColor: winner.rarityColor || '#4B69FF',
      rarityName: winner.rarityName || 'Mil-Spec',
      price: Math.max(0.1, (winner.value || 10) * (0.6 + Math.random() * 0.9)),
      key: `f-${i}`,
    });
    const arr = Array.from({ length: STRIP_LEN }, (_, i) => fake(i));
    arr[WIN_INDEX] = {
      label: winner.label || 'Drop',
      rarityColor: winner.rarityColor || '#4B69FF',
      rarityName: winner.rarityName || 'Mil-Spec',
      price: Number(winner.value || 10),
      key: 'winner',
    };
    return arr;
  };

  // ---------------- Start battle (rounds üret) ----------------
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
      const r = data.rounds || [];
      setRounds(r);
      // ilk round’a geç
      setCurr(0);
    } catch (e) {
      setFatal(e.message || 'Başlatma hatası');
    }
  };

  // ---------------- Round oynat ----------------
  useEffect(() => {
    if (curr < 0 || curr >= rounds.length) return;
    const round = rounds[curr];
    if (!round) return;

    // oyuncu şeritlerini hazırlayalım (state -> React çizer)
    const next = { ...strips };
    (round.rolls || []).forEach((roll) => {
      next[roll.player] = makeStripWithWinner(roll);
    });
    setStrips(next);

    // Navbar/DOM render olduktan sonra animasyonu başlat
    const t = setTimeout(() => {
      setSpinning(true);
      (round.rolls || []).forEach((roll) => {
        const ref = spinnerRefs.current[roll.player];
        if (!ref) return; // ref henüz bağlanmadıysa güvenli çık
        // reset
        ref.style.transition = 'none';
        ref.style.transform = 'translateX(0px)';
        void ref.getBoundingClientRect();
        // hedef
        const tx = computeTargetTranslate(ref);
        ref.style.transition = `transform ${SPIN_MS / 1000}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
        ref.style.transform = `translateX(${tx}px)`;
      });

      let ended = 0;
      const onEnd = () => {
        ended += 1;
        if (ended >= (round.rolls || []).length) {
          setSpinning(false);
          setTimeout(() => {
            if (curr + 1 < rounds.length) setCurr(curr + 1);
            else setFinished(true);
          }, 600);
        }
      };

      (round.rolls || []).forEach((roll) => {
        const ref = spinnerRefs.current[roll.player];
        if (!ref) return;
        const handler = () => {
          ref.removeEventListener('transitionend', handler);
          onEnd();
        };
        ref.addEventListener('transitionend', handler);
      });
    }, 30);

    return () => clearTimeout(t);
  }, [curr, rounds]);

  // ---------------- Render ----------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Yükleniyor…
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="bg-[#1a1a2e] border-red-500/30">
          <CardContent className="p-6 text-center">
            <div className="text-red-400 font-semibold mb-2">Hata</div>
            <div className="text-gray-300 mb-4">{fatal}</div>
            <Button onClick={() => navigate('/battles')} className="bg-purple-600 hover:bg-purple-700">
              Savaş listesine dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!battle) return null;

  const players = battle.players || [];
  const activeCase = curr >= 0 && curr < rounds.length ? rounds[curr].case : null;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Üst bilgi */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Savaş Oynatılıyor</h1>
            <p className="text-gray-400">
              Mod: <span className="text-white">{battle.mode}</span> — Oyuncular: <span className="text-white">{players.length}</span>
            </p>
          </div>
          <Button onClick={() => navigate('/battles')} variant="outline" className="border-purple-500/40 text-purple-200 hover:bg-purple-900/20">
            Geri
          </Button>
        </div>

        {/* Case kartı veya başlat butonu */}
        {activeCase ? (
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
        ) : (
          <Card className="mb-6 bg-[#1a1a2e] border-purple-500/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-white font-semibold">Savaşı başlat</div>
              <Button onClick={startBattle} disabled={spinning} className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white">
                Başlat
              </Button>
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
                    <Badge className="bg-orange-500 text-white">
                      {spinning ? 'Açılıyor…' : (curr >= 0 ? `Round ${curr + 1}` : 'Hazır')}
                    </Badge>
                  </div>

                  <div className="relative">
                    <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-yellow-500 z-10" />
                    <div
                      ref={(el) => { spinnerRefs.current[p] = el; }}
                      className="flex gap-3 py-6 px-2 will-change-transform"
                    >
                      {items.map((itm) => (
                        <div
                          key={itm.key}
                          className="min-w-[160px] h-[200px] bg-[#1a1a2e] rounded-lg border-2 flex flex-col items-center justify-center p-3"
                          style={{ borderColor: itm.rarityColor }}
                        >
                          <div className="text-xs text-gray-400 mb-1 text-center w-full truncate">{itm.rarityName}</div>
                          <div className="w-full h-16 mb-2 bg-black/30 rounded flex items-center justify-center">
                            <div className="text-3xl">🔫</div>
                          </div>
                          <div className="text-sm font-semibold text-white text-center w-full truncate">{itm.label}</div>
                          <div className="text-green-500 font-bold mt-1">$ {(Number(itm.price) || 0).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bitti ekranı */}
        {finished && (
          <Card className="mt-8 bg-[#1a1a2e] border-green-500/30">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-white mb-2">Savaş bitti 🎉</div>
              <div className="text-gray-300 mb-4">Kazanan: <span className="text-green-400 font-semibold">{battle.winner}</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {battle.totals && Object.entries(battle.totals).map(([k, v]) => (
                  <div key={k} className="p-3 rounded bg-white/5 flex items-center justify-between">
                    <div className="text-white">{k}</div>
                    <div className="text-green-400 font-bold">$ {Number(v).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button onClick={() => { setCurr(-1); setFinished(false); setRounds([]); setFatal(''); }} className="bg-purple-600 hover:bg-purple-700">Tekrar</Button>
                <Button onClick={() => navigate('/battles')} variant="outline" className="border-purple-500/40 text-purple-200 hover:bg-purple-900/20">Savaş Listesi</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
