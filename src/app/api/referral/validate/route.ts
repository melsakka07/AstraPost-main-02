import { NextRequest, NextResponse } from "next/server";
import { validateReferralCode } from "@/lib/referral/utils";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const referrer = await validateReferralCode(code);

    if (!referrer) {
      return NextResponse.json({ valid: false, error: "Invalid referral code" }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      referrerId: referrer.id,
      referrerName: referrer.name,
    });
  } catch (error) {
    console.error("Referral validation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
