"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent"></div>

      <div className="mx-auto max-w-4xl w-full text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <span className="text-sm font-medium text-primary">Welcome to the future of learning</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight text-balance">
          Your AI-driven Study Roadmap for <span className="text-primary">Smarter Exam Prep</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
          FindEarn helps you plan, learn, and track your exam preparation through personalized AI-generated roadmaps
          using YouTube, GitHub, and Wikipedia resources.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/signup">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
              Get Started
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" size="lg" className="px-8 bg-transparent">
              How It Works
            </Button>
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center animate-bounce">
          <ChevronDown size={24} className="text-primary" />
        </div>
      </div>
    </section>
  )
}
