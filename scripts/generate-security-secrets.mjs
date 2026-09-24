import { randomBytes } from "node:crypto";

const secret = () => randomBytes(32).toString("base64url");

console.log("# Copy each value to the target environment's Wrangler secrets / .dev.vars.dev");
console.log(`PASSWORD_PEPPER=${secret()}`);
console.log(`DATA_ENCRYPTION_KEY=${secret()}`);
console.log(`DATA_LOOKUP_KEY=${secret()}`);
