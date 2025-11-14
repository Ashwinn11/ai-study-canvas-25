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
        <h1 className="text-3xl font-bold text-white">Welcome back!</h1>
        <p className="mt-2 text-gray-400">
          Here's an overview of your learning progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Seeds"
          value="0"
          description="Study materials uploaded"
          gradient="from-[#ff7664] to-[#ff8874]"
        />
        <StatCard
          title="Flashcards Due"
          value="0"
          description="Ready for review"
          gradient="from-[#F5C6FF] to-[#E5B6FF]"
        />
        <StatCard
          title="Learning Streak"
          value="0 days"
          description="Keep it up!"
          gradient="from-[#78D6A1] to-[#68C691]"
        />
        <StatCard
          title="Accuracy"
          value="0%"
          description="Overall performance"
          gradient="from-[#54B5FF] to-[#44A5EF]"
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
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
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
        <div className="text-center py-12 text-gray-400">
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
  gradient,
}: {
  title: string;
  value: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {value}
          </p>
          <p className="text-xs text-gray-500">{description}</p>
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
      className="group rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-6 transition-all hover:bg-white/10 hover:border-white/20"
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl">{icon}</div>
        <div className="space-y-1">
          <p className="font-semibold text-white group-hover:text-[#ff7664] transition-colors">
            {title}
          </p>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
    </a>
  );
}
