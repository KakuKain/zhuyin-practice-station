"use client";

import { useSyncExternalStore } from "react";
import { usePracticeApp } from "../features/usePracticeApp";
import { AppHeader, BottomNav, LoadingOverlay } from "./AppChrome";
import { FillDialogs } from "../features/fill/FillDialogs";
import { CourseList } from "../features/courses/CourseList";
import { LessonReader } from "../features/lesson/LessonReader";
import { FillBlank } from "../features/fill/FillBlank";
import { FillWriting } from "../features/fill/FillWriting";
import { FillReview } from "../features/fill/FillReview";
import { FillPractice } from "../features/fill/FillPractice";
import { PracticeList } from "../features/practice/PracticeList";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { ListeningResult } from "../features/listening/ListeningResult";
import { ListeningScreen } from "../features/listening/ListeningScreen";

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function PracticeApp() {
  const hydrated = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const app = usePracticeApp();
  const {
    view,
    isFocusMode,
    activeFillCell,
    fillReviewOpen,
    playbackRef,
    finishPlayback,
    navigate,
    loadingMessage,
  } = app;
  const renderMain = () => {
    switch (view) {
      case "courses":
        return <CourseList app={app} />;
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
    <div className={`app-shell is-${view}`} aria-busy={!hydrated}>
      <audio ref={playbackRef} onEnded={finishPlayback} preload="none" hidden aria-hidden="true" />
      <AppHeader
        onCourses={() => navigate("courses")}
        onBack={
          view === "lesson"
            ? () => navigate("courses")
            : view === "fill"
              ? () => navigate("lesson")
              : undefined
        }
        backLabel="回到課程"
      />
      <main className="main-content">{renderMain()}</main>
      <BottomNav
        active={view === "lesson" || view === "fill" || view === "result" ? "courses" : view}
        onNavigate={navigate}
      />
      {view === "fill" && <FillDialogs app={app} />}
      {(!hydrated || loadingMessage) && (
        <LoadingOverlay label={loadingMessage ?? "正在準備練習…"} />
      )}
    </div>
  );
}
