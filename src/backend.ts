// Compatibility facade.
// Runtime routes import focused controllers/modules directly. Tests and any external
// imports can continue using src/backend.ts while the implementation remains SOLID-oriented.

export { apiJson, json, safeJson, withHeaders } from "./http/response.ts";
export { pageAssetForPath, serveHtmlPage } from "./http/pages.ts";
export { ASSET_VERSION_TOKEN, applyAssetVersion, assetVersion, isVersionedTextAsset, serveVersionedTextAsset } from "./http/versioned-assets.ts";
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
} from "./validation/common.ts";
export { hashPassword, isSupportedPasswordHash, verifyPassword, verifyPasswordDetailed } from "./security/password.ts";
export { createDataProtector, createDataProtectorFromEnv, dataProtectionConfigError, isEncryptedValue, isLookupValue } from "./security/data-protection.ts";
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
} from "./security/session.ts";
export { isSystemAdminPath, validateCloudflareAccess, validateMutationRequest } from "./security/request-guards.ts";
export { verifyCloudflareAccessJwt } from "./security/cloudflare-access.ts";
export { requireLegacyTeamAdmin, requireSystem, requireTeamAdmin, requireTeamOwner, requireUser } from "./security/authorization.ts";
export { auditEvent, createAuditRepository, sanitizeAuditDetail } from "./repositories/audit-repository.ts";
export {
  createTeamRepository,
  getGroup,
  getSignWithVideos,
  getTeam,
  getTeamGroups,
  getTeamSigns,
  publicTeam,
  validGroupId
} from "./repositories/team-repository.ts";
export { createGroupRepository } from "./repositories/group-repository.ts";
export { createSignRepository } from "./repositories/sign-repository.ts";
export { createVideoRepository } from "./repositories/video-repository.ts";
export { createUserRepository, publicUser } from "./repositories/user-repository.ts";
export { createAdminMembershipRepository } from "./repositories/admin-membership-repository.ts";
export { createAdminInviteRepository } from "./repositories/admin-invite-repository.ts";
export { createAdminTransitionRepository } from "./repositories/admin-transition-repository.ts";
export { createAccountProvisioningRepository } from "./repositories/account-provisioning-repository.ts";
export { createGroupService } from "./services/group-service.ts";
export { createSignService } from "./services/sign-service.ts";
export { createTeamService } from "./services/team-service.ts";
export { createSystemTeamService } from "./services/system-team-service.ts";
export { createVideoService } from "./services/video-service.ts";
export { createAccountService } from "./services/account-service.ts";
export { createAdminMembershipService } from "./services/admin-membership-service.ts";
export { createServices } from "./services/service-factory.ts";
export { ServiceError } from "./services/errors.ts";
export { createPkcePair, decodeJwt, redirectUri, validateOidcClaims } from "./oauth/common.ts";
export { providerConfigured, providerStatus } from "./oauth/providers.ts";
export { playerAuth, playerLogout, playerSession, playerSigns } from "./controllers/player-controller.ts";
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
} from "./controllers/team-admin-controller.ts";
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
} from "./controllers/system-controller.ts";
