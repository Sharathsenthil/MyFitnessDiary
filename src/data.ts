export const fitnessData = {
  personalInfo: {
    id: "934****012",
    gender: "Male",
    age: 23,
    height: 173.0,
    time: "2026-10-05 22:25:51",
    score: 77,
    bodyAge: 24
  },
  bodyComponent: {
    weight: { value: 80.2, min: 56.1, max: 75.9, unit: "KG" },
    fat: { value: 17.1, min: 7.9, max: 15.8, unit: "KG" },
    protein: { value: 12.6, min: 9.8, max: 12.0, unit: "KG" },
    inorganicSalt: { value: 4.0, min: 3.4, max: 4.1, unit: "KG" },
    water: { value: 46.1, min: 37.0, max: 45.2, unit: "KG" }
  },
  obesityAnalysis: {
    bmi: { value: 26.8, min: 18.5, max: 23 },
    whr: { value: 0.86, min: 0.8, max: 0.9 },
    ffm: { value: 63.1 },
    bmr: { value: 1737.6, unit: "Kcal" }
  },
  fatAnalysis: {
    fat: { value: 17.1, min: 7.9, max: 15.8, unit: "KG" },
    trunkFatMass: { value: 8.6, min: 4.0, max: 7.9, unit: "KG" },
    pbf: { value: 21.35, min: 10, max: 20 },
    visceralFatIndex: { value: 8.4, min: 0, max: 10 }
  },
  muscleAnalysis: {
    muscle: { value: 58.7, min: 46.9, max: 57.5, unit: "KG" },
    smm: { value: 35.5, min: 28.0, max: 34.3, unit: "KG" },
    protein: { value: 12.6, min: 9.8, max: 12.0, unit: "KG" }
  },
  segmentalAnalysis: {
    muscle: {
      rightArm: 4.3, leftArm: 4.1, trunk: 29.3, rightLeg: 10.5, leftLeg: 10.3
    },
    fat: {
      rightArm: 1.1, leftArm: 1.3, trunk: 8.6, rightLeg: 2.9, leftLeg: 3.1
    }
  },
  edemaAnalysis: {
    bodyWaterPercent: 57.5,
    edemaIndex: { value: 0.34, min: 0.3, max: 0.35 },
    intracellularWater: 30.6,
    extracellularWater: 15.5,
    status: "Normal"
  },
  weightManagement: {
    targetWeight: 65.1,
    weightControl: -7.2,
    fatControl: -7.2,
    muscleControl: 0
  },
  bodyType: "Obese"
};
