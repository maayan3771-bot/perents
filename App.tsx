import React, { useState, useEffect } from 'react';
import { View, Parent, Expense, SwapRequest, Trip, CalendarEvent, CustodySchedule, User, Payment, HolidayAssignment, FixedPayment, ExpenseSettings, CalendarReminder, DocumentItem, Medication, ChecklistItem } from './types';
import { Calendar, CreditCard, Repeat, Plane, Settings, LogOut, FileText, Loader2 } from 'lucide-react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signOut, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, // Added deleteDoc import
  doc, 
  setDoc, 
  query, 
  orderBy, 
  getDoc 
} from './firebase'; 

import CalendarView from './components/CalendarView';
import ExpenseTracker from './components/ExpenseTracker';
import SwapRequests from './components/SwapRequests';
import TravelLog from './components/TravelLog';
import ScheduleSettings from './components/ScheduleSettings';
import AuthScreen from './components/AuthScreen';
import DocumentsHub from './components/DocumentsHub';

const DEFAULT_SCHEDULE: CustodySchedule = {
  cycleLength: 14,
  startDate: new Date().toISOString().split('T')[0],
  pattern: [
    Parent.MOM, Parent.MOM, Parent.DAD, Parent.DAD, Parent.MOM, Parent.MOM, Parent.MOM,
    Parent.MOM, Parent.MOM, Parent.DAD, Parent.DAD, Parent.DAD, Parent.DAD, Parent.DAD
  ],
  holidayPriority: 'HOLIDAYS_WIN'
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('calendar');
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<CalendarReminder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  const [custodySchedule, setCustodySchedule] = useState<CustodySchedule>(DEFAULT_SCHEDULE);
  const [holidayAssignments, setHolidayAssignments] = useState<HolidayAssignment>({});
  const [fixedPayments, setFixedPayments] = useState<FixedPayment[]>([]);
  const [expenseSettings, setExpenseSettings] = useState<ExpenseSettings>({ dadShare: 50, momShare: 50 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setUser(userSnap.data() as User);
        } else {
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            fullName: 'User',
            phone: '',
            parentType: Parent.DAD,
            role: 'PARENT'
          });
        }
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snapshot: any) => {
        setExpenses(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Expense)));
    });
    const unsubPayments = onSnapshot(query(collection(db, 'payments'), orderBy('date', 'desc')), (snapshot: any) => {
        setPayments(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Payment)));
    });
    const unsubSwaps = onSnapshot(collection(db, 'swapRequests'), (snapshot: any) => {
        setSwapRequests(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as SwapRequest)));
    });
    const unsubTrips = onSnapshot(collection(db, 'trips'), (snapshot: any) => {
        setTrips(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Trip)));
    });
    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot: any) => {
        setEvents(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as CalendarEvent)));
    });
    const unsubReminders = onSnapshot(collection(db, 'reminders'), (snapshot: any) => {
        setReminders(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as CalendarReminder)));
    });
    const unsubDocs = onSnapshot(collection(db, 'documents'), (snapshot: any) => {
        setDocuments(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as DocumentItem)));
    });
    const unsubMeds = onSnapshot(collection(db, 'medications'), (snapshot: any) => {
        setMedications(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Medication)));
    });
    const unsubChecklist = onSnapshot(collection(db, 'checklist'), (snapshot: any) => {
        setChecklist(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as ChecklistItem)));
    });
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap: any) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.schedule) setCustodySchedule(data.schedule);
            if (data.holidays) setHolidayAssignments(data.holidays);
            if (data.fixedPayments) setFixedPayments(data.fixedPayments);
            if (data.expenseSettings) setExpenseSettings(data.expenseSettings);
        }
    });

    return () => {
        unsubExpenses(); unsubPayments(); unsubSwaps(); unsubTrips(); unsubEvents();
        unsubReminders(); unsubDocs(); unsubMeds(); unsubChecklist(); unsubSettings();
    };
  }, [user]);

  const handleLogin = (loggedInUser: User) => setUser(loggedInUser);
  const handleLogout = async () => { await signOut(auth); setUser(null); setCurrentView('calendar'); };

  const addExpense = async (newExpenses: Expense[]) => {
    try {
      for (const exp of newExpenses) {
          const { id, ...data } = exp; 
          await addDoc(collection(db, 'expenses'), data);
      }
      alert('הוצאה נשמרה בהצלחה!');
    } catch (e: any) {
      console.error(e);
      alert('שגיאה בשמירת הוצאה (בדוק הרשאות): ' + e.message);
    }
  };

  const handleSettleExpenses = async (payment: Payment, disputedExpenses: {id: string, reason: string}[]) => {
    try {
      const { id, ...paymentData } = payment;
      const payRef = await addDoc(collection(db, 'payments'), paymentData);
      payment.expenseIds.forEach(async (expId) => {
          const expRef = doc(db, 'expenses', expId);
          await updateDoc(expRef, { status: 'PAID', paymentId: payRef.id });
      });
      disputedExpenses.forEach(async (disp) => {
          const expRef = doc(db, 'expenses', disp.id);
          await updateDoc(expRef, { status: 'DISPUTED', disputeReason: disp.reason });
      });
      alert('התחשבנות בוצעה בהצלחה');
    } catch (e: any) {
      alert('שגיאה בהתחשבנות: ' + e.message);
    }
  };

  const addTrip = async (newTrip: Trip) => { 
    try {
      const { id, ...data } = newTrip; 
      await addDoc(collection(db, 'trips'), data); 
      alert('נסיעה נוספה בהצלחה');
    } catch (e: any) { alert('שגיאה: ' + e.message); }
  };

  const createSwapRequest = async (req: SwapRequest) => { 
    try {
      const { id, ...data } = req; 
      await addDoc(collection(db, 'swapRequests'), data); 
      alert('בקשה נשלחה בהצלחה');
    } catch (e: any) { alert('שגיאה: ' + e.message); }
  };
  
  const updateSwapRequest = async (updated: SwapRequest) => {
    try {
      const ref = doc(db, 'swapRequests', updated.id);
      const { id, ...data } = updated;
      await updateDoc(ref, data as any);
      if (updated.status === 'APPROVED' && updated.type === 'DAY') {
           await addDoc(collection(db, 'events'), { 
             date: updated.startDate, 
             parent: updated.requestor === Parent.DAD ? Parent.MOM : Parent.DAD, 
             isOverride: true,
             createdBy: updated.requestor
           });
           if (updated.exchangeDate) { 
             await addDoc(collection(db, 'events'), { 
               date: updated.exchangeDate, 
               parent: updated.requestor, 
               isOverride: true,
               createdBy: updated.requestor 
             }); 
           }
      }
    } catch (e: any) { alert('שגיאה: ' + e.message); }
  };

  const handleManualOverride = async (date: string, newParent: Parent) => {
      try {
        await addDoc(collection(db, 'events'), { 
          date: date, 
          parent: newParent, 
          isOverride: true,
          createdBy: currentUser 
        });
        alert(`בוצע שינוי ידני לתאריך ${date}`);
      } catch (e: any) { alert('שגיאה: ' + e.message); }
  };

  // New function to undo overrides
  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך לבטל את השינוי הזה?')) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
        alert('השינוי בוטל והתאריך חזר למצב המקורי');
      } catch (e: any) {
        alert('שגיאה בביטול השינוי: ' + e.message);
      }
    }
  };

  const handleSaveSettings = async (newSchedule: CustodySchedule, newHolidays: HolidayAssignment, newFixed: FixedPayment[], newExpSettings: ExpenseSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), { schedule: newSchedule, holidays: newHolidays, fixedPayments: newFixed, expenseSettings: newExpSettings });
      alert('הגדרות נשמרו בהצלחה בענן');
      setCurrentView('calendar');
    } catch (e: any) { alert('שגיאה בשמירת הגדרות: ' + e.message); }
  };

  const addReminder = async (reminder: CalendarReminder) => { 
    try {
      const { id, ...data } = reminder; 
      await addDoc(collection(db, 'reminders'), data);
    } catch (e: any) { alert('שגיאה: ' + e.message); }
  };

  const addDocument = async (docItem: DocumentItem) => { 
    try {
      const { id, ...data } = docItem; 
      await addDoc(collection(db, 'documents'), data);
    } catch (e: any) { alert('שגיאה: ' + e.message); }
  };

  const addMedication = async (med: Medication) => { 
    try {
      const { id, ...data } = med; 
      await addDoc(collection(db, 'medications'), data);
    } catch (e: any) { alert('שגיאה: ' + e.message); }
  };
  
  const updateChecklist = async (newChecklist: ChecklistItem[]) => {
      newChecklist.forEach(async (item) => {
          const exists = checklist.find(i => i.id === item.id);
          if (exists) {
              if (exists.isChecked !== item.isChecked || exists.text !== item.text) await updateDoc(doc(db, 'checklist', item.id), { ...item });
          } else {
              await setDoc(doc(db, 'checklist', item.id), item);
          }
      });
  };

  if (isAuthLoading) {
      return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-blue-600 gap-4"><Loader2 size={48} className="animate-spin" /><p className="text-lg font-bold">טוען נתונים...</p></div>;
  }

  const currentUser = user?.parentType || Parent.DAD;
  const isChild = user?.role === 'CHILD';

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  const renderView = () => {
    switch (currentView) {
      case 'calendar': return <CalendarView events={events} reminders={reminders} swapRequests={swapRequests} currentUser={currentUser} schedule={custodySchedule} holidayAssignments={holidayAssignments} onAddReminder={addReminder} onManualOverride={handleManualOverride} onDeleteEvent={handleDeleteEvent} />;
      case 'expenses': if (isChild) return null; return <ExpenseTracker expenses={expenses} payments={payments} fixedPayments={fixedPayments} expenseSettings={expenseSettings} onAddExpense={addExpense} onSettleExpenses={handleSettleExpenses} currentUser={currentUser} />;
      case 'swaps': if (isChild) return null; return <SwapRequests requests={swapRequests} currentUser={currentUser} onRequestUpdate={updateSwapRequest} onCreateRequest={createSwapRequest} />;
      case 'travel': if (isChild) return null; return <TravelLog trips={trips} onAddTrip={addTrip} currentUser={currentUser} />;
      case 'documents': return <DocumentsHub documents={documents} medications={medications} checklist={checklist} onAddDocument={addDocument} onAddMedication={addMedication} onUpdateChecklist={updateChecklist} currentUser={currentUser} role={user.role} />;
      case 'settings': if (isChild) return null; return <div className="space-y-6 pb-20"><ScheduleSettings currentSchedule={custodySchedule} currentHolidayAssignments={holidayAssignments} currentFixedPayments={fixedPayments} currentExpenseSettings={expenseSettings} onSave={handleSaveSettings} /><div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100"><h2 className="text-lg font-bold mb-4">אזור אישי</h2><div className="bg-slate-50 p-4 rounded-lg mb-4 flex items-center justify-between"><div><p className="font-bold text-slate-800">{user.fullName}</p><p className="text-xs text-slate-500">{user.email}</p></div><button onClick={handleLogout} className="text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-colors flex flex-col items-center"><LogOut size={20} /><span className="text-[10px] font-medium">התנתק</span></button></div></div></div>;
      default: return <CalendarView events={events} currentUser={currentUser} schedule={custodySchedule} holidayAssignments={holidayAssignments} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-0 font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
        <div><h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">הורות בטוב</h1><p className="text-xs text-slate-500">שלום, {user.fullName}</p></div>
        {!isChild ? <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-white ${currentUser === Parent.DAD ? 'bg-sky-400 border-sky-500' : 'bg-rose-400 border-rose-500'}`}>{currentUser === Parent.DAD ? 'א' : 'א'}</div> : <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 flex items-center gap-1 text-xs font-bold bg-slate-50 p-2 rounded-lg"><LogOut size={14} />יציאה</button>}
      </header>
      <main className="max-w-2xl mx-auto p-4 pt-6">{renderView()}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center z-40 sm:hidden pb-safe">
        <NavButton active={currentView === 'calendar'} onClick={() => setCurrentView('calendar')} icon={<Calendar size={24} />} label="יומן" />
        <NavButton active={currentView === 'documents'} onClick={() => setCurrentView('documents')} icon={<FileText size={24} />} label="תיק" />
        {!isChild && <><NavButton active={currentView === 'expenses'} onClick={() => setCurrentView('expenses')} icon={<CreditCard size={24} />} label="הוצאות" /><NavButton active={currentView === 'swaps'} onClick={() => setCurrentView('swaps')} icon={<Repeat size={24} />} label="החלפות" /><NavButton active={currentView === 'travel'} onClick={() => setCurrentView('travel')} icon={<Plane size={24} />} label="חו״ל" /><NavButton active={currentView === 'settings'} onClick={() => setCurrentView('settings')} icon={<Settings size={24} />} label="הגדרות" /></>}
      </nav>
      <div className="hidden sm:flex fixed right-0 top-16 bottom-0 w-64 bg-white border-l border-slate-200 flex-col p-4">
        <div className="space-y-2">
          <NavButtonRow active={currentView === 'calendar'} onClick={() => setCurrentView('calendar')} icon={<Calendar size={20} />} label="יומן משותף" />
          <NavButtonRow active={currentView === 'documents'} onClick={() => setCurrentView('documents')} icon={<FileText size={20} />} label="תיק משפחתי" />
          {!isChild && <><NavButtonRow active={currentView === 'expenses'} onClick={() => setCurrentView('expenses')} icon={<CreditCard size={20} />} label="מעקב הוצאות" /><NavButtonRow active={currentView === 'swaps'} onClick={() => setCurrentView('swaps')} icon={<Repeat size={20} />} label="בקשות החלפה" /><NavButtonRow active={currentView === 'travel'} onClick={() => setCurrentView('travel')} icon={<Plane size={20} />} label="טיסות וחו״ל" /><NavButtonRow active={currentView === 'settings'} onClick={() => setCurrentView('settings')} icon={<Settings size={20} />} label="הגדרות" /></>}
        </div>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (<button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${active ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-50'}`}>{icon}<span className="text-[10px] font-medium">{label}</span></button>);
const NavButtonRow: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (<button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'text-blue-600 bg-blue-50 font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50 font-medium'}`}>{icon}<span className="text-sm">{label}</span></button>);

export default App;