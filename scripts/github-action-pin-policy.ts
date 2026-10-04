export interface InvalidGitHubActionUse {
  lineNumber: number;
  reference: string;
}

const pinnedRemoteActionPattern = /^[\w.-]+(?:\/[\w.-]+)+@[0-9a-f]{40}\s+# v\d+\.\d+\.\d+$/;

/** リモートAction参照の完全SHA固定と同一行のリリース番号コメントを検査します。 */
export function findInvalidGitHubActionUses(workflow: string): InvalidGitHubActionUse[] {
  const invalid: InvalidGitHubActionUse[] = [];

  workflow.split(/\r?\n/).forEach((line, index) => {
    const match = line.match(/^\s*(?:-\s*)?uses:\s*(.*?)\s*$/);
    if (!match) return;

    const reference = match[1].trim();
    if (reference.startsWith("./")) return;
    if (pinnedRemoteActionPattern.test(reference)) return;

    invalid.push({ lineNumber: index + 1, reference });
  });

  return invalid;
}
