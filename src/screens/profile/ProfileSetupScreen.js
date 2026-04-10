import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export default function ProfileSetupScreen({ navigation, onProfileComplete }) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [primarySubject, setPrimarySubject] = useState(null);
  const [secondarySubjects, setSecondarySubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchSubjects();
    fetchUserProfile();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data } = await supabase.from('subjects').select('*').order('name');
      setAvailableSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (data?.full_name) setFullName(data.full_name);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const addAvailabilitySlot = () => {
    setAvailabilitySlots([
      ...availabilitySlots,
      { id: Date.now(), days: [], start_time: '09:00', end_time: '17:00' },
    ]);
  };

  const updateSlot = (id, field, value) => {
    setAvailabilitySlots(availabilitySlots.map(slot =>
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const toggleDayForSlot = (slotId, dayValue) => {
    setAvailabilitySlots(availabilitySlots.map(slot => {
      if (slot.id !== slotId) return slot;
      const days = slot.days.includes(dayValue)
        ? slot.days.filter(d => d !== dayValue)
        : [...slot.days, dayValue];
      return { ...slot, days };
    }));
  };

  const removeSlot = (id) => {
    setAvailabilitySlots(availabilitySlots.filter(slot => slot.id !== id));
  };

  const toggleSecondarySubject = (subjectId) => {
    setSecondarySubjects(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const validateStep1 = () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Information', 'Please enter your full name');
      return false;
    }
    if (!primarySubject) {
      Alert.alert('Missing Information', 'Please select a primary subject');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (availabilitySlots.length === 0) {
      Alert.alert('Missing Information', 'Please add at least one availability slot');
      return false;
    }
    for (const slot of availabilitySlots) {
      if (slot.days.length === 0) {
        Alert.alert('Incomplete Slot', 'Please select days for all availability slots');
        return false;
      }
      if (slot.start_time >= slot.end_time) {
        Alert.alert('Invalid Time', 'End time must be after start time');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
  };

  const handleComplete = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const availabilitySlotsFormatted = [];
      for (const slot of availabilitySlots) {
        for (const day of slot.days) {
          availabilitySlotsFormatted.push({
            day_of_week: day,
            start_time: slot.start_time,
            end_time: slot.end_time,
          });
        }
      }

      const { error } = await supabase.rpc('complete_profile_setup', {
        p_user_id: user.id,
        p_full_name: fullName.trim(),
        p_primary_subject_id: primarySubject,
        p_secondary_subject_ids: secondarySubjects,
        p_availability_slots: availabilitySlotsFormatted,
      });

      if (error) throw error;

      // FIX #1: Call onProfileComplete to unblock navigation in App.js
      if (typeof onProfileComplete === 'function') {
        onProfileComplete();
      }
    } catch (error) {
      console.error('Error completing setup:', error);
      Alert.alert('Error', error.message || 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <ScrollView style={styles.container}>
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
          <MaterialCommunityIcons name="account-circle" size={64} color="#fff" />
          <Text style={styles.headerTitle}>Welcome!</Text>
          <Text style={styles.headerSubtitle}>Let's set up your profile</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
          </View>

          <Text style={styles.stepTitle}>Step 1: Basic Info</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Primary Subject *</Text>
            <Text style={styles.hint}>What's your main focus?</Text>
            <View style={styles.subjectsGrid}>
              {availableSubjects.map(subject => (
                <TouchableOpacity
                  key={subject.id}
                  style={[styles.subjectCard, primarySubject === subject.id && styles.subjectCardSelected]}
                  onPress={() => setPrimarySubject(subject.id)}
                >
                  <Text style={[styles.subjectName, primarySubject === subject.id && styles.subjectNameSelected]}>
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Secondary Subjects (Optional)</Text>
            <Text style={styles.hint}>Select other subjects you're interested in</Text>
            <View style={styles.subjectsGrid}>
              {availableSubjects.filter(s => s.id !== primarySubject).map(subject => (
                <TouchableOpacity
                  key={subject.id}
                  style={[styles.subjectChip, secondarySubjects.includes(subject.id) && styles.subjectChipSelected]}
                  onPress={() => toggleSecondarySubject(subject.id)}
                >
                  <Text style={[styles.subjectChipText, secondarySubjects.includes(subject.id) && styles.subjectChipTextSelected]}>
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Next</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <MaterialCommunityIcons name="calendar-clock" size={64} color="#fff" />
        <Text style={styles.headerTitle}>Your Availability</Text>
        <Text style={styles.headerSubtitle}>When are you free to study?</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.stepIndicator}>
          <View style={styles.stepDot} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
        </View>

        <Text style={styles.stepTitle}>Step 2: Weekly Schedule</Text>

        {availabilitySlots.map(slot => (
          <View key={slot.id} style={styles.slotCard}>
            <View style={styles.slotHeader}>
              <Text style={styles.slotTitle}>Availability Slot</Text>
              <TouchableOpacity onPress={() => removeSlot(slot.id)}>
                <MaterialCommunityIcons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Select Days</Text>
            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map(day => (
                <TouchableOpacity
                  key={day.value}
                  style={[styles.dayButton, slot.days.includes(day.value) && styles.dayButtonSelected]}
                  onPress={() => toggleDayForSlot(slot.id, day.value)}
                >
                  <Text style={[styles.dayText, slot.days.includes(day.value) && styles.dayTextSelected]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeGroup}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={slot.start_time}
                  onChangeText={(text) => updateSlot(slot.id, 'start_time', text)}
                  placeholder="09:00"
                />
              </View>
              <View style={styles.timeGroup}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={slot.end_time}
                  onChangeText={(text) => updateSlot(slot.id, 'end_time', text)}
                  placeholder="17:00"
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addSlotButton} onPress={addAvailabilitySlot}>
          <MaterialCommunityIcons name="plus-circle-outline" size={24} color="#6366f1" />
          <Text style={styles.addSlotText}>Add Another Time Slot</Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.completeButton, loading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={loading}
          >
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Complete'}</Text>
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.skipText}>You can always update this later in your profile settings</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 32, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  headerSubtitle: { fontSize: 14, color: '#e0e7ff', marginTop: 4 },
  content: { padding: 20 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#cbd5e1' },
  stepDotActive: { backgroundColor: '#6366f1', width: 16, height: 16, borderRadius: 8 },
  stepLine: { width: 40, height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 8 },
  stepTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 24 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  hint: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    minWidth: '30%',
    alignItems: 'center',
  },
  subjectCardSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  subjectName: { fontSize: 14, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  subjectNameSelected: { color: '#6366f1' },
  subjectChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  subjectChipSelected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  subjectChipText: { fontSize: 14, color: '#64748b' },
  subjectChipTextSelected: { color: '#fff' },
  slotCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  slotTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  daysRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dayButton: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  dayButtonSelected: { backgroundColor: '#6366f1' },
  dayText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  dayTextSelected: { color: '#fff' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeGroup: { flex: 1 },
  timeInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
    gap: 8,
  },
  addSlotText: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  backButton: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  nextButton: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  completeButton: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  skipText: { textAlign: 'center', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
});