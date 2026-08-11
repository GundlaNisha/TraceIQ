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
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Code Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered pre-reviews for your commits.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>New Review</Button>
      </div>

      <CreateReviewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {isLoading ? (
        <div className="text-center text-sm text-gray-400 py-12">
          Loading reviews...
        </div>
      ) : reviews?.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-12 border rounded-lg bg-gray-50 border-dashed">
          No reviews yet. Start a new one to review your code!
        </div>
      ) : (
        <div className="grid gap-3">
          {reviews?.map((review: any) => (
            <Link
              key={review.id}
              href={`/reviews/${review.id}`}
              className="block bg-white border rounded-lg p-4 hover:border-gray-400 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                    {review.commit_hash.substring(0, 7)}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                      review.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : review.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {review.status}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {formatDistanceToNow(parseUTCDate(review.created_at), { addSuffix: true })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
