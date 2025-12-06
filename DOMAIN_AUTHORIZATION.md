# 🔧 Firebase Configuration Guide - Domain Authorization Error Fix

## ❌ Error: "auth/unauthorized-domain"

זה קורה כי Firebase לא מכיר את ה-domain שלך. צריך להוסיף אותו ל-whitelist.

---

## ✅ How to Fix - שלבים בדיוק:

### **1. Firebase Console - Authorized Domains**
```
https://console.firebase.google.com/project/YOUR_PROJECT/authentication/settings
```

1. עבור ל: **Authentication** → **Settings** (הגדרות)
2. לחץ על Tab: **Authorized domains**
3. לחץ: **+ Add domain**
4. הוסף את ה-domains שלך:
   - **Development**: `localhost:5173`
   - **Production**: `your-project.firebaseapp.com`
   - **Custom Domain**: `yourdomain.com` (if applicable)
5. לחץ: **Add**

---

### **2. Google OAuth - Authorized URIs**
```
https://console.cloud.google.com/apis/credentials
```

1. בחר את ה-OAuth 2.0 Client ID שלך (Web application)
2. בחלק **Authorized redirect URIs** הוסף:
   ```
   http://localhost:5173
   http://localhost:5173/__/auth/handler
   https://your-project.firebaseapp.com
   https://your-project.firebaseapp.com/__/auth/handler
   ```
3. שמור (Save)

---

### **3. Facebook - Valid OAuth Redirect URIs**
```
https://developers.facebook.com/apps/YOUR_APP_ID/fb-login/settings/
```

1. עבור ל: **Products** → **Facebook Login** → **Settings**
2. בחלק **Valid OAuth Redirect URIs** הוסף:
   ```
   http://localhost:5173
   https://your-project.firebaseapp.com/__/auth/handler
   ```
3. שמור (Save)

---

### **4. Firebase - Social Provider Setup Checklist**

#### ✅ Google
- [ ] Google App credentials added to Firebase Console
- [ ] OAuth Redirect URIs configured in Google Cloud Console
- [ ] Google enabled in Firebase Authentication → Sign-in method

#### ✅ Facebook
- [ ] Facebook App ID & App Secret added to Firebase Console
- [ ] Valid OAuth Redirect URIs configured in Facebook App
- [ ] Facebook enabled in Firebase Authentication → Sign-in method
- [ ] App Status is **Live** or available for development

---

## 🧪 Test After Configuration

```bash
# 1. Stop your dev server if running
Ctrl+C

# 2. Clear browser cache/cookies
# Open DevTools (F12) → Application → Clear Storage

# 3. Restart dev server
npm run dev

# 4. Test Social Login
# Click "רישום" → "Google" or "Facebook"
```

---

## ⚠️ Common Issues

### "Error (auth/popup-blocked)"
- Browser blocked the popup
- Solution: Click button again, allow popup in browser settings

### "Error (auth/unauthorized-domain)" still appears
- Firebase cache hasn't updated
- Solution:
  1. Wait 5-10 minutes
  2. Clear browser cache (Ctrl+Shift+Delete)
  3. Try again

### Google login works but Facebook doesn't
- Facebook App not in **Live** mode
- Solution: Go to Facebook Developers → App Settings → Change Status to Live

### localhost works but Firebase Hosting doesn't
- Domain not added to authorized list
- Solution: Add `your-project.firebaseapp.com` to Authorized domains

---

## 🚀 Development vs Production

### **Development (localhost:5173)**
```
1. npm run dev
2. http://localhost:5173 opens
3. Firebase Console → Authorized domains → Add "localhost:5173"
4. Google Cloud → OAuth URIs → Add "http://localhost:5173"
5. Facebook → Valid OAuth URIs → Add "http://localhost:5173"
```

### **Production (Firebase Hosting)**
```
1. npm run build
2. firebase deploy
3. App available at: https://YOUR-PROJECT.firebaseapp.com
4. Firebase Console → Authorized domains → Add "YOUR-PROJECT.firebaseapp.com"
5. Google Cloud → OAuth URIs → Add "https://YOUR-PROJECT.firebaseapp.com/__/auth/handler"
6. Facebook → Valid OAuth URIs → Add "https://YOUR-PROJECT.firebaseapp.com/__/auth/handler"
```

---

## 📋 Configuration Verification

Run this in browser console after setting up:

```javascript
// Check if you can access auth
console.log(firebase.auth?.currentUser);

// Test social login
console.log("If popup opens and closes without errors, config is correct");
```

---

## 🔐 Security Notes

- ✅ Never commit `.env` files with sensitive keys
- ✅ Use Environment Variables in production
- ✅ Restrict OAuth URIs to your domain only
- ✅ Keep Facebook App secret... secret!
- ✅ Use reCAPTCHA Enterprise for production

---

## 📞 Getting Your Project Details

### Firebase Project ID
```
Firebase Console → Project Settings → Project ID
```

### Google OAuth Client ID
```
Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID
```

### Facebook App ID & Secret
```
Facebook Developers → Your App → Settings → Basic → App ID & App Secret
```

---

## ✅ Checklist Before Going Live

- [ ] All three auth methods enabled (Email, Google, Facebook)
- [ ] Authorized domains configured
- [ ] OAuth redirect URIs set correctly
- [ ] Email templates customized (optional)
- [ ] reCAPTCHA configured for Phone Auth
- [ ] Firestore Security Rules in place
- [ ] Analytics enabled
- [ ] Tested all auth flows locally
- [ ] Tested all auth flows on Firebase Hosting
- [ ] Password reset email working
- [ ] Phone verification working (if enabled)

---

If you're still getting errors after this, check:
1. Browser console for detailed error message
2. Firebase Console → Authentication → Settings → Sign-in method for error details
3. Your internet connection (firewalls can block OAuth popups)
