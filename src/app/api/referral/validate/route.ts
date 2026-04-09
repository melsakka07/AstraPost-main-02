import { ApiError } from "@/lib/api/errors";
import { validateReferralCode } from "@/lib/referral/utils";

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return ApiError.badRequest("Code is required");
    }

    const referrer = await validateReferralCode(code);

    if (!referrer) {
      return Response.json({ valid: false, error: "Invalid referral code" }, { status: 404 });
    }

    return Response.json({
      valid: true,
      referrerId: referrer.id,
      referrerName: referrer.name,
    });
  } catch (error) {
    console.error("Referral validation error:", error);
    return ApiError.internal();
  }
}
