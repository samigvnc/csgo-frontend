import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from '../hooks/use-toast';
import { initializeUser, updateUser, syncUserBalanceFromServer } from '../mockData';

const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const Auth = () => {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({ username: '', password: '', email: '' });
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  // --------- LOGIN (mock) ----------
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!loginData.username || !loginData.password) {
      toast({
        title: 'Hata',
        description: 'Lütfen tüm alanları doldurun',
        variant: 'destructive'
      });
      return;
    }

    // Mock login - store auth token
    localStorage.setItem('hellcase_token', 'mock_jwt_token_' + Date.now());

    // Kullanıcı kaydı yoksa oluştur / varsa dokunmaz
    const user = initializeUser();
    // login formundan gelen username/email'i local'e yaz
    updateUser({
      username: loginData.username,
      email: loginData.email || user.email,
    });
    if (loginData.email) localStorage.setItem('user_email', loginData.email);

    // (Opsiyonel) Girişten sonra bakiyeyi DB'den senkronla
    if (loginData.email) {
      try { await syncUserBalanceFromServer(loginData.email); } catch {}
    }

    toast({
      title: 'Başarılı!',
      description: 'Giriş yapıldı. Hoş geldiniz!',
    });

    navigate('/');
  };

  // --------- REGISTER (DB'ye kaydet) ----------
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!registerData.username || !registerData.email || !registerData.password || !registerData.confirmPassword) {
      toast({
        title: 'Hata',
        description: 'Lütfen tüm alanları doldurun',
        variant: 'destructive'
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: 'Hata',
        description: 'Şifreler eşleşmiyor',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // 1) DB'ye kayıt (public register)
      const res = await fetch(`${API}/public/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerData.username,
          email: registerData.email,
          password: registerData.password,
          initial_balance: 1000.0, // ilk bakiye
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Kayıt başarısız');
      }

      // 2) Mock auth token (oyuncu akışı şimdilik mock)
      localStorage.setItem('hellcase_token', 'mock_jwt_token_' + Date.now());

      // 3) localStorage hellcase_user oluştur/güncelle
      const user = initializeUser();
      updateUser({
        username: registerData.username,
        email: registerData.email,
      });
      localStorage.setItem('user_email', registerData.email);

      // 4) DB’den bakiye senkron (hemen gerçek bakiyeyi çek)
      try { await syncUserBalanceFromServer(registerData.email); } catch {}

      toast({
        title: 'Başarılı!',
        description: 'Hesap oluşturuldu ve bakiyen yüklendi!',
      });

      navigate('/');
    } catch (err) {
      toast({
        title: 'Kayıt başarısız',
        description: err.message || 'Beklenmeyen bir hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-orange-900/20"></div>

      <Card className="w-full max-w-md relative z-10 bg-[#1a1a2e]/95 border-purple-500/20">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <img
              src="https://avatars.githubusercontent.com/in/1201222?s=120&u=2686cf91179bbafbc7a71bfbc43004cf9ae1acea&v=4"
              alt="Hellcase Logo"
              className="h-16 w-16"
            />
          </div>
          <CardTitle className="text-2xl text-center text-white">Hellcase</CardTitle>
          <CardDescription className="text-center text-gray-400">
            CS:GO Kasa Açma Platformu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#0a0a0f]">
              <TabsTrigger value="login" className="data-[state=active]:bg-purple-600">Giriş Yap</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-purple-600">Kayıt Ol</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-gray-300">E-posta (opsiyonel ama önerilir)</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="bg-[#0a0a0f] border-purple-500/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-username" className="text-gray-300">Kullanıcı Adı</Label>
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="Kullanıcı adınız"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    className="bg-[#0a0a0f] border-purple-500/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-gray-300">Şifre</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="bg-[#0a0a0f] border-purple-500/30 text-white"
                  />
                </div>
                <Button disabled={loading} type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </Button>
              </form>
            </TabsContent>

            {/* REGISTER */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username" className="text-gray-300">Kullanıcı Adı</Label>
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="Kullanıcı adınız"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    className="bg-[#0a0a0f] border-purple-500/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-gray-300">E-posta</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="bg-[#0a0a0f] border-purple-500/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-gray-300">Şifre</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="bg-[#0a0a0f] border-purple-500/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm" className="text-gray-300">Şifre Tekrar</Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    className="bg-[#0a0a0f] border-purple-500/30 text-white"
                  />
                </div>
                <Button disabled={loading} type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
                  {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
