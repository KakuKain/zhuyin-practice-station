"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type View = "home" | "courses" | "practice" | "more" | "lesson" | "fill" | "listen" | "result";
type ListenPhase = "ready" | "active" | "review" | "choice" | "retry";
type ParentResult = "correct" | "needs_review" | null;

const lessonItems = [
  { character: "小", zhuyin: "ㄒㄧㄠˇ" },
  { character: "明", zhuyin: "ㄇㄧㄥˊ" },
  { character: "是", zhuyin: "ㄕˋ" },
  { character: "個", zhuyin: "ㄍㄜˋ" },
  { character: "好", zhuyin: "ㄏㄠˇ" },
  { character: "學", zhuyin: "ㄒㄩㄝˊ" },
  { character: "生", zhuyin: "ㄕㄥ" },
] as const;

const listeningQuestions = [
  { answer: "ㄇㄧㄥˊ", audioText: "明", distractors: ["ㄇㄧㄣˊ", "ㄇㄧㄥˇ"] },
  { answer: "ㄒㄩㄝˊ", audioText: "學", distractors: ["ㄒㄩㄝˇ", "ㄒㄩㄢˊ"] },
  { answer: "ㄕㄥ", audioText: "生", distractors: ["ㄕㄣ", "ㄕㄥˇ"] },
] as const;

const blankIndexes = [1, 4, 6];
const fillOptions = [lessonItems[5], lessonItems[1], lessonItems[6]];

function splitZhuyin(text: string) {
  return Array.from(text);
}

function ZhuyinStack({ text, empty = false }: { text: string; empty?: boolean }) {
  return (
    <span className={`zhuyin-stack ${empty ? "is-empty" : ""}`} aria-label={empty ? "尚未填入音節" : text}>
      {empty ? <span className="empty-mark">拖到這裡</span> : splitZhuyin(text).map((symbol, index) => <span key={`${symbol}-${index}`}>{symbol}</span>)}
    </span>
  );
}

function Logo() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <span>ㄅ</span>
      <i />
    </span>
  );
}

function AppHeader({ onHome }: { onHome: () => void }) {
  return (
    <header className="app-header">
      <button className="brand-button" type="button" onClick={onHome} aria-label="回到首頁">
        <Logo />
        <span>
          <strong>注音小練習</strong>
          <small>一年級學習站</small>
        </span>
      </button>
      <div className="header-chip"><span className="status-dot" /> 不用登入也能練</div>
    </header>
  );
}

