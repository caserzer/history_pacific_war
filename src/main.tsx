import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/app.css";
import {
  loadContentAsync,
  emptyDocument,
  type ContentState,
} from "./content/loader";
import { buildIndex } from "./data/index";
import { useHashRoute } from "./router/useHashRoute";
import { AppContextProvider } from "./features/AppContext";
import { ReadingSite } from "./reading/ReadingSite";
import { applyReadingSize, readStoredReadingSize } from "./a11y/readingSize";
applyReadingSize(readStoredReadingSize());
function App() {
  const { route } = useHashRoute();
  const [content, setContent] = useState<ContentState>({
    status: "loading",
    doc: null,
    issues: [],
    sourceKey: null,
  });
  useEffect(() => {
    let cancelled = false;
    void loadContentAsync().then((value) => {
      if (!cancelled) setContent(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const value = useMemo(
    () => ({
      content,
      index: buildIndex(content.doc ?? emptyDocument()),
      hasContent: content.doc !== null,
      isFixture: content.status === "fixture",
    }),
    [content],
  );
  return (
    <AppContextProvider value={value}>
      <ReadingSite route={route} />
    </AppContextProvider>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
