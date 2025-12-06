import React, { useState } from 'react';
import { CalendarEvent, Parent, CustodySchedule, HolidayAssignment, CalendarReminder, SwapRequest, SwapStatus } from '../types';
import { ChevronLeft, ChevronRight, Sun, Bell, Plus, X, Star, RefreshCcw, Trash2 } from 'lucide-react';
import { HOLIDAYS_2024_2030 } from '../services/holidayData';

interface CalendarViewProps {
  events: CalendarEvent[];
  reminders?: CalendarReminder[];
  swapRequests?: SwapRequest[];
  currentUser: Parent;
  schedule: CustodySchedule;
  holidayAssignments: HolidayAssignment;
  onAddReminder?: (reminder: CalendarReminder) => void;
  onManualOverride?: (date: string, newParent: Parent) => void;
  onDeleteEvent?: (eventId: string) => void; // New Prop for undoing overrides
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
    events, 
    reminders = [], 
    swapRequests = [],
    currentUser, 
    schedule, 
    holidayAssignments, 
    onAddReminder,
    onManualOverride,
    onDeleteEvent
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateDetails, setSelectedDateDetails] = useState<{
      date: string;
      parent: Parent;
      source: 'CYCLE' | 'HOLIDAY' | 'OVERRIDE';
      holidayName?: string;
      overrideEventId?: string;
      createdBy?: string | Parent; // Track who created the override
  } | null>(null);
  
  const [modalTab, setModalTab] = useState<'details' | 'reminder'>('details');

  const [newReminder, setNewReminder] = useState<Partial<CalendarReminder>>({
      title: '',
      time: '18:00',
      category: 'OTHER'
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getHolidayForDate = (dateStr: string) => {
    const targetDate = new Date(dateStr);
    for (const holiday of HOLIDAYS_2024_2030) {
        const start = new Date(holiday.startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + holiday.duration - 1); 
        if (targetDate >= start && targetDate <= end) {
            return holiday;
        }
    }
    return null;
  };

  const getParentForDate = (date: Date, dateStr: string): { parent: Parent, source: 'CYCLE' | 'HOLIDAY' | 'OVERRIDE', holidayName?: string, overrideEventId?: string, createdBy?: string | Parent } => {
    // 1. Check for Overrides (Manual or Swaps) - Highest Priority
    const event = events.find(e => e.date === dateStr && e.isOverride);
    if (event) {
        return { parent: event.parent, source: 'OVERRIDE', overrideEventId: event.id, createdBy: (event as any).createdBy };
    }

    // Determine Regular Cycle Parent
    let regularParent = Parent.DAD;
    try {
      if (schedule && schedule.startDate && schedule.pattern && schedule.pattern.length > 0) {
          const targetUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
          const parts = schedule.startDate.split('-');
          if (parts.length === 3) {
            const sYear = parseInt(parts[0], 10);
            const sMonth = parseInt(parts[1], 10) - 1;
            const sDay = parseInt(parts[2], 10);
            
            const startUTC = Date.UTC(sYear, sMonth, sDay);
            const startDayOfWeek = new Date(startUTC).getUTCDay();
            const MS_PER_DAY = 86400000;
            const anchorUTC = startUTC - (startDayOfWeek * MS_PER_DAY);

            const diffMs = targetUTC - anchorUTC;
            const diffDays = Math.floor(diffMs / MS_PER_DAY);

            const cycleLen = schedule.cycleLength || 14;
            const index = ((diffDays % cycleLen) + cycleLen) % cycleLen;

            regularParent = schedule.pattern[index % schedule.pattern.length] || Parent.DAD;
          }
      }
    } catch (error) { }

    const holiday = getHolidayForDate(dateStr);
    const holidayAssignment = holidayAssignments[dateStr];

    if (holidayAssignment) {
        if (!schedule.holidayPriority || schedule.holidayPriority === 'HOLIDAYS_WIN') {
            return { parent: holidayAssignment, source: 'HOLIDAY', holidayName: holiday?.name };
        }
        return { parent: regularParent, source: 'CYCLE', holidayName: holiday?.name };
    }

    return { parent: regularParent, source: 'CYCLE', holidayName: holiday?.name };
  };

  const handleDayClick = (dateStr: string, currentParent: Parent, source: 'CYCLE' | 'HOLIDAY' | 'OVERRIDE', holidayName?: string, overrideEventId?: string, createdBy?: string | Parent) => {
      setSelectedDateDetails({ date: dateStr, parent: currentParent, source, holidayName, overrideEventId, createdBy });
      setNewReminder({...newReminder, date: dateStr});
      setModalTab('details');
      setIsModalOpen(true);
  };

  const handleSaveReminder = (e: React.FormEvent) => {
      e.preventDefault();
      if(onAddReminder && newReminder.title && newReminder.date) {
          onAddReminder({
              id: Date.now().toString(),
              title: newReminder.title,
              date: newReminder.date,
              time: newReminder.time,
              category: newReminder.category as any,
              createdBy: currentUser
          });
          setIsModalOpen(false);
          setNewReminder({ title: '', time: '18:00', category: 'OTHER' });
      }
  }

  const handleToggleOverride = () => {
      if (onManualOverride && selectedDateDetails) {
          const newParent = selectedDateDetails.parent === Parent.DAD ? Parent.MOM : Parent.DAD;
          onManualOverride(selectedDateDetails.date, newParent);
          setIsModalOpen(false);
      }
  };

  // NEW: Cancel Override Function
  const handleCancelOverride = () => {
      if (onDeleteEvent && selectedDateDetails?.overrideEventId) {
          onDeleteEvent(selectedDateDetails.overrideEventId);
          setIsModalOpen(false);
      }
  };

  const getSwapForDate = (dateStr: string) => {
      return swapRequests.find(req => 
          req.status === SwapStatus.APPROVED && 
          (req.startDate === dateStr || req.exchangeDate === dateStr)
      );
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' });

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50 border border-slate-100"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayReminders = reminders.filter(r => r.date === dateStr);
      
      const { parent: assignedParent, source, holidayName, overrideEventId, createdBy } = getParentForDate(dateObj, dateStr);
      const isHoliday = !!holidayName;
      const isOverride = source === 'OVERRIDE';

      days.push(
        <div 
            key={day} 
            onClick={() => handleDayClick(dateStr, assignedParent, source, holidayName, overrideEventId, createdBy)}
            className={`h-24 border border-slate-100 p-1 relative flex flex-col justify-between transition-all hover:bg-slate-50 cursor-pointer
            ${assignedParent === currentUser ? 'bg-blue-50/30' : 'bg-white'}
            ${isHoliday ? 'bg-amber-50/50' : ''}
            `}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full
              ${dateStr === new Date().toISOString().split('T')[0] ? 'bg-blue-600 text-white' : 'text-slate-700'}
            `}>
              {day}
            </span>
            <div className="flex gap-1">
                {isOverride && <Star size={14} className="text-indigo-500 fill-indigo-500" />}
                {isHoliday && <Sun size={14} className="text-amber-500" />}
                {dayReminders.length > 0 && <Bell size={14} className="text-purple-500 fill-current" />}
            </div>
          </div>
          
          <div className="mt-1 space-y-0.5">
             {isHoliday && <div className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded truncate font-medium">{holidayName}</div>}
             {dayReminders.map(r => (
                 <div key={r.id} className="text-[9px] bg-purple-100 text-purple-800 px-1 rounded truncate">{r.time} {r.title}</div>
             ))}
             <div className={`text-xs px-2 py-0.5 rounded-md text-center font-medium ${assignedParent === Parent.DAD ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'}`}>
               {assignedParent === Parent.DAD ? 'אבא' : 'אמא'}
             </div>
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 flex justify-between items-center bg-white border-b border-slate-100">
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-slate-100 rounded-full">
          <ChevronRight size={20} />
        </button>
        <h2 className="text-lg font-bold text-slate-800">{monthName}</h2>
        <div className="flex gap-2">
            <button onClick={() => { setSelectedDateDetails({ date: new Date().toISOString().split('T')[0], parent: currentUser, source: 'CYCLE' }); setNewReminder({...newReminder, date: new Date().toISOString().split('T')[0]}); setModalTab('reminder'); setIsModalOpen(true); }} className="p-2 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100"><Plus size={20} /></button>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft size={20} /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 text-center py-2 bg-slate-50 text-xs font-medium text-slate-500 border-b border-slate-200"><div>ראשון</div><div>שני</div><div>שלישי</div><div>רביעי</div><div>חמישי</div><div>שישי</div><div>שבת</div></div>
      <div className="grid grid-cols-7">{renderDays()}</div>

      {isModalOpen && selectedDateDetails && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
                  <div className="bg-slate-50 border-b p-4 flex justify-between items-center">
                      <div><h3 className="text-lg font-bold text-slate-800">{selectedDateDetails.date}</h3><p className="text-xs text-slate-500">ניהול יום ופעולות</p></div>
                      <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                  </div>
                  <div className="flex border-b border-slate-100">
                      <button onClick={() => setModalTab('details')} className={`flex-1 py-3 text-sm font-bold ${modalTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>פרטי יום</button>
                      <button onClick={() => setModalTab('reminder')} className={`flex-1 py-3 text-sm font-bold ${modalTab === 'reminder' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-400'}`}>+ תזכורת</button>
                  </div>

                  <div className="p-6">
                      {modalTab === 'details' && (
                          <div className="space-y-6">
                              <div className={`p-4 rounded-xl border-2 flex justify-between items-center ${selectedDateDetails.parent === Parent.DAD ? 'border-sky-100 bg-sky-50' : 'border-rose-100 bg-rose-50'}`}>
                                  <div><p className="text-xs font-bold opacity-60 uppercase mb-1">משמורת נוכחית</p><p className={`text-xl font-bold ${selectedDateDetails.parent === Parent.DAD ? 'text-sky-700' : 'text-rose-700'}`}>{selectedDateDetails.parent === Parent.DAD ? 'אצל אבא' : 'אצל אמא'}</p></div>
                                  <div className="text-right">
                                      <p className="text-xs font-bold opacity-60 uppercase mb-1">מקור ההגדרה</p>
                                      <div className="flex items-center justify-end gap-1">
                                          {selectedDateDetails.source === 'OVERRIDE' && <Star size={14} className="text-indigo-500 fill-indigo-500" />}
                                          {selectedDateDetails.source === 'HOLIDAY' && <Sun size={14} className="text-amber-500" />}
                                          <span className="text-sm font-medium">{selectedDateDetails.source === 'CYCLE' && 'סבב רגיל'}{selectedDateDetails.source === 'HOLIDAY' && `חג: ${selectedDateDetails.holidayName}`}{selectedDateDetails.source === 'OVERRIDE' && 'שינוי/החלפה'}</span>
                                      </div>
                                  </div>
                              </div>

                              {(() => {
                                  const swap = getSwapForDate(selectedDateDetails.date);
                                  if (swap) return (<div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-800"><div className="flex items-center gap-2 font-bold mb-1"><RefreshCcw size={14} />פרטי החלפה מאושרת</div><p>החלפה בוצעה ע"י {swap.requestor === Parent.DAD ? 'אבא' : 'אמא'}.</p>{swap.note && <p className="italic mt-1">"{swap.note}"</p>}</div>);
                              })()}

                              <div className="pt-4 border-t border-slate-100">
                                  {selectedDateDetails.source === 'OVERRIDE' ? (
                                      <>
                                        <h4 className="text-sm font-bold text-slate-700 mb-3">ביטול שינוי</h4>
                                        <p className="text-xs text-slate-500 mb-3">
                                            {selectedDateDetails.createdBy === currentUser ? 'את/ה יצרת את השינוי הזה. האם לבטל ולהחזיר למקור?' : 'השינוי נוצר על ידי הצד השני. רק הוא יכול לבטל אותו.'}
                                        </p>
                                        {selectedDateDetails.createdBy === currentUser && (
                                            <button onClick={handleCancelOverride} className="w-full py-3 bg-white border border-rose-300 text-rose-600 rounded-xl font-bold hover:bg-rose-50 transition-colors flex items-center justify-center gap-2">
                                                <Trash2 size={16} />
                                                בטל שינוי והחזר למצב רגיל
                                            </button>
                                        )}
                                      </>
                                  ) : (
                                      <>
                                        <h4 className="text-sm font-bold text-slate-700 mb-3">שינוי ידני</h4>
                                        <p className="text-xs text-slate-500 mb-3">ניתן לשנות את המשמורת ליום זה באופן חד פעמי. שינוי זה יגבר על הגדרות הסבב והחגים.</p>
                                        <button onClick={handleToggleOverride} className="w-full py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"><RefreshCcw size={16} />החלף להורה השני ({selectedDateDetails.parent === Parent.DAD ? 'אמא' : 'אבא'})</button>
                                      </>
                                  )}
                              </div>
                          </div>
                      )}

                      {modalTab === 'reminder' && (
                          <form onSubmit={handleSaveReminder} className="space-y-4">
                              <div><label className="text-xs font-bold text-slate-500 block mb-1">כותרת האירוע</label><input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="למשל: אסיפת הורים" value={newReminder.title} onChange={e => setNewReminder({...newReminder, title: e.target.value})} /></div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="text-xs font-bold text-slate-500 block mb-1">תאריך</label><input required type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={newReminder.date} onChange={e => setNewReminder({...newReminder, date: e.target.value})} /></div>
                                  <div><label className="text-xs font-bold text-slate-500 block mb-1">שעה</label><input type="time" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={newReminder.time} onChange={e => setNewReminder({...newReminder, time: e.target.value})} /></div>
                              </div>
                              <div><label className="text-xs font-bold text-slate-500 block mb-1">קטגוריה</label><select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={newReminder.category} onChange={e => setNewReminder({...newReminder, category: e.target.value as any})}><option value="SCHOOL">בית ספר / גן</option><option value="MEDICAL">רפואי</option><option value="BUREAUCRACY">בירוקרטיה</option><option value="OTHER">אחר</option></select></div>
                              <button type="submit" className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl mt-2 shadow-md hover:bg-purple-700">שמור תזכורת</button>
                          </form>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CalendarView;