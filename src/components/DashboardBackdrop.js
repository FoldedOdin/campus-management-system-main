import React from "react";
import { Box } from "@mui/material";
import Iridescence from "./Iridescence";

export default function DashboardBackdrop() {
  return (
    <>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0
        }}
      >
        <Iridescence
          color={[0.5, 0.6, 0.8]}
          mouseReact
          amplitude={0.1}
          speed={1}
        />
      </Box>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 18% 18%, rgba(56, 189, 248, 0.16), transparent 35%), radial-gradient(circle at 85% 12%, rgba(14, 165, 233, 0.16), transparent 32%), linear-gradient(120deg, rgba(2, 6, 23, 0.92), rgba(2, 6, 23, 0.7))"
        }}
      />
    </>
  );
}
