export const MAX_SUB_ADMINS = 5;

export function adminCapacity({ members = [], pendingInvites = [] } = {}) {
  const subAdminCount = members.filter((member) => member?.role === "admin").length;
  const pendingSubAdminInvites = pendingInvites.filter((invite) => invite?.kind === "admin").length;
  return {
    maxSubAdmins: MAX_SUB_ADMINS,
    subAdminCount,
    pendingSubAdminInvites,
    availableSubAdminSlots: Math.max(0, MAX_SUB_ADMINS - subAdminCount),
    reservableSubAdminSlots: Math.max(0, MAX_SUB_ADMINS - subAdminCount - pendingSubAdminInvites)
  };
}
