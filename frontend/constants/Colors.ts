// Design system colors based on DESIGN_SYSTEM.md
export const Colors = {
  primary: {
    purple: "#8B5CF6",
    blue: "#3B82F6",
  },
  secondary: {
    cyan: "#06B6D4",
    skyBlue: "#0EA5E9",
  },
  background: {
    primary: "#0A0A0A",
    secondary: "#05020C",
    tertiary: "#07040F",
    gradientStart: "#120E2B",
    surface: "#1A1A1A",
    glass: "rgba(255, 255, 255, 0.04)",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "rgba(255, 255, 255, 0.9)",
    tertiary: "rgba(255, 255, 255, 0.75)",
    quaternary: "rgba(255, 255, 255, 0.7)",
    disabled: "rgba(255, 255, 255, 0.6)",
    muted: "rgba(255, 255, 255, 0.65)",
    grey: "#BDBDBD",
  },
  border: {
    default: "rgba(255, 255, 255, 0.2)",
    focus: "#8B5CF6",
    error: "#FF0000",
    subtle: "rgba(255, 255, 255, 0.1)",
  },
  status: {
    success: "#16A34A",
    error: "#FF0000",
    errorAccent: "#FF5252",
    info: "#3B82F6",
  },
} as const;


