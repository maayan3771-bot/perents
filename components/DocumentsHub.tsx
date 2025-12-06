import React, { useState } from 'react';
import {
  Parent,
  DocumentItem,
  Medication,
  ChecklistItem,
  UserRole,
} from '../types';
import {
  FileText,
  Pill,
  CheckSquare,
  Plus,
  Upload,
  X,
  Bell,
  Share2,
  Ruler,
  HeartPulse,
} from 'lucide-react';

interface DocumentsHubProps {
  documents: DocumentItem[];
  medications: Medication[];
  checklist: ChecklistItem[];
  onAddDocument: (doc: DocumentItem) => void;
  onAddMedication: (med: Medication) => void;
  onUpdateChecklist: (items: ChecklistItem[]) => void;
  currentUser: Parent;
  role: UserRole;
}

// Simple Mock Data for Kids Info
const INITIAL_KIDS_INFO = [
  { label: 'מידת נעליים', value: '34' },
  { label: 'מידת חולצה', value: '10' },
  { label: 'סוג דם', value: 'O+' },
  { label: 'קופת חולים', value: 'כללית (זהב)' },
  { label: 'רגישויות', value: 'בוטנים, אבק' },
];

const DocumentsHub: React.FC<DocumentsHubProps> = ({
  documents,
  medications,
  checklist,
  onAddDocument,
  onAddMedication,
  onUpdateChecklist,
  currentUser,
  role,
}) => {
  const [activeTab, setActiveTab] = useState<
    'check' | 'docs' | 'meds' | 'info'
  >('check');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [kidsInfo, setKidsInfo] = useState(INITIAL_KIDS_INFO);

  // Forms State
  const [newDoc, setNewDoc] = useState<Partial<DocumentItem>>({
    title: '',
    category: 'OTHER',
  });
  const [newMed, setNewMed] = useState<Partial<Medication>>({
    name: '',
    dosage: '',
    frequency: '',
    instructions: '',
  });
  const [newItemText, setNewItemText] = useState('');

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    onAddDocument({
      id: Date.now().toString(),
      title: newDoc.title!,
      category: newDoc.category as any,
      uploadedBy: currentUser,
      uploadDate: new Date().toISOString().split('T')[0],
    });
    setIsAddModalOpen(false);
  };

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMedication({
      id: Date.now().toString(),
      name: newMed.name!,
      dosage: newMed.dosage!,
      frequency: newMed.frequency!,
      instructions: newMed.instructions!,
    });
    setIsAddModalOpen(false);
  };

  const toggleCheckitem = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, isChecked: !item.isChecked } : item
    );
    onUpdateChecklist(updated);
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: newItemText,
      isChecked: false,
      category: 'SCHOOL',
    };
    onUpdateChecklist([...checklist, newItem]);
    setNewItemText('');
  };

  const handleShareChecklist = () => {
    const items = checklist
      .map((i) => `${i.isChecked ? '✅' : '⬜'} ${i.text}`)
      .join('\n');
    const text = `צ'ק ליסט מעבר:\n${items}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const updateKidInfo = (index: number, val: string) => {
    const newInfo = [...kidsInfo];
    newInfo[index].value = val;
    setKidsInfo(newInfo);
  };

  const isChild = role === 'CHILD';

  return (
    <div className="space-y-6 pb-24">
      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100 overflow-x-auto">
        <button
          onClick={() => setActiveTab('check')}
          className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg flex flex-col items-center justify-center gap-1 transition-all
                    ${
                      activeTab === 'check'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
        >
          <CheckSquare size={16} />
          צ'ק ליסט
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg flex flex-col items-center justify-center gap-1 transition-all
                    ${
                      activeTab === 'info'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
        >
          <Ruler size={16} />
          מידות
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg flex flex-col items-center justify-center gap-1 transition-all
                    ${
                      activeTab === 'docs'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
        >
          <FileText size={16} />
          מסמכים
        </button>
        <button
          onClick={() => setActiveTab('meds')}
          className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg flex flex-col items-center justify-center gap-1 transition-all
                    ${
                      activeTab === 'meds'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
        >
          <Pill size={16} />
          תרופות
        </button>
      </div>

      {/* Content */}
      {activeTab === 'check' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3">
            <div className="bg-white p-2 rounded-full text-indigo-600">
              <Bell size={20} />
            </div>
            <div className="text-sm text-indigo-900">
              <span className="font-bold block">תזכורת למעברים</span>
              הרשימה נשלחת אוטומטית בהודעה יום לפני המעבר.
            </div>
          </div>

          <form onSubmit={handleAddChecklistItem} className="flex gap-2">
            <input
              type="text"
              className="flex-1 p-3 border border-slate-200 rounded-xl"
              placeholder="הוסף פריט לרשימה..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white p-3 rounded-xl"
            >
              <Plus size={20} />
            </button>
          </form>

          <div className="space-y-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleCheckitem(item.id)}
                className={`bg-white p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  item.isChecked
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded border flex items-center justify-center ${
                    item.isChecked
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-300'
                  }`}
                >
                  {item.isChecked && (
                    <CheckSquare size={14} className="text-white" />
                  )}
                </div>
                <span
                  className={`text-slate-800 font-medium ${
                    item.isChecked ? 'line-through text-slate-400' : ''
                  }`}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={handleShareChecklist}
            className="w-full py-3 mt-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            שתף רשימה בוואטסאפ
          </button>
        </div>
      )}

      {activeTab === 'info' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <HeartPulse size={20} className="text-rose-500" />
              פרטים אישיים ומידות
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {kidsInfo.map((info, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm font-medium text-slate-500">
                    {info.label}
                  </span>
                  <input
                    type="text"
                    value={info.value}
                    onChange={(e) => updateKidInfo(idx, e.target.value)}
                    className="text-right font-bold text-slate-800 bg-transparent outline-none focus:bg-slate-50 rounded px-2"
                    readOnly={isChild}
                  />
                </div>
              ))}
            </div>
            {!isChild && (
              <p className="text-[10px] text-slate-400 mt-4 text-center">
                לחץ על הערכים כדי לערוך
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="space-y-4 animate-in fade-in">
          {!isChild && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <Upload size={20} /> הוסף מסמך חדש
            </button>
          )}

          <div className="grid grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center gap-2"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <FileText size={24} />
                </div>
                <span className="text-sm font-bold text-slate-700">
                  {doc.title}
                </span>
                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
                  {doc.category}
                </span>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="col-span-2 text-center text-slate-400 py-4">
                אין מסמכים עדיין
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'meds' && (
        <div className="space-y-4 animate-in fade-in">
          {!isChild && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <Plus size={20} /> הוסף תרופה / מרשם
            </button>
          )}

          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Pill size={16} className="text-rose-500" />
                    {med.name}
                  </h4>
                  <p className="text-sm text-slate-600 mt-1">
                    {med.dosage} • {med.frequency}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 italic">
                    "{med.instructions}"
                  </p>
                </div>
              </div>
            ))}
            {medications.length === 0 && (
              <div className="text-center text-slate-400 py-4">
                אין תרופות רשומות
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">
                {activeTab === 'docs' ? 'הוספת מסמך' : 'הוספת תרופה'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            {activeTab === 'docs' ? (
              <form onSubmit={handleAddDocument} className="space-y-4">
                <input
                  type="text"
                  placeholder="שם המסמך"
                  className="w-full p-2 border rounded-lg"
                  required
                  value={newDoc.title}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, title: e.target.value })
                  }
                />
                <select
                  className="w-full p-2 border rounded-lg"
                  value={newDoc.category}
                  onChange={(e) =>
                    setNewDoc({ ...newDoc, category: e.target.value as any })
                  }
                >
                  <option value="ID">תעודות זהות/דרכון</option>
                  <option value="MEDICAL">רפואי</option>
                  <option value="EDUCATION">חינוך</option>
                  <option value="OTHER">אחר</option>
                </select>
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold"
                >
                  שמור
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddMedication} className="space-y-4">
                <input
                  type="text"
                  placeholder="שם התרופה"
                  className="w-full p-2 border rounded-lg"
                  required
                  value={newMed.name}
                  onChange={(e) =>
                    setNewMed({ ...newMed, name: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="מינון (למשל: 5 מ״ל)"
                  className="w-full p-2 border rounded-lg"
                  required
                  value={newMed.dosage}
                  onChange={(e) =>
                    setNewMed({ ...newMed, dosage: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="תדירות (למשל: פעמיים ביום)"
                  className="w-full p-2 border rounded-lg"
                  required
                  value={newMed.frequency}
                  onChange={(e) =>
                    setNewMed({ ...newMed, frequency: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="הנחיות (למשל: אחרי אוכל)"
                  className="w-full p-2 border rounded-lg"
                  required
                  value={newMed.instructions}
                  onChange={(e) =>
                    setNewMed({ ...newMed, instructions: e.target.value })
                  }
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold"
                >
                  שמור
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsHub;
