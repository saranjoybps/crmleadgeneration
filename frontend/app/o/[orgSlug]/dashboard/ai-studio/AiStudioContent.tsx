"use client";

import { useState } from "react";
import { Wand2, LayoutGrid, PlusCircle, CalendarDays, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ContentList from "./components/ContentList";
import ContentCalendar from "./components/ContentCalendar";
import BlogEditor from "./components/BlogEditor";
import PosterCanvas from "./components/PosterCanvas";
import SocialPostEditor from "./components/SocialPostEditor";
import EmailEditor from "./components/EmailEditor";
import AIPromptPanel from "./components/AIPromptPanel";
import type { StudioContent, ContentType } from "./types";
import { MOCK_CONTENTS } from "./data";

type StudioTab = "content" | "create" | "calendar" | "ai";
type CreateSubTab = ContentType;

type ContentModalState =
  | { type: "create"; contentType: ContentType }
  | { type: "edit"; item: StudioContent }
  | null;

export default function AiStudioContent() {
  const [activeTab, setActiveTab] = useState<StudioTab>("content");
  const [createSubTab, setCreateSubTab] = useState<CreateSubTab>("blog");
  const [contents, setContents] = useState<StudioContent[]>(MOCK_CONTENTS);
  const [modal, setModal] = useState<ContentModalState>(null);

  function addContent(content: StudioContent) {
    setContents((prev) => [content, ...prev]);
    setModal(null);
  }

  function updateContent(id: string, updates: Partial<StudioContent>) {
    setContents((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    setModal(null);
  }

  function deleteContent(id: string) {
    setContents((prev) => prev.filter((c) => c.id !== id));
  }

  function publishContent(id: string) {
    setContents((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: "published" as const, publishedAt: new Date().toISOString() }
          : c,
      ),
    );
  }

  function archiveContent(id: string) {
    setContents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "archived" as const } : c)),
    );
  }

  function handleEdit(item: StudioContent) {
    setModal({ type: "edit", item });
    setCreateSubTab(item.type);
  }

  function handleCreateNew(type: ContentType) {
    setModal({ type: "create", contentType: type });
    setCreateSubTab(type);
  }

  function handleAIGenerated(text: string) {
    const lines = text.split("\n");
    const title = lines[0].slice(0, 60) || "AI Generated Content";
    addContent({
      id: `c${Date.now()}`,
      title,
      type: "blog",
      status: "draft",
      platforms: [],
      scheduledAt: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      body: text,
      tags: ["ai-generated"],
    });
  }

  const TABS: { key: StudioTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "content", label: "All Content", icon: LayoutGrid },
    { key: "create", label: "Create", icon: PlusCircle },
    { key: "calendar", label: "Calendar", icon: CalendarDays },
    { key: "ai", label: "AI Studio", icon: Sparkles },
  ];

  const CREATE_SUB_TABS: { key: CreateSubTab; label: string }[] = [
    { key: "blog", label: "Blog" },
    { key: "poster", label: "Poster" },
    { key: "social", label: "Social" },
    { key: "email", label: "Email" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg">
          <Wand2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">AI Studio</h1>
          <p className="text-xs text-slate-500">Create, schedule and publish content across all your platforms</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                activeTab === tab.key
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "content" && (
        <ContentList
          contents={contents}
          onEdit={handleEdit}
          onDelete={deleteContent}
          onPublish={publishContent}
          onArchive={archiveContent}
        />
      )}

      {activeTab === "create" && (
        <div className="space-y-5">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {CREATE_SUB_TABS.map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setCreateSubTab(st.key)}
                className={cn(
                  "flex-1 rounded-lg px-4 py-2 text-xs font-bold transition-all",
                  createSubTab === st.key
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {st.label}
              </button>
            ))}
          </div>

          {createSubTab === "blog" && (
            <BlogEditor
              onSave={addContent}
              onCancel={() => setActiveTab("content")}
            />
          )}
          {createSubTab === "poster" && (
            <PosterCanvas
              onSave={addContent}
              onCancel={() => setActiveTab("content")}
            />
          )}
          {createSubTab === "social" && (
            <SocialPostEditor
              onSave={addContent}
              onCancel={() => setActiveTab("content")}
            />
          )}
          {createSubTab === "email" && (
            <EmailEditor
              onSave={addContent}
              onCancel={() => setActiveTab("content")}
            />
          )}
        </div>
      )}

      {activeTab === "calendar" && (
        <ContentCalendar
          contents={contents}
          onEdit={handleEdit}
        />
      )}

      {activeTab === "ai" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AIPromptPanel
              onGenerated={handleAIGenerated}
              className="border-0 shadow-none bg-transparent"
            />
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                <Sparkles className="h-4 w-4 text-violet-600" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                {(["blog", "poster", "social", "email"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setActiveTab("create"); setCreateSubTab(type); }}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-600 transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                  >
                    <PlusCircle className="h-4 w-4 text-violet-500" />
                    Create New {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-bold text-slate-700">Stats</h3>
              <div className="space-y-3">
                {([
                  { label: "Total Content", value: contents.length, color: "text-violet-600" },
                  { label: "Published", value: contents.filter((c) => c.status === "published").length, color: "text-emerald-600" },
                  { label: "Scheduled", value: contents.filter((c) => c.status === "scheduled").length, color: "text-blue-600" },
                  { label: "Drafts", value: contents.filter((c) => c.status === "draft").length, color: "text-slate-600" },
                ] as const).map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{stat.label}</span>
                    <span className={cn("text-sm font-bold", stat.color)}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal?.type === "edit" && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Edit Content</h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            {modal.item.type === "blog" && (
              <BlogEditor
                key={modal.item.id}
                editItem={modal.item}
                onSave={(updated) => updateContent(modal.item.id, updated)}
                onCancel={() => setModal(null)}
              />
            )}
            {modal.item.type === "poster" && (
              <PosterCanvas
                key={modal.item.id}
                editItem={modal.item}
                onSave={(updated) => updateContent(modal.item.id, updated)}
                onCancel={() => setModal(null)}
              />
            )}
            {modal.item.type === "social" && (
              <SocialPostEditor
                key={modal.item.id}
                editItem={modal.item}
                onSave={(updated) => updateContent(modal.item.id, updated)}
                onCancel={() => setModal(null)}
              />
            )}
            {modal.item.type === "email" && (
              <EmailEditor
                key={modal.item.id}
                editItem={modal.item}
                onSave={(updated) => updateContent(modal.item.id, updated)}
                onCancel={() => setModal(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
