export function PageHeading({
  title,
  description,
  artwork,
}: {
  title: string;
  description?: string;
  artwork?: string;
}) {
  return (
    <div className="page-heading">
      <div className="page-heading-copy">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {artwork && <img className="page-heading-art" src={artwork} alt="" aria-hidden="true" />}
    </div>
  );
}
