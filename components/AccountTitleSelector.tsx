
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { MF_ACCOUNT_ITEMS } from '../constants';

interface AccountTitleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onToggle?: (isOpen: boolean) => void; // 開閉状態を親に通知
  className?: string;
}

const AccountTitleSelector: React.FC<AccountTitleSelectorProps> = ({ value, onChange, onToggle, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = MF_ACCOUNT_ITEMS.filter(item =>
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          onToggle?.(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const handleSelect = (item: string) => {
    onChange(item);
    setSearchTerm('');
    setIsOpen(false);
    onToggle?.(false);
  };

  const toggleOpen = () => {
    const nextState = !isOpen;
    if (nextState) {
      setSearchTerm('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    setIsOpen(nextState);
    onToggle?.(nextState); // 親に通知
  };

  return (
    <div 
      className={`relative ${className} ${isOpen ? 'z-[100]' : 'z-0'}`} 
      ref={containerRef}
    >
      <div 
        onClick={toggleOpen}
        className="w-full bg-white/70 border border-white/80 rounded-xl px-4 py-3 cursor-pointer flex items-center justify-between group hover:bg-white/95 transition-all duration-300 shadow-sm"
      >
        <span className={`text-[11px] font-black truncate ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || '科目を選択...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        /* 不透明度を bg-white に近くし、背後を完全に隠す */
        <div className="absolute z-[999] mt-2 w-full bg-white rounded-3xl shadow-[0_30px_90px_-15px_rgba(0,0,0,0.5)] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top min-w-[260px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="キーワードで検索..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[12px] font-bold outline-none focus:ring-4 focus:ring-slate-900/5 transition-all shadow-sm"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }}
                  className="absolute right-2 p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item}
                  onClick={() => handleSelect(item)}
                  className={`
                    px-4 py-3 rounded-xl text-[11px] font-black cursor-pointer flex items-center justify-between transition-all
                    ${value === item 
                      ? 'bg-slate-900 text-white shadow-lg' 
                      : 'text-slate-600 hover:bg-slate-50 hover:translate-x-1'}
                  `}
                >
                  {item}
                  {value === item && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No matches found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountTitleSelector;
