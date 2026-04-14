import 'dotenv/config';

export default {
  expo: {
    name: "StudyBuddy",
    slug: "studybuddy-app",
    scheme: "com.reylaurencekianashleijohnlloyd.studybuddy.v1",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#6366f1"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.reylaurencekianashleijohnlloyd.studybuddy.v1",
      infoPlist: {
        CFBundleURLTypes: [{ CFBundleURLSchemes: ["com.reylaurencekianashleijohnlloyd.studybuddy.v1"] }]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      versionCode: 2,
      package: "com.reylaurencekianashleijohnlloyd.studybuddy.v1",
      useNextNotificationsApi: true,
      permissions: ["NOTIFICATIONS", "RECEIVE_BOOT_COMPLETED"],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [{ scheme: "com.reylaurencekianashleijohnlloyd.studybuddy.v1", host: "auth", pathPrefix: "/callback" }],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    notification: {
      icon: "./assets/notification-icon.png",
      color: "#6366f1"
    },
    web: { favicon: "./assets/favicon.png" },
    plugins: [
      "expo-secure-store",
      "expo-web-browser",
      [
        "@react-native-google-signin/google-signin",
        { iosUrlScheme: "com.googleusercontent.apps.16707548496-cvdvvco9uv4g1f4o7es6sgsebj77svv2" }
      ]
    ],
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      eas: { projectId: "afe34963-1d5d-4d98-b34f-455391db0baf" }
    },
    owner: "reylaurence",
    androidNavigationBar: {
      visible: "sticky-immersive",
      backgroundColor: "#ffffff"
    }
  }
};