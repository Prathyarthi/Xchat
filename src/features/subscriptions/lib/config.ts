export function razorpayPublicKey(): string | undefined {
  return process.env.RAZORPAY_KEY_ID
}

export function razorpayPlusPlanId(): string | undefined {
  return process.env.RAZORPAY_PLUS_PLAN_ID
}

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_PLUS_PLAN_ID
  )
}
