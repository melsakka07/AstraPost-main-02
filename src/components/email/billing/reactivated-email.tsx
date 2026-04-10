import { Text } from "@react-email/components";
import { BaseLayout } from "../base-layout";

interface ReactivatedEmailProps {
  userName: string;
}

export const ReactivatedEmail = ({ userName }: ReactivatedEmailProps) => {
  return (
    <BaseLayout preview="Your subscription has been reactivated">
      <Text className="text-[14px] leading-[24px] text-black">Hi {userName || "there"},</Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Great news — your AstraPost subscription has been reactivated and will continue on its
        normal billing schedule.
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Thank you for staying with AstraPost!
      </Text>
    </BaseLayout>
  );
};

export default ReactivatedEmail;
