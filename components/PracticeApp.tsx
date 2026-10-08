import { ShowMsgProvider } from "./ShowMsg";
import { lazy, Suspense, useState } from "react";
import { usePracticeApp } from "../features/usePracticeApp";
import { AppHeader, BottomNav, HeaderBackSlot, LoadingOverlay, ResourceNotice } from "./AppChrome";
import { FillDialogs } from "../features/fill/FillDialogs";
import { CourseList } from "../features/courses/CourseList";
import { MaterialSelector } from "../features/courses/MaterialSelector";
import { LessonReader } from "../features/lesson/LessonReader";
import { FillBlank } from "../features/fill/FillBlank";
import { FillWriting } from "../features/fill/FillWriting";
import { FillReview } from "../features/fill/FillReview";
import { FillPractice } from "../features/fill/FillPractice";
const PracticeList = lazy(() =>
  import("../features/practice/PracticeList").then((module) => ({ default: module.PracticeList })),
);
const SettingsScreen = lazy(() =>
  import("../features/settings/SettingsScreen").then((module) => ({
    default: module.SettingsScreen,
  })),
);
import { ListeningResult } from "../features/listening/ListeningResult";
import { ListeningScreen } from "../features/listening/ListeningScreen";
const SymbolChart = lazy(() =>
  import("../features/symbols/SymbolChart").then((module) => ({ default: module.SymbolChart })),
);

import { MaterialContext } from "../features/courses/MaterialContext";

export function PracticeApp() {
  const app = usePracticeApp();
  const { catalog, playbackRef, finishPlayback } = app;
  return (
    <ShowMsgProvider>
      <MaterialContext.Provider value={catalog}>
        {/* One element for every screen: iOS keeps the playback a tap has unlocked. */}
        <audio
          ref={playbackRef}
          onEnded={finishPlayback}
          preload="none"
          hidden
          aria-hidden="true"
        />
        <PracticeContent app={app} />
      </MaterialContext.Provider>
    </ShowMsgProvider>
  );
}

function PracticeContent({ app }: { app: ReturnType<typeof usePracticeApp> }) {
  const [backSlot, setBackSlot] = useState<HTMLElement | null>(null);
  const {
    view,
    isFocusMode,
    activeFillCell,
    fillReviewOpen,
    navigate,
    loadingMessage,
    resourceError,
  } = app;
  const renderMain = () => {
    switch (view) {
      case "courses":
        return <CourseList app={app} />;
      case "symbols":
        return <SymbolChart app={app} />;
      case "practice":
        return <PracticeList app={app} />;
      case "more":
        return <SettingsScreen app={app} />;
      case "lesson":
        return <LessonReader app={app} />;
      case "fill":
        return <FillBlank app={app} />;
      case "result":
        return <ListeningResult app={app} />;
      default:
        return <CourseList app={app} />;
    }
  };

  if (isFocusMode) return <ListeningScreen app={app} />;
  if (view === "fill-practice") return <FillPractice app={app} />;
  if (view === "fill" && activeFillCell !== null)
    return (
      <>
        {<FillWriting app={app} />}
        {<FillDialogs app={app} />}
      </>
    );
  if (view === "fill" && fillReviewOpen)
    return (
      <>
        {<FillReview app={app} />}
        {<FillDialogs app={app} />}
      </>
    );

  return (
    <HeaderBackSlot.Provider value={backSlot}>
      <div className={`app-shell is-${view}`}>
        <AppHeader
          backSlotRef={setBackSlot}
          title={view === "practice" ? "練習" : undefined}
          materialSelector={view === "courses" ? <MaterialSelector app={app} /> : undefined}
          onCourses={() => navigate("courses")}
          onBack={
            view === "lesson"
              ? () => navigate("courses")
              : view === "fill"
                ? () => navigate("lesson")
                : undefined
          }
          backLabel={view === "fill" ? "回到課文預覽" : "回到課程"}
        />
        <main className="main-content">
          <ResourceNotice failed={resourceError} />
          <Suspense
            fallback={
              <p className="feature-loading" role="status">
                正在準備練習…
              </p>
            }
          >
            {renderMain()}
          </Suspense>
        </main>
        <BottomNav
          active={view === "lesson" || view === "fill" || view === "result" ? "courses" : view}
          onNavigate={navigate}
        />
        {view === "fill" && <FillDialogs app={app} />}
        {loadingMessage && <LoadingOverlay label={loadingMessage} />}
      </div>
    </HeaderBackSlot.Provider>
  );
}
