export function razorpayPublicKey(): string | undefined {
  return process.env.RAZORPAY_KEY_ID
}

export function razorpayPlanId(): string | undefined {
  return process.env.RAZORPAY_PLUS_PLAN_ID
}

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && razorpayPlanId()
  )
}
