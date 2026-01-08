'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users } from 'lucide-react';
import type {
  TeamMember,
  InvitationDisplay,
  InviteRole,
} from '@hps-internal/contracts';
import {
  INVITE_ROLE_OPTIONS,
  getTeamRoleDisplay,
} from '@hps-internal/contracts';
import { SettingsCard } from './SettingsCard';
import { Button } from '@/components/ui';
import {
  sendInvite,
  listInvites,
  revokeInvite,
  InviteError,
} from '@/lib/teamInvites';
import { listMembers, removeMember } from '@/lib/teamMembers';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/useToast';

interface TeamSectionProps {
  orgId: string | null;
}

/**
 * TeamSection
 *
 * Manages team members and invitations.
 * VPs/Managers can invite and remove members.
 */
export function TeamSection({ orgId }: TeamSectionProps) {
  const { toast } = useToast();

  // State
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(orgId);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<InvitationDisplay[]>([]);
  const [canManageTeam, setCanManageTeam] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('analyst');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteFieldError, setInviteFieldError] = useState<string | null>(null);

  // Action states
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  // Load team data
  useEffect(() => {
    let isMounted = true;

    async function loadTeamData() {
      try {
        let orgIdToUse: string | null = currentOrgId;

        // Get current user's org if not provided
        if (!orgIdToUse) {
          const supabase = getSupabaseClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            if (isMounted) setMembersLoading(false);
            return;
          }

          const { data: membership } = await supabase
            .from('memberships')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

          if (!membership?.org_id) {
            if (isMounted) setMembersLoading(false);
            return;
          }

          orgIdToUse = membership.org_id;
          if (isMounted) setCurrentOrgId(orgIdToUse);
        }

        // At this point orgIdToUse is guaranteed to be non-null
        if (!orgIdToUse) return;

        // Fetch team members
        const teamResponse = await listMembers(orgIdToUse);
        if (isMounted) {
          setMembers(teamResponse.members);
          setCanManageTeam(teamResponse.can_manage);
          setMembersLoading(false);

          // Fetch pending invites (only if can manage)
          if (teamResponse.can_manage) {
            try {
              const invitesResponse = await listInvites(orgIdToUse);
              setPendingInvites(invitesResponse.invitations);
            } catch (err) {
              console.error('[settings] Failed to load invites:', err);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setMembersError(
            err instanceof Error ? err.message : 'Failed to load team'
          );
          setMembersLoading(false);
        }
      }
    }

    loadTeamData();

    return () => {
      isMounted = false;
    };
  }, [currentOrgId]);

  // Send invite
  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !currentOrgId) {
      setInviteFieldError('Email is required');
      return;
    }

    try {
      setInviteSending(true);
      setInviteError(null);
      setInviteFieldError(null);

      const result = await sendInvite({
        email: inviteEmail.trim(),
        role: inviteRole,
        org_id: currentOrgId,
      });

      setInviteEmail('');
      toast.success('Invitation sent', result.message);

      // Refresh invite list
      if (canManageTeam) {
        const invitesResponse = await listInvites(currentOrgId);
        setPendingInvites(invitesResponse.invitations);
      }
    } catch (err) {
      if (err instanceof InviteError) {
        if (err.field === 'email') {
          setInviteFieldError(err.message);
        } else {
          setInviteError(err.message);
          toast.error('Invitation failed', err.message);
        }
      } else {
        setInviteError('Failed to send invitation');
        toast.error('Invitation failed', 'Could not send the invitation.');
      }
    } finally {
      setInviteSending(false);
    }
  }, [inviteEmail, inviteRole, currentOrgId, canManageTeam, toast]);

  // Revoke invite
  const handleRevokeInvite = useCallback(
    async (invitationId: string) => {
      if (!currentOrgId) return;

      try {
        setRevokingInviteId(invitationId);

        await revokeInvite({ invitation_id: invitationId });

        setPendingInvites((prev) =>
          prev.filter((inv) => inv.id !== invitationId)
        );
        toast.success('Invitation revoked');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to revoke invitation';
        toast.error('Revoke failed', message);
      } finally {
        setRevokingInviteId(null);
      }
    },
    [currentOrgId, toast]
  );

  // Remove member
  const handleRemoveMember = useCallback(
    async (userId: string) => {
      if (!currentOrgId) return;

      try {
        setRemovingMemberId(userId);
        setConfirmRemoveId(null);

        await removeMember({ user_id: userId, org_id: currentOrgId });

        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
        toast.success('Member removed', 'Team member has been removed.');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove member';
        toast.error('Remove failed', message);
      } finally {
        setRemovingMemberId(null);
      }
    },
    [currentOrgId, toast]
  );

  // Loading state
  if (membersLoading) {
    return (
      <SettingsCard
        title="Team"
        description="Manage team members and send invitations."
        icon={<Users className="h-5 w-5" />}
        data-testid="settings-card-team"
      >
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-white/5 rounded-lg" />
          <div className="h-10 bg-white/5 rounded-lg" />
          <div className="h-10 bg-white/5 rounded-lg" />
        </div>
      </SettingsCard>
    );
  }

  // Error state
  if (membersError) {
    return (
      <SettingsCard
        title="Team"
        description="Manage team members and send invitations."
        icon={<Users className="h-5 w-5" />}
        data-testid="settings-card-team"
      >
        <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
          <p className="text-accent-red text-sm">{membersError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-accent-red/80 underline hover:text-accent-red"
          >
            Retry
          </button>
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      title="Team"
      description={
        canManageTeam
          ? 'Manage team members and send invitations.'
          : 'View your team members.'
      }
      icon={<Users className="h-5 w-5" />}
      data-testid="settings-card-team"
    >
      <div className="space-y-6">
        {/* Invite Form (only for managers) */}
        {canManageTeam && (
          <div className="p-4 bg-white/5 rounded-lg space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Send invitation
            </p>
            <div className="space-y-1">
              <label
                htmlFor="invite-email"
                className="text-sm font-semibold text-text-primary"
              >
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteFieldError(null);
                }}
                placeholder="colleague@company.com"
                className={`input-base min-h-[44px] ${
                  inviteFieldError
                    ? 'border-accent-red/50 focus:ring-accent-red/50'
                    : ''
                }`}
                disabled={inviteSending}
              />
              {inviteFieldError && (
                <p className="text-sm text-accent-red">{inviteFieldError}</p>
              )}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="invite-role"
                className="text-sm font-semibold text-text-primary"
              >
                Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as InviteRole)}
                className="input-base min-h-[44px]"
                disabled={inviteSending}
              >
                {INVITE_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {inviteError && (
              <p className="text-sm text-accent-red">{inviteError}</p>
            )}
            <Button
              onClick={handleSendInvite}
              variant="primary"
              disabled={inviteSending || !inviteEmail.trim()}
              className="w-full min-h-[44px]"
            >
              {inviteSending ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        )}

        {/* Pending Invites */}
        {canManageTeam && pendingInvites.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Pending invitations ({pendingInvites.length})
            </p>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div>
                    <p className="text-sm text-text-primary">{invite.email}</p>
                    <p className="text-xs text-text-secondary">
                      {getTeamRoleDisplay(invite.role)} &bull; Expires{' '}
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevokeInvite(invite.id)}
                    disabled={revokingInviteId === invite.id}
                    className="min-h-[44px] px-3 text-xs font-semibold text-accent-orange hover:text-accent-red disabled:opacity-50"
                  >
                    {revokingInviteId === invite.id ? '...' : 'Revoke'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Team Members */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Team members ({members.length})
          </p>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[color:var(--accent-color)]/20 flex items-center justify-center text-[color:var(--accent-color)] text-sm font-semibold">
                    {member.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm text-text-primary">
                      {member.display_name}
                      {member.is_self && (
                        <span className="ml-2 text-xs text-text-secondary">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {getTeamRoleDisplay(member.role)}
                    </p>
                  </div>
                </div>
                {canManageTeam && !member.is_self && member.role !== 'vp' && (
                  <>
                    {confirmRemoveId === member.user_id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={removingMemberId === member.user_id}
                          className="min-h-[44px] px-3 text-xs font-semibold text-accent-red hover:text-accent-red/80 disabled:opacity-50"
                        >
                          {removingMemberId === member.user_id
                            ? '...'
                            : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          className="min-h-[44px] px-3 text-xs font-semibold text-text-secondary hover:text-text-primary"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(member.user_id)}
                        className="min-h-[44px] px-3 text-xs font-semibold text-accent-orange hover:text-accent-red"
                      >
                        Remove
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
