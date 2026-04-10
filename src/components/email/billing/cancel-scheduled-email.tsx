import { Button, Section, Text } from "@react-email/components";
import { BaseLayout } from "../base-layout";

interface CancelScheduledEmailProps {
  userName: string;
  periodEndDate: string;
}

export const CancelScheduledEmail = ({ userName, periodEndDate }: CancelScheduledEmailProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <BaseLayout preview="Your subscription cancellation is scheduled">
      <Text className="text-[14px] leading-[24px] text-black">Hi {userName || "there"},</Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Your AstraPost subscription has been scheduled for cancellation on {periodEndDate}.
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        You'll continue to have full access to all features until that date. After that, your
        account will be moved to the Free plan.
      </Text>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={`${baseUrl}/dashboard/settings`}
        >
          Manage Subscription
        </Button>
      </Section>
      <Text className="text-[14px] leading-[24px] text-black">
        If you change your mind, you can reactivate at any time from your account settings before
        the cancellation date.
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Thank you for being an AstraPost customer.
      </Text>
    </BaseLayout>
  );
};

export default CancelScheduledEmail;
