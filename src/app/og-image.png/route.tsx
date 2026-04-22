import { ImageResponse } from "next/og";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        padding: "60px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: "72px",
          fontWeight: "bold",
          color: "#ffffff",
          marginBottom: "20px",
        }}
      >
        AstraPost
      </div>
      <div
        style={{
          fontSize: "32px",
          color: "#a0a0a0",
          marginBottom: "60px",
        }}
      >
        AI-Powered Social Media Management for X
      </div>
      <div
        style={{
          display: "flex",
          gap: "20px",
          fontSize: "24px",
          color: "#ffffff",
        }}
      >
        <span style={{ color: "#22c55e" }}>✓</span> Schedule &amp; Publish
        <span style={{ color: "#22c55e" }}>✓</span> AI Content
        <span style={{ color: "#22c55e" }}>✓</span> Analytics
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
