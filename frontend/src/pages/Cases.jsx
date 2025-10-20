import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { cases } from '../mockData';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Search, Filter } from 'lucide-react';

const Cases = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredCases = cases.filter(caseItem => {
    const matchesSearch = caseItem.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'premium' && caseItem.isPremium) ||
                         (filterType === 'regular' && !caseItem.isPremium);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
            Tüm Kasalar
          </h1>
          <p className="text-gray-400 text-lg">
            CS:GO kasalarını açın ve en iyi skinleri kazanın!
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Kasa ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#1a1a2e] border-purple-500/30 text-white"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setFilterType('all')}
              className={`${
                filterType === 'all'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-[#1a1a2e] hover:bg-[#252540]'
              }`}
            >
              Tümü
            </Button>
            <Button
              onClick={() => setFilterType('regular')}
              className={`${
                filterType === 'regular'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-[#1a1a2e] hover:bg-[#252540]'
              }`}
            >
              Normal
            </Button>
            <Button
              onClick={() => setFilterType('premium')}
              className={`${
                filterType === 'premium'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-[#1a1a2e] hover:bg-[#252540]'
              }`}
            >
              Premium
            </Button>
          </div>
        </div>

        {/* Cases Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCases.map(caseItem => (
            <Link key={caseItem.id} to={`/case/${caseItem.id}`}>
              <Card className="bg-[#1a1a2e] border-purple-500/20 hover:border-purple-500/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 overflow-hidden group cursor-pointer">
                <CardContent className="p-0">
                  <div className="relative aspect-[3/4]">
                    <img 
                      src={caseItem.image} 
                      alt={caseItem.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      {caseItem.isNew && (
                        <Badge className="bg-orange-500 text-white font-bold">YENİ</Badge>
                      )}
                      {caseItem.isPremium && (
                        <Badge className="bg-yellow-500 text-black font-bold">PREMIUM</Badge>
                      )}
                      {caseItem.isEvent && (
                        <Badge className="bg-green-500 text-white font-bold">EVENT</Badge>
                      )}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8">
                      <div className="text-white text-sm">
                        <p className="font-semibold">{caseItem.contents.length} Ürün</p>
                        <p className="text-xs text-gray-300">Tıklayarak aç</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8">
                    <h3 className="text-lg font-bold text-white mb-3 truncate">{caseItem.name}</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-green-500">$ {caseItem.price}</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6"
                      >
                        Aç
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* No results */}
        {filteredCases.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">Sonuç bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cases;
