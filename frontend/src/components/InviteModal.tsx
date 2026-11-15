import React, { useState, useRef } from 'react';
import { X, Copy, Check, KeyRound, AlertCircle } from 'lucide-react';
import { apiClient, generateIdempotencyKey } from '../services/api';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string;
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
  const redeemKeyRef = useRef<{ code: string; key: string } | null>(null);

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
    const normalized = code.trim();
    if (!normalized) return;

    if (!redeemKeyRef.current || redeemKeyRef.current.code !== normalized) {
      redeemKeyRef.current = { code: normalized, key: generateIdempotencyKey() };
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient('/invites/redeem', {
        method: 'POST',
        idempotencyKey: redeemKeyRef.current.key,
        body: JSON.stringify({ code: normalized }),
      });
      redeemKeyRef.current = null;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080a08]/85"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-[#111411] border border-white/15 rounded-xl p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#9ca396] hover:text-[#f5f7f2] hover:bg-[#161a16] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {teamId ? (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-[#d4ff33]/10 border border-[#d4ff33]/30 flex items-center justify-center text-[#d4ff33]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#f5f7f2]">Team Invitation Code</h3>
                <p className="text-xs text-[#9ca396]">Share this code with prospective teammates</p>
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
                <div className="p-4 rounded-xl bg-[#080a08] border border-white/10 text-center">
                  <span className="font-mono text-[10px] font-semibold text-[#9ca396] uppercase tracking-widest block mb-1.5">
                    One-Time Invite Token
                  </span>
                  <div className="text-xl font-mono font-bold text-[#d4ff33] tracking-wider select-all">
                    {generatedCode}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy Invitation Code'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[#9ca396] leading-relaxed">
                  Generated codes are cryptographically secured, expire in 48 hours, and automatically reject once team capacity is reached.
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Generating...' : 'Generate New Code'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-[#d4ff33]/10 border border-[#d4ff33]/30 flex items-center justify-center text-[#d4ff33]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#f5f7f2]">Redeem Invitation Code</h3>
                <p className="text-xs text-[#9ca396]">Join a private or invite-only team instantly</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-[#d4ff33]/10 border border-[#d4ff33]/30 text-[#d4ff33] text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleRedeem} className="space-y-4">
              <div>
                <label htmlFor="invite-code" className="block font-mono text-[11px] uppercase tracking-wider text-[#9ca396] mb-1.5">
                  Invitation Code
                </label>
                <input
                  id="invite-code"
                  type="text"
                  placeholder="TF-XXXX-XXXX-XXXX-XXXX-..."
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-4 py-2.5 bg-[#080a08] border border-white/15 rounded-lg text-sm font-mono text-[#f5f7f2] placeholder-[#9ca396]/50 focus:border-[#d4ff33] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] disabled:opacity-50 transition-colors"
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


