import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeaderActions } from "@/components/header-actions";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="min-h-full w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <HeaderActions />
      </div>
      <Card className="mt-6 border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This section is a navigation placeholder. The full dashboard
          experience lives on the main Dashboard page.
        </CardContent>
      </Card>
    </div>
  );
}
