import { Button, Section, Text } from "@react-email/components";
import { BaseLayout } from "../base-layout";

interface SubscriptionCancelledEmailProps {
  userName: string;
}

export const SubscriptionCancelledEmail = ({ userName }: SubscriptionCancelledEmailProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <BaseLayout preview="Your AstraPost subscription has been cancelled">
      <Text className="text-[14px] leading-[24px] text-black">Hi {userName || "there"},</Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Your AstraPost subscription has been cancelled and your account has been moved to the Free
        plan.
      </Text>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={`${baseUrl}/dashboard/settings`}
        >
          Resubscribe
        </Button>
      </Section>
      <Text className="text-[14px] leading-[24px] text-black">
        You can resubscribe at any time from your account settings.
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Thank you for being an AstraPost customer.
      </Text>
    </BaseLayout>
  );
};

export default SubscriptionCancelledEmail;
