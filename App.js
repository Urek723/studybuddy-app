import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RefreshProvider, useRefresh } from './src/contexts/RefreshContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import NotificationBell from './src/components/NotificationBell';
import { supabase } from './src/config/supabase';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ProfileSetupScreen from './src/screens/profile/ProfileSetupScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import GroupsScreen from './src/screens/groups/GroupsScreen';
import GroupDetailScreen from './src/screens/groups/GroupDetailScreen';
import GroupChatScreen from './src/screens/groups/GroupChatScreen';
import CreateGroupScreen from './src/screens/groups/CreateGroupScreen';
import CalendarScreen from './src/screens/calendar/CalendarScreen';
import QuizzesScreen from './src/screens/quizzes/QuizzesScreen';
import QuizDetailScreen from './src/screens/quizzes/QuizDetailScreen';
import TakeQuizScreen from './src/screens/quizzes/TakeQuizScreen';
import CreateQuizScreen from './src/screens/quizzes/CreateQuizScreen';
import ProgressScreen from './src/screens/progress/ProgressScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import EditProfileScreen from './src/screens/profile/EditProfileScreen';
import LogStudyHoursScreen from './src/screens/progress/LogStudyHoursScreen';
import LeaderboardScreen from './src/screens/gamification/LeaderboardScreen';
import NotificationsScreen from './src/screens/notifications/NotificationsScreen';
import PrivacyPolicyScreen from './src/screens/legal/PrivacyPolicyScreen';
import AboutScreen from './src/screens/profile/AboutScreen';
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const theme = {
  colors: {
    primary: '#6366f1',
    secondary: '#22c55e',
    background: '#f8fafc',
    surface: '#ffffff',
    error: '#ef4444',
    text: '#1e293b',
    textSecondary: '#64748b',
  },
};

function TabNavigator() {
  const { triggerRefresh } = useRefresh();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerRight: () => <NotificationBell />,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Groups':
              iconName = focused ? 'account-group' : 'account-group-outline';
              break;
            case 'Calendar':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Quizzes':
              iconName = focused ? 'file-document-edit' : 'file-document-edit-outline';
              break;
            case 'Progress':
              iconName = focused ? 'chart-line' : 'chart-line-variant';
              break;
          }
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 5,
          height: 60,
        },
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      })}
      screenListeners={{ tabPress: () => { triggerRefresh(); } }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Quizzes" component={QuizzesScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          headerShown: true,
          title: 'Privacy Policy',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
}

function SetupStack({ onProfileComplete }) {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileSetup"
        options={{
          title: 'Complete Your Profile',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
          headerLeft: () => null,
        }}
      >
        {(props) => (
          <ProfileSetupScreen {...props} onProfileComplete={onProfileComplete} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{
          title: 'Group Details',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="GroupChat"
        component={GroupChatScreen}
        options={{
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{
          title: 'Create Study Group',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="QuizDetail"
        component={QuizDetailScreen}
        options={{
          title: 'Quiz',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="TakeQuiz"
        component={TakeQuizScreen}
        options={{
          title: 'Take Quiz',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="CreateQuiz"
        component={CreateQuizScreen}
        options={{
          title: 'Create Quiz',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="LogStudyHours"
        component={LogStudyHoursScreen}
        options={{
          title: 'Log Study Hours',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ title: 'Leaderboard' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          title: 'Privacy Policy',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
  name="About"
  component={AboutScreen}
  options={{
    title: 'About',
    headerStyle: { backgroundColor: '#6366f1' },
    headerTintColor: '#fff',
  }}
/>
    </Stack.Navigator>
  );
}

function Navigation() {
  const { user, loading } = useAuth();
  const [profileCompleted, setProfileCompleted] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  const checkProfileCompletion = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_completed')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      setProfileCompleted(data?.profile_completed ?? false);
    } catch (error) {
      console.error('Error checking profile completion:', error);
      setProfileCompleted(false);
    } finally {
      setCheckingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      checkProfileCompletion();
    } else {
      setCheckingProfile(false);
      setProfileCompleted(null);
    }
  }, [user, checkProfileCompletion]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          checkProfileCompletion();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, checkProfileCompletion]);

  if (loading || checkingProfile) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : profileCompleted === false ? (
        <SetupStack onProfileComplete={() => setProfileCompleted(true)} />
      ) : (
        <MainStack />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <NotificationProvider>
          <RefreshProvider>
            <Navigation />
            <StatusBar style="auto" />
          </RefreshProvider>
        </NotificationProvider>
      </AuthProvider>
    </PaperProvider>
  );
}