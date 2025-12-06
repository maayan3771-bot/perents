# Firebase Configuration Notes

## Recent Updates & Required Settings

### 1. **Email Verification**
- ✅ Enabled: `sendEmailVerification()` after signup
- Users must verify email before accessing the app
- Polling every 3 seconds checks `emailVerified` status
- Automatic login on verification

### 2. **Phone Authentication (SMS)**
- ✅ Enabled: `signInWithPhoneNumber()` with reCAPTCHA
- Requires reCAPTCHA setup in Firebase Console
- Supports auto-fill OTP via WebOTP API on mobile
- Cooldown timer: 60 seconds between SMS resends

**Required Actions in Firebase Console:**
```
1. Go to: Authentication → Sign-in method → Phone
2. Enable Phone authentication
3. Set up reCAPTCHA enterprise (or use default)
4. Add your domain to reCAPTCHA allowed domains
5. For testing: Add test phone numbers in Phone auth settings
```

### 3. **Password Reset**
- ✅ Enabled: `sendPasswordResetEmail()` in login screen
- Users click "שכחתי סיסמה" (Forgot Password)
- Email sent with reset link
- Uses Firebase default email template (can be customized)

**Customization:**
```
Firebase Console → Authentication → Templates → 
Password reset email → Customize
```

### 4. **Analytics**
- ✅ Integrated: Firebase Analytics via `logEvent()`
- Tracked Events:
  - `user_signup`: firstName, lastName, email
  - `verification_method_selected`: email or sms
  - `email_verified`: method, email
  - `login_attempted`: email
  - `login_success`: email, uid
  - `password_reset_requested`: email

**View in Firebase Console:**
```
Analytics → Events → Real-time (or Debugger mode)
```

### 5. **Firestore Data Structure**
- User record includes:
  - `firstName`, `lastName` (new)
  - `secondParentFirstName`, `secondParentLastName` (new)
  - `phone` (stored but not used for authentication)
  - `email`, `emailVerified` (managed by Firebase Auth)
  - `parentType`, `role`, etc.

### 6. **Security Rules - Recommended Updates**

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow create: if request.auth.uid == userId && 
                       request.auth.token.email_verified;
      allow update: if request.auth.uid == userId;
      allow delete: if false;
    }
    
    // Other collections (expenses, payments, etc.)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 7. **Environment Setup Checklist**

- [ ] Email verification enabled in Firebase Auth
- [ ] Phone authentication enabled
- [ ] reCAPTCHA configured
- [ ] Password reset email template customized (optional)
- [ ] Firestore Security Rules updated
- [ ] Analytics enabled and events tracked
- [ ] Test phone numbers added (for testing SMS)
- [ ] Test accounts created for testing all flows

### 8. **Testing Phone Auth Locally**

reCAPTCHA requires HTTPS or localhost in production.

For local testing:
```
npm run dev  # Should work on localhost:5173
```

To bypass reCAPTCHA in testing:
- Use Firebase emulator (not configured yet)
- Or use test phone numbers in Firebase Console

### 9. **Next Steps (Optional)**

- [ ] Add SMS via Twilio (instead of Firebase Phone Auth)
- [ ] Implement two-factor authentication (2FA)
- [ ] Add social login (Google, Facebook)
- [ ] Create analytics dashboard
- [ ] Add user profile completion after signup
- [ ] Implement email verification reminders

### 10. **Troubleshooting**

**SMS not sending:**
- Check phone format: must include country code (+1, +972, etc.)
- Verify Firebase Phone Auth is enabled
- Check reCAPTCHA is configured
- Review Firebase logs in Console

**Email verification not working:**
- Check email templates in Firebase Console
- Ensure domain is configured in Email settings
- Verify firebaseConfig has correct authDomain

**Analytics not showing:**
- Wait 24-48 hours for first data
- Enable Analytics in Firebase Console
- Check "Real-time" view for immediate events
