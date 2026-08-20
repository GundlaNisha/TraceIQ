"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequirements, useRequirementVersions } from "../api/queries";
import { useTriggerAnalysis } from "@/features/analysis/api/queries";
import { type Requirement, type RequirementVersion } from "@/lib/types/api";
import { Button } from "@/components/ui/button";

import { RequirementForm } from "./RequirementForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDeleteRequirement } from "../api/queries";
import { Trash2, Edit2 } from "lucide-react";
import { parseUTCDate, formatTimeAgo, formatDateTime } from "@/lib/utils";

export function RequirementList() {
  const { data: requirements, isLoading } = useRequirements();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { data: versions } = useRequirementVersions(selectedId);
  const { mutate: triggerAnalysis, isPending: isAnalyzing } = useTriggerAnalysis();
  const { mutate: deleteRequirement, isPending: isDeleting } = useDeleteRequirement();
  const router = useRouter();

  if (isLoading)
    return (
      <div className="text-sm text-gray-500 py-8 text-center">
        Loading requirements...
      </div>
    );
  if (!requirements?.length)
    return (
      <div className="text-sm text-gray-400 py-8 text-center">
        No requirements yet.
      </div>
    );

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  return (
    <div className="flex gap-8">
      {/* Main table */}
      <div className="flex-1 rounded-2xl border border-border/40 bg-white/80 backdrop-blur-md shadow-sm overflow-hidden h-max">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/50 border-b border-border/40">
            <tr>
              <th className="text-left px-6 py-4 font-semibold text-muted text-xs tracking-wider uppercase">
                Title
              </th>
              <th className="text-left px-6 py-4 font-semibold text-muted text-xs tracking-wider uppercase">
                Version
              </th>
              <th className="text-left px-6 py-4 font-semibold text-muted text-xs tracking-wider uppercase">
                Updated
              </th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((req: Requirement) => (
              <tr
                key={req.id}
                className={`border-b border-border/40 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors group ${selectedId === req.id ? "bg-accent/5" : ""}`}
                onClick={() =>
                  setSelectedId(req.id === selectedId ? null : req.id)
                }
              >
                <td className="px-6 py-4 font-semibold text-foreground">
                  {req.title}
                  {selectedId === req.id && <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-accent text-white uppercase tracking-wider">Viewing</span>}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 text-muted rounded-md text-xs font-mono font-medium">v{req.version_number}</span>
                </td>
                <td className="px-6 py-4 text-muted text-xs font-medium" title={formatDateTime(req.updated_at)}>
                  {req.updated_at ? formatTimeAgo(req.updated_at) : 'Never'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isAnalyzing}
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerAnalysis(req.id, {
                          onSuccess: (data) => {
                            router.push(`/analysis/${data.job_id}`);
                          },
                          onError: (error) => {
                            console.error("Failed to trigger analysis", error);
                          }
                        });
                      }}
                    >
                      Analyze
                    </Button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingReq(req);
                      }}
                      className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      title="Edit Requirement"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, req.id)}
                      disabled={isDeleting}
                      className="p-2 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete Requirement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Version history panel */}
      {selectedId && (
        <div className="w-96 rounded-2xl border border-border/40 bg-white/80 backdrop-blur-md shadow-sm p-6 flex flex-col gap-4 self-start">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold font-serif text-foreground text-lg tracking-tight">Version History</h3>
            {versions && <span className="text-xs text-muted font-medium">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>}
          </div>
          
          {!versions ? (
            <div className="text-xs text-muted animate-pulse py-4 text-center">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-xs text-muted py-4 text-center">No previous versions.</div>
          ) : (
            <div className="flex flex-col gap-4 mt-2 max-h-[600px] overflow-y-auto pr-1">
              {versions.map((v: RequirementVersion, index: number) => (
                <div
                  key={v.id || v.version_number}
                  className={`border-l-2 pl-4 pb-4 ${index !== versions.length - 1 ? 'border-accent/20' : 'border-transparent'}`}
                >
                  <div className="flex items-center gap-2 mb-1 -ml-[21px]">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent border-2 border-white ring-2 ring-accent/20" />
                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span>v{v.version_number}</span>
                      {v.title && <span className="font-normal text-muted text-xs truncate max-w-[180px]">({v.title})</span>}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-muted mb-2">
                    {formatDateTime(v.created_at)}
                  </div>
                  <div className="text-xs text-foreground/90 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-border/40 font-mono whitespace-pre-wrap">
                    {v.text || "No text content recorded."}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingReq} onOpenChange={(open) => !open && setEditingReq(null)}>
        <DialogContent className="sm:max-w-lg bg-white p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Edit Requirement</DialogTitle>
          </DialogHeader>
          {editingReq && (
            <RequirementForm 
              initialData={editingReq} 
              onSuccess={() => setEditingReq(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">Are you sure you want to delete this requirement? This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              disabled={isDeleting}
              onClick={() => {
                if (deleteConfirmId) {
                  deleteRequirement(deleteConfirmId, {
                    onSuccess: () => {
                      if (selectedId === deleteConfirmId) setSelectedId(null);
                      setDeleteConfirmId(null);
                    }
                  });
                }
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
