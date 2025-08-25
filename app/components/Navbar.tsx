'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import UserMenu from './UserMenu';
import {
  Home,
  CreditCard,
  FileText,
  Tag,
  ShieldCheck,
  Building2,
  BarChart2,
  MapPin,
  Plus,
  ChevronDown,
  Settings,
  DollarSign,
} from 'lucide-react';

const navigation = [
  { name: 'Início', href: '/', icon: Home },
  { name: 'Bancos', href: '/bancos', icon: CreditCard },
  { name: 'Transações', href: '/transacoes', icon: FileText },
  { name: 'Aluguéis', href: '/recebimento-alugueis', icon: DollarSign },
  { name: 'Integridade', href: '/integridade', icon: ShieldCheck },
  { name: 'DRE', href: '/dre', icon: BarChart2 },
];

const importOptions = [
  { name: 'Importação OFX', href: '/ofx-import', icon: FileText },
  { name: 'Importação Imobzi', href: '/importacao-imobzi', icon: FileText },
];

const categorizationOptions = [
  { name: 'Regras', href: '/regras-categorizacao', icon: Settings },
];

const registrationOptions = [
  { name: 'Categorias', href: '/categorias', icon: Tag },
  { name: 'Contas Bancárias', href: '/cadastros/contas', icon: CreditCard },
  { name: 'Cidades', href: '/cidades', icon: MapPin },
  { name: 'Imóveis', href: '/imoveis', icon: Building2 },
];

// ...existing code...

export default function Navbar() {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <span className="text-xl font-bold text-gray-900">
                Financeiro RATC
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}

            <div className="relative">
              <Button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Mais
                <ChevronDown className="w-4 h-4 ml-1.5" />
              </Button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {/* Importação Section */}
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Importação
                    </div>
                    {importOptions.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsDropdownOpen(false)}
                          className={`flex items-center px-4 py-2 text-sm transition-colors ${
                            isActive
                              ? 'text-blue-600 bg-blue-50'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {item.name}
                        </Link>
                      );
                    })}

                    <Separator className="my-2" />

                    {/* Categorização Section */}
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Categorização
                    </div>
                    {categorizationOptions.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsDropdownOpen(false)}
                          className={`flex items-center px-4 py-2 text-sm transition-colors ${
                            isActive
                              ? 'text-blue-600 bg-blue-50'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {item.name}
                        </Link>
                      );
                    })}

                    <Separator className="my-2" />

                    {/* Cadastro Section */}
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Cadastro
                    </div>
                    {registrationOptions.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsDropdownOpen(false)}
                          className={`flex items-center px-4 py-2 text-sm transition-colors ${
                            isActive
                              ? 'text-blue-600 bg-blue-50'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <UserMenu />
          </div>

          <div className="md:hidden flex items-center space-x-2">
            {/* User Menu for Mobile */}
            <UserMenu />
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menu principal</span>
              <svg
                className="block h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center pl-3 pr-4 py-2 text-base font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 bg-blue-50 border-r-4 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}

            <div className="px-3 py-2">
              <Button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Mais
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </Button>

              {isDropdownOpen && (
                <div className="mt-2 space-y-1">
                  {/* Importação Section */}
                  <div className="pl-8 pr-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Importação
                  </div>
                  {importOptions.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center pl-8 pr-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </Link>
                    );
                  })}

                  <div className="px-8">
                    <Separator className="my-2" />
                  </div>

                  {/* Categorização Section */}
                  <div className="pl-8 pr-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Categorização
                  </div>
                  {categorizationOptions.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center pl-8 pr-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </Link>
                    );
                  })}

                  <div className="px-8">
                    <Separator className="my-2" />
                  </div>

                  {/* Cadastro Section */}
                  <div className="pl-8 pr-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cadastro
                  </div>
                  {registrationOptions.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center pl-8 pr-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop dropdown overlay */}
      {isDropdownOpen && !isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </nav>
  );
}
