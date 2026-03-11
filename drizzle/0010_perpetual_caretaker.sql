ALTER TABLE "user" DROP COLUMN "voice_profile";
ALTER TABLE "user" ADD COLUMN "voice_profile" jsonb;
