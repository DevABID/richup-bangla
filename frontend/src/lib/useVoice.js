// Peer-to-peer voice call (WebRTC mesh) with signaling over the game WebSocket.
//
// Flow: when you join, you send {type:"voice", on:true}. You then call every
// player already in the call (their `voice` flag is true in game state).
// Existing members only answer offers, so two peers never offer to each
// other at once. A mesh is fine for audio with up to ~8 players.
import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "./store";

const ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];
if (import.meta.env.VITE_TURN_URL) {
  ICE_SERVERS.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  });
}

export function useVoice() {
  const send = useGame((s) => s.send);
  const players = useGame((s) => s.game?.players ?? []);
  const you = useGame((s) => s.you);

  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState({});
  const [level, setLevel] = useState(0); // your own mic level, 0 to 1, for the mic test bar
  const [error, setError] = useState(null);

  const joinedRef = useRef(false);
  const localStream = useRef(null);
  const peers = useRef(new Map()); // pid -> { pc, audio, pendingIce }
  const audioCtx = useRef(null);
  const analysers = useRef(new Map()); // pid -> AnalyserNode

  const signal = useCallback((to, data) => send({ type: "rtc", to, data }), [send]);

  const watchLevel = (pid, stream) => {
    try {
      audioCtx.current ??= new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.current.createMediaStreamSource(stream);
      const analyser = audioCtx.current.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analysers.current.set(pid, analyser);
    } catch {
      /* level meter is optional */
    }
  };

  const closePeer = useCallback((pid) => {
    const peer = peers.current.get(pid);
    if (!peer) return;
    peer.pc.close();
    peer.audio.srcObject = null;
    peer.audio.remove();
    peers.current.delete(pid);
    analysers.current.delete(pid);
  }, []);

  const createPeer = useCallback(
    (pid) => {
      closePeer(pid);
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.playsInline = true;
      document.body.appendChild(audio);
      const peer = { pc, audio, pendingIce: [] };
      peers.current.set(pid, peer);

      localStream.current?.getTracks().forEach((t) => pc.addTrack(t, localStream.current));
      pc.onicecandidate = (e) => e.candidate && signal(pid, { kind: "ice", candidate: e.candidate });
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {});
        watchLevel(pid, e.streams[0]);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") closePeer(pid);
      };
      return peer;
    },
    [closePeer, signal]
  );

  const flushIce = async (peer) => {
    for (const c of peer.pendingIce.splice(0)) await peer.pc.addIceCandidate(c).catch(() => {});
  };

  // Incoming signaling messages
  useEffect(() => {
    useGame.setState({
      rtcHandler: async (from, data) => {
        if (!joinedRef.current || !data) return;
        try {
          if (data.kind === "offer") {
            const peer = createPeer(from);
            await peer.pc.setRemoteDescription(data.sdp);
            await flushIce(peer);
            const answer = await peer.pc.createAnswer();
            await peer.pc.setLocalDescription(answer);
            signal(from, { kind: "answer", sdp: peer.pc.localDescription });
          } else if (data.kind === "answer") {
            const peer = peers.current.get(from);
            if (!peer) return;
            await peer.pc.setRemoteDescription(data.sdp);
            await flushIce(peer);
          } else if (data.kind === "ice") {
            const peer = peers.current.get(from);
            if (!peer) return;
            if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(data.candidate).catch(() => {});
            else peer.pendingIce.push(data.candidate);
          }
        } catch (err) {
          console.warn("voice signaling error", err);
        }
      },
    });
    return () => useGame.setState({ rtcHandler: null });
  }, [createPeer, signal]);

  // Drop peers who left the call or went offline
  useEffect(() => {
    const inCall = new Set(players.filter((p) => p.voice).map((p) => p.id));
    for (const pid of peers.current.keys()) if (!inCall.has(pid)) closePeer(pid);
  }, [players, closePeer]);

  // Speaking indicators
  useEffect(() => {
    if (!joined) return;
    const buf = new Uint8Array(256);
    const id = setInterval(() => {
      const next = {};
      analysers.current.forEach((an, pid) => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += (v - 128) ** 2;
        const rms = Math.sqrt(sum / buf.length);
        next[pid] = rms > 6;
        if (pid === you) setLevel(Math.min(1, rms / 30));
      });
      setSpeaking(next);
    }, 120);
    return () => clearInterval(id);
  }, [joined, you]);

  const join = useCallback(async () => {
    setError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("https");
      return false;
    }
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      // denied: the player (or the browser) blocked it · nomic: no microphone
      // found · busy: another app is using the microphone
      const name = err?.name || "";
      setError(
        name === "NotAllowedError" || name === "SecurityError" ? "denied"
          : name === "NotFoundError" || name === "OverconstrainedError" ? "nomic"
            : name === "NotReadableError" || name === "AbortError" ? "busy"
              : "other"
      );
      return false;
    }
    watchLevel(you, localStream.current);
    audioCtx.current?.resume();
    joinedRef.current = true;
    setJoined(true);
    setMuted(false);
    send({ type: "voice", on: true });

    // Call everyone already in the call
    for (const p of useGame.getState().game?.players ?? []) {
      if (!p.voice || p.id === you) continue;
      const peer = createPeer(p.id);
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      signal(p.id, { kind: "offer", sdp: peer.pc.localDescription });
    }
    return true;
  }, [createPeer, send, signal, you]);

  const leave = useCallback(() => {
    joinedRef.current = false;
    setJoined(false);
    send({ type: "voice", on: false });
    for (const pid of [...peers.current.keys()]) closePeer(pid);
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    analysers.current.clear();
    setSpeaking({});
    setLevel(0);
  }, [closePeer, send]);

  const toggleMute = useCallback(() => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  // The server clears our voice flag when the socket drops, so end the call
  // locally too; the player can rejoin with one tap after reconnecting.
  const connected = useGame((s) => s.connected);
  useEffect(() => {
    if (!connected && joinedRef.current) leave();
  }, [connected, leave]);

  // Clean up when leaving the page
  useEffect(() => () => joinedRef.current && leave(), [leave]);

  return { joined, muted, speaking, level, error, join, leave, toggleMute, clearError: () => setError(null) };
}
