import Card from "./Card";
import BookCover from "./BookCover";
import Badge from "./Badge";
import "./BookCard.css";

export default function BookCard({
  book = {},
  variant = "default",
  onClick,
  className = "",
  badge,
  progress, // 0..1
  showProgress = false,
  children,
  ...rest
}) {
  const {
    title = "Untitled",
    author = "Unknown",
    coverUrl,
    category,
  } = book;

  return (
    <Card
      interactive={Boolean(onClick)}
      padding="none"
      onClick={onClick}
      className={`cr-book-card cr-book-card--${variant} ${className}`}
      {...rest}
    >
      <div className="cr-book-card__cover-wrap">
        <BookCover
          title={title}
          author={author}
          coverUrl={coverUrl}
          className="cr-book-card__cover"
        />
        {showProgress && progress != null ? (
          <div className="cr-book-card__progress" aria-label={`${Math.round(progress * 100)}% read`}>
            <span style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
          </div>
        ) : null}
        {badge ? <div className="cr-book-card__badge">{badge}</div> : null}
      </div>
      <div className="cr-book-card__body">
        <h3 className="cr-book-card__title" title={title}>{title}</h3>
        <p className="cr-book-card__author" title={author}>{author}</p>
        {category ? <Badge variant="neutral" size="sm">{category}</Badge> : null}
      </div>
      {children}
    </Card>
  );
}