/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState } from "react";
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

// ------------------------------------------------------------------
// Yardımcılar
// ------------------------------------------------------------------
const pickWeighted = (caseObj) => {
  // Rarite ağırlığına benzer basit dağılım
  const r = Math.random() * 100;
  const contents = caseObj?.contents || [];
  if (!contents.length) return null;

  let pool = [];
  if (r < 0.5) pool = contents.filter((i) => i.rarity === "knife");
  else if (r < 2) pool = contents.filter((i) => i.rarity === "covert");
  else if (r < 7) pool = contents.filter((i) => i.rarity === "classified");
  else if (r < 20) pool = contents.filter((i) => i.rarity === "restricted");
  else if (r < 50) pool = contents.filter((i) => i.rarity === "milspec");
  else pool = contents.filter((i) => ["consumer", "industrial"].includes(i.rarity));
  if (!pool.length) pool = contents;
  return pool[Math.floor(Math.random() * pool.length)];
};

const makeStripWithWinner = (caseObj, winnerOverride) => {
  const arr = Array.from({ length: STRIP_LEN }, () => pickWeighted(caseObj)).filter(Boolean);
  const winner = winnerOverride || pickWeighted(caseObj);
  if (!arr.length || !winner) return { arr: [], winner: null };
  arr[WIN_INDEX] = winner;
  return { arr, winner };
};

// Belirli bir ref (container) için hedef translateX’i (WIN_INDEX merkez) hesaplar
const computeTargetTranslate = (containerEl) => {
  if (!containerEl || containerEl.children.length < 2) return 0;
  const a = containerEl.children[0].getBoundingClientRect();
  const b = containerEl.children[1].getBoundingClientRect();
  const step = (b.left + b.width / 2) - (a.left + a.width / 2); // kart merkez aralığı
  const targetCenter = (a.left + a.width / 2) + step * WIN_INDEX;
  const mid = window.innerWidth / 2;
  return -(targetCenter - mid);
};

