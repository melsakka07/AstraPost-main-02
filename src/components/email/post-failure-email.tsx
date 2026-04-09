import { Button, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PostFailureEmailProps {
  postId: string;
  reason: string;
  retryUrl: string;
}

export const PostFailureEmail = ({ postId, reason, retryUrl }: PostFailureEmailProps) => {
  return (
    <BaseLayout preview="Action Required: Post Publishing Failed">
      <Text className="text-[14px] leading-[24px] text-black">Hello,</Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Your post failed to publish on X (Twitter).
      </Text>
      <Section className="my-4 rounded-md border border-red-200 bg-red-50 p-4">
        <Text className="m-0 text-[14px] font-medium text-red-800">Reason: {reason}</Text>
      </Section>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={retryUrl}
        >
          View Queue & Retry
        </Button>
      </Section>
      <Text className="text-[14px] leading-[24px] text-black">Post ID: {postId}</Text>
    </BaseLayout>
  );
};

export default PostFailureEmail;
