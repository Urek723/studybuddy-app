# StudyBuddy Implementation Guide

## Quick Start Summary

This guide will help you get StudyBuddy up and running quickly.

### Phase 1: Initial Setup (30 minutes)

1. **Install Dependencies**
```bash
cd studybuddy-app
npm install
```

2. **Create Supabase Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Wait 2 minutes for database setup
   - Copy URL and anon key

3. **Setup Database**
   - Open Supabase SQL Editor
   - Copy entire content of `supabase-schema.sql`
   - Run the SQL
   - Verify tables created under "Table Editor"

4. **Configure App**
   - Open `src/config/supabase.js`
   - Replace `YOUR_SUPABASE_URL` with your URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your key

### Phase 2: Google OAuth (15 minutes)

1. **Google Cloud Console**
   - Go to https://console.cloud.google.com
   - Create new project: "StudyBuddy"
   - Enable "Google+ API"

2. **Create OAuth Credentials**
   - Go to Credentials > Create > OAuth 2.0 Client ID
   - Application type: Web application
   - Name: "StudyBuddy Web"
   - Create and save Client ID

3. **Get Android Client ID**
   - Create another OAuth 2.0 Client ID
   - Application type: Android
   - Package name: `com.studybuddy.app` (from app.json)
   - Get SHA-1 certificate:
   ```bash
   keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey
   ```
   Password: `android`
   - Copy SHA-1 and paste in Google Console
   - Create and save Client ID

4. **Configure Supabase Auth**
   - Supabase Dashboard > Authentication > Providers
   - Enable Google
   - Paste Web Client ID and generate Client Secret
   - Save

5. **Update App**
   - Open `src/contexts/AuthContext.js`
   - Replace all `YOUR_*_CLIENT_ID` with your IDs

### Phase 3: Test Locally (5 minutes)

```bash
npm start
```

- Scan QR with Expo Go app
- Test login with email: test@test.com, password: test123
- Or create new account

### Phase 4: Build for Production

#### Android APK (Testing)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build APK for testing
eas build --platform android --profile preview
```

#### Android AAB (Google Play)

```bash
# Build production AAB
eas build --platform android --profile production

# The AAB will be downloadable from Expo dashboard
```

## File Structure Completion

The app currently has these screens implemented:
- ✅ Login/Register (with Google OAuth)
- ✅ Home Dashboard
- ✅ Groups List

### Remaining Screens to Create

You need to create these additional screens (copy structure from existing screens):

1. **RegisterScreen.js** - Similar to LoginScreen
2. **GroupDetailScreen.js** - Show group info, members, chat button
3. **GroupChatScreen.js** - Use react-native-gifted-chat
4. **CreateGroupScreen.js** - Form to create new group
5. **CalendarScreen.js** - Use react-native-calendars
6. **QuizzesScreen.js** - List of quizzes
7. **QuizDetailScreen.js** - Quiz info
8. **TakeQuizScreen.js** - Quiz interface
9. **CreateQuizScreen.js** - Create quiz form
10. **ProgressScreen.js** - Charts and stats
11. **ProfileScreen.js** - User profile
12. **EditProfileScreen.js** - Edit profile form

## Simplified Screen Templates

### Basic Screen Template

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ScreenName({ navigation, route }) {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    const { data } = await supabase
      .from('table_name')
      .select('*');
    setData(data);
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text>Screen Content</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
```

## Common Issues & Solutions

### Issue: "Module not found"
**Solution:**
```bash
rm -rf node_modules
npm install
npx expo start -c
```

### Issue: Google Sign-In doesn't work
**Solution:**
1. Check SHA-1 certificate matches
2. Verify Client IDs are correct
3. Test on physical device (not emulator for Google)

### Issue: Database errors
**Solution:**
1. Check RLS policies are enabled
2. Verify user is authenticated
3. Check Supabase logs in dashboard

### Issue: Build fails
**Solution:**
```bash
# Clear cache
npm run android -- --clean

# Or for EAS
eas build --platform android --profile production --clear-cache
```

## Testing Checklist

Before deploying:
- [ ] Can create account
- [ ] Can login with Google
- [ ] Can create study group
- [ ] Can join group
- [ ] Can send message in group
- [ ] Can create quiz
- [ ] Can take quiz
- [ ] Can view calendar
- [ ] Can track progress
- [ ] Can edit profile

## Deployment Checklist

- [ ] All screens created
- [ ] All features tested
- [ ] App icon added (1024x1024)
- [ ] Splash screen added
- [ ] Privacy policy created
- [ ] Google Play account created ($25)
- [ ] Production build created
- [ ] Store listing prepared
- [ ] Screenshots taken (min 2)

## Next Steps

1. Complete remaining screens (use templates above)
2. Test all features
3. Create app assets (icon, splash)
4. Build production APK/AAB
5. Create store listing
6. Submit to Google Play

## Resources

- Supabase Docs: https://supabase.com/docs
- Expo Docs: https://docs.expo.dev
- React Native Paper: https://callstack.github.io/react-native-paper/
- React Navigation: https://reactnavigation.org/

## Support

For bugs or questions:
1. Check Expo forums
2. Check Supabase Discord
3. Review React Native documentation

Good luck! 🚀
