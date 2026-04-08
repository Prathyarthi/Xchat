import Razorpay from 'razorpay'

let client: Razorpay | null = null

export function getRazorpay(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) return null
  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret })
  }
  return client
}
