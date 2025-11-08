"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/navbar";
import Toast from "@/components/toast";
import LoadingSpinner from "@/components/loading-spinner";

// Generate or retrieve client ID (stored locally; used by RLS policies)
function getClientId() {
  const key = "findearn_client_id";
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!id && typeof window !== "undefined") {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id!;
}

export default function GoalInputPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    topic: "",
    exam: "",
    timeValue: "",
    timeUnit: "weeks",
    difficulty: "intermediate",
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.topic || !formData.exam || !formData.timeValue) {
      setToast({ message: "Please fill in all required fields", type: "error" });
      return;
    }

    try {
      setLoading(true);
      const clientId = getClientId();

      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.topic,
          exam: formData.exam,
          timeValue: Number(formData.timeValue),
          timeUnit: formData.timeUnit as "days" | "weeks" | "months",
          difficulty: formData.difficulty as "beginner" | "intermediate" | "advanced",
          clientId,
        }),
      });

      const json = await res.json();
      setLoading(false);

      if (json.roadmapId) {
        router.push(`/roadmap?rid=${json.roadmapId}&cid=${clientId}`);
      } else {
        setToast({ message: json.error || "Failed to generate", type: "error" });
      }
    } catch (err) {
      setLoading(false);
      setToast({ message: "Server error, try again", type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-2xl p-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Set Your Learning Goal</h1>
          <p className="text-muted-foreground mb-8">
            Tell us about your exam preparation and we'll create a personalized roadmap.
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
                  min={1}
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
      {toast && <Toast message={toast.message} type="success" />}
    </div>
  );
}