// Case objesini garantile (id/string geldiyse backend’ten çek)
const ensureCaseWithContents = async (caseField) => {
  if (!caseField) return null;
  if (typeof caseField === "object" && Array.isArray(caseField.contents)) return caseField;

  // { _id } ya da string id
  const cid = typeof caseField === "string" ? caseField : caseField._id || caseField.id;
  if (!cid) return null;

  const res = await fetch(`${API}/public/cases/${cid}`, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
};

// ------------------------------------------------------------------
// Sayfa
// ------------------------------------------------------------------
export default function BattlePlay() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [battle, setBattle] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [curr, setCurr] = useState(-1); // -1: başlamadı
  const [spinning, setSpinning] = useState(false);
  const [finished, setFinished] = useState(false);

  // Her oyuncu için strip state’i ve DOM ref’i
  const [strips, setStrips] = useState({}); // { [email]: item[] }
  const spinnerRefs = useRef({}); // { [email]: HTMLDivElement }

  // Sonuçlar
  const [totals, setTotals] = useState({});     // { [email]: number }
  const [wonItems, setWonItems] = useState({}); // { [email]: item[] }

  const players = useMemo(() => battle?.players || [], [battle]);

  // Backend’ten savaş durumunu çek
  const fetchBattle = useMemo(
    () => async () => {
      try {
        const res = await fetch(`${API}/public/battles/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        // Beklentiler: { players: string[], rounds: [{ case, rolls? }], mode, ... }
        setBattle(data);
        setRounds(Array.isArray(data.rounds) ? data.rounds : []);
        setTotals(data.totals || {});
        setWonItems(data.wonItems || {});
        // Otomatik hazır ekrana gelsin (başlat'a kadar curr = -1)
        setCurr(-1);
        setFinished(false);
      } catch (e) {
        console.error("battle fetch failed:", e);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchBattle();
  }, [fetchBattle]);

  const startBattle = () => {
    if (!rounds.length) return;
    setFinished(false);
    setCurr(0);
  };

  // --- ASIL GÜNCEL KISIM: boş rolls → oyuncu listesine düş ---
  const playRound = async (roundObj) => {
    if (!roundObj || !players.length) return;

    // Case'i garanti et
    const caseObj = await ensureCaseWithContents(roundObj.case);
    if (!caseObj || !Array.isArray(caseObj.contents) || caseObj.contents.length === 0) {
      console.warn("case has no contents");
      return;
    }

    // rolls boşsa/undefined'sa → players fallback
    const entries =
      Array.isArray(roundObj.rolls) && roundObj.rolls.length > 0
        ? roundObj.rolls
        : players.map((p) => ({ player: p }));

    // Şeritleri üret
    const nextStrips = { ...strips };
    const rolled = []; // [{ player, winner }]
    entries.forEach((entry) => {
      const player = typeof entry === "string" ? entry : entry.player;
      const override = typeof entry === "object" ? entry.winner : undefined;
      const { arr, winner } = makeStripWithWinner(caseObj, override);
      nextStrips[player] = arr;
      if (winner) rolled.push({ player, winner });
    });
    setStrips(nextStrips);

    // Animasyon başlat
    requestAnimationFrame(() => {
      setSpinning(true);

      // translate ayarla
      entries.forEach((entry) => {
        const player = typeof entry === "string" ? entry : entry.player;
        const ref = spinnerRefs.current[player];
        if (!ref) return;

        // Kartları renderla (div'leri doldur)
        ref.innerHTML = "";
        (nextStrips[player] || []).forEach((item, i) => {
          const card = document.createElement("div");
          card.style.minWidth = "160px";
          card.style.height = "240px";
          card.style.border = `2px solid ${item?.rarityColor || "#4B0082"}`;
          card.style.borderRadius = "0.5rem";
          card.style.background = "#1a1a2e";
          card.style.display = "flex";
          card.style.flexDirection = "column";
          card.style.alignItems = "center";
          card.style.justifyContent = "center";
          card.style.padding = "16px";

          const top = document.createElement("div");
          top.textContent = item?.weapon || "";
          top.style.color = "#9ca3af";
          top.style.fontSize = "12px";
          top.style.marginBottom = "8px";
          top.style.width = "100%";
          top.style.textAlign = "center";
          top.style.whiteSpace = "nowrap";
          top.style.overflow = "hidden";
          top.style.textOverflow = "ellipsis";

          const imgBox = document.createElement("div");
          imgBox.style.width = "100%";
          imgBox.style.height = "96px";
          imgBox.style.marginBottom = "8px";
          imgBox.style.background = "rgba(0,0,0,0.3)";
          imgBox.style.borderRadius = "8px";
          imgBox.style.display = "flex";
          imgBox.style.alignItems = "center";
          imgBox.style.justifyContent = "center";
          imgBox.textContent = "🔫";
          imgBox.style.fontSize = "28px";

          const name = document.createElement("div");
          name.textContent = item?.skinName || item?.name || "";
          name.style.color = "white";
          name.style.fontSize = "14px";
          name.style.fontWeight = "600";
          name.style.width = "100%";
          name.style.textAlign = "center";
          name.style.whiteSpace = "nowrap";
          name.style.overflow = "hidden";
          name.style.textOverflow = "ellipsis";

          const rar = document.createElement("div");
          rar.textContent = item?.rarityName || "";
          rar.style.color = item?.rarityColor || "#a78bfa";
          rar.style.fontSize = "11px";
          rar.style.marginTop = "4px";

          const price = document.createElement("div");
          price.textContent = `$ ${Number(item?.price || 0).toFixed(2)}`;
          price.style.color = "#22c55e";
          price.style.fontWeight = "700";
          price.style.marginTop = "6px";

          card.appendChild(top);
          card.appendChild(imgBox);
          card.appendChild(name);
          card.appendChild(rar);
          card.appendChild(price);

          ref.appendChild(card);
        });

        // animasyonu uygula
        ref.style.transition = "none";
        ref.style.transform = "translateX(0px)";
        void ref.getBoundingClientRect();

        const tx = computeTargetTranslate(ref);
        ref.style.transition = `transform ${SPIN_MS / 1000}s cubic-bezier(0.17,0.67,0.12,0.99)`;
        ref.style.transform = `translateX(${tx}px)`;
      });

      // Hepsi bitince round’u tamamla
      const totalToWait = entries.length;
      let endedCount = 0;

      const onEndOne = () => {
        endedCount += 1;
        if (endedCount >= totalToWait) {
          setSpinning(false);

          // toplamları ve kazanılanları yaz
          const t = { ...(totals || {}) };
          const w = { ...(wonItems || {}) };
          rolled.forEach(({ player, winner }) => {
            const val = Number(winner?.price || winner?.value || 0);
            t[player] = Number(((t[player] || 0) + val).toFixed(2));
            w[player] = [...(w[player] || []), winner];
          });
          setTotals(t);
          setWonItems(w);

          // Sonraki round ya da bitiş
          setTimeout(() => {
            if (curr + 1 < rounds.length) setCurr((c) => c + 1);
            else setFinished(true);
          }, 500);
        }
      };

      // transitionend dinle
      entries.forEach((entry) => {
        const player = typeof entry === "string" ? entry : entry.player;
        const ref = spinnerRefs.current[player];
        if (!ref) return;
        const handler = () => {
          ref.removeEventListener("transitionend", handler);
          onEndOne();
        };
        ref.addEventListener("transitionend", handler);
      });
    });
  };

  // --- SENİN SORDUĞUN useEffect: curr değişince ilgili round’u oynat ---
  useEffect(() => {
    if (curr >= 0 && curr < rounds.length) {
      // DAHA ÖNCEKİ BUG: (rounds[curr].rolls || players) yerine
      // aşağıdaki playRound içinde "entries" fallback’i var.
      playRound(rounds[curr]);
    }
  }, [curr, rounds, players]);

  // ------------------------------------------------------------------
  // Render (senin verdiğin JSX aynen korundu)
  // ------------------------------------------------------------------
  if (!battle) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Yükleniyor…
      </div>
    );
  }

  const activeCase =
    curr >= 0 && curr < rounds.length ? rounds[curr].case : null;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Üst bilgi */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Savaş Oynatılıyor</h1>
            <p className="text-gray-400">
              Mod: <span className="text-white">{battle.mode}</span> — Oyuncular:{" "}
              <span className="text-white">{players.length}</span>
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

        {/* Case başlığı */}
        {activeCase ? (
          <Card className="mb-6 bg-[#1a1a2e] border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <img
                src={activeCase.image}
                alt=""
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div>
                <div className="text-gray-300 text-sm">Açılan kasa</div>
                <div className="text-xl font-bold text-white">
                  {activeCase.name}
                </div>
                <div className="text-green-400 font-semibold">
                  $ {Number(activeCase.price).toFixed(2)}
                </div>
              </div>
              <div className="ml-auto">
                <Badge className="bg-purple-600 text-white">
                  {curr + 1} / {rounds.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 bg-[#1a1a2e] border-purple-500/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-white font-semibold">Savaşı başlat</div>
              <Button
                onClick={startBattle}
                disabled={spinning}
                className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white"
              >
                Başlat
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Oyuncu şeritleri */}
        <div className="space-y-8">
          {players.map((p) => (
            <Card
              key={p}
              className="bg-[#16162e] border-purple-500/20 overflow-hidden"
            >
              <CardContent className="p-0">
                <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
                  <div className="text-white font-semibold">{p}</div>
                  <Badge className="bg-orange-500 text-white">
                    {spinning ? "Açılıyor…" : curr >= 0 ? `Round ${curr + 1}` : "Hazır"}
                  </Badge>
                </div>

                {/* Merkez çizgi + şerit konteyneri */}
                <div className="relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-yellow-500 z-10" />
                  <div
                    ref={(el) => {
                      spinnerRefs.current[p] = el;
                    }}
                    className="flex gap-3 py-6 px-2 will-change-transform"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bitti ekranı */}
        {finished && (
          <Card className="mt-8 bg-[#1a1a2e] border-green-500/30">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-white mb-2">
                Savaş bitti 🎉
              </div>
              <div className="text-gray-300 mb-4">
                Kazanan:{" "}
                <span className="text-green-400 font-semibold">
                  {battle.winner}
                </span>
              </div>
              <div className="text-gray-400 text-sm mb-4">Toplamlar:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {totals &&
                  Object.entries(totals).map(([k, v]) => (
                    <div
                      key={k}
                      className="p-3 rounded bg-white/5 flex items-center justify-between"
                    >
                      <div className="text-white">{k}</div>
                      <div className="text-green-400 font-bold">
                        $ {Number(v).toFixed(2)}
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    setCurr(-1);
                    setFinished(false);
                    setRounds([]);
                    fetchBattle();
                  }}
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
