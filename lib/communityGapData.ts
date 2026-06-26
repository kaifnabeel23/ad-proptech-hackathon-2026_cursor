/**
 * @deprecated Use @/lib/communityData instead.
 * Re-exports for backward compatibility with docs and API helpers.
 */
export {
  communityMeta,
  DEFAULT_DISTRICT_NAME,
  formatNumber,
  formatScore,
  getAllDistricts,
  getDemoDistricts,
  getDistrictByName,
  getPriorityLabel,
  getTopPriorityDistrict,
  loadCommunityDataSafe,
} from "./communityData";

export type { CommunityDataLoadResult, SafeCommunityData } from "./communityData";
