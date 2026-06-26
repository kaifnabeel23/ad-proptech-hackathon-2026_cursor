"""Configuration for the Community Gap & Confidence Copilot data pipeline."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_DIR = PROJECT_ROOT / "output"

AMENITY_CATEGORIES = [
    "education",
    "healthcare",
    "mobility",
    "retail",
    "community",
    "services",
]

# Core gap score weights — community need + amenity shortage dominate.
GAP_WEIGHTS = {
    "community_need": 0.55,
    "amenity_shortage": 0.35,
    "market_pressure": 0.05,
    "intervention_feasibility": 0.05,
}

COMMUNITY_NEED_WEIGHTS = {
    "service_demand_index": 0.30,
    "mobility_deficit": 0.25,
    "experience_deficit": 0.20,
    "population_pressure": 0.15,
    "occupancy_pressure": 0.10,
}

# Minimum OSM amenities before we trust category-level claims.
MIN_AMENITY_OBSERVATIONS = 5
MIN_TOTAL_AMENITIES_HIGH_CONFIDENCE = 15

INTERVENTION_LABELS = {
    "education_capacity": "Expand education and nursery capacity",
    "healthcare_capacity": "Add clinic and healthcare capacity",
    "mobility_infrastructure": "Accelerate transit and mobility links",
    "retail_expansion": "Expand retail and grocery offering",
    "community_spaces": "Invest in parks, events, and community spaces",
    "essential_services": "Strengthen essential neighbourhood services",
}

OPTIMIZATION_TO_INTERVENTION = {
    "expand_school_capacity": "education_capacity",
    "add_nursery_capacity": "education_capacity",
    "add_clinic_capacity": "healthcare_capacity",
    "accelerate_transit_link": "mobility_infrastructure",
    "improve_bus_coverage": "mobility_infrastructure",
    "improve_last_mile_transit": "mobility_infrastructure",
    "improve_cycle_paths": "mobility_infrastructure",
    "expand_retail_offering": "retail_expansion",
    "add_grocery_retail": "retail_expansion",
    "add_community_events": "community_spaces",
    "improve_park_access": "community_spaces",
    "reduce_parking_pressure": "mobility_infrastructure",
}

REQUIRED_COLUMNS = {
    "sample_communities.csv": [
        "community_id",
        "district",
        "population_estimate",
        "occupancy_rate",
        "service_demand_index",
        "mobility_score",
        "resident_experience_score",
        "optimization_opportunity",
    ],
    "districts.csv": [
        "district",
        "area_type",
        "profile",
        "base_sale_aed_sqm",
        "gross_yield_pct",
        "infrastructure_score",
        "latitude",
        "longitude",
        "established_year",
    ],
    "osm_amenities.csv": [
        "amenity_id",
        "category",
        "subtype",
        "name",
        "latitude",
        "longitude",
        "district",
    ],
    "sample_listings.csv": [
        "listing_id",
        "district",
        "listing_type",
        "price_per_sqm_aed",
        "status",
    ],
    "sample_parcels.csv": [
        "parcel_id",
        "district",
        "land_use",
        "parcel_size_sqm",
        "current_status",
        "development_potential_score",
    ],
    "sample_transactions.csv": [
        "transaction_id",
        "date",
        "district",
        "transaction_value_aed",
        "price_per_sqm",
    ],
}
