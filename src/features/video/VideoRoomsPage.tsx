import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { supabase } from "../../lib/supabase";

type SavedRoom = { id: string; title: string; createdAt: string; scheduledAt?: string; groupId?: string; groupName?: string };
type RoomGroup = { id: string; name: string; memberIds: string[] };
type Participant = { id: string; name: string; avatarUrl?: string; isHost: boolean; cameraOn: boolean; micOn: boolean; sharing: boolean; handRaised: boolean };
type ChatMessage = { id: string; from: string; name: string; text: string; sentAt: string };
type ReactionBurst = { id: string; from: string; name: string; emoji: "👏" | "❤️"; sentAt: string };
type SignalPayload = {
  from: string;
  to: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

const ROOM_PREFIX = "/video-room/";
const ROOMS_STORAGE = "lingvaedu-video-rooms";
const iceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(import.meta.env.VITE_TURN_URL
    ? [{
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME || "",
        credential: import.meta.env.VITE_TURN_CREDENTIAL || "",
      }]
    : []),
];

function roomUrl(id: string) {
  return `${window.location.origin}${ROOM_PREFIX}${id}`;
}

function readRooms(): SavedRoom[] {
  try { return JSON.parse(localStorage.getItem(ROOMS_STORAGE) || "[]") as SavedRoom[]; }
  catch { return []; }
}

function localDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultMeetingDateTime() {
  const date = new Date(Date.now() + 60 * 60_000);
  date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
  return localDateTimeValue(date);
}

