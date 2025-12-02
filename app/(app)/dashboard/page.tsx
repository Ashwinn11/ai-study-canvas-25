import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - Masterly',
  description: 'Your learning dashboard',
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back!</h1>
        <p className="mt-2 text-muted-foreground">
          Here's an overview of your learning progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Seeds"
          value="0"
          description="Study materials uploaded"
          className="text-primary"
        />
        <StatCard
          title="Flashcards Due"
          value="0"
          description="Ready for review"
          className="text-secondary"
        />
        <StatCard
          title="Learning Streak"
          value="0 days"
          description="Keep it up!"
          className="text-success"
        />
        <StatCard
          title="Accuracy"
          value="0%"
          description="Overall performance"
          className="text-accent"
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <QuickActionCard
            title="Upload Material"
            description="Add new study content"
            href="/upload"
            icon="📤"
          />
          <QuickActionCard
            title="Practice Flashcards"
            description="Review due cards"
            href="/seeds"
            icon="🎴"
          />
          <QuickActionCard
            title="Create Exam"
            description="Organize your materials"
            href="/exams"
            icon="📚"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="text-center py-12 text-muted-foreground">
          <p>No recent activity yet</p>
          <p className="text-sm mt-2">Start by uploading your first study material!</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  className,
}: {
  title: string;
  value: string;
  description: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${className}`}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-lg border border-border bg-card p-6 transition-all hover:bg-accent/50 hover:border-accent"
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl">{icon}</div>
        <div className="space-y-1">
          <p className="font-semibold group-hover:text-primary transition-colors">
            {title}
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </a>
  );
}
