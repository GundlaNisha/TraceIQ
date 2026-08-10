"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequirements, useRequirementVersions } from "../api/queries";
import { useTriggerAnalysis } from "@/features/analysis/api/queries";
import { type Requirement, type RequirementVersion } from "@/lib/types/api";
import { Button } from "@/components/ui/button";

export function RequirementList() {
  const { data: requirements, isLoading } = useRequirements();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: versions } = useRequirementVersions(selectedId);
  const { mutate: triggerAnalysis, isPending: isAnalyzing } = useTriggerAnalysis();
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

  return (
    <div className="flex gap-6">
      {/* Main table */}
      <div className="flex-1 rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Title
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Version
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Updated
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {requirements.map((req: Requirement) => (
              <tr
                key={req.id}
                className={`border-b last:border-0 hover:bg-gray-50 cursor-pointer ${selectedId === req.id ? "bg-blue-50" : ""}`}
                onClick={() =>
                  setSelectedId(req.id === selectedId ? null : req.id)
                }
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {req.title}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  v{req.version_number}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {req.updated_at ? new Date(req.updated_at).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Version history panel */}
      {selectedId && versions && (
        <div className="w-72 rounded-lg border bg-white p-4 flex flex-col gap-3 self-start">
          <h3 className="font-medium text-gray-900 text-sm">Version History</h3>
          {versions.map((v: RequirementVersion) => (
            <div
              key={v.version_number}
              className="border-l-2 border-gray-200 pl-3"
            >
              <div className="text-xs font-medium text-gray-700">
                v{v.version_number}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(v.created_at).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                {v.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
