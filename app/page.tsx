import CommunityDashboard from "@/components/CommunityDashboard";
import DataLoadError from "@/components/DataLoadError";
import { loadCommunityDataSafe } from "@/lib/communityData";

export default function Home() {
  const result = loadCommunityDataSafe();

  if (!result.success) {
    return <DataLoadError message={result.error} />;
  }

  const { districts, defaultDistrict } = result.data;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
      <CommunityDashboard
        districts={[...districts]}
        defaultDistrict={defaultDistrict}
        districtCount={result.data.meta.district_count}
        meta={result.data.meta}
      />
    </main>
  );
}
