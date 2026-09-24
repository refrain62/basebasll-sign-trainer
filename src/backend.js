// Compatibility facade.
// Runtime routes import focused controllers/modules directly. Tests and any external
// imports can continue using src/backend.js while the implementation remains SOLID-oriented.

export { apiJson, json, safeJson, withHeaders } from "./http/response.js";
export { pageAssetForPath, serveHtmlPage } from "./http/pages.js";
export {
  cleanComment,
  cleanName,
  isAdminCredential,
  isStrongSecret,
  normalizeSecret,
  normalizeTeamId,
  parseYouTubeUrl,
  positiveNumber,
  randomId,
  teamUrls
} from "./validation/common.js";
export { hashPassword, isSupportedPasswordHash, verifyPassword, verifyPasswordDetailed } from "./security/password.js";
export { createDataProtector, createDataProtectorFromEnv, dataProtectionConfigError, isEncryptedValue, isLookupValue } from "./security/data-protection.js";
export {
  cookieValue,
  createSessionToken,
  isFreshAccountSession,
  isLocalHostname,
  parseCookies,
  readRoleSession,
  sessionSecretConfigError,
  systemAdminSecretConfigError,
  systemSecretVersion,
  verifySessionToken
} from "./security/session.js";
export { isSystemAdminPath, validateCloudflareAccess, validateMutationRequest } from "./security/request-guards.js";
export { verifyCloudflareAccessJwt } from "./security/cloudflare-access.js";
export { requireLegacyTeamAdmin, requireSystem, requireTeamAdmin, requireTeamOwner, requireUser } from "./security/authorization.js";
export { auditEvent, createAuditRepository, sanitizeAuditDetail } from "./repositories/audit-repository.js";
export {
  createTeamRepository,
  getGroup,
  getSignWithVideos,
  getTeam,
  getTeamGroups,
  getTeamSigns,
  publicTeam,
  validGroupId
} from "./repositories/team-repository.js";
export { createGroupRepository } from "./repositories/group-repository.js";
export { createSignRepository } from "./repositories/sign-repository.js";
export { createVideoRepository } from "./repositories/video-repository.js";
export { createUserRepository, publicUser } from "./repositories/user-repository.js";
export { createAdminMembershipRepository } from "./repositories/admin-membership-repository.js";
export { createAdminInviteRepository } from "./repositories/admin-invite-repository.js";
export { createAdminTransitionRepository } from "./repositories/admin-transition-repository.js";
export { createAccountProvisioningRepository } from "./repositories/account-provisioning-repository.js";
export { createGroupService } from "./services/group-service.js";
export { createSignService } from "./services/sign-service.js";
export { createTeamService } from "./services/team-service.js";
export { createSystemTeamService } from "./services/system-team-service.js";
export { createVideoService } from "./services/video-service.js";
export { createAccountService } from "./services/account-service.js";
export { createAdminMembershipService } from "./services/admin-membership-service.js";
export { createServices } from "./services/service-factory.js";
export { ServiceError } from "./services/errors.js";
export { createPkcePair, decodeJwt, redirectUri, validateOidcClaims } from "./oauth/common.js";
export { providerConfigured, providerStatus } from "./oauth/providers.js";
export { playerAuth, playerLogout, playerSession, playerSigns } from "./controllers/player-controller.js";
export {
  teamAdminAuth,
  teamAdminCreateGroup,
  teamAdminCreateSign,
  teamAdminCreateVideo,
  teamAdminDeleteGroup,
  teamAdminDeleteSign,
  teamAdminDeleteVideo,
  teamAdminGetTeam,
  teamAdminLogout,
  teamAdminSession,
  teamAdminUpdateGroup,
  teamAdminUpdateSign,
  teamAdminUpdateTeam,
  teamAdminUpdateVideo
} from "./controllers/team-admin-controller.js";
export {
  systemAuth,
  systemCreateTeam,
  systemDeleteTeam,
  systemListTeams,
  systemLogout,
  systemSession,
  systemUpdateTeam,
  systemDataProtectionStatus,
  systemProtectData
} from "./controllers/system-controller.js";
