import { ShowMsgProvider } from "./ShowMsg";
import { Loading } from "./Loading";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { usePracticeApp } from "../features/usePracticeApp";
import {
  AppHeader,
  BottomNav,
  HeaderBackSlot,
  LoadingOverlay,
  ResourceNotice,
  UpdateReminder,
} from "./AppChrome";
import { FillDialogs } from "../features/fill/FillDialogs";
import { CourseList } from "../features/courses/CourseList";
import { FillWriting } from "../features/fill/FillWriting";
import { FillPractice } from "../features/fill/FillPractice";
import { ListeningScreen } from "../features/listening/ListeningScreen";
import { MaterialSelector } from "../features/courses/MaterialSelector";
import { LessonReader } from "../features/lesson/LessonReader";
const PracticeList = lazy(() =>
  import("../features/practice/PracticeList").then((module) => ({ default: module.PracticeList })),
);
const SettingsScreen = lazy(() =>
  import("../features/settings/SettingsScreen").then((module) => ({
    default: module.SettingsScreen,
  })),
);

/**
 * Screens past the course list load when first opened, so the first screen comes up sooner; once
 * it is up, they load quietly in the background (prefetchScreens), so opening one stays instant.
 * Not the writing screens (默寫's cell and practice, 聽寫): their canvases are drawn by the
 * coordinator's ink hooks, which look for the canvas as the cell opens; a canvas still loading
 * would stay blank, without the child's saved ink.
 */
const screens = {
  fillBlank: () => import("../features/fill/FillBlank"),
  fillReview: () => import("../features/fill/FillReview"),
  listeningResult: () => import("../features/listening/ListeningResult"),
  math: () => import("../features/math/MathScreen"),
  mathLesson: () => import("../features/math/MathLessonPage"),
  stamps: () => import("../features/rewards/StampCard"),
  tasks: () => import("../features/rewards/TodayTasks"),
  mathCourses: () => import("../features/math/MathCourseList"),
  english: () => import("../features/english/EnglishScreen"),
  englishLesson: () => import("../features/english/EnglishLessonPage"),
  englishCourses: () => import("../features/english/EnglishCourseList"),
};
const FillBlank = lazy(() => screens.fillBlank().then((m) => ({ default: m.FillBlank })));
const FillReview = lazy(() => screens.fillReview().then((m) => ({ default: m.FillReview })));
const ListeningResult = lazy(() =>
  screens.listeningResult().then((m) => ({ default: m.ListeningResult })),
);
const MathScreen = lazy(() => screens.math().then((m) => ({ default: m.MathScreen })));
const MathLessonPage = lazy(() =>
  screens.mathLesson().then((m) => ({ default: m.MathLessonPage })),
);
const EnglishScreen = lazy(() => screens.english().then((m) => ({ default: m.EnglishScreen })));
const EnglishLessonPage = lazy(() =>
  screens.englishLesson().then((m) => ({ default: m.EnglishLessonPage })),
);
const StampNewsToast = lazy(() => screens.stamps().then((m) => ({ default: m.StampNewsToast })));

/**
 * After the first screen has fully loaded (its pictures, then its fonts, so nothing competes with
 * them), the other screens load while the tablet is idle; never on a data saver.
 */
function prefetchScreens() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return () => {};
  let cancel = () => {};
  const load = () => {
    for (const screen of Object.values(screens)) void screen().catch(() => {});
  };
  const whenIdle = () => {
    // Safari has no requestIdleCallback; a short wait does the same there.
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(load, { timeout: 4000 });
      cancel = () => window.cancelIdleCallback(handle);
    } else {
      const handle = window.setTimeout(load, 1500);
      cancel = () => window.clearTimeout(handle);
    }
  };
  let canceled = false;
  const afterFonts = () => {
    void document.fonts.ready.then(() => {
      if (!canceled) whenIdle();
    });
  };
  if (document.readyState === "complete") afterFonts();
  else window.addEventListener("load", afterFonts, { once: true });
  return () => {
    canceled = true;
    window.removeEventListener("load", afterFonts);
    cancel();
  };
}

