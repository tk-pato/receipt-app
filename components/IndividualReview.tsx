import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, X, Check, Calendar, Store, ShieldCheck, Info, Percent, Users, MessageSquare, CreditCard, Banknote, Plus
} from 'lucide-react';
import { AnalysisResult, ReceiptData } from '../types';
import { MF_ACCOUNT_ITEMS, DEFAULT_MEMBERS } from '../constants';

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
  const [participantPool, setParticipantPool] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");

  useEffect(() => {
    if (result.frameBlob) {
      const url = URL.createObjectURL(result.frameBlob);
      setImgUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [result.frameBlob, result.id]);

  useEffect(() => {
    const saved = localStorage.getItem('mf_participant_pool');
    setParticipantPool(saved ? JSON.parse(saved) : DEFAULT_MEMBERS);
  }, []);

  const data = result.data;
  if (!data) return null;

  const isMeeting = data.accountTitle === '会議費';
  const isEntertainment = data.accountTitle === '接待交際費';

  const handleChange = (field: keyof ReceiptData, value: any) => {
    onUpdate(result.id, { ...data, [field]: value });
  };

  const currentParticipants = data.participants ? data.participants.split(',').map(n => n.trim()).filter(Boolean) : [];
  
  const toggleParticipant = (name: string) => {
    let newList = currentParticipants.includes(name) ? currentParticipants.filter(n => n !== name) : [...currentParticipants, name];
    onUpdate(result.id, { ...data, participants: newList.join(', '), peopleCount: Math.max(1, newList.length) });
  };

  const handleAddNewMember = () => {
    const name = newMember.trim();
    if (!name) return;
    
    // Update global pool
    if (!participantPool.includes(name)) {
      const newPool = [...participantPool, name];
      setParticipantPool(newPool);
      localStorage.setItem('mf_participant_pool', JSON.stringify(newPool));
    }

    // Add to current receipt
    if (!currentParticipants.includes(name)) {
      const newList = [...currentParticipants, name];
      onUpdate(result.id, { 
        ...data, 
        participants: newList.join(', '),
        peopleCount: Math.max(1, newList.length)
      });
    }
    setNewMember("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-7xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20">
        
        <div className="w-full md:w-3/5 bg-gray-900 flex items-center justify-center p-8 relative">
          <div className="absolute top-6 left-6 bg-black/50 text-white text-[10px] font-black px-4 py-2 rounded-full border border-white/10 tracking-widest uppercase backdrop-blur-md">
            Preview Mode
          </div>
          {imgUrl && <img src={imgUrl} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-500" alt="Preview" />}
        </div>

        <div className="w-full md:w-2/5 flex flex-col bg-white overflow-y-auto">
          <div className="p-8 border-b flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-sm z-20">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter italic">DETAIL REVIEW</h2>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Entry {currentIndex + 1} / {totalCount}</p>
            </div>
            <button onClick={onClose} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
          </div>

          <div className="p-10 space-y-10">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest"><Store className="w-4 h-4" />店名</label>
              <input type="text" value={data.shopName} onChange={(e) => handleChange('shopName', e.target.value)} className="w-full text-2xl font-black border-b-4 border-gray-50 outline-none pb-2 focus:border-blue-500 transition-all bg-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest"><Calendar className="w-4 h-4" />取引日</label>
                <input type="date" value={data.transactionDate} onChange={(e) => handleChange('transactionDate', e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest"><Info className="w-4 h-4" />税込金額</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-blue-300">¥</span>
                   <input type="number" value={data.amount} onChange={(e) => handleChange('amount', parseInt(e.target.value) || 0)} className="w-full p-4 pl-10 bg-blue-50 text-blue-600 font-black rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-xl" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest"><ShieldCheck className="w-4 h-4" />登録番号 (T+13桁 / 任意)</label>
                <input type="text" value={data.invoiceId || ''} placeholder="T..." onChange={(e) => handleChange('invoiceId', e.target.value.toUpperCase())} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-black uppercase placeholder:text-gray-200" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest"><Percent className="w-4 h-4" />税区分</label>
                <select value={data.taxRateType || '10'} onChange={(e) => handleChange('taxRateType', e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold appearance-none cursor-pointer">
                  <option value="10">10% (標準税率)</option>
                  <option value="8">8% (軽減税率)</option>
                  <option value="none">対象外 (不課税等)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">支払手段</label>
                <div className="flex bg-gray-50 p-1.5 rounded-2xl gap-2 shadow-inner">
                  <button onClick={() => handleChange('paymentMethod', 'cash')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-xs ${data.paymentMethod === 'cash' ? 'bg-white text-blue-600 shadow-md border border-blue-100' : 'text-gray-400 hover:text-gray-600'}`}><Banknote className="w-4 h-4" /> 現金</button>
                  <button onClick={() => handleChange('paymentMethod', 'card')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-xs ${data.paymentMethod === 'card' ? 'bg-white text-blue-600 shadow-md border border-blue-100' : 'text-gray-400 hover:text-gray-600'}`}><CreditCard className="w-4 h-4" /> カード</button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">推奨勘定科目</label>
                <select value={data.accountTitle} onChange={(e) => handleChange('accountTitle', e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold appearance-none cursor-pointer">
                  {MF_ACCOUNT_ITEMS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100">
              {isMeeting ? (
                 <div className="bg-blue-50/50 p-8 rounded-[2rem] border-2 border-blue-100 space-y-6">
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest"><Users className="w-5 h-5" />参加者設定</label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-400">人数:</span>
                        <input type="number" min="1" value={data.peopleCount || 1} onChange={(e) => handleChange('peopleCount', parseInt(e.target.value) || 1)} className="w-12 bg-white rounded-lg border border-blue-200 text-center font-black text-blue-600 outline-none" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {participantPool.map(name => (
                        <button key={name} onClick={() => toggleParticipant(name)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${currentParticipants.includes(name) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-blue-50 text-blue-400 hover:border-blue-200'}`}>{name}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t border-blue-100">
                      <input 
                        type="text" 
                        placeholder="新しい名前を入力..." 
                        value={newMember}
                        onChange={(e) => setNewMember(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNewMember()}
                        className="flex-grow p-4 bg-white rounded-2xl border-2 border-blue-50 focus:border-blue-300 outline-none text-sm font-bold shadow-inner"
                      />
                      <button 
                        onClick={handleAddNewMember}
                        className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                 </div>
              ) : isEntertainment ? (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest"><MessageSquare className="w-4 h-4" />備考 (相手先・目的など)</label>
                  <textarea rows={4} value={data.remarks || ''} onChange={(e) => handleChange('remarks', e.target.value)} placeholder="例: 〇〇株式会社 △△様 接待昼食代 / 目的: プロジェクト進捗報告" className="w-full p-6 bg-gray-50 rounded-[2rem] border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-medium text-sm transition-all resize-none shadow-inner placeholder:text-gray-200" />
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest"><MessageSquare className="w-4 h-4" />備考 / 詳細メモ</label>
                  <textarea rows={2} value={data.remarks || ''} onChange={(e) => handleChange('remarks', e.target.value)} placeholder="用途、場所などのメモを入力" className="w-full p-6 bg-gray-50 rounded-[2rem] border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-medium text-sm transition-all resize-none shadow-inner placeholder:text-gray-200" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto p-10 bg-gray-50/80 flex items-center justify-between sticky bottom-0 backdrop-blur-md border-t border-gray-100">
            <div className="flex gap-4">
              <button onClick={onPrev} disabled={currentIndex === 0} className="p-5 bg-white border border-gray-200 rounded-3xl text-gray-300 hover:text-gray-900 disabled:opacity-20 transition-all shadow-sm active:scale-95"><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={onNext} disabled={currentIndex === totalCount - 1} className="p-5 bg-white border border-gray-200 rounded-3xl text-gray-300 hover:text-gray-900 disabled:opacity-20 transition-all shadow-sm active:scale-95"><ChevronRight className="w-6 h-6" /></button>
            </div>
            <button onClick={onClose} className="px-14 py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 shadow-2xl shadow-blue-200 flex items-center gap-3 active:scale-95 transition-all"><Check className="w-5 h-5" /> レビュー完了</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualReview;
