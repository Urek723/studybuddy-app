# StudyBuddy - Collaborative Learning App

A modern React Native application that helps students form study groups, collaborate, and track their learning progress.

## 🎯 Features

- **Group Matching**: AI-powered matching based on subjects, schedules, and interests
- **Group Chat**: Real-time messaging with file sharing
- **Shared Calendar**: Schedule study sessions with notifications
- **Quiz Maker**: Create and share quizzes with gamification
- **Progress Tracking**: Monitor study hours and participation
- **Google OAuth**: Easy sign-in with Google account

## 🚀 Tech Stack

- **Frontend**: React Native (Expo)
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Storage)
- **Authentication**: Google OAuth + Email/Password
- **UI**: React Native Paper, NativeWind (Tailwind CSS)
- **Navigation**: React Navigation

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo account (sign up at https://expo.dev)
- Supabase account (sign up at https://supabase.com)
- Google Cloud Console account (for OAuth)

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd studybuddy-app
npm install
```

### 2. Set Up Supabase

1. Go to https://supabase.com and create a new project
2. Wait for your database to be ready
3. Go to SQL Editor and run the schema from `supabase-schema.sql`
4. Go to Settings > API to get your credentials:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

### 3. Configure Supabase in Your App

Update `src/config/supabase.js`:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 4. Set Up Google OAuth

1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Create credentials for:
   - **Android**: Get package name from `app.json` and SHA-1 certificate
   - **iOS**: Get bundle identifier from `app.json`
   - **Expo**: Use Expo client ID
   - **Web**: For development

#### Get Android SHA-1:
```bash
# For development
keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey
# Password: android

# For production (after creating keystore)
keytool -keystore path/to/your/keystore.jks -list -v
```

#### Configure OAuth in Supabase:
1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Google provider
3. Add your Google Client ID and Secret
4. Add authorized redirect URIs:
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Your app's custom scheme

### 5. Update Google OAuth Credentials

Update `src/contexts/AuthContext.js`:

```javascript
const [request, response, promptAsync] = Google.useAuthRequest({
  expoClientId: 'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
});
```

### 6. Configure Expo

1. Install EAS CLI: `npm install -g eas-cli`
2. Login to Expo: `eas login`
3. Configure project: `eas build:configure`
4. Update `app.json` with your project details

## 🏃‍♂️ Running the App

### Development

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Using Expo Go App

1. Install Expo Go on your device
2. Scan the QR code from `npm start`
3. App will load on your device

## 📱 Building for Production

### Android APK/AAB

1. Create a build:
```bash
eas build --platform android --profile production
```

2. Download the build from Expo dashboard

3. For Google Play Store:
```bash
# First, create an AAB
eas build --platform android --profile production

# Then submit
eas submit --platform android
```

### iOS

```bash
# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

## 🔐 Environment Variables (Optional)

For better security, you can use environment variables:

Create `.env`:
```
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
GOOGLE_EXPO_CLIENT_ID=your_id
GOOGLE_ANDROID_CLIENT_ID=your_id
GOOGLE_IOS_CLIENT_ID=your_id
GOOGLE_WEB_CLIENT_ID=your_id
```

Install: `npm install react-native-dotenv`

Configure in `babel.config.js`.

## 📊 Database Schema

The app uses the following main tables:

- `profiles` - User profiles
- `subjects` - Available subjects
- `study_groups` - Study groups
- `group_members` - Group membership
- `messages` - Chat messages
- `study_sessions` - Scheduled sessions
- `quizzes` - Quiz definitions
- `quiz_questions` - Quiz questions
- `quiz_attempts` - User quiz attempts
- `study_progress` - Progress tracking
- `achievements` - Gamification badges

## 🎨 Customization

### Colors

Update colors in `tailwind.config.js` and `App.js` theme.

### App Icon and Splash Screen

1. Replace files in `assets/`:
   - `icon.png` (1024x1024)
   - `splash.png` (1284x2778)
   - `adaptive-icon.png` (1024x1024)

2. Regenerate: `npx expo prebuild`

## 🐛 Troubleshooting

### "Unable to resolve module"
```bash
npm install
rm -rf node_modules
npm install
npx expo start -c
```

### Android build fails
- Check Java version (needs JDK 11)
- Verify Android SDK is installed
- Check gradle configuration

### Google Sign-In not working
- Verify SHA-1 certificate matches
- Check redirect URIs in Google Console
- Ensure Google provider is enabled in Supabase

### Database errors
- Check RLS policies are correctly set
- Verify Supabase project is active
- Check API keys are correct

## 📱 Publishing to Google Play

### Prerequisites
1. Google Play Developer account ($25 one-time fee)
2. App built with `eas build`
3. Signed AAB file

### Steps
1. Go to https://play.google.com/console
2. Create a new application
3. Fill in store listing details
4. Upload AAB file
5. Complete content rating questionnaire
6. Set pricing and distribution
7. Submit for review

### Store Listing Requirements
- App icon (512x512 PNG)
- Feature graphic (1024x500 PNG)
- Screenshots (minimum 2, up to 8)
- Short description (80 chars max)
- Full description (4000 chars max)
- Privacy policy URL

## 🔒 Security Best Practices

1. Never commit API keys to git
2. Use environment variables for sensitive data
3. Enable RLS on all Supabase tables
4. Regularly update dependencies
5. Use HTTPS only
6. Implement rate limiting
7. Validate all user inputs
8. Use secure storage for tokens

## 📈 Analytics (Optional)

Add Google Analytics or Firebase:

```bash
npx expo install expo-firebase-analytics
```

## 🤝 Contributing

This is a capstone project. For educational purposes only.

## 📄 License

MIT License - Free to use for educational purposes.

## 🆘 Support

For issues related to:
- **Expo**: https://docs.expo.dev
- **Supabase**: https://supabase.com/docs
- **React Native**: https://reactnative.dev/docs

## 🎓 Project Structure

```
studybuddy-app/
├── App.js                 # Main app component
├── app.json              # Expo configuration
├── package.json          # Dependencies
├── supabase-schema.sql   # Database schema
├── assets/               # Images and fonts
└── src/
    ├── config/
    │   └── supabase.js   # Supabase client
    ├── contexts/
    │   └── AuthContext.js # Authentication context
    ├── screens/
    │   ├── auth/         # Login, Register
    │   ├── home/         # Dashboard
    │   ├── groups/       # Group management
    │   ├── calendar/     # Scheduling
    │   ├── quizzes/      # Quiz features
    │   ├── progress/     # Analytics
    │   └── profile/      # User profile
    ├── components/       # Reusable components
    └── utils/           # Helper functions
```

## 🎯 Next Steps

1. Test all features thoroughly
2. Add more subjects to database
3. Implement push notifications
4. Add file upload for group chat
5. Enhance matching algorithm
6. Add more gamification elements
7. Implement leaderboards
8. Add study streak tracking

## ✅ Pre-Deployment Checklist

- [ ] All API keys configured
- [ ] Database schema deployed
- [ ] Google OAuth working
- [ ] App icon and splash screen ready
- [ ] Privacy policy created
- [ ] Terms of service written
- [ ] All features tested
- [ ] Production build created
- [ ] Store listing prepared
- [ ] Beta testing completed

Good luck with your capstone project! 🎓
