'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Room = { id: number; name: string }
type Msg = {
  id: number
  room_id: number
  user_id: string
  content: string | null
  file_url: string | null
  file_type: string | null
  created_at: string
  profiles?: { username: string }
}

const AVATAR_COLORS = ['bg-pink-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-rose-500']
function colorFor(id: string) {
  let h = 0
  for (const c of id) h = c.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function Chat() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomId, setRoomId] = useState<number | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [myEmail, setMyEmail] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/login'; return }
      setUserId(data.user.id)
      setMyEmail(data.user.email!)
      const { data: rm } = await supabase
        .from('room_members').select('room_id, rooms(id, name)').eq('user_id', data.user.id)
      const list = (rm ?? []).map((r: any) => r.rooms as Room)
      setRooms(list)
      if (list[0]) setRoomId(list[0].id)
    })
  }, [])

  useEffect(() => {
    if (!roomId) return
    supabase.from('messages').select('*, profiles(username)').eq('room_id', roomId).order('created_at')
      .then(({ data }) => setMsgs(data as Msg[] ?? []))

    const ch = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async payload => {
          const { data: prof } = await supabase.from('profiles').select('username').eq('id', (payload.new as Msg).user_id).single()
          setMsgs(m => [...m, { ...(payload.new as Msg), profiles: prof ?? undefined }])
        })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [roomId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send() {
    if (!text.trim() || !userId || !roomId) return
    await supabase.from('messages').insert({ user_id: userId, room_id: roomId, content: text })
    setText('')
  }

  async function upload() {
    const file = fileRef.current?.files?.[0]
    if (!file || !userId || !roomId) return
    const path = `${userId}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('chat-files').upload(path, file)
    if (error) return alert(error.message)
    const { data } = supabase.storage.from('chat-files').getPublicUrl(path)
    const file_type = file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : 'file'
    await supabase.from('messages').insert({ user_id: userId, room_id: roomId, file_url: data.publicUrl, file_type })
    fileRef.current!.value = ''
  }

  const activeRoom = rooms.find(r => r.id === roomId)

  return (
    <div suppressHydrationWarning className="flex h-screen bg-slate-50">
      <aside className="flex w-64 flex-col bg-gradient-to-b from-indigo-600 via-violet-600 to-fuchsia-600 p-4 text-white">
        <div className="mb-6 flex items-center gap-2 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg font-bold">💬</div>
          <h2 className="text-lg font-bold">ChatApp</h2>
        </div>

        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-white/60">Rooms</p>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoomId(r.id)}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                roomId === r.id ? "bg-white text-indigo-700 shadow-md" : "text-white/90 hover:bg-white/10"
              }`}
            >
              # {r.name}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${colorFor(userId ?? "")} text-xs font-bold`}
          >
            {myEmail[0]?.toUpperCase()}
          </div>
          <p className="truncate text-xs text-white/90">{myEmail}</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col bg-gradient-to-br from-slate-50 to-indigo-50/40">
        <div className="border-b border-slate-200 bg-white/70 px-6 py-3 backdrop-blur">
          <h3 className="font-semibold text-slate-800"># {activeRoom?.name ?? "..."}</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {msgs.map((m) => {
            const mine = m.user_id === userId;
            return (
              <div key={m.id} className={`mb-4 flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${colorFor(m.user_id)}`}
                >
                  {(mine ? myEmail : (m.profiles?.username ?? "?"))[0]?.toUpperCase()}
                </div>
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                    mine
                      ? "rounded-br-sm bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white"
                      : "rounded-bl-sm bg-white text-slate-800"
                  }`}
                >
                  {!mine && <p className="mb-1 text-xs font-bold text-fuchsia-600">{m.profiles?.username}</p>}
                  {m.content && <p>{m.content}</p>}
                  {m.file_type === "image" && <img src={m.file_url!} className="mt-1 max-w-full rounded-lg" />}
                  {m.file_type === "video" && (
                    <video src={m.file_url!} controls className="mt-1 max-w-full rounded-lg" />
                  )}
                  {m.file_type === "file" && (
                    <a
                      href={m.file_url!}
                      target="_blank"
                      className={`mt-1 block underline ${mine ? "text-white" : "text-indigo-600"}`}
                    >
                      Download file
                    </a>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Tulis pesan..."
            className="flex-1 rounded-full border-2 border-slate-200 px-4 py-2.5 text-sm focus:border-fuchsia-400 focus:outline-none"
          />
          <input ref={fileRef} type="file" onChange={upload} className="hidden" id="file-input" />
          <label
            htmlFor="file-input"
            className="cursor-pointer rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-3 py-2.5 text-sm text-white shadow hover:opacity-90"
          >
            📎
          </label>
          <button
            onClick={send}
            className="rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:opacity-90"
          >
            Kirim
          </button>
        </div>
      </main>
    </div>
  );
}
