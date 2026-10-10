import { useState } from "react";
import type { InkStroke, ListenPhase, ListeningQuestion } from "../types";

/** `initialQuestions` lets a saved round reopen on start-up with its own question order. */
export function useListeningSession(initialQuestions: ListeningQuestion[] = []) {
  const [listenIndex, setListenIndex] = useState(0);
  const [sessionQuestions, setSessionQuestions] = useState<ListeningQuestion[]>(initialQuestions);
  const [listenPhase, setListenPhase] = useState<ListenPhase>("ready");
  const [listenExitOpen, setListenExitOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
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
