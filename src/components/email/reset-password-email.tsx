import { Button, Section, Text, Link } from '@react-email/components';
import { BaseLayout } from './base-layout';

interface ResetPasswordEmailProps {
  url: string;
  name?: string | undefined;
}

export const ResetPasswordEmail = ({ url, name }: ResetPasswordEmailProps) => {
  return (
    <BaseLayout preview="Reset your password for AstraPost">
      <Text className="text-black text-[14px] leading-[24px]">
        Hello {name || 'there'},
      </Text>
      <Text className="text-black text-[14px] leading-[24px]">
        Someone requested a password reset for your AstraPost account. If this was you, click the button below to reset your password:
      </Text>
      <Section className="text-center mt-[32px] mb-[32px]">
        <Button
          className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
          href={url}
        >
          Reset Password
        </Button>
      </Section>
      <Text className="text-black text-[14px] leading-[24px]">
        If you didn't request this, you can safely ignore this email.
      </Text>
      <Text className="text-black text-[14px] leading-[24px]">
        or copy and paste this URL into your browser:
        <br />
        <Link href={url} className="text-blue-600 no-underline">
          {url}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default ResetPasswordEmail;
