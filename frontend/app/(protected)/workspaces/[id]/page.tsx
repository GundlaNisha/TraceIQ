import WorkspaceDetailClient from "./page.client";

export const metadata = {
  title: "Workspace",
  description: "Manage your team workspace members and settings.",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkspaceDetailPage({ params }: Props) {
  const { id } = await params;
  return <WorkspaceDetailClient workspaceId={id} />;
}
