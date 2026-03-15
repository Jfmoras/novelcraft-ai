import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Home, ArrowLeft } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-12 flex items-center justify-between border-b border-stone-200 pb-4">
        <div className="flex items-center gap-4">
          {!isHome && (
            <button 
              onClick={() => navigate(-1)}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors"
              title="Go Back"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 text-2xl font-serif font-bold text-stone-800 hover:text-stone-600 transition-colors">
            <BookOpen className="w-8 h-8" />
            <span>NovelCraft AI</span>
          </Link>
        </div>
        
        {!isHome && (
          <Link 
            to="/" 
            className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors font-medium"
          >
            <Home size={20} />
            <span className="hidden sm:inline">Main Menu</span>
          </Link>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
