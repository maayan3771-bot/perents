import React, { useState } from 'react';
import { Parent, User } from '../types';
import { ShieldCheck, Baby } from 'lucide-react';
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  doc,
  setDoc,
  getDoc,
} from '../firebase';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    parentType: Parent.DAD as Parent,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const firebaseUser = userCredential.user;

      const newUser: User = {
        id: firebaseUser.uid,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        parentType: formData.parentType,
        role: 'PARENT',
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      onLogin(newUser);
    } catch (err: any) {
      console.error('Signup Error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('המייל הזה כבר רשום במערכת.');
      } else if (err.code === 'auth/weak-password') {
        setError('הסיסמה חלשה מדי (חובה 6 תווים לפחות).');
      } else {
        setError('אירעה שגיאה: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const firebaseUser = userCredential.user;

      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        onLogin(docSnap.data() as User);
      } else {
        const fallbackUser: User = {
          id: firebaseUser.uid,
          fullName: firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          phone: '',
          parentType: Parent.DAD,
          role: 'PARENT',
        };
        onLogin(fallbackUser);
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      setError('שם משתמש או סיסמה שגויים.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChildLogin = () => {
    const user: User = {
      id: 'child-guest',
      fullName: 'ילד/ה',
      email: '',
      phone: '',
      parentType: Parent.DAD,
      role: 'CHILD',
    };
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600 flex flex-col items-center justify-center text-white relative">
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full mb-2">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold">הורות בטוב</h1>
          <p className="text-sm opacity-90">ניהול משמורת משותפת בקלות</p>
        </div>

        <div className="p-8">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              כניסה
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              רישום
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-lg">
              {error}
            </div>
          )}

          {mode === 'login' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    אימייל
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                    onChange={handleInputChange}
                    value={formData.email}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    סיסמה
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                    onChange={handleInputChange}
                    value={formData.password}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md flex justify-center"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'היכנס'
                  )}
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">או</span>
                </div>
              </div>

              <button
                onClick={handleChildLogin}
                className="w-full border-2 border-emerald-100 bg-emerald-50 text-emerald-700 font-bold py-3 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
              >
                <Baby size={20} />
                כניסה לילדים
              </button>
            </div>
          )}

          {mode === 'signup' && (
            <form
              onSubmit={handleSignupSubmit}
              className="space-y-4 animate-in fade-in slide-in-from-bottom-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  שם מלא
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    נייד
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    מייל
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  סיסמה
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  הורה
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, parentType: Parent.DAD })
                    }
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 ${
                      formData.parentType === Parent.DAD
                        ? 'border-sky-400 bg-sky-50 text-sky-700'
                        : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    אבא
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, parentType: Parent.MOM })
                    }
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 ${
                      formData.parentType === Parent.MOM
                        ? 'border-rose-400 bg-rose-50 text-rose-700'
                        : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    אמא
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-2 flex justify-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'הירשם'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
