import React, { useState } from 'react';
import { X, Copy, Check, KeyRound, AlertCircle, ShieldAlert } from 'lucide-react';
import { apiClient, generateIdempotencyKey } from '../services/api';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string; // If provided, leader creates invite
  onSuccess?: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  teamId,
  onSuccess,
}) => {
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<{ success: boolean; data: { code: string; expiresAt: string } }>(
        `/teams/${teamId}/invites`,
        {
          method: 'POST',
          body: JSON.stringify({ expiresInHours: 48, maxUses: 4 }),
        }
      );
      setGeneratedCode(res.data.code);
    } catch (err: any) {
      setError(err.message || 'Failed to generate invitation code');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient('/invites/redeem', {
        method: 'POST',
        idempotencyKey: generateIdempotencyKey(),
        body: JSON.stringify({ code: code.trim() }),
      });
      setSuccessMsg('Successfully joined the team! Redirecting...');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to redeem invitation code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-[#111726] border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {teamId ? (
          // Leader Generate View
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Team Invitation Code</h3>
                <p className="text-xs text-slate-400">Share this code with prospective teammates</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {generatedCode ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Your One-Time Invite Code
                  </span>
                  <div className="text-xl font-mono font-bold text-indigo-400 tracking-wider">
                    {generatedCode}
                  </div>
                </div>

                <button
                  onClick={copyToClipboard}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Invitation Code'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generated codes are cryptographically secured, expire in 48 hours, and automatically reject once team capacity is reached.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
                >
                  {loading ? 'Generating...' : 'Generate New Code'}
                </button>
              </div>
            )}
          </div>
        ) : (
          // Participant Redeem View
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Redeem Invitation Code</h3>
                <p className="text-xs text-slate-400">Join a private or invite-only team instantly</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleRedeem} className="space-y-4">
              <div>
                <label htmlFor="invite-code" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Enter Invitation Code
                </label>
                <input
                  id="invite-code"
                  type="text"
                  placeholder="TF-XXXX-XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus-visible:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
              >
                {loading ? 'Validating Seat...' : 'Redeem & Join Team'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

