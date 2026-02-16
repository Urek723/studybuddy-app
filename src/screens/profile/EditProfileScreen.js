import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

// ADDED: Days of week for availability editing
const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export default function EditProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [school, setSchool] = useState('');
  const [major, setMajor] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  
  // ADDED: Availability slots state (same as ProfileSetupScreen)
  const [availabilitySlots, setAvailabilitySlots] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchSubjects();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setFullName(profileData.full_name || '');
        setBio(profileData.bio || '');
        setSchool(profileData.school || '');
        setMajor(profileData.major || '');
        setYearLevel(profileData.year_level || '');
        setAvatarUrl(profileData.avatar_url || '');
      }

      // Fetch user's subjects
      const { data: userSubjects } = await supabase
        .from('user_subjects')
        .select('subject_id')
        .eq('user_id', user.id);

      setSelectedSubjects(userSubjects?.map(us => us.subject_id) || []);

      // ADDED: Fetch user's availability slots
      const { data: availabilityData } = await supabase
        .from('user_availability')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week', { ascending: true });

      // Group availability by time slots
      const slotMap = {};
      (availabilityData || []).forEach(slot => {
        const key = `${slot.start_time}-${slot.end_time}`;
        if (!slotMap[key]) {
          slotMap[key] = {
            id: Date.now() + Math.random(), // Generate unique ID
            days: [],
            start_time: slot.start_time,
            end_time: slot.end_time,
          };
        }
        slotMap[key].days.push(slot.day_of_week);
      });

      setAvailabilitySlots(Object.values(slotMap));

    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      setAvailableSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const toggleSubject = (subjectId) => {
    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(selectedSubjects.filter(id => id !== subjectId));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectId]);
    }
  };

  // ADDED: Availability management functions (from ProfileSetupScreen)
  const addAvailabilitySlot = () => {
    setAvailabilitySlots([
      ...availabilitySlots,
      {
        id: Date.now(),
        days: [],
        start_time: '09:00',
        end_time: '17:00',
      },
    ]);
  };

  const updateSlot = (id, field, value) => {
    setAvailabilitySlots(
      availabilitySlots.map(slot =>
        slot.id === id ? { ...slot, [field]: value } : slot
      )
    );
  };

  const toggleDayForSlot = (slotId, dayValue) => {
    setAvailabilitySlots(
      availabilitySlots.map(slot => {
        if (slot.id === slotId) {
          const days = slot.days.includes(dayValue)
            ? slot.days.filter(d => d !== dayValue)
            : [...slot.days, dayValue];
          return { ...slot, days };
        }
        return slot;
      })
    );
  };

  const removeSlot = (id) => {
    setAvailabilitySlots(availabilitySlots.filter(slot => slot.id !== id));
  };

  const saveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          bio: bio.trim(),
          school: school.trim(),
          major: major.trim(),
          year_level: yearLevel.trim(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Delete old subjects
      await supabase
        .from('user_subjects')
        .delete()
        .eq('user_id', user.id);

      // Insert new subjects
      if (selectedSubjects.length > 0) {
        const subjectRecords = selectedSubjects.map(subjectId => ({
          user_id: user.id,
          subject_id: subjectId,
        }));

        const { error: subjectsError } = await supabase
          .from('user_subjects')
          .insert(subjectRecords);

        if (subjectsError) throw subjectsError;
      }

      // ADDED: Update availability - delete old and insert new
      await supabase
        .from('user_availability')
        .delete()
        .eq('user_id', user.id);

      if (availabilitySlots.length > 0) {
        const availabilityInserts = [];
        for (const slot of availabilitySlots) {
          for (const day of slot.days) {
            availabilityInserts.push({
              user_id: user.id,
              day_of_week: day,
              start_time: slot.start_time,
              end_time: slot.end_time,
            });
          }
        }

        if (availabilityInserts.length > 0) {
          const { error: availabilityError } = await supabase
            .from('user_availability')
            .insert(availabilityInserts);

          if (availabilityError) throw availabilityError;
        }
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={48} color="#6366f1" />
            </View>
          )}
          <TouchableOpacity style={styles.changePhotoButton}>
            <MaterialCommunityIcons name="camera" size={20} color="#6366f1" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerText}>Edit Profile</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="account-outline" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Bio */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell others about yourself..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* School */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>School/University</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="school" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., University of the Philippines"
              value={school}
              onChangeText={setSchool}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Major */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Major/Course</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="book-open-variant" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Computer Science"
              value={major}
              onChangeText={setMajor}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Year Level */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Year Level</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="calendar" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., 3rd Year"
              value={yearLevel}
              onChangeText={setYearLevel}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Subjects */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Subjects</Text>
          <Text style={styles.hint}>Select the subjects you're studying</Text>
          <View style={styles.subjectsContainer}>
            {availableSubjects.map((subject) => (
              <TouchableOpacity
                key={subject.id}
                style={[
                  styles.subjectChip,
                  selectedSubjects.includes(subject.id) && styles.subjectChipSelected,
                ]}
                onPress={() => toggleSubject(subject.id)}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    selectedSubjects.includes(subject.id) && styles.subjectChipTextSelected,
                  ]}
                >
                  {subject.name}
                </Text>
                {selectedSubjects.includes(subject.id) && (
                  <MaterialCommunityIcons name="check" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ADDED: Weekly Availability Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weekly Availability</Text>
          <Text style={styles.hint}>When are you available to study?</Text>
          
          {availabilitySlots.map(slot => (
            <View key={slot.id} style={styles.slotCard}>
              <View style={styles.slotHeader}>
                <Text style={styles.slotTitle}>Availability Slot</Text>
                <TouchableOpacity onPress={() => removeSlot(slot.id)}>
                  <MaterialCommunityIcons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <Text style={styles.slotLabel}>Select Days</Text>
              <View style={styles.daysRow}>
                {DAYS_OF_WEEK.map(day => (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.dayButton,
                      slot.days.includes(day.value) && styles.dayButtonSelected,
                    ]}
                    onPress={() => toggleDayForSlot(slot.id, day.value)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        slot.days.includes(day.value) && styles.dayTextSelected,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeGroup}>
                  <Text style={styles.slotLabel}>Start Time</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={slot.start_time}
                    onChangeText={(text) => updateSlot(slot.id, 'start_time', text)}
                    placeholder="09:00"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.timeGroup}>
                  <Text style={styles.slotLabel}>End Time</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={slot.end_time}
                    onChangeText={(text) => updateSlot(slot.id, 'end_time', text)}
                    placeholder="17:00"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addSlotButton} onPress={addAvailabilitySlot}>
            <MaterialCommunityIcons name="plus-circle-outline" size={24} color="#6366f1" />
            <Text style={styles.addSlotText}>Add Time Slot</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={loading}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.saveButtonGradient}
          >
            <MaterialCommunityIcons name="content-save" size={24} color="#fff" />
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    minHeight: 120,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  textArea: {
    textAlignVertical: 'top',
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  subjectChipSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  subjectChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  subjectChipTextSelected: {
    color: '#fff',
  },
  // ADDED: Availability slot styles
  slotCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  slotTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  dayButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#6366f1',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  dayTextSelected: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeGroup: {
    flex: 1,
  },
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
    gap: 8,
  },
  addSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
});