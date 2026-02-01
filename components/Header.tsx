import React from 'react';
import { Camera, Database } from 'lucide-react';

interface HeaderProps {
  lastBuild: string;
}

const Header: React.FC<HeaderProps> = ({ lastBuild }) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-none">
              MF Receipt Analyzer <span className="text-blue-600">Pro</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase mt-0.5 tracking-wider">
              Powered by Patolaqshe
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
            <Database className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Memory Guard Active</span>
          </div>
          <span className="text-gray-300 font-bold text-[9px] whitespace-nowrap">
            Last Build: {lastBuild}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;