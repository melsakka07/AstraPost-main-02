/**
 * AstraPost color tokens.
 * Use these when you need raw values at runtime (e.g., Recharts, D3, canvas).
 * For component styling, prefer CSS variables (bg-background, text-primary, etc.).
 */

export const neutral = {
  light: [
    "#fcfcfd",
    "#f9f9fb",
    "#eff0f3",
    "#e7e8ec",
    "#e0e1e6",
    "#d8d9e0",
    "#cdced7",
    "#b9bbc6",
    "#8b8d98",
    "#80828d",
    "#62636c",
    "#1e1f24",
  ] as const,
  dark: [
    "#111113",
    "#18191b",
    "#212225",
    "#272a2d",
    "#2e3135",
    "#363a3f",
    "#43484e",
    "#5a6169",
    "#696e77",
    "#777b84",
    "#b0b4ba",
    "#edeef0",
  ] as const,
};

export const brand = {
  light: [
    "#fdfdfe",
    "#f7f9ff",
    "#edf2fe",
    "#e1e9ff",
    "#d2deff",
    "#c1d0ff",
    "#abbdf9",
    "#8da4ef",
    "#3e63dd",
    "#3358d4",
    "#3a5bc7",
    "#1f2d5c",
  ] as const,
  dark: [
    "#11131f",
    "#141726",
    "#182449",
    "#1d2e62",
    "#243974",
    "#2d4484",
    "#3a5295",
    "#4661ab",
    "#3e63dd",
    "#5472e4",
    "#9eb1ff",
    "#d6e1ff",
  ] as const,
};

export const info = {
  light: [
    "#fbfdff",
    "#f4faff",
    "#e6f4fe",
    "#d5efff",
    "#c2e5ff",
    "#acd8fc",
    "#8ec8f6",
    "#5eb1ef",
    "#0090ff",
    "#0588f0",
    "#0d74ce",
    "#113264",
  ] as const,
  dark: [
    "#0d1520",
    "#111927",
    "#0d2847",
    "#003362",
    "#004074",
    "#104d87",
    "#205d9e",
    "#2870bd",
    "#0090ff",
    "#3b9eff",
    "#70b8ff",
    "#c2e6ff",
  ] as const,
};

export const success = {
  light: [
    "#fbfefb",
    "#f5fbf5",
    "#e9f6e9",
    "#daf1db",
    "#c9e8ca",
    "#b2ddb5",
    "#94ce9a",
    "#65ba74",
    "#46a758",
    "#3e9b4f",
    "#2a7e3b",
    "#203c25",
  ] as const,
  dark: [
    "#0e1511",
    "#141a15",
    "#1b2a1e",
    "#1d3a24",
    "#25482d",
    "#2d5736",
    "#366740",
    "#3e7949",
    "#46a758",
    "#53b365",
    "#71d083",
    "#c2f0c2",
  ] as const,
};

export const warning = {
  light: [
    "#fefdfb",
    "#fefbe9",
    "#fff7c2",
    "#ffee9c",
    "#fbe577",
    "#f3d673",
    "#e9c162",
    "#e2a336",
    "#ffc53d",
    "#ffba18",
    "#ab6400",
    "#4f3422",
  ] as const,
  dark: [
    "#16120c",
    "#1d180f",
    "#302008",
    "#3f2700",
    "#4d3000",
    "#5c3d05",
    "#714f19",
    "#8f6424",
    "#ffc53d",
    "#ffd60a",
    "#ffca16",
    "#ffe7b3",
  ] as const,
};

export const danger = {
  light: [
    "#fffcfc",
    "#fff7f7",
    "#feebec",
    "#ffdbdc",
    "#ffcdce",
    "#fdbdbe",
    "#f4a9aa",
    "#eb8e90",
    "#e5484d",
    "#dc3e42",
    "#ce2c31",
    "#641723",
  ] as const,
  dark: [
    "#191111",
    "#201314",
    "#3b1219",
    "#500f1c",
    "#611623",
    "#72232d",
    "#8c333a",
    "#b54548",
    "#e5484d",
    "#ec5d5e",
    "#ff9592",
    "#ffd1d9",
  ] as const,
};

/** 5-way categorical chart palette. Index by data series. */
export const chartColors = {
  light: [
    "#3e63dd", // brand
    "#0090ff", // info
    "#46a758", // success
    "#ffc53d", // warning
    "#e5484d", // danger
  ] as const,
  dark: ["#3e63dd", "#0090ff", "#46a758", "#ffc53d", "#e5484d"] as const,
};

/** Hard-coded brand values for contexts that can't read CSS vars (OG images, emails). */
export const brandConstants = {
  bg: "#0A0A0A", // dark canvas for OG cards, marketing
  fg: "#FAFAFA", // logo on dark canvas
  primary: "#3e63dd", // accent / CTA
  primaryHover: "#3358d4",
} as const;
