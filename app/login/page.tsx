'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setMsg(error ? error.message : 'Cek email untuk verifikasi akun.')
    setLoading(false)
  }

  async function signIn() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg(error.message)
    else window.location.href = '/chat'
    setLoading(false)
  }

  return (
    <div suppressHydrationWarning className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-slate-800">Selamat datang</h1>
        <p className="mb-6 text-sm text-slate-500">Masuk atau daftar untuk mulai chat</p>

        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            disabled={loading}
            onClick={signIn}
            className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Login
          </button>
          <button
            disabled={loading}
            onClick={signUp}
            className="flex-1 rounded-lg border border-indigo-600 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            Daftar
          </button>
        </div>

        {msg && <p className="mt-4 text-center text-sm text-slate-600">{msg}</p>}
      </div>
    </div>
  );
}
