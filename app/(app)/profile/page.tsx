import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile - Masterly',
  description: 'Your profile settings',
};

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
        <p className="mt-2 text-gray-400">
          Manage your account and preferences
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-8">
        <div className="text-center text-gray-400">
          <p>Profile settings coming soon...</p>
          <p className="text-sm mt-2">You'll be able to manage your preferences here</p>
        </div>
      </div>
    </div>
  );
}
