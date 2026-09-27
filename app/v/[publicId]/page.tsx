import PublicVote from "./PublicVote";

export const metadata = {
  title: "Vote live | NIFT Jodhpur Converge 2026",
  robots: { index: false, follow: false },
};

export default async function PublicVotePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <PublicVote publicId={publicId} />;
}
