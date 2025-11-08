"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Navbar from "@/components/navbar"
import Toast from "@/components/toast"
import LoadingSpinner from "@/components/loading-spinner"

export default function GoalInputPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    topic: "",
    exam: "",
    timeValue: "",
    timeUnit: "days",
    difficulty: "intermediate",
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.topic || !formData.exam || !formData.timeValue) {
      setToast({ message: "Please fill in all required fields", type: "error" })
      return
    }

    setLoading(true)

    // Simulate API call to /generateRoadmap
    setTimeout(() => {
      setToast({ message: "Generating your personalized roadmap...", type: "success" })
      setLoading(false)
      setTimeout(() => {
        // Mock storing the roadmap data
        localStorage.setItem(
          "currentRoadmap",
          JSON.stringify({
            topic: formData.topic,
            exam: formData.exam,
            time: `${formData.timeValue} ${formData.timeUnit}`,
            difficulty: formData.difficulty,
            milestones: generateMockRoadmap(formData),
          }),
        )
        router.push("/roadmap")
      }, 1500)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-2xl p-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Set Your Learning Goal</h1>
          <p className="text-muted-foreground mb-8">
            Tell us about your exam preparation and we'll create a personalized roadmap
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="topic" className="text-foreground">
                Topic / Subject *
              </Label>
              <Input
                id="topic"
                name="topic"
                type="text"
                placeholder="e.g., Machine Learning, Data Structures, Calculus"
                value={formData.topic}
                onChange={handleChange}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="exam" className="text-foreground">
                Exam / Goal *
              </Label>
              <Select value={formData.exam} onValueChange={(value) => handleSelectChange("exam", value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select an exam type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mid-sem">Mid-Semester</SelectItem>
                  <SelectItem value="final">Final Exam</SelectItem>
                  <SelectItem value="placement">Placement Interview</SelectItem>
                  <SelectItem value="certification">Certification</SelectItem>
                  <SelectItem value="competitive">Competitive Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="timeValue" className="text-foreground">
                  Time Available *
                </Label>
                <Input
                  id="timeValue"
                  name="timeValue"
                  type="number"
                  placeholder="e.g., 4"
                  value={formData.timeValue}
                  onChange={handleChange}
                  required
                  min="1"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="timeUnit" className="text-foreground">
                  Unit
                </Label>
                <Select value={formData.timeUnit} onValueChange={(value) => handleSelectChange("timeUnit", value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="difficulty" className="text-foreground">
                Difficulty Level
              </Label>
              <Select value={formData.difficulty} onValueChange={(value) => handleSelectChange("difficulty", value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 py-6 text-base">
              {loading ? "Generating Roadmap..." : "Generate Roadmap"}
            </Button>
          </form>
        </Card>
      </div>

      {loading && <LoadingSpinner message="Generating your personalized roadmap..." />}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

function generateMockRoadmap(formData: any) {
  const topics = formData.topic.split(",").map((t: string) => t.trim())
  const baseTopics = topics.length > 0 ? topics : ["Topic 1", "Topic 2", "Topic 3"]

  return [
    {
      id: 1,
      topic: baseTopics[0] || "Fundamentals",
      description: "Learn the core concepts and foundations",
      duration: "3 days",
      resources: [
        { type: "YouTube", title: "Complete Tutorial", url: "#" },
        { type: "GitHub", title: "Example Code", url: "#" },
        { type: "Wikipedia", summary: "Comprehensive overview" },
      ],
      status: "pending",
    },
    {
      id: 2,
      topic: baseTopics[1] || "Advanced Concepts",
      description: "Dive deeper into advanced topics",
      duration: "4 days",
      resources: [
        { type: "YouTube", title: "Advanced Techniques", url: "#" },
        { type: "GitHub", title: "Implementation Guide", url: "#" },
        { type: "Wikipedia", summary: "Detailed explanation" },
      ],
      status: "pending",
    },
    {
      id: 3,
      topic: baseTopics[2] || "Practice & Review",
      description: "Reinforce learning with practice problems",
      duration: "2 days",
      resources: [
        { type: "YouTube", title: "Problem Solving", url: "#" },
        { type: "GitHub", title: "Practice Questions", url: "#" },
        { type: "Wikipedia", summary: "Reference material" },
      ],
      status: "pending",
    },
  ]
}
