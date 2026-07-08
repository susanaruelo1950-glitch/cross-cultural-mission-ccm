import { ShieldAlert, LogIn } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  message?: string;
  showSignIn?: boolean;
}

/**
 * Consistent permission-denied surface for pages/panels that require a role
 * the current user doesn't have.
 */
export function PermissionError({
  title = "You don't have permission",
  message = "This section is limited to authorized team members. Ask an administrator if you think this is a mistake.",
  showSignIn = false,
}: Props) {
  return (
    <Card
      role="alert"
      aria-live="polite"
      className="card-soft mx-auto max-w-md p-8 text-center"
    >
      <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" aria-hidden />
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {showSignIn ? (
        <Button asChild className="mt-4 rounded-full">
          <Link to="/auth">
            <LogIn className="h-4 w-4" /> Sign in
          </Link>
        </Button>
      ) : null}
    </Card>
  );
}
