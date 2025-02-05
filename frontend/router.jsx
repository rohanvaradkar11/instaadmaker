import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import NotFound from "./pages/NotFound";
import GenerateStory from "./pages/GenerateStory";

const router = createBrowserRouter([
  {
    path: "/company/:company_id/",
    element: <App />,
  },
  {
    path: "/company/:company_id/application/:application_id",
    element: <App />,
  },
  {
    path: "/company/:company_id/generate-story",
    element: <GenerateStory />
  },
  {
    path: "/company/:company_id/application/:application_id/generate-story",
    element: <GenerateStory />
  },
  {
    path: "/*", // Fallback route for all unmatched paths
    element: <NotFound />, // Component to render for unmatched paths
  }
]);

export default router;
