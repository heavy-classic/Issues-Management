import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

interface Comment {
  id: string;
  lesson_id: string;
  author_id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

interface Props {
  lessonId: string;
  comments: Comment[];
  onUpdate: () => void;
}

export default function LessonCommentThread({ lessonId, comments, onUpdate }: Props) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      await api.post(`/lessons/${lessonId}/comments`, { body });
      setBody("");
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await api.delete(`/lessons/${lessonId}/comments/${commentId}`);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete comment");
    }
  }

  function getInitials(name: string | null, email: string): string {
    if (name) {
      return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  }

  return (
    <div className="comment-thread">
      <h3>Comments <span className="section-count-badge">{comments.length}</span></h3>

      {error && <p className="error">{error}</p>}

      {comments.length === 0 && (
        <p className="text-muted">No comments yet.</p>
      )}

      {comments.map((c) => (
        <div key={c.id} className="comment">
          <div className="comment-avatar">
            {getInitials(c.author_name, c.author_email)}
          </div>
          <div className="comment-content">
            <div className="comment-header">
              <strong>{c.author_name || c.author_email}</strong>
              <span className="text-muted">
                {new Date(c.created_at).toLocaleString()}
              </span>
              {user?.userId === c.author_id && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="btn btn-danger btn-sm"
                >
                  Delete
                </button>
              )}
            </div>
            <p className="comment-body">{c.body}</p>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
        />
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={submitting || !body.trim()}
        >
          {submitting ? "Posting..." : "Add Comment"}
        </button>
      </form>
    </div>
  );
}
