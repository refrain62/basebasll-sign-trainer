import { hashPassword } from "../security/password.js";
import { createDataProtectorFromEnv } from "../security/data-protection.js";
import { createAuditRepository } from "../repositories/audit-repository.js";
import { createUserRepository } from "../repositories/user-repository.js";
import { createAdminMembershipRepository } from "../repositories/admin-membership-repository.js";
import { createAdminInviteRepository } from "../repositories/admin-invite-repository.js";
import { createAdminTransitionRepository } from "../repositories/admin-transition-repository.js";
import { createAccountProvisioningRepository } from "../repositories/account-provisioning-repository.js";
import { createGroupRepository } from "../repositories/group-repository.js";
import { createSignRepository } from "../repositories/sign-repository.js";
import { createTeamRepository } from "../repositories/team-repository.js";
import { createVideoRepository } from "../repositories/video-repository.js";
import { createSubscriptionRepository } from "../repositories/subscription-repository.js";
import { createDataProtectionRepository } from "../repositories/data-protection-repository.js";
import { createGroupService } from "./group-service.js";
import { createSignService } from "./sign-service.js";
import { createSystemTeamService } from "./system-team-service.js";
import { createTeamService } from "./team-service.js";
import { createVideoService } from "./video-service.js";
import { createAccountService } from "./account-service.js";
import { createAdminMembershipService } from "./admin-membership-service.js";
import { createEntitlementService } from "./entitlement-service.js";
import { createDataProtectionService } from "./data-protection-service.js";

export function createServices(db, env = {}) {
  const protector = createDataProtectorFromEnv(env);
  const passwordHasher = (value) => hashPassword(value, env.PASSWORD_PEPPER);
  const auditRepository = createAuditRepository(db);
  const userRepository = createUserRepository(db, protector);
  const membershipRepository = createAdminMembershipRepository(db, protector);
  const inviteRepository = createAdminInviteRepository(db, protector);
  const transitionRepository = createAdminTransitionRepository(db);
  const provisioningRepository = createAccountProvisioningRepository(db, protector);
  const groupRepository = createGroupRepository(db, protector);
  const signRepository = createSignRepository(db, protector);
  const teamRepository = createTeamRepository(db, protector);
  const videoRepository = createVideoRepository(db, protector);
  const subscriptionRepository = createSubscriptionRepository(db);
  const dataProtectionRepository = createDataProtectionRepository(db);
  const entitlements = createEntitlementService({ subscriptionRepository });
  const dataProtection = createDataProtectionService({ repository: dataProtectionRepository, protector });

  return {
    repositories: { auditRepository, groupRepository, signRepository, teamRepository, videoRepository, userRepository, membershipRepository, inviteRepository, transitionRepository, provisioningRepository, subscriptionRepository, dataProtectionRepository },
    groups: createGroupService({ groupRepository, auditRepository }),
    signs: createSignService({ signRepository, groupRepository, videoRepository, auditRepository }),
    videos: createVideoService({ signRepository, videoRepository, auditRepository }),
    team: createTeamService({ teamRepository, auditRepository, hashPassword: passwordHasher }),
    systemTeams: createSystemTeamService({ teamRepository, auditRepository, hashPassword: passwordHasher, entitlementService: entitlements }),
    account: createAccountService({ userRepository, membershipRepository, teamRepository, provisioningRepository, auditRepository, hashPassword: passwordHasher, entitlementService: entitlements }),
    adminMembership: createAdminMembershipService({ membershipRepository, inviteRepository, transitionRepository, teamRepository, auditRepository }),
    entitlements,
    dataProtection
  };
}
