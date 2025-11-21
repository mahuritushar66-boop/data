# Firebase Setup Guide

This guide will help you set up Firebase Authentication for the Data Science Hub website.

## Prerequisites

- A Google account
- Node.js and npm installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter a project name
   - (Optional) Enable Google Analytics
   - Click "Create project"

## Step 2: Add a Web App

1. In your Firebase project, click the web icon (`</>`) or "Add app" > "Web"
2. Register your app:
   - Enter an app nickname (e.g., "Data Science Hub")
   - (Optional) Check "Also set up Firebase Hosting"
   - Click "Register app"
3. Copy the Firebase configuration object (you'll need this in Step 4)

## Step 3: Enable Authentication Methods

1. In the Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable the following providers:

### Email/Password
- Click on "Email/Password"
- Toggle "Enable" to ON
- Click "Save"

### Google (Optional but Recommended)
- Click on "Google"
- Toggle "Enable" to ON
- Enter a project support email
- Click "Save"

## Step 4: Configure Environment Variables

1. Create a `.env` file in the root directory of your project
2. Add the following variables with your Firebase config values:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

**Important:** 
- Replace the placeholder values with your actual Firebase config values
- Never commit the `.env` file to version control (it should already be in `.gitignore`)
- The `.env` file should be in the root directory, same level as `package.json`

## Step 5: Create Admin Accounts

1. Go to **Firebase Console → Authentication → Users** and create an admin user (email/password).
2. In **Firestore → users collection**, open that user’s document and add `isAdmin: true`.
3. Admins now log in via `/admin/login` using their Firebase credentials.

## Step 6: Configure Contact Form Email (EmailJS)

1. Create a free [EmailJS](https://www.emailjs.com/) account.
2. Add a new service (e.g., Gmail) and create an email template that sends to `mahuritushar66@gmail.com`.
3. In the EmailJS dashboard copy:
   - **Service ID**
   - **Template ID**
   - **Public Key**
4. Add these values to your `.env` file:

```env
VITE_EMAILJS_SERVICE_ID=your-service-id
VITE_EMAILJS_TEMPLATE_ID=your-template-id
VITE_EMAILJS_PUBLIC_KEY=your-public-key
```

5. Make sure the template expects variables named `from_name`, `from_email`, `subject`, `message`, and `to_email`.

## Step 5: Configure Authorized Domains (for Production)

1. In Firebase Console, go to **Authentication** > **Settings** > **Authorized domains**
2. Add your production domain (e.g., `yourdomain.com`)
3. Localhost is already authorized for development

## Step 6: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/signup` or `/login` in your browser
3. Try creating an account with email/password
4. Try signing in with Google (if enabled)

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure your `.env` file exists and contains all required variables
- Restart your development server after creating/updating `.env`
- Check that variable names start with `VITE_`

### "Firebase: Error (auth/operation-not-allowed)"
- Go to Firebase Console > Authentication > Sign-in method
- Make sure Email/Password and/or Google are enabled

### "Firebase: Error (auth/popup-blocked)"
- Allow popups in your browser settings
- Try using a different browser

### Google Sign-in not working
- Make sure Google provider is enabled in Firebase Console
- Check that your domain is authorized
- Verify your Firebase config values are correct

## Security Best Practices

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use environment-specific configs** - Different configs for dev/staging/prod
3. **Set up Firebase Security Rules** - Protect your Firestore/Storage data
4. **Enable App Check** (optional) - Protect your backend resources from abuse
5. **Monitor Authentication** - Check Firebase Console > Authentication > Users regularly

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Web Setup Guide](https://firebase.google.com/docs/web/setup)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Firebase configuration
3. Check Firebase Console for any service status issues
4. Review the troubleshooting section above

