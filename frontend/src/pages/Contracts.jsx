import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, updateUser } from '../mockData';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { ArrowRight, Info, CheckCircle } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const Contracts = () => {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState([]);
  const [targetRarity, setTargetRarity] = useState('milspec');
  const user = getUser();

  if (!user) {
    navigate('/auth');
    return null;
  }

  // Contract rules
  const contractRules = {
    consumer: { required: 10, target: 'industrial', successRate: 100, cost: 0 },
    industrial: { required: 10, target: 'milspec', successRate: 100, cost: 0 },
    milspec: { required: 10, target: 'restricted', successRate: 80, cost: 5 },
    restricted: { required: 10, target: 'classified', successRate: 60, cost: 10 },
    classified: { required: 10, target: 'covert', successRate: 40, cost: 20 },
    covert: { required: 10, target: 'knife', successRate: 20, cost: 50 }
  };

  const currentRule = contractRules[targetRarity];
  const eligibleItems = user.inventory.filter(item => item.rarity === targetRarity);
  const canComplete = selectedItems.length === currentRule.required && user.balance >= currentRule.cost;

  const handleSelectItem = (item, index) => {
    if (selectedItems.find(si => si.index === index)) {
      setSelectedItems(selectedItems.filter(si => si.index !== index));
    } else if (selectedItems.length < currentRule.required) {
      setSelectedItems([...selectedItems, { ...item, index }]);
    }
  };

  const handleCompleteContract = () => {
    if (!canComplete) return;

    // Determine if contract succeeds
    const success = Math.random() * 100 < currentRule.successRate;

    // Remove selected items from inventory
    const newInventory = user.inventory.filter((_, index) => 
      !selectedItems.find(si => si.index === index)
    );

    if (success) {
      // Generate upgraded item
      const baseItem = selectedItems[0];
      const upgradedItem = {
        ...baseItem,
        id: Date.now(),
        rarity: currentRule.target,
        rarityName: currentRule.target.charAt(0).toUpperCase() + currentRule.target.slice(1),
        price: baseItem.price * 3,
      };

      newInventory.push(upgradedItem);

      updateUser({
        inventory: newInventory,
        balance: user.balance - currentRule.cost,
        stats: {
          ...user.stats,
          contractsCompleted: user.stats.contractsCompleted + 1
        },
        xp: user.xp + 20
      });

      toast({
        title: '✨ Kontrat Başarılı!',
        description: `${upgradedItem.name} kazandınız!`,
      });
    } else {
      updateUser({
        inventory: newInventory,
        balance: user.balance - currentRule.cost,
      });

      toast({
        title: '❌ Kontrat Başarısız',
        description: 'Maalesef bu sefer şansınız yaver gitmedi',
        variant: 'destructive'
      });
    }

    setSelectedItems([]);
    setTimeout(() => window.location.reload(), 2000);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Kontrat Sistemi</h1>
          <p className="text-gray-400 text-lg">
            10 aynı seviye item ile daha yüksek seviye item kazanma şansı!
          </p>
        </div>

        {/* Contract Process */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Input Items */}
          <Card className="bg-[#1a1a2e] border-purple-500/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 text-center">
                Giriş İtemleri
              </h3>
              <div className="text-center mb-4">
                <p className="text-gray-400 text-sm mb-2">
                  {selectedItems.length} / {currentRule.required} seçildi
                </p>
                <Progress 
                  value={(selectedItems.length / currentRule.required) * 100} 
                  className="h-3"
                />
              </div>
              <div className="grid grid-cols-5 gap-2 min-h-[100px]">
                {Array.from({ length: currentRule.required }).map((_, index) => (
                  <div 
                    key={index}
                    className="aspect-square bg-black/30 rounded border-2 border-dashed border-purple-500/30 flex items-center justify-center"
                  >
                    {selectedItems[index] ? (
                      <CheckCircle className="text-green-500" size={20} />
                    ) : (
                      <span className="text-gray-600 text-xs">{index + 1}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Arrow & Info */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-orange-900/50 border-purple-500/30">
            <CardContent className="p-6 flex flex-col items-center justify-center h-full">
              <ArrowRight className="text-yellow-500 mb-4" size={48} />
              <div className="text-center">
                <p className="text-white font-bold text-lg mb-2">
                  Başarı Şansı
                </p>
                <p className="text-4xl font-bold text-green-500 mb-4">
                  {currentRule.successRate}%
                </p>
                <p className="text-gray-300 text-sm mb-2">
                  Maliyet: $ {currentRule.cost}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Output Item */}
          <Card className="bg-[#1a1a2e] border-green-500/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 text-center">
                Çıkış İtemi
              </h3>
              <div className="flex items-center justify-center min-h-[150px]">
                <div className="text-center">
                  <div className="text-5xl mb-4">🎁</div>
                  <Badge className="bg-green-500 text-white font-bold">
                    {currentRule.target.toUpperCase()}
                  </Badge>
                  <p className="text-gray-400 text-sm mt-2">
                    {selectedItems.length > 0 && (
                      <>~${(selectedItems[0].price * 3).toFixed(2)}</>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rarity Selector */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Seviye Seçin</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.keys(contractRules).map(rarity => (
              <Button
                key={rarity}
                onClick={() => {
                  setTargetRarity(rarity);
                  setSelectedItems([]);
                }}
                className={`${
                  targetRarity === rarity
                    ? 'bg-purple-600 hover:bg-purple-700 border-2 border-purple-400'
                    : 'bg-[#1a1a2e] hover:bg-[#252540]'
                }`}
              >
                {rarity.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Available Items */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4">
            Mevcut İtemler ({eligibleItems.length})
          </h3>
          
          {eligibleItems.length === 0 ? (
            <Card className="bg-[#1a1a2e] border-purple-500/20">
              <CardContent className="p-12 text-center">
                <p className="text-gray-400 text-lg mb-4">
                  Bu seviyede item bulunamadı
                </p>
                <Button
                  onClick={() => navigate('/cases')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Kasa Aç
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {eligibleItems.map((item, index) => {
                const isSelected = selectedItems.find(si => si.index === index);
                return (
                  <Card
                    key={index}
                    onClick={() => handleSelectItem(item, index)}
                    className={`bg-[#1a1a2e] border-2 cursor-pointer transition-all hover:scale-105 ${
                      isSelected 
                        ? 'border-green-500 shadow-lg shadow-green-500/50' 
                        : 'border-purple-500/20 hover:border-purple-500/60'
                    }`}
                  >
                    <CardContent className="p-3">
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="text-green-500" size={20} />
                        </div>
                      )}
                      <div className="w-full h-16 mb-2 bg-black/30 rounded flex items-center justify-center">
                        <div className="text-2xl">🔫</div>
                      </div>
                      <div className="text-xs text-white text-center truncate">
                        {item.skinName}
                      </div>
                      <div className="text-green-500 font-bold text-center text-sm">
                        ${item.price.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Complete Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleCompleteContract}
            disabled={!canComplete}
            className="bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700 text-white font-bold text-xl px-12 py-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kontratı Tamamla
          </Button>
        </div>

        {/* Info */}
        <Card className="bg-[#1a1a2e] border-blue-500/20 mt-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="text-blue-500 mt-1" size={24} />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Kontrat Kuralları</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li>• 10 aynı seviyedeki itemi kontrata koyabilirsiniz</li>
                  <li>• Başarı şansı seviyeye göre değişir</li>
                  <li>• Başarılı olursanız bir üst seviye item kazanırsınız</li>
                  <li>• Başarısız olursanız tüm itemleri kaybedersiniz</li>
                  <li>• Yüksek seviye kontratlar ekstra coin maliyeti gerektirir</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Contracts;