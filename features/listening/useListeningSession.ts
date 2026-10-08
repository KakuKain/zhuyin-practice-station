import { useState } from "react";
import type { InkStroke, ListenPhase, ListeningQuestion } from "../types";

export function useListeningSession() {
  const [listenIndex, setListenIndex] = useState(0);
  const [sessionQuestions, setSessionQuestions] = useState<ListeningQuestion[]>([]);
  const [listenPhase, setListenPhase] = useState<ListenPhase>("ready");
  const [listenExitOpen, setListenExitOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [playCount, setPlayCount] = useState(0);
  const [listenMessage, setListenMessage] = useState("");
  const [retryMessage, setRetryMessage] = useState("");
  const [sessionScore, setSessionScore] = useState({ listeningCorrect: 0 });
  const [listeningDrafts, setListeningDrafts] = useState<Record<number, InkStroke[][]>>({});
  const [batchNeedsReview, setBatchNeedsReview] = useState<number[]>([]);
  const [reviewedIndexes, setReviewedIndexes] = useState<number[]>([]);
  const [singleQuestionPractice, setSingleQuestionPractice] = useState(false);
  return {
    listenIndex,
    setListenIndex,
    sessionQuestions,
    setSessionQuestions,
    listenPhase,
    setListenPhase,
    listenExitOpen,
    setListenExitOpen,
    secondsLeft,
    setSecondsLeft,
    playCount,
    setPlayCount,
    listenMessage,
    setListenMessage,
    retryMessage,
    setRetryMessage,
    sessionScore,
    setSessionScore,
    listeningDrafts,
    setListeningDrafts,
    batchNeedsReview,
    setBatchNeedsReview,
    reviewedIndexes,
    setReviewedIndexes,
    singleQuestionPractice,
    setSingleQuestionPractice,
  };
}
