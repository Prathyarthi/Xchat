import { Card, CardContent } from '@/components/ui/card'

const sections = [
  {
    title: 'Personal use',
    body: 'Closer is intended for personal companion and reflection use. Users are responsible for the content they create and for how they choose to interact with companion personas.',
  },
  {
    title: 'AI limitations',
    body: 'Companions can be helpful, reflective, and emotionally aware, but they can still be wrong, incomplete, or inappropriate for high-stakes medical, legal, or safety-critical decisions.',
  },
  {
    title: 'Account responsibility',
    body: 'Users are responsible for maintaining account security and for activity performed under their credentials.',
  },
  {
    title: 'Service changes',
    body: 'Features, usage limits, and pricing can evolve as the product learns what creates durable value and sustainable costs.',
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Terms</p>
          <h1 className="text-4xl font-bold mt-3">Terms of use</h1>
          <p className="text-sm text-zinc-600 mt-4 leading-relaxed">
            A lightweight terms surface helps set expectations before monetization and paid growth ramp up.
          </p>
        </div>

        {sections.map(section => (
          <Card key={section.title} className="rounded-3xl">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-zinc-100">{section.title}</h2>
              <p className="text-sm text-zinc-600 mt-3 leading-relaxed">{section.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
