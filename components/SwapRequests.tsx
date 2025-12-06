import React, { useState } from 'react';
import { SwapRequest, SwapStatus, Parent, SwapType } from '../types';
import { ArrowLeftRight, Check, Clock, Calendar, CalendarRange, RefreshCcw } from 'lucide-react';

interface SwapRequestsProps {
  requests: SwapRequest[];
  currentUser: Parent;
  onRequestUpdate: (updatedRequest: SwapRequest) => void;
  onCreateRequest: (req: SwapRequest) => void;
}

const SwapRequests: React.FC<SwapRequestsProps> = ({ requests, currentUser, onRequestUpdate, onCreateRequest }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<{
      type: SwapType,
      startDate: string,
      endDate: string,
      startTime: string,
      endTime: string,
      exchangeDate: string,
      exchangeEndDate: string,
      note: string
  }>({
    type: 'DAY',
    startDate: '',
    endDate: '',
    startTime: '16:00',
    endTime: '20:00',
    exchangeDate: '',
    exchangeEndDate: '',
    note: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newReq: SwapRequest = {
      id: Date.now().toString(),
      requestor: currentUser,
      status: SwapStatus.PENDING,
      type: form.type,
      startDate: form.startDate,
      endDate: form.type === 'RANGE' ? form.endDate : undefined,
      startTime: form.type === 'HOURS' ? form.startTime : undefined,
      endTime: form.type === 'HOURS' ? form.endTime : undefined,
      exchangeDate: form.exchangeDate || undefined,
      exchangeEndDate: form.exchangeEndDate || undefined,
      note: form.note
    };
    onCreateRequest(newReq);
    setIsCreating(false);
    setForm({ type: 'DAY', startDate: '', endDate: '', startTime: '16:00', endTime: '20:00', exchangeDate: '', exchangeEndDate: '', note: '' });
  };

  const handleStatusChange = (request: SwapRequest, status: SwapStatus) => {
    onRequestUpdate({ ...request, status });
  };

  const myRequests = requests.filter(r => r.requestor === currentUser);
  const incomingRequests = requests.filter(r => r.requestor !== currentUser);

  const getTypeLabel = (type: SwapType) => {
      switch(type) {
          case 'DAY': return 'יום שלם';
          case 'RANGE': return 'תקופה/רצף';
          case 'HOURS': return 'שעות בודדות';
      }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">בקשות החלפה</h2>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors"
          >
            + בקשה חדשה
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 animate-in slide-in-from-top-2">
            
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 mb-4">
                {(['DAY', 'RANGE', 'HOURS'] as SwapType[]).map(t => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setForm({...form, type: t})}
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${form.type === t ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}
                    >
                        {getTypeLabel(t)}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                    {form.type === 'RANGE' ? 'מתאריך' : 'תאריך'}
                </label>
                <input 
                  type="date" 
                  required
                  value={form.startDate}
                  onChange={e => setForm({...form, startDate: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {form.type === 'RANGE' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">עד תאריך</label>
                    <input 
                      type="date" 
                      required
                      value={form.endDate}
                      onChange={e => setForm({...form, endDate: e.target.value})}
                      className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
              )}

              {form.type === 'HOURS' && (
                  <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-4 bg-white p-2 rounded-lg border border-slate-100">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">משעה</label>
                        <input 
                          type="time" 
                          required
                          value={form.startTime}
                          onChange={e => setForm({...form, startTime: e.target.value})}
                          className="w-full p-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">עד שעה</label>
                        <input 
                          type="time" 
                          required
                          value={form.endTime}
                          onChange={e => setForm({...form, endTime: e.target.value})}
                          className="w-full p-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                  </div>
              )}
            </div>
            
            {/* Exchange Offer Section */}
            {(form.type === 'DAY' || form.type === 'RANGE') && (
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 mb-4">
                    <h4 className="text-xs font-bold text-indigo-800 mb-2 flex items-center gap-2">
                        <RefreshCcw size={14} />
                        יום חלופי (לא חובה)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-medium text-slate-500 mb-1">
                                {form.type === 'RANGE' ? 'ימי תמורה (החל מ-)' : 'יום תמורה'}
                             </label>
                             <input 
                                type="date" 
                                value={form.exchangeDate}
                                onChange={e => setForm({...form, exchangeDate: e.target.value})}
                                className="w-full p-2 border border-indigo-200 rounded-lg bg-white"
                             />
                        </div>
                        {form.type === 'RANGE' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">עד תאריך</label>
                                <input 
                                    type="date" 
                                    value={form.exchangeEndDate}
                                    onChange={e => setForm({...form, exchangeEndDate: e.target.value})}
                                    className="w-full p-2 border border-indigo-200 rounded-lg bg-white"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">הערה (אופציונלי)</label>
              <input 
                type="text" 
                value={form.note}
                onChange={e => setForm({...form, note: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                placeholder="למשל: יש לי אירוע..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreating(false)} className="text-slate-500 text-sm px-3 py-1">ביטול</button>
              <button type="submit" className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg">שלח בקשה</button>
            </div>
          </form>
        )}

        <div className="space-y-6">
          {/* Incoming Requests */}
          {incomingRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">בקשות שהתקבלו</h3>
              <div className="space-y-3">
                {incomingRequests.map(req => (
                  <div key={req.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-rose-100 text-rose-600 p-2 rounded-full h-fit">
                        <ArrowLeftRight size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                             <p className="font-medium text-slate-800">
                                {req.requestor === Parent.DAD ? 'אבא' : 'אמא'} מבקש/ת {getTypeLabel(req.type)}
                             </p>
                             <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{getTypeLabel(req.type)}</span>
                        </div>
                        
                        <div className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                           {req.type === 'DAY' && (
                               <div className="flex items-center gap-2">
                                   <Calendar size={14} /> 
                                   <span className="font-bold">{req.startDate}</span>
                               </div>
                           )}
                           {req.type === 'RANGE' && (
                               <div className="flex items-center gap-2">
                                   <CalendarRange size={14} /> 
                                   <span>
                                       מ- <span className="font-bold">{req.startDate}</span> עד <span className="font-bold">{req.endDate}</span>
                                   </span>
                               </div>
                           )}
                           {req.type === 'HOURS' && (
                               <div className="flex flex-col gap-1">
                                   <div className="flex items-center gap-2">
                                       <Calendar size={14} /> 
                                       <span className="font-bold">{req.startDate}</span>
                                   </div>
                                   <div className="flex items-center gap-2 text-xs">
                                       <Clock size={14} /> 
                                       <span>{req.startTime} - {req.endTime}</span>
                                   </div>
                               </div>
                           )}
                        </div>

                        {req.exchangeDate && (
                            <div className="text-xs text-indigo-700 mt-2 flex items-center gap-1.5 font-medium">
                                <RefreshCcw size={12} />
                                יום חלופי: {req.exchangeDate} {req.exchangeEndDate ? `- ${req.exchangeEndDate}` : ''}
                            </div>
                        )}

                        {req.note && <p className="text-xs text-slate-500 mt-2 italic">"{req.note}"</p>}
                      </div>
                    </div>

                    {req.status === SwapStatus.PENDING ? (
                      <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-50">
                        <button 
                          onClick={() => handleStatusChange(req, SwapStatus.REJECTED)}
                          className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium"
                        >
                          דחה
                        </button>
                        <button 
                          onClick={() => handleStatusChange(req, SwapStatus.APPROVED)}
                          className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg shadow-sm hover:bg-emerald-600 text-sm font-medium flex items-center gap-2"
                        >
                          <Check size={16} />
                          אשר
                        </button>
                      </div>
                    ) : (
                       <div className={`mt-2 text-center py-1 rounded text-xs font-bold
                         ${req.status === SwapStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}
                       `}>
                         {req.status === SwapStatus.APPROVED ? 'אושר' : 'נדחה'}
                       </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {myRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">הבקשות שלי</h3>
              <div className="space-y-3">
                {myRequests.map(req => (
                  <div key={req.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                         <span>ביקשת {getTypeLabel(req.type)}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                          {req.startDate} {req.type === 'RANGE' ? `- ${req.endDate}` : ''}
                      </p>
                      {req.exchangeDate && <p className="text-[10px] text-indigo-400 mt-0.5">יום חלופי: {req.exchangeDate}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded
                          ${req.status === SwapStatus.PENDING ? 'bg-amber-100 text-amber-700' : 
                            req.status === SwapStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}
                      `}>
                        {req.status === SwapStatus.PENDING ? 'ממתין' : (req.status === SwapStatus.APPROVED ? 'אושר' : 'נדחה')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapRequests;