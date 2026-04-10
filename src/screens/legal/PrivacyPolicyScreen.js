import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: June 2025</Text>

      <Text style={styles.heading}>1. Information We Collect</Text>
      <Text style={styles.body}>
        StudyBuddy collects the following information when you use our app:{'\n\n'}
        • <Text style={styles.bold}>Account information:</Text> email address, full name, and
        password (stored securely via Supabase Auth).{'\n'}
        • <Text style={styles.bold}>Profile information:</Text> school, major, year level, bio,
        subjects, and availability slots that you voluntarily provide.{'\n'}
        • <Text style={styles.bold}>Usage data:</Text> study sessions, quiz results, group
        memberships, and messages sent within group chats.{'\n'}
        • <Text style={styles.bold}>Device data:</Text> push notification token for delivering
        in-app notifications.
      </Text>

      <Text style={styles.heading}>2. How We Use Your Information</Text>
      <Text style={styles.body}>
        We use your information to:{'\n\n'}
        • Provide and improve the StudyBuddy service.{'\n'}
        • Match you with relevant study groups based on subjects and availability.{'\n'}
        • Send notifications about study sessions, group activity, and achievements.{'\n'}
        • Display leaderboards and progress statistics within your groups.
      </Text>

      <Text style={styles.heading}>3. Data Sharing</Text>
      <Text style={styles.body}>
        We do not sell your personal data. Your profile information (name, subjects) is visible
        to members of groups you join. Your email address is never shared with other users.
        We use Supabase (supabase.io) as our backend provider. Please refer to Supabase's
        privacy policy for their data handling practices.
      </Text>

      <Text style={styles.heading}>4. Data Retention</Text>
      <Text style={styles.body}>
        Your data is retained for as long as your account is active. You may request deletion
        of your account and associated data by contacting us at the email below.
      </Text>

      <Text style={styles.heading}>5. Security</Text>
      <Text style={styles.body}>
        We use industry-standard security measures including encrypted storage (Expo SecureStore)
        for authentication tokens and HTTPS for all network communications.
      </Text>

      <Text style={styles.heading}>6. Children's Privacy</Text>
      <Text style={styles.body}>
        StudyBuddy is not directed to children under the age of 13. We do not knowingly collect
        personal information from children under 13.
      </Text>

      <Text style={styles.heading}>7. Changes to This Policy</Text>
      <Text style={styles.body}>
        We may update this Privacy Policy from time to time. We will notify you of significant
        changes via in-app notification or email.
      </Text>

      <Text style={styles.heading}>8. Contact Us</Text>
      <Text style={styles.body}>
        If you have questions about this Privacy Policy, please contact us at:{'\n'}
        support@studybuddy.app
      </Text>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  updated: { fontSize: 13, color: '#94a3b8', marginBottom: 24 },
  heading: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginTop: 20, marginBottom: 8 },
  body: { fontSize: 15, color: '#475569', lineHeight: 24 },
  bold: { fontWeight: '700' },
  footer: { height: 40 },
});