import { hashPassword } from "../security/password.ts";
import { createDataProtectorFromEnv } from "../security/data-protection.ts";
import { createAuditRepository } from "../repositories/audit-repository.ts";
import { createUserRepository } from "../repositories/user-repository.ts";
import { createAdminMembershipRepository } from "../repositories/admin-membership-repository.ts";
import { createAdminInviteRepository } from "../repositories/admin-invite-repository.ts";
import { createAdminTransitionRepository } from "../repositories/admin-transition-repository.ts";
import { createAccountProvisioningRepository } from "../repositories/account-provisioning-repository.ts";
import { createGroupRepository } from "../repositories/group-repository.ts";
import { createSignRepository } from "../repositories/sign-repository.ts";
import { createTeamRepository } from "../repositories/team-repository.ts";
import { createVideoRepository } from "../repositories/video-repository.ts";
import { createSubscriptionRepository } from "../repositories/subscription-repository.ts";
import { createDataProtectionRepository } from "../repositories/data-protection-repository.ts";
import { createGroupService } from "./group-service.ts";
import { createSignService } from "./sign-service.ts";
import { createSystemTeamService } from "./system-team-service.ts";
import { createTeamService } from "./team-service.ts";
import { createVideoService } from "./video-service.ts";
import { createAccountService } from "./account-service.ts";
import { createAdminMembershipService } from "./admin-membership-service.ts";
import { createEntitlementService } from "./entitlement-service.ts";
import { createDataProtectionService } from "./data-protection-service.ts";

export function createServices(db, env: Record<string, any> = {}) {
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
