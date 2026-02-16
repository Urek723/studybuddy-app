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

export default function CreateGroupScreen({ navigation }) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [maxMembers, setMaxMembers] = useState('10');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    if (!selectedSubject) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }

    setLoading(true);

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .insert({
          name: groupName.trim(),
          description: description.trim(),
          subject_id: selectedSubject,
          max_members: parseInt(maxMembers) || 10,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Trigger handle_new_group() automatically adds creator as owner with status = 'accepted'.
      // No manual insert needed.

      Alert.alert('Success', 'Study group created!', [
        {
          text: 'OK',
          onPress: () => navigation.replace('GroupDetail', { groupId: groupData.id }),
        },
      ]);
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', error.message || 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <MaterialCommunityIcons name="account-group" size={48} color="#fff" />
        <Text style={styles.headerTitle}>Create Study Group</Text>
        <Text style={styles.headerSubtitle}>Start learning together!</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group Name *</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="text" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Data Structures Study Group"
              value={groupName}
              onChangeText={setGroupName}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell others what this group is about..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Subject *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.subjectChips}>
              {subjects.map(subject => (
                <TouchableOpacity
                  key={subject.id}
                  style={[
                    styles.subjectChip,
                    selectedSubject === subject.id && styles.subjectChipSelected,
                  ]}
                  onPress={() => setSelectedSubject(subject.id)}
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      selectedSubject === subject.id && styles.subjectChipTextSelected,
                    ]}
                  >
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Maximum Members</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="account-multiple" size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="10"
              value={maxMembers}
              onChangeText={setMaxMembers}
              keyboardType="number-pad"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={createGroup}
          disabled={loading}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.createButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialCommunityIcons name="plus-circle" size={24} color="#fff" />
            <Text style={styles.createButtonText}>
              {loading ? 'Creating...' : 'Create Group'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={24} color="#6366f1" />
          <Text style={styles.infoText}>
            You'll be the owner of this group and can manage members and settings.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    padding: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 12 },
  headerSubtitle: { fontSize: 14, color: '#e0e7ff', marginTop: 4 },
  formContainer: { padding: 16 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
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
  textAreaContainer: { alignItems: 'flex-start', minHeight: 120, paddingVertical: 12 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1e293b' },
  textArea: { textAlignVertical: 'top' },
  subjectChips: { flexDirection: 'row', gap: 8 },
  subjectChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  subjectChipSelected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  subjectChipText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  subjectChipTextSelected: { color: '#fff' },
  createButton: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  createButtonDisabled: { opacity: 0.6 },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  infoText: { flex: 1, fontSize: 14, color: '#4338ca', marginLeft: 12, lineHeight: 20 },
});