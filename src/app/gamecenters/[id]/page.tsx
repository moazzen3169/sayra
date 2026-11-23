import { permanentRedirect } from "next/navigation";

export default async function GamecentersRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/gamecenter/${encodeURIComponent(id)}`);
}
