
export enum Parent {
  DAD = 'DAD',
  MOM = 'MOM'
}

export type UserRole = 'PARENT' | 'CHILD';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  parentType: Parent;
  role: UserRole;
}

export interface CustodySchedule {
  cycleLength: 7 | 14 | 28;
  pattern: Parent[];
  startDate: string;
  // New setting for priority
  holidayPriority: 'HOLIDAYS_WIN' | 'CYCLE_WINS'; 
}

// Replaced simple AlimonySettings with a more robust FixedPayment system
export interface FixedPayment {
  id: string;
  title: string; // e.g. "Alimony", "Housing"
  baseAmount: number;
  startDate: string; // Date the agreement started (for CPI)
  payer: Parent;
  receiver: Parent;
  paymentDay: number;
  linkToCpi: boolean;
}

export interface ExpenseSettings {
  dadShare: number; // Percentage 0-100
  momShare: number; // Percentage 0-100
}

export interface HolidayDefinition {
  id: string;
  name: string;
  startDate: string;
  duration: number;
}

export type HolidayAssignment = Record<string, Parent>; 

export interface CalendarEvent {
  id: string;
  date: string;
  parent: Parent;
  isHoliday?: boolean;
  holidayName?: string;
  isOverride?: boolean;
}

export interface CalendarReminder {
  id: string;
  date: string;
  time?: string;
  title: string;
  description?: string;
  category: 'SCHOOL' | 'MEDICAL' | 'BUREAUCRACY' | 'OTHER';
  createdBy: Parent;
}

export type ExpenseStatus = 'PENDING' | 'PAID' | 'DISPUTED';
export type PaymentMethod = 'CASH' | 'BIT' | 'PAYBOX' | 'TRANSFER' | 'OTHER';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  paidBy: Parent;
  imageUrl?: string;
  status: ExpenseStatus;
  disputeReason?: string;
  paymentId?: string;
  isRecurring?: boolean;
  recurrenceInfo?: string;
}

export interface Payment {
  id: string;
  payer: Parent;
  amount: number;
  date: string;
  method: PaymentMethod;
  methodDetails?: string;
  expenseIds: string[];
  // Store overrides if the user paid a different amount than the raw sum
  overrides?: Record<string, number>; 
}

export enum SwapStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export type SwapType = 'DAY' | 'RANGE' | 'HOURS';

export interface SwapRequest {
  id: string;
  requestor: Parent;
  type: SwapType;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  exchangeDate?: string; // Optional: Date given in return
  exchangeEndDate?: string; // Optional: End date of return range
  status: SwapStatus;
  note?: string;
}

export interface Trip {
  id: string;
  travelingParent: Parent;
  destination: string;
  startDate: string;
  endDate: string;
  flightOut: string; 
  flightIn: string; 
  flightOutTime: string;
  flightInTime: string;
  hotelName: string;
  hasInsurance: boolean;
}

// --- New Features Interfaces ---

export interface DocumentItem {
  id: string;
  title: string;
  category: 'ID' | 'MEDICAL' | 'EDUCATION' | 'OTHER';
  imageOrFileUrl?: string; // In a real app this is a URL
  uploadedBy: Parent;
  uploadDate: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string; // "5ml" or "1 pill"
  frequency: string; // "Twice a day"
  instructions: string; // "After food"
  childName?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isChecked: boolean;
  category: 'CLOTHING' | 'MEDICAL' | 'SCHOOL' | 'TOYS';
}

export type View = 'calendar' | 'expenses' | 'swaps' | 'travel' | 'settings' | 'documents';
