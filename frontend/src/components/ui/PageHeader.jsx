import Breadcrumb from "./Breadcrumb";
import "./PageHeader.css";

export default function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  align = "left",
  size = "md",
  className = "",
}) {
  return (
    <header className={`cr-page-header cr-page-header--${size} cr-page-header--${align} ${className}`}>
      {breadcrumbs ? <Breadcrumb items={breadcrumbs} /> : null}
      <div className="cr-page-header__row">
        <div className="cr-page-header__text">
          {eyebrow ? <span className="cr-page-header__eyebrow">{eyebrow}</span> : null}
          {title ? <h1 className="cr-page-header__title">{title}</h1> : null}
          {description ? <p className="cr-page-header__description">{description}</p> : null}
        </div>
        {actions ? <div className="cr-page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}

export function PageSection({ title, description, actions, children, className = "" }) {
  return (
    <section className={`cr-section ${className}`}>
      {(title || description || actions) ? (
        <header className="cr-section__head">
          <div>
            {title ? <h2 className="cr-section__title">{title}</h2> : null}
            {description ? <p className="cr-section__description">{description}</p> : null}
          </div>
          {actions ? <div className="cr-section__actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}