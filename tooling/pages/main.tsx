import { createRoot } from "react-dom/client";
import { PracticeApp } from "../../components/PracticeApp";
import { expireLegacyDraftCookies } from "../../features/fill/fill-storage";
import "../../app/globals.css";

expireLegacyDraftCookies();
createRoot(document.getElementById("root")!).render(<PracticeApp />);
