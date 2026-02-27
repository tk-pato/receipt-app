
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, X, Check, Calendar, Store, ShieldCheck, Info, Percent, Users, CreditCard, Banknote, Plus, Minus, MessageSquare
} from 'lucide-react';
import { AnalysisResult, ReceiptData } from '../types';
import { MF_ACCOUNT_ITEMS } from '../constants';
import AccountTitleSelector from './AccountTitleSelector';

interface IndividualReviewProps {
  result: AnalysisResult;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onUpdate: (id: string, data: ReceiptData) => void;
}

const IndividualReview: React.FC<IndividualReviewProps> = ({
  result, currentIndex, totalCount, onClose, onPrev, onNext, onUpdate
}) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  useEffect(() => {
    if (result.frameBlob) {
      const url = URL.createObjectURL(result.frameBlob);
      setImgUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [result.frameBlob, result.id]);

  const data = result.data;
  if (!data) return null;

  const showParticipants = data.accountTitle?.trim() === '会議費';
  const invoiceRegex = /^T\d{13}$/;
  const effectiveQualified = data.isQualifiedInvoice ?? !!(data.invoiceId && invoiceRegex.test(data.invoiceId));

  const handleChange = (field: keyof ReceiptData, value: any) => {
    onUpdate(result.id, { ...data, [field]: value });
  };

  const handleCountChange = (delta: number) => {
    const currentCount = data.peopleCount || 0;
    const newCount = Math.max(0, currentCount + delta);
    handleChange('peopleCount', newCount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in">
      <div className="glass-modal w-full max-w-7xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/40">
        
        <div className="w-full md:w-3/5 bg-slate-900/10 flex items-center justify-center p-8 relative border-r border-white/30">
          <div className="absolute top-6 left-6 bg-white/20 text-slate-900 text-[10px] font-black px-4 py-2 rounded-full border border-white/40 tracking-widest uppercase backdrop-blur-md">
            Document Viewer
          </div>
          {imgUrl && <img src={imgUrl} className="max-w-full max-h-full object-contain rounded-2xl shadow-xl animate-in zoom-in-95 duration-500 mix-blend-multiply" alt="Preview" />}
        </div>

        <div className="w-full md:w-2/5 flex flex-col bg-transparent overflow-y-auto custom-scrollbar">
          <div className="p-8 border-b border-white/30 flex justify-between items-center sticky top-0 bg-white/60 backdrop-blur-xl z-20">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic">LEDGER REVIEW</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Index {currentIndex + 1} of {totalCount}</p>
            </div>
            <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-white/50 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
          </div>

          <div className="p-10 space-y-10">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest"><Store className="w-4 h-4" />Merchant Name</label>
              <input type="text" value={data.shopName || ''} onChange={(e) => handleChange('shopName', e.target.value)} className="w-full text-2xl font-black border-b-4 border-slate-200 outline-none pb-2 focus:border-slate-900 transition-all bg-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest"><Calendar className="w-4 h-4" />Date</label>
                <input type="date" value={data.transactionDate || ''} onChange={(e) => handleChange('transactionDate', e.target.value)} className="w-full p-4 bg-white/40 rounded-2xl border border-white/50 focus:border-slate-900 outline-none font-bold" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest"><Info className="w-4 h-4" />Total</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">¥</span>
                   <input type="number" value={data.amount || 0} onChange={(e) => handleChange('amount', parseInt(e.target.value) || 0)} className="w-full p-4 pl-10 bg-slate-900/5 text-slate-900 font-black rounded-2xl border border-white/50 focus:border-slate-900 outline-none text-xl" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 relative">
              <div className="z-10">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest"><ShieldCheck className="w-4 h-4" />Invoice ID</label>
                <input type="text" value={data.invoiceId || ''} placeholder="T..." onChange={(e) => handleChange('invoiceId', e.target.value.toUpperCase())} className="w-full p-4 bg-white/40 rounded-2xl border border-white/50 focus:border-slate-900 outline-none font-black uppercase placeholder:text-slate-200" />
              </div>
              <div className="z-10">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest"><Percent className="w-4 h-4" />Tax Type</label>
                <select value={data.taxRateType || '10'} onChange={(e) => handleChange('taxRateType', e.target.value)} className="w-full p-4 bg-white/40 rounded-2xl border border-white/50 focus:border-slate-900 outline-none font-bold appearance-none cursor-pointer">
                  <option value="10">10% Standard</option>
                  <option value="8">8% Reduced</option>
                  <option value="none">Exempt/N/A</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest"><ShieldCheck className="w-4 h-4" />適格事業者</label>
              <div className="flex bg-white/40 p-1.5 rounded-2xl gap-2 border border-white/50 shadow-inner">
                <button
                  onClick={() => handleChange('isQualifiedInvoice', true)}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-xs ${effectiveQualified ? 'bg-white text-emerald-700 shadow-md border border-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Check className="w-4 h-4" /> 適格事業者
                </button>
                <button
                  onClick={() => handleChange('isQualifiedInvoice', false)}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-xs ${!effectiveQualified ? 'bg-white text-red-500 shadow-md border border-red-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <X className="w-4 h-4" /> 非適格事業者
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 relative overflow-visible">
              <div className="z-0">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Method</label>
                <div className="flex bg-white/40 p-1.5 rounded-2xl gap-2 border border-white/50 shadow-inner">
                  <button onClick={() => handleChange('paymentMethod', 'cash')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-xs ${data.paymentMethod === 'cash' ? 'bg-white text-slate-900 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}><Banknote className="w-4 h-4" /> Cash</button>
                  <button onClick={() => handleChange('paymentMethod', 'card')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-xs ${data.paymentMethod === 'card' ? 'bg-white text-slate-900 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}><CreditCard className="w-4 h-4" /> Card</button>
                </div>
              </div>
              <div className={`transition-all ${isSelectorOpen ? 'z-50' : 'z-0'}`}>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Account Category</label>
                <AccountTitleSelector 
                  value={data.accountTitle?.trim() || ''} 
                  onChange={(val) => handleChange('accountTitle', val)}
                  onToggle={setIsSelectorOpen} 
                />
              </div>
            </div>

            <div className="pt-8 border-t border-white/30 relative z-0">
              {showParticipants ? (
                 <div className="bg-white/50 p-8 rounded-[2rem] border border-white/60 shadow-inner space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest"><Users className="w-5 h-5" />Participants</label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400">Headcount:</span>
                        <div className="flex items-center bg-white/60 rounded-lg border border-white/80">
                          <button onClick={() => handleCountChange(-1)} className="p-2 text-slate-600 hover:bg-white transition-colors"><Minus className="w-4 h-4" /></button>
                          <input
                            type="number"
                            min="0"
                            value={data.peopleCount ?? 0}
                            onChange={(e) => handleChange('peopleCount', parseInt(e.target.value) || 0)}
                            className="w-12 text-center font-black text-slate-900 outline-none py-2 bg-transparent"
                          />
                          <button onClick={() => handleCountChange(1)} className="p-2 text-slate-600 hover:bg-white transition-colors"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                    <textarea 
                      rows={3} 
                      value={data.participants || ''} 
                      onChange={(e) => handleChange('participants', e.target.value)} 
                      placeholder="参加者の氏名をカンマ区切りで入力..." 
                      className="w-full p-4 bg-white/60 rounded-2xl border border-white/60 outline-none text-sm font-bold placeholder:text-slate-300"
                    />
                 </div>
              ) : (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><MessageSquare className="w-5 h-5" />Remarks / Note</label>
                  <textarea 
                    rows={3} 
                    value={data.remarks || ''} 
                    onChange={(e) => handleChange('remarks', e.target.value)} 
                    placeholder="備考やメモを入力..." 
                    className="w-full p-4 bg-white/40 rounded-2xl border border-white/50 focus:border-slate-900 outline-none font-bold"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto p-10 bg-white/60 border-t border-white/30 backdrop-blur-xl flex items-center justify-between sticky bottom-0 z-20">
            <div className="flex gap-4">
              <button 
                onClick={onPrev} 
                disabled={currentIndex === 0} 
                className="p-4 glass-card bg-white/50 rounded-2xl disabled:opacity-20 hover:bg-white transition-all shadow-lg active:scale-95"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button 
                onClick={onNext} 
                disabled={currentIndex === totalCount - 1} 
                className="p-4 glass-card bg-white/50 rounded-2xl disabled:opacity-20 hover:bg-white transition-all shadow-lg active:scale-95"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </div>
            <button 
              onClick={onClose} 
              className="px-12 py-5 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-black transition-all flex items-center gap-3 shadow-2xl active:translate-y-1"
            >
              <Check className="w-6 h-6" /> COMPLETE REVIEW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualReview;
