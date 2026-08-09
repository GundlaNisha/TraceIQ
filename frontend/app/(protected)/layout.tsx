import { auth } from "@clerk/nextjs/server";
import ProtectedLayoutClient from "./layout.client";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();

  return (
    <ProtectedLayoutClient>
      {children}
    </ProtectedLayoutClient>
  );
}
