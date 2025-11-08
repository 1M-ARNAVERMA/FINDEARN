"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  CheckCircle2,
  AlertCircle,
  SkipForward,
  ExternalLink,
  BarChart3,
  Youtube,
  Github,
  BookOpen,
  MessageCircleQuestion,
  Globe,
} from "lucide-react"
import Navbar from "@/components/navbar"
import Toast from "@/components/toast"

type UiStatus = "pending" | "completed" | "skipped" | "hard"

interface ResourceItem {
  type: string
  title?: string
  summary?: string
  url?: string
}

interface Milestone {
  id: string
  topic: string
  description: string
  duration: string
  resources: ResourceItem[]
  status: UiStatus
}

function getClientId() {
  const key = "findearn_client_id"
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null
  if (!id && typeof window !== "undefined") {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id ?? "server"
}

function mapDbStatusToUi(status?: string): UiStatus {
  if (status === "done") return "completed"
  if (status === "skipped") return "skipped"
  if (status === "hard") return "hard"
  return "pending"
}

function mapUiStatusToDb(
  status: UiStatus
): "pending" | "done" | "skipped" | "hard" {
  if (status === "completed") return "done"
  if (status === "skipped") return "skipped"
  if (status === "hard") return "hard"
  return "pending"
}

/** -------- grouped resources helpers -------- */
const SOURCE_ORDER = ["youtube", "github", "books", "stackexchange", "wikipedia"] as const
const SOURCE_LABEL: Record<string, string> = {
  youtube: "YouTube Videos",
  github: "GitHub Repos",
  books: "Google Books",
  stackexchange: "Stack Exchange",
  wikipedia: "Wikipedia",
}
const SOURCE_ICON: Record<string, React.ReactNode> = {
  youtube: <Youtube className="w-4 h-4" />,
  github: <Github className="w-4 h-4" />,
  books: <BookOpen className="w-4 h-4" />,
  stackexchange: <MessageCircleQuestion className="w-4 h-4" />,
  wikipedia: <Globe className="w-4 h-4" />,
}

function groupResources(items: ResourceItem[]) {
  const groups: Record<string, ResourceItem[]> = {}
  for (const it of items) {
    const key = (it.type || "").toLowerCase()
    if (!groups[key]) groups[key] = []
    groups[key].push(it)
  }
  return groups
}

export default function RoadmapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [roadmap, setRoadmap] = useState<Milestone[]>([])
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all")
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const roadmapId = searchParams.get("rid") || ""
  const clientIdFromUrl = searchParams.get("cid") || ""

  const supabase = useMemo(() => {
    const cid = clientIdFromUrl || getClientId()
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      { global: { headers: { "x-client-id": cid } } }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientIdFromUrl])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const cid = clientIdFromUrl || getClientId()
        if (!roadmapId || !cid) {
          setLoading(false)
          return
        }

        const { data: milestones, error: mErr } = await supabase
          .from("milestones")
          .select("*")
          .eq("roadmap_id", roadmapId)
          .order("order_index")
        if (mErr) throw mErr

        const ids = (milestones || []).map((m: any) => m.id)
        let resources: any[] = []
        if (ids.length) {
          const { data: resData, error: rErr } = await supabase
            .from("resources")
            .select("*")
            .in("milestone_id", ids)
          if (rErr) throw rErr
          resources = resData || []
        }

        const merged: Milestone[] =
          (milestones || []).map((m: any) => ({
            id: m.id,
            topic: m.title,
            description: m.description || "",
            duration: (m.est_hours ? `${m.est_hours}` : "2") + " hrs",
            status: mapDbStatusToUi(m.status),
            resources: (resources || [])
              .filter((r) => r.milestone_id === m.id)
              .map((r) => ({
                type: (r.source || "").toLowerCase(),
                title: r.title,
                url: r.url,
                summary: r.meta?.extract,
              })),
          })) ?? []

        setRoadmap(merged)
      } catch (e) {
        console.error(e)
        setToast({ message: "Failed to load roadmap", type: "error" })
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmapId, clientIdFromUrl])

  const handleStatusChange = async (id: string, newStatus: UiStatus) => {
    // optimistic UI
    const updated = roadmap.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    setRoadmap(updated)

    try {
      const dbStatus = mapUiStatusToDb(newStatus)
      const { error: uErr } = await supabase.from("milestones").update({ status: dbStatus }).eq("id", id)
      if (uErr) throw uErr

      const cid = clientIdFromUrl || getClientId()
      await supabase.from("feedback").insert({
        milestone_id: id,
        client_id: cid,
        action: dbStatus, // 'done' | 'skipped' | 'hard' | 'pending'
      })

      const messages: Record<UiStatus, string> = {
        completed: "Marked as done! Great work!",
        hard: "Marked as hard. We'll adapt recommendations.",
        skipped: "Marked as skipped. We'll adjust your plan.",
        pending: "Set back to pending.",
      }
      setToast({ message: messages[newStatus], type: "success" })
    } catch (e) {
      console.error(e)
      setToast({ message: "Failed to update progress", type: "error" })
      // on error you could refetch; for now, leave optimistic state
    }
  }

  const filteredRoadmap = useMemo(
    () => roadmap.filter((m) => (filter === "all" ? true : m.status === filter)),
    [roadmap, filter]
  )

  const completedCount = useMemo(() => roadmap.filter((m) => m.status === "completed").length, [roadmap])
  const progress = roadmap.length > 0 ? Math.round((completedCount / roadmap.length) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl font-bold text-foreground">Your Learning Roadmap</h1>
            <Link href={`/dashboard?rid=${roadmapId}&cid=${clientIdFromUrl || getClientId()}`}>
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
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{progress}% Complete</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {["all", "completed", "pending"].map((f) => (
            <Button
              key={f}
              variant={filter === (f as "all" | "completed" | "pending") ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f as "all" | "completed" | "pending")}
              className={filter === f ? "bg-primary" : ""}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        {/* Roadmap Cards */}
        <div className="space-y-4">
          {loading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading your roadmap…</p>
            </Card>
          ) : filteredRoadmap.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No {filter} topics to display</p>
            </Card>
          ) : (
            filteredRoadmap.map((milestone) => {
              const groups = groupResources(milestone.resources)
              return (
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
                      <p className="text-sm text-muted-foreground mb-6">Estimated time: {milestone.duration}</p>

                      {/* Grouped Resources */}
                      <div className="space-y-5">
                        {SOURCE_ORDER.map((key) => {
                          const items = groups[key]
                          if (!items || items.length === 0) return null
                          return (
                            <div key={key}>
                              <div className="flex items-center gap-2 mb-2 font-medium">
                                {SOURCE_ICON[key]}
                                <span>{SOURCE_LABEL[key]}</span>
                              </div>
                              <ul className="ml-1 space-y-1">
                                {items.map((resource, idx) => (
                                  <li key={idx}>
                                    <a
                                      href={resource.url || "#"}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 text-primary hover:underline text-sm"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                      <span>{resource.title || resource.summary || "Link"}</span>
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      {/* DONE → green */}
                      <Button
                        size="sm"
                        variant={milestone.status === "completed" ? "default" : "outline"}
                        onClick={() => handleStatusChange(milestone.id, "completed")}
                        className={milestone.status === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Done
                      </Button>

                      {/* TOO HARD → red */}
                      <Button
                        size="sm"
                        variant={milestone.status === "hard" ? "default" : "outline"}
                        onClick={() => handleStatusChange(milestone.id, "hard")}
                        className={milestone.status === "hard" ? "bg-red-500 hover:bg-red-600" : ""}
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Too Hard
                      </Button>

                      {/* SKIP → yellow */}
                      <Button
                        size="sm"
                        variant={milestone.status === "skipped" ? "default" : "outline"}
                        onClick={() => handleStatusChange(milestone.id, "skipped")}
                        className={milestone.status === "skipped" ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}
                      >
                        <SkipForward className="w-4 h-4 mr-2" />
                        Skip
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
