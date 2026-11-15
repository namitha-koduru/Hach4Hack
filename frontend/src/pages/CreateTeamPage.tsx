import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, generateIdempotencyKey } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, AlertCircle, X, KeyRound } from 'lucide-react';

const SUGGESTED_SKILLS = [
  'TypeScript',
  'React',
  'Node.js',
  'PostgreSQL',
  'Python',
  'Go',
  'Rust',
  'Docker',
  'AWS',
  'TailwindCSS',
  'UI/UX Design',
  'Kubernetes',
  'GraphQL',
];

export const CreateTeamPage: React.FC = () => {
  const { refreshUser } = useAuth();
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
      <div className="bg-[#111411] border border-white/15 rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-3.5 mb-6 pb-6 border-b border-white/10">
          <div className="w-11 h-11 rounded-lg bg-[#d4ff33] text-[#080a08] flex items-center justify-center shrink-0">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-[#f5f7f2]">
              Create a Hackathon Team
            </h1>
            <p className="text-xs text-[#9ca396] mt-0.5">
              Atomic concurrency seat locks &amp; deterministic leadership succession
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
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1.5">
              Select Hackathon
            </label>
            <select
              value={selectedHackathonId}
              onChange={(e) => setSelectedHackathonId(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] focus:border-[#d4ff33] focus:outline-none"
            >
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title} (Size: {h.minTeamSize}–{h.maxTeamSize})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1.5">
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
              className="w-full px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] placeholder-[#9ca396]/50 focus:border-[#d4ff33] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1.5">
              Project Vision
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you plan to build and your target stack..."
              className="w-full px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-xs text-[#f5f7f2] placeholder-[#9ca396]/50 focus:border-[#d4ff33] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-2">
              Required Stack
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 font-mono px-2.5 py-1 rounded text-xs font-medium bg-[#d4ff33]/10 text-[#d4ff33] border border-[#d4ff33]/30"
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

            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_SKILLS.slice(0, 7).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => addSkill(s)}
                  className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#080a08] hover:border-[#d4ff33]/40 text-[#9ca396] hover:text-[#d4ff33] border border-white/10"
                >
                  +{s}
                </button>
              ))}
            </div>
          </div>

          <label className="p-4 rounded-xl bg-[#080a08] border border-white/10 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <KeyRound className="w-4 h-4 text-[#d4ff33] shrink-0" />
              <div>
                <span className="text-xs font-semibold text-[#f5f7f2] block">
                  Generate One-Time Invitation Code
                </span>
                <span className="text-[11px] text-[#9ca396]">
                  Allows direct invite-based recruitment
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={generateInvite}
              onChange={(e) => setGenerateInvite(e.target.checked)}
              className="w-4 h-4 accent-[#d4ff33] rounded"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating Squad...' : 'Create Team & Claim Leadership'}
          </button>
        </form>
      </div>
    </div>
  );
};


