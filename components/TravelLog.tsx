import React, { useState } from 'react';
import { Trip, Parent } from '../types';
import { Plane, Hotel, Shield, Calendar, MapPin } from 'lucide-react';

interface TravelLogProps {
  trips: Trip[];
  onAddTrip: (trip: Trip) => void;
  currentUser: Parent;
}

const TravelLog: React.FC<TravelLogProps> = ({ trips, onAddTrip, currentUser }) => {
  // Default to open if no trips exist, otherwise closed
  const [isAdding, setIsAdding] = useState(trips.length === 0);
  
  const [formData, setFormData] = useState<Partial<Trip>>({
    destination: '',
    startDate: '',
    endDate: '',
    flightOut: '',
    flightIn: '',
    flightOutTime: '',
    flightInTime: '',
    hotelName: '',
    hasInsurance: false,
    travelingParent: currentUser
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrip = {
      ...formData,
      id: Date.now().toString(),
      travelingParent: currentUser
    } as Trip;
    
    onAddTrip(newTrip);
    setIsAdding(false);
    setFormData({
        destination: '',
        startDate: '',
        endDate: '',
        flightOut: '',
        flightIn: '',
        flightOutTime: '',
        flightInTime: '',
        hotelName: '',
        hasInsurance: false,
        travelingParent: currentUser
    });
  };

  // Explicit border colors and background to ensure visibility
  const inputClasses = "w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">יומן נסיעות לחו״ל</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors"
        >
          {isAdding ? 'סגור טופס' : '+ הוסף נסיעה'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 space-y-5">
           <h3 className="font-bold text-slate-700 border-b border-slate-100 pb-2 mb-2">פרטי נסיעה חדשה</h3>
           
           <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">יעד הנסיעה</label>
                <input required className={inputClasses} placeholder="למשל: לונדון, אנגליה" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1.5">מלון / כתובת שהייה</label>
                 <input required className={inputClasses} placeholder="שם המלון או כתובת" value={formData.hotelName} onChange={e => setFormData({...formData, hotelName: e.target.value})} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">תאריך יציאה</label>
                <input type="date" required className={inputClasses} value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">תאריך חזרה</label>
                <input type="date" required className={inputClasses} value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
              </div>
           </div>

           <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">פרטי טיסות</p>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">מספר טיסה (הלוך)</label>
                  <input required className={inputClasses} placeholder="LY..." value={formData.flightOut} onChange={e => setFormData({...formData, flightOut: e.target.value})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-600 mb-1.5">שעת המראה</label>
                   <input type="time" required className={inputClasses} value={formData.flightOutTime} onChange={e => setFormData({...formData, flightOutTime: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">מספר טיסה (חזור)</label>
                  <input required className={inputClasses} placeholder="LY..." value={formData.flightIn} onChange={e => setFormData({...formData, flightIn: e.target.value})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-600 mb-1.5">שעת המראה</label>
                   <input type="time" required className={inputClasses} value={formData.flightInTime} onChange={e => setFormData({...formData, flightInTime: e.target.value})} />
                </div>
             </div>
           </div>

           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer" onClick={() => setFormData({...formData, hasInsurance: !formData.hasInsurance})}>
             <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.hasInsurance ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
               {formData.hasInsurance && <Shield size={12} className="text-white" />}
             </div>
             <label className="text-sm text-slate-700 font-medium cursor-pointer select-none">בוצע ביטוח נסיעות לילדים</label>
           </div>

           <div className="flex justify-end pt-2 gap-3">
             <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-500 text-sm font-medium hover:bg-slate-100 rounded-lg transition-colors">ביטול</button>
             <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-colors">שמור פרטים</button>
           </div>
        </form>
      )}

      <div className="grid gap-4">
        {trips.map(trip => (
          <div key={trip.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-1.5 h-full ${trip.travelingParent === Parent.DAD ? 'bg-sky-400' : 'bg-rose-400'}`}></div>
            
            <div className="flex justify-between items-start mb-4 pr-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                   <MapPin size={20} className="text-indigo-500" />
                   <h3 className="font-bold text-lg text-slate-900">{trip.destination}</h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                   <Calendar size={14} />
                   <span>{trip.startDate} - {trip.endDate}</span>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold
                ${trip.travelingParent === Parent.DAD ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}
              `}>
                {trip.travelingParent === Parent.DAD ? 'אבא טס' : 'אמא טסה'}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">טיסות</p>
                <div className="flex items-center justify-between gap-2 mb-2 border-b border-slate-200 pb-2">
                   <div className="flex items-center gap-2">
                      <Plane size={14} className="rotate-45 text-slate-400" />
                      <span className="font-bold text-slate-700">{trip.flightOut}</span>
                   </div>
                   <span className="text-slate-500 text-xs bg-white px-2 py-0.5 rounded border border-slate-100">{trip.flightOutTime}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                   <div className="flex items-center gap-2">
                      <Plane size={14} className="-rotate-135 text-slate-400" />
                      <span className="font-bold text-slate-700">{trip.flightIn}</span>
                   </div>
                   <span className="text-slate-500 text-xs bg-white px-2 py-0.5 rounded border border-slate-100">{trip.flightInTime}</span>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">לינה</p>
                    <div className="flex items-start gap-2">
                        <Hotel size={16} className="text-slate-400 mt-0.5" />
                        <span className="font-medium text-slate-800 leading-tight">{trip.hotelName}</span>
                    </div>
                 </div>
                 
                 <div className="mt-3 pt-3 border-t border-slate-200/50">
                    {trip.hasInsurance ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                        <div className="bg-emerald-100 p-1 rounded-full"><Shield size={10} /></div>
                        <span>יש ביטוח נסיעות</span>
                    </div>
                    ) : (
                    <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold">
                        <div className="bg-rose-100 p-1 rounded-full"><Shield size={10} /></div>
                        <span>אין ביטוח עדיין</span>
                    </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        ))}
        
        {trips.length === 0 && !isAdding && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="bg-slate-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plane size={24} className="text-slate-300" />
            </div>
            <h3 className="text-slate-600 font-bold mb-1">אין נסיעות מתוכננות</h3>
            <p className="text-xs text-slate-400 mb-4">הוסף נסיעה כדי לעדכן את הצד השני</p>
            <button 
                onClick={() => setIsAdding(true)}
                className="text-indigo-600 text-sm font-bold hover:underline"
            >
                לחץ להוספה
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelLog;