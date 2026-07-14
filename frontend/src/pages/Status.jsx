import { Link, useNavigate } from "react-router-dom";
import { Home, RotateCw, ArrowLeft } from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import { Button } from "../components/ui";
import { NotFound, Offline, ErrorState } from "../illustrations";
import "./Status.css";

function StatusShell({ illustration, eyebrow, title, description, actions }) {
  return (
    <PageWrapper>
      <div className="cr-status">
        <div className="cr-status__art" aria-hidden="true">
          {illustration}
        </div>
        <span className="cr-status__eyebrow">{eyebrow}</span>
        <h1 className="cr-status__title">{title}</h1>
        <p className="cr-status__description">{description}</p>
        <div className="cr-status__actions">{actions}</div>
      </div>
    </PageWrapper>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <StatusShell
      illustration={<NotFound size={260} />}
      eyebrow="404"
      title="This shelf is empty."
      description="The page you're looking for has been moved, removed, or never existed. Try heading back to your library."
      actions={
        <>
          <Button onClick={() => navigate(-1)} variant="outline" leftIcon={<ArrowLeft size={16} />}>
            Go back
          </Button>
          <Link to="/" className="cr-btn cr-btn--primary cr-btn--lg">
            <Home size={16} /> Back to home
          </Link>
        </>
      }
    />
  );
}

export function ServerErrorPage({ error, reset }) {
  return (
    <StatusShell
      illustration={<ErrorState size={260} />}
      eyebrow="500"
      title="Something went sideways."
      description={
        error?.message ||
        "An unexpected error occurred. We've been notified — please try again in a moment."
      }
      actions={
        <>
          {typeof reset === "function" ? (
            <Button onClick={reset} leftIcon={<RotateCw size={16} />}>
              Try again
            </Button>
          ) : (
            <Link to="/" className="cr-btn cr-btn--primary cr-btn--lg">
              <Home size={16} /> Back to home
            </Link>
          )}
        </>
      }
    />
  );
}

export function OfflinePage() {
  return (
    <StatusShell
      illustration={<Offline size={260} />}
      eyebrow="Offline"
      title="Your library went quiet."
      description="We can't reach the network right now. Check your connection and try again — your reading will resume where you left off."
      actions={
        <Button
          onClick={() => window.location.reload()}
          leftIcon={<RotateCw size={16} />}
        >
          Retry connection
        </Button>
      }
    />
  );
}