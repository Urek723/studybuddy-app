import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useRefresh } from '../../contexts/RefreshContext';
import {
  acceptMemberRequest,
  declineMemberRequest,
  promoteToAdmin,
  demoteFromAdmin,
  removeMember,
  getPendingRequests,
} from '../../helpers/groupHelpers';

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const { subscribeToTable } = useRefresh();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMemberOptions, setShowMemberOptions] = useState(null);

  useEffect(() => {
    fetchGroupDetails();

    const unsubMembers = subscribeToTable('group_members', `group_id=eq.${groupId}`, () => {
      fetchGroupDetails();
    });

    const unsubSessions = subscribeToTable('study_sessions', `group_id=eq.${groupId}`, () => {
      fetchGroupDetails();
    });

    return () => {
      unsubMembers();
      unsubSessions();
    };
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);

      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .select(`
          *,
          subjects (
            id,
            name
          ),
          profiles!study_groups_created_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('id', groupId)
        .single();

      if (groupError) {
        console.error('Error fetching group:', groupError);
        throw groupError;
      }

      setGroup(groupData);

      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          status,
          profiles (
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'accepted')
        .order('joined_at', { ascending: true });

      if (membersError) {
        console.error('Error fetching members:', membersError);
      } else {
        setMembers(membersData || []);

        const userMembership = membersData?.find(m => m.user_id === user.id);
        setIsAdmin(userMembership?.role === 'admin' || userMembership?.role === 'owner');
        setIsOwner(userMembership?.role === 'owner');

        if (userMembership?.role === 'admin' || userMembership?.role === 'owner') {
          const requests = await getPendingRequests(groupId);
          setPendingRequests(requests);
        } else {
          setPendingRequests([]);
        }
      }

      const now = new Date().toISOString();
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('group_id', groupId)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(3);

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
      } else {
        setUpcomingSessions(sessionsData || []);
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      Alert.alert('Error', 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (memberId) => {
    try {
      await acceptMemberRequest(memberId, groupId);
      Alert.alert('Success', 'Member request accepted');
      fetchGroupDetails();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (memberId) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await declineMemberRequest(memberId, groupId);
              Alert.alert('Success', 'Member request declined');
              fetchGroupDetails();
            } catch (error) {
              Alert.alert('Error', 'Failed to decline request');
            }
          },
        },
      ]
    );
  };

  const handlePromoteToAdmin = async (memberId) => {
    Alert.alert(
      'Promote to Admin',
      'Are you sure you want to promote this member to admin?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            try {
              await promoteToAdmin(memberId, user.id, groupId);
              Alert.alert('Success', 'Member promoted to admin');
              fetchGroupDetails();
              setShowMemberOptions(null);
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to promote member');
            }
          },
        },
      ]
    );
  };

  const handleDemoteFromAdmin = async (memberId) => {
    Alert.alert(
      'Demote from Admin',
      'Are you sure you want to demote this admin to member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demote',
          style: 'destructive',
          onPress: async () => {
            try {
              await demoteFromAdmin(memberId, user.id, groupId);
              Alert.alert('Success', 'Admin demoted to member');
              fetchGroupDetails();
              setShowMemberOptions(null);
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to demote admin');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = async (memberId) => {
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(memberId, user.id, groupId);
              Alert.alert('Success', 'Member removed from group');
              fetchGroupDetails();
              setShowMemberOptions(null);
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const leaveGroup = async () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', user.id);

              if (error) throw error;

              Alert.alert('Success', 'You have left the group', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMemberOptionsModal = () => {
    if (!showMemberOptions) return null;

    const member = showMemberOptions;
    const canPromote = (isAdmin || isOwner) && member.role === 'member';
    const canDemote = isOwner && member.role === 'admin';
    const canRemove = (isAdmin || isOwner) && member.role !== 'owner' && member.user_id !== user.id;

    return (
      <Modal
        visible={!!showMemberOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMemberOptions(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMemberOptions(null)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{member.profiles?.full_name}</Text>
              <TouchableOpacity onPress={() => setShowMemberOptions(null)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {canPromote && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handlePromoteToAdmin(member.id)}
              >
                <MaterialCommunityIcons name="shield-account" size={24} color="#22c55e" />
                <Text style={styles.modalOptionText}>Promote to Admin</Text>
              </TouchableOpacity>
            )}

            {canDemote && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleDemoteFromAdmin(member.id)}
              >
                <MaterialCommunityIcons name="shield-off" size={24} color="#f59e0b" />
                <Text style={styles.modalOptionText}>Demote from Admin</Text>
              </TouchableOpacity>
            )}

            {canRemove && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleRemoveMember(member.id)}
              >
                <MaterialCommunityIcons name="account-remove" size={24} color="#ef4444" />
                <Text style={[styles.modalOptionText, { color: '#ef4444' }]}>Remove Member</Text>
              </TouchableOpacity>
            )}

            {!canPromote && !canDemote && !canRemove && (
              <View style={styles.noOptionsContainer}>
                <Text style={styles.noOptionsText}>No actions available</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading group details...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Group not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.groupIconContainer}>
          {group?.avatar_url ? (
            <Image source={{ uri: group.avatar_url }} style={styles.groupImage} />
          ) : (
            <MaterialCommunityIcons name="account-group" size={40} color="#fff" />
          )}
        </View>
        <Text style={styles.groupName}>{group?.name}</Text>
        <Text style={styles.groupSubject}>{group?.subjects?.name || 'General'}</Text>
        <View style={styles.memberCountBadge}>
          <MaterialCommunityIcons name="account-multiple" size={16} color="#fff" />
          <Text style={styles.memberCountText}>{members.length} members</Text>
        </View>
      </LinearGradient>

      {group?.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{group.description}</Text>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('GroupChat', { groupId, groupName: group?.name })}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#dbeafe' }]}>
              <MaterialCommunityIcons name="message-text" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.actionButtonText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Calendar')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="calendar" size={24} color="#22c55e" />
            </View>
            <Text style={styles.actionButtonText}>Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Quizzes')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="brain" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.actionButtonText}>Quizzes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isAdmin && pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Pending Requests ({pendingRequests.length})
          </Text>
          {pendingRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.memberAvatar}>
                {request.profiles?.avatar_url ? (
                  <Image
                    source={{ uri: request.profiles.avatar_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <MaterialCommunityIcons name="account" size={24} color="#6366f1" />
                )}
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {request.profiles?.full_name || 'Unknown User'}
                </Text>
                <Text style={styles.memberEmail}>
                  {request.profiles?.email || ''}
                </Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptRequest(request.id)}
                >
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => handleDeclineRequest(request.id)}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {upcomingSessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
          {upcomingSessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionIcon}>
                <MaterialCommunityIcons name="calendar-clock" size={24} color="#6366f1" />
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionTime}>{formatDate(session.start_time)}</Text>
                {session.location && (
                  <Text style={styles.sessionLocation}>📍 {session.location}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
        </View>

        {members.length > 0 ? (
          members.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.memberCard}
              onPress={() => {
                if (isAdmin && member.user_id !== user.id) {
                  setShowMemberOptions(member);
                }
              }}
              disabled={!isAdmin || member.user_id === user.id}
            >
              <View style={styles.memberAvatar}>
                {member.profiles?.avatar_url ? (
                  <Image
                    source={{ uri: member.profiles.avatar_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <MaterialCommunityIcons name="account" size={24} color="#6366f1" />
                )}
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.profiles?.full_name || 'Unknown User'}
                  {member.user_id === user.id && ' (You)'}
                </Text>
                <Text style={styles.memberEmail}>
                  {member.profiles?.email || ''}
                </Text>
              </View>
              {(member.role === 'admin' || member.role === 'owner') && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>
                    {member.role === 'owner' ? 'Owner' : 'Admin'}
                  </Text>
                </View>
              )}
              {isAdmin && member.user_id !== user.id && (
                <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noMembersContainer}>
            <MaterialCommunityIcons name="account-off" size={48} color="#cbd5e1" />
            <Text style={styles.noMembersText}>No members yet</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.leaveButton} onPress={leaveGroup}>
          <MaterialCommunityIcons name="exit-to-app" size={20} color="#ef4444" />
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>
      </View>

      {renderMemberOptionsModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '600',
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  groupIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  groupName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupSubject: {
    fontSize: 16,
    color: '#e0e7ff',
    marginBottom: 12,
  },
  memberCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  memberCountText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#22c55e',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#ef4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
    color: '#64748b',
  },
  sessionLocation: {
    fontSize: 14,
    color: '#6366f1',
    marginTop: 4,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  memberEmail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noMembersContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noMembersText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
  },
  leaveButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 200,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 16,
    fontWeight: '500',
  },
  noOptionsContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noOptionsText: {
    fontSize: 16,
    color: '#94a3b8',
  },
});