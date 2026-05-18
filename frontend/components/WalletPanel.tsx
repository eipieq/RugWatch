"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, SignOut } from "@phosphor-icons/react";
import {
  fetchWalletBalance,
  fetchWalletStatus,
  walletLogin,
  walletLogout,
  walletVerify,
} from "@/lib/api";
import type { WalletStatus } from "@/lib/types";

interface Props {
  wallet?: WalletStatus;
  onChange: () => void;
}

type Step = "idle" | "otp";

export default function WalletPanel({ wallet: walletProp, onChange }: Props) {
  const [wallet, setWallet] = useState<WalletStatus | null>(walletProp ?? null);
  const [step, setStep] = useState<Step>("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [balanceUsd, setBalanceUsd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  const refresh = useCallback(async () => {
    try {
      const ws = await fetchWalletStatus();
      setWallet(ws);
      if (ws.logged_in) {
        const bal = await fetchWalletBalance().catch(() => null);
        if (bal?.ok) setBalanceUsd(bal.total_usd);
      } else {
        setBalanceUsd("");
      }
    } catch {
      setWallet(null);
    }
  }, []);

  useEffect(() => {
    if (walletProp) setWallet(walletProp);
  }, [walletProp]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await walletLogin(email);
      setPendingEmail(email);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await walletVerify(code);
      setWallet(result);
      if (result.balance?.ok) setBalanceUsd(result.balance.total_usd);
      setStep("idle");
      setCode("");
      onChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await walletLogout();
      setWallet({
        ok: true,
        logged_in: false,
        email: "",
        account_name: "",
        evm_address: "",
        login_type: "",
        is_new: false,
      });
      setBalanceUsd("");
      setStep("idle");
      onChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "logout failed");
    } finally {
      setLoading(false);
    }
  }

  if (wallet?.logged_in) {
    const addr = wallet.evm_address;
    return (
      <div className="card flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[3px] bg-indigo-50 flex items-center justify-center">
            <Wallet size={18} weight="regular" className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-800">OKX Agentic Wallet</p>
            <p className="text-xs text-neutral-500">
              {addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "connected"}
              {wallet.email ? ` · ${wallet.email}` : ""}
            </p>
            {balanceUsd && (
              <p className="text-xs text-neutral-400 mt-0.5">
                ${parseFloat(balanceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })} total
              </p>
            )}
          </div>
        </div>
        <button type="button" onClick={handleLogout} disabled={loading} className="btn-ghost">
          <SignOut size={20} weight="regular" />
          disconnect
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="card">
        <form onSubmit={handleVerify} className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-neutral-500 w-full">Code sent to {pendingEmail}</p>
          <input
            className="input max-w-[160px]"
            placeholder="verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={loading || !code} className="btn-primary">
            {loading ? "…" : "verify"}
          </button>
          <button type="button" onClick={() => setStep("idle")} className="btn-ghost">
            back
          </button>
        </form>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card">
      <form onSubmit={handleLogin} className="flex flex-wrap items-center gap-2">
        <Wallet size={20} weight="regular" className="text-indigo-300 shrink-0" />
        <span className="text-sm text-neutral-500">Connect OKX Agentic Wallet</span>
        <input
          type="email"
          className="input max-w-[200px]"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading || !email} className="btn-primary">
          {loading ? "…" : "send code"}
        </button>
      </form>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
