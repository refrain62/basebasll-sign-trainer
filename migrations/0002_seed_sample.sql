-- サンプルチーム。選手用合言葉は「ホームラン」。
-- 管理者パスワードは意図的に利用不能なランダム値のハッシュです。
-- システム管理画面から管理者パスワードを再設定してからチーム管理を利用してください。
INSERT OR IGNORE INTO teams(id,name,passphrase_hash,admin_password_hash,status)
VALUES(
  '6BnWv2K3zo',
  'サンプルチーム',
  'pbkdf2-sha256$120000$Hj9WSJTt-MnUftwYy2hejA$sW69qlUk73wWVGHLJHMQpQfpsDSOuYzJSZqW0m_oQfQ',
  'pbkdf2-sha256$120000$BFoXgMdtlF5CPAAXBbzScg$TBsPiBqnQkmRnZKr_cylL_RPQnHNffjqGRlTAsUM1Nc',
  'active'
);

INSERT OR IGNORE INTO signs(id,team_id,name,sort_order,enabled) VALUES
  (1,'6BnWv2K3zo','盗塁',10,1),
  (2,'6BnWv2K3zo','バント',20,1),
  (3,'6BnWv2K3zo','待て',30,1),
  (4,'6BnWv2K3zo','ヒットエンドラン',40,1),
  (5,'6BnWv2K3zo','バスター',50,1),
  (6,'6BnWv2K3zo','セーフティバント',60,1),
  (7,'6BnWv2K3zo','スクイズ',70,1),
  (8,'6BnWv2K3zo','ランエンドヒット',80,1),
  (9,'6BnWv2K3zo','サイン解除／自由に打て',90,1),
  (10,'6BnWv2K3zo','送りバント',100,1);

INSERT OR IGNORE INTO sign_videos(id,sign_id,youtube_url,youtube_video_id,sort_order,enabled) VALUES
  (1,1,'https://www.youtube.com/watch?v=ykwIJYh8oxo','ykwIJYh8oxo',10,1),
  (2,2,'https://www.youtube.com/watch?v=_2ujH2nEtOc','_2ujH2nEtOc',10,1),
  (3,3,'https://www.youtube.com/watch?v=fT0yEpxO9PQ','fT0yEpxO9PQ',10,1),
  (4,4,'https://www.youtube.com/watch?v=IJNHoysk3-c','IJNHoysk3-c',10,1),
  (5,5,'https://www.youtube.com/watch?v=A2FEzscDhJY','A2FEzscDhJY',10,1),
  (6,6,'https://www.youtube.com/watch?v=nqnyCmyfZ7k','nqnyCmyfZ7k',10,1),
  (7,7,'https://www.youtube.com/watch?v=8cYBvzQKelc','8cYBvzQKelc',10,1),
  (8,8,'https://www.youtube.com/watch?v=JYT0yxyvHJU','JYT0yxyvHJU',10,1),
  (9,9,'https://www.youtube.com/watch?v=SLGZzjdatb0','SLGZzjdatb0',10,1),
  (10,10,'https://www.youtube.com/watch?v=76OBENrzcXc','76OBENrzcXc',10,1);
