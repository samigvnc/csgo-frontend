import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, claimDailyBonus } from '../mockData';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { 
  User, 
  Coins, 
  Package, 
  Trophy, 
  TrendingUp, 
  Gift,
  Calendar
} from 'lucide-react';
import { toast } from '../hooks/use-toast';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      navigate('/auth');
      return;
    }
    setUser(userData);
  }, [navigate]);

  const handleDailyBonus = () => {
    const updatedUser = claimDailyBonus();
    if (updatedUser) {
      setUser(updatedUser);
      toast({
        title: '🎁 Günlük Bonus Alındı!',
        description: '100 coin kazandınız!',
      });
    } else {
      toast({
        title: 'Zaten Alındı',
        description: '24 saat sonra tekrar gelin',
        variant: 'destructive'
      });
    }
  };

  if (!user) return null;

  const xpPercentage = (user.xp / user.xpToNextLevel) * 100;
  const canClaimBonus = !user.lastDailyBonus || 
    (new Date() - new Date(user.lastDailyBonus)) > 24 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <Card className="bg-gradient-to-br from-purple-900/50 to-[#1a1a2e] border-purple-500/20 mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="h-32 w-32 border-4 border-purple-500">
                <AvatarFallback className="bg-purple-600 text-white text-4xl">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold text-white mb-2">{user.username}</h1>
                <p className="text-gray-400 mb-4">{user.email}</p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 bg-[#0a0a0f] px-4 py-2 rounded-lg">
                    <TrendingUp className="text-purple-500" size={20} />
                    <span className="text-white font-semibold">Level {user.level}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-[#0a0a0f] px-4 py-2 rounded-lg">
                    <Coins className="text-green-500" size={20} />
                    <span className="text-white font-semibold">{user.balance.toFixed(2)} Coin</span>
                  </div>
                </div>
                
                <div className="max-w-md">
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                    <span>XP: {user.xp} / {user.xpToNextLevel}</span>
                    <span>{xpPercentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={xpPercentage} className="h-3" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Bonus */}
        <Card className="bg-[#1a1a2e] border-green-500/20 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-green-500/20 p-4 rounded-full">
                  <Gift className="text-green-500" size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Günlük Bonus</h3>
                  <p className="text-gray-400">
                    {canClaimBonus 
                      ? 'Her gün 100 ücretsiz coin kazan!' 
                      : '24 saat sonra tekrar gelin'
                    }
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleDailyBonus}
                disabled={!canClaimBonus}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-8 py-6 text-lg"
              >
                <Calendar className="mr-2" size={20} />
                {canClaimBonus ? 'Bonus Al' : 'Alındı'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-[#1a1a2e] border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">İstatistikler</h3>
                <Trophy className="text-purple-500" size={24} />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Açılan Kasa</span>
                  <span className="text-white font-semibold">{user.stats.casesOpened}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Toplam Harcama</span>
                  <span className="text-red-400 font-semibold">$ {user.stats.totalSpent.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Toplam Kazanç</span>
                  <span className="text-green-400 font-semibold">$ {user.stats.totalWon.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Net</span>
                  <span className={`font-semibold ${
                    user.stats.totalWon - user.stats.totalSpent >= 0 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    $ {(user.stats.totalWon - user.stats.totalSpent).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a2e] border-orange-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Oyun İstatistikleri</h3>
                <Package className="text-orange-500" size={24} />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Kazanılan Savaş</span>
                  <span className="text-white font-semibold">{user.stats.battlesWon}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Tamamlanan Kontrat</span>
                  <span className="text-white font-semibold">{user.stats.contractsCompleted}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Envanter Değeri</span>
                  <span className="text-green-400 font-semibold">
                    $ {user.inventory.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Toplam Item</span>
                  <span className="text-white font-semibold">{user.inventory.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => navigate('/cases')}
            className="bg-purple-600 hover:bg-purple-700 h-20 text-lg"
          >
            <Package className="mr-2" size={24} />
            Kasa Aç
          </Button>
          
          <Button
            onClick={() => navigate('/inventory')}
            className="bg-orange-600 hover:bg-orange-700 h-20 text-lg"
          >
            <Package className="mr-2" size={24} />
            Envanter
          </Button>
          
          <Button
            onClick={() => navigate('/battles')}
            className="bg-red-600 hover:bg-red-700 h-20 text-lg"
          >
            <Trophy className="mr-2" size={24} />
            Savaşlar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;