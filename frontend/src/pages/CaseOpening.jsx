import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cases, getUser, updateUser } from '../mockData';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { ArrowLeft, Info } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const CaseOpening = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonItem, setWonItem] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [spinItems, setSpinItems] = useState([]);
  const spinnerRef = useRef(null);

  useEffect(() => {
    const foundCase = cases.find(c => c.id === parseInt(id));
    if (foundCase) {
      setCaseData(foundCase);
    } else {
      navigate('/cases');
    }
  }, [id, navigate]);

  const generateSpinItems = (winningItem) => {
    // Create a list of 100 items with the winning item somewhere in the middle-right
    const items = [];
    const winPosition = 85; // Item will land here
    
    for (let i = 0; i < 100; i++) {
      if (i === winPosition) {
        items.push(winningItem);
      } else {
        // Random item from case contents
        const randomItem = caseData.contents[Math.floor(Math.random() * caseData.contents.length)];
        items.push(randomItem);
      }
    }
    
    return items;
  };

  const handleOpenCase = () => {
    const user = getUser();
    if (!user) {
      toast({
        title: 'Hata',
        description: 'Lütfen giriş yapın',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }

    if (user.balance < caseData.price) {
      toast({
        title: 'Yetersiz Bakiye',
        description: 'Bu kasayı açmak için yeterli coin yok',
        variant: 'destructive'
      });
      return;
    }

    // Deduct balance
    const newBalance = user.balance - caseData.price;
    
    // Determine winning item based on rarity odds
    const random = Math.random() * 100;
    let selectedItem;
    
    if (random < 0.5) { // 0.5% for knife
      selectedItem = caseData.contents.find(item => item.rarity === 'knife') || caseData.contents[0];
    } else if (random < 2) { // 1.5% for covert
      selectedItem = caseData.contents.find(item => item.rarity === 'covert') || caseData.contents[0];
    } else if (random < 7) { // 5% for classified
      selectedItem = caseData.contents.find(item => item.rarity === 'classified') || caseData.contents[0];
    } else if (random < 20) { // 13% for restricted
      selectedItem = caseData.contents.find(item => item.rarity === 'restricted') || caseData.contents[0];
    } else if (random < 50) { // 30% for mil-spec
      selectedItem = caseData.contents.find(item => item.rarity === 'milspec') || caseData.contents[0];
    } else { // 50% for consumer/industrial
      const commonItems = caseData.contents.filter(item => ['consumer', 'industrial'].includes(item.rarity));
      selectedItem = commonItems[Math.floor(Math.random() * commonItems.length)] || caseData.contents[0];
    }

    setWonItem(selectedItem);
    const items = generateSpinItems(selectedItem);
    setSpinItems(items);
    setIsSpinning(true);

    // Animate the spin
    setTimeout(() => {
      if (spinnerRef.current) {
        // Calculate position to land on winning item
        const itemWidth = 180; // width + gap
        const winPosition = 85;
        const offset = -(winPosition * itemWidth - window.innerWidth / 2 + itemWidth / 2);
        
        spinnerRef.current.style.transition = 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        spinnerRef.current.style.transform = `translateX(${offset}px)`;
      }

      // Show result after animation
      setTimeout(() => {
        setIsSpinning(false);
        setShowResult(true);
        
        // Update user inventory and stats
        const updatedInventory = [...user.inventory, selectedItem];
        const updatedStats = {
          ...user.stats,
          casesOpened: user.stats.casesOpened + 1,
          totalSpent: user.stats.totalSpent + caseData.price,
          totalWon: user.stats.totalWon + selectedItem.price
        };
        
        updateUser({
          balance: newBalance,
          inventory: updatedInventory,
          stats: updatedStats,
          xp: user.xp + 10
        });
      }, 5000);
    }, 100);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setWonItem(null);
    setSpinItems([]);
    if (spinnerRef.current) {
      spinnerRef.current.style.transition = 'none';
      spinnerRef.current.style.transform = 'translateX(0)';
    }
  };

  if (!caseData) return null;

  return (
    <div className="min-h-screen py-8">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <Button
          onClick={() => navigate('/cases')}
          variant="ghost"
          className="hover:bg-purple-500/20 text-white"
        >
          <ArrowLeft className="mr-2" size={18} />
          Geri
        </Button>
      </div>

      {/* Case Display */}
      <div className="max-w-5xl mx-auto px-4 mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{caseData.name}</h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            {caseData.isPremium && (
              <Badge className="bg-yellow-500 text-black font-bold">PREMIUM</Badge>
            )}
            {caseData.isNew && (
              <Badge className="bg-orange-500 text-white">YENİ</Badge>
            )}
          </div>
          <p className="text-gray-400 text-lg">{caseData.contents.length} ürün içeriyor</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
          <div className="w-full md:w-1/3">
            <img 
              src={caseData.image} 
              alt={caseData.name}
              className="w-full rounded-xl shadow-2xl shadow-purple-500/30"
            />
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

      {/* Spinning Animation */}
      {isSpinning && spinItems.length > 0 && (
        <div className="mb-12 overflow-hidden relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-yellow-500 z-10 shadow-lg shadow-yellow-500/50"></div>
          
          <div className="flex gap-4 py-8" ref={spinnerRef}>
            {spinItems.map((item, index) => (
              <div 
                key={index}
                className="min-w-[160px] h-[240px] bg-[#1a1a2e] rounded-lg border-2 flex flex-col items-center justify-center p-4"
                style={{ borderColor: item.rarityColor }}
              >
                <div className="text-xs text-gray-400 mb-2 text-center truncate w-full">
                  {item.weapon}
                </div>
                <div className="w-full h-24 mb-2 bg-black/30 rounded flex items-center justify-center">
                  <div className="text-4xl">🔫</div>
                </div>
                <div className="text-sm font-semibold text-white text-center truncate w-full">
                  {item.skinName}
                </div>
                <div className="text-xs mt-1" style={{ color: item.rarityColor }}>
                  {item.rarityName}
                </div>
                <div className="text-green-500 font-bold mt-2">
                  ${item.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Case Contents */}
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-white mb-6">Kasa İçeriği</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {caseData.contents.map((item, index) => (
            <Card 
              key={index}
              className="bg-[#1a1a2e] border-2 hover:scale-105 transition-transform"
              style={{ borderColor: item.rarityColor + '40' }}
            >
              <CardContent className="p-4">
                <div className="text-xs text-gray-400 mb-2 text-center truncate">
                  {item.weapon}
                </div>
                <div className="w-full h-20 mb-2 bg-black/30 rounded flex items-center justify-center">
                  <div className="text-3xl">🔫</div>
                </div>
                <div className="text-sm font-semibold text-white text-center truncate">
                  {item.skinName}
                </div>
                <div className="text-xs text-center mt-1" style={{ color: item.rarityColor }}>
                  {item.rarityName}
                </div>
                {item.statTrak && (
                  <Badge className="w-full mt-2 bg-orange-500 text-white text-xs justify-center">
                    StatTrak™
                  </Badge>
                )}
                <div className="text-green-500 font-bold text-center mt-2">
                  ${item.price.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="bg-[#1a1a2e] border-2 max-w-md" style={{ borderColor: wonItem?.rarityColor }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-white">
              Tebrikler! 🎉
            </DialogTitle>
            <DialogDescription className="text-center text-gray-400">
              Kazandığınız öğe:
            </DialogDescription>
          </DialogHeader>
          
          {wonItem && (
            <div className="text-center py-6">
              <div className="w-full h-32 mb-4 bg-black/30 rounded-lg flex items-center justify-center">
                <div className="text-6xl">🔫</div>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">
                {wonItem.name}
              </h3>
              
              <Badge 
                className="mb-4 text-white font-semibold"
                style={{ backgroundColor: wonItem.rarityColor }}
              >
                {wonItem.rarityName}
              </Badge>
              
              <div className="text-4xl font-bold text-green-500 mb-6">
                $ {wonItem.price.toFixed(2)}
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleCloseResult}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Tekrar Aç
                </Button>
                <Button
                  onClick={() => navigate('/inventory')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Envantere Git
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseOpening;