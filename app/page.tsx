"use client"

import { useState } from "react"
import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import FeaturesSection from "@/components/features-section"
import HowItWorks from "@/components/how-it-works"
import Footer from "@/components/footer"

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="flex flex-col">
        <Hero />
        <HowItWorks />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  )
}
