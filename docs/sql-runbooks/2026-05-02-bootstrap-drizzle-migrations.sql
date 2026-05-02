-- Bootstrap drizzle.__drizzle_migrations for a db:push'd production DB
-- Generated: 2026-05-02T09:31:42.053Z
-- Total entries: 66
-- Run on production DB ONCE. Idempotent (uses ON CONFLICT DO NOTHING via tag-uniqueness... actually drizzle has no unique constraint on hash, so we guard with NOT EXISTS).

CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'a45304aca2f26d8a9fb6cece22c2b3178ad1e178082726b43f9d0962f04302b4', 1762409965425
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'a45304aca2f26d8a9fb6cece22c2b3178ad1e178082726b43f9d0962f04302b4');
  -- 0000_chilly_the_phantom

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '602ccdac2fbfdab87419c04471ace343db19d9f5ad5dfd8b4c8b4d060d7a43a4', 1766719908715
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '602ccdac2fbfdab87419c04471ace343db19d9f5ad5dfd8b4c8b4d060d7a43a4');
  -- 0001_last_warpath

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'bf8c89d5f9ac0a96383b5c62218dbcf972edc309219cdba58227bef98d2a0a39', 1773065223945
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'bf8c89d5f9ac0a96383b5c62218dbcf972edc309219cdba58227bef98d2a0a39');
  -- 0002_watery_bastion

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'eb8dd7270108684d2610a127b5a86219687521546774b2eb0490653b02991eb6', 1773101200000
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'eb8dd7270108684d2610a127b5a86219687521546774b2eb0490653b02991eb6');
  -- 0003_queue_improvements

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'd6615367b3c56561f581ea6ab9c42d661c5a20c531c01aece6603848fb6c5755', 1773101200001
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'd6615367b3c56561f581ea6ab9c42d661c5a20c531c01aece6603848fb6c5755');
  -- 0004_analytics_snapshots

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '9b01af3ca51cefa07d6f76c060609d1f8a608fa020e1cc53fcfb83a07ac13b44', 1773101200002
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '9b01af3ca51cefa07d6f76c060609d1f8a608fa020e1cc53fcfb83a07ac13b44');
  -- 0005_multi_account_media_followers

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'e1f30eeef2a72dc4fb5e2054ec8cb4c7bbca6b33de5dd4b606b1dcd5bf285855', 1773101200003
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'e1f30eeef2a72dc4fb5e2054ec8cb4c7bbca6b33de5dd4b606b1dcd5bf285855');
  -- 0006_job_runs

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'bdbd15c87bfaf24a3a239cd426c61746df0d5d2a2c31f3cc9f6fec5c1c39996a', 1773101200004
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'bdbd15c87bfaf24a3a239cd426c61746df0d5d2a2c31f3cc9f6fec5c1c39996a');
  -- 0007_encrypt_refresh_tokens

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'ba2d73b049dca3ed3ff9d4ea431a2a01e224fd9f1be8802ac316c00669cf7460', 1773160416848
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'ba2d73b049dca3ed3ff9d4ea431a2a01e224fd9f1be8802ac316c00669cf7460');
  -- 0008_grey_monster_badoon

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'e48a7b5314e5d82166a121763653eb990fadce4bb288148d4fb372daac403384', 1773216858543
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'e48a7b5314e5d82166a121763653eb990fadce4bb288148d4fb372daac403384');
  -- 0009_thankful_vision

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'bc440af6cfdacbceb0e8c95872987905ccdc5c5b28cfca6419c92c3d5da7cfd2', 1773219135035
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'bc440af6cfdacbceb0e8c95872987905ccdc5c5b28cfca6419c92c3d5da7cfd2');
  -- 0010_perpetual_caretaker

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'c44f594006dcf9fb38f97d4a65335a3e8bf08363465656d0a60f8f0bb874ca76', 1773237853953
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'c44f594006dcf9fb38f97d4a65335a3e8bf08363465656d0a60f8f0bb874ca76');
  -- 0011_daffy_changeling

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '0a92d416d26e2ddb02571077bdc592f7e370d8a6282bcb8608d05f27c2241778', 1773248317036
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '0a92d416d26e2ddb02571077bdc592f7e370d8a6282bcb8608d05f27c2241778');
  -- 0012_flaky_vengeance

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '1fc5189be03c58f23ccd3184855c71533a160eaf7a27fd6c883bbcd651f9ffa1', 1773251083189
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '1fc5189be03c58f23ccd3184855c71533a160eaf7a27fd6c883bbcd651f9ffa1');
  -- 0013_aromatic_nitro

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'e23ae7fc36d4601b058c4953e0bfa4937b7fe6ee89174b4713c822a1cb94ceb2', 1773253585921
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'e23ae7fc36d4601b058c4953e0bfa4937b7fe6ee89174b4713c822a1cb94ceb2');
  -- 0014_cute_eternals

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '95b848d47522cca75cb2251852575247538b546d69e181bcc8904ac66153d1f7', 1773253735815
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '95b848d47522cca75cb2251852575247538b546d69e181bcc8904ac66153d1f7');
  -- 0015_careless_namor

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'be18efdb2d79e8771561771f8b1d94e46ec2474f51dce10512342177f4a587af', 1773255467967
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'be18efdb2d79e8771561771f8b1d94e46ec2474f51dce10512342177f4a587af');
  -- 0016_wooden_golden_guardian

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '9fc8b0217f75a053aae8e23029dae8e1b62b2868f980cb621625a416497d2236', 1773257690458
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '9fc8b0217f75a053aae8e23029dae8e1b62b2868f980cb621625a416497d2236');
  -- 0017_hesitant_ultron

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'a584ccf0c1f3e882a11f66de610578f97188e496ce1c4d3f798b8974a42fab59', 1773258403984
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'a584ccf0c1f3e882a11f66de610578f97188e496ce1c4d3f798b8974a42fab59');
  -- 0018_acoustic_triathlon

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '95956c456cfbd78d9edb3d1a22151900dbc80128f267cc982b081c12fcd86842', 1773258513441
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '95956c456cfbd78d9edb3d1a22151900dbc80128f267cc982b081c12fcd86842');
  -- 0019_huge_lily_hollister

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'af18287056c5b96b80328db1e56d398d2ff9037b8243b0e4ef7edcbfaca4a39d', 1773268768106
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'af18287056c5b96b80328db1e56d398d2ff9037b8243b0e4ef7edcbfaca4a39d');
  -- 0020_pale_squirrel_girl

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '35db211a8c95b393155974ac79ddb99f9f4bd2ecc3dfc8654d53af16fa800a2e', 1773270481618
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '35db211a8c95b393155974ac79ddb99f9f4bd2ecc3dfc8654d53af16fa800a2e');
  -- 0021_regular_microbe

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '6bf149d6775543995e1ecfa5ef4a59a23cb4b60afaca70830e7f7d48516bb577', 1773271463492
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '6bf149d6775543995e1ecfa5ef4a59a23cb4b60afaca70830e7f7d48516bb577');
  -- 0022_yummy_darkhawk

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'ba43a21cd00cfd486d7adca2b9db2e33cc68619f10dd0652840677b3ca4d493c', 1773271737934
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'ba43a21cd00cfd486d7adca2b9db2e33cc68619f10dd0652840677b3ca4d493c');
  -- 0023_flashy_puma

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'e3e258f523a704a902a5fddb2367f8c467c9d3ccf29716c116a0058c1095c913', 1773323559680
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'e3e258f523a704a902a5fddb2367f8c467c9d3ccf29716c116a0058c1095c913');
  -- 0024_smiling_agent_brand

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '06072a82fed0bf6416d6243cd5151ebfb8ab2253e71c78168202f7fce07f9e25', 1773589080322
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '06072a82fed0bf6416d6243cd5151ebfb8ab2253e71c78168202f7fce07f9e25');
  -- 0025_chubby_living_lightning

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'a414829afe52d85ce48a9edba0cb1dbce9a3cea27031a892bdf7db514549d96e', 1773592450548
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'a414829afe52d85ce48a9edba0cb1dbce9a3cea27031a892bdf7db514549d96e');
  -- 0026_rainy_dark_beast

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '69ed50796f85ea9cb62408f60d62fae252d2f4cb7787816e770e1575e5fc16b9', 1773653016530
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '69ed50796f85ea9cb62408f60d62fae252d2f4cb7787816e770e1575e5fc16b9');
  -- 0027_sturdy_guardsmen

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'da4f9e4209b3fbbd9d1c9835c97ade33a933901ef665ec41bd6f9af05c1c0320', 1773750000000
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'da4f9e4209b3fbbd9d1c9835c97ade33a933901ef665ec41bd6f9af05c1c0320');
  -- 0028_drop_plaintext_refresh_tokens

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'e52fcb0b5b6b6b8eabbcd1174a1e757779d514cb100619f85ab90b76f2a62c9a', 1773674747885
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'e52fcb0b5b6b6b8eabbcd1174a1e757779d514cb100619f85ab90b76f2a62c9a');
  -- 0029_rainy_scrambler

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '7d8e01b54e16a6fdb9e185b99ab80be325aae4fea4cc744003c6248a7e8a7d59', 1773676745180
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '7d8e01b54e16a6fdb9e185b99ab80be325aae4fea4cc744003c6248a7e8a7d59');
  -- 0030_powerful_whirlwind

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '55b56930b38f1601f10778427172fb4dd41b6dc2fd45f1ed55f5649cda439eee', 1773694294768
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '55b56930b38f1601f10778427172fb4dd41b6dc2fd45f1ed55f5649cda439eee');
  -- 0031_melodic_rocket_raccoon

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '7c894911df48de91bd263f58cfa947d691d166d194e3129a75f10c3e65a8fcc8', 1774512568935
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '7c894911df48de91bd263f58cfa947d691d166d194e3129a75f10c3e65a8fcc8');
  -- 0032_flat_mesmero

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'bdfbdaf61d79afb6810e2a77293c614504cfd94be52477e96f279252d6450971', 1774515274604
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'bdfbdaf61d79afb6810e2a77293c614504cfd94be52477e96f279252d6450971');
  -- 0033_same_psynapse

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '9125a63be955c67f88bf614067d79be1ff4d26549927822f063c6b1dff5ef78b', 1774716320655
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '9125a63be955c67f88bf614067d79be1ff4d26549927822f063c6b1dff5ef78b');
  -- 0034_rainy_runaways

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '96840f2d59deda007f17caca6a6cd3b59ff248a7735d5a4d163ccebeda8f81ee', 1774798743144
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '96840f2d59deda007f17caca6a6cd3b59ff248a7735d5a4d163ccebeda8f81ee');
  -- 0035_lovely_terrax

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'a0d902e2fdea6bc129b93ee4137220c8dfc3d0d5e3c45ce13d18be2ec584746d', 1774807293235
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'a0d902e2fdea6bc129b93ee4137220c8dfc3d0d5e3c45ce13d18be2ec584746d');
  -- 0036_acoustic_phil_sheldon

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '562fd7216e5fd7c1e88ea2a8ca575f11c81b6c01bf125bc91ccfd468a4818c19', 1774866072433
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '562fd7216e5fd7c1e88ea2a8ca575f11c81b6c01bf125bc91ccfd468a4818c19');
  -- 0037_naive_dreaming_celestial

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '5ec136cd3f5f79c21c3d8f2e5653e6a54557765922ea162e68d0214b1c2c2fd7', 1775393019910
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '5ec136cd3f5f79c21c3d8f2e5653e6a54557765922ea162e68d0214b1c2c2fd7');
  -- 0038_tiny_rocket_raccoon

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '2187da05bc90b8fff74c8b68ed38b58e5bd853391ce39cc59294780bf69cec8b', 1775759390303
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '2187da05bc90b8fff74c8b68ed38b58e5bd853391ce39cc59294780bf69cec8b');
  -- 0039_narrow_bullseye

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '76caceeb964bb1737b60617a862917b0ded40365b9fdf90a90d43febb0c08acc', 1775760993623
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '76caceeb964bb1737b60617a862917b0ded40365b9fdf90a90d43febb0c08acc');
  -- 0040_swift_pet_avengers

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '1773d16f2bec465380ee2fbd030cccf5db5e1038012c225259910f6715750073', 1775764149479
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '1773d16f2bec465380ee2fbd030cccf5db5e1038012c225259910f6715750073');
  -- 0041_worthless_tomas

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '2faa6b70dcda7fbf648b642ca7c475fe4fd29541b0c245d2e0bc3a554b5407e8', 1775806041203
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '2faa6b70dcda7fbf648b642ca7c475fe4fd29541b0c245d2e0bc3a554b5407e8');
  -- 0042_right_swarm

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '5b6261dd08f7c9d9bd06f2b71d3a3c182e8368ff2131bb82df1815461d304e7b', 1775838218518
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '5b6261dd08f7c9d9bd06f2b71d3a3c182e8368ff2131bb82df1815461d304e7b');
  -- 0043_odd_justin_hammer

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'f8983245933f2e915817185216027c95fd1704d6ea80c2ce0f2553e2e30ff5aa', 1775839586162
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'f8983245933f2e915817185216027c95fd1704d6ea80c2ce0f2553e2e30ff5aa');
  -- 0044_smiling_radioactive_man

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'aabb1bfcf84f7b4b6a5c0bb453a88d283a1389511ffe1b19d5d994a0c7b2b31f', 1775899200232
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'aabb1bfcf84f7b4b6a5c0bb453a88d283a1389511ffe1b19d5d994a0c7b2b31f');
  -- 0045_daffy_wolf_cub

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '381bdccf39cf93f91c5cfc0936ff3ba544323b9702df0c063d54ce2082728847', 1775924132505
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '381bdccf39cf93f91c5cfc0936ff3ba544323b9702df0c063d54ce2082728847');
  -- 0046_rare_vision

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '47d57ac251bdd18f2153db3d13c8625e748b164cfcdf736c4e5e2c2e49f31934', 1775942573097
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '47d57ac251bdd18f2153db3d13c8625e748b164cfcdf736c4e5e2c2e49f31934');
  -- 0047_soft_brother_voodoo

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'a70b34cfab950d8e1bb357d8fb714503f8f36490c29ac18b8cc70725c9c45921', 1776151975344
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'a70b34cfab950d8e1bb357d8fb714503f8f36490c29ac18b8cc70725c9c45921');
  -- 0048_high_randall

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'a1f357db71d3b6eddb5bd760b00deb7eddebe19ec398246c668a2a1f3412d171', 1776279757560
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'a1f357db71d3b6eddb5bd760b00deb7eddebe19ec398246c668a2a1f3412d171');
  -- 0049_instagram_access_token_enc

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'a690e476814fd65002987eeee3d6d40809e6cab2cf5f32840442f87f36345e10', 1776285091370
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'a690e476814fd65002987eeee3d6d40809e6cab2cf5f32840442f87f36345e10');
  -- 0050_steep_inhumans

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'e4d21c0f1ed87ad74b09b65fa7b8351ecea8ba93141ce0e6aeb132150f36a8cb', 1776285206924
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'e4d21c0f1ed87ad74b09b65fa7b8351ecea8ba93141ce0e6aeb132150f36a8cb');
  -- 0051_magical_madrox

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '30cd47bebb1f37c83df779fbb87babf3a4bd275bf08ecac3beef3dbe3e04d7c8', 1744761600000
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '30cd47bebb1f37c83df779fbb87babf3a4bd275bf08ecac3beef3dbe3e04d7c8');
  -- 0052_add_db_enums

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '688b2cf89fab9d899c9bd4dca469667ec898ba4a86bef29ab52ba128192767da', 1776360007940
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '688b2cf89fab9d899c9bd4dca469667ec898ba4a86bef29ab52ba128192767da');
  -- 0053_add_indexes_and_cascade

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'ed818e1ee8da3dfbe324fa0fec8f720419b6694b58673b654d1cce15ad2f5d94', 1744761700000
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'ed818e1ee8da3dfbe324fa0fec8f720419b6694b58673b654d1cce15ad2f5d94');
  -- 0054_phase_b_indexes

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '11c821006e9fe0e8c17c8161fb07b56c2adabccca7071750eba394432694c9f5', 1744816200000
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '11c821006e9fe0e8c17c8161fb07b56c2adabccca7071750eba394432694c9f5');
  -- 0055_add_failed_jobs_dlq

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '8264d3e55bb0ff00e183bfd97f636d9076bee6aa650c3a170ca18fa230209459', 1744902600000
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '8264d3e55bb0ff00e183bfd97f636d9076bee6aa650c3a170ca18fa230209459');
  -- 0056_remove_session_token_idx

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'a788e711413daa19a891943dafa7d2746288b8aa4eb2e8abdc602212ee69b2fd', 1744988400000
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'a788e711413daa19a891943dafa7d2746288b8aa4eb2e8abdc602212ee69b2fd');
  -- 0057_add_affiliate_clicks_ip_hash

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'c8b398f4f14bb45757f5a3306bd1b43c1bf3646cd9c0a6cf66f47cd77694d9f1', 1776448198194
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'c8b398f4f14bb45757f5a3306bd1b43c1bf3646cd9c0a6cf66f47cd77694d9f1');
  -- 0058_lying_marrow

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '811e82ed5ad86935d5260728aa49732bc643ddaedd62b45111816044b4c427b7', 1776448394425
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '811e82ed5ad86935d5260728aa49732bc643ddaedd62b45111816044b4c427b7');
  -- 0059_bright_stature

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '19ea4c8c282452a3f6b40d384b7e9b24e477da37f7d8bb508c5b644e82bc16a9', 1776526175897
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '19ea4c8c282452a3f6b40d384b7e9b24e477da37f7d8bb508c5b644e82bc16a9');
  -- 0060_known_blink

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'f5dc374e8c0b8f1335026336e57822dbefe3aa3123ed33c095106f89efcd16ec', 1776527014574
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'f5dc374e8c0b8f1335026336e57822dbefe3aa3123ed33c095106f89efcd16ec');
  -- 0061_busy_namora

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '31e76aa50f301d574f75d8ac695fd0de735c1e84f45dff44bff9c329d443f994', 1777612259685
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '31e76aa50f301d574f75d8ac695fd0de735c1e84f45dff44bff9c329d443f994');
  -- 0062_huge_mentallo

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '9c24ac187e58e7b10feda64105c6d45387c9e17dbde3c16c7959c5a332687e0d', 1777616285033
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '9c24ac187e58e7b10feda64105c6d45387c9e17dbde3c16c7959c5a332687e0d');
  -- 0063_left_eternals

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT '3f245fecf461e56ca57fcadb66f8f014d2ba26c5926097fd1ff095705139b7a1', 1777665005299
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '3f245fecf461e56ca57fcadb66f8f014d2ba26c5926097fd1ff095705139b7a1');
  -- 0064_violet_forge

INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
  SELECT 'af82cf4c043342d1a499d0010dfed0b9536076bed584dca5605085817c43d3fc', 1777667795504
  WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'af82cf4c043342d1a499d0010dfed0b9536076bed584dca5605085817c43d3fc');
  -- 0065_lowly_spyke

-- Verify: should report 66 rows and the highest created_at = 1777667795504
SELECT COUNT(*) AS migrations_count, MAX(created_at) AS max_created_at
  FROM "drizzle"."__drizzle_migrations";
