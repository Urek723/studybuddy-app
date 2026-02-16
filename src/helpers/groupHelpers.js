// File location: src/helpers/groupHelpers.js
import { supabase } from '../config/supabase';

/**
 * Accept a pending group member request
 * @param {string} memberId - The group_members record ID
 * @param {string} groupId - The study group ID
 * @returns {Promise<boolean>} - Success status
 */
export const acceptMemberRequest = async (memberId, groupId) => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .update({ status: 'accepted' })
      .eq('id', memberId)
      .select()
      .maybeSingle(); // <-- changed here

    if (error) throw error;
    if (!data) throw new Error('Member not found or already updated');

    await supabase.from('notifications').insert({
      user_id: data.user_id,
      sender_id: data.group_id, // or group created_by
      group_id: groupId,
      type: 'group_request_accepted',
      title: 'Request Accepted',
      message: `Your request to join ${groupId} has been accepted!`,
      is_read: false
    });

    return true;
  } catch (error) {
    console.error('Error accepting member request:', error);
    throw error;
  }
};


/**
 * Decline a pending group member request
 * @param {string} memberId - The group_members record ID
 * @param {string} groupId - The study group ID
 * @returns {Promise<boolean>} - Success status
 */
export const declineMemberRequest = async (memberId, groupId) => {
  try {
    // Get member details before deletion for notification
    const { data: memberData } = await supabase
      .from('group_members')
      .select(`
        user_id,
        study_groups (
          name,
          created_by
        )
      `)
      .eq('id', memberId)
      .single();

    // Update status to declined instead of deleting
    const { error } = await supabase
      .from('group_members')
      .update({ status: 'declined' })
      .eq('id', memberId);

    if (error) throw error;

    // Create notification for the declined user
    if (memberData) {
      await supabase
        .from('notifications')
        .insert({
          user_id: memberData.user_id,
          sender_id: memberData.study_groups.created_by,
          group_id: groupId,
          type: 'group_request_declined',
          title: 'Request Declined',
          message: `Your request to join ${memberData.study_groups.name} was not accepted at this time.`,
          is_read: false
        });
    }

    return true;
  } catch (error) {
    console.error('Error declining member request:', error);
    throw error;
  }
};

/**
 * Promote a member to admin (only owner/admin can do this)
 * @param {string} memberId - The group_members record ID
 * @param {string} currentUserId - The ID of the user performing the action
 * @param {string} groupId - The study group ID
 * @returns {Promise<boolean>} - Success status
 */
export const promoteToAdmin = async (memberId, currentUserId, groupId) => {
  try {
    // Check if current user is admin or owner
    const { data: currentMember } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)
      .single();

    if (!currentMember || (currentMember.role !== 'admin' && currentMember.role !== 'owner')) {
      throw new Error('Only admins and owners can promote members');
    }

    // Get target member info
    const { data: targetMember } = await supabase
      .from('group_members')
      .select(`
        user_id,
        profiles (
          full_name
        )
      `)
      .eq('id', memberId)
      .single();

    // Update member role to admin
    const { error } = await supabase
      .from('group_members')
      .update({ role: 'admin' })
      .eq('id', memberId);

    if (error) throw error;

    // Create notification for the promoted user
    await supabase
      .from('notifications')
      .insert({
        user_id: targetMember.user_id,
        sender_id: currentUserId,
        group_id: groupId,
        type: 'promoted_to_admin',
        title: 'You\'re now an Admin',
        message: `You have been promoted to admin in the group!`,
        is_read: false
      });

    return true;
  } catch (error) {
    console.error('Error promoting to admin:', error);
    throw error;
  }
};

/**
 * Demote an admin to regular member (only owner can do this)
 * @param {string} memberId - The group_members record ID
 * @param {string} currentUserId - The ID of the user performing the action
 * @param {string} groupId - The study group ID
 * @returns {Promise<boolean>} - Success status
 */
export const demoteFromAdmin = async (memberId, currentUserId, groupId) => {
  try {
    // Check if current user is owner
    const { data: currentMember } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)
      .single();

    if (!currentMember || currentMember.role !== 'owner') {
      throw new Error('Only the owner can demote admins');
    }

    // Get target member info
    const { data: targetMember } = await supabase
      .from('group_members')
      .select(`
        user_id,
        role,
        profiles (
          full_name
        )
      `)
      .eq('id', memberId)
      .single();

    // Prevent demoting the owner
    if (targetMember.role === 'owner') {
      throw new Error('Cannot demote the owner');
    }

    // Update member role to regular member
    const { error } = await supabase
      .from('group_members')
      .update({ role: 'member' })
      .eq('id', memberId);

    if (error) throw error;

    // Create notification for the demoted user
    await supabase
      .from('notifications')
      .insert({
        user_id: targetMember.user_id,
        sender_id: currentUserId,
        group_id: groupId,
        type: 'demoted_from_admin',
        title: 'Role Changed',
        message: `Your admin role has been changed to member.`,
        is_read: false
      });

    return true;
  } catch (error) {
    console.error('Error demoting from admin:', error);
    throw error;
  }
};

/**
 * Remove a member from the group (admin/owner only)
 * @param {string} memberId - The group_members record ID
 * @param {string} currentUserId - The ID of the user performing the action
 * @param {string} groupId - The study group ID
 * @returns {Promise<boolean>} - Success status
 */
export const removeMember = async (memberId, currentUserId, groupId) => {
  try {
    // Check if current user is admin or owner
    const { data: currentMember } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)
      .single();

    if (!currentMember || (currentMember.role !== 'admin' && currentMember.role !== 'owner')) {
      throw new Error('Only admins and owners can remove members');
    }

    // Get target member info
    const { data: targetMember } = await supabase
      .from('group_members')
      .select('user_id, role')
      .eq('id', memberId)
      .single();

    // Prevent removing the owner
    if (targetMember.role === 'owner') {
      throw new Error('Cannot remove the owner');
    }

    // Admins cannot remove other admins
    if (currentMember.role === 'admin' && targetMember.role === 'admin') {
      throw new Error('Admins cannot remove other admins');
    }

    // Delete the member
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;

    // Create notification for the removed user
    await supabase
      .from('notifications')
      .insert({
        user_id: targetMember.user_id,
        sender_id: currentUserId,
        group_id: groupId,
        type: 'removed_from_group',
        title: 'Removed from Group',
        message: `You have been removed from the group.`,
        is_read: false
      });

    return true;
  } catch (error) {
    console.error('Error removing member:', error);
    throw error;
  }
};

/**
 * Get pending member requests for a group
 * @param {string} groupId - The study group ID
 * @returns {Promise<Array>} - Array of pending requests
 */
export const getPendingRequests = async (groupId) => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        id,
        user_id,
        status,
        joined_at,
        profiles (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
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