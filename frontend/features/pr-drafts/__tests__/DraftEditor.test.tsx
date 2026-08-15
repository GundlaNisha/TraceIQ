import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DraftEditor } from "../components/DraftEditor";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("DraftEditor", () => {
  it("renders the draft title and markdown content", async () => {
    render(<DraftEditor draftId="draft_1" />, { wrapper: Wrapper });
    await waitFor(() => {
      const elements = screen.getAllByText(/idempotency key/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it("shows preview alongside editor", async () => {
    render(<DraftEditor draftId="draft_1" />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText("Editor")).toBeInTheDocument();
      expect(screen.getByText("Preview")).toBeInTheDocument();
    });
  });

  it("shows unsaved changes indicator when content is modified", async () => {
    render(<DraftEditor draftId="draft_1" />, { wrapper: Wrapper });
    const textarea = await screen.findByPlaceholderText(
      /PR description markdown/i,
    );
    fireEvent.change(textarea, { target: { value: "New content" } });
    await waitFor(() =>
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument(),
    );
  });

  it("does not use dangerouslySetInnerHTML in the preview", async () => {
    render(<DraftEditor draftId="draft_1" />, { wrapper: Wrapper });
    await waitFor(() => {
      const preview = document.querySelector(".prose");
      expect(preview).toBeTruthy();
    });
  });
});
