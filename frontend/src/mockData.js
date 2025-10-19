// Mock data for Hellcase clone

// Skin rarities with colors
// en üste ekle:
const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
export const rarities = {
  consumer: { name: 'Consumer Grade', color: '#B0C3D9', multiplier: 0.5 },
  industrial: { name: 'Industrial Grade', color: '#5E98D9', multiplier: 0.8 },
  milspec: { name: 'Mil-Spec Grade', color: '#4B69FF', multiplier: 1.2 },
  restricted: { name: 'Restricted', color: '#8847FF', multiplier: 2 },
  classified: { name: 'Classified', color: '#D32CE6', multiplier: 4 },
  covert: { name: 'Covert', color: '#EB4B4B', multiplier: 8 },
  knife: { name: 'Exceedingly Rare', color: '#FFD700', multiplier: 20 }
};

// Weapon types
const weaponTypes = [
  'AK-47', 'M4A4', 'M4A1-S', 'AWP', 'Desert Eagle',
  'Glock-18', 'USP-S', 'P250', 'Five-SeveN', 'Tec-9',
  'MP9', 'MAC-10', 'UMP-45', 'P90', 'Galil AR',
  'FAMAS', 'SG 553', 'AUG', 'SSG 08', 'G3SG1',
  'Karambit', 'Butterfly Knife', 'M9 Bayonet', 'Bayonet', 'Huntsman Knife'
];

// Skin names
const skinNames = [
  'Asiimov', 'Redline', 'Vulcan', 'Hyper Beast', 'Fade',
  'Dragon Lore', 'Howl', 'Fire Serpent', 'Doppler', 'Tiger Tooth',
  'Crimson Web', 'Case Hardened', 'Slaughter', 'Marble Fade', 'Gamma Doppler',
  'Neon Revolution', 'Neo-Noir', 'Bloodsport', 'Empress', 'Wild Lotus',
  'Inheritance', 'Printstream', 'Player Two', 'X-Ray', 'Akihabara Accept',
  'Desolate Space', 'Elite Build', 'Mecha Industries', 'Neon Rider', 'Poseidon',
  'The Battlestar', 'Chantico\'s Fire', 'Griffin', 'Conspiracy', 'Valence',
  'Code Red', 'Decimator', 'Momentum', 'Fuel Injector', 'Atheris',
  'Nightmare', 'Wasteland Rebel', 'Fronside Misty', 'Cartel', 'Jaguar'
];

// Generate mock skins
const generateSkins = () => {
  const skins = [];
  let id = 1;

  Object.keys(rarities).forEach(rarityKey => {
    const count = rarityKey === 'knife' ? 10 : 30;
    for (let i = 0; i < count; i++) {
      const weapon = rarityKey === 'knife' 
        ? weaponTypes[weaponTypes.length - 5 + (i % 5)]
        : weaponTypes[i % (weaponTypes.length - 5)];
      const skinName = skinNames[i % skinNames.length];
      const basePrice = Math.random() * 100 * rarities[rarityKey].multiplier;
      
      skins.push({
        id: id++,
        name: `${weapon} | ${skinName}`,
        weapon,
        skinName,
        rarity: rarityKey,
        rarityName: rarities[rarityKey].name,
        rarityColor: rarities[rarityKey].color,
        price: parseFloat((basePrice + Math.random() * 50).toFixed(2)),
        image: `https://placehold.co/400x300/1a1a2e/ffffff?text=${weapon.replace(' ', '+')}`,
        wear: ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'][Math.floor(Math.random() * 5)],
        statTrak: Math.random() > 0.8
      });
    }
  });

  return skins;
};

export const syncUserBalanceFromServer = async (email) => {
  try {
    const res = await fetch(
      `${API}/public/user-by-email?email=${encodeURIComponent(email)}`
    );
    if (!res.ok) return null;
    const data = await res.json(); // { id, email, balance }
    // localStorage'ı güncelle
    return updateUser({
      id: data.id,
      email: data.email,
      balance: data.balance,
    });
  } catch (e) {
    console.error("syncUserBalanceFromServer error:", e);
    return null;
  }
};

