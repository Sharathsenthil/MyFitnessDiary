# Release Notes - FitPro Tracker

## v1.1.0 - Data Expansion & UI Enhancement

### 🚀 Features & Enhancements
- **Comprehensive Data Display**: Expanded the Report dashboard to display the entirety of the user's fitness data model, which was previously hidden.
  - Added **Obesity & Metabolism Panel**: Now displays Basal Metabolic Rate (BMR), Waist-Hip Ratio (WHR), and Fat Free Mass (FFM).
  - Added **Advanced Muscle & Fat Panel**: Added metrics for Skeletal Muscle Mass (SMM), Percent Body Fat (PBF), Visceral Fat Index, and Trunk Fat Mass.
  - Added **Segmental Analysis Panel**: Displays a localized breakdown of Muscle (KG) and Fat (KG) distributed across the Right Arm, Left Arm, Right Leg, Left Leg, and Trunk.
  - Added **Edema & Water Analysis Panel**: Added tracking for Body Water Percent, Intracellular Water, Extracellular Water, and overall Edema Status/Index.
- **Emoji Integration**: Enriched the UI by adding contextual emojis across all sections (e.g., 🥩 for Protein, 💧 for Water, 🥓 for Fat, 💪 for Muscle) to improve visual scanning and create a friendlier interface.
- **Improved Chart Labels**: The Body Composition pie chart and Progress Overview line chart legends now include emojis.

### 🔧 Technical Changes
- **`src/App.tsx`**: Completely refactored the `ReportTab` component to include the new `StatCard` grids and custom glass-panels for Segmental and Edema analysis. Extracted and mapped new fields from the `fitnessData` import.
