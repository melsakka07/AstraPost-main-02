import { Button, Section, Text } from "@react-email/components";
import { BaseLayout } from "../base-layout";

interface TrialExpiredEmailProps {
  userName: string;
}

export const TrialExpiredEmail = ({ userName }: TrialExpiredEmailProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <BaseLayout preview="Your AstraPost trial has expired">
      <Text className="text-[14px] leading-[24px] text-black">Hi {userName || "there"},</Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Your free trial has ended without a payment method on file. Your account has been moved to
        the Free plan.
      </Text>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={`${baseUrl}/dashboard/settings`}
        >
          Upgrade Now
        </Button>
      </Section>
      <Text className="text-[14px] leading-[24px] text-black">
        You can upgrade anytime from your account settings to regain access to all features.
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Thank you,
        <br />
        The AstraPost Team
      </Text>
    </BaseLayout>
  );
};

export default TrialExpiredEmail;
