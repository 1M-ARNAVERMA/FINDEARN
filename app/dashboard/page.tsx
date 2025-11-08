"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, BarChart3, CheckCircle2, Clock, Target } from "lucide-react"
import Navbar from "@/components/navbar"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface Milestone {
  id: number
  topic: string
  status: "pending" | "completed" | "skipped"
}

export default function DashboardPage() {
  const [roadmapData, setRoadmapData] = useState<any>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])

  useEffect(() => {
    const saved = localStorage.getItem("currentRoadmap")
    if (saved) {
      const data = JSON.parse(saved)
      setRoadmapData(data)
      setMilestones(data.milestones || [])
    }
  }, [])

  const stats = {
    total: milestones.length,
    completed: milestones.filter((m) => m.status === "completed").length,
    pending: milestones.filter((m) => m.status === "pending").length,
    skipped: milestones.filter((m) => m.status === "skipped").length,
  }

  const completionPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  const chartData = [
    { name: "Completed", value: stats.completed, fill: "#22c55e" },
    { name: "Pending", value: stats.pending, fill: "#eab308" },
    { name: "Skipped", value: stats.skipped, fill: "#ef4444" },
  ]

  const timelineData = [
    { week: "Week 1", progress: 25 },
    { week: "Week 2", progress: 50 },
    { week: "Week 3", progress: 75 },
    { week: "Week 4", progress: completionPercentage },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Learning Dashboard</h1>
          <Link href="/roadmap">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Roadmap
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Topics</p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-500">{stats.completed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-500">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completion</p>
                <p className="text-3xl font-bold text-primary">{completionPercentage}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Topic Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Progress Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="progress" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recommended Next Step */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h2 className="text-lg font-semibold text-foreground mb-2">Recommended Next Step</h2>
          <p className="text-muted-foreground mb-4">
            {stats.pending > 0
              ? "Continue with your pending topics to maintain momentum."
              : "Great work! All topics are covered. Review completed topics to reinforce your learning."}
          </p>
          <Link href="/roadmap">
            <Button className="bg-primary hover:bg-primary/90">Continue Learning</Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}
