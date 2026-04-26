import { Button, Section, Text } from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";
import { BaseLayout } from "./base-layout";

interface PostFailureEmailProps {
  postId: string;
  reason: string;
  retryUrl: string;
  locale?: string;
}

export const PostFailureEmail = ({
  postId,
  reason,
  retryUrl,
  locale = "en",
}: PostFailureEmailProps) => {
  const t = getEmailTranslations(locale);
  return (
    <BaseLayout preview={t.post_failure.subject} locale={locale}>
      <Text className="text-[14px] leading-[24px] text-black">{t.common.greeting_no_name}</Text>
      <Text className="text-[14px] leading-[24px] text-black">{t.post_failure.body}</Text>
      <Section className="my-4 rounded-md border border-red-200 bg-red-50 p-4">
        <Text className="m-0 text-[14px] font-medium text-red-800">
          {t.post_failure.reason_label}: {reason}
        </Text>
      </Section>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={retryUrl}
        >
          {t.post_failure.view_queue}
        </Button>
      </Section>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.post_failure.post_id}: {postId}
      </Text>
    </BaseLayout>
  );
};

export default PostFailureEmail;
