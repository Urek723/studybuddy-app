import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ─── DATA ────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: 'account-group',
    color: '#6366f1',
    bg: '#eef2ff',
    title: 'Smart Group Matching',
    desc: 'Automatically connects students with classmates who share the same subjects and available study schedules.',
  },
  {
    icon: 'message-text',
    color: '#3b82f6',
    bg: '#eff6ff',
    title: 'Real-Time Group Chat',
    desc: 'Centralized messaging for sharing notes, discussing topics, and collaborating within study groups.',
  },
  {
    icon: 'calendar-clock',
    color: '#22c55e',
    bg: '#f0fdf4',
    title: 'Shared Calendar',
    desc: 'Plan and manage study sessions with automated reminders and conflict detection to prevent missed meetings.',
  },
  {
    icon: 'brain',
    color: '#f59e0b',
    bg: '#fffbeb',
    title: 'Quiz Maker & Gamification',
    desc: 'Create and share practice quizzes with group-based points, badges, and leaderboards to boost motivation.',
  },
  {
    icon: 'chart-line',
    color: '#ec4899',
    bg: '#fdf2f8',
    title: 'Progress Tracking',
    desc: 'Monitor individual and group study hours, participation levels, and achievements for full accountability.',
  },
];

const TEAM = [
  { initials: 'KG', name: 'Gracilla, Kian Ashlei O.', role: 'Developer' },
  { initials: 'JN', name: 'Nalugon, John Lloyd J.', role: 'Developer' },
  { initials: 'RN', name: 'Nedruda, Rey Laurence C.', role: 'Developer' },
];

const ADVISERS = [
  { name: 'Mr. Reginald S. Prudente, MIT', role: 'CICT Dean & Subject Instructor' },
  { name: 'Mr. Kenmark T. Celis', role: 'Project Adviser' },
  { name: 'Ms. Mary Joy M. Fernandez, MIT, LPT', role: 'Program Head' },
];

// ─── COMPONENT ───────────────────────────────────────────────────
export default function AboutScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── HEADER ── */}
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.logoWrap}>
          <MaterialCommunityIcons name="book-open-variant" size={44} color="#fff" />
        </View>
        <Text style={styles.appName}>StudyBuddy</Text>
        <Text style={styles.tagline}>Learn Together, Achieve More</Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>Version 1.0.1</Text>
        </View>
      </LinearGradient>

      {/* ── ABOUT ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About the App</Text>
        <Text style={styles.body}>
          StudyBuddy is a collaborative mobile learning platform designed to digitize and
          improve the way students form study groups, communicate, and organize academic
          sessions.
        </Text>
        <Text style={styles.body}>
          It addresses the critical problem of difficulties in coordinating schedules,
          maintaining consistent communication, and sustaining motivation among students —
          providing a centralized platform that automates group matching, facilitates
          real-time communication, supports shared scheduling, and incorporates gamified
          quizzes with progress tracking.
        </Text>
      </View>

      {/* ── FEATURES ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Features</Text>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
              <MaterialCommunityIcons name={f.icon} size={22} color={f.color} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── INSTITUTION ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Institution</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="school" size={20} color="#6366f1" />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>School</Text>
              <Text style={styles.infoValue}>
                South East Asian Institute of Technology, Inc. (SEAIT)
              </Text>
            </View>
          </View>
          <View style={styles.dividerLine} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="office-building" size={20} color="#6366f1" />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>
                College of Information and Communication Technology (CICT)
              </Text>
            </View>
          </View>
          <View style={styles.dividerLine} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#6366f1" />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>Tupi, South Cotabato, Soccsksargen</Text>
            </View>
          </View>
          <View style={styles.dividerLine} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="book-open-page-variant" size={20} color="#6366f1" />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>Subject</Text>
              <Text style={styles.infoValue}>IT 412: Capstone Project and Research 2</Text>
            </View>
          </View>
          <View style={styles.dividerLine} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={20} color="#6366f1" />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>Year</Text>
              <Text style={styles.infoValue}>February 2025</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── DEVELOPERS ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developers</Text>
        {TEAM.map((member, i) => (
          <View key={i} style={styles.memberCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{member.initials}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── ADVISERS ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Project Advisers</Text>
        {ADVISERS.map((a, i) => (
          <View key={i} style={styles.adviserRow}>
            <MaterialCommunityIcons name="account-tie" size={20} color="#64748b" />
            <View style={styles.adviserText}>
              <Text style={styles.adviserName}>{a.name}</Text>
              <Text style={styles.adviserRole}>{a.role}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── TECH STACK ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Built With</Text>
        <View style={styles.techGrid}>
          {[
            { icon: 'react', label: 'React Native', color: '#61dafb' },
            { icon: 'lightning-bolt', label: 'Expo', color: '#6366f1' },
            { icon: 'database', label: 'Supabase', color: '#22c55e' },
            { icon: 'cellphone', label: 'Android', color: '#3ddc84' },
          ].map((t, i) => (
            <View key={i} style={styles.techChip}>
              <MaterialCommunityIcons name={t.icon} size={18} color={t.color} />
              <Text style={styles.techLabel}>{t.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── METHODOLOGY ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Development Approach</Text>
        <View style={styles.methodCard}>
          <MaterialCommunityIcons name="refresh" size={24} color="#6366f1" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.methodTitle}>Incremental Agile</Text>
            <Text style={styles.methodDesc}>
              Developed using the Incremental Agile approach, emphasizing continuous
              refinement and user feedback to improve functionality, usability, and
              overall performance across each development cycle.
            </Text>
          </View>
        </View>
      </View>

      {/* ── ACKNOWLEDGEMENT ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acknowledgement</Text>
        <View style={styles.quoteCard}>
          <MaterialCommunityIcons name="format-quote-open" size={28} color="#6366f1" style={{ marginBottom: 8 }} />
          <Text style={styles.quoteText}>
            The researchers extend their profound appreciation to the Divine Providence for
            bestowing the resolve, fortitude, and endurance essential to completing this
            project. Deep gratitude goes to Mr. Reginald S. Prudente, MIT and
            Mr. Kenmark T. Celis for their invaluable guidance and mentorship.
          </Text>
          <Text style={styles.quoteFooter}>— To God be the glory.</Text>
        </View>
      </View>

      {/* ── COPYRIGHT ── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2025 StudyBuddy · SEAIT CICT
        </Text>
        <Text style={styles.footerSub}>
          IT 412: Capstone Project and Research 2
        </Text>
      </View>

    </ScrollView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  header: {
    paddingTop: 40,
    paddingBottom: 36,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#e0e7ff',
    marginBottom: 16,
  },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  versionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },

  // Section
  section: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 14,
  },

  // Body text
  body: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 12,
  },

  // Features
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },

  // Info card
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 14,
  },
  infoTextWrap: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 14,
  },

  // Team members
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: '#64748b',
  },

  // Advisers
  adviserRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  adviserText: { flex: 1 },
  adviserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  adviserRole: {
    fontSize: 12,
    color: '#64748b',
  },

  // Tech stack
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  techChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  techLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },

  // Methodology
  methodCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: 16,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4338ca',
    marginBottom: 6,
  },
  methodDesc: {
    fontSize: 13,
    color: '#4338ca',
    lineHeight: 20,
    opacity: 0.8,
  },

  // Quote / Acknowledgement
  quoteCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  quoteText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 21,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  quoteFooter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  footerSub: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
  },
});