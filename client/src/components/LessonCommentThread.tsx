import { useState, useEffect, useCallback, type FormEvent } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Comment {
  id: string;
  lesson_id: string;
  author_id: string;
  author_name: string | null;
  author_email: string;
  body: string;
  created_at: string;
}

interface Props {
  lessonId: string;
}

export default function LessonCommentThread({ lessonId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get(`/lessons/${lessonId}/comments`);
      setComments(res.data.comments);
    } catch {
      // ignore
    }
  }, [lessonId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/lessons/${lessonId}/comments`, { body });
      setBody("");
      fetchComments();
    } catch {
      alert("Failed to add comment");
    }
    setSubmitting(false);
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    try {
      await api.delete(`/lessons/${lessonId}/comments/${commentId}`);
      fetchComments();
    } catch {
      alert("Failed to delete comment");
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Comments ({comments.length})</h3>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
          {submitting ? "..." : "Post"}
        </button>
      </form>

      {comments.length === 0 ? (
        <p className="text-muted" style={{ textAlign: "center" }}>No comments yet.</p>
      ) : (
        <div className="comment-list">
          {comments.map((c) => (
            <div key={c.id} className="comment-item" style={{ padding: "0.75rem", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <strong>{c.author_name || c.author_email}</strong>
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: 0 }}>{c.body}</p>
              {user?.userId === c.author_id && (
                <button
                  className="btn-icon btn-danger-icon"
                  onClick={() => handleDelete(c.id)}
                  style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
