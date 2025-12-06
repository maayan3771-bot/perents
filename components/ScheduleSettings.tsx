import React, { useState, useEffect } from 'react';
import { Parent, CustodySchedule, HolidayAssignment, HolidayDefinition, FixedPayment, ExpenseSettings } from '../types';
import { Check, Repeat, Sun, Landmark, Plus, Trash2, PieChart, ShieldAlert } from 'lucide-react';
import { HOLIDAYS_2024_2030 } from '../services/holidayData';
import { calculateLinkedAmount } from '../services/mockCpiService';

interface ScheduleSettingsProps {
  currentSchedule: CustodySchedule;
  currentHolidayAssignments?: HolidayAssignment;
  currentFixedPayments?: FixedPayment[];
  currentExpenseSettings?: ExpenseSettings;
  onSave: (schedule: CustodySchedule, holidays: HolidayAssignment, payments: FixedPayment[], expenseSettings: ExpenseSettings) => void;
}

const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({ 
  currentSchedule, 
  currentHolidayAssignments = {}, 
  currentFixedPayments = [], 
  currentExpenseSettings = { dadShare: 50, momShare: 50 },
  onSave 
}) => {
  const [activeTab, setActiveTab] = useState<'regular' | 'holidays' | 'financial'>('regular');
  
  // Regular Schedule State
  const [cycleLength, setCycleLength] = useState<7 | 14 | 28>(currentSchedule.cycleLength || 14);
  const [pattern, setPattern] = useState<Parent[]>(currentSchedule.pattern || []);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // New Priority State
  const [holidayPriority, setHolidayPriority] = useState<'HOLIDAYS_WIN' | 'CYCLE_WINS'>(currentSchedule.holidayPriority || 'HOLIDAYS_WIN');

  // Holiday Schedule State
  const [holidayAssignments, setHolidayAssignments] = useState<HolidayAssignment>(currentHolidayAssignments);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [expandedHolidayId, setExpandedHolidayId] = useState<string | null>(null);

  // Financial State
  const [fixedPayments, setFixedPayments] = useState<FixedPayment[]>(currentFixedPayments);
  const [expenseSettings, setExpenseSettings] = useState<ExpenseSettings>(currentExpenseSettings);

  // Helper for adding payment
  const addFixedPayment = () => {
      setFixedPayments([...fixedPayments, {
          id: Date.now().toString(),
          title: 'מזונות',
          baseAmount: 0,
          startDate: new Date().toISOString().split('T')[0],
          payer: Parent.DAD,
          receiver: Parent.MOM,
          paymentDay: 10,
          linkToCpi: true
      }]);
  };

  const removeFixedPayment = (id: string) => {
      setFixedPayments(fixedPayments.filter(p => p.id !== id));
  };

  const updateFixedPayment = (id: string, field: keyof FixedPayment, value: any) => {
      setFixedPayments(fixedPayments.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleDadShareChange = (val: number) => {
      if (val < 0) val = 0;
      if (val > 100) val = 100;
      setExpenseSettings({ dadShare: val, momShare: 100 - val });
  };

  const handleMomShareChange = (val: number) => {
      if (val < 0) val = 0;
      if (val > 100) val = 100;
      setExpenseSettings({ momShare: val, dadShare: 100 - val });
  };

  useEffect(() => {
    const currentLen = pattern.length;
    const targetLen = cycleLength;

    if (currentLen === targetLen) return;

    if (currentLen < targetLen) {
      if (currentLen === 0) {
        setPattern(Array(targetLen).fill(Parent.DAD));
      } else {
        const newPattern = [...pattern];
        while (newPattern.length < targetLen) {
          newPattern.push(newPattern[newPattern.length % currentLen]);
        }
        setPattern(newPattern);
      }
    } else {
      setPattern(pattern.slice(0, targetLen));
    }
  }, [cycleLength, pattern]);

  const toggleParent = (index: number) => {
    const newPattern = [...pattern];
    newPattern[index] = newPattern[index] === Parent.DAD ? Parent.MOM : Parent.DAD;
    setPattern(newPattern);
  };

  const getDatesForHoliday = (holiday: HolidayDefinition): string[] => {
      const dates: string[] = [];
      const start = new Date(holiday.startDate);
      for (let i = 0; i < holiday.duration; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          dates.push(d.toISOString().split('T')[0]);
      }
      return dates;
  };

  const assignWholeHoliday = (holiday: HolidayDefinition, parent: Parent) => {
      const dates = getDatesForHoliday(holiday);
      setHolidayAssignments(prev => {
          const next = { ...prev };
          dates.forEach(date => {
              next[date] = parent;
          });
          return next;
      });
  };

  const toggleSpecificDate = (dateStr: string) => {
      setHolidayAssignments(prev => {
          const current = prev[dateStr];
          const next = current === Parent.MOM ? Parent.DAD : Parent.MOM;
          return { ...prev, [dateStr]: next };
      });
  };
  
  const handleSave = () => {
    onSave({
      cycleLength,
      pattern,
      startDate,
      holidayPriority
    }, holidayAssignments, fixedPayments, expenseSettings);
  };

  const renderWeekGrid = (weekIndex: number, title: string) => {
     const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
     return (
      <div key={weekIndex} className="mb-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider flex justify-between">
          <span>{title}</span>
        </h4>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {daysOfWeek.map((dayName, dayIdx) => {
            const realIdx = (weekIndex * 7) + dayIdx;
            if (realIdx >= pattern.length) return null;
            
            return (
              <div key={`d-${realIdx}`} className="flex flex-col gap-1">
                <span className="text-[10px] text-center text-slate-400">{dayName}</span>
                <button
                  onClick={() => toggleParent(realIdx)}
                  className={`h-12 sm:h-14 rounded-lg flex items-center justify-center text-sm font-bold transition-all shadow-sm hover:opacity-90 active:scale-95
                    ${pattern[realIdx] === Parent.DAD ? 'bg-sky-400 text-white' : 'bg-rose-400 text-white'}
                  `}
                >
                  {pattern[realIdx] === Parent.DAD ? 'אבא' : 'אמא'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const holidaysForYear = HOLIDAYS_2024_2030.filter(h => h.startDate.startsWith(String(selectedYear)));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-100 overflow-x-auto">
        <button
          onClick={() => setActiveTab('regular')}
          className={`flex-1 min-w-[100px] py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors
            ${activeTab === 'regular' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-slate-400 hover:bg-slate-50'}
          `}
        >
          <Repeat size={18} />
          סבב וסדרי עדיפויות
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`flex-1 min-w-[100px] py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors
            ${activeTab === 'holidays' ? 'text-amber-600 bg-amber-50 border-b-2 border-amber-600' : 'text-slate-400 hover:bg-slate-50'}
          `}
        >
          <Sun size={18} />
          חגים
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={`flex-1 min-w-[100px] py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors
            ${activeTab === 'financial' ? 'text-purple-600 bg-purple-50 border-b-2 border-purple-600' : 'text-slate-400 hover:bg-slate-50'}
          `}
        >
          <Landmark size={18} />
          כספים
        </button>
      </div>

      <div className="p-6 space-y-6">
        {activeTab === 'regular' && (
          <div className="animate-in fade-in space-y-8">
             {/* Priority Section */}
             <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                 <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                     <ShieldAlert size={18} className="text-indigo-500" />
                     מה גובר על מה?
                 </h3>
                 <p className="text-xs text-slate-500 mb-4">
                     כאשר יש התנגשות בין הסבב הרגיל לבין חג. שינוי ידני תמיד יהיה החזק ביותר.
                 </p>
                 <div className="flex gap-2">
                     <button 
                        onClick={() => setHolidayPriority('HOLIDAYS_WIN')}
                        className={`flex-1 py-3 px-2 rounded-lg border text-sm font-bold flex flex-col items-center gap-1
                        ${holidayPriority === 'HOLIDAYS_WIN' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-400 hover:bg-white'}
                        `}
                     >
                         <Sun size={16} />
                         חגים גוברים
                         <span className="text-[9px] font-normal opacity-70">החג קובע</span>
                     </button>
                     <button 
                        onClick={() => setHolidayPriority('CYCLE_WINS')}
                        className={`flex-1 py-3 px-2 rounded-lg border text-sm font-bold flex flex-col items-center gap-1
                        ${holidayPriority === 'CYCLE_WINS' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-400 hover:bg-white'}
                        `}
                     >
                         <Repeat size={16} />
                         סבב רגיל גובר
                         <span className="text-[9px] font-normal opacity-70">מתעלם מהחג</span>
                     </button>
                 </div>
             </div>

             <div>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">תאריך עוגן לסבב</label>
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl"
                    />
                </div>
                <div className="flex gap-2 mb-4">
                    {[7, 14, 28].map(d => (
                        <button key={d} onClick={() => setCycleLength(d as any)} className={`flex-1 py-2 border rounded-lg ${cycleLength === d ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>
                            {d} ימים
                        </button>
                    ))}
                </div>
                <div>
                {renderWeekGrid(0, 'שבוע 1')}
                {cycleLength >= 14 && renderWeekGrid(1, 'שבוע 2')}
                {cycleLength === 28 && (
                    <>
                        {renderWeekGrid(2, 'שבוע 3')}
                        {renderWeekGrid(3, 'שבוע 4')}
                    </>
                    )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="animate-in fade-in">
             <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                 {[2024, 2025, 2026, 2027, 2028].map(year => (
                     <button key={year} onClick={() => setSelectedYear(year)} className={`px-4 py-1 rounded-full text-sm font-bold border ${selectedYear === year ? 'bg-amber-100 border-amber-300' : ''}`}>{year}</button>
                 ))}
             </div>
             <div className="space-y-4">
                {holidaysForYear.map(holiday => {
                    const dates = getDatesForHoliday(holiday);
                    const isExpanded = expandedHolidayId === holiday.id;
                    return (
                        <div key={holiday.id} className="border border-slate-200 rounded-xl">
                            <div className="p-3 flex justify-between items-center bg-slate-50 rounded-t-xl">
                                <span className="font-bold text-sm">{holiday.name}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => assignWholeHoliday(holiday, Parent.DAD)} className="text-[10px] px-2 py-1 bg-white border rounded">אבא</button>
                                    <button onClick={() => assignWholeHoliday(holiday, Parent.MOM)} className="text-[10px] px-2 py-1 bg-white border rounded">אמא</button>
                                </div>
                            </div>
                            <button onClick={() => setExpandedHolidayId(isExpanded ? null : holiday.id)} className="w-full text-center text-xs py-1 text-slate-400">
                                {isExpanded ? 'סגור' : 'פירוט ימים'}
                            </button>
                            {isExpanded && (
                                <div className="p-2 grid grid-cols-2 gap-2">
                                    {dates.map((date, idx) => (
                                        <div key={date} onClick={() => toggleSpecificDate(date)} className={`p-1 text-xs text-center border rounded cursor-pointer ${holidayAssignments[date] === Parent.DAD ? 'bg-sky-100' : holidayAssignments[date] === Parent.MOM ? 'bg-rose-100' : ''}`}>
                                            יום {idx+1}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
             </div>
          </div>
        )}

        {activeTab === 'financial' && (
            <div className="animate-in fade-in space-y-8">
                
                {/* Expense Ratio Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <PieChart size={20} className="text-blue-500" />
                       יחס חלוקת הוצאות
                   </h3>
                   <div className="grid grid-cols-2 gap-6 items-center">
                       <div>
                           <label className="text-xs font-bold text-sky-600 block mb-1">אחוז תשלום אבא</label>
                           <div className="relative">
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="100"
                                    value={expenseSettings.dadShare}
                                    onChange={(e) => handleDadShareChange(parseInt(e.target.value) || 0)}
                                    className="w-full p-2 border border-sky-200 rounded-lg text-center font-bold text-lg bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                                />
                                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">%</span>
                           </div>
                       </div>
                       
                       <div>
                           <label className="text-xs font-bold text-rose-600 block mb-1">אחוז תשלום אמא</label>
                           <div className="relative">
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="100"
                                    value={expenseSettings.momShare}
                                    onChange={(e) => handleMomShareChange(parseInt(e.target.value) || 0)}
                                    className="w-full p-2 border border-rose-200 rounded-lg text-center font-bold text-lg bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                                />
                                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">%</span>
                           </div>
                       </div>
                   </div>
                   
                   <p className="text-xs text-slate-500 mt-3 bg-white p-2 rounded border border-slate-100">
                       * יחס זה ישמש כברירת מחדל לחישוב היתרה ("מי חייב למי") עבור כל ההוצאות המשותפות. ניתן לשנות אותו בכל עת.
                   </p>
                </div>

                {/* Fixed Payments Section */}
                <div>
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                       <Landmark size={20} className="text-purple-500" />
                       מזונות ותשלומים קבועים
                    </h3>
                    <div className="space-y-4">
                        {fixedPayments.map((payment) => {
                             const calculated = payment.linkToCpi ? calculateLinkedAmount(payment.baseAmount, payment.startDate) : { amount: payment.baseAmount, increasePercent: 0 };
                             
                             return (
                                <div key={payment.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative">
                                    <button onClick={() => removeFixedPayment(payment.id)} className="absolute top-2 left-2 text-slate-300 hover:text-rose-500">
                                        <Trash2 size={16} />
                                    </button>
                                    
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400">סוג תשלום</label>
                                            <input type="text" className="w-full p-1 text-sm border-b" value={payment.title} onChange={e => updateFixedPayment(payment.id, 'title', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400">סכום בסיס</label>
                                            <input type="number" className="w-full p-1 text-sm border-b font-bold" value={payment.baseAmount} onChange={e => updateFixedPayment(payment.id, 'baseAmount', parseFloat(e.target.value))} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400">המשלם</label>
                                            <select className="w-full p-1 text-xs bg-slate-50 rounded" value={payment.payer} onChange={e => updateFixedPayment(payment.id, 'payer', e.target.value)}>
                                                <option value={Parent.DAD}>אבא</option>
                                                <option value={Parent.MOM}>אמא</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400">יום בחודש</label>
                                            <select className="w-full p-1 text-xs bg-slate-50 rounded" value={payment.paymentDay} onChange={e => updateFixedPayment(payment.id, 'paymentDay', parseInt(e.target.value))}>
                                                {[1, 2, 10, 15, 20, 25, 28].map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-purple-50 p-2 rounded-lg text-xs space-y-2">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={payment.linkToCpi} onChange={e => updateFixedPayment(payment.id, 'linkToCpi', e.target.checked)} />
                                            <span>הצמד למדד (אוטומטי)</span>
                                        </div>
                                        {payment.linkToCpi && (
                                            <>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-slate-500">תאריך התחלה:</span>
                                                  <input type="date" className="bg-transparent border-b border-purple-200" value={payment.startDate} onChange={e => updateFixedPayment(payment.id, 'startDate', e.target.value)} />
                                              </div>
                                              <div className="flex justify-between items-center font-bold text-purple-700 pt-1 border-t border-purple-100">
                                                  <span>סכום עדכני להיום:</span>
                                                  <span className="text-lg">{calculated.amount.toLocaleString()} ₪</span>
                                              </div>
                                              <div className="text-[10px] text-purple-400 text-left">
                                                  (עלייה של {calculated.increasePercent}%)
                                              </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                    
                    <button onClick={addFixedPayment} className="w-full py-2 mt-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 flex items-center justify-center gap-2">
                        <Plus size={16} />
                        הוסף תשלום קבוע
                    </button>
                </div>
            </div>
        )}

        <button
          onClick={handleSave}
          className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl shadow-md hover:bg-slate-900 transition-all flex items-center justify-center gap-2 mt-4"
        >
          <Check size={20} />
          שמור הגדרות
        </button>
      </div>
    </div>
  );
};

export default ScheduleSettings;