/** A full-screen view (math, dictation) while its code arrives. */
const FullScreen = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<Loading page />}>{children}</Suspense>
);
const SymbolChart = lazy(() =>
  import("../features/symbols/SymbolChart").then((module) => ({ default: module.SymbolChart })),
);

import { MaterialContext } from "../features/courses/MaterialContext";
import { ChildPicker } from "./ChildPicker";
import { chooseChild, needsChildChoice, useChildProfiles } from "../lib/storage/child-profiles";

/**
 * With several children on one tablet, a session starts by asking who is practising. Each
 * child's records live under their own keys, so choosing someone else remounts every screen
 * and store with theirs.
 */
export function PracticeApp() {
  const profiles = useChildProfiles();
  const [choosing, setChoosing] = useState(needsChildChoice);
  if (choosing)
    return (
      <ChildPicker
        onChoose={(id) => {
          chooseChild(id);
          setChoosing(false);
        }}
      />
    );
  return <PracticeSession key={profiles.activeId} />;
}

function PracticeSession() {
  const app = usePracticeApp();
  const { catalog, playbackRef, finishPlayback } = app;
  useEffect(() => prefetchScreens(), []);
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
        {app.stampNews && (
          <Suspense fallback={null}>
            <StampNewsToast news={app.stampNews} onDismiss={app.dismissStampNews} />
          </Suspense>
        )}
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
      case "math-lesson":
        return <MathLessonPage app={app} />;
      case "english-lesson":
        return <EnglishLessonPage app={app} />;
      default:
        return <CourseList app={app} />;
    }
  };

  if (view === "math")
    return (
      <FullScreen>
        <MathScreen app={app} />
      </FullScreen>
    );
  if (view === "english")
    return (
      <FullScreen>
        <EnglishScreen app={app} />
      </FullScreen>
    );
  if (isFocusMode)
    return (
      <FullScreen>
        <ListeningScreen app={app} />
      </FullScreen>
    );
  if (view === "fill-practice")
    return (
      <FullScreen>
        <FillPractice app={app} />
      </FullScreen>
    );
  if (view === "fill" && activeFillCell !== null)
    return (
      <FullScreen>
        <FillWriting app={app} />
        <FillDialogs app={app} />
      </FullScreen>
    );
  if (view === "fill" && fillReviewOpen)
    return (
      <FullScreen>
        <FillReview app={app} />
        <FillDialogs app={app} />
      </FullScreen>
    );

  return (
    <HeaderBackSlot.Provider value={backSlot}>
      <div
        className={`app-shell is-${view}${view === "math-lesson" || view === "english-lesson" ? " is-lesson" : ""}`}
      >
        <AppHeader
          backSlotRef={setBackSlot}
          title={view === "practice" ? "練習" : undefined}
          materialSelector={view === "courses" ? <MaterialSelector app={app} /> : undefined}
          onCourses={() => navigate("courses")}
          onBack={
            view === "lesson" || view === "math-lesson" || view === "english-lesson"
              ? () => navigate("courses")
              : view === "fill"
                ? () => navigate("lesson")
                : undefined
          }
          backLabel={view === "fill" ? "回到課文預覽" : "回到課程"}
        />
        <main className="main-content">
          <ResourceNotice failed={resourceError} />
          {/* Not while writing: the course list updates by itself, dictation stays undisturbed. */}
          {view !== "courses" && view !== "fill" && <UpdateReminder />}
          <Suspense fallback={<Loading />}>{renderMain()}</Suspense>
        </main>
        <BottomNav
          active={
            view === "lesson" ||
            view === "fill" ||
            view === "result" ||
            view === "math-lesson" ||
            view === "english-lesson"
              ? "courses"
              : view
          }
          onNavigate={navigate}
        />
        {view === "fill" && <FillDialogs app={app} />}
        {loadingMessage && <LoadingOverlay label={loadingMessage} />}
      </div>
    </HeaderBackSlot.Provider>
  );
}
