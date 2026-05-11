"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send, Trash2, User } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users?: { email: string; full_name?: string } | Array<{ email: string; full_name?: string }>;
};

export function TicketComments({ ticketId, orgSlug, currentUserId }: { ticketId: string; orgSlug: string; currentUserId?: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await apiRequest<Comment[]>(`/api/v1/comments/ticket/${ticketId}`, { orgSlug });
    if (data) setComments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [ticketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    const { data, error: apiErr } = await apiRequest<Comment>(`/api/v1/comments/ticket/${ticketId}`, {
      method: "POST",
      orgSlug,
      body: { content: newComment.trim() },
    });

    if (apiErr) {
      error(apiErr);
    } else {
      setNewNewComment("");
      success("Comment posted.");
      fetchComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error: apiErr } = await apiRequest(`/api/v1/comments/${id}`, {
      method: "DELETE",
      orgSlug,
    });
    if (apiErr) error(apiErr);
    else {
      success("Comment deleted.");
      fetchComments();
    }
  };

  const resolveEmail = (c: Comment) => {
    if (Array.isArray(c.users)) return c.users[0]?.email ?? "unknown";
    return c.users?.email ?? "unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-soft pb-4">
        <MessageSquare className="h-5 w-5 text-violet-500" />
        <h4 className="font-bold text-main">Collaboration</h4>
      </div>

      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-slate-50 border border-soft border-dashed">
            <p className="text-sm text-muted">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                {resolveEmail(c)[0].toUpperCase()}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-main">{resolveEmail(c)}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted">May 11, 2026</span>
                    {c.user_id === currentUserId && (
                      <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl rounded-tl-none bg-slate-50 p-3 text-sm text-main border border-soft/50">
                  {c.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative mt-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full rounded-2xl border border-slate-300 bg-white p-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="absolute bottom-4 right-4 rounded-xl bg-violet-600 p-2 text-white shadow-lg shadow-violet-200 transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
