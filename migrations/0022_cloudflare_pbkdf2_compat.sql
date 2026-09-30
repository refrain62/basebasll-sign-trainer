-- Cloudflare Workers Web Crypto rejects PBKDF2 iteration counts above 100,000.
-- Repair only the untouched seeded sample passphrase hash; do not overwrite customized teams.
UPDATE teams
SET passphrase_hash = 'pbkdf2-sha256$100000$Hj9WSJTt-MnUftwYy2hejA$iEBaRTX_oGhIXbjAW1q-oZ6PYoHrWev0ASbdUFa-GVY',
    player_session_version = player_session_version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = '6BnWv2K3zo'
  AND passphrase_hash = 'pbkdf2-sha256$120000$Hj9WSJTt-MnUftwYy2hejA$sW69qlUk73wWVGHLJHMQpQfpsDSOuYzJSZqW0m_oQfQ';
