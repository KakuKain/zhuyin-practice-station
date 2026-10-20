/** A course card picture's 256 px copy, written by scripts/build-card-thumbs.ts. */
export const cardThumbName = (name: string) => `thumbs/${name}`;

/** The page-relative path a card loads for `course-art/<name>`. */
export const cardThumb = (src: string) => src.replace(/^course-art\//, `course-art/thumbs/`);
