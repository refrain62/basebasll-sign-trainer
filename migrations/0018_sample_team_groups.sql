PRAGMA foreign_keys = ON;

-- v1.5.34: keep the public sample team useful in dev / staging / production.
-- This migration is intentionally idempotent by team + reserved sort order.
-- Text values can be protected later by the existing data-protection maintenance flow.

INSERT INTO sign_groups(team_id,name,description,explanation_youtube_url,explanation_youtube_video_id,sort_order,enabled)
SELECT '6BnWv2K3zo','バッティングサイン','打撃時に使う基本サイン。バント、ヒットエンドラン、スクイズなどをまとめています。','','',10,1
WHERE EXISTS (SELECT 1 FROM teams WHERE id='6BnWv2K3zo')
  AND NOT EXISTS (SELECT 1 FROM sign_groups WHERE team_id='6BnWv2K3zo' AND sort_order=10 AND deleted_at IS NULL);

INSERT INTO sign_groups(team_id,name,description,explanation_youtube_url,explanation_youtube_video_id,sort_order,enabled)
SELECT '6BnWv2K3zo','守備サイン（ランナーなし）','ランナーがいない場面の守備サインを登録するサンプルグループです。','','',20,1
WHERE EXISTS (SELECT 1 FROM teams WHERE id='6BnWv2K3zo')
  AND NOT EXISTS (SELECT 1 FROM sign_groups WHERE team_id='6BnWv2K3zo' AND sort_order=20 AND deleted_at IS NULL);

INSERT INTO sign_groups(team_id,name,description,explanation_youtube_url,explanation_youtube_video_id,sort_order,enabled)
SELECT '6BnWv2K3zo','守備サイン（2塁ランナーあり）','2塁にランナーがいる場面の守備サインを登録するサンプルグループです。','','',30,1
WHERE EXISTS (SELECT 1 FROM teams WHERE id='6BnWv2K3zo')
  AND NOT EXISTS (SELECT 1 FROM sign_groups WHERE team_id='6BnWv2K3zo' AND sort_order=30 AND deleted_at IS NULL);

INSERT INTO sign_groups(team_id,name,description,explanation_youtube_url,explanation_youtube_video_id,sort_order,enabled)
SELECT '6BnWv2K3zo','ピッチングサイン','投手・捕手間など、投球に関するサインを登録するサンプルグループです。','','',40,1
WHERE EXISTS (SELECT 1 FROM teams WHERE id='6BnWv2K3zo')
  AND NOT EXISTS (SELECT 1 FROM sign_groups WHERE team_id='6BnWv2K3zo' AND sort_order=40 AND deleted_at IS NULL);

INSERT INTO sign_groups(team_id,name,description,explanation_youtube_url,explanation_youtube_video_id,sort_order,enabled)
SELECT '6BnWv2K3zo','走塁サイン','盗塁やランエンドヒットなど、走塁に関するサインをまとめています。','','',50,1
WHERE EXISTS (SELECT 1 FROM teams WHERE id='6BnWv2K3zo')
  AND NOT EXISTS (SELECT 1 FROM sign_groups WHERE team_id='6BnWv2K3zo' AND sort_order=50 AND deleted_at IS NULL);

-- Batting-related signs. IDs are fixed by 0002_seed_sample.sql, so this also works after names are encrypted.
UPDATE signs
SET group_id=(SELECT id FROM sign_groups WHERE team_id='6BnWv2K3zo' AND sort_order=10 AND deleted_at IS NULL ORDER BY id LIMIT 1),
    updated_at=CURRENT_TIMESTAMP
WHERE team_id='6BnWv2K3zo'
  AND id IN (2,3,4,5,6,7,9,10)
  AND deleted_at IS NULL;

-- Running-related signs.
UPDATE signs
SET group_id=(SELECT id FROM sign_groups WHERE team_id='6BnWv2K3zo' AND sort_order=50 AND deleted_at IS NULL ORDER BY id LIMIT 1),
    updated_at=CURRENT_TIMESTAMP
WHERE team_id='6BnWv2K3zo'
  AND id IN (1,8)
  AND deleted_at IS NULL;
