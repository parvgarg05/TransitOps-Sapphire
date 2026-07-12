"use client";

/**
 * VehicleDocuments
 *
 * Lists documents for a vehicle and provides a small form to add a new
 * document (metadata only: filename + url).
 *
 * Requirements: 14.1, 14.2
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VehicleDocument {
  id: string;
  vehicleId: string;
  filename: string;
  url: string;
  uploadedAt: string;
}

interface VehicleDocumentsProps {
  vehicleId: string;
}

export function VehicleDocuments({ vehicleId }: VehicleDocumentsProps) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filename, setFilename] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/documents`);
      if (!res.ok) {
        throw new Error("Failed to load documents");
      }
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch {
      setError("Unable to load documents. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (filename.trim().length === 0 || url.trim().length === 0) {
      setError("Both filename and URL are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: filename.trim(), url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add document");
      }

      setFilename("");
      setUrl("");
      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add document."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg bg-surface-card border border-hairline p-4">
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="doc-filename">Filename</Label>
          <Input
            id="doc-filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="registration.pdf"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="doc-url">URL</Label>
          <Input
            id="doc-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/registration.pdf"
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding..." : "Add Document"}
        </Button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents yet. Add one using the form above.
          </p>
        ) : (
          <ul className="divide-y divide-hairline border-t border-hairline">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
                >
                  {doc.filename}
                </a>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(doc.uploadedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
