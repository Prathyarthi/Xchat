import { Card, CardContent } from '@/components/ui/card'

const guardrails = [
  'Closer is for companionship and reflection, not crisis response or therapy.',
  'If a user is in immediate danger, they should contact local emergency services or a crisis hotline.',
  'Companion personas should avoid encouraging dependency, self-harm, abuse, or isolation from real-world support systems.',
  'The product should frame emotional awareness as support, not as a claim of clinical accuracy.',
]

export default function SafetyPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Safety</p>
          <h1 className="text-4xl font-bold mt-3">Safety and support framing</h1>
          <p className="text-sm text-zinc-600 mt-4 leading-relaxed">
            Because Closer sits near emotional support, trust and safety framing should be visible in the product, not hidden until later.
          </p>
        </div>

        <Card className="rounded-3xl">
          <CardContent className="p-6 flex flex-col gap-4">
            {guardrails.map(item => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-zinc-300">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
