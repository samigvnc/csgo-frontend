import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { navigationItems, gameModes, getUser } from '../mockData';
import { 
  Coins, 
  User, 
  LogOut, 
  Gift,
  Package,
  Trophy,
  Zap,
  Swords,
  FileText,
  Gift as GiftIcon,
  TrendingUp,
  Gamepad2,
  Shield,
  Wrench,
  Menu,
  X
} from 'lucide-react';
import { toast } from '../hooks/use-toast';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const iconMap = {
  'package': Package,
  'trophy': Trophy,
  'zap': Zap,
  'sword': Swords,
  'file-text': FileText,
  'gift': GiftIcon,
  'trending-up': TrendingUp,
  'gamepad-2': Gamepad2,
  'shield': Shield,
  'wrench': Wrench
};

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- DB'den bakiye ---
  const [balance, setBalance] = useState(null);
  const [balLoading, setBalLoading] = useState(true);

  const formatMoney = (v) =>
    typeof v === 'number'
      ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—';

  const fetchBalance = async () => {
    const email = localStorage.getItem('user_email');
    if (!email) {
      setBalance(null);
      setBalLoading(false);
      return;
    }
    try {
      setBalLoading(true);
      const res = await fetch(`${API}/public/user-by-email?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json(); // { id, email, balance }
      setBalance(Number(data.balance ?? 0));
    } catch (e) {
      console.error('balance fetch error:', e);
      setBalance(null);
    } finally {
      setBalLoading(false);
    }
  };

  useEffect(() => {
    const userData = getUser();
    setUser(userData);
  }, [location]);

  useEffect(() => {
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // sayfa değiştikçe tazele

  const handleLogout = () => {
    localStorage.removeItem('hellcase_token');
    localStorage.removeItem('hellcase_user');
    toast({
      title: 'Çıkış yapıldı',
      description: 'Başarıyla çıkış yaptınız'
    });
    navigate('/auth');
  };

  // Günlük bonusu server üzerinden ekle ve bakiyeyi yenile
  const handleDailyBonus = async () => {
    const email = localStorage.getItem('user_email');
    if (!email) {
      toast({ title: 'Giriş gerekli', description: 'Önce giriş yapın', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(`${API}/public/balance/add?email=${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: 100 })
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchBalance();
      toast({
        title: '🎁 Günlük Bonus',
        description: 'Hesabınıza +100 eklendi!'
      });
    } catch (e) {
      toast({
        title: 'Bonus alınamadı',
        description: e.message || 'Bir sorun oluştu',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="bg-[#1a1a2e]/80 backdrop-blur-sm border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img 
                src="https://avatars.githubusercontent.com/in/1201222?s=120&u=2686cf91179bbafbc7a71bfbc43004cf9ae1acea&v=4" 
                alt="Hellcase" 
                className="h-10 w-10"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                Hellcase
              </span>
              <span className="text-green-500 text-sm font-semibold px-2 py-1 bg-green-500/10 rounded">
                7,885
              </span>
            </Link>

            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Right Section - Desktop */}
            <div className="hidden lg:flex items-center gap-4">
              {/* DB'den Bakiye */}
              <div className="flex items-center gap-2 bg-[#0a0a0f] px-4 py-2 rounded-lg border border-green-500/30">
                <Coins className="text-green-500" size={20} />
                <span className="text-white font-semibold">
                  {balLoading ? 'Yükleniyor…' : formatMoney(balance)}
                </span>
              </div>

              {/* Günlük Bonus */}
              <Button 
                onClick={handleDailyBonus}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold"
              >
                <Gift className="mr-2" size={18} />
                Günlük Bonus
              </Button>

              {/* Profil */}
              {user && (
                <>
                  <Link to="/profile">
                    <Button variant="ghost" className="flex items-center gap-2 hover:bg-purple-500/20">
                      <Avatar className="h-8 w-8 border-2 border-purple-500">
                        <AvatarFallback className="bg-purple-600 text-white">
                          {user.username?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <div className="text-sm font-medium">{user.username}</div>
                        <div className="text-xs text-gray-400">Level {user.level}</div>
                      </div>
                    </Button>
                  </Link>

                  <Button 
                    onClick={handleLogout}
                    variant="ghost" 
                    className="hover:bg-red-500/20 hover:text-red-400"
                  >
                    <LogOut size={20} />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[#1a1a2e] pt-16">
          <div className="p-4 space-y-4">
            {/* DB'den Bakiye (mobil) */}
            <div className="flex items-center gap-2 bg-[#0a0a0f] px-4 py-2 rounded-lg border border-green-500/30">
              <Coins className="text-green-500" size={20} />
              <span className="text-white font-semibold">
                {balLoading ? 'Yükleniyor…' : formatMoney(balance)}
              </span>
            </div>

            <Button 
              onClick={handleDailyBonus}
              className="w-full bg-gradient-to-r from-green-600 to-green-500"
            >
              <Gift className="mr-2" size={18} />
              Günlük Bonus
            </Button>

            {navigationItems.map(item => {
              const Icon = iconMap[item.icon];
              return (
                <Link 
                  key={item.id} 
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-purple-500/20 rounded-lg transition-colors"
                >
                  {Icon && <Icon size={20} />}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-orange-500 text-xs px-2 py-1 rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-[#16162e] border-b border-purple-500/20">
        <div className="max-w-[1920px] mx-auto px-4">
          <div className="hidden lg:flex items-center gap-2 overflow-x-auto">
            {navigationItems.map(item => {
              const Icon = iconMap[item.icon];
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all hover:bg-purple-500/10 whitespace-nowrap relative ${
                    isActive 
                      ? 'border-purple-500 text-white' 
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {Icon && <Icon size={18} />}
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-xs px-2 py-0.5 rounded text-white font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#16162e] border-t border-purple-500/20 mt-20">
        <div className="max-w-[1920px] mx-auto px-4 py-8">
          <div className="text-center text-gray-400 text-sm">
            <p>© 2025 Hellcase Clone - Sadece Eğlence Amaçlıdır</p>
            <p className="mt-2">Bu bir demo uygulamadır. Gerçek para veya CS:GO skinleri içermez.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
