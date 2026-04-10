import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Image,
  Switch,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { supabase } from '../../config/supabase';
import { fetchGroupSessions, subscribeSessions } from '../../helpers/sessionHelper';
import {
  fetchSessionParticipants,
  notifyGroupMembersOfSession,
  getSessionReminderStatus,
  toggleSessionReminder,
} from '../../helpers/sessionParticipantsHelper';

function TimePicker({ visible, onClose, onSelect, title }) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ['AM', 'PM'];

  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

  const handleConfirm = () => {
    const hour24 =
      selectedPeriod === 'PM' && selectedHour !== 12
        ? selectedHour + 12
        : selectedHour === 12 && selectedPeriod === 'AM'
        ? 0
        : selectedHour;

    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute
      .toString()
      .padStart(2, '0')}`;
    onSelect(timeString);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.timePickerOverlay}>
        <View style={styles.timePickerModal}>
          <View style={styles.timePickerHeader}>
            <Text style={styles.timePickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.timePickerContent}>
            <View style={styles.timeColumn}>
              <Text style={styles.timeColumnLabel}>Hour</Text>
              <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[styles.timeItem, selectedHour === hour && styles.timeItemSelected]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text style={[styles.timeItemText, selectedHour === hour && styles.timeItemTextSelected]}>
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.timeColumn}>
              <Text style={styles.timeColumnLabel}>Min</Text>
              <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[styles.timeItem, selectedMinute === minute && styles.timeItemSelected]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text style={[styles.timeItemText, selectedMinute === minute && styles.timeItemTextSelected]}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.timeColumn}>
              <Text style={styles.timeColumnLabel}>Period</Text>
              <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                {periods.map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.timeItem, selectedPeriod === period && styles.timeItemSelected]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text style={[styles.timeItemText, selectedPeriod === period && styles.timeItemTextSelected]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity style={styles.timePickerButton} onPress={handleConfirm}>
            <Text style={styles.timePickerButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function CalendarScreen({ navigation }) {
  const { user } = useAuth();
  const { refreshCalendar, subscribeToTable } = useRefresh();
  const [selectedDate, setSelectedDate] = useState('');
  const [sessions, setSessions] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [userGroups, setUserGroups] = useState([]);

  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [sessionTopic, setSessionTopic] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [sessionLocation, setSessionLocation] = useState('');

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [sessionParticipants, setSessionParticipants] = useState([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <MaterialCommunityIcons name="account-circle" size={28} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (!user) return;

    fetchUserGroups();
    loadSessions();

    const unsubSessions = subscribeToTable('study_sessions', null, (payload) => {
      console.log('Session change detected:', payload.eventType);
      loadSessions();
    });

    // FIX #2: guard against subscribeToTable returning non-function
    const unsubParticipants = subscribeToTable('session_participants', null, () => {
      if (selectedSession) {
        loadSessionDetail(selectedSession.id);
      }
    });

    return () => {
      if (typeof unsubSessions === 'function') unsubSessions();
      if (typeof unsubParticipants === 'function') unsubParticipants();
    };
  }, [user]);
  // FIXED: Only fetch groups where user is a member with status 'accepted'
  const fetchUserGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('study_groups(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'accepted'); // FIXED: Only accepted memberships

      if (error) throw error;
      const groups = (data || [])
        .map((gm) => gm.study_groups)
        .filter(g => g !== null); // Filter out any null groups
      setUserGroups(groups);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  const loadSessions = async () => {
    const data = await fetchGroupSessions(user.id);
    setSessions(data);
    markSessionDates(data);
  };

  const markSessionDates = (sessionsData) => {
    const marked = {};
    sessionsData.forEach((session) => {
      const date = session.start_time.split('T')[0];
      marked[date] = { marked: true, dotColor: '#6366f1' };
    });
    setMarkedDates(marked);
  };

  const getSessionsForDate = (date) =>
    sessions.filter((s) => s.start_time.split('T')[0] === date);

  // FIXED: Check for overlapping sessions across ALL user's groups (not just one group)
  const checkUserTimeOverlap = async (startDateTime, endDateTime, excludeSessionId = null) => {
    try {
      // Get all groups the user is a member of
      const { data: userGroupsData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      const groupIds = userGroupsData?.map(g => g.group_id) || [];
      if (groupIds.length === 0) return [];

      // Check for overlapping sessions in ANY of the user's groups
      let query = supabase
        .from('study_sessions')
        .select('id, title, start_time, end_time, study_groups(name)')
        .in('group_id', groupIds)
        .or(`and(start_time.lt.${endDateTime},end_time.gt.${startDateTime})`);

      if (excludeSessionId) {
        query = query.neq('id', excludeSessionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error checking time overlap:', err);
      return [];
    }
  };

  const createSession = async () => {
    if (!sessionTitle.trim() || !selectedGroup || !startTime || !endTime) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsCreating(true);

    try {
      const startDateTime = new Date(`${selectedDate}T${startTime}:00`);
      const endDateTime = new Date(`${selectedDate}T${endTime}:00`);

      if (endDateTime <= startDateTime) {
        Alert.alert('Error', 'End time must be after start time');
        setIsCreating(false);
        return;
      }

      // FIXED: Check for overlap across all user's groups
      const overlappingSessions = await checkUserTimeOverlap(
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );

      if (overlappingSessions.length > 0) {
        const conflictDetails = overlappingSessions
          .map((s) => `${s.title} (${s.study_groups?.name})`)
          .join('\n');
        Alert.alert('Time Conflict', `You already have sessions during this time:\n\n${conflictDetails}`);
        setIsCreating(false);
        return;
      }

      const { data: newSession, error } = await supabase
        .from('study_sessions')
        .insert({
          group_id: selectedGroup,
          title: sessionTitle.trim(),
          description: sessionDescription.trim(),
          topic: sessionTopic.trim() || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: sessionLocation.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await notifyGroupMembersOfSession(newSession, selectedGroup, user.id);

      setShowCreateModal(false);
      resetForm();
      Alert.alert('Success', 'Session created!');

      // Refresh happens automatically via subscription, but we can also manually trigger
      await loadSessions();
      refreshCalendar();
    } catch (err) {
      console.error('Error creating session:', err);
      Alert.alert('Error', 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  const updateSession = async () => {
    if (!sessionTitle.trim() || !selectedGroup || !startTime || !endTime) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsUpdating(true);

    try {
      const sessionDate = selectedSession.start_time.split('T')[0];
      const startDateTime = new Date(`${sessionDate}T${startTime}:00`);
      const endDateTime = new Date(`${sessionDate}T${endTime}:00`);

      if (endDateTime <= startDateTime) {
        Alert.alert('Error', 'End time must be after start time');
        setIsUpdating(false);
        return;
      }

      // FIXED: Check for overlap excluding current session
      const overlappingSessions = await checkUserTimeOverlap(
        startDateTime.toISOString(),
        endDateTime.toISOString(),
        selectedSession.id
      );

      if (overlappingSessions.length > 0) {
        const conflictDetails = overlappingSessions
          .map((s) => `${s.title} (${s.study_groups?.name})`)
          .join('\n');
        Alert.alert('Time Conflict', `You already have sessions during this time:\n\n${conflictDetails}`);
        setIsUpdating(false);
        return;
      }

      const { error } = await supabase
        .from('study_sessions')
        .update({
          title: sessionTitle.trim(),
          description: sessionDescription.trim(),
          topic: sessionTopic.trim() || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: sessionLocation.trim(),
        })
        .eq('id', selectedSession.id);

      if (error) throw error;

      setShowEditModal(false);
      setShowDetailModal(false);
      resetForm();
      Alert.alert('Success', 'Session updated!');
      await loadSessions();
      refreshCalendar();
    } catch (err) {
      console.error('Error updating session:', err);
      Alert.alert('Error', 'Failed to update session');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteSession = async () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { error } = await supabase
                .from('study_sessions')
                .delete()
                .eq('id', selectedSession.id);

              if (error) throw error;

              setShowDetailModal(false);
              setShowEditModal(false);
              resetForm();
              Alert.alert('Success', 'Session deleted!');
              await loadSessions();
              refreshCalendar();
            } catch (err) {
              console.error('Error deleting session:', err);
              Alert.alert('Error', 'Failed to delete session');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const loadSessionDetail = async (sessionId) => {
    setLoadingDetail(true);
    try {
      const participants = await fetchSessionParticipants(sessionId);
      setSessionParticipants(participants);

      const reminder = await getSessionReminderStatus(sessionId, user.id);
      setReminderEnabled(reminder?.enabled ?? false);
    } catch (err) {
      console.error('Error loading session detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openSessionDetail = async (session) => {
    setSelectedSession(session);
    setShowDetailModal(true);
    await loadSessionDetail(session.id);
  };

  const handleToggleReminder = async (value) => {
    setReminderEnabled(value);
    await toggleSessionReminder(selectedSession.id, user.id, value);
  };

  const openEditModal = () => {
    const startDate = new Date(selectedSession.start_time);
    const endDate = new Date(selectedSession.end_time);

    setSessionTitle(selectedSession.title);
    setSessionDescription(selectedSession.description || '');
    setSessionTopic(selectedSession.topic || '');
    setSelectedGroup(selectedSession.group_id);
    setStartTime(
      `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`
    );
    setEndTime(
      `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
    );
    setSessionLocation(selectedSession.location || '');

    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setSessionTitle('');
    setSessionDescription('');
    setSessionTopic('');
    setSelectedGroup(null);
    setStartTime('');
    setEndTime('');
    setSessionLocation('');
    setSelectedSession(null);
    setSessionParticipants([]);
    setReminderEnabled(false);
  };

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const formatDisplayTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const onDayPress = (day) => setSelectedDate(day.dateString);

  const todaySessions = selectedDate ? getSessionsForDate(selectedDate) : [];

  return (
    <View style={styles.container}>
      <ScrollView>
        <Calendar
          markedDates={{
            ...markedDates,
            [selectedDate]: { selected: true, selectedColor: '#6366f1', marked: markedDates[selectedDate]?.marked },
          }}
          onDayPress={onDayPress}
          theme={{
            selectedDayBackgroundColor: '#6366f1',
            todayTextColor: '#6366f1',
            arrowColor: '#6366f1',
            monthTextColor: '#1e293b',
            textMonthFontWeight: 'bold',
            textMonthFontSize: 18,
          }}
        />

        {selectedDate && (
          <View style={styles.sessionsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedDate === new Date().toISOString().split('T')[0]
                  ? 'Today'
                  : formatDate(selectedDate)}
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowCreateModal(true)}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#6366f1" />
              </TouchableOpacity>
            </View>

            {todaySessions.length > 0 ? (
              todaySessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => openSessionDetail(session)}
                >
                  <View style={styles.sessionIcon}>
                    <MaterialCommunityIcons name="calendar-clock" size={24} color="#6366f1" />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionGroup}>{session.study_groups?.name}</Text>
                    <View style={styles.sessionMeta}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#64748b" />
                      <Text style={styles.sessionTime}>
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </Text>
                    </View>
                    {session.location && (
                      <View style={styles.sessionMeta}>
                        <MaterialCommunityIcons name="map-marker" size={14} color="#64748b" />
                        <Text style={styles.sessionLocation}>{session.location}</Text>
                      </View>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color="#cbd5e1" />
                <Text style={styles.emptyStateText}>No sessions scheduled</Text>
                <TouchableOpacity
                  style={styles.createFirstButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.createFirstButtonText}>Create Session</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Session Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowDetailModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Session Details</Text>
              <TouchableOpacity onPress={() => { setShowDetailModal(false); resetForm(); }}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Title</Text>
                <Text style={styles.detailValue}>{selectedSession?.title}</Text>
              </View>

              {selectedSession?.description ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedSession.description}</Text>
                </View>
              ) : null}

              {selectedSession?.topic ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Topic</Text>
                  <View style={styles.topicBadge}>
                    <MaterialCommunityIcons name="tag-outline" size={14} color="#6366f1" />
                    <Text style={styles.topicBadgeText}>{selectedSession.topic}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Group</Text>
                <Text style={styles.detailValue}>{selectedSession?.study_groups?.name}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>
                  {selectedSession && `${formatTime(selectedSession.start_time)} - ${formatTime(selectedSession.end_time)}`}
                </Text>
              </View>

              {selectedSession?.location ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{selectedSession.location}</Text>
                </View>
              ) : null}

              <View style={styles.reminderRow}>
                <View style={styles.reminderLeft}>
                  <MaterialCommunityIcons
                    name={reminderEnabled ? 'bell' : 'bell-outline'}
                    size={20}
                    color={reminderEnabled ? '#6366f1' : '#94a3b8'}
                  />
                  <Text style={styles.reminderLabel}>Reminder</Text>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={handleToggleReminder}
                  trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
                  thumbColor={reminderEnabled ? '#6366f1' : '#94a3b8'}
                />
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>
                  Participants ({sessionParticipants.length})
                </Text>
                {loadingDetail ? (
                  <Text style={styles.loadingText}>Loading...</Text>
                ) : sessionParticipants.length > 0 ? (
                  sessionParticipants.map((p) => (
                    <View key={p.id} style={styles.participantRow}>
                      <View style={styles.participantAvatar}>
                        {p.profiles?.avatar_url ? (
                          <Image source={{ uri: p.profiles.avatar_url }} style={styles.participantAvatarImage} />
                        ) : (
                          <MaterialCommunityIcons name="account" size={18} color="#6366f1" />
                        )}
                      </View>
                      <Text style={styles.participantName}>
                        {p.profiles?.full_name || 'Unknown'}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        p.status === 'accepted' ? styles.statusAccepted : styles.statusPending,
                      ]}>
                        <Text style={styles.statusBadgeText}>{p.status}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noParticipantsText}>No participants recorded yet</Text>
                )}
              </View>

              {selectedSession?.created_by === user.id && (
                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
                    <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={deleteSession}
                    disabled={isDeleting}
                  >
                    <MaterialCommunityIcons name="delete" size={20} color="#fff" />
                    <Text style={styles.deleteButtonText}>
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Session Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setShowCreateModal(false); resetForm(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Study Session</Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.modalInput}
                placeholder="Session Title *"
                value={sessionTitle}
                onChangeText={setSessionTitle}
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Description"
                value={sessionDescription}
                onChangeText={setSessionDescription}
                multiline
                numberOfLines={3}
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Topic (e.g., Chapter 5 Review)"
                value={sessionTopic}
                onChangeText={setSessionTopic}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.modalLabel}>Select Group *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.groupChips}>
                  {userGroups.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={[styles.groupChip, selectedGroup === group.id && styles.groupChipSelected]}
                      onPress={() => setSelectedGroup(group.id)}
                    >
                      <Text style={[styles.groupChipText, selectedGroup === group.id && styles.groupChipTextSelected]}>
                        {group.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.modalLabel}>Time *</Text>
              <View style={styles.timeInputRow}>
                <TouchableOpacity
                  style={styles.timeInputButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#6366f1" />
                  <Text style={styles.timeInputText}>
                    {startTime ? formatDisplayTime(startTime) : 'Start Time'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.timeSeparator}>to</Text>

                <TouchableOpacity
                  style={styles.timeInputButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#6366f1" />
                  <Text style={styles.timeInputText}>
                    {endTime ? formatDisplayTime(endTime) : 'End Time'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Location"
                value={sessionLocation}
                onChangeText={setSessionLocation}
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity
                style={styles.modalButton}
                onPress={createSession}
                disabled={isCreating}
              >
                <Text style={styles.modalButtonText}>
                  {isCreating ? 'Creating...' : 'Create Session'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Session Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setShowEditModal(false); resetForm(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Session</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); resetForm(); }}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.modalInput}
                placeholder="Session Title *"
                value={sessionTitle}
                onChangeText={setSessionTitle}
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Description"
                value={sessionDescription}
                onChangeText={setSessionDescription}
                multiline
                numberOfLines={3}
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Topic (e.g., Chapter 5 Review)"
                value={sessionTopic}
                onChangeText={setSessionTopic}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.modalLabel}>Time *</Text>
              <View style={styles.timeInputRow}>
                <TouchableOpacity
                  style={styles.timeInputButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#6366f1" />
                  <Text style={styles.timeInputText}>
                    {startTime ? formatDisplayTime(startTime) : 'Start Time'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.timeSeparator}>to</Text>

                <TouchableOpacity
                  style={styles.timeInputButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#6366f1" />
                  <Text style={styles.timeInputText}>
                    {endTime ? formatDisplayTime(endTime) : 'End Time'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Location"
                value={sessionLocation}
                onChangeText={setSessionLocation}
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity
                style={styles.modalButton}
                onPress={updateSession}
                disabled={isUpdating}
              >
                <Text style={styles.modalButtonText}>
                  {isUpdating ? 'Updating...' : 'Update Session'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <TimePicker
        visible={showStartTimePicker}
        onClose={() => setShowStartTimePicker(false)}
        onSelect={setStartTime}
        title="Select Start Time"
      />

      <TimePicker
        visible={showEndTimePicker}
        onClose={() => setShowEndTimePicker(false)}
        onSelect={setEndTime}
        title="Select End Time"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerButton: { marginRight: 12 },
  sessionsContainer: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  addButton: { padding: 6, borderRadius: 6, backgroundColor: '#e0e7ff' },
  sessionCard: {
    flexDirection: 'row',
    padding: 12,
    marginVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  sessionIcon: { marginRight: 12 },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  sessionGroup: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  sessionTime: { marginLeft: 4, color: '#64748b', fontSize: 13 },
  sessionLocation: { marginLeft: 4, color: '#64748b', fontSize: 13 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyStateText: { fontSize: 16, color: '#94a3b8', marginTop: 12 },
  createFirstButton: { marginTop: 12, backgroundColor: '#6366f1', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  createFirstButtonText: { color: '#fff', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '90%' },
  detailModal: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  modalInput: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 12, color: '#1e293b', fontSize: 15 },
  modalTextArea: { height: 80, textAlignVertical: 'top' },
  modalLabel: { marginBottom: 8, fontWeight: '600', color: '#1e293b', fontSize: 14 },
  groupChips: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  groupChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0', marginRight: 6 },
  groupChipSelected: { backgroundColor: '#6366f1' },
  groupChipText: { color: '#1e293b', fontSize: 14 },
  groupChipTextSelected: { color: '#fff', fontWeight: '600' },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  timeInputButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, flex: 1 },
  timeInputText: { marginLeft: 8, color: '#1e293b', fontSize: 15 },
  timeSeparator: { marginHorizontal: 10, fontWeight: 'bold', color: '#64748b' },
  modalButton: { backgroundColor: '#6366f1', padding: 14, borderRadius: 12, marginTop: 8, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  detailSection: { marginBottom: 20 },
  detailLabel: { fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
  detailValue: { fontSize: 16, color: '#1e293b', lineHeight: 22 },
  loadingText: { fontSize: 14, color: '#94a3b8' },

  topicBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', gap: 6 },
  topicBadgeText: { fontSize: 14, color: '#6366f1', fontWeight: '500' },

  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 20 },
  reminderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reminderLabel: { fontSize: 15, color: '#1e293b', fontWeight: '500' },

  participantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  participantAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  participantAvatarImage: { width: 32, height: 32, borderRadius: 16 },
  participantName: { flex: 1, fontSize: 14, color: '#1e293b' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusAccepted: { backgroundColor: '#dcfce7' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  noParticipantsText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },

  detailActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editButton: { flex: 1, flexDirection: 'row', backgroundColor: '#6366f1', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  editButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  deleteButton: { flex: 1, flexDirection: 'row', backgroundColor: '#ef4444', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  deleteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  timePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  timePickerModal: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  timePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  timePickerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  timePickerContent: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  timeColumn: { flex: 1, alignItems: 'center' },
  timeColumnLabel: { fontWeight: 'bold', marginBottom: 6, color: '#1e293b' },
  timeScroll: { maxHeight: 150 },
  timeItem: { paddingVertical: 8, width: '100%', alignItems: 'center' },
  timeItemSelected: { backgroundColor: '#6366f1', borderRadius: 6 },
  timeItemText: { color: '#1e293b', fontSize: 15 },
  timeItemTextSelected: { color: '#fff', fontWeight: 'bold' },
  timePickerButton: { backgroundColor: '#6366f1', padding: 14, borderRadius: 12, alignItems: 'center' },
  timePickerButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});