import { User, getUsersByAddress } from "@/app/utils/privyApi";
import ProfileNavigation from "@/app/components/ProfileNavigation";
import ProfileOptions from "@/app/components/ProfileOptions";
import ProfileSummary from "@/app/components/ProfileSummary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const userMap: Record<string, User> = JSON.parse(
    await getUsersByAddress([address]),
  );

  const profileAddr = address.toLowerCase();
  const twitterInfo = userMap[profileAddr];

  const shareTitle = twitterInfo
    ? `${twitterInfo.name} | RIVES`
    : `${profileAddr} | RIVES`;
  const desc = twitterInfo
    ? `Profile "${twitterInfo.name}"`
    : `Profile "${profileAddr}"`;

  return {
    title: twitterInfo ? twitterInfo.name : profileAddr,
    openGraph: {
      siteName: "rives.io",
      title: shareTitle,
      description: desc,
    },
    twitter: {
      title: shareTitle,
      card: "summary",
      creator: "@rives_io",
      description: desc,
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const userMap: Record<string, User> = JSON.parse(
    await getUsersByAddress([address]),
  );
  const twitterInfo = userMap[address.toLowerCase()];

  return (
    <main>
      <section className="flex flex-col items-center gap-8">
        <div className="flex flex-wrap gap-8 items-center justify-center">
          <div className="flex flex-col gap-2">
            <ProfileOptions address={address} twitterInfo={twitterInfo} />
          </div>
          <ProfileSummary address={address} />
        </div>

        <div className="w-full flex flex-wrap gap-8">
          <div
            className="
                    flex-1"
          >
            <div className="w-full flex flex-col gap-2">
              <ProfileNavigation address={address} twitterInfo={twitterInfo} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
