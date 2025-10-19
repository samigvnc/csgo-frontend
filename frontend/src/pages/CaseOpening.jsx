/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cases, getUser, updateUser } from '../mockData';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { ArrowLeft } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

// Animasyon süresi (sn)
const SPIN_MS = 5000;
// Şeride koyacağımız kart adedi
const STRIP_LEN = 120;
// Merkeze getireceğimiz index
const WIN_INDEX = 90;

export default function CaseOpening() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonItem, setWonItem] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [spinItems, setSpinItems] = useState([]);

  const spinnerRef = useRef(null);

  useEffect(() => {
    const found = cases.find(c => c.id === Number(id));
    if (!found) { navigate('/cases'); return; }
    setCaseData(found);
  }, [id, navigate]);

  // Sunucuda bakiye değiştir
  const changeBalanceOnServer = async (email, delta) => {
    const res = await fetch(`${API}/public/balance/add?email=${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: Number(delta) }),
    });
    if (!res.ok) throw new Error((await res.text()) || 'Bakiye güncellenemedi');
    window.dispatchEvent(new Event('balance-changed'));
  };

  // Rarite ağırlıklı seçim
  const pickWeighted = () => {
    const r = Math.random() * 100;
    let pool = [];
    if (r < 0.5) pool = caseData.contents.filter(i => i.rarity === 'knife');
    else if (r < 2) pool = caseData.contents.filter(i => i.rarity === 'covert');
    else if (r < 7) pool = caseData.contents.filter(i => i.rarity === 'classified');
    else if (r < 20) pool = caseData.contents.filter(i => i.rarity === 'restricted');
    else if (r < 50) pool = caseData.contents.filter(i => i.rarity === 'milspec');
    else pool = caseData.contents.filter(i => i.rarity === 'consumer' || i.rarity === 'industrial');
    if (!pool.length) pool = caseData.contents;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // Şerit üret ve WIN_INDEX'e kazananı yerleştir
  const makeStripWithWinner = () => {
    const arr = Array.from({ length: STRIP_LEN }, () => pickWeighted());
    const winner = pickWeighted();
    arr[WIN_INDEX] = winner; // görünürde kazanan
    return { arr, winner };
  };

  // Mevcut DOM'a göre WIN_INDEX kartını tam merkeze getirecek translateX'i hesapla
  const computeTargetTranslate = () => {
    const el = spinnerRef.current;
    if (!el || el.children.length < 2) return 0;
    const a = el.children[0].getBoundingClientRect();
    const b = el.children[1].getBoundingClientRect();

    const centerA = a.left + a.width / 2;
    const centerB = b.left + b.width / 2;
    const step = centerB - centerA; // kart merkezleri arası mesafe (gap dahil)

    const targetCenter = centerA + step * WIN_INDEX; // WIN_INDEX kartının şu anki merkez X'i
    const mid = window.innerWidth / 2;
    const translate = -(targetCenter - mid); // bu kadar sola kaydırırsak merkezlenir
    return translate;
  };

  const handleOpenCase = async () => {
    if (!caseData) return;

    const user = getUser();
    if (!user) {
      toast({ title: 'Hata', description: 'Lütfen giriş yapın', variant: 'destructive' });
      return navigate('/auth');
    }
    if (user.balance < caseData.price) {
      return toast({ title: 'Yetersiz Bakiye', description: 'Coin yetersiz', variant: 'destructive' });
    }

    // 1) Bakiye düş (server)
    try {
      const email = localStorage.getItem('user_email') || user.email;
      await changeBalanceOnServer(email, -caseData.price);
    } catch (e) {
      return toast({ title: 'İşlem başarısız', description: e.message || 'Sunucu hatası', variant: 'destructive' });
    }

    // 2) Şeridi hazırla ve render et
    const { arr, winner } = makeStripWithWinner();
    setSpinItems(arr);
    setIsSpinning(true);

    // 3) Render’dan sonra ölç – tam hedef kadar kaydır
    requestAnimationFrame(() => {
      const el = spinnerRef.current;
      if (!el) return;

      // Başlangıç (reset)
      el.style.transition = 'none';
      el.style.transform = 'translateX(0px)';
      void el.getBoundingClientRect(); // reflow

      const targetTranslate = computeTargetTranslate(); // px olarak kesin değer
      el.style.transition = `transform ${SPIN_MS / 1000}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
      el.style.transform = `translateX(${targetTranslate}px)`;

      const onEnd = () => {
        el.removeEventListener('transitionend', onEnd);
        setWonItem(winner);       // görünürdeki tam o kart zaten
        setIsSpinning(false);
        setShowResult(true);

        // local mock kullanıcıyı güncelle
        const updatedInventory = [...user.inventory, winner];
        const updatedStats = {
          ...user.stats,
          casesOpened: user.stats.casesOpened + 1,
          totalSpent: user.stats.totalSpent + caseData.price,
          totalWon: user.stats.totalWon + winner.price,
        };
        updateUser({
          balance: user.balance - caseData.price,
          inventory: updatedInventory,
          stats: updatedStats,
          xp: user.xp + 10,
        });
      };

      el.addEventListener('transitionend', onEnd);
    });
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setWonItem(null);
    setSpinItems([]);
    const el = spinnerRef.current;
    if (el) { el.style.transition = 'none'; el.style.transform = 'translateX(0)'; }
  };

  if (!caseData) return null;

  return (
    <div className="min-h-screen py-8">
      {/* Back */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <Button onClick={() => navigate('/cases')} variant="ghost" className="hover:bg-purple-500/20 text-white">
          <ArrowLeft className="mr-2" size={18} /> Geri
        </Button>
      </div>

      {/* Üst kısım */}
      <div className="max-w-5xl mx-auto px-4 mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{caseData.name}</h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            {caseData.isPremium && <Badge className="bg-yellow-500 text-black font-bold">PREMIUM</Badge>}
            {caseData.isNew && <Badge className="bg-orange-500 text-white">YENİ</Badge>}
          </div>
          <p className="text-gray-400 text-lg">{caseData.contents.length} ürün içeriyor</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
          <div className="w-full md:w-1/3">
            <img src={caseData.image} alt={caseData.name} className="w-full rounded-xl shadow-2xl shadow-purple-500/30" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-gray-400 mb-2">Fiyat</p>
              <p className="text-5xl font-bold text-green-500">$ {caseData.price}</p>
            </div>
            <Button
              onClick={handleOpenCase}
              disabled={isSpinning}
              className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white font-bold text-xl px-12 py-6 disabled:opacity-50"
            >
              {isSpinning ? 'Açılıyor...' : 'Kasayı Aç'}
            </Button>
          </div>
        </div>
      </div>

      {/* Spinner */}
      {spinItems.length > 0 && (
        <div className="mb-12 overflow-hidden relative">
          {/* Orta çizgi */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-yellow-500 z-10 shadow-lg shadow-yellow-500/50" />
          <div className="flex gap-4 py-8" ref={spinnerRef}>
            {spinItems.map((item, i) => (
              <div
                key={`${item?.name || 'i'}-${i}`}
                className="min-w-[160px] h-[240px] bg-[#1a1a2e] rounded-lg border-2 flex flex-col items-center justify-center p-4"
                style={{ borderColor: item.rarityColor }}
              >
                <div className="text-xs text-gray-400 mb-2 text-center truncate w-full">{item.weapon}</div>
                <div className="w-full h-24 mb-2 bg-black/30 rounded flex items-center justify-center">
                  <div className="text-4xl">🔫</div>
                </div>
                <div className="text-sm font-semibold text-white text-center truncate w-full">{item.skinName}</div>
                <div className="text-xs mt-1" style={{ color: item.rarityColor }}>{item.rarityName}</div>
                <div className="text-green-500 font-bold mt-2">${item.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* İçerik grid */}
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-white mb-6">Kasa İçeriği</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {caseData.contents.map((item, index) => (
            <Card key={`${item.name}-${index}`} className="bg-[#1a1a2e] border-2 hover:scale-105 transition-transform" style={{ borderColor: item.rarityColor + '40' }}>
              <CardContent className="p-4">
                <div className="text-xs text-gray-400 mb-2 text-center truncate">{item.weapon}</div>
                <div className="w-full h-20 mb-2 bg-black/30 rounded flex items-center justify-center">
                  <div className="text-3xl">🔫</div>
                </div>
                <div className="text-sm font-semibold text-white text-center truncate">{item.skinName}</div>
                <div className="text-xs text-center mt-1" style={{ color: item.rarityColor }}>{item.rarityName}</div>
                {item.statTrak && (
                  <Badge className="w-full mt-2 bg-orange-500 text-white text-xs justify-center">StatTrak™</Badge>
                )}
                <div className="text-green-500 font-bold text-center mt-2">${item.price.toFixed(2)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sonuç */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="bg-[#1a1a2e] border-2 max-w-md" style={{ borderColor: wonItem?.rarityColor }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-white">Tebrikler! 🎉</DialogTitle>
            <DialogDescription className="text-center text-gray-400">Kazandığınız öğe:</DialogDescription>
          </DialogHeader>
          {wonItem && (
            <div className="text-center py-6">
              <div className="w-full h-32 mb-4 bg-black/30 rounded-lg flex items-center justify-center">
                <div className="text-6xl">🔫</div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{wonItem.name}</h3>
              <Badge className="mb-4 text-white font-semibold" style={{ backgroundColor: wonItem.rarityColor }}>
                {wonItem.rarityName}
              </Badge>
              <div className="text-4xl font-bold text-green-500 mb-6">$ {wonItem.price.toFixed(2)}</div>
              <div className="flex gap-3">
                <Button onClick={handleCloseResult} className="flex-1 bg-purple-600 hover:bg-purple-700">Tekrar Aç</Button>
                <Button onClick={() => navigate('/inventory')} className="flex-1 bg-green-600 hover:bg-green-700">Envantere Git</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
