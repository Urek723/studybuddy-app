import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  Alert,  
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useRefresh } from '../../contexts/RefreshContext';

export default function GroupsScreen({ navigation }) {
  const { user } = useAuth();
  const { subscribeToTable } = useRefresh();

  const [myGroups, setMyGroups] = useState([]);
  const [rankedGroups, setRankedGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('my');

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
    fetchGroups();
    
    const unsubGroups = subscribeToTable('study_groups', null, () => {
      fetchGroups();
    });

    const unsubMembers = subscribeToTable('group_members', null, () => {
      fetchGroups();
    });

    return () => {
      unsubGroups();
      unsubMembers();
    };
  }, [user]);

  const fetchGroups = async () => {
    try {
      const { data: myGroupsData, error: myGroupsError } = await supabase
        .from('group_members')
        .select(`
          id, role, status,
          study_groups (
            id, name, description, avatar_url, max_members, created_at, subject_id,
            subjects (id, name)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (myGroupsError) console.error('Error fetching my groups:', myGroupsError);

      const formattedMyGroups = (myGroupsData || [])
        .map(item => item.study_groups)
        .filter(Boolean);

      const groupsWithCounts = await Promise.all(
        formattedMyGroups.map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .eq('status', 'accepted');
          return { ...group, member_count: count || 0 };
        })
      );
      setMyGroups(groupsWithCounts);

      // FIX #7: handle RPC failure gracefully with empty fallback
      const { data: rankedData, error: rankedError } = await supabase
        .rpc('get_ranked_groups_for_user', { p_user_id: user.id });

      if (rankedError) {
        console.error('Error fetching ranked groups:', rankedError);
        setRankedGroups([]);
        return;
      }

      const { data: userMemberships } = await supabase
        .from('group_members')
        .select('group_id, status')
        .eq('user_id', user.id);

      const membershipMap = {};
      (userMemberships || []).forEach(m => { membershipMap[m.group_id] = m.status; });

      const formattedRanked = (rankedData || []).map(group => ({
        id: group.group_id,
        name: group.group_name,
        description: group.group_description,
        subject_id: group.subject_id,
        subjects: { name: group.subject_name },
        member_count: group.member_count,
        max_members: group.max_members,
        created_at: group.created_at,
        relevance_score: group.relevance_score,
        same_subject: group.same_subject,
        availability_overlap_hours: group.availability_overlap_hours,
        is_full: group.is_full,
        status: membershipMap[group.group_id] || null,
      }));
      setRankedGroups(formattedRanked);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  };

  const joinGroup = async (groupId) => {
    try {
      const { data: existing } = await supabase
        .from('group_members')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          Alert.alert('Info', 'Your request is pending approval.');
        } else if (existing.status === 'accepted') {
          Alert.alert('Info', 'You are already a member.');
        } else if (existing.status === 'declined') {
          Alert.alert(
            'Previous Request Declined',
            'Your previous request was declined. Would you like to request again?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Request Again',
                onPress: async () => {
                  const { error } = await supabase
                    .from('group_members')
                    .update({ status: 'pending' })
                    .eq('id', existing.id);

                  if (error) throw error;

                  await fetchGroups();
                  Alert.alert('Request Sent', 'Your request to join has been sent.');
                },
              },
            ]
          );
        }
        return;
      }

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member',
          status: 'pending'
        });

      if (error) throw error;

      await fetchGroups();
      Alert.alert('Request Sent', 'Your request to join has been sent.');
    } catch (error) {
      console.error('Join error:', error);
      Alert.alert('Error', 'Failed to send request.');
    }
  };

  const isGroupMember = (groupId) => {
    return myGroups.some(g => g.id === groupId);
  };

  const filteredGroups = (activeTab === 'my' ? myGroups : rankedGroups).filter(group =>
    group?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group?.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGroupCard = (group) => {
    if (!group) return null;
    
    const isMember = isGroupMember(group.id);
    const memberCount = group.member_count || 0;
    const isRecommended = group.same_subject && !isMember && activeTab === 'discover';
    const hasAvailabilityMatch = (group.availability_overlap_hours || 0) > 0;

    return (
      <TouchableOpacity
        key={group.id}
        style={[
          styles.groupCard,
          isRecommended && styles.recommendedGroupCard
        ]}
        onPress={() => 
          isMember 
            ? navigation.navigate('GroupDetail', { groupId: group.id })
            : null
        }
      >
        {isRecommended && (
          <View style={styles.recommendedBadge}>
            <MaterialCommunityIcons name="star" size={12} color="#fff" />
            <Text style={styles.recommendedBadgeText}>Recommended</Text>
          </View>
        )}

        <View style={styles.groupHeader}>
          <View style={styles.groupIconContainer}>
            {group.avatar_url ? (
              <Image source={{ uri: group.avatar_url }} style={styles.groupImage} />
            ) : (
              <MaterialCommunityIcons name="account-group" size={32} color="#6366f1" />
            )}
          </View>
          <View style={styles.groupMainInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <View style={styles.groupMeta}>
              <MaterialCommunityIcons name="bookmark-outline" size={14} color="#64748b" />
              <Text style={styles.groupSubject}>
                {group.subjects?.name || 'General'}
              </Text>
            </View>
          </View>
        </View>

        {group.description && (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {group.description}
          </Text>
        )}

        {/* Show match indicators */}
        {activeTab === 'discover' && !isMember && (
          <View style={styles.matchIndicators}>
            {group.same_subject && (
              <View style={styles.matchBadge}>
                <MaterialCommunityIcons name="book-check" size={14} color="#22c55e" />
                <Text style={styles.matchBadgeText}>Same Subject</Text>
              </View>
            )}
            {hasAvailabilityMatch && (
              <View style={styles.matchBadge}>
                <MaterialCommunityIcons name="calendar-check" size={14} color="#3b82f6" />
                <Text style={styles.matchBadgeText}>
                  {group.availability_overlap_hours}h overlap
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.groupFooter}>
          <View style={styles.memberCount}>
            <MaterialCommunityIcons name="account-multiple" size={16} color="#64748b" />
            <Text style={styles.memberCountText}>{memberCount} members</Text>
          </View>

          {!isMember && activeTab === 'discover' && (
            <TouchableOpacity
              style={[
                styles.joinButton,
                group.status === 'pending' && styles.pendingButton,
                group.status === 'declined' && styles.declinedButton,
                group.is_full && styles.fullButton,
              ]}
              onPress={() => joinGroup(group.id)}
              disabled={group.status === 'pending' || group.is_full}
            >
              <Text style={styles.joinButtonText}>
                {group.is_full ? 'Full' :
                 group.status === 'pending' ? 'Pending' : 
                 group.status === 'declined' ? 'Request Again' : 
                 'Request to Join'}
              </Text>
            </TouchableOpacity>
          )}

          {isMember && (
            <View style={styles.memberBadge}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#22c55e" />
              <Text style={styles.memberBadgeText}>Member</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search study groups..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            My Groups ({myGroups.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.groupsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredGroups.length > 0 ? (
          filteredGroups.map(renderGroupCard)
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>
              {activeTab === 'my' 
                ? "You haven't joined any groups yet"
                : 'No groups found'}
            </Text>
            {activeTab === 'my' && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateGroup')}
              >
                <Text style={styles.createButtonText}>Create a Group</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGroup')}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#fff',
  },
  groupsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  recommendedGroupCard: {
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  recommendedBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  groupHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  groupIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  groupMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupSubject: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  matchIndicators: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  matchBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCountText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  joinButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pendingButton: {
    backgroundColor: '#facc15',
  },
  declinedButton: {
    backgroundColor: '#f97316',
  },
  fullButton: {
    backgroundColor: '#94a3b8',
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberBadgeText: {
    fontSize: 14,
    color: '#22c55e',
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});