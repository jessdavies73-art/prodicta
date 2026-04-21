// Team context resolver.
//
// The team_members table rows are keyed by (account_id, user_id) where
// `account_id` is the account owner's auth id. The owner's own row has
// role = 'owner', user_id = account_id. Invited members have
// status = 'invited' until they accept, at which point user_id is set and
// status = 'active'.
//
// `getTeamContext(adminClient, userId)` returns:
//   {
//     accountId,        // the account this user belongs to
//     role,             // 'owner' | 'manager' | 'consultant'
//     canSeeAll,        // true for owner + manager, false for consultant
//     visibleUserIds,   // array of user_ids whose data this user can see
//     isLegacy,         // true if no team_members row existed, meaning this
//                       //   is a pre-teams user who owns their own account
//   }
//
// When no team_members row exists for the user (legacy accounts created
// before the team feature shipped), we treat them as the owner of their own
// single-seat account so existing data stays visible.

const ROLES = new Set(['owner', 'manager', 'consultant'])
const CAN_SEE_ALL = new Set(['owner', 'manager'])

export async function getTeamContext(adminClient, userId) {
  if (!userId) {
    return { accountId: null, role: null, canSeeAll: false, visibleUserIds: [], isLegacy: false }
  }

  const { data: membership, error } = await adminClient
    .from('team_members')
    .select('account_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  // If the team_members table does not exist yet, Supabase returns an error
  // with code 42P01 (undefined_table). Treat as legacy so the app keeps
  // working until the migration runs.
  if (error && error.code === '42P01') {
    return { accountId: userId, role: 'owner', canSeeAll: true, visibleUserIds: [userId], isLegacy: true }
  }

  if (!membership) {
    // Legacy pre-teams user, owns their own single-seat account.
    return { accountId: userId, role: 'owner', canSeeAll: true, visibleUserIds: [userId], isLegacy: true }
  }

  const role = ROLES.has(membership.role) ? membership.role : 'consultant'
  const accountId = membership.account_id
  const canSeeAll = CAN_SEE_ALL.has(role)

  let visibleUserIds
  if (canSeeAll) {
    const { data: rows } = await adminClient
      .from('team_members')
      .select('user_id')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .not('user_id', 'is', null)
    visibleUserIds = (rows || []).map(r => r.user_id).filter(Boolean)
    if (!visibleUserIds.includes(userId)) visibleUserIds.push(userId)
  } else {
    visibleUserIds = [userId]
  }

  return { accountId, role, canSeeAll, visibleUserIds, isLegacy: false }
}

export function isOwnerOrManager(role) {
  return CAN_SEE_ALL.has(role)
}
