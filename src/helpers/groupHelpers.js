import { supabase } from '../config/supabase';

export const acceptMemberRequest = async (memberId, groupId) => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .update({ status: 'accepted' })
      .eq('id', memberId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Member not found or already updated');

    // FIX #11: fetch created_by from the group to use as sender_id
    const { data: groupData } = await supabase
      .from('study_groups')
      .select('created_by, name')
      .eq('id', groupId)
      .single();

    await supabase.from('notifications').insert({
      user_id: data.user_id,
      sender_id: groupData?.created_by ?? null,
      group_id: groupId,
      type: 'group_request_accepted',
      title: 'Request Accepted',
      message: `Your request to join ${groupData?.name ?? 'the group'} has been accepted!`,
      is_read: false,
    });

    return true;
  } catch (error) {
    console.error('Error accepting member request:', error);
    throw error;
  }
};

export const declineMemberRequest = async (memberId, groupId) => {
  try {
    const { data: memberData } = await supabase
      .from('group_members')
      .select('user_id, study_groups (name, created_by)')
      .eq('id', memberId)
      .single();

    const { error } = await supabase
      .from('group_members')
      .update({ status: 'declined' })
      .eq('id', memberId);

    if (error) throw error;

    if (memberData) {
      await supabase.from('notifications').insert({
        user_id: memberData.user_id,
        sender_id: memberData.study_groups?.created_by ?? null,
        group_id: groupId,
        type: 'group_request_declined',
        title: 'Request Declined',
        message: `Your request to join ${memberData.study_groups?.name ?? 'the group'} was not accepted at this time.`,
        is_read: false,
      });
    }
    return true;
  } catch (error) {
    console.error('Error declining member request:', error);
    throw error;
  }
};

export const promoteToAdmin = async (memberId, currentUserId, groupId) => {
  try {
    const { data: currentMember } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)
      .single();

    if (!currentMember || (currentMember.role !== 'admin' && currentMember.role !== 'owner')) {
      throw new Error('Only admins and owners can promote members');
    }

    const { data: targetMember } = await supabase
      .from('group_members')
      .select('user_id, profiles (full_name)')
      .eq('id', memberId)
      .single();

    const { error } = await supabase
      .from('group_members')
      .update({ role: 'admin' })
      .eq('id', memberId);

    if (error) throw error;

    await supabase.from('notifications').insert({
      user_id: targetMember.user_id,
      sender_id: currentUserId,
      group_id: groupId,
      type: 'promoted_to_admin',
      title: "You're now an Admin",
      message: 'You have been promoted to admin in the group!',
      is_read: false,
    });

    return true;
  } catch (error) {
    console.error('Error promoting to admin:', error);
    throw error;
  }
};

export const demoteFromAdmin = async (memberId, currentUserId, groupId) => {
  try {
    const { data: currentMember } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)
      .single();

    if (!currentMember || currentMember.role !== 'owner') {
      throw new Error('Only the owner can demote admins');
    }

    const { data: targetMember } = await supabase
      .from('group_members')
      .select('user_id, role, profiles (full_name)')
      .eq('id', memberId)
      .single();

    if (targetMember.role === 'owner') throw new Error('Cannot demote the owner');

    const { error } = await supabase
      .from('group_members')
      .update({ role: 'member' })
      .eq('id', memberId);

    if (error) throw error;

    await supabase.from('notifications').insert({
      user_id: targetMember.user_id,
      sender_id: currentUserId,
      group_id: groupId,
      type: 'demoted_from_admin',
      title: 'Role Changed',
      message: 'Your admin role has been changed to member.',
      is_read: false,
    });

    return true;
  } catch (error) {
    console.error('Error demoting from admin:', error);
    throw error;
  }
};

export const removeMember = async (memberId, currentUserId, groupId) => {
  try {
    const { data: currentMember } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)
      .single();

    if (!currentMember || (currentMember.role !== 'admin' && currentMember.role !== 'owner')) {
      throw new Error('Only admins and owners can remove members');
    }

    const { data: targetMember } = await supabase
      .from('group_members')
      .select('user_id, role')
      .eq('id', memberId)
      .single();

    if (targetMember.role === 'owner') throw new Error('Cannot remove the owner');
    if (currentMember.role === 'admin' && targetMember.role === 'admin') {
      throw new Error('Admins cannot remove other admins');
    }

    const { error } = await supabase.from('group_members').delete().eq('id', memberId);
    if (error) throw error;

    await supabase.from('notifications').insert({
      user_id: targetMember.user_id,
      sender_id: currentUserId,
      group_id: groupId,
      type: 'removed_from_group',
      title: 'Removed from Group',
      message: 'You have been removed from the group.',
      is_read: false,
    });

    return true;
  } catch (error) {
    console.error('Error removing member:', error);
    throw error;
  }
};

export const getPendingRequests = async (groupId) => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('id, user_id, status, joined_at, profiles (id, full_name, avatar_url, email)')
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    throw error;
  }
};