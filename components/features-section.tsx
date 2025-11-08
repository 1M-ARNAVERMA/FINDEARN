"use client"

import { Zap, Brain, BookOpen, TrendingUp } from "lucide-react"

export default function FeaturesSection() {
  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Adaptive Learning",
      description: "AI adjusts your roadmap based on your progress and feedback",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "AI Roadmaps",
      description: "Personalized study plans generated specifically for your goals",
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Real Resources",
      description: "Curated YouTube, GitHub, and Wikipedia content for each topic",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Progress Tracking",
      description: "Visual analytics to monitor your learning journey",
    },
  ]

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Powerful Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need for effective exam preparation
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-6 rounded-lg border border-border bg-card hover:shadow-lg transition-shadow">
              <div className="text-primary mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
