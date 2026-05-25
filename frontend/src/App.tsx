import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ProposalStudioProvider } from "@/contexts/ProposalStudioContext";
import Layout from "@/routes/layout";
import LandingPage from "@/routes/pages/LandingPage";
import UploadPage from "@/routes/pages/UploadPage";
import FindingsPage from "@/routes/pages/FindingsPage";
import GeneratePage from "@/routes/pages/GeneratePage";
import ExportPage from "@/routes/pages/ExportPage";

export default function App() {
  return (
    <BrowserRouter>
      <ProposalStudioProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<Layout />}>
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/findings" element={<FindingsPage />} />
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/export" element={<ExportPage />} />
          </Route>
        </Routes>
        <Toaster richColors position="top-right" />
      </ProposalStudioProvider>
    </BrowserRouter>
  );
}
