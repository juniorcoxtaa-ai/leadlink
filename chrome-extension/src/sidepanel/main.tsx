import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LeadLinkExtensionMvp } from "@/components/leadlink/ExtensionMvp";
import "@/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LeadLinkExtensionMvp />
  </StrictMode>,
);
