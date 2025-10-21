/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const API =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api";

// Animasyon ayarları
const SPIN_MS = 5000;
const STRIP_LEN = 120;
const WIN_INDEX = 90;

/* ----------------------- yardımcılar ----------------------- */
const idOfPlayer = (p) => (typeof p === "object" ? (p.email || p.name || p.id) : p);

const pickWeighted = (caseObj) => {
  const list = caseObj?.contents || [];
  if (!list.length) return null;
  const r = Math.random() * 100;
  let pool = [];
  if (r < 0.5) pool = list.filter((i) => i.rarity === "knife");
  else if (r < 2) pool = list.filter((i) => i.rarity === "covert");
  else if (r < 7) pool = list.filter((i) => i.rarity === "classified");
  else if (r < 20) pool = list.filter((i) => i.rarity === "restricted");
  else if (r < 50) pool = list.filter((i) => i.rarity === "milspec");
  else pool = list.filter((i) => ["consumer", "industrial"].includes(i.rarity));
  if (!pool.length) pool = list;
  return pool[Math.floor(Math.random() * pool.length)];
};

const makeStripWithWinner = (caseObj, winnerOverride) => {
  const arr = Array.from({ length: STRIP_LEN }, () => pickWeighted(caseObj)).filter(Boolean);
  const winner = winnerOverride || pickWeighted(caseObj);
  if (!arr.length || !winner) return { arr: [], winner: null };
  arr[WIN_INDEX] = winner;
  return { arr, winner };
};