function BottomNav({ active, onNavigate }: { active: View; onNavigate: (view: View) => void }) {
  const items: Array<{ id: View; icon: string; label: string }> = [
    { id: "home", icon: "⌂", label: "首頁" },
    { id: "courses", icon: "▤", label: "課程" },
    { id: "practice", icon: "✎", label: "練習" },
    { id: "more", icon: "•••", label: "更多" },
  ];

  return (
    <nav className="bottom-nav" aria-label="主要導覽">
      {items.map((item) => (
        <button key={item.id} type="button" className={active === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}>
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="section-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("home");
  const [fillAnswers, setFillAnswers] = useState<Record<number, string>>({});
  const [fillMessage, setFillMessage] = useState("把下方的完整音節，拖到對應的空格裡。每一格就是一個音節。\n");
  const [dragging, setDragging] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [listenIndex, setListenIndex] = useState(0);
  const [listenPhase, setListenPhase] = useState<ListenPhase>("ready");
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [playCount, setPlayCount] = useState(2);
  const [listenMessage, setListenMessage] = useState("按下「開始聽」才會播放題目。時間會從這裡開始倒數。 ");
  const [retryMessage, setRetryMessage] = useState("");
  const [sessionScore, setSessionScore] = useState({ listeningCorrect: 0, needsReview: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);

  const currentQuestion = listeningQuestions[listenIndex];
  const isFocusMode = view === "listen";

  const clearListenTimers = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    timeoutRefs.current.forEach((id) => window.clearTimeout(id));
    timeoutRefs.current = [];
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-TW";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }, []);

  const resetListeningQuestion = (index = 0) => {
    clearListenTimers();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setListenIndex(index);
    setListenPhase("ready");
    setSecondsLeft(30);
    setPlayCount(2);
    setRetryMessage("");
    setListenMessage("按下「開始聽」才會播放題目。時間會從這裡開始倒數。 ");
  };

  const openListening = () => {
    resetListeningQuestion(0);
    setView("listen");
  };

  const leaveFocus = () => {
    if (listenPhase === "active" && !window.confirm("這一題尚未完成，要先離開嗎？")) return;
    clearListenTimers();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setView("lesson");
    setListenPhase("ready");
  };

  const finishListening = useCallback(() => {
    clearListenTimers();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSecondsLeft(0);
    setListenPhase("review");
    setListenMessage("時間到，請把平板交給家長一起看看。 ");
  }, [clearListenTimers]);

  useEffect(() => {
    if (listenPhase !== "active") return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    const secondPlayback = window.setTimeout(() => {
      setPlayCount(0);
      setListenMessage("第二次播放中，可以繼續寫，也可以修改剛剛的筆畫。 ");
      speak(currentQuestion.audioText);
    }, 8000);

    const timeUp = window.setTimeout(finishListening, 30000);
    timeoutRefs.current = [secondPlayback, timeUp];

    return clearListenTimers;
  }, [clearListenTimers, currentQuestion.audioText, finishListening, listenIndex, listenPhase, speak]);

  useEffect(() => {
    if (view !== "listen" || (listenPhase !== "active" && listenPhase !== "retry")) return;
    const frame = window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.scale(ratio, ratio);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 4;
      context.strokeStyle = "#27463f";
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view, listenPhase, listenIndex]);

  useEffect(() => () => clearListenTimers(), [clearListenTimers]);

  const startListening = () => {
    setListenPhase("active");
    setSecondsLeft(30);
    setPlayCount(1);
    setListenMessage("第一次播放中，Canvas 已開放，可以邊聽邊寫。 ");
    speak(currentQuestion.audioText);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const beginDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (listenPhase !== "active" && listenPhase !== "retry") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = pointFromEvent(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const endDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDrawing(false);
  };

  const placeFillAnswer = (optionIndex: number, slotIndex: number) => {
    if (fillAnswers[slotIndex]) return;
    const option = fillOptions[optionIndex];
    const expected = lessonItems[slotIndex];
    if (option.zhuyin !== expected.zhuyin) {
      setFillMessage("這張音節卡先回到原位，再看看空格裡需要哪一個音。 ");
      setSelectedCard(null);
      setDragging(null);
      return;
    }
    const next = { ...fillAnswers, [slotIndex]: option.zhuyin };
    setFillAnswers(next);
    setFillMessage("答對了！完整音節會留在格子裡，不能再被拖走。 ");
    setSelectedCard(null);
    setDragging(null);
  };

  const fillComplete = blankIndexes.every((index) => fillAnswers[index]);

  const goToNextQuestion = () => {
    if (listenIndex >= listeningQuestions.length - 1) {
      setView("result");
      clearListenTimers();
      return;
    }
    resetListeningQuestion(listenIndex + 1);
  };

  const handleParentDecision = (result: Exclude<ParentResult, null>) => {
    if (result === "correct") {
      setSessionScore((current) => ({ ...current, listeningCorrect: current.listeningCorrect + 1 }));
      goToNextQuestion();
    } else {
      setSessionScore((current) => ({ ...current, needsReview: current.needsReview + 1 }));
      setListenPhase("choice");
      setListenMessage("沒關係，先用三選一確認聲音，再重新寫一次。 ");
    }
  };

  const selectRemediation = (answer: string) => {
    if (answer !== currentQuestion.answer) {
      setRetryMessage("再聽聽看聲調，這個選項還不是剛剛的音節。 ");
      return;
    }
    setRetryMessage("你選對了！請在下方再寫一次這個音節。 ");
    setListenPhase("retry");
  };

  const submitRetryWriting = () => {
    setListenPhase("review");
    setListenMessage("這是補強後的手寫答案，請家長再次判定。 ");
  };

  const navigate = (next: View) => {
    if (next !== "listen") clearListenTimers();
    setView(next);
  };

  const renderHome = () => (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">一年級 · 第一課</span>
          <h1>今天也來<br /><em>練一下注音</em></h1>
          <p>不用登入、不用記名字，打開就能練。每天一點點，把聽到的聲音寫下來。</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => setView("courses")}>開始今天的練習 <span>→</span></button>
            <span className="quiet-note"><span className="tiny-spark">✦</span> 適合 iPad 手寫</span>
          </div>
        </div>
        <div className="hero-illustration" aria-label="注音練習插圖" role="img">
          <div className="sun-shape" />
          <div className="letter-bubble bubble-one">ㄅ</div>
          <div className="letter-bubble bubble-two">ㄇ</div>
          <div className="letter-bubble bubble-three">ㄓ</div>
          <div className="notebook-card"><span className="notebook-title">我的練習本</span><div className="notebook-line"><b>ㄅ</b><i /><b>ㄆ</b><i /></div><div className="notebook-line short"><b>ㄇ</b><i /><b>ㄈ</b><i /></div><span className="check-sticker">✓</span></div>
        </div>
      </section>

      <section className="home-stats" aria-label="練習摘要">
        <div><span className="stat-icon coral">✎</span><span><small>今日練習</small><strong>1 <em>/ 2</em></strong></span></div>
        <div><span className="stat-icon mint">◌</span><span><small>最近課程</small><strong>第一課</strong></span></div>
        <div><span className="stat-icon sky">↗</span><span><small>練習方式</small><strong>自己操作</strong></span></div>
      </section>

      <section className="content-section">
        <div className="section-title-row"><div><span className="eyebrow">Pick up where you left off</span><h2>最近練習</h2></div><button className="text-button" type="button" onClick={() => setView("courses")}>看全部課程 <span>→</span></button></div>
        <button className="recent-card" type="button" onClick={() => setView("lesson")}>
          <span className="lesson-number">01</span><span className="recent-copy"><small>第一課</small><strong>小明是個好學生</strong><span>課文默寫・聽寫</span></span><span className="progress-ring"><b>40%</b><small>已開始</small></span><span className="card-arrow">→</span>
        </button>
      </section>

      <section className="tip-card"><span className="tip-icon">☼</span><span><strong>給陪練的大人</strong><small>聽寫時會先播放兩次，時間到才會請你幫忙判定，孩子可以安心慢慢寫。</small></span><button type="button" onClick={() => setView("more")} aria-label="查看陪練說明">→</button></section>
    </>
  );

  const renderCourses = () => (
    <section className="page-section">
      <SectionHeading eyebrow="COURSES" title="選擇課程" description="每一課都從一小段注音開始，按自己的步調練習就好。" />
      <div className="course-grid">
        <button className="course-tile featured" type="button" onClick={() => setView("lesson")}><span className="course-badge">現在練習</span><span className="course-tile-number">01</span><strong>第一課</strong><b>小明是個好學生</b><small>默寫 · 聽寫</small><span className="tile-arrow">→</span></button>
        {[
          ["02", "第二課", "快樂上學去"],
          ["03", "第三課", "我的好朋友"],
          ["04", "第四課", "一起來學習"],
        ].map(([number, title, subtitle]) => <button className="course-tile locked" type="button" key={number} onClick={() => setFillMessage("這一課正在準備中，先來完成第一課吧！ ")}><span className="course-tile-number">{number}</span><strong>{title}</strong><b>{subtitle}</b><small>即將開放</small><span className="lock-icon">⌁</span></button>)}
      </div>
      <div className="course-note"><span>☑</span><p><strong>題庫由老師整理</strong><br />每個音節都經過確認，孩子可以專心看、聽、寫。</p></div>
    </section>
  );

  const renderLesson = () => (
    <section className="page-section lesson-page">
      <button className="back-link" type="button" onClick={() => setView("courses")}>← 回到課程</button>
      <div className="lesson-heading"><div><span className="eyebrow">LESSON 01</span><h1>小明是個好學生</h1><p>第一課 · 兩種方式，自己選一個開始。</p></div><span className="lesson-stamp">先看<br />再寫</span></div>
      <div className="mode-grid">
        <button className="mode-card fill-mode" type="button" onClick={() => setView("fill")}><span className="mode-icon">ㄇ</span><span className="mode-copy"><small>第一關</small><strong>課文默寫</strong><p>看直式注音格，把缺少的音節拖回去。</p><b>開始練習 <span>→</span></b></span></button>
        <button className="mode-card listen-mode" type="button" onClick={openListening}><span className="mode-icon">◖</span><span className="mode-copy"><small>第二關</small><strong>聽寫</strong><p>聽聲音、自由手寫，最後交給家長判定。</p><b>開始練習 <span>→</span></b></span></button>
      </div>
      <div className="lesson-rule"><span>小提醒</span><p>課文默寫裡看到的是<strong>注音，不是國字</strong>。每一格代表完整的一個音節。</p></div>
    </section>
  );

  const renderFillBlank = () => (
    <section className="page-section fill-page">
      <button className="back-link" type="button" onClick={() => setView("lesson")}>← 回到第一課</button>
      <div className="practice-title"><div><span className="eyebrow">第一關 · 課文默寫</span><h1>把音節放回課文裡</h1><p>整篇課文用直式注音呈現。試著讀一讀，再把下方卡片拖進空格。</p></div><span className="step-pill">1 / 2</span></div>
      <div className="fill-progress"><span className="progress-label">完成度</span><span className="progress-track"><i style={{ width: `${(Object.keys(fillAnswers).length / blankIndexes.length) * 100}%` }} /></span><strong>{Object.keys(fillAnswers).length} / {blankIndexes.length}</strong></div>
      <div className="zhuyin-sheet">
        <div className="sheet-top"><span>第一課</span><small>一個空格 = 一個完整音節</small></div>
        <div className="syllable-row">
          {lessonItems.map((item, index) => <div className={`syllable-cell ${blankIndexes.includes(index) ? "is-target" : ""} ${fillAnswers[index] ? "is-filled" : ""}`} key={item.character} onPointerUp={() => dragging !== null && placeFillAnswer(dragging, index)} onClick={() => selectedCard !== null && placeFillAnswer(selectedCard, index)}>{fillAnswers[index] ? <><span className="filled-check">✓</span><ZhuyinStack text={fillAnswers[index]} /></> : blankIndexes.includes(index) ? <ZhuyinStack text="" empty /> : <ZhuyinStack text={item.zhuyin} />}<small className="cell-position">{index + 1}</small></div>)}
        </div>
        <div className="sheet-hint"><span>讀法提示</span><strong>ㄒㄧㄠˇ　ㄇㄧㄥˊ　ㄕˋ　ㄍㄜˋ　ㄏㄠˇ　ㄒㄩㄝˊ　ㄕㄥ</strong></div>
      </div>
      <div className="fill-options"><div className="options-heading"><div><span className="eyebrow">音節卡片</span><h2>拖曳完整音節</h2></div><small>支援觸控、滑鼠與 iPad</small></div><div className="option-row">{fillOptions.map((option, index) => <button key={option.zhuyin} type="button" className={`syllable-card ${dragging === index || selectedCard === index ? "is-dragging" : ""}`} onPointerDown={() => setDragging(index)} onPointerUp={() => { setSelectedCard(index); setDragging(null); }} onClick={() => setSelectedCard(index)}><ZhuyinStack text={option.zhuyin} /><span>{option.character}</span></button>)}</div><p className="feedback-line" aria-live="polite"><span className={fillMessage.startsWith("答對") ? "good" : ""}>{fillMessage}</span></p></div>
      {fillComplete && <div className="completion-banner"><span>✓</span><p><strong>這一段完成了！</strong><small>接著進入聽寫，試試看把聲音寫下來。</small></p><button type="button" className="primary-button" onClick={openListening}>進入聽寫 <span>→</span></button></div>}
    </section>
  );

  const renderPractice = () => (
    <section className="page-section">
      <SectionHeading eyebrow="YOUR PRACTICE" title="練習紀錄" description="把需要再看一次的音節留下來，下次從這裡繼續。" />
      <div className="practice-summary"><div className="summary-score"><span>本週練習</span><strong>1</strong><small>次</small></div><div className="summary-copy"><span className="eyebrow">KEEP GOING</span><h2>每天 5 分鐘，慢慢變熟悉。</h2><p>完成一個小練習，就是很棒的進度。</p></div><span className="summary-doodle">✦</span></div>
      <div className="practice-list"><div className="section-title-row"><div><span className="eyebrow">RECENT</span><h2>最近練習</h2></div><span className="list-count">1 個紀錄</span></div><button className="practice-row" type="button" onClick={() => setView("lesson")}><span className="practice-row-icon">01</span><span><strong>第一課・小明是個好學生</strong><small>課文默寫 · 尚未完成聽寫</small></span><b>繼續 <span>→</span></b></button></div>
      <div className="empty-reinforce"><span>☼</span><strong>目前沒有需要補強的題目</strong><small>完成聽寫後，家長標記需要補強的題目會出現在這裡。</small></div>
    </section>
  );

  const renderMore = () => (
    <section className="page-section more-page">
      <SectionHeading eyebrow="MORE" title="更多" description="簡單的說明與設定，陪孩子一起練習。" />
      <div className="more-list"><button type="button"><span className="more-list-icon mint">?</span><span><strong>使用說明</strong><small>第一次使用，先看這裡</small></span><b>→</b></button><button type="button"><span className="more-list-icon sky">♡</span><span><strong>給家長的話</strong><small>為什麼不需要孩子註冊</small></span><b>→</b></button><button type="button"><span className="more-list-icon cream">♫</span><span><strong>聽寫設定</strong><small>目前播放 2 次 · 每題 30 秒</small></span><b>→</b></button><button type="button"><span className="more-list-icon coral">i</span><span><strong>關於這個網站</strong><small>第一版測試版本 · v0.1</small></span><b>→</b></button></div>
      <div className="privacy-card"><span>◌</span><p><strong>這裡不收集孩子的個人資料</strong><small>不需要姓名、Email 或帳號，練習紀錄只留在目前的裝置上。</small></p></div>
    </section>
  );

  const renderResult = () => (
    <section className="page-section result-page">
      <div className="result-celebration"><span className="result-spark">✦</span><div className="result-check">✓</div><span className="result-spark right">✦</span></div>
      <span className="eyebrow">PRACTICE COMPLETE</span><h1>練習完成！</h1><p className="result-intro">今天的第一課，你已經往前走了一小步。</p>
      <div className="result-card"><div><span className="result-icon fill">ㄇ</span><span><strong>課文默寫</strong><small>直式注音格 · 已完成</small></span><b>✓</b></div><div><span className="result-icon listen">◖</span><span><strong>聽寫</strong><small>{sessionScore.listeningCorrect} / {listeningQuestions.length} 題完成</small></span><b>✓</b></div></div>
      <div className="result-note"><span>☼</span><p><strong>需要再練習：{sessionScore.needsReview} 題</strong><small>別急，補強就是學習的一部分。下次從「練習」繼續就好。</small></p></div>
      <div className="result-actions"><button className="primary-button" type="button" onClick={() => { resetListeningQuestion(0); setView("listen"); }}>再練一次 <span>↻</span></button><button className="secondary-button" type="button" onClick={() => setView("lesson")}>回到課次</button></div>
    </section>
  );

  const renderFocusMode = () => {
    const choiceAnswers = [currentQuestion.answer, ...currentQuestion.distractors];
    return (
    <main className="focus-shell">
      <header className="focus-topbar"><button type="button" className="focus-exit" onClick={leaveFocus}>← <span>離開</span></button><div className="focus-question"><small>第一課 · 聽寫</small><strong>第 {listenIndex + 1} 題 <em>/ {listeningQuestions.length}</em></strong></div><div className="focus-meta"><span className={secondsLeft <= 8 ? "urgent" : ""}>◷ {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}</span><span>🔊 {playCount} 次</span></div></header>
      <div className="focus-content">
        <div className="focus-intro"><span className="focus-kicker">{listenPhase === "ready" ? "準備好了嗎？" : listenPhase === "active" ? "聽到什麼，就寫什麼" : listenPhase === "review" ? "請家長幫忙看看" : listenPhase === "choice" ? "先選一個音節" : "再寫一次"}</span><h1>{listenPhase === "ready" ? "按下開始聽，題目才會播放。" : listenPhase === "active" ? "可以邊聽邊寫。" : listenPhase === "review" ? "這題寫得怎麼樣？" : listenPhase === "choice" ? "沒關係，我們再確認一次。" : "把剛剛聽到的寫下來。"}</h1><p aria-live="polite">{listenPhase === "choice" ? retryMessage : listenPhase === "retry" ? retryMessage : listenMessage}</p></div>
        <div className={`canvas-zone ${listenPhase === "review" || listenPhase === "choice" ? "is-locked" : ""}`}><div className="canvas-paper"><canvas ref={canvasRef} onPointerDown={beginDrawing} onPointerMove={draw} onPointerUp={endDrawing} onPointerCancel={endDrawing} onPointerLeave={endDrawing} aria-label="手寫區" /><span className="canvas-placeholder">{listenPhase === "ready" ? "按下開始後，在這裡手寫" : listenPhase === "review" ? "手寫答案" : "在這裡自由書寫"}</span></div><div className="canvas-toolbar"><button type="button" onClick={clearCanvas} disabled={listenPhase !== "active" && listenPhase !== "retry"}>清除</button><span>touch-action: none · 支援觸控筆</span></div></div>
        {listenPhase === "ready" && <button type="button" className="listen-start-button" onClick={startListening}><span className="play-circle">▶</span><span><strong>開始聽</strong><small>播放 2 次 · 作答 30 秒</small></span><b>→</b></button>}
        {listenPhase === "active" && <div className="active-tip"><span className="pulse-dot" /> 播放與書寫同步進行中　·　8 秒後播放第二次</div>}
        {listenPhase === "review" && <div className="parent-review"><div className="answer-reveal"><span>正確答案</span><ZhuyinStack text={currentQuestion.answer} /></div><p>請家長依照孩子的手寫內容判定，不需要自動辨識。</p><div className="review-actions"><button type="button" className="review-correct" onClick={() => handleParentDecision("correct")}>✓ 答對</button><button type="button" className="review-retry" onClick={() => handleParentDecision("needs_review")}>↻ 需要補強</button></div></div>}
        {listenPhase === "choice" && <div className="choice-panel"><div className="choice-options">{choiceAnswers.map((answer) => <button type="button" key={answer} onClick={() => selectRemediation(answer)}><ZhuyinStack text={answer} /></button>)}</div><p>{retryMessage || "選出你剛剛聽到的完整音節。"}</p></div>}
        {listenPhase === "retry" && <button type="button" className="retry-submit" onClick={submitRetryWriting}>我寫好了，請家長看看 <span>→</span></button>}
      </div>
    </main>
    );
  };

  const renderMain = () => {
    switch (view) {
      case "courses": return renderCourses();
      case "practice": return renderPractice();
      case "more": return renderMore();
      case "lesson": return renderLesson();
      case "fill": return renderFillBlank();
      case "result": return renderResult();
      default: return renderHome();
    }
  };

  if (isFocusMode) return renderFocusMode();

  return (
    <div className="app-shell">
      <AppHeader onHome={() => setView("home")} />
      <main className="main-content">{renderMain()}</main>
      <BottomNav active={view === "lesson" || view === "fill" || view === "result" ? "courses" : view} onNavigate={navigate} />
    </div>
  );
}
