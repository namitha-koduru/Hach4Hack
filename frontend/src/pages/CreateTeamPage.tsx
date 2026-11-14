import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, generateIdempotencyKey } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, AlertCircle, X, Sparkles, KeyRound } from 'lucide-react';

const SUGGESTED_SKILLS = [
  'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python', 'Go', 'Rust',
  'Docker', 'AWS', 'TailwindCSS', 'UI/UX Design', 'Kubernetes', 'GraphQL'
];

export const CreateTeamPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [hackathons, setHackathons] = useState<any[]>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState<string[]>(['TypeScript', 'PostgreSQL']);
  const [skillInput, setSkillInput] = useState('');
  const [generateInvite, setGenerateInvite] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient('/hackathons')
      .then((res) => {
        setHackathons(res.data);
        if (res.data.length > 0) {
          setSelectedHackathonId(res.data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !requiredSkills.includes(trimmed)) {
      setRequiredSkills([...requiredSkills, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requiredSkills.length === 0) {
      setError('Please add at least one required skill');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<{ success: boolean; data: { team: { id: string } } }>('/teams', {
        method: 'POST',
        idempotencyKey: generateIdempotencyKey(),
        body: JSON.stringify({
          hackathonId: selectedHackathonId,
          name: name.trim(),
          description: description.trim(),
          requiredSkills,
          generateInviteCode: generateInvite,
        }),
      });

      await refreshUser();
      navigate(`/teams/${res.data.team.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-[#111726] border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Create a Hackathon Team</h1>
            <p className="text-xs text-slate-400">
              Form your squad with atomic concurrency locking & deterministic succession
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Hackathon Select */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Select Hackathon
            </label>
            <select
              value={selectedHackathonId}
              onChange={(e) => setSelectedHackathonId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus-visible:ring-indigo-500"
            >
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title} (Team Size: {h.minTeamSize}-{h.maxTeamSize})
                </option>
              ))}
            </select>
          </div>

          {/* Team Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Team Name (Unique within Hackathon)
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Distributed Titans"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus-visible:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Team Description & Project Vision
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you plan to build, your tech stack, and goals..."
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus-visible:ring-indigo-500 resize-none"
            />
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Required Skills You Are Looking For
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-rose-400 focus:outline-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
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
                placeholder="Type skill & press Enter"
                className="flex-1 px-4 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus-visible:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => addSkill(skillInput)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                Add
              </button>
            </div>

            {/* Suggested quick chips */}
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-slate-500 mr-1 self-center">Suggestions:</span>
              {SUGGESTED_SKILLS.slice(0, 7).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => addSkill(s)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                >
                  +{s}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Invite Checkbox */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Generate One-Time Invitation Code
                </span>
                <span className="text-[11px] text-slate-500">
                  Allows direct invite-based recruitment bypassing public requests
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={generateInvite}
              onChange={(e) => setGenerateInvite(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
          >
            {loading ? 'Creating Squad...' : 'Create Team & Claim Leadership'}
          </button>
        </form>
      </div>
    </div>
  );
};

