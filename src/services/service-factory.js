import { hashPassword } from "../security/password.js";
import { createAuditRepository } from "../repositories/audit-repository.js";
import { createGroupRepository } from "../repositories/group-repository.js";
import { createSignRepository } from "../repositories/sign-repository.js";
import { createTeamRepository } from "../repositories/team-repository.js";
import { createVideoRepository } from "../repositories/video-repository.js";
import { createGroupService } from "./group-service.js";
import { createSignService } from "./sign-service.js";
import { createSystemTeamService } from "./system-team-service.js";
import { createTeamService } from "./team-service.js";
import { createVideoService } from "./video-service.js";

export function createServices(db) {
  const auditRepository = createAuditRepository(db);
  const groupRepository = createGroupRepository(db);
  const signRepository = createSignRepository(db);
  const teamRepository = createTeamRepository(db);
  const videoRepository = createVideoRepository(db);

  return {
    repositories: { auditRepository, groupRepository, signRepository, teamRepository, videoRepository },
    groups: createGroupService({ groupRepository, auditRepository }),
    signs: createSignService({ signRepository, groupRepository, videoRepository, auditRepository }),
    videos: createVideoService({ signRepository, videoRepository, auditRepository }),
    team: createTeamService({ teamRepository, auditRepository, hashPassword }),
    systemTeams: createSystemTeamService({ teamRepository, auditRepository, hashPassword })
  };
}
