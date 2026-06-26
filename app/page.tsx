import CommunityDashboard from "@/components/CommunityDashboard";
import { getAllDistricts, getTopPriorityDistrict } from "@/lib/communityData";

export default function Home() {
  const districts = getAllDistricts();
  const defaultDistrict = getTopPriorityDistrict();

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24">
      <CommunityDashboard
        districts={[...districts]}
        defaultDistrict={defaultDistrict}
      />
    </main>
  );
}
