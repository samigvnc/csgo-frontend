import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../mockData';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Package, DollarSign } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const Inventory = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sellingIdx, setSellingIdx] = useState(null);

  // --- DB'den bakiye göstermek için ---
  const [dbBalance, setDbBalance] = useState(null);
  const [balLoading, setBalLoading] = useState(true);

  const fetchDbBalance = async () => {
  const email = localStorage.getItem('user_email') || user?.email;
  if (!email) {
    setDbBalance(null);
    setBalLoading(false);
    return;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000); // 5 sn timeout

  try {
    setBalLoading(true);
    const url = `${API}/public/user-by-email?email=${encodeURIComponent(email)}`;
    console.log('[Inventory] fetchDbBalance ->', url);

    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText || 'HTTP error');
    }

    const data = await res.json(); // { id, email, balance }
    console.log('[Inventory] balance data ->', data);
    setDbBalance(Number(data.balance ?? 0));
  } catch (e) {
    console.error('[Inventory] balance fetch error:', e);
    setDbBalance(null); // ekranda “—” görünsün
  } finally {
    clearTimeout(timer);
    setBalLoading(false);
  }
};


  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      navigate('/auth');
      return;
    }
    setUser(userData);
  }, [navigate]);



  if (!user) return null;

  const totalValue = user.inventory.reduce((sum, item) => sum + item.price, 0);

  // DB üzerinde bakiyeyi güncelle
  const changeBalanceOnServer = async (email, delta) => {
    const res = await fetch(`${API}/public/balance/add?email=${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: Number(delta) }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Bakiye güncellenemedi');
    }
    // global yenile sinyali
    window.dispatchEvent(new Event('balance-changed'));
  };

  const handleSellItem = async (item, index) => {
    const email = localStorage.getItem('user_email') || user.email;
    if (!email) {
      toast({ title: 'Giriş gerekli', description: 'Önce giriş yapın', variant: 'destructive' });
      return;
    }

    try {
      setSellingIdx(index);
      // 1) Sunucuda bakiyeyi artır
      await changeBalanceOnServer(email, item.price);

      // 2) Local UI: item’ı çıkar, local bakiye de artsın (mock kullanıcı için)
      const updatedInventory = user.inventory.filter((_, i) => i !== index);
      const updatedUser = {
        ...user,
        inventory: updatedInventory,
        balance: Number((user.balance + item.price).toFixed(2)),
      };
      localStorage.setItem('hellcase_user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // 3) DB’den anlık güncel bakiyeyi yeniden çek
      fetchDbBalance();

      toast({
        title: 'Satış Başarılı',
        description: `${item.name} - $${item.price.toFixed(2)} bakiyeye eklendi.`,
      });
    } catch (e) {
      toast({
        title: 'Satış başarısız',
        description: e.message || 'Sunucuya bağlanırken bir sorun oluştu',
        variant: 'destructive',
      });
    } finally {
      setSellingIdx(null);
    }
  };

  const formatMoney = (v) =>
    typeof v === 'number'
      ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Envanter</h1>
          <p className="text-gray-400">Kazandığınız tüm itemler burada</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#1a1a2e] border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Toplam İtem</p>
                  <p className="text-3xl font-bold text-white">{user.inventory.length}</p>
                </div>
                <Package className="text-purple-500" size={40} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a2e] border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Toplam Değer</p>
                  <p className="text-3xl font-bold text-green-500">$ {totalValue.toFixed(2)}</p>
                </div>
                <DollarSign className="text-green-500" size={40} />
              </div>
            </CardContent>
          </Card>

        </div>
        {/* Inventory Items */}
        {user.inventory.length === 0 ? (
          <div className="text-center py-20">
            <Package className="mx-auto mb-4 text-gray-600" size={80} />
            <h3 className="text-2xl font-bold text-gray-400 mb-2">Envanter Boş</h3>
            <p className="text-gray-500 mb-6">Henüz hiç kasa açmadınız</p>
            <Button
              onClick={() => navigate('/cases')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Kasa Açmaya Başla
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {user.inventory.map((item, index) => (
              <Card 
                key={`${item.name}-${index}`}
                className="bg-[#1a1a2e] border-2 hover:scale-105 transition-transform"
                style={{ borderColor: item.rarityColor + '40' }}
              >
                <CardContent className="p-4">
                  <div className="text-xs text-gray-400 mb-2 text-center truncate">
                    {item.weapon}
                  </div>
                  
                  <div className="w-full h-24 mb-2 bg-black/30 rounded flex items-center justify-center">
                    <div className="text-4xl">🔫</div>
                  </div>
                  
                  <div className="text-sm font-semibold text-white text-center truncate mb-1">
                    {item.skinName}
                  </div>
                  
                  <div className="text-xs text-center mb-2" style={{ color: item.rarityColor }}>
                    {item.rarityName}
                  </div>
                  
                  {item.statTrak && (
                    <Badge className="w-full mb-2 bg-orange-500 text-white text-xs justify-center">
                      StatTrak™
                    </Badge>
                  )}
                  
                  <div className="text-green-500 font-bold text-center text-xl mb-3">
                    $ {item.price.toFixed(2)}
                  </div>
                  
                  <Button
                    onClick={() => handleSellItem(item, index)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
                    size="sm"
                    disabled={sellingIdx === index}
                  >
                    <DollarSign size={16} className="mr-1" />
                    {sellingIdx === index ? 'Satılıyor...' : 'Sat'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
