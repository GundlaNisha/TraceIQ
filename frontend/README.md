# TraceIQ — Frontend

The frontend for TraceIQ is built with Next.js 16 (App Router), React 19, Tailwind CSS v4, and shadcn/ui. State management and data fetching are handled by Zustand and TanStack Query.

## Setup

1. Make sure you have Node.js installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Mock Data Mode

During parallel development with the backend, the frontend supports a Mock Data Layer.
Ensure `NEXT_PUBLIC_USE_MOCK=true` is set in your `.env.local` file to bypass actual API calls and use the local mock fixtures located in `lib/mock-data/`.
