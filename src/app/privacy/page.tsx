import { Card, CardContent } from '@/components/ui/card'

const sections = [
  {
    title: 'What Closr stores',
    body: 'Closr stores account details, companion settings, conversation history, and journal entries so the product can provide continuity, reflection, and memory over time.',
  },
  {
    title: 'How data is used',
    body: 'Your data is used to power your companion experience, improve reflection quality, and understand product usage through lightweight internal analytics events.',
  },
  {
    title: 'Private by default',
    body: 'The product is positioned as a private companion experience. Public sharing should be opt-in, and sensitive journal content should never be exposed by default.',
  },
  {
    title: 'Retention and deletion',
    body: 'Users should be able to request account deletion and expect conversation and journal data to be removed from active systems within a reasonable window.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Privacy</p>
          <h1 className="text-4xl font-bold mt-3">Privacy and data expectations</h1>
          <p className="text-sm text-zinc-600 mt-4 leading-relaxed">
            This page gives Closr a clear trust surface for users who are deciding whether to bring private thoughts into the product.
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