export const changeUserBalance = async (email, delta) => {
  try {
    const res = await fetch(
      `${API}/public/balance/add?email=${encodeURIComponent(email)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: Number(delta) }),
      }
    );
    if (!res.ok) return null;
    const updated = await res.json(); // server { id,email,balance,role... } döndürüyor
    // localStorage'ı yeni bakiyeyle güncelle
    return updateUser({ balance: updated.balance });
  } catch (e) {
    console.error("changeUserBalance error:", e);
    return null;
  }
};



export const skins = generateSkins();

// Generate cases
export const cases = [
  {
    id: 1,
    name: 'Awakening',
    type: 'regular',
    price: 15.01,
    image: 'https://placehold.co/300x400/4B0082/ffffff?text=Awakening',
    contents: skins.slice(0, 20),
    featured: true,
    isNew: true
  },
  {
    id: 2,
    name: 'Crimson Web',
    type: 'premium',
    price: 472.04,
    image: 'https://placehold.co/300x400/DC143C/ffffff?text=Crimson+Web',
    contents: skins.filter(s => ['covert', 'knife'].includes(s.rarity)),
    featured: true,
    isPremium: true
  },
  {
    id: 3,
    name: 'Spooky',
    type: 'regular',
    price: 5.99,
    image: 'https://placehold.co/300x400/FF6600/ffffff?text=Spooky',
    contents: skins.slice(10, 30),
    isEvent: true
  },
  {
    id: 4,
    name: 'Dreams & Nightmares',
    type: 'regular',
    price: 12.50,
    image: 'https://placehold.co/300x400/8B00FF/ffffff?text=Dreams',
    contents: skins.slice(5, 25)
  },
  {
    id: 5,
    name: 'Knife Paradise',
    type: 'premium',
    price: 899.99,
    image: 'https://placehold.co/300x400/FFD700/ffffff?text=Knife+Paradise',
    contents: skins.filter(s => s.rarity === 'knife'),
    isPremium: true
  },
  {
    id: 6,
    name: 'Revolution',
    type: 'regular',
    price: 18.75,
    image: 'https://placehold.co/300x400/FF1744/ffffff?text=Revolution',
    contents: skins.slice(15, 35)
  },
  {
    id: 7,
    name: 'Kilowatt',
    type: 'regular',
    price: 9.99,
    image: 'https://placehold.co/300x400/00E5FF/ffffff?text=Kilowatt',
    contents: skins.slice(20, 40),
    isNew: true
  },
  {
    id: 8,
    name: 'Gallery',
    type: 'regular',
    price: 14.25,
    image: 'https://placehold.co/300x400/9C27B0/ffffff?text=Gallery',
    contents: skins.slice(8, 28)
  }
];

// Statistics
export const statistics = [
  { icon: 'package', label: 'Kasa satın alındı', value: '685.191.489', color: '#F97316' },
  { icon: 'arrow-up', label: 'Yükseltmeler', value: '68.407.470', color: '#F97316' },
  { icon: 'sword', label: 'Kasa savaşları', value: '45.324.648', color: '#F97316' },
  { icon: 'file-contract', label: 'Kontrat imzalandı', value: '4.290.013', color: '#F97316' },
  { icon: 'users', label: 'Oyuncular', value: '16.943.107', color: '#F97316' }
];

// User mock data (stored in localStorage)
export const initializeUser = () => {
  const existingUser = localStorage.getItem('hellcase_user');
  if (!existingUser) {
    const defaultUser = {
      id: 1,
      username: 'Player',
      email: 'player@hellcase.com',
      balance: 10000,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      inventory: [],
      lastDailyBonus: null,
      stats: {
        casesOpened: 0,
        totalSpent: 0,
        totalWon: 0,
        battlesWon: 0,
        contractsCompleted: 0
      }
    };
    localStorage.setItem('hellcase_user', JSON.stringify(defaultUser));
    return defaultUser;
  }
  return JSON.parse(existingUser);
};

export const getUser = () => {
  const user = localStorage.getItem('hellcase_user');
  return user ? JSON.parse(user) : null;
};

export const updateUser = (updates) => {
  const user = getUser();
  if (user) {
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('hellcase_user', JSON.stringify(updatedUser));
    return updatedUser;
  }
  return null;
};

export const claimDailyBonus = () => {
  const user = getUser();
  if (!user) return null;

  const now = new Date();
  const lastBonus = user.lastDailyBonus ? new Date(user.lastDailyBonus) : null;
  
  // Check if 24 hours have passed
  if (!lastBonus || (now - lastBonus) > 24 * 60 * 60 * 1000) {
    const bonus = 100;
    return updateUser({
      balance: user.balance + bonus,
      lastDailyBonus: now.toISOString()
    });
  }
  
  return null;
};

// Game modes
export const gameModes = [
  { id: 'cs2', name: 'CS 2', icon: 'gamepad-2', active: true },
  { id: 'dota2', name: 'DOTA 2', icon: 'shield' },
  { id: 'rust', name: 'RUST', icon: 'wrench' }
];

// Navigation items
export const navigationItems = [
  { id: 'cases', label: 'Kasalar', icon: 'package', path: '/cases' },
  { id: 'pickem', label: "Pick'em", icon: 'trophy', path: '/pickem' },
  { id: 'activities', label: 'Etkinlik', icon: 'zap', path: '/activities' },
  { id: 'battles', label: 'Kasa Savaşı', icon: 'sword', path: '/battles', badge: 'NEW' },
  { id: 'contracts', label: 'Kontrat', icon: 'file-text', path: '/contracts' },
  { id: 'contests', label: 'Kullanıcı çekilişleri', icon: 'gift', path: '/contests' },
  { id: 'levels', label: 'LVL Ödülleri', icon: 'trending-up', path: '/levels' }
];