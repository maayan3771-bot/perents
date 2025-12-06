import React, { useState } from 'react';
import { Parent, User } from '../types';
import { ShieldCheck, Baby } from 'lucide-react';
import {
  auth,
  db,
  analytics,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  logEvent,
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
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    parentType: Parent.DAD as Parent,
    secondParentFirstName: '',
    secondParentLastName: '',
  });

  const [verificationSentEmail, setVerificationSentEmail] = useState<string | null>(null);
  const [pendingUserData, setPendingUserData] = useState<User | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);
  const [verifyingPhone, setVerifyingPhone] = useState<string | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'sms' | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [manualVerificationMode, setManualVerificationMode] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');


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

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const secondParentName = `${formData.secondParentFirstName} ${formData.secondParentLastName}`.trim();
      const newUser: User = {
        id: firebaseUser.uid,
        fullName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        parentType: formData.parentType,
        secondParentName,
        secondParentFirstName: formData.secondParentFirstName,
        secondParentLastName: formData.secondParentLastName,
        role: 'PARENT',
      };

      // שלח מייל אימות אבל עדיין לא צור רשומה ב-Firestore
      await sendEmailVerification(firebaseUser);
      // Track signup event in Analytics
      logEvent(analytics, 'user_signup', {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      // שמור את נתוני המשתמש זמנית עד אישור המייל
      setPendingUserData(newUser);
      setVerificationMethod('email');
      setVerifyingEmail(firebaseUser.email || formData.email);
      await signOut(auth);
      setResendCooldown(60); // 60 שניות cooldown
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

      // Track login attempt in Analytics
      logEvent(analytics, 'login_attempted', {
        email: formData.email,
      });

      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (!firebaseUser.emailVerified) {
        // אם המייל לא מאומת - נשלח שוב מייל אימות ונדרוש מהמשתמש לאשר לפני כניסה
        await sendEmailVerification(firebaseUser);
        await signOut(auth);
        setVerificationSentEmail(formData.email);
        setError('נא לאשר את כתובת הדוא"ל. שלחנו קישור לאימות לכתובת שהזנת.');
        return;
      }

      if (docSnap.exists()) {
        // Track successful login
        logEvent(analytics, 'login_success', {
          email: firebaseUser.email,
          uid: firebaseUser.uid,
        });
        onLogin(docSnap.data() as User);
      } else {
        const fallbackFull = firebaseUser.email?.split('@')[0] || 'User';
        const fallbackUser: User = {
          id: firebaseUser.uid,
          fullName: fallbackFull,
          firstName: fallbackFull,
          lastName: '',
          email: firebaseUser.email || '',
          phone: '',
          parentType: Parent.DAD,
          secondParentName: '',
          secondParentFirstName: '',
          secondParentLastName: '',
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
      firstName: 'ילד/ה',
      lastName: '',
      email: '',
      phone: '',
      parentType: Parent.DAD,
      secondParentName: '',
      secondParentFirstName: '',
      secondParentLastName: '',
      role: 'CHILD',
    };
    onLogin(user);
  };

  // בדיקת אימות מייל באמצעות polling
  React.useEffect(() => {
    if (!verifyingEmail || !pendingUserData) return;

    let pollingInterval: NodeJS.Timeout;
    let mounted = true;

    const checkEmailVerified = async () => {
      try {
        // כדי לבדוק אם המייל אומת, צריך להיכנס מחדש עם הדוא"ל/סיסמה ובדוק את emailVerified
        const userCredential = await signInWithEmailAndPassword(
          auth,
          pendingUserData.email,
          formData.password
        );
        if (userCredential.user.emailVerified && mounted) {
          // המייל אומת! עכשיו צור את הרשומה ב-Firestore
          await setDoc(doc(db, 'users', userCredential.user.uid), pendingUserData);
          onLogin(pendingUserData);
          setVerifyingEmail(null);
          setPendingUserData(null);
        } else if (mounted) {
          // עדיין לא אומת, השאר את ה-polling
          await signOut(auth);
        }
      } catch (err: any) {
        // שגיאת כניסה - כנראה שהמשתמש טרם אומת, המשך polling
        console.log('Checking email verification...', err.code);
      }
    };

    pollingInterval = setInterval(checkEmailVerified, 3000); // בדוק כל 3 שניות

    return () => {
      mounted = false;
      clearInterval(pollingInterval);
    };
  }, [verifyingEmail, pendingUserData, formData.password, onLogin]);

  // טיימר ל-cooldown של resend
  React.useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendVerificationEmail = async () => {
    if (resendCooldown > 0) {
      setError(`אנא המתן ${resendCooldown} שניות לפני ניסיון שוב.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const uc = await signInWithEmailAndPassword(auth, pendingUserData!.email, formData.password);
      await sendEmailVerification(uc.user);
      await signOut(auth);
      setResendCooldown(60);
      setError('מייל האימות נשלח שוב!');
    } catch (err: any) {
      setError('לא הצלחנו לשלוח שוב את המייל. בדוק/י את הדוא"ל והסיסמה.');
    } finally {
      setIsLoading(false);
    }
  };

  // שליחת SMS OTP
  const handleSendSmsOtp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const recaptchaElement = document.getElementById('recaptcha-container');
      if (!recaptchaElement) {
        setError('reCAPTCHA container not found');
        return;
      }

      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });

      const phoneNumber = `+${formData.phone.replace(/\D/g, '')}`;
      // Validate phone format (at least 10 digits)
      if (phoneNumber.replace(/\D/g, '').length < 10) {
        setError('אנא הזן מספר טלפון תקין (לפחות 10 ספרות)');
        return;
      }

      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(result);
      setVerifyingPhone(phoneNumber);
      setVerificationMethod('sms');
      setResendCooldown(60);
      setPendingUserData(pendingUserData); // Keep the pending user data
      // Track SMS verification selection in Analytics
      logEvent(analytics, 'verification_method_selected', {
        method: 'sms',
        email: pendingUserData?.email || '',
      });
    } catch (err: any) {
      console.error('SMS Error:', err);
      setError('שגיאה בשליחת SMS: ' + (err.message || 'בדוק את מספר הטלפון'));
    } finally {
      setIsLoading(false);
    }
  };

  // אימות קוד SMS
  const handleVerifySmsCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setError('אנא הזן קוד בן 6 ספרות');
      return;
    }

    if (!confirmationResult) {
      setError('Confirmation result not found');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      // SMS verified! Create user record in Firestore
      if (pendingUserData) {
        await setDoc(doc(db, 'users', result.user.uid), {
          ...pendingUserData,
          id: result.user.uid,
        });
        // Track SMS verification success
        logEvent(analytics, 'email_verified', {
          method: 'sms',
          email: pendingUserData.email,
        });
        onLogin({
          ...pendingUserData,
          id: result.user.uid,
        });
      }
      setVerifyingPhone(null);
      setPendingUserData(null);
    } catch (err: any) {
      console.error('SMS Verification Error:', err);
      setError('קוד SMS שגוי. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend SMS
  const handleResendSmsCode = async () => {
    if (resendCooldown > 0) {
      setError(`אנא המתן ${resendCooldown} שניות לפני ניסיון שוב.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });

      const result = await signInWithPhoneNumber(auth, verifyingPhone || '', verifier);
      setConfirmationResult(result);
      setResendCooldown(60);
      setError('SMS נשלח שוב!');
    } catch (err: any) {
      setError('לא הצלחנו לשלוח SMS שוב: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      setError('אנא הזן כתובת דוא"ל');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, forgotPasswordEmail);
      // Track password reset request
      logEvent(analytics, 'password_reset_requested', {
        email: forgotPasswordEmail,
      });
      setError('מייל לאיפוס הסיסמה נשלח! בדוק את תיבת הדואר שלך.');
      setForgotPasswordEmail('');
      setForgotPasswordMode(false);
    } catch (err: any) {
      console.error('Password Reset Error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('כתובת דוא"ל זו אינה רשומה במערכת.');
      } else {
        setError('שגיאה בשליחת מייל איפוס: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Social Login - Google / Facebook
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setIsLoading(true);
    setError(null);
    try {
      let authProvider;
      if (provider === 'google') {
        authProvider = new GoogleAuthProvider();
      } else {
        authProvider = new FacebookAuthProvider();
      }

      const result = await signInWithPopup(auth, authProvider);
      const firebaseUser = result.user;

      // Check if user exists in Firestore
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // User already exists - just login
        logEvent(analytics, 'social_login_success', {
          provider,
          email: firebaseUser.email,
          uid: firebaseUser.uid,
        });
        onLogin(docSnap.data() as User);
      } else {
        // First time social login - create user and mark as first login
        const newUser: User = {
          id: firebaseUser.uid,
          fullName: firebaseUser.displayName || '',
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          email: firebaseUser.email || '',
          phone: firebaseUser.phoneNumber || '',
          parentType: Parent.DAD,
          secondParentName: '',
          secondParentFirstName: '',
          secondParentLastName: '',
          role: 'PARENT',
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        logEvent(analytics, 'social_signup_success', {
          provider,
          email: firebaseUser.email,
        });
        onLogin(newUser);
      }
    } catch (err: any) {
      console.error('Social Login Error:', err);
      if (err.code !== 'auth/cancelled-popup-request') {
        setError('שגיאה בכניסה דרך ' + provider + ': ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // שימוש ב-Credential Management API כדי לתפוס OTP מייל שמתקבל בטלפון
  React.useEffect(() => {
    if (!verifyingEmail || typeof navigator === 'undefined') return;

    // אם ה-browser תומך בـ Credential Management / WebOTP
    if ('OTPCredential' in window && navigator.credentials) {
      const abortController = new AbortController();
      
      navigator.credentials
        .get({
          otp: { transport: ['sms', 'email'] },
          signal: abortController.signal,
        } as any)
        .then((credential: any) => {
          if (credential && credential.code) {
            // קיבלנו OTP מהמייל או SMS - מלא אוטומטית
            setVerificationCode(credential.code);
            setError(''); // נקה שגיאות קודמות
          }
        })
        .catch((err: any) => {
          // לא בעיה אם ל-user לא יש דרך OTP auto-fill
          console.log('OTP auto-fill not available:', err);
        });

      return () => abortController.abort();
    }
  }, [verifyingEmail]);

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

          {/* מסך בחירת שיטת אימות */}
          {pendingUserData && !verifyingEmail && !verifyingPhone && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                <p className="text-sm font-bold text-green-700 mb-2">✓ חשבון נוצר בהצלחה!</p>
                <p className="text-xs text-green-600 mb-3">
                  בחר את שיטת האימות המועדפת עליך:
                </p>
              </div>

              <button
                onClick={() => {
                  setVerificationMethod('email');
                  setVerifyingEmail(pendingUserData.email);
                }}
                disabled={isLoading}
                className="w-full p-4 border-2 border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <p className="text-sm font-bold text-blue-700">📧 אימות דרך מייל</p>
                <p className="text-xs text-blue-600 mt-1">שלח קישור אימות לכתובת {pendingUserData.email}</p>
              </button>

              <button
                onClick={() => {
                  setVerificationMethod('sms');
                  handleSendSmsOtp();
                }}
                disabled={isLoading}
                className="w-full p-4 border-2 border-purple-200 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                <p className="text-sm font-bold text-purple-700">📱 אימות דרך SMS</p>
                <p className="text-xs text-purple-600 mt-1">שלח קוד OTP למספר {formData.phone}</p>
              </button>

              <button
                onClick={() => {
                  setVerifyingEmail(null);
                  setPendingUserData(null);
                  setVerificationMethod(null);
                  setMode('signup');
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200"
              >
                חזור
              </button>
            </div>
          )}

          {/* מסך אימות מייל - מופיע בזמן polling */}
          {verifyingEmail && pendingUserData && verificationMethod === 'email' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm font-bold text-blue-700 mb-2">✓ חשבון נוצר בהצלחה!</p>
                <p className="text-xs text-blue-600 mb-3">
                  שלחנו מייל לאימות לכתובת <strong>{verifyingEmail}</strong>
                </p>
                <p className="text-xs text-blue-600 mb-3">
                  לחץ על הקישור במייל לאימות הכתובת שלך. ברגע שתלחץ - האפליקציה תכנס אוטומטית!
                </p>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-700 rounded-full animate-spin" />
                  <span className="text-xs text-blue-600">בודק אימות...</span>
                </div>
              </div>

              {/* אפשרות להזנת קוד אימות ידנית אם OTP auto-fill לא עבד */}
              {manualVerificationMode && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      קוד אימות (אם קיבלת קוד במייל)
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.trim())}
                      placeholder="XXXXXX"
                      maxLength={6}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono text-lg"
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    הקוד יתמלא אוטומטית אם הטלפון תומך בקריאת OTP מהמייל
                  </p>
                </div>
              )}

              <button
                onClick={() => setManualVerificationMode(!manualVerificationMode)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200"
              >
                {manualVerificationMode ? 'סגור קוד אימות ידני' : 'הזן קוד ידנית'}
              </button>

              <button
                onClick={handleResendVerificationEmail}
                disabled={resendCooldown > 0 || isLoading}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                  resendCooldown > 0 || isLoading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {resendCooldown > 0
                  ? `שלח שוב בעוד ${resendCooldown}s`
                  : 'שלח שוב מייל אימות'}
              </button>

              <button
                onClick={() => {
                  setVerifyingEmail(null);
                  setVerifyingPhone(null);
                  setPendingUserData(null);
                  setVerificationMethod(null);
                  setResendCooldown(0);
                  setVerificationCode('');
                  setManualVerificationMode(false);
                  setConfirmationResult(null);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200"
              >
                חזור
              </button>
            </div>
          )}

          {/* מסך אימות SMS */}
          {verifyingPhone && verificationMethod === 'sms' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                <p className="text-sm font-bold text-purple-700 mb-2">✓ SMS בדרך!</p>
                <p className="text-xs text-purple-600 mb-3">
                  שלחנו קוד אימות ל-{verifyingPhone}
                </p>
                <p className="text-xs text-purple-600">
                  הקוד יתמלא אוטומטית. אם לא קיבלת קוד, בדוק את מספר הטלפון.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    קוד אימות (6 ספרות)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono text-lg tracking-widest"
                  />
                </div>
              </div>

              <button
                onClick={handleVerifySmsCode}
                disabled={verificationCode.length !== 6 || isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-all flex justify-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'אימות קוד'
                )}
              </button>

              <button
                onClick={handleResendSmsCode}
                disabled={resendCooldown > 0 || isLoading}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                  resendCooldown > 0 || isLoading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {resendCooldown > 0
                  ? `שלח שוב בעוד ${resendCooldown}s`
                  : 'שלח שוב קוד'}
              </button>

              <button
                onClick={() => {
                  setVerifyingPhone(null);
                  setVerificationMethod(null);
                  setResendCooldown(0);
                  setVerificationCode('');
                  setConfirmationResult(null);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200"
              >
                חזור
              </button>
            </div>
          )}

          {verificationSentEmail && !verifyingEmail && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-lg">
              שלחנו מייל לאימות לכתובת {verificationSentEmail}. בדוק/י את תיבת הדואר ולאחר האישור היכנס/י לאפליקציה.
              <div className="mt-2">
                <button
                  onClick={async () => {
                    setIsLoading(true);
                    setError(null);
                    try {
                      const uc = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                      await sendEmailVerification(uc.user);
                      await signOut(auth);
                      setVerificationSentEmail(formData.email);
                      setError('מייל האימות נשלח שוב.');
                    } catch (err:any) {
                      setError('לא הצלחנו לשלוח שוב את המייל. הקפד/י להזין אימייל וסיסמה תקינים בשדות למעלה.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="mt-2 text-xs font-bold underline"
                >
                  שלח שוב מייל אימות
                </button>
              </div>
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
                <button
                  type="button"
                  onClick={() => setForgotPasswordMode(true)}
                  className="w-full text-xs font-bold text-slate-500 hover:text-blue-600 py-2 transition-colors"
                >
                  🔓 שכחתי סיסמה
                </button>
              </form>

              {/* מסך "שכחתי סיסמה" */}
              {forgotPasswordMode && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">איפוס סיסמה</h2>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          כתובת דוא"ל
                        </label>
                        <input
                          type="email"
                          required
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                          placeholder="דוא״ל הרישום שלך"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        נשלח לך מייל עם קישור לאיפוס הסיסמה
                      </p>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl flex justify-center"
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          'שלח קישור איפוס'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordMode(false);
                          setForgotPasswordEmail('');
                          setError(null);
                        }}
                        className="w-full text-xs font-bold text-slate-600 hover:bg-slate-50 py-2 rounded-xl border border-slate-200"
                      >
                        ביטול
                      </button>
                    </form>
                  </div>
                </div>
              )}

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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">שם פרטי</label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">שם משפחה</label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    onChange={handleInputChange}
                  />
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">שם פרטי (הורה שני)</label>
                  <input
                    type="text"
                    name="secondParentFirstName"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    onChange={handleInputChange}
                    placeholder="שם פרטי"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">שם משפחה (הורה שני)</label>
                  <input
                    type="text"
                    name="secondParentLastName"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    onChange={handleInputChange}
                    placeholder="שם משפחה"
                  />
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

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">או הירשם עם</span>
                </div>
              </div>

              {/* Social Signup Buttons - Only in signup mode */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  disabled={isLoading}
                  className="w-full border-2 border-slate-200 bg-white text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  🔵 Google
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('facebook')}
                  disabled={isLoading}
                  className="w-full border-2 border-blue-600 bg-blue-50 text-blue-600 font-bold py-2.5 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  f Facebook
                </button>
              </div>

              <p className="text-xs text-center text-slate-500 mt-3">
                🔐 אתה מאובטח. לא נשמרו פרטים ללא הסכמתך.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