const ensureCaseWithContents = async (caseField) => {
  if (!caseField) return null;
  if (typeof caseField === "object" && Array.isArray(caseField.contents)) return caseField;
  const cid = typeof caseField === "string" ? caseField : caseField._id || caseField.id;
  if (!cid) return null;
  const res = await fetch(`${API}/public/cases/${cid}`, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
};

/* -------------------------- Sayfa -------------------------- */
export default function BattlePlay() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [battle, setBattle] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [curr, setCurr] = useState(-1); // -1: başlamadı
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [finished, setFinished] = useState(false);

  // oyuncular
  const players = battle?.players || [];

  // her oyuncu için strip ve hedef transform
  const [strips, setStrips] = useState({});        // { [pid]: item[] }
  const [targets, setTargets] = useState({});      // { [pid]: number(px) }
  const [totals, setTotals] = useState({});        // { [pid]: number }
  const [wonItems, setWonItems] = useState({});    // { [pid]: item[] }

  // DOM ölçmek için her oyuncunun container ref’i
  const containersRef = useRef({});                // { [pid]: HTMLDivElement }

  const fetchBattle = useMemo(() => async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/public/battles/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setBattle(data);
      setRounds(Array.isArray(data.rounds) ? data.rounds : []);
      setTotals(data.totals || {});
      setWonItems(data.wonItems || {});
      setCurr(-1);
      setFinished(false);
    } catch (e) {
      console.error("battle fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBattle(); }, [fetchBattle]);

  const startBattle = () => {
    if (!rounds.length || spinning) return;
    setCurr(0);
  };

  // tek round oynat
  const playRound = async (roundObj) => {
    if (!roundObj || !players.length) return;

    const caseObj = await ensureCaseWithContents(roundObj.case);
    if (!caseObj || !Array.isArray(caseObj.contents) || !caseObj.contents.length) return;

    // rolls varsa kullan, yoksa oyuncu listesine düş
    const entries = (Array.isArray(roundObj.rolls) && roundObj.rolls.length > 0)
      ? roundObj.rolls.map(r => ({ player: idOfPlayer(r.player ?? r), winner: r.winner }))
      : players.map(p => ({ player: idOfPlayer(p) }));

    // her oyuncuya şerit ve kazanan
    const nextStrips = {};
    const roundWinners = []; // {player, winner}

    entries.forEach(({ player, winner }) => {
      const { arr, winner: w } = makeStripWithWinner(caseObj, winner);
      nextStrips[player] = arr;
      if (w) roundWinners.push({ player, winner: w });
    });

    setStrips(nextStrips);
    setSpinning(false);
    setTargets({}); // reset

    // render edildikten sonra ölçüp hedef transform’ları yaz
    requestAnimationFrame(() => {
      const nextTargets = {};
      Object.entries(containersRef.current).forEach(([pid, el]) => {
        if (!el) return;
        // her kart sabit genişlik: 160 + gap ~ 12 -> ölçerek gitmeyelim; gerçek ölçüm:
        if (el.children.length < 2) return;
        const a = el.children[0].getBoundingClientRect();
        const b = el.children[1].getBoundingClientRect();
        const step = (b.left + b.width / 2) - (a.left + a.width / 2);
        const targetCenter = (a.left + a.width / 2) + step * WIN_INDEX;
        const mid = window.innerWidth / 2;
        nextTargets[pid] = -(targetCenter - mid);
      });
      setTargets(nextTargets);
      setSpinning(true);

      // SPIN_MS sonra bitiş: totals/wonItems güncelle, sıradaki round’a geç
      setTimeout(() => {
        // toplamları yaz
        const t = { ...(totals || {}) };
        const w = { ...(wonItems || {}) };
        roundWinners.forEach(({ player, winner }) => {
          const val = Number(winner?.price || winner?.value || 0);
          t[player] = Number(((t[player] || 0) + val).toFixed(2));
          w[player] = [...(w[player] || []), winner];
        });
        setTotals(t);
        setWonItems(w);

        setSpinning(false);
        if (curr + 1 < rounds.length) setCurr(c => c + 1);
        else setFinished(true);
      }, SPIN_MS + 50);
    });
  };

  // curr değişince round’u oynat
  useEffect(() => {
    if (curr >= 0 && curr < rounds.length) playRound(rounds[curr]);
  }, [curr, rounds, players]);

  if (loading || !battle) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Yükleniyor…
      </div>
    );
  }

  const activeCase = curr >= 0 && curr < rounds.length ? rounds[curr].case : null;
  const playerIds = players.map(idOfPlayer);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Üst bilgi */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Savaş Oynatılıyor</h1>
            <p className="text-gray-400">
              Mod: <span className="text-white">{battle.mode}</span> — Oyuncular:{" "}
              <span className="text-white">{playerIds.length}</span>
            </p>
          </div>
          <Button
            onClick={() => navigate("/battles")}
            variant="outline"
            className="border-purple-500/40 text-purple-200 hover:bg-purple-900/20"
          >
            Geri
          </Button>
        </div>

        {/* Case başlığı / Başlat */}
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
                <Badge className="bg-purple-600 text-white">{curr + 1} / {rounds.length}</Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 bg-[#1a1a2e] border-purple-500/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-white font-semibold">Savaşı başlat</div>
              <Button
                onClick={startBattle}
                disabled={spinning || !rounds.length}
                className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white"
              >
                Başlat
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Oyuncu şeritleri */}
        <div className="space-y-8">
          {playerIds.map((pid) => {
            const items = strips[pid] || [];
            const translateX = targets[pid] ?? 0;
            return (
              <Card key={pid} className="bg-[#16162e] border-purple-500/20 overflow-hidden">
                <CardContent className="p-0">
                  <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <div className="text-white font-semibold">{pid}</div>
                    <Badge className="bg-orange-500 text-white">
                      {spinning ? "Açılıyor…" : curr >= 0 ? `Round ${curr + 1}` : "Hazır"}
                    </Badge>
                  </div>

                  <div className="relative">
                    <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-yellow-500 z-10" />
                    <div
                      ref={(el) => (containersRef.current[pid] = el)}
                      className="flex gap-3 py-6 px-2 will-change-transform"
                      style={{
                        transform: `translateX(${translateX}px)`,
                        transition: spinning ? `transform ${SPIN_MS / 1000}s cubic-bezier(0.17,0.67,0.12,0.99)` : "none",
                      }}
                    >
                      {items.map((item, i) => (
                        <div
                          key={`${pid}-${i}`}
                          className="min-w-[160px] h-[240px] bg-[#1a1a2e] rounded-lg border-2 flex flex-col items-center justify-center p-4"
                          style={{ borderColor: item?.rarityColor || "#4B0082" }}
                        >
                          <div className="text-xs text-gray-400 mb-2 text-center truncate w-full">
                            {item?.weapon || ""}
                          </div>
                          <div className="w-full h-24 mb-2 bg-black/30 rounded flex items-center justify-center">
                            <div className="text-4xl">🔫</div>
                          </div>
                          <div className="text-sm font-semibold text-white text-center truncate w-full">
                            {item?.skinName || item?.name || ""}
                          </div>
                          <div className="text-xs mt-1" style={{ color: item?.rarityColor || "#a78bfa" }}>
                            {item?.rarityName || ""}
                          </div>
                          <div className="text-green-500 font-bold mt-2">
                            ${Number(item?.price || 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bitti */}
        {finished && (
          <Card className="mt-8 bg-[#1a1a2e] border-green-500/30">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-white mb-2">Savaş bitti 🎉</div>
              <div className="text-gray-400 text-sm mb-4">Toplamlar:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(totals).map(([k, v]) => (
                  <div key={k} className="p-3 rounded bg-white/5 flex items-center justify-between">
                    <div className="text-white">{k}</div>
                    <div className="text-green-400 font-bold">$ {Number(v).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  onClick={() => { setCurr(-1); setFinished(false); setRounds([]); fetchBattle(); }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Tekrar
                </Button>
                <Button
                  onClick={() => navigate("/battles")}
                  variant="outline"
                  className="border-purple-500/40 text-purple-200 hover:bg-purple-900/20"
                >
                  Savaş Listesine Dön
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
