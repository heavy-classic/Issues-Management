import { useState, useEffect } from "react";
import api from "../api/client";

export default function AdminInstructionsPage() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/settings/issue_instructions")
      .then((res) => { setValue(res.data.value); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setError("");
    setSaved(false);
    try {
      await api.put("/settings/issue_instructions", { value });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save instructions.");
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Issue Submission Instructions</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            This text appears at the top of the New Issue form. Use line breaks to separate paragraphs and bullet points.
          </p>
        </div>
        <button
          className="btn-submit"
          style={{ fontSize: 13, padding: "8px 20px", whiteSpace: "nowrap" }}
          onClick={handleSave}
        >
          {saved ? "✓ Saved" : "Save →"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {/* Live preview */}
      {value && (
        <div className="if-instructions" style={{ marginBottom: 16 }}>
          <div className="if-inst-icon">ℹ</div>
          <div className="if-inst-body">
            {value.split("\n").map((line, i) =>
              line.trim() === "" ? (
                <div key={i} style={{ height: 6 }} />
              ) : (
                <p key={i} style={{ margin: 0, lineHeight: 1.6 }}>{line}</p>
              )
            )}
          </div>
        </div>
      )}

      <div className="form-group">
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
          Instructions text — plain text, line breaks preserved
        </label>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={18}
          style={{
            width: "100%",
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 1.7,
            padding: "12px 14px",
            border: "1.5px solid #e0e7ff",
            borderRadius: 8,
            background: "#fafaff",
            color: "#1e1b4b",
            resize: "vertical",
          }}
          placeholder="Enter instructions that will appear at the top of the new issue form…"
        />
      </div>

      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
        Tip: Use bullet points like "• Item" and blank lines between sections for readability.
      </div>
    </div>
  );
}
