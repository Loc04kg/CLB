import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Loader2, CheckCircle, Users, Calendar, Shield, Zap, XCircle } from 'lucide-react';
import api from '../lib/api';
import * as faceapi from '@vladmandic/face-api';
import { useAuth } from '../contexts/AuthContext';

interface KnownFace {
  userId: string;
  name: string;
  studentId: string;
  descriptor: Float32Array;
}

interface CheckedInRecord {
  userId: string;
  name: string;
  studentId: string;
  time: string;
}

export default function AttendanceKioskPage() {
  const { user, role } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);

  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [clubEvents, setClubEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');

  const [knownFaces, setKnownFaces] = useState<KnownFace[]>([]);
  const [loadingFaces, setLoadingFaces] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const [lastDetected, setLastDetected] = useState<{ name: string; studentId: string } | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [checkedIn, setCheckedIn] = useState<CheckedInRecord[]>([]);
  const [recentResult, setRecentResult] = useState<'success' | 'fail' | null>(null);
  const [cameraError, setCameraError] = useState('');
  const cooldownRef = useRef<Set<string>>(new Set());

  // Load AI models
  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.error('Model load error:', e);
      } finally {
        setLoadingModels(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (user) fetchMyClubs();
  }, [user]);

  const fetchMyClubs = async () => {
    try {
      const res = await api.get('/clubs/my-clubs');
      const managed = res.data.filter((c: any) => role === 'ADMIN' || c.memberRole === 'LEADER');
      setMyClubs(managed);
    } catch (e) { console.error(e); }
  };

  const handleClubChange = async (clubId: string) => {
    setSelectedClubId(clubId);
    setSelectedEventId('');
    setKnownFaces([]);
    try {
      const res = await api.get(`/events/club/${clubId}`);
      setClubEvents(res.data.filter((e: any) => e.status === 'APPROVED'));
    } catch (e) { console.error(e); }
  };

  const loadFaceDescriptors = async (eventId: string) => {
    setLoadingFaces(true);
    try {
      const res = await api.get(`/attendance/event/${eventId}/descriptors`);
      const faces: KnownFace[] = res.data
        .filter((f: any) => f.faceDescriptor)
        .map((f: any) => ({
          userId: f.userId, name: f.name, studentId: f.studentId,
          descriptor: new Float32Array(JSON.parse(f.faceDescriptor))
        }));
      setKnownFaces(faces);
    } catch (e) {
      alert('Loi tai du lieu khuon mat. Kiem tra quyen Leader/Admin.');
    } finally {
      setLoadingFaces(false);
    }
  };

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setKnownFaces([]);
    setCheckedIn([]);
    if (eventId) loadFaceDescriptors(eventId);
  };

  const playDing = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch (e) { /* ignore */ }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const runDetection = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded || knownFaces.length === 0 || detecting) return;
    setDetecting(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
        .withFaceLandmarks().withFaceDescriptor();

      if (!detection) { setDetecting(false); return; }

      let bestMatch: KnownFace | null = null;
      let bestDist = Infinity;
      for (const kf of knownFaces) {
        let dist = 0;
        for (let i = 0; i < 128; i++) dist += (kf.descriptor[i] - detection.descriptor[i]) ** 2;
        dist = Math.sqrt(dist);
        if (dist < bestDist) { bestDist = dist; bestMatch = kf; }
      }

      if (bestMatch && bestDist < 0.40 && !cooldownRef.current.has(bestMatch.userId)) {
        cooldownRef.current.add(bestMatch.userId);
        setTimeout(() => cooldownRef.current.delete(bestMatch!.userId), 10000);

        const faceImage = captureFrame();
        try {
          await api.post('/attendance/kiosk-checkin', {
            eventId: selectedEventId,
            userId: bestMatch.userId,
            faceImage,
          });
          playDing();
          setLastDetected({ name: bestMatch.name, studentId: bestMatch.studentId });
          setRecentResult('success');
          setCheckedIn(prev => [...prev, {
            userId: bestMatch!.userId, name: bestMatch!.name,
            studentId: bestMatch!.studentId,
            time: new Date().toLocaleTimeString('vi-VN')
          }]);
          setTimeout(() => setRecentResult(null), 4000);
        } catch (err: any) {
          if (err.response?.data?.alreadyCheckedIn) {
            setLastDetected({ name: bestMatch.name, studentId: bestMatch.studentId });
            setRecentResult('success');
            setTimeout(() => setRecentResult(null), 2000);
          } else {
            setRecentResult('fail');
            setTimeout(() => setRecentResult(null), 2000);
          }
        }
      }
    } catch (e) { /* ignore */ } finally {
      setDetecting(false);
    }
  }, [modelsLoaded, knownFaces, detecting, selectedEventId]);

  const startKiosk = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640 } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsRunning(true);
      intervalRef.current = setInterval(runDetection, 1500);
    } catch (e: any) { 
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setCameraError('Bạn chưa cấp quyền sử dụng Camera. Vui lòng bấm vào biểu tượng 🔒 trên thanh địa chỉ và chọn "Cho phép" (Allow) Camera.');
      } else {
        setCameraError('Trình duyệt chặn Camera hoặc thiết bị không có Camera (Cần chạy trên https:// hoặc localhost).');
      }
    }
  };

  const stopKiosk = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setIsRunning(false);
  };

  useEffect(() => {
    if (isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(runDetection, 1500);
    }
  }, [runDetection]);

  useEffect(() => () => stopKiosk(), []);

  if (!user || (role !== 'ADMIN' && role !== 'LEADER')) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-black">Khong co quyen truy cap</h1>
          <p className="text-gray-500">Chi Leader hoac Admin moi co the su dung Kiosk.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-900/80 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-lg">KIOSK DIEM DANH AI</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">HUTECH CLB · FaceID Auto Check-in</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {loadingModels ? (
            <span className="flex items-center gap-2 text-yellow-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading AI...</span>
          ) : (
            <span className="flex items-center gap-2 text-green-500"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> AI Ready</span>
          )}
          <span className="text-gray-500">{knownFaces.length} khuon mat da tai</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: Camera */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

          {/* Scan overlay */}
          {isRunning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 border-2 border-orange-500/30 rounded-3xl">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-orange-500 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-orange-500 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-orange-500 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-orange-500 rounded-br-2xl" />
              </div>
              <motion.div
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_15px_rgba(249,115,22,0.8)]"
                style={{ position: 'absolute' }}
              />
            </div>
          )}

          {/* Result overlay */}
          <AnimatePresence>
            {recentResult && lastDetected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm ${
                  recentResult === 'success' ? 'bg-green-950/80' : 'bg-red-950/80'}`}
              >
                {recentResult === 'success' ? (
                  <>
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}
                      className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_80px_rgba(34,197,94,0.6)]">
                      <CheckCircle className="w-16 h-16 text-white" />
                    </motion.div>
                    <h2 className="text-5xl font-black text-white mb-2">{lastDetected.name}</h2>
                    <p className="text-2xl text-green-400 font-bold">{lastDetected.studentId}</p>
                    <p className="text-green-300 mt-4 text-lg font-black uppercase tracking-widest">✅ DA DIEM DANH!</p>
                  </>
                ) : (
                  <>
                    <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center mb-6">
                      <XCircle className="w-16 h-16 text-white" />
                    </div>
                    <p className="text-2xl font-black text-white">Khong nhan dien duoc</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start/Stop button */}
          {!isRunning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center space-y-6">
                {!selectedEventId ? (
                  <div className="space-y-3">
                    <div className="w-20 h-20 bg-gray-800 rounded-[24px] flex items-center justify-center mx-auto">
                      <Calendar className="w-10 h-10 text-gray-500" />
                    </div>
                    <p className="text-gray-400 font-bold">Chon su kien truoc de bat dau</p>
                  </div>
                ) : knownFaces.length === 0 ? (
                  <p className="text-yellow-400 font-bold">Dang tai du lieu khuon mat...</p>
                ) : (
                  <div className="space-y-4">
                    {cameraError && (
                      <div className="bg-red-500/20 text-red-400 p-4 rounded-2xl border border-red-500/50 max-w-sm mx-auto text-sm font-bold animate-shake">
                        <Shield className="w-6 h-6 mx-auto mb-2 text-red-500" />
                        {cameraError}
                      </div>
                    )}
                    <button onClick={startKiosk}
                      className="px-16 py-8 bg-orange-600 text-white rounded-[32px] font-black text-2xl uppercase tracking-wider hover:bg-orange-500 transition-all shadow-2xl shadow-orange-900/50 active:scale-95 flex items-center gap-4 mx-auto">
                      <Camera className="w-8 h-8" /> BAT DAU KIOSK
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {isRunning && (
            <button onClick={stopKiosk}
              className="absolute bottom-6 right-6 px-6 py-3 bg-red-600/80 backdrop-blur-sm text-white rounded-2xl font-black text-sm hover:bg-red-600 transition-all">
              DUNG LAI
            </button>
          )}
        </div>

        {/* Right: Config + Checked-in list */}
        <div className="w-full md:w-80 bg-gray-900 border-t md:border-t-0 md:border-l border-white/5 flex flex-col overflow-hidden">
          {/* Config */}
          <div className="p-6 border-b border-white/5 space-y-4">
            <h3 className="font-black text-sm uppercase tracking-widest text-gray-400">Cai dat Kiosk</h3>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Cau lac bo</label>
              <select value={selectedClubId} onChange={e => handleClubChange(e.target.value)}
                className="w-full bg-gray-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-orange-500/20">
                <option value="">-- Chon CLB --</option>
                {myClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {selectedClubId && (
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Su kien</label>
                <select value={selectedEventId} onChange={e => handleEventChange(e.target.value)}
                  className="w-full bg-gray-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-orange-500/20">
                  <option value="">-- Chon su kien --</option>
                  {clubEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>
            )}
            {loadingFaces && <div className="flex items-center gap-2 text-yellow-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Dang tai khuon mat...</div>}
            {!loadingFaces && knownFaces.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl">
                <p className="text-green-400 text-xs font-bold">✅ Da tai {knownFaces.length} khuon mat</p>
              </div>
            )}
          </div>

          {/* Checked-in list */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> Da diem danh ({checkedIn.length})
              </h3>
            </div>
            {checkedIn.length === 0 ? (
              <div className="text-center py-10 text-gray-600 text-sm">Chua co ai diem danh</div>
            ) : (
              <div className="space-y-2">
                {[...checkedIn].reverse().map((r, i) => (
                  <div key={r.userId + i} className="bg-gray-800/50 rounded-xl p-3 flex items-center gap-3 border border-green-500/10">
                    <div className="w-8 h-8 bg-green-600/20 text-green-400 rounded-lg flex items-center justify-center text-xs font-black">
                      {r.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">{r.name}</p>
                      <p className="text-xs text-gray-500">{r.studentId} · {r.time}</p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
