import React, { useState, useRef } from 'react';
import { Expense, Parent, PaymentMethod, Payment, FixedPayment, ExpenseSettings } from '../types';
import { Plus, Camera, Loader2, CheckCircle2, Wallet, Landmark, Banknote, XCircle, ArrowLeftRight, History, List, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { analyzeReceipt } from '../services/geminiService';
import { calculateLinkedAmount } from '../services/mockCpiService';

interface ExpenseTrackerProps {
  expenses: Expense[];
  payments: Payment[];
  fixedPayments?: FixedPayment[];
  expenseSettings?: ExpenseSettings;
  onAddExpense: (expenses: Expense[]) => void;
  onSettleExpenses: (payment: Payment, disputedExpenses: {id: string, reason: string}[]) => void;
  currentUser: Parent;
}

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ 
  expenses, 
  payments, 
  fixedPayments = [], 
  expenseSettings = { dadShare: 50, momShare: 50 },
  onAddExpense, 
  onSettleExpenses, 
  currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'payments'>('expenses');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  
  // Month Navigation State
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Add Expense State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceMonths, setRecurrenceMonths] = useState(12);
  
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paidBy: currentUser
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settlement State
  const [settleDirection, setSettleDirection] = useState<'I_PAY' | 'THEY_PAY'>('I_PAY');
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [disputeReasons, setDisputeReasons] = useState<{[key: string]: string}>({});
  // New: Allow overriding amount per expense
  const [paymentOverrides, setPaymentOverrides] = useState<{[key: string]: number}>({});

  const [paymentDetails, setPaymentDetails] = useState<{method: PaymentMethod, date: string}>({
    method: 'BIT',
    date: new Date().toISOString().split('T')[0]
  });

  const otherParent = currentUser === Parent.DAD ? Parent.MOM : Parent.DAD;

  // -- Month Logic --
  const handlePrevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  
  const monthName = currentMonthDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' });
  
  // Filter expenses by selected month
  const currentMonthExpenses = expenses.filter(e => {
    const eDate = new Date(e.date);
    return eDate.getMonth() === currentMonthDate.getMonth() && eDate.getFullYear() === currentMonthDate.getFullYear();
  });

  const currentMonthPayments = payments.filter(p => {
    const pDate = new Date(p.date);
    return pDate.getMonth() === currentMonthDate.getMonth() && pDate.getFullYear() === currentMonthDate.getFullYear();
  });

  // -- Add Expense Logic --
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];

      try {
        const result = await analyzeReceipt(base64Data);
        setNewExpense(prev => ({
          ...prev,
          description: result.description || prev.description,
          amount: result.amount || prev.amount,
          date: result.date || prev.date,
          imageUrl: base64String
        }));
      } catch (error) {
        alert("Could not analyze receipt. Please enter details manually.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;

    const expensesToAdd: Expense[] = [];
    const baseDate = new Date(newExpense.date || new Date().toISOString());

    if (isRecurring && recurrenceMonths > 1) {
       for (let i = 0; i < recurrenceMonths; i++) {
           const nextDate = new Date(baseDate);
           nextDate.setMonth(baseDate.getMonth() + i);
           
           expensesToAdd.push({
               id: `${Date.now()}-${i}`,
               description: newExpense.description,
               amount: Number(newExpense.amount),
               date: nextDate.toISOString().split('T')[0],
               paidBy: newExpense.paidBy || currentUser,
               imageUrl: i === 0 ? newExpense.imageUrl : undefined,
               status: 'PENDING',
               isRecurring: true,
               recurrenceInfo: `${i+1}/${recurrenceMonths}`
           });
       }
    } else {
        expensesToAdd.push({
            id: Date.now().toString(),
            description: newExpense.description!,
            amount: Number(newExpense.amount),
            date: newExpense.date || new Date().toISOString().split('T')[0],
            paidBy: newExpense.paidBy || currentUser,
            imageUrl: newExpense.imageUrl,
            status: 'PENDING'
        });
    }

    onAddExpense(expensesToAdd);
    setIsAddModalOpen(false);
    setNewExpense({
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        paidBy: currentUser
    });
    setIsRecurring(false);
    setRecurrenceMonths(12);
  };

  // -- Settlement & Balance Logic with Ratio --
  
  // 1. Calculate Total Shared Expenses Paid by Each
  const pendingExpenses = expenses.filter(e => e.status === 'PENDING');
  
  const paidByDad = pendingExpenses.filter(e => e.paidBy === Parent.DAD).reduce((sum, e) => sum + e.amount, 0);
  const paidByMom = pendingExpenses.filter(e => e.paidBy === Parent.MOM).reduce((sum, e) => sum + e.amount, 0);
  const totalShared = paidByDad + paidByMom;

  // 2. Calculate Expected Shares
  const dadShareRatio = (expenseSettings?.dadShare || 50) / 100;
  // const momShareRatio = (expenseSettings?.momShare || 50) / 100;

  const dadShouldPay = totalShared * dadShareRatio;
  // const momShouldPay = totalShared * momShareRatio;

  // 3. Balance: How much DAD overpaid? (If positive, MOM owes DAD. If negative, DAD owes MOM)
  const balanceDadOverpaid = paidByDad - dadShouldPay;

  // 4. Current User Perspective Balance
  // If currentUser is DAD: balance > 0 means "They owe me", balance < 0 means "I owe them"
  // If currentUser is MOM: balance > 0 means "I owe them" (since dad overpaid), balance < 0 means "They owe me"
  
  let myBalance = 0;
  if (currentUser === Parent.DAD) {
      myBalance = balanceDadOverpaid;
  } else {
      myBalance = -balanceDadOverpaid;
  }

  // Settle Modal Logic
  const settleableExpenses = expenses.filter(e => e.status === 'PENDING' || e.status === 'DISPUTED');

  const openSettleModal = () => {
    // If myBalance < 0, I owe money. I should pay.
    // If myBalance > 0, They owe money. They should pay.
    const direction = myBalance < 0 ? 'I_PAY' : 'THEY_PAY';
    setSettleDirection(direction);
    
    // Who is the "Payer" in this transaction context?
    // If I_PAY, Payer is Me. I am paying for expenses "PaidBy Other".
    // Wait, usually settlement covers the NET diff. 
    // But to mark specific expenses as paid, we usually select expenses paid by the *Receiver* of the money.
    // Example: I owe Mom 500. I pay Mom. I am "covering" expenses Mom paid.
    
    const moneyReceiver = direction === 'I_PAY' ? otherParent : currentUser;
    
    const targetList = settleableExpenses.filter(e => e.paidBy === moneyReceiver);
    const defaultSelectedIds = new Set(targetList.filter(e => e.status === 'PENDING').map(e => e.id));
    setSelectedExpenseIds(defaultSelectedIds);
    setDisputeReasons({});
    setPaymentOverrides({});
    setIsSettleModalOpen(true);
  };

  const handleDirectionChange = (direction: 'I_PAY' | 'THEY_PAY') => {
    setSettleDirection(direction);
    const moneyReceiver = direction === 'I_PAY' ? otherParent : currentUser;
    const targetList = settleableExpenses.filter(e => e.paidBy === moneyReceiver);
    const defaultSelectedIds = new Set(targetList.filter(e => e.status === 'PENDING').map(e => e.id));
    setSelectedExpenseIds(defaultSelectedIds);
    setDisputeReasons({});
    setPaymentOverrides({});
  }

  // Determine which expenses we are "Clearing"
  const moneyReceiver = settleDirection === 'I_PAY' ? otherParent : currentUser;
  const activeExpensesList = settleableExpenses.filter(e => e.paidBy === moneyReceiver);

  const toggleExpenseSelection = (id: string) => {
    const newSelection = new Set(selectedExpenseIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
      const newDisputes = { ...disputeReasons };
      delete newDisputes[id];
      setDisputeReasons(newDisputes);
    }
    setSelectedExpenseIds(newSelection);
  };

  const handleDisputeChange = (id: string, reason: string) => {
    setDisputeReasons(prev => ({ ...prev, [id]: reason }));
  };
  
  const handleAmountOverride = (id: string, value: string) => {
      const num = parseFloat(value);
      if (isNaN(num)) return;
      setPaymentOverrides(prev => ({...prev, [id]: num}));
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const unselectedIds = activeExpensesList.filter(e => !selectedExpenseIds.has(e.id)).map(e => e.id);
    
    // Calculate total actual payment based on overrides or defaults
    let totalTransferAmount = 0;
    // Note: If I am paying, I am paying my share of *Their* expenses.
    // My Share of Expense X = Amount * MyRatio.

    const payerRatio = settleDirection === 'I_PAY' 
        ? (currentUser === Parent.DAD ? expenseSettings.dadShare/100 : expenseSettings.momShare/100) 
        : (otherParent === Parent.DAD ? expenseSettings.dadShare/100 : expenseSettings.momShare/100);

    selectedExpenseIds.forEach(id => {
        const exp = activeExpensesList.find(e => e.id === id);
        if (exp) {
            if (paymentOverrides[id] !== undefined) {
                totalTransferAmount += paymentOverrides[id];
            } else {
                totalTransferAmount += (exp.amount * payerRatio);
            }
        }
    });

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      payer: settleDirection === 'I_PAY' ? currentUser : otherParent,
      amount: totalTransferAmount,
      date: paymentDetails.date,
      method: paymentDetails.method,
      expenseIds: Array.from(selectedExpenseIds),
      overrides: paymentOverrides // Save logic for partials
    };

    const disputes = unselectedIds.map(id => ({
      id,
      reason: disputeReasons[id] || 'Not selected'
    }));

    onSettleExpenses(payment, disputes);
    setIsSettleModalOpen(false);
  };

  const payerRatioForModal = settleDirection === 'I_PAY' 
    ? (currentUser === Parent.DAD ? expenseSettings.dadShare/100 : expenseSettings.momShare/100) 
    : (otherParent === Parent.DAD ? expenseSettings.dadShare/100 : expenseSettings.momShare/100);

  const calculateTotalTransferInModal = () => {
      let total = 0;
      activeExpensesList.filter(e => selectedExpenseIds.has(e.id)).forEach(e => {
          if (paymentOverrides[e.id] !== undefined) {
              total += paymentOverrides[e.id];
          } else {
              total += (e.amount * payerRatioForModal);
          }
      });
      return total;
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
      switch(method) {
          case 'BIT': return 'Bit';
          case 'PAYBOX': return 'Paybox';
          case 'CASH': return 'מזומן';
          case 'TRANSFER': return 'העברה בנקאית';
          default: return 'אחר';
      }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100 shadow-sm sticky top-16 z-20">
         <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500">
             <ChevronRight size={20} />
         </button>
         <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <List size={18} className="text-blue-500" />
             {monthName}
         </h2>
         <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500">
             <ChevronLeft size={20} />
         </button>
      </div>

      {/* Alimony/Fixed Dashboard */}
      {fixedPayments.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
              {fixedPayments.map(fp => {
                  const val = fp.linkToCpi ? calculateLinkedAmount(fp.baseAmount, fp.startDate) : { amount: fp.baseAmount, increasePercent: 0 };
                  const isIncoming = fp.receiver === currentUser;
                  return (
                      <div key={fp.id} className={`snap-start min-w-[250px] p-3 rounded-xl border flex items-center gap-3 shadow-sm
                          ${isIncoming ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}
                      `}>
                          <div className={`p-2 rounded-full ${isIncoming ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                              <Landmark size={18} />
                          </div>
                          <div>
                              <p className="text-[10px] uppercase font-bold tracking-wide opacity-60">{fp.title} ({fp.paymentDay} לחודש)</p>
                              <p className="font-bold text-slate-800">
                                  {isIncoming ? 'מקבל/ת' : 'משלם/ת'} {val.amount.toLocaleString()} ₪
                              </p>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {/* Global Balance Card */}
      <div className="bg-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xs font-medium opacity-75">יתרה מצטברת (לפי חלוקת {expenseSettings.dadShare}/{expenseSettings.momShare})</h2>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-3xl font-bold flex items-center gap-2">
                {Math.abs(Math.round(myBalance)).toLocaleString()} ₪
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${Math.round(myBalance) === 0 ? 'bg-slate-600' : (myBalance > 0 ? 'bg-emerald-500' : 'bg-rose-500')}`}>
                  {Math.round(myBalance) === 0 ? 'מאוזן' : (myBalance > 0 ? 'מגיע לך' : 'חוב שלך')}
                </span>
              </div>
            </div>
            
            <button 
              onClick={openSettleModal}
              className="bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <Wallet size={16} />
              סגירת חוב
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
        <button 
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all
            ${activeTab === 'expenses' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
            <Banknote size={16} />
            הוצאות החודש
        </button>
        <button 
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all
            ${activeTab === 'payments' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
            <History size={16} />
            היסטוריית העברות
        </button>
      </div>

      {activeTab === 'expenses' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Add Button */}
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="w-full py-3 bg-white border-2 border-dashed border-blue-300 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
                <Plus size={20} />
                הוסף הוצאה לחודש זה
            </button>

            {/* Expenses List */}
            <div className="space-y-3">
                {currentMonthExpenses.length === 0 && <p className="text-center text-slate-400 py-8">אין הוצאות בחודש {monthName}</p>}
                {currentMonthExpenses.map(expense => (
                <div key={expense.id} className={`bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-2 relative overflow-hidden transition-all
                    ${expense.status === 'PENDING' ? 'border-slate-100' : ''}
                    ${expense.status === 'PAID' ? 'border-emerald-100 bg-emerald-50/30' : ''}
                    ${expense.status === 'DISPUTED' ? 'border-rose-100 bg-rose-50/30' : ''}
                `}>
                    {/* Status Badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                        {expense.status === 'PAID' && <CheckCircle2 size={16} className="text-emerald-500" />}
                        {expense.status === 'DISPUTED' && <XCircle size={16} className="text-rose-500" />}
                        {expense.isRecurring && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                <Repeat size={10} /> {expense.recurrenceInfo}
                            </span>
                        )}
                    </div>

                    <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0
                            ${expense.paidBy === Parent.DAD ? 'bg-sky-400' : 'bg-rose-400'}
                            `}>
                            {expense.paidBy === Parent.DAD ? 'א' : 'א'}
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">{expense.description}</p>
                                <p className="text-xs text-slate-400">{expense.date}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`font-bold ${expense.status === 'DISPUTED' ? 'text-rose-400 line-through decoration-2' : 'text-slate-700'}`}>
                            {expense.amount} ₪
                            </p>
                            {expense.imageUrl && <span className="text-[10px] text-blue-500 flex items-center justify-end gap-1"><Camera size={10} /> קבלה</span>}
                        </div>
                    </div>
                    
                    {/* Dispute Reason */}
                    {expense.status === 'DISPUTED' && expense.disputeReason && (
                    <div className="bg-rose-50 text-rose-800 text-xs p-2 rounded-lg mt-1 border border-rose-100">
                        <span className="font-bold">סירוב תשלום:</span> {expense.disputeReason}
                    </div>
                    )}
                </div>
                ))}
            </div>
          </div>
      )}

      {activeTab === 'payments' && (
          <div className="space-y-3 animate-in fade-in">
             {currentMonthPayments.length === 0 && <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                 <p>לא בוצעו העברות בחודש {monthName}</p>
                 <button onClick={() => setCurrentMonthDate(new Date())} className="text-sm text-blue-500 mt-2 hover:underline">חזור להיום</button>
             </div>}
             
             {currentMonthPayments.map(payment => (
                 <div key={payment.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                            <ArrowLeftRight size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-700 flex items-center gap-1">
                                {payment.payer === currentUser ? 'העברת ל-' : 'קיבלת מ-'}
                                <span className={`px-1.5 rounded text-xs ${payment.payer === currentUser 
                                    ? (otherParent === Parent.DAD ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800')
                                    : (otherParent === Parent.DAD ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800')
                                }`}>
                                    {payment.payer === currentUser 
                                        ? (otherParent === Parent.DAD ? 'אבא' : 'אמא')
                                        : (otherParent === Parent.DAD ? 'אבא' : 'אמא')
                                    }
                                </span>
                            </p>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                <span>{payment.date}</span>
                                <span>•</span>
                                <span>{getPaymentMethodLabel(payment.method)}</span>
                            </div>
                        </div>
                     </div>
                     <div className="text-right">
                         <span className="block font-bold text-lg text-slate-800">{payment.amount} ₪</span>
                     </div>
                 </div>
             ))}
          </div>
      )}

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800">הוספת הוצאה</h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors group"
              >
                {isAnalyzing ? (
                  <div className="flex flex-col items-center gap-2 text-blue-600">
                    <Loader2 className="animate-spin" />
                    <span className="text-sm">מנתח קבלה...</span>
                  </div>
                ) : newExpense.imageUrl ? (
                   <div className="flex flex-col items-center gap-2 text-green-600">
                    <CheckCircle2 size={32} />
                    <span className="text-sm font-medium">קבלה נסרקה בהצלחה</span>
                    <span className="text-xs text-slate-400">לחץ להחלפה</span>
                   </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-slate-600">
                    <Camera size={32} />
                    <span className="text-sm font-medium">צלם קבלה למילוי אוטומטי</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תיאור</label>
                <input 
                  type="text" 
                  required
                  value={newExpense.description}
                  onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="למשל: חוג ג'ודו"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">סכום</label>
                  <input 
                    type="number" 
                    required
                    value={newExpense.amount || ''}
                    onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תאריך</label>
                  <input 
                    type="date" 
                    required
                    value={newExpense.date}
                    onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              
              {/* Recurring Option */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="checkbox" 
                        id="recurring" 
                        checked={isRecurring} 
                        onChange={e => setIsRecurring(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="recurring" className="text-sm font-bold text-slate-700 flex items-center gap-1">
                          <Repeat size={14} />
                          תשלום חודשי קבוע (הוראת קבע/תשלומים)
                      </label>
                  </div>
                  {isRecurring && (
                      <div className="animate-in slide-in-from-top-2">
                          <label className="block text-xs text-slate-500 mb-1">למשך כמה חודשים?</label>
                          <select 
                            value={recurrenceMonths}
                            onChange={e => setRecurrenceMonths(parseInt(e.target.value))}
                            className="w-full p-2 text-sm border border-slate-200 rounded-lg"
                          >
                              {[2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n} חודשים</option>)}
                          </select>
                          <p className="text-[10px] text-blue-500 mt-1">
                              * ייווצרו {recurrenceMonths} הוצאות עתידיות ב-10 לכל חודש עוקב.
                          </p>
                      </div>
                  )}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                >
                  ביטול
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-all"
                >
                  שמור הוצאה
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Up Modal */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="text-blue-600" />
                סגירת חוב (כללי)
              </h3>
              <button onClick={() => setIsSettleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>

            {/* Direction Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex text-sm font-bold mb-2">
              <button 
                onClick={() => handleDirectionChange('I_PAY')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all
                  ${settleDirection === 'I_PAY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}
                `}
              >
                <ArrowLeftRight size={14} className={settleDirection === 'I_PAY' ? 'rotate-0' : 'opacity-50'} />
                אני מעביר/ה
              </button>
              <button 
                onClick={() => handleDirectionChange('THEY_PAY')}
                 className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all
                  ${settleDirection === 'THEY_PAY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}
                `}
              >
                <ArrowLeftRight size={14} className={settleDirection === 'THEY_PAY' ? 'rotate-180' : 'opacity-50'} />
                הצד השני מעביר/ה
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-6">
              
              {/* Expenses Checklist */}
              <div className="space-y-3 max-h-60 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                {activeExpensesList.length === 0 && (
                  <div className="text-center py-6 text-slate-400">
                     <p>אין הוצאות פתוחות לחיוב בצד זה</p>
                  </div>
                )}
                {activeExpensesList.map(exp => {
                  const isSelected = selectedExpenseIds.has(exp.id);
                  const defaultShare = Math.round(exp.amount * payerRatioForModal);
                  return (
                    <div key={exp.id} className={`border rounded-xl p-3 transition-colors ${isSelected ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50 border-transparent opacity-75'}`}>
                      <div className="flex items-start gap-3">
                        <div className="pt-1">
                           <input 
                             type="checkbox" 
                             checked={isSelected}
                             onChange={() => toggleExpenseSelection(exp.id)}
                             className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                           />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                             <p className="font-bold text-slate-700 text-sm">{exp.description}</p>
                             <p className="font-bold text-slate-700 text-sm">{exp.amount} ₪</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-400">{exp.date}</p>
                            {exp.isRecurring && <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1 rounded">{exp.recurrenceInfo}</span>}
                          </div>
                          
                          {/* If selected, allow override of the share */}
                          {isSelected && (
                              <div className="mt-2 flex items-center gap-2 animate-in slide-in-from-top-1">
                                  <label className="text-xs text-slate-500">סכום לתשלום:</label>
                                  <input 
                                      type="number"
                                      value={paymentOverrides[exp.id] ?? defaultShare}
                                      onChange={(e) => handleAmountOverride(exp.id, e.target.value)}
                                      className="w-20 p-1 text-sm border rounded text-center font-bold text-blue-600"
                                  />
                              </div>
                          )}

                          {!isSelected && (
                            <div className="mt-2 animate-in slide-in-from-top-1">
                              <input 
                                type="text"
                                placeholder={settleDirection === 'I_PAY' ? "למה אינך משלם?" : "למה לא קיבלת?"}
                                value={disputeReasons[exp.id] || ''}
                                onChange={(e) => handleDisputeChange(exp.id, e.target.value)}
                                className="w-full text-xs p-2 border border-rose-200 rounded bg-white focus:border-rose-400 outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-4">
                 <div className="flex justify-between items-center mb-4">
                   <span className="font-bold text-slate-700">סה"כ להעברה:</span>
                   <span className="text-xl font-bold text-blue-600">{Math.round(calculateTotalTransferInModal()).toLocaleString()} ₪</span>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <select 
                        value={paymentDetails.method}
                        onChange={(e) => setPaymentDetails({...paymentDetails, method: e.target.value as PaymentMethod})}
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="BIT">Bit</option>
                        <option value="PAYBOX">Paybox</option>
                        <option value="TRANSFER">העברה בנקאית</option>
                        <option value="CASH">מזומן</option>
                      </select>
                       <input 
                         type="date" 
                         required
                         value={paymentDetails.date}
                         onChange={(e) => setPaymentDetails({...paymentDetails, date: e.target.value})}
                         className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                       />
                 </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-all"
              >
                אשר וסגור התחשבנות
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;