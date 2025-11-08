"use client"

export default function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: "Set Your Learning Goal",
      description: "Enter your subject, exam type, and available time. Let AI understand your learning needs.",
      icon: "🎯",
    },
    {
      number: 2,
      title: "Generate Your Roadmap",
      description: "Our AI creates a personalized, deadline-based study plan with curated resources.",
      icon: "🧠",
    },
    {
      number: 3,
      title: "Track & Adapt",
      description: "Mark progress, get feedback, and watch your roadmap adapt to your learning pace.",
      icon: "📊",
    },
  ]

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to your personalized learning experience
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="text-5xl mb-4">{step.icon}</div>
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
