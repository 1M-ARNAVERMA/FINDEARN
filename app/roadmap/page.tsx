"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, SkipForward, ExternalLink, BarChart3 } from "lucide-react"
import Navbar from "@/components/navbar"
import Toast from "@/components/toast"

interface Milestone {
  id: number
  topic: string
  description: string
  duration: string
  resources: Array<{ type: string; title?: string; summary?: string; url?: string }>
  status: "pending" | "completed" | "skipped"
}

export default function RoadmapPage() {
  const router = useRouter()
  const [roadmap, setRoadmap] = useState<Milestone[]>([])
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all")
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("currentRoadmap")
    if (saved) {
      const data = JSON.parse(saved)
      setRoadmap(data.milestones || [])
    }
  }, [])

  const handleStatusChange = (id: number, newStatus: "pending" | "completed" | "skipped") => {
    const updated = roadmap.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    setRoadmap(updated)

    // Show toast
    const messages: Record<string, string> = {
      completed: "Progress updated! Keep up the great work!",
      pending: "We'll help you with this topic",
      skipped: "Topic skipped. We'll adjust your roadmap.",
    }
    setToast({ message: messages[newStatus], type: "success" })

    // Simulate API call to /updateProgress
    localStorage.setItem(
      "currentRoadmap",
      JSON.stringify({
        ...JSON.parse(localStorage.getItem("currentRoadmap") || "{}"),
        milestones: updated,
      }),
    )
  }

  const filteredRoadmap = roadmap.filter((m) => (filter === "all" ? true : m.status === filter))

  const completedCount = roadmap.filter((m) => m.status === "completed").length
  const progress = roadmap.length > 0 ? Math.round((completedCount / roadmap.length) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl font-bold text-foreground">Your Learning Roadmap</h1>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Dashboard
              </Button>
            </Link>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{progress}% Complete</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {["all", "completed", "pending"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f as any)}
              className={filter === f ? "bg-primary" : ""}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        {/* Roadmap Cards */}
        <div className="space-y-4">
          {filteredRoadmap.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No {filter} topics to display</p>
            </Card>
          ) : (
            filteredRoadmap.map((milestone) => (
              <Card key={milestone.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-foreground">{milestone.topic}</h3>
                      {milestone.status === "completed" && (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-muted-foreground mb-4">{milestone.description}</p>
                    <p className="text-sm text-muted-foreground mb-4">Estimated time: {milestone.duration}</p>

                    {/* Resources */}
                    <div className="space-y-2">
                      {milestone.resources.map((resource, idx) => (
                        <a
                          key={idx}
                          href={resource.url || "#"}
                          className="flex items-center gap-2 text-primary hover:underline text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>{resource.title || resource.summary || resource.type}</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant={milestone.status === "completed" ? "default" : "outline"}
                      onClick={() => handleStatusChange(milestone.id, "completed")}
                      className={milestone.status === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant={milestone.status === "pending" && milestone.status !== "completed" ? "outline" : "ghost"}
                      onClick={() => handleStatusChange(milestone.id, "pending")}
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Too Hard
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(milestone.id, "skipped")}>
                      <SkipForward className="w-4 h-4 mr-2" />
                      Skip
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
