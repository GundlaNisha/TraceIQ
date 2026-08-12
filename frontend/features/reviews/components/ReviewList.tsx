"use client";
import { useState } from "react";
import { useReviews } from "../api/queries";
import { CreateReviewModal } from "./CreateReviewModal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { parseUTCDate } from "@/lib/utils";

export function ReviewList() {
  const { data: reviews, isLoading } = useReviews();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="w-full">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-semibold font-serif text-foreground tracking-tight">Code Reviews</h1>
          <p className="text-lg text-muted mt-2">
            AI-powered pre-reviews for your commits.
          </p>
        </div>
        <Button size="lg" className="shadow-sm" onClick={() => setIsModalOpen(true)}>New Review</Button>
      </header>

      <CreateReviewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-medium">Loading reviews...</p>
        </div>
      ) : reviews?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-white/50 border border-border/40 shadow-sm backdrop-blur-sm">
          <div className="w-12 h-12 bg-accent/5 rounded-full flex items-center justify-center text-accent mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold font-serif text-foreground mb-1">No reviews yet</h3>
          <p className="text-muted text-sm max-w-sm">Start a new code review to let AI analyze your recent commits and find bugs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews?.map((review: any) => (
            <Link
              key={review.id}
              href={`/reviews/${review.id}`}
              className="group flex flex-col bg-white/80 backdrop-blur-sm border border-border/40 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-accent/30 transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-max capitalize ${
                      review.status === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : review.status === "failed"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {review.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                    {review.status}
                  </span>
                  <span className="font-mono text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                    {review.commit_hash.substring(0, 7)}
                  </span>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-border/40 flex justify-between items-center text-xs font-medium text-muted">
                <span>{formatDistanceToNow(parseUTCDate(review.created_at), { addSuffix: true })}</span>
                <span className="text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  View Review <span>&rarr;</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
