PRAGMA foreign_keys = ON;

-- Add/update the public sample team's batting-group explanation video.
UPDATE sign_groups
SET explanation_youtube_url='https://youtube.com/shorts/xhDWDEimYaY',
    explanation_youtube_video_id='xhDWDEimYaY',
    updated_at=CURRENT_TIMESTAMP
WHERE team_id='6BnWv2K3zo'
  AND sort_order=10
  AND deleted_at IS NULL;
