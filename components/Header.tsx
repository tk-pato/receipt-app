import React from 'react';
import { Camera } from 'lucide-react';

interface HeaderProps {
  lastBuild: string;
}

const Header: React.FC<HeaderProps> = ({ lastBuild }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/40 backdrop-blur-xl border-b border-white/30">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-2.5 rounded-2xl shadow-xl shadow-slate-200">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">
              Receipt <span className="text-slate-500 italic">Vision</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Intelligent Ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100/50 rounded-full border border-white/40 backdrop-blur-sm">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Processing Core</span>
          </div>
          <span className="text-slate-300 font-black text-[10px] whitespace-nowrap hidden sm:block italic">
            v.{lastBuild}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;