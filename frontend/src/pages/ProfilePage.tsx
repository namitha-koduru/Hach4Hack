import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { User, Check, AlertCircle, X } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      await apiClient('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          skills,
          timezone,
        }),
      });
      await refreshUser();
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-[#111411] border border-white/15 rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-3.5 mb-6 pb-6 border-b border-white/10">
          <div className="w-11 h-11 rounded-lg bg-[#d4ff33] text-[#080a08] flex items-center justify-center shrink-0">
            <User className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
              Participant Profile
            </h1>
            <p className="text-xs text-[#9ca396] mt-0.5">
              Update your technical stack and timezone for smarter squad matching
            </p>
          </div>
        </div>

        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-[#d4ff33]/10 border border-[#d4ff33]/30 text-[#d4ff33]'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1.5">
              Email (Permanent)
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-4 py-2.5 bg-[#080a08]/60 border border-white/10 rounded-lg text-xs font-mono text-[#9ca396] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] focus:border-[#d4ff33] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1.5">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] focus:border-[#d4ff33] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-2">
              Technical Skills
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 font-mono px-2.5 py-1 rounded text-xs font-medium bg-[#d4ff33]/10 text-[#d4ff33] border border-[#d4ff33]/30"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill(skillInput);
                  }
                }}
                placeholder="Add skill..."
                className="flex-1 px-4 py-2 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] placeholder-[#9ca396]/50 focus:border-[#d4ff33] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => addSkill(skillInput)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#161a16] hover:border-[#d4ff33]/50 text-[#f5f7f2] border border-white/15"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1.5">
              Primary Time Zone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] focus:border-[#d4ff33] focus:outline-none"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">America/New_York (UTC-5)</option>
              <option value="America/Chicago">America/Chicago (UTC-6)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
              <option value="Europe/London">Europe/London (UTC+0)</option>
              <option value="Europe/Berlin">Europe/Berlin (UTC+1)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
              <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};


