import crypto from 'crypto'

export function verifySubscriptionPaymentSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return false
  const body = `${paymentId}|${subscriptionId}`
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}
