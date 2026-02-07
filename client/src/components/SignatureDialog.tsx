import { useState, useEffect } from "react";
import api from "../api/client";

interface Props {
  issueId: string;
  stageId: string;
  stageName: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function SignatureDialog({
  issueId,
  stageId,
  stageName,
  onComplete,
  onCancel,
}: Props) {
  const [meanings, setMeanings] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [meaning, setMeaning] = useState("");
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/signatures/meanings").then((res) => {
      setMeanings(res.data.meanings);
      if (res.data.meanings.length > 0) setMeaning(res.data.meanings[0]);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("You must agree to the legal acknowledgment.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api.post("/signatures", {
        issue_id: issueId,
        workflow_stage_id: stageId,
        password,
        signature_meaning: meaning,
        signature_reason: reason || undefined,
      });
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to apply signature");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content sig-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Electronic Signature</h2>
        <p className="text-muted">
          Signing stage: <strong>{stageName}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Signature Meaning</label>
            <select value={meaning} onChange={(e) => setMeaning(e.target.value)}>
              {meanings.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Password (re-authentication)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password to confirm"
            />
          </div>
          <div className="form-group">
            <label>Comments / Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <div className="sig-legal">
            <label>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />{" "}
              I understand that this electronic signature is legally binding and
              equivalent to a handwritten signature. This action cannot be undone.
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !agreed || !password}
            >
              {submitting ? "Signing..." : "Apply Signature"}
            </button>
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
