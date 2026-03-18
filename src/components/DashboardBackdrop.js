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
            "radial-gradient(circle at 18% 18%, rgba(56, 189, 248, 0.22), transparent 38%), radial-gradient(circle at 85% 12%, rgba(14, 165, 233, 0.22), transparent 36%), linear-gradient(125deg, rgba(4, 18, 31, 0.2) 0%, rgba(10, 58, 104, 0.22) 45%, rgba(14, 165, 233, 0.18) 100%)"
        }}
      />
    </>
  );
}
