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

// Animasyon sabitleri (CaseOpening ile aynı mantık)
const SPIN_MS = 5000;
const STRIP_LEN = 100;
const WIN_INDEX = 70;

function useOnce(fn, deps) {
  const did = useRef(false);
  useEffect(() => { if (!did.current) { did.current = true; fn(); } }, deps);
}

export default function BattlePlay() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [battle, setBattle] = useState(null);
  const [rounds, setRounds] = useState([]); // backend'den gelecek
  const [curr, setCurr] = useState(-1);     // aktif round index
  const [spinning, setSpinning] = useState(false);
  const [finished, setFinished] = useState(false);

  // Her oyuncu için ayrı ref tutuyoruz (iki şerit)
  const spinnerRefs = useRef({}); // key: player email -> DOM

  const fetchBattle = async () => {
    const res = await fetch(`${API}/public/battles/${id}`, { cache: 'no-store' });
    if (!res.ok) {
      alert('Battle bulunamadı'); navigate('/battles'); return;
    }
    const data = await res.json();
    setBattle(data);
  };

  useOnce(fetchBattle, [id]);

  const startBattle = async () => {
    const res = await fetch(`${API}/public/battles/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const text = await res.text();
    if (!res.ok) {
      alert(text || 'Başlatılamadı');
      return;
    }
    const data = text ? JSON.parse(text) : {};
    setBattle(data);
    setRounds(data.rounds || []);
    // 0. round’dan başla
    setCurr(0);
  };

  // Şerit üret — görünürde kazananı WIN_INDEX'e koy
  const makeStripWithWinner = (winnerLabel, rarityColor = '#4B69FF', rarityName = 'Mil-Spec', price = 10) => {
    const fake = (i) => ({
      label: `Item ${i}`,
      rarityColor,
      rarityName,
      price: Math.max(0.1, price * (0.7 + Math.random() * 0.8))
    });
    const arr = Array.from({ length: STRIP_LEN }, (_, i) => fake(i));
    const winner = { label: winnerLabel, rarityColor, rarityName, price };
    arr[WIN_INDEX] = winner;
    return { arr, winner };
  };

  const computeTargetTranslate = (el) => {
    if (!el || el.children.length < 2) return 0;
    const a = el.children[0].getBoundingClientRect();
    const b = el.children[1].getBoundingClientRect();
    const step = (b.left + b.width / 2) - (a.left + a.width / 2);
    const targetCenter = (a.left + a.width / 2) + step * WIN_INDEX;
    const mid = window.innerWidth / 2;
    return -(targetCenter - mid);
  };

  // Bir round’ı tüm oyuncular için aynı anda oynat
  const playRound = (round) => {
    if (!round) return;
    setSpinning(true);

    // Her oyuncu için şerit hazırla + DOM’a dök
    const perPlayer = {};
    round.rolls.forEach((r) => {
      const ref = spinnerRefs.current[r.player];
      if (!ref) return;
      const { arr } = makeStripWithWinner(
        r.label,
        r.rarityColor,
        r.rarityName,
        r.value
      );
      // render
      ref.innerHTML = '';
      arr.forEach((itm, i) => {
        const div = document.createElement('div');
        div.className = 'min-w-[160px] h-[200px] bg-[#1a1a2e] rounded-lg border-2 flex flex-col items-center justify-center p-3 mx-2';
        div.style.borderColor = itm.rarityColor;
        div.innerHTML = `
          <div class="text-xs text-gray-400 mb-1 text-center w-full truncate">${itm.rarityName}</div>
          <div class="w-full h-16 mb-2 bg-black/30 rounded flex items-center justify-center"><div class="text-3xl">🔫</div></div>
          <div class="text-sm font-semibold text-white text-center w-full truncate">${itm.label}</div>
          <div class="text-green-500 font-bold mt-1">$ ${(Number(itm.price)||0).toFixed(2)}</div>
        `;
        ref.appendChild(div);
      });
    });

    // reflow → hepsini aynı anda hareket ettir
    requestAnimationFrame(() => {
      round.rolls.forEach((r) => {
        const ref = spinnerRefs.current[r.player];
        if (!ref) return;
        ref.style.transition = 'none';
        ref.style.transform = 'translateX(0px)';
        void ref.getBoundingClientRect();

        const tx = computeTargetTranslate(ref);
        ref.style.transition = `transform ${SPIN_MS/1000}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
        ref.style.transform = `translateX(${tx}px)`;
      });

      let done = 0;
      const onEnd = () => {
        done += 1;
        if (done >= (round.rolls || []).length) {
          setSpinning(false);
          // Sonraki round’a geç
          setTimeout(() => {
            if (curr + 1 < rounds.length) setCurr((x) => x + 1);
            else setFinished(true);
          }, 600);
        }
      };

      round.rolls.forEach((r) => {
        const ref = spinnerRefs.current[r.player];
        if (!ref) return;
        const handler = () => {
          ref.removeEventListener('transitionend', handler);
          onEnd();
        };
        ref.addEventListener('transitionend', handler);
      });
    });
  };

  // Curr değişince o round’ı çal
  useEffect(() => {
    if (curr >= 0 && curr < rounds.length) playRound(rounds[curr]);
  }, [curr]);

  if (!battle) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Yükleniyor…
      </div>
    );
  }

  const players = battle.players || [];
  const activeCase = curr >= 0 && curr < rounds.length ? rounds[curr].case : null;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Üst bilgi */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Savaş Oynatılıyor</h1>
            <p className="text-gray-400">Mod: <span className="text-white">{battle.mode}</span> — Oyuncular: <span className="text-white">{players.length}</span></p>
          </div>
          <Button onClick={() => navigate('/battles')} variant="outline" className="border-purple-500/40 text-purple-200 hover:bg-purple-900/20">Geri</Button>
        </div>

        {/* Case başlığı */}
        {activeCase ? (
          <Card className="mb-6 bg-[#1a1a2e] border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <img src={activeCase.image} alt="" className="w-20 h-20 rounded-lg object-cover" />
              <div>
                <div className="text-gray-300 text-sm">Açılan kasa</div>
                <div className="text-xl font-bold text-white">{activeCase.name}</div>
                <div className="text-green-400 font-semibold">$ {Number(activeCase.price).toFixed(2)}</div>
              </div>
              <div className="ml-auto">
                <Badge className="bg-purple-600 text-white">{curr+1} / {rounds.length}</Badge>
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
          {players.map((p) => (
            <Card key={p} className="bg-[#16162e] border-purple-500/20 overflow-hidden">
              <CardContent className="p-0">
                <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
                  <div className="text-white font-semibold">{p}</div>
                  <Badge className="bg-orange-500 text-white">{spinning ? 'Açılıyor…' : (curr >= 0 ? `Round ${curr+1}` : 'Hazır')}</Badge>
                </div>

                {/* Merkiz çizgi */}
                <div className="relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-yellow-500 z-10" />
                  <div ref={(el) => { spinnerRefs.current[p] = el; }} className="flex gap-3 py-6 px-2 will-change-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bitti ekranı */}
        {finished && (
          <Card className="mt-8 bg-[#1a1a2e] border-green-500/30">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-white mb-2">Savaş bitti 🎉</div>
              <div className="text-gray-300 mb-4">
                Kazanan: <span className="text-green-400 font-semibold">{battle.winner}</span>
              </div>
              <div className="text-gray-400 text-sm mb-4">
                Toplamlar:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {battle.totals && Object.entries(battle.totals).map(([k, v]) => (
                  <div key={k} className="p-3 rounded bg-white/5 flex items-center justify-between">
                    <div className="text-white">{k}</div>
                    <div className="text-green-400 font-bold">$ {Number(v).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button onClick={() => { setCurr(-1); setFinished(false); setRounds([]); fetchBattle(); }} className="bg-purple-600 hover:bg-purple-700">Tekrar</Button>
                <Button onClick={() => navigate('/battles')} variant="outline" className="border-purple-500/40 text-purple-200 hover:bg-purple-900/20">Savaş Listesine Dön</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
