"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

export function LoginForm() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, register, isLoading, error, setError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isRegister) {
        await register(email, username, password);
      } else {
        await login(email, password);
      }
    } catch {
      // Error is already set in store
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Martin-Coder</h1>
        <p className="text-muted-foreground mt-2">
          {isRegister ? "Create an account" : "Sign in to continue"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="you@example.com"
            required
          />
        </div>

        {isRegister && (
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="johndoe"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isLoading ? "Loading..." : isRegister ? "Create Account" : "Sign In"}
        </button>
      </form>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError(null);
          }}
          className="text-primary hover:underline"
        >
          {isRegister
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
