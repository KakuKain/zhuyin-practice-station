import { MathWords } from "./MathChrome";
import { FlatArt, PictureArt, SolidArt, ThingArt } from "./ShapeArt";
import { choiceState, type Feedback } from "./SequenceViews";
import { flatNames, pictures, solidNames, things, type ShapeQuestion } from "./shape-round";

type StageProps<Kind extends ShapeQuestion["kind"]> = {
  question: Extract<ShapeQuestion, { kind: Kind }>;
  picks: number[];
  feedback: Feedback;
  onPick: (index: number) => void;
};

/** 第五課 方盒、圓罐、球: what to look at, and the cards to tap. */
export function ShapeStage(props: StageProps<ShapeQuestion["kind"]>) {
  const { question, picks, feedback, onPick } = props;
  switch (question.kind) {
    case "classify":
    case "trace":
      return (
        <div className="shape-stage">
          <div className="shape-thing">
            <ThingArt
              thing={question.thing}
              trace={question.kind === "trace"}
              label={things[question.thing].name}
            />
          </div>
          {question.kind === "classify" ? (
            <SolidChoices {...props} choices={question.choices} />
          ) : (
            <FlatChoices {...props} choices={question.choices} />
          )}
        </div>
      );
    case "stack":
    case "roll":
      return (
        <div className="shape-stage">
          <SolidChoices {...props} choices={question.choices} large />
        </div>
      );
    case "find":
      return (
        <div className="shape-find" role="group" aria-label="很多形狀">
          {question.pieces.map((piece, index) => (
            <button
              type="button"
              key={index}
              className={`shape-piece${choiceState(index, picks, feedback)}`}
              aria-label={`第 ${index + 1} 個形狀`}
              onClick={() => onPick(index)}
            >
              <FlatArt flat={piece.flat} variant={piece.variant} color={piece.color} />
            </button>
          ))}
        </div>
      );
    case "build":
      return (
        <div className="shape-stage">
          <div className="shape-thing is-picture">
            <PictureArt
              picture={question.picture}
              label={`用形狀拼成的${pictures[question.picture].name}`}
            />
          </div>
          <div className="sequence-choices" role="group" aria-label="選一個數">
            {question.choices.map((value, index) => (
              <button
                type="button"
                key={value}
                className={`sequence-card is-choice${choiceState(index, picks, feedback)}`}
                onClick={() => onPick(index)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      );
  }
}

/** 方盒, 圓罐 and 球, each a picture with its name in 國字注音. */
function SolidChoices({
  choices,
  picks,
  feedback,
  onPick,
  large = false,
}: {
  choices: (keyof typeof solidNames)[];
  picks: number[];
  feedback: Feedback;
  onPick: (index: number) => void;
  large?: boolean;
}) {
  return (
    <div className={`shape-choices${large ? " is-large" : ""}`} role="group" aria-label="選一個">
      {choices.map((solid, index) => (
        <button
          type="button"
          key={solid}
          className={`shape-card${choiceState(index, picks, feedback)}`}
          aria-label={solidNames[solid]}
          onClick={() => onPick(index)}
        >
          <SolidArt solid={solid} />
          <span aria-hidden="true">
            <MathWords text={solidNames[solid]} />
          </span>
        </button>
      ))}
    </div>
  );
}

/** 正方形, 長方形, 三角形 and 圓形, each drawn with its name. */
function FlatChoices({
  choices,
  picks,
  feedback,
  onPick,
}: {
  choices: (keyof typeof flatNames)[];
  picks: number[];
  feedback: Feedback;
  onPick: (index: number) => void;
}) {
  return (
    <div className="shape-choices is-flat" role="group" aria-label="選一個形狀">
      {choices.map((flat, index) => (
        <button
          type="button"
          key={flat}
          className={`shape-card${choiceState(index, picks, feedback)}`}
          aria-label={flatNames[flat]}
          onClick={() => onPick(index)}
        >
          <FlatArt flat={flat} color={index + 1} />
          <span aria-hidden="true">
            <MathWords text={flatNames[flat]} />
          </span>
        </button>
      ))}
    </div>
  );
}
