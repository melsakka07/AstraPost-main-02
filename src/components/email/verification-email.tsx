import { Button, Section, Text, Link } from '@react-email/components';
import { BaseLayout } from './base-layout';

interface VerificationEmailProps {
  url: string;
  name?: string | undefined;
}

export const VerificationEmail = ({ url, name }: VerificationEmailProps) => {
  return (
    <BaseLayout preview="Verify your email address for AstroPost">
      <Text className="text-black text-[14px] leading-[24px]">
        Hello {name || 'there'},
      </Text>
      <Text className="text-black text-[14px] leading-[24px]">
        Welcome to AstroPost! Please verify your email address by clicking the button below:
      </Text>
      <Section className="text-center mt-[32px] mb-[32px]">
        <Button
          className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
          href={url}
        >
          Verify Email
        </Button>
      </Section>
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

export default VerificationEmail;
