import { Button, Section, Text } from '@react-email/components';
import { BaseLayout } from './base-layout';

interface PostFailureEmailProps {
  postId: string;
  reason: string;
  retryUrl: string;
}

export const PostFailureEmail = ({ postId, reason, retryUrl }: PostFailureEmailProps) => {
  return (
    <BaseLayout preview="Action Required: Post Publishing Failed">
      <Text className="text-black text-[14px] leading-[24px]">
        Hello,
      </Text>
      <Text className="text-black text-[14px] leading-[24px]">
        Your post failed to publish on X (Twitter).
      </Text>
      <Section className="bg-red-50 p-4 rounded-md my-4 border border-red-200">
        <Text className="text-red-800 text-[14px] font-medium m-0">
          Reason: {reason}
        </Text>
      </Section>
      <Section className="text-center mt-[32px] mb-[32px]">
        <Button
          className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
          href={retryUrl}
        >
          View Queue & Retry
        </Button>
      </Section>
      <Text className="text-black text-[14px] leading-[24px]">
        Post ID: {postId}
      </Text>
    </BaseLayout>
  );
};

export default PostFailureEmail;
