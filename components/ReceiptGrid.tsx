
import React, { useState } from 'react';
import { Trash2, CheckCircle, Maximize2, ImageIcon, Loader2, Users, CreditCard, Banknote, Check, X } from 'lucide-react';
import { AnalysisResult, ReceiptData } from '../types';
import { MF_ACCOUNT_ITEMS } from '../constants';
import AccountTitleSelector from './AccountTitleSelector';

interface ReceiptGridProps {
  results: AnalysisResult[];
  onUpdate: (id: string, data: ReceiptData) => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onSelect: (id: string) => void;
}

const ReceiptCard: React.FC<{
  result: AnalysisResult;
  onUpdate: (id: string, data: ReceiptData) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}> = ({ result, onUpdate, onDelete, onSelect }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  
  useEffect(() => {
    if (result.frameBlob) {
      const url = URL.createObjectURL(result.frameBlob);
      setThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [result.frameBlob, result.id]);

  if (result.status === 'processing') {
    return (
      <div className="glass-card rounded-[2.5rem] p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center animate-pulse">
        <Loader2 className="w-12 h-12 text-slate-400 animate-spin mb-6" />
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Digitizing...</p>
      </div>
    );
  }

  const data = result.data || {} as ReceiptData;
  const isMeeting = data.accountTitle?.trim() === '会議費';
  const invoiceRegex = /^T\d{13}$/;
  const effectiveQualified = data.isQualifiedInvoice ?? !!(data.invoiceId && invoiceRegex.test(data.invoiceId));

  const handleChange = (field: keyof ReceiptData, value: any) => {
    onUpdate(result.id, { ...data, [field]: value });
  };

  return (
    /* セレクターが開いている時に z-50 を付与して最前面へ */
    <div className={`glass-card rounded-[2.5rem] shadow-xl flex flex-col transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] group relative overflow-visible ${isSelectorOpen ? 'z-50' : 'z-0'}`}>
      <div className="px-6 py-4 flex justify-between items-center bg-white/30 border-b border-white/40 group-hover:bg-white/50 transition-colors rounded-t-[2.5rem] relative z-10">
        <div className="flex items-center gap-3">
          {result.status === 'success' ? (
            <div className="bg-slate-100 p-1.5 rounded-full border border-slate-200">
              <CheckCircle className="w-4 h-4 text-slate-600" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-[10px] font-bold text-red-400 border border-red-100">!</div>
          )}
          <span className="text-[11px] font-black uppercase text-slate-500 tracking-tight truncate max-w-[200px]">{result.fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onSelect(result.id)} className="p-2.5 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-all"><Maximize2 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(result.id)} className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50/50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row h-full relative z-0 overflow-visible">
        <div className="w-full sm:w-52 h-56 sm:h-auto bg-slate-100/30 flex-shrink-0 relative group cursor-pointer flex items-center justify-center overflow-hidden border-r border-white/20 sm:rounded-bl-[2.5rem]" onClick={() => onSelect(result.id)}>
          {thumbUrl ? (
            <img src={thumbUrl} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-700" alt="Receipt Thumb" />
          ) : (
            <ImageIcon className="w-10 h-10 text-slate-300" />
          )}
        </div>

        <div className="p-8 flex-grow space-y-6 relative overflow-visible">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Merchant</label>
            <input type="text" value={data.shopName || ''} onChange={(e) => handleChange('shopName', e.target.value)} className="w-full text-lg font-black border-b-2 border-transparent focus:border-slate-900 outline-none pb-1 transition-all bg-transparent" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Date</label>
              <input type="date" value={data.transactionDate || ''} onChange={(e) => handleChange('transactionDate', e.target.value)} className="w-full text-sm font-bold border-b-2 border-transparent focus:border-slate-900 outline-none pb-1 transition-all bg-transparent" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Amount</label>
              <div className="flex items-center border-b-2 border-transparent focus-within:border-slate-900 transition-all">
                <span className="text-sm font-black text-slate-400 mr-2">¥</span>
                <input type="number" value={data.amount || 0} onChange={(e) => handleChange('amount', parseInt(e.target.value) || 0)} className="w-full text-lg font-black text-slate-900 outline-none bg-transparent" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 relative">
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Category</label>
              <AccountTitleSelector
                value={data.accountTitle?.trim() || ''}
                onChange={(val) => handleChange('accountTitle', val)}
                onToggle={setIsSelectorOpen}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Payment</label>
              <div className="flex bg-white/40 border border-white/50 rounded-xl p-1 gap-1 shadow-inner relative z-0">
                <button onClick={() => handleChange('paymentMethod', 'cash')} className={`flex-1 py-2 flex items-center justify-center transition-all rounded-lg ${data.paymentMethod === 'cash' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-slate-500'}`}><Banknote className="w-4 h-4" /></button>
                <button onClick={() => handleChange('paymentMethod', 'card')} className={`flex-1 py-2 flex items-center justify-center transition-all rounded-lg ${data.paymentMethod === 'card' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-slate-500'}`}><CreditCard className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">適格事業者</label>
            <div className="flex bg-white/40 border border-white/50 rounded-xl p-1 gap-1 shadow-inner">
              <button
                onClick={() => handleChange('isQualifiedInvoice', true)}
                className={`flex-1 py-2 flex items-center justify-center gap-1 transition-all rounded-lg text-[10px] font-black ${effectiveQualified ? 'bg-white text-emerald-700 shadow-md' : 'text-slate-300 hover:text-slate-500'}`}
              >
                <Check className="w-3 h-3" /> 適格
              </button>
              <button
                onClick={() => handleChange('isQualifiedInvoice', false)}
                className={`flex-1 py-2 flex items-center justify-center gap-1 transition-all rounded-lg text-[10px] font-black ${!effectiveQualified ? 'bg-white text-red-500 shadow-md' : 'text-slate-300 hover:text-slate-500'}`}
              >
                <X className="w-3 h-3" /> 非適格
              </button>
            </div>
          </div>

          {isMeeting && (
            <div className="pt-6 border-t border-white/50 space-y-4 relative z-0">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2"><Users className="w-4 h-4" /> Participants</label>
                <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full">{data.peopleCount ?? 0} People</span>
              </div>
              <textarea
                rows={2}
                value={data.participants || ''}
                onChange={(e) => handleChange('participants', e.target.value)}
                placeholder="参加者の氏名をカンマ区切りで入力..."
                className="w-full p-3 bg-white/40 rounded-xl border-2 border-transparent focus:border-slate-300 outline-none text-[11px] font-bold shadow-inner placeholder:text-slate-300 transition-all"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReceiptGrid: React.FC<ReceiptGridProps> = ({ results, onUpdate, onDelete, onSelect }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-visible">
      {results.map((result) => (
        <ReceiptCard key={result.id} result={result} onUpdate={onUpdate} onDelete={onDelete} onSelect={onSelect} />
      ))}
    </div>
  );
};

export default ReceiptGrid;
