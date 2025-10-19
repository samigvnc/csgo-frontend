import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Swords, Users, Plus, Lock } from 'lucide-react';

const Battles = () => {
  const [selectedMode, setSelectedMode] = useState('1v1');

  // Mock battle data
  const activeBattles = [
    {
      id: 1,
      mode: '1v1',
      creator: 'Player123',
      price: 50,
      players: 1,
      maxPlayers: 2,
      cases: ['Awakening', 'Dreams & Nightmares'],
      totalValue: 100,
      isPrivate: false
    },
    {
      id: 2,
      mode: '1v1v1',
      creator: 'ProGamer',
      price: 100,
      players: 2,
      maxPlayers: 3,
      cases: ['Revolution', 'Kilowatt', 'Gallery'],
      totalValue: 300,
      isPrivate: false
    },
    {
      id: 3,
      mode: '1v1v1v1',
      creator: 'CsGoKing',
      price: 25,
      players: 3,
      maxPlayers: 4,
      cases: ['Spooky', 'Awakening'],
      totalValue: 100,
      isPrivate: false
    },
  ];

  const myBattles = [];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Swords className="text-red-500" size={40} />
            <h1 className="text-4xl font-bold text-white">
              Kasa Savaşları
            </h1>
            <Badge className="bg-orange-500 text-white">NEW</Badge>
          </div>
          <p className="text-gray-400 text-lg">
            Diğer oyuncularla yarışın ve en değerli skinleri kazanın!
          </p>
        </div>

        {/* Create Battle Button */}
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
                    <p className="text-gray-300">
                      Kendi kurallarınızla bir savaş başlatın
                    </p>
                  </div>
                </div>
                <Button className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-6 text-lg">
                  Yeni Savaş
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="mb-8">
          <TabsList className="bg-[#1a1a2e] border border-purple-500/20">
            <TabsTrigger value="active" className="data-[state=active]:bg-purple-600">
              Aktif Savaşlar
            </TabsTrigger>
            <TabsTrigger value="my" className="data-[state=active]:bg-purple-600">
              Savaşlarım ({myBattles.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">
              Geçmiş
            </TabsTrigger>
          </TabsList>

          {/* Active Battles */}
          <TabsContent value="active" className="mt-6">
            {/* Mode Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <Button
                onClick={() => setSelectedMode('all')}
                className={`${
                  selectedMode === 'all'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-[#1a1a2e] hover:bg-[#252540]'
                }`}
              >
                Tümü
              </Button>
              <Button
                onClick={() => setSelectedMode('1v1')}
                className={`${
                  selectedMode === '1v1'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-[#1a1a2e] hover:bg-[#252540]'
                }`}
              >
                1v1
              </Button>
              <Button
                onClick={() => setSelectedMode('1v1v1')}
                className={`${
                  selectedMode === '1v1v1'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-[#1a1a2e] hover:bg-[#252540]'
                }`}
              >
                1v1v1
              </Button>
              <Button
                onClick={() => setSelectedMode('1v1v1v1')}
                className={`${
                  selectedMode === '1v1v1v1'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-[#1a1a2e] hover:bg-[#252540]'
                }`}
              >
                1v1v1v1
              </Button>
            </div>

            {/* Battles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBattles
                .filter(battle => selectedMode === 'all' || battle.mode === selectedMode)
                .map(battle => (
                  <Card 
                    key={battle.id}
                    className="bg-[#1a1a2e] border-red-500/20 hover:border-red-500/60 transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden group"
                  >
                    <CardContent className="p-0">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 p-4 border-b border-red-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-red-500 text-white font-bold">
                            {battle.mode}
                          </Badge>
                          {battle.isPrivate && (
                            <Lock className="text-yellow-500" size={16} />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="text-gray-400" size={16} />
                          <span className="text-white font-semibold">
                            {battle.creator}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="mb-4">
                          <p className="text-gray-400 text-sm mb-2">Kasalar:</p>
                          <div className="flex flex-wrap gap-1">
                            {battle.cases.map((caseName, index) => (
                              <Badge key={index} className="bg-purple-500/20 text-purple-300 text-xs">
                                {caseName}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-gray-400 text-xs">Giriş Ücreti</p>
                            <p className="text-green-500 font-bold text-lg">
                              $ {battle.price}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Toplam Değer</p>
                            <p className="text-white font-bold text-lg">
                              $ {battle.totalValue}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-400">Oyuncular</span>
                            <span className="text-white font-semibold">
                              {battle.players} / {battle.maxPlayers}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full transition-all"
                              style={{ width: `${(battle.players / battle.maxPlayers) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                          Katıl
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              }
            </div>

            {activeBattles.filter(battle => selectedMode === 'all' || battle.mode === selectedMode).length === 0 && (
              <div className="text-center py-20">
                <Swords className="mx-auto mb-4 text-gray-600" size={80} />
                <p className="text-gray-400 text-xl">Aktif savaş bulunamadı</p>
              </div>
            )}
          </TabsContent>

          {/* My Battles */}
          <TabsContent value="my" className="mt-6">
            <div className="text-center py-20">
              <Swords className="mx-auto mb-4 text-gray-600" size={80} />
              <h3 className="text-2xl font-bold text-gray-400 mb-2">Henüz Savaşınız Yok</h3>
              <p className="text-gray-500 mb-6">Bir savaş oluşturun veya mevcut birine katılın</p>
              <Button className="bg-red-600 hover:bg-red-700">
                Savaş Oluştur
              </Button>
            </div>
          </TabsContent>

          {/* History */}
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
              <p>• En yüksek toplam değere sahip oyuncu tüm skinleri kazanır</p>
              <p>• 1v1, 1v1v1 veya 1v1v1v1 modlarında oynayabilirsiniz</p>
              <p>• Özel savaşlar oluşturarak sadece arkadaşlarınızla oynayın</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Battles;