const calendarMonths = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function MeetingDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = new Date(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const firstDay = (new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() + 6) % 7;
  const daysCount = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const previousDaysCount = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - firstDay + 1;
    return dayOffset < 1
      ? new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, previousDaysCount + dayOffset)
      : new Date(viewDate.getFullYear(), viewDate.getMonth(), dayOffset);
  });
  const setDay = (date: Date) => {
    const next = new Date(selected);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    onChange(localDateTimeValue(next));
  };
  const setTime = (hours: number, minutes: number) => {
    const next = new Date(selected);
    next.setHours(hours, minutes, 0, 0);
    onChange(localDateTimeValue(next));
  };
  const changeTime = (part: "hours" | "minutes", amount: number) => {
    const hours = selected.getHours();
    const minutes = selected.getMinutes();
    setTime(part === "hours" ? (hours + amount + 24) % 24 : hours, part === "minutes" ? (minutes + amount + 60) % 60 : minutes);
  };

  return <div className="meetingDatePicker">
    <button type="button" className={`meetingDateTrigger${open ? " active" : ""}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}><span><b>{selected.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}</b><small>{selected.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</small></span><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M8 3v5M16 3v5M3.5 10h17"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></svg></i></button>
    {open && <div className="meetingCalendar"><header><button type="button" aria-label="Предыдущий месяц" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>‹</button><b>{calendarMonths[viewDate.getMonth()]} {viewDate.getFullYear()}</b><button type="button" aria-label="Следующий месяц" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>›</button></header><div className="meetingCalendarWeek">{["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day) => <span key={day}>{day}</span>)}</div><div className="meetingCalendarDays">{cells.map((date) => { const sameMonth = date.getMonth() === viewDate.getMonth(); const isSelected = date.toDateString() === selected.toDateString(); const isPast = date < new Date(new Date().setHours(0, 0, 0, 0)); return <button type="button" key={date.toISOString()} className={`${sameMonth ? "" : "other"}${isSelected ? " selected" : ""}`} disabled={isPast} onClick={() => setDay(date)}>{date.getDate()}</button>; })}</div><footer><div className="meetingTimePicker"><span>Время</span><div><section><button type="button" aria-label="Увеличить часы" onClick={() => changeTime("hours", 1)}>⌃</button><b>{String(selected.getHours()).padStart(2, "0")}</b><button type="button" aria-label="Уменьшить часы" onClick={() => changeTime("hours", -1)}>⌄</button></section><i>:</i><section><button type="button" aria-label="Увеличить минуты" onClick={() => changeTime("minutes", 5)}>⌃</button><b>{String(selected.getMinutes()).padStart(2, "0")}</b><button type="button" aria-label="Уменьшить минуты" onClick={() => changeTime("minutes", -5)}>⌄</button></section></div></div><button type="button" onClick={() => setOpen(false)}>Готово</button></footer></div>}
  </div>;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function VideoRoomsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("Разговорная практика");
  const [groups, setGroups] = useState<RoomGroup[]>([]);
  const [groupId, setGroupId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultMeetingDateTime);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState("");
  const [rooms, setRooms] = useState<SavedRoom[]>(readRooms);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!creating || groups.length || !session?.access_token) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setGroupsLoading(true);
      setGroupsError("");
      void fetch("/api/groups", { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
        .then(async (response) => {
          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) throw new Error("API групп недоступен локально. Запустите проект через vercel dev.");
          const payload = await response.json() as { groups?: RoomGroup[]; error?: string };
          if (!response.ok) throw new Error(payload.error || "Не удалось загрузить группы");
          const nextGroups = payload.groups || [];
          setGroups(nextGroups);
          setGroupId((current) => current || nextGroups[0]?.id || "");
        })
        .catch((caught) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setGroupsError(caught instanceof Error ? caught.message : "Не удалось загрузить группы");
        })
        .finally(() => setGroupsLoading(false));
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [creating, groups.length, session?.access_token]);

  const createRoom = () => {
    const group = groups.find((item) => item.id === groupId);
    if (!group || !scheduledAt) return;
    const id = crypto.randomUUID().replaceAll("-", "");
    const room = { id, title: title.trim() || "Онлайн-занятие", createdAt: new Date().toISOString(), scheduledAt: new Date(scheduledAt).toISOString(), groupId: group.id, groupName: group.name };
    const next = [room, ...rooms].slice(0, 12);
    localStorage.setItem(ROOMS_STORAGE, JSON.stringify(next));
    window.dispatchEvent(new Event("lingvaedu:notifications-changed"));
    sessionStorage.setItem(`lingvaedu-room-owner:${id}`, "1");
    sessionStorage.setItem(`lingvaedu-room-title:${id}`, room.title);
    setRooms(next);
    navigate(`${ROOM_PREFIX}${id}`);
  };

  const createInstantRoom = () => {
    const id = crypto.randomUUID().replaceAll("-", "");
    const room: SavedRoom = { id, title: "Мгновенная встреча", createdAt: new Date().toISOString() };
    const next = [room, ...rooms].slice(0, 12);
    localStorage.setItem(ROOMS_STORAGE, JSON.stringify(next));
    window.dispatchEvent(new Event("lingvaedu:notifications-changed"));
    sessionStorage.setItem(`lingvaedu-room-owner:${id}`, "1");
    sessionStorage.setItem(`lingvaedu-room-title:${id}`, room.title);
    setRooms(next);
    navigate(`${ROOM_PREFIX}${id}`);
  };

  const copy = async (room: SavedRoom) => {
    await copyText(roomUrl(room.id));
    setCopied(room.id);
    window.setTimeout(() => setCopied(""), 1800);
  };

  return <main className="content fade videoRoomsPage">
    <div className="pageTitle"><div><span>УПРАВЛЕНИЕ</span><h1>Видеокомнаты</h1><p>Проводите живые занятия без сторонних сервисов.</p></div><button className="btn primary" onClick={() => setCreating(true)}>＋ Запланировать</button></div>
    <section className="callHero">
      <div><span className="liveDot">● ГОТОВО К ЗВОНКУ</span><h2>Начните встречу<br/>в один клик</h2><p>Видео и звук, демонстрация экрана с системным аудио и чат во время занятия.</p><button className="startCall instantCallButton" onClick={createInstantRoom}><span><svg viewBox="0 0 24 24" fill="none"><path d="M8 6h7a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z"/><path d="m18 10 3-2v8l-3-2"/></svg></span>Начать встречу</button></div>
      <div className="callRoomPreview"><header><div className="meetingBrand">Lingva<span>Edu</span></div></header><div className="callPreviewStage"><div className="callPreviewTile student"><span>АК</span><b>Алексей</b><i><MeetingControlIcon kind="mic" off/></i></div><div className="callPreviewTile host"><span>ВЫ</span><b>Вы</b></div></div><footer><button><MeetingControlIcon kind="mic"/></button><button><MeetingControlIcon kind="camera"/></button><button><MeetingControlIcon kind="screen"/></button><button><MeetingControlIcon kind="chat"/></button><button className="hang"><MeetingControlIcon kind="hangup"/></button></footer></div>
    </section>
    <div className="videoRoomsHeading"><div><h2>Ваши комнаты</h2><p>Участники смогут войти только по скопированной ссылке.</p></div></div>
    <section className="roomList">
      {rooms.length ? rooms.map((room) => <article className="roomRow" key={room.id}>
        <div className="roomDate"><b>{new Date(room.scheduledAt || room.createdAt).getDate()}</b><span>{new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(new Date(room.scheduledAt || room.createdAt)).toUpperCase()}</span></div>
        <div><h3>{room.title}</h3><p>{room.scheduledAt ? `${new Date(room.scheduledAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}${room.groupName ? ` · ${room.groupName}` : ""}` : `Создана ${new Date(room.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`}</p></div>
        <div className="roomActions"><button className="btn ghost" onClick={() => void copy(room)}>{copied === room.id ? "✓ Скопировано" : "Копировать ссылку"}</button><button className="btn primary" onClick={() => { sessionStorage.setItem(`lingvaedu-room-owner:${room.id}`, "1"); sessionStorage.setItem(`lingvaedu-room-title:${room.id}`, room.title); navigate(`${ROOM_PREFIX}${room.id}`); }}>Войти</button></div>
      </article>) : <div className="roomsEmpty"><span>◇</span><h3>Комнат пока нет</h3><p>Создайте первую комнату и отправьте ученикам ссылку-приглашение.</p></div>}
    </section>
    {creating && <div className="modalLayer"><button className="modalScrim" aria-label="Закрыть" onClick={() => setCreating(false)}/><form className="modal videoRoomModal" onSubmit={(event) => { event.preventDefault(); createRoom(); }}><div className="modalHead"><div><small>НОВАЯ ВСТРЕЧА</small><h2>Запланировать видеовстречу</h2></div><button type="button" aria-label="Закрыть" onClick={() => setCreating(false)}>×</button></div><label>Название встречи<input value={title} required maxLength={100} autoFocus onChange={(event) => setTitle(event.target.value)} placeholder="Например: Разговорная практика"/></label><label>Учебная группа<select value={groupId} required disabled={groupsLoading || !groups.length} onChange={(event) => setGroupId(event.target.value)}><option value="">{groupsLoading ? "Загружаем группы…" : groups.length ? "Выберите группу" : "Нет доступных групп"}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.memberIds.length} участников</option>)}</select></label><div className="meetingDateField"><span>Дата и время</span><MeetingDatePicker value={scheduledAt} onChange={setScheduledAt}/></div>{groupsError && <p className="videoRoomFormError">{groupsError}</p>}<p className="roomPrivacyNote">Встречу увидят участники выбранной группы. Защищённая ссылка будет создана автоматически.</p><button className="btn primary full" disabled={groupsLoading || !groupId || !scheduledAt}>Создать и войти</button></form></div>}
  </main>;
}

function MediaTile({ stream, label, avatarUrl = "", muted = false, isScreen = false, cameraOn = true, micOn = true, mirrored = false, handRaised = false, tileClassName = "" }: { stream: MediaStream; label: string; avatarUrl?: string; muted?: boolean; isScreen?: boolean; cameraOn?: boolean; micOn?: boolean; mirrored?: boolean; handRaised?: boolean; tileClassName?: string }) {
  const { avatarUrl: profileAvatarUrl } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, [stream]);
  const initials = label.replace(/ ·.*$/, "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const resolvedAvatarUrl = avatarUrl || (muted ? profileAvatarUrl : "");
  return <div className={`meetingTile ${tileClassName} ${isScreen ? "screenTile" : ""} ${mirrored && !isScreen ? "mirrored" : ""} ${!cameraOn && !isScreen ? "cameraOff" : ""}`}><video ref={videoRef} autoPlay playsInline muted={muted}/>{!cameraOn && !isScreen && <div className={`meetingAvatar${resolvedAvatarUrl ? " hasImage" : ""}`} aria-label="Камера выключена">{resolvedAvatarUrl ? <img src={resolvedAvatarUrl} alt={label}/> : initials}</div>}<span className="meetingTileName">{label}</span>{handRaised && <i className="meetingHandRaised" title="Поднята рука">✋</i>}{!cameraOn && !isScreen && <i className="meetingCameraOff" title="Камера выключена"><MeetingControlIcon kind="camera" off/></i>}{!micOn && <i className="meetingMicOff" title="Микрофон выключен"><MeetingControlIcon kind="mic" off/></i>}</div>;
}

function MeetingControlIcon({ kind, off = false }: { kind: "mic" | "camera" | "screen" | "chat" | "reaction" | "hangup"; off?: boolean }) {
  const paths = {
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>{off && <path d="m4 4 16 16"/>}</>,
    camera: <><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10 5-3v10l-5-3z"/>{off && <path d="m4 4 16 16"/>}</>,
    screen: <><rect x="3" y="4" width="18" height="14" rx="2.5"/><path d="M8 21h8M12 18v3M8.5 11.5 12 8l3.5 3.5M12 8v7"/></>,
    chat: <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>,
    reaction: <><circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01M8.5 14.5a5 5 0 0 0 7 0"/></>,
    hangup: <><path d="M5.2 15.8a10.8 10.8 0 0 1 13.6 0"/><path d="m4.2 14.7-1 3.7 3.8.8 1.1-3.4M19.8 14.7l1 3.7-3.8.8-1.1-3.4"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}

function useMobileMeeting() {
  const query = "(max-width: 700px), (max-height: 500px)";
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return mobile;
}

function VideoGrid({ count, mode, children }: { count: number; mode: "grid" | "mobile-solo" | "mobile-one-to-one" | "screen-share"; children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const columns = useMemo(() => {
    if (mode !== "grid" || count <= 1) return 1;
    if (size.width < 700) return size.width > size.height ? Math.min(count, 3) : count <= 4 ? 2 : 3;
    if (count === 2) return 2;
    if (count <= 4) return 2;
    return count <= 9 ? 3 : 4;
  }, [count, mode, size]);
  const rows = Math.max(1, Math.ceil(count / columns));
  const singleWidth = count === 1 && size.width && size.height ? Math.min(size.width, size.height * 16 / 9) : undefined;
  const singleHeight = singleWidth ? singleWidth * 9 / 16 : undefined;
  const style = mode === "grid" ? {
    gridTemplateColumns: count === 1 && singleWidth ? `${singleWidth}px` : `repeat(${columns}, minmax(0, 1fr))`,
    gridTemplateRows: count === 1 && singleHeight ? `${singleHeight}px` : `repeat(${rows}, minmax(0, 1fr))`,
  } : mode === "screen-share" ? {
    gridTemplateColumns: "minmax(0, 1fr) clamp(150px, 20vw, 250px)",
    gridTemplateRows: `repeat(${Math.max(1, count - 1)}, minmax(0, 1fr))`,
  } : undefined;
  return <div ref={containerRef} className={`videoGrid ${mode}`} style={style}>{children}</div>;
}

export function VideoRoomPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { displayName, avatarUrl, canEditCourses, session } = useAuth();
  const roomId = location.pathname.split("/").filter(Boolean).at(-1) || "";
  const isHost = canEditCourses && sessionStorage.getItem(`lingvaedu-room-owner:${roomId}`) === "1";
  const peerId = useMemo(() => crypto.randomUUID(), []);
  const [name, setName] = useState("");
  const [roomTitle, setRoomTitle] = useState(sessionStorage.getItem(`lingvaedu-room-title:${roomId}`) || "Видеокомната LingvaEdu");
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [systemAudio, setSystemAudio] = useState(false);
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const isMobile = useMobileMeeting();
  const [chatOpen, setChatOpen] = useState(() => !isMobile);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [reactionBursts, setReactionBursts] = useState<ReactionBurst[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream>(() => new MediaStream());
  const localStreamRef = useRef<MediaStream>(localStream);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const audioContextRef = useRef<AudioContext | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const participantDisplayName = session ? displayName : name.trim();

  const showReaction = (reaction: ReactionBurst) => {
    setReactionBursts((current) => [...current.slice(-5), reaction]);
    window.setTimeout(() => setReactionBursts((current) => current.filter((item) => item.id !== reaction.id)), 3200);
  };

  const sendBroadcast = async (event: string, payload: object) => {
    await channelRef.current?.send({ type: "broadcast", event, payload });
  };

  const updateLocalStream = (stream: MediaStream) => {
    localStreamRef.current = stream;
    setLocalStream(new MediaStream(stream.getTracks()));
  };

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((media) => {
        if (!active) { media.getTracks().forEach((track) => track.stop()); return; }
        cameraStreamRef.current = media;
        localStreamRef.current = media;
        setLocalStream(new MediaStream(media.getTracks()));
      }).catch(() => {
        if (!active) return;
        setCameraOn(false);
        setMicOn(false);
        setError("Не удалось открыть камеру или микрофон. Проверьте разрешения браузера.");
      });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, []);

  const closePeer = (id: string) => {
    peersRef.current.get(id)?.close();
    peersRef.current.delete(id);
    setRemoteStreams((current) => { const next = { ...current }; delete next[id]; return next; });
  };

  const createPeer = (remoteId: string) => {
    const existing = peersRef.current.get(remoteId);
    if (existing) return existing;
    const peer = new RTCPeerConnection({ iceServers });
    peersRef.current.set(remoteId, peer);
    localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current));
    if (!localStreamRef.current.getVideoTracks().length) peer.addTransceiver("video", { direction: "sendrecv" });
    if (!localStreamRef.current.getAudioTracks().length) peer.addTransceiver("audio", { direction: "sendrecv" });
    peer.onicecandidate = (event) => { if (event.candidate) void sendBroadcast("signal", { from: peerId, to: remoteId, candidate: event.candidate.toJSON() }); };
    peer.ontrack = (event) => {
      setRemoteStreams((current) => {
        const stream = event.streams[0] || current[remoteId] || new MediaStream();
        if (!stream.getTracks().some((track) => track.id === event.track.id)) stream.addTrack(event.track);
        return { ...current, [remoteId]: stream };
      });
    };
    peer.onconnectionstatechange = () => { if (["failed", "closed"].includes(peer.connectionState)) closePeer(remoteId); };
    return peer;
  };

  const makeOffer = async (remoteId: string) => {
    const peer = createPeer(remoteId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await sendBroadcast("signal", { from: peerId, to: remoteId, description: offer });
  };

  const handleSignal = async (signal: SignalPayload) => {
    if (signal.to !== peerId || signal.from === peerId) return;
    const peer = createPeer(signal.from);
    try {
      if (signal.description) {
        await peer.setRemoteDescription(signal.description);
        if (signal.description.type === "offer") {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await sendBroadcast("signal", { from: peerId, to: signal.from, description: answer });
        }
      } else if (signal.candidate) await peer.addIceCandidate(signal.candidate);
    } catch (caught) { console.warn("WebRTC signal error", caught); }
  };

  const leave = () => {
    void channelRef.current?.untrack();
    void channelRef.current?.unsubscribe();
    channelRef.current = null;
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close();
    if (isHost) navigate("/video-rooms"); else navigate("/");
  };

  useEffect(() => () => {
    void channelRef.current?.unsubscribe();
    peersRef.current.forEach((peer) => peer.close());
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const join = async () => {
    if (!participantDisplayName || !supabase) return;
    setJoining(true); setError("");
    try {
      let media = cameraStreamRef.current;
      if (!media) {
        try { media = await navigator.mediaDevices.getUserMedia({ video: cameraOn, audio: micOn }); }
        catch { media = new MediaStream(); setError("Камера или микрофон недоступны. Вы вошли без них — разрешения можно проверить в настройках браузера."); }
      }
      media.getVideoTracks().forEach((track) => { track.enabled = cameraOn; });
      media.getAudioTracks().forEach((track) => { track.enabled = micOn; });
      cameraStreamRef.current = media;
      updateLocalStream(media);
      const channel = supabase.channel(`video-room:${roomId}`, { config: { broadcast: { self: false }, presence: { key: peerId } } });
      channelRef.current = channel;
      channel.on("broadcast", { event: "signal" }, ({ payload }) => void handleSignal(payload as SignalPayload));
      channel.on("broadcast", { event: "chat" }, ({ payload }) => setMessages((current) => [...current, payload as ChatMessage]));
      channel.on("broadcast", { event: "reaction" }, ({ payload }) => showReaction(payload as ReactionBurst));
      channel.on("broadcast", { event: "room-info" }, ({ payload }) => { if (!isHost && typeof payload.title === "string") setRoomTitle(payload.title); });
      channel.on("broadcast", { event: "room-info-request" }, () => { if (isHost) void sendBroadcast("room-info", { title: roomTitle }); });
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Participant>();
        const active = Object.values(state).flat().map((entry) => ({ id: entry.id, name: entry.name, avatarUrl: entry.avatarUrl || "", isHost: entry.isHost, cameraOn: entry.cameraOn ?? true, micOn: entry.micOn ?? true, sharing: entry.sharing ?? false, handRaised: entry.handRaised ?? false }));
        setParticipants(active);
        const activeIds = new Set(active.map((item) => item.id));
        peersRef.current.forEach((_peer, id) => { if (!activeIds.has(id)) closePeer(id); });
        active.filter((item) => item.id !== peerId && peerId < item.id && !peersRef.current.has(item.id)).forEach((item) => void makeOffer(item.id));
      });
      await new Promise<void>((resolve, reject) => channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") { await channel.track({ id: peerId, name: participantDisplayName, avatarUrl, isHost, cameraOn: media.getVideoTracks().length > 0, micOn: media.getAudioTracks().length > 0, sharing: false, handRaised: false }); resolve(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error("Не удалось подключиться к комнате"));
      }));
      setJoined(true);
      if (isHost) await sendBroadcast("room-info", { title: roomTitle }); else await sendBroadcast("room-info-request", {});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось войти в комнату");
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    } finally { setJoining(false); }
  };

  const toggleMic = () => {
    const next = !micOn; setMicOn(next);
    localStreamRef.current.getAudioTracks().forEach((track) => { track.enabled = next; });
    void channelRef.current?.track({ id: peerId, name: participantDisplayName, isHost, cameraOn, micOn: next, sharing, handRaised });
  };
  const toggleCamera = () => {
    const next = !cameraOn; setCameraOn(next);
    cameraStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    void channelRef.current?.track({ id: peerId, name: participantDisplayName, isHost, cameraOn: next, micOn, sharing, handRaised });
  };

  const stopSharing = async () => {
    const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0] || null;
    const micTrack = cameraStreamRef.current?.getAudioTracks()[0] || null;
    for (const peer of peersRef.current.values()) {
      const videoSender = peer.getSenders().find((sender) => sender.track?.kind === "video");
      const audioSender = peer.getSenders().find((sender) => sender.track?.kind === "audio");
      if (videoSender) await videoSender.replaceTrack(cameraTrack);
      if (audioSender) await audioSender.replaceTrack(micTrack);
    }
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    await audioContextRef.current?.close(); audioContextRef.current = null;
    updateLocalStream(cameraStreamRef.current || new MediaStream());
    setSharing(false); setSystemAudio(false);
    void channelRef.current?.track({ id: peerId, name: participantDisplayName, isHost, cameraOn, micOn, sharing: false, handRaised });
  };

  const shareScreen = async () => {
    if (sharing) { await stopSharing(); return; }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = screen;
      const screenVideo = screen.getVideoTracks()[0];
      const screenAudio = screen.getAudioTracks()[0];
      const micTrack = cameraStreamRef.current?.getAudioTracks()[0];
      let outgoingAudio: MediaStreamTrack | null = screenAudio || micTrack || null;
      if (screenAudio && micTrack) {
        const context = new AudioContext(); const destination = context.createMediaStreamDestination();
        context.createMediaStreamSource(new MediaStream([screenAudio])).connect(destination);
        context.createMediaStreamSource(new MediaStream([micTrack])).connect(destination);
        audioContextRef.current = context; outgoingAudio = destination.stream.getAudioTracks()[0];
      }
      for (const peer of peersRef.current.values()) {
        const videoSender = peer.getSenders().find((sender) => sender.track?.kind === "video");
        const audioSender = peer.getSenders().find((sender) => sender.track?.kind === "audio");
        if (videoSender) await videoSender.replaceTrack(screenVideo);
        if (audioSender && outgoingAudio) await audioSender.replaceTrack(outgoingAudio);
      }
      const preview = new MediaStream([screenVideo, ...(outgoingAudio ? [outgoingAudio] : [])]);
      updateLocalStream(preview); setSharing(true); setSystemAudio(Boolean(screenAudio));
      void channelRef.current?.track({ id: peerId, name: participantDisplayName, isHost, cameraOn, micOn, sharing: true, handRaised });
      if (!screenAudio) setError("Экран демонстрируется без системного звука. Выберите вкладку или экран и включите «Поделиться аудио» в окне браузера.");
      else setError("");
      screenVideo.onended = () => void stopSharing();
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "NotAllowedError") return;
      setError("Не удалось запустить демонстрацию экрана.");
    }
  };

  const sendMessage = async () => {
    const text = message.trim(); if (!text) return;
    const chat: ChatMessage = { id: crypto.randomUUID(), from: peerId, name: participantDisplayName, text, sentAt: new Date().toISOString() };
    setMessages((current) => [...current, chat]); setMessage("");
    await sendBroadcast("chat", chat);
  };

  const sendReaction = async (emoji: "👏" | "❤️") => {
    const reaction: ReactionBurst = { id: crypto.randomUUID(), from: peerId, name: participantDisplayName, emoji, sentAt: new Date().toISOString() };
    showReaction(reaction);
    setReactionOpen(false);
    await sendBroadcast("reaction", reaction);
  };

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    setReactionOpen(false);
    void channelRef.current?.track({ id: peerId, name: participantDisplayName, isHost, cameraOn, micOn, sharing, handRaised: next });
  };

  if (!joined) return <main className="meetingLobby"><section className="meetingLobbyCard"><div className="meetingLobbyHead"><div className="meetingBrand">Lingva<span>Edu</span></div><span className="meetingLock">🔒 Вход только по приглашению</span><h1>{roomTitle}</h1><p>{isHost ? "Вы создаёте и ведёте эту встречу" : `Вы входите как ${participantDisplayName || "гость"}`}</p></div><div className="lobbyPreview"><MediaTile stream={localStream} label={participantDisplayName || "Вы"} muted cameraOn={cameraOn} micOn={micOn} mirrored/><div className="lobbyMediaControls"><button className={micOn ? "" : "off"} aria-label={micOn ? "Выключить микрофон" : "Включить микрофон"} onClick={toggleMic}><MeetingControlIcon kind="mic" off={!micOn}/></button><button className={cameraOn ? "" : "off"} aria-label={cameraOn ? "Выключить камеру" : "Включить камеру"} onClick={toggleCamera}><MeetingControlIcon kind="camera" off={!cameraOn}/></button></div></div>{!session && <label className="lobbyNameField">Ваше имя<input value={name} autoFocus maxLength={60} placeholder="Имя и фамилия" onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void join(); }}/></label>}{error && <p className="meetingError">{error}</p>}<button className="joinMeeting" disabled={!participantDisplayName || joining} onClick={() => void join()}>{joining ? "Подключаем…" : "Войти в комнату"}</button><small>Перед входом проверьте изображение и звук.</small></section></main>;

  const participantName = (id: string) => participants.find((item) => item.id === id)?.name || "Участник";
  const tileRecords = [
    { id: peerId, stream: localStream, label: sharing ? `Вы · Экран${systemAudio ? " · звук включён" : ""}` : "Вы", isLocal: true, isScreen: sharing, cameraOn: sharing || (cameraOn && localStream.getVideoTracks().length > 0), micOn: micOn && localStream.getAudioTracks().length > 0, handRaised },
    ...Object.entries(remoteStreams).map(([id, stream]) => { const participant = participants.find((item) => item.id === id); return { id, stream, label: participantName(id), isLocal: false, isScreen: participant?.sharing ?? false, cameraOn: participant?.cameraOn ?? true, micOn: participant?.micOn ?? true, handRaised: participant?.handRaised ?? false }; }),
  ];
  const screenShare = tileRecords.find((item) => item.isScreen);
  const layoutMode: "mobile-solo" | "mobile-one-to-one" | "screen-share" | "grid" = screenShare
    ? "screen-share"
    : isMobile && tileRecords.length === 1
      ? "mobile-solo"
      : isMobile && tileRecords.length === 2
        ? "mobile-one-to-one"
        : "grid";
  const orderedTiles = layoutMode === "screen-share" && screenShare
    ? [screenShare, ...tileRecords.filter((item) => item.id !== screenShare.id)]
    : layoutMode === "mobile-one-to-one"
      ? [...tileRecords.filter((item) => !item.isLocal), ...tileRecords.filter((item) => item.isLocal)]
      : tileRecords;
  const mobilePeer = tileRecords.find((item) => !item.isLocal);
  return <main className={`meetingPage ${layoutMode}`}>
    <header><button className="mobileMeetingBack" onClick={leave} aria-label="Вернуться">‹</button><div className="meetingBrand">Lingva<span>Edu</span></div><div className="desktopMeetingIdentity"><h1>{roomTitle}</h1><span><i/> В эфире · {Math.max(participants.length, 1)} участников</span></div><div className="mobileMeetingIdentity"><b>{mobilePeer?.label || roomTitle}</b><span>{mobilePeer?.micOn === false ? "Микрофон выключен" : "В сети"}</span></div>{isHost && <button className="copyInvite" onClick={() => void copyText(roomUrl(roomId))}>🔗 Скопировать приглашение</button>}</header>
    {error && <div className="meetingNotice">{error}<button onClick={() => setError("")}>×</button></div>}
    <div className={`meetingBody ${chatOpen ? "withChat" : ""}`}><section className="videoStage"><VideoGrid count={orderedTiles.length} mode={layoutMode}>{orderedTiles.map((tile, index) => <MediaTile key={tile.id} stream={tile.stream} muted={tile.isLocal} mirrored={tile.isLocal && !tile.isScreen} label={tile.label} isScreen={tile.isScreen} cameraOn={tile.cameraOn} micOn={tile.micOn} handRaised={tile.handRaised} tileClassName={`${tile.isLocal ? "localTile" : "remoteTile"} ${layoutMode === "screen-share" ? index === 0 ? "shareMain" : "shareCompanion" : ""}`}/>)}</VideoGrid></section>
      {chatOpen && <aside className="meetingChat"><div className="chatHead"><div><b>Чат встречи</b><span>{messages.length} сообщений</span></div><button onClick={() => setChatOpen(false)}>×</button></div><div className="chatMessages">{messages.length ? messages.map((item) => <article className={item.from === peerId ? "own" : ""} key={item.id}><div><b>{item.from === peerId ? "Вы" : item.name}</b><time>{new Date(item.sentAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</time></div><p>{item.text}</p></article>) : <div className="chatEmpty">Сообщений пока нет.<br/>Начните обсуждение занятия.</div>}<div ref={chatEndRef}/></div><div className="chatComposer"><textarea value={message} placeholder="Напишите сообщение…" onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }}/><button disabled={!message.trim()} onClick={() => void sendMessage()}>➤</button></div></aside>}
    </div>
    <div className="meetingReactions" aria-live="polite">{reactionBursts.map((item) => <div key={item.id}><b>{item.emoji}</b><span>{item.from === peerId ? "Вы" : item.name}</span></div>)}</div>
    <footer className="meetingControls"><button className={micOn ? "" : "off"} onClick={toggleMic} title={micOn ? "Выключить микрофон" : "Включить микрофон"} aria-label={micOn ? "Выключить микрофон" : "Включить микрофон"}><MeetingControlIcon kind="mic" off={!micOn}/></button><button className={cameraOn ? "" : "off"} disabled={sharing} onClick={toggleCamera} title={cameraOn ? "Выключить камеру" : "Включить камеру"} aria-label={cameraOn ? "Выключить камеру" : "Включить камеру"}><MeetingControlIcon kind="camera" off={!cameraOn}/></button><button className={sharing ? "active" : ""} onClick={() => void shareScreen()} title={sharing ? "Остановить демонстрацию" : "Показать экран"} aria-label={sharing ? "Остановить демонстрацию" : "Показать экран"}><MeetingControlIcon kind="screen"/></button><div className="reactionControl"><button className={reactionOpen || handRaised ? "active" : ""} onClick={() => setReactionOpen(!reactionOpen)} title="Реакции" aria-label="Открыть реакции"><MeetingControlIcon kind="reaction"/></button>{reactionOpen && <div className="reactionPicker"><button onClick={() => void sendReaction("👏")}><span>👏</span>Похлопать</button><button onClick={() => void sendReaction("❤️")}><span>❤️</span>Сердечко</button><button className={handRaised ? "selected" : ""} onClick={toggleHand}><span>✋</span>{handRaised ? "Опустить руку" : "Поднять руку"}</button></div>}</div><button className={chatOpen ? "active" : ""} onClick={() => setChatOpen(!chatOpen)} title={chatOpen ? "Закрыть чат" : "Открыть чат"} aria-label={chatOpen ? "Закрыть чат" : "Открыть чат"}><MeetingControlIcon kind="chat"/></button><span className="meetingControlDivider"/><button className="hangup" onClick={leave} title="Завершить звонок" aria-label="Завершить звонок"><MeetingControlIcon kind="hangup"/></button></footer>
  </main>;
}
