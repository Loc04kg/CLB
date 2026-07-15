import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, CheckCircle, Shield, Loader2, 
  MapPin, Calendar, Clock, UserCheck, 
  Sparkles, ShieldAlert, Scan, XCircle, ChevronRight, Fingerprint, QrCode
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import * as faceapi from '@vladmandic/face-api';

type AttendanceMode = 'REGISTER' | 'CHECKIN' | 'GPS' | 'FINGERPRINT' | 'QR_CODE';

export default function AttendancePage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AttendanceMode>('CHECKIN');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<null | 'SUCCESS' | 'ERROR'>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Liveness (Blink Detection) state
  const [livenessStatus, setLivenessStatus] = useState<'idle' | 'waiting' | 'blinking' | 'success' | 'failed'>('idle');
  const [livenessMessage, setLivenessMessage] = useState('');
  
  // iPhone-style FaceID registration states
  const [registerProgress, setRegisterProgress] = useState(0);
  const [registerStep, setRegisterStep] = useState(0); // 0: idle, 1: look_straight, 2: blink, 3: turn_head, 4: done
  const [currentEAR, setCurrentEAR] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = (freq = 600, duration = 0.1) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio Context failed:', e);
    }
  };

  const playSuccessChime = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };
      
      playTone(523.25, now, 0.15);       // C5
      playTone(659.25, now + 0.1, 0.15); // E5
      playTone(783.99, now + 0.2, 0.15); // G5
      playTone(1046.50, now + 0.3, 0.3); // C6
    } catch (e) {
      console.warn('Success chime failed:', e);
    }
  };

  // GPS state
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gpsMessage, setGpsMessage] = useState('');
  const [locationName, setLocationName] = useState('Chưa lấy GPS');
  const [myAttendance, setMyAttendance] = useState<any>(null);
  const [checkingAttendance, setCheckingAttendance] = useState(false);

  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loadingClubs, setLoadingClubs] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.error('Loi tai AI Models:', e);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (user) fetchMyClubs();
  }, [user]);

  const fetchMyClubs = async () => {
    try {
      const res = await api.get('/clubs/my-clubs');
      setMyClubs(res.data);
      if (res.data.length > 0) {
        setSelectedClubId(res.data[0].id);
        if (res.data[0].events?.length > 0) {
          setSelectedEventId(res.data[0].events[0].id);
        }
      }
    } catch (error) {
      console.error('Fetch my clubs error:', error);
    } finally {
      setLoadingClubs(false);
    }
  };

  const selectedClub = myClubs.find(c => c.id === selectedClubId);
  const clubEvents = selectedClub?.events || [];

  const handleClubChange = (clubId: string) => {
    setSelectedClubId(clubId);
    const club = myClubs.find(c => c.id === clubId);
    if (club?.events?.length > 0) {
      setSelectedEventId(club.events[0].id);
    } else {
      setSelectedEventId('');
    }
    setMyAttendance(null);
    setGpsStatus('idle');
    setScanResult(null);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Tính tỷ lệ co mắt (Eye Aspect Ratio) để phát hiện chớp mắt
  const calculateEAR = (eyePoints: faceapi.Point[]) => {
    const dist26 = Math.sqrt(Math.pow(eyePoints[1].x - eyePoints[5].x, 2) + Math.pow(eyePoints[1].y - eyePoints[5].y, 2));
    const dist35 = Math.sqrt(Math.pow(eyePoints[2].x - eyePoints[4].x, 2) + Math.pow(eyePoints[2].y - eyePoints[4].y, 2));
    const dist14 = Math.sqrt(Math.pow(eyePoints[0].x - eyePoints[3].x, 2) + Math.pow(eyePoints[0].y - eyePoints[3].y, 2));
    return (dist26 + dist35) / (2.0 * dist14);
  };

  const handleScan = async () => {
    if (!user) return;
    if (mode === 'CHECKIN' && !selectedEventId) return alert('Vui lòng chọn sự kiện');
    if (!modelsLoaded) return alert('Hệ thống AI đang khởi động...');
    if (!videoRef.current) return alert('Camera không hoạt động');

    setIsScanning(true);
    setScanResult(null);

    let lat: number | null = null;
    let lon: number | null = null;

    if (mode === 'CHECKIN' && navigator.geolocation) {
      try {
        setLocationName('Đang định vị GPS...');
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 60000 });
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        setLocationName(`Toạ độ: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      } catch (err: any) {
        console.warn('Khong the lay GPS:', err);
        setLocationName('Lỗi lấy GPS (Bỏ qua)');
      }
    }

    if (mode === 'REGISTER') {
      setRegisterStep(1);
      setRegisterProgress(0);
      setLivenessStatus('waiting');
      setLivenessMessage('Bước 1/3: Nhìn thẳng vào khung tròn để bắt đầu...');
      playBeep(600, 0.1);

      let currentStep = 1;
      let hasBlinked = false;
      let hasTurnedHead = false;
      let attempts = 0;
      const maxAttempts = 100; // ~20 giây tối đa

      const scanInterval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(scanInterval);
          setLivenessStatus('failed');
          setLivenessMessage('Quá thời gian đăng ký FaceID!');
          setScanResult('ERROR');
          setIsScanning(false);
          setRegisterStep(0);
          setRegisterProgress(0);
          return;
        }

        if (!videoRef.current) return;

        try {
          const detection = await faceapi.detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
          ).withFaceLandmarks().withFaceDescriptor();

          if (detection) {
            const landmarks = detection.landmarks;
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            const earLeft = calculateEAR(leftEye);
            const earRight = calculateEAR(rightEye);
            const avgEAR = (earLeft + earRight) / 2;
            setCurrentEAR(avgEAR);
            
            if (currentStep === 1) {
              // Nhìn thẳng (Đã phát hiện khuôn mặt là OK)
              playBeep(700, 0.1);
              currentStep = 2;
              setRegisterStep(2);
              setRegisterProgress(35);
              setLivenessMessage('Bước 2/3: Hãy CHỚP MẮT 1 lần để xác thực...');
            } 
            else if (currentStep === 2) {
              // Phát hiện chớp mắt (EAR < 0.23)
              if (avgEAR < 0.23) {
                hasBlinked = true;
                playBeep(800, 0.1);
                currentStep = 3;
                setRegisterStep(3);
                setRegisterProgress(70);
                setLivenessMessage('Bước 3/3: Quay đầu nhẹ sang trái/phải để quét góc...');
              }
            } 
            else if (currentStep === 3) {
              // Phát hiện quay đầu (khoảng cách mũi tới viền hàm 2 bên bất cân xứng)
              const nose = landmarks.getNose()[3]; // đỉnh mũi
              const jaw = landmarks.getJawOutline();
              const leftJaw = jaw[0];
              const rightJaw = jaw[16];
              const distLeft = Math.sqrt(Math.pow(nose.x - leftJaw.x, 2) + Math.pow(nose.y - leftJaw.y, 2));
              const distRight = Math.sqrt(Math.pow(nose.x - rightJaw.x, 2) + Math.pow(nose.y - rightJaw.y, 2));
              const ratio = distLeft / distRight;

              if (ratio < 0.6 || ratio > 1.6) {
                hasTurnedHead = true;
                clearInterval(scanInterval);
                setCurrentEAR(null);
                
                setRegisterStep(4);
                setRegisterProgress(100);
                setLivenessStatus('blinking');
                setLivenessMessage('Hoàn tất quét FaceID! Đang lưu thông tin...');
                playSuccessChime();

                const image = captureFrame();
                const descriptorArr = Array.from(detection.descriptor);

                try {
                  await api.put(`/users/${user.id}`, { faceImage: image, faceDescriptor: JSON.stringify(descriptorArr) });
                  setLivenessStatus('success');
                  setLivenessMessage('Đăng ký FaceID thành công!');
                  setScanResult('SUCCESS');
                } catch (err: any) {
                  setLivenessStatus('failed');
                  setLivenessMessage(err.response?.data?.message || 'Lỗi lưu thông tin FaceID');
                  setScanResult('ERROR');
                } finally {
                  setIsScanning(false);
                  setRegisterStep(0);
                  setRegisterProgress(0);
                }
              }
            }
          }
        } catch (err) {
          console.error('Registration scan error:', err);
        }
      }, 200);

    } else {
      // CHECKIN MODE (Chỉ cần chớp mắt xác thực thực thể sống)
      setLivenessStatus('waiting');
      setLivenessMessage('Nhìn thẳng camera và CHỚP MẮT 1 lần để xác thực...');

      let hasBlinked = false;
      let attempts = 0;
      const maxAttempts = 60; 

      const scanInterval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts && !hasBlinked) {
          clearInterval(scanInterval);
          setLivenessStatus('failed');
          setLivenessMessage('Quá thời gian xác thực. Không phát hiện chớp mắt!');
          setScanResult('ERROR');
          setIsScanning(false);
          setCurrentEAR(null);
          return;
        }

        if (!videoRef.current) return;

        try {
          const detection = await faceapi.detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
          ).withFaceLandmarks().withFaceDescriptor();

          if (detection) {
            const landmarks = detection.landmarks;
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();

            const earLeft = calculateEAR(leftEye);
            const earRight = calculateEAR(rightEye);
            const avgEAR = (earLeft + earRight) / 2;
            setCurrentEAR(avgEAR);

            if (avgEAR < 0.23) {
              hasBlinked = true;
              setLivenessStatus('blinking');
              setLivenessMessage('Đã phát hiện chớp mắt! Đang lưu thông tin...');
              
              clearInterval(scanInterval);
              setCurrentEAR(null);
              playBeep(900, 0.15);

              const image = captureFrame();
              const descriptorArr = Array.from(detection.descriptor);

              try {
                await api.post('/attendance', {
                  eventId: selectedEventId, method: 'FACEID',
                  faceImage: image, checkInDescriptor: JSON.stringify(descriptorArr),
                  latitude: lat, longitude: lon
                });
                setLivenessStatus('success');
                setLivenessMessage('Xác thực thực thể sống thành công!');
                setScanResult('SUCCESS');
              } catch (err: any) {
                setLivenessStatus('failed');
                setLivenessMessage(err.response?.data?.message || 'Lỗi xử lý xác thực');
                setScanResult('ERROR');
                if (err.response?.data?.message) alert(err.response.data.message);
              } finally {
                setIsScanning(false);
              }
            }
          }
        } catch (err) {
          console.error('Liveness scan error:', err);
        }
      }, 200);
    }
  };

  const fetchMyAttendance = async () => {
    if (!selectedEventId) return;
    setCheckingAttendance(true);
    try {
      const res = await api.get('/attendance/my');
      setMyAttendance(res.data.find((a: any) => a.eventId === selectedEventId) || null);
    } catch { /* ignore */ } finally {
      setCheckingAttendance(false);
    }
  };

  const handleGPSAction = async (type: 'IN' | 'OUT') => {
    if (!selectedEventId) return alert('Vui long chon su kien');
    if (!navigator.geolocation) return alert('Thiet bi khong ho tro GPS');
    setGpsStatus('loading');
    setGpsMessage(type === 'IN' ? 'Dang lay vi tri GPS...' : 'Dang ghi nhan vi tri check-out...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.post('/attendance/gps-checkin', {
            eventId: selectedEventId, type,
            latitude: pos.coords.latitude, longitude: pos.coords.longitude
          });
          setGpsStatus('success');
          setGpsMessage(res.data.message);
          fetchMyAttendance();
        } catch (err: any) {
          setGpsStatus('error');
          setGpsMessage(err.response?.data?.message || 'Loi khi diem danh GPS');
        }
      },
      () => { setGpsStatus('error'); setGpsMessage('Khong lay duoc vi tri. Hay cap quyen GPS.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { startCamera(); return () => stopCamera(); }, []);
  useEffect(() => { if (mode === 'GPS' && selectedEventId) fetchMyAttendance(); }, [mode, selectedEventId]);

  useEffect(() => {
    if (mode === 'QR_CODE' && scanResult === null) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scanner.render(async (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.type === 'attendance' && data.eventId) {
            scanner.clear();
            setIsScanning(true);
            try {
              await api.post('/attendance', {
                eventId: data.eventId,
                method: 'QR_CODE'
              });
              setScanResult('SUCCESS');
            } catch (err: any) {
              setScanResult('ERROR');
              alert(err.response?.data?.message || 'Lỗi điểm danh');
            } finally {
              setIsScanning(false);
            }
          }
        } catch (e) {
          // not a valid json QR code
        }
      }, (error) => {
        // scan error, ignore
      });

      return () => {
        scanner.clear().catch(e => console.error(e));
      };
    }
  }, [mode, scanResult]);

  if (!user) {
    return (
      <div className="pt-40 text-center px-4 min-h-screen bg-gray-950 flex flex-col items-center justify-center space-y-6">
        <div className="w-24 h-24 bg-red-500/10 rounded-[32px] flex items-center justify-center text-red-500 border border-red-500/20">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-white">Xac thuc yeu cau</h1>
        <p className="text-gray-500 max-w-sm">Vui long dang nhap de su dung tinh nang diem danh.</p>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-20 bg-gray-950 min-h-screen text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[40%] h-full bg-blue-600/10 blur-[160px] -z-0"></div>
      <div className="absolute bottom-0 left-0 w-[40%] h-full bg-orange-600/10 blur-[160px] -z-0"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-orange-500 font-black uppercase tracking-widest text-[10px]">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
              <span>HUTECH AI Attendance System</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter">
              He thong <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">AI Check-in</span>
            </h1>
            <p className="text-gray-500 max-w-md text-sm font-medium">Chon CLB &rarr; Chon su kien &rarr; Diem danh.</p>
          </div>

          <div className="flex p-1.5 bg-gray-900/50 backdrop-blur-xl rounded-[24px] border border-white/5">
            {(['CHECKIN', 'QR_CODE', 'FINGERPRINT', 'GPS', 'REGISTER'] as AttendanceMode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setScanResult(null); setGpsStatus('idle'); }}
                className={`px-5 py-2.5 rounded-[16px] text-[11px] font-black transition-all ${mode === m ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                {m === 'CHECKIN' ? '📷 FACEID' : m === 'GPS' ? '📍 GPS' : m === 'REGISTER' ? '✏️ ĐĂNG KÝ MẶT' : m === 'QR_CODE' ? '📱 QUÉT QR' : '👆 VÂN TAY'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Left: Camera (hidden on GPS mode) */}
          {mode !== 'GPS' && (
            <div className="lg:col-span-7">
              <div className="relative group max-w-lg mx-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-blue-600 rounded-[40px] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-gray-900 rounded-[32px] md:rounded-[40px] aspect-square overflow-hidden border border-white/10 shadow-2xl">
                  <AnimatePresence>
                    {isScanning && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 pointer-events-none">
                        {mode !== 'REGISTER' && (
                          <>
                            <motion.div initial={{ top: '0%' }} animate={{ top: '100%' }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_20px_rgba(249,115,22,0.8)]" />
                            <div className="absolute inset-16 border-2 border-orange-500/50 rounded-full animate-pulse"></div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {scanResult && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-30 bg-gray-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                        {scanResult === 'SUCCESS' ? (
                          <>
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                              <CheckCircle className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-black mb-2">Thanh cong!</h3>
                            <p className="text-gray-400 text-sm">{mode === 'REGISTER' ? 'Khuon mat da duoc luu.' : 'Diem danh da duoc ghi nhan.'}</p>
                          </>
                        ) : (
                          <>
                            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6">
                              <XCircle className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-black mb-2">That bai</h3>
                            <p className="text-gray-400 text-sm">Khong the xac thuc. Vui long thu lai.</p>
                          </>
                        )}
                        <button onClick={() => setScanResult(null)}
                          className="mt-8 px-8 py-3 bg-white text-gray-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all active:scale-95">
                          Thu lai
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                  {/* Spotlight Circle Mask and Apple progress ring for REGISTER mode */}
                  {mode === 'REGISTER' && isScanning && (
                    <>
                      {/* Spotlight Mask */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 animate-fade-in" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <mask id="circle-mask">
                            <rect x="0" y="0" width="100" height="100" fill="white" />
                            <circle cx="50" cy="50" r="35" fill="black" />
                          </mask>
                        </defs>
                        <rect x="0" y="0" width="100" height="100" fill="rgba(3, 7, 18, 0.75)" mask="url(#circle-mask)" />
                        <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
                      </svg>

                      {/* iPhone FaceID animated green progress ring */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="35"
                          fill="none"
                          stroke="#10b981" // Emerald green
                          strokeWidth="2.5"
                          strokeDasharray="219.9" // 2 * Math.PI * 35
                          strokeDashoffset={219.9 - (219.9 * registerProgress) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-300 ease-out"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>

                      {/* Top status tag */}
                      <div className="absolute top-20 left-0 right-0 text-center z-20 pointer-events-none">
                        <div className="inline-block bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-white border border-white/10 uppercase tracking-widest">
                          TIẾN TRÌNH: {registerProgress}% {currentEAR !== null && ` | MẮT (EAR): ${currentEAR.toFixed(2)}`}
                        </div>
                      </div>
                    </>
                  )}

                  {isScanning && livenessMessage && (
                    <div className="absolute bottom-6 left-6 right-6 bg-gray-950/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-orange-500/30 text-center z-20 shadow-2xl">
                      <p className="text-xs font-bold text-orange-400 animate-pulse">
                        {livenessMessage} {currentEAR !== null && `(EAR: ${currentEAR.toFixed(2)})`}
                      </p>
                    </div>
                  )}
                  <div className="absolute top-6 left-6 flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                      <Scan className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Status</div>
                      <div className="text-[11px] font-bold text-green-500 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                        {modelsLoaded ? 'AI Ready' : 'Loading AI...'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-center">
                  <button onClick={handleScan}
                    disabled={isScanning || scanResult !== null || (mode === 'CHECKIN' && (!selectedEventId || myClubs.length === 0))}
                    className="group relative px-12 py-6 bg-white text-gray-950 rounded-[32px] font-black text-lg flex items-center gap-4 hover:bg-orange-600 hover:text-white transition-all shadow-2xl active:scale-95 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed">
                    {isScanning ? <><Loader2 className="w-6 h-6 animate-spin" /><span>DANG XU LY AI...</span></> 
                      : <><Camera className="w-6 h-6" /><span>{mode === 'REGISTER' ? 'CHUP ANH XAC THUC' : 'QUET KHUON MAT'}</span></>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FINGERPRINT Mode */}
          {mode === 'FINGERPRINT' && (
            <div className="lg:col-span-7">
              <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 p-12 rounded-[40px] space-y-6 flex flex-col items-center text-center shadow-2xl">
                <div className="w-24 h-24 bg-blue-600/20 rounded-[32px] flex items-center justify-center text-blue-500 border border-blue-500/30 mb-2">
                  <Fingerprint className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black">Diem danh Van Tay</h2>
                <p className="text-gray-400 max-w-sm">Su dung van tay hoac Passkey de xac thuc diem danh su kien nhanh chong va an toan.</p>
                
                {scanResult === 'SUCCESS' ? (
                  <div className="bg-green-500/20 text-green-400 p-4 rounded-2xl w-full border border-green-500/50 font-bold max-w-sm">
                    ✅ Diem danh thanh cong!
                  </div>
                ) : scanResult === 'ERROR' ? (
                  <div className="bg-red-500/20 text-red-400 p-4 rounded-2xl w-full border border-red-500/50 font-bold max-w-sm">
                    ❌ Diem danh that bai. Vui long thu lai.
                  </div>
                ) : null}

                <button 
                  onClick={async () => {
                    if (!selectedEventId) return alert('Vui long chon su kien truoc');
                    setIsScanning(true);
                    setScanResult(null);
                    try {
                      const optsRes = await api.get('/webauthn/authenticate/generate-options');
                      const authResp = await startAuthentication({ optionsJSON: optsRes.data });
                      const verifyRes = await api.post('/webauthn/authenticate/verify-checkin', {
                        eventId: selectedEventId,
                        credential: authResp,
                      });
                      if (verifyRes.data) setScanResult('SUCCESS');
                    } catch (err: any) {
                      console.error(err);
                      setScanResult('ERROR');
                      alert('Loi: ' + (err.response?.data?.message || err.message));
                    } finally {
                      setIsScanning(false);
                    }
                  }}
                  disabled={isScanning || !selectedEventId}
                  className="mt-6 px-12 py-6 bg-blue-600 text-white rounded-[32px] font-black text-xl flex items-center gap-4 hover:bg-blue-500 transition-all active:scale-95 shadow-[0_0_40px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed">
                  {isScanning ? <Loader2 className="w-6 h-6 animate-spin" /> : <Fingerprint className="w-6 h-6" />}
                  QUET VAN TAY NGAY
                </button>
              </div>
            </div>
          )}

          {/* QR CODE Mode */}
          {mode === 'QR_CODE' && (
            <div className="lg:col-span-7">
              <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] space-y-6 flex flex-col items-center text-center shadow-2xl">
                <div className="w-24 h-24 bg-purple-600/20 rounded-[32px] flex items-center justify-center text-purple-500 border border-purple-500/30 mb-2">
                  <QrCode className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black">Quét mã QR</h2>
                <p className="text-gray-400 max-w-sm">Đưa camera vào mã QR do Ban chủ nhiệm cung cấp để điểm danh nhanh chóng.</p>
                
                {scanResult === 'SUCCESS' ? (
                  <div className="bg-green-500/20 text-green-400 p-4 rounded-2xl w-full border border-green-500/50 font-bold max-w-sm">
                    ✅ Điểm danh thành công!
                  </div>
                ) : scanResult === 'ERROR' ? (
                  <div className="bg-red-500/20 text-red-400 p-4 rounded-2xl w-full border border-red-500/50 font-bold max-w-sm">
                    ❌ Điểm danh thất bại.
                  </div>
                ) : (
                  <div id="qr-reader" className="w-full max-w-sm overflow-hidden rounded-3xl border-2 border-purple-500/50 bg-white"></div>
                )}
                {isScanning && <Loader2 className="w-8 h-8 animate-spin text-purple-500 mt-4" />}
                
                {(scanResult === 'SUCCESS' || scanResult === 'ERROR') && (
                  <button onClick={() => setScanResult(null)} className="mt-4 text-sm font-bold text-gray-400 hover:text-white">
                    Quét lại
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GPS Mode full width left panel */}
          {mode === 'GPS' && (
            <div className="lg:col-span-7">
              <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-green-600/10 rounded-2xl flex items-center justify-center text-green-500 border border-green-500/20">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">GPS Geofencing</h2>
                    <p className="text-gray-500 text-sm">Diem danh theo vi tri thuc te, chong gian lan</p>
                  </div>
                </div>

                {gpsStatus !== 'idle' && (
                  <div className={`p-5 rounded-2xl text-sm font-bold flex items-center gap-3 ${
                    gpsStatus === 'loading' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    gpsStatus === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {gpsStatus === 'loading' && <Loader2 className="w-5 h-5 animate-spin shrink-0" />}
                    {gpsStatus === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
                    {gpsStatus === 'error' && <XCircle className="w-5 h-5 shrink-0" />}
                    {gpsMessage}
                  </div>
                )}

                {myAttendance && (
                  <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl space-y-1">
                    <p className="text-green-400 font-black">✅ Da Check-in luc {new Date(myAttendance.checkinTime).toLocaleTimeString('vi-VN')}</p>
                    {myAttendance.checkoutTime && (
                      <p className="text-gray-400 text-sm font-bold">🚪 Check-out: {new Date(myAttendance.checkoutTime).toLocaleTimeString('vi-VN')}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handleGPSAction('IN')}
                    disabled={gpsStatus === 'loading' || !!myAttendance || !selectedEventId}
                    className="py-6 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-500 transition-all active:scale-95 disabled:bg-gray-700 disabled:text-gray-500 flex items-center justify-center gap-2">
                    <MapPin className="w-5 h-5" /> CHECK-IN
                  </button>
                  <button onClick={() => handleGPSAction('OUT')}
                    disabled={gpsStatus === 'loading' || !myAttendance || !!myAttendance?.checkoutTime}
                    className="py-6 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-500 transition-all active:scale-95 disabled:bg-gray-700 disabled:text-gray-500 flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5" /> CHECK-OUT
                  </button>
                </div>
                <p className="text-center text-gray-600 text-xs">Phai o trong vong 100m khu vuc to chuc su kien</p>
              </div>
            </div>
          )}

          {/* Right: Controls */}
          <div className="lg:col-span-5 space-y-6">
            {/* Club & Event Selector */}
            {(mode === 'CHECKIN' || mode === 'GPS') && (
              <>
                <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-[32px] space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black">Buoc 1: Chon CLB</h3>
                      <p className="text-[11px] text-gray-500">Chi hien CLB ban da tham gia</p>
                    </div>
                  </div>
                  {loadingClubs ? <p className="text-sm text-gray-500">Dang tai...</p> :
                    myClubs.length === 0 ? (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                        <p className="text-sm text-red-400 font-bold">Ban chua tham gia CLB nao!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {myClubs.map(club => (
                          <button key={club.id} onClick={() => handleClubChange(club.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                              selectedClubId === club.id ? 'bg-orange-600/10 border-orange-500/30 text-orange-400' : 'bg-gray-950/50 border-white/5 text-gray-300 hover:border-white/10'}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-sm font-black">{club.name.charAt(0)}</div>
                              <div>
                                <div className="text-sm font-bold">{club.name}</div>
                                <div className="text-[10px] text-gray-500">{club._count?.members || 0} thanh vien</div>
                              </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 ${selectedClubId === club.id ? 'text-orange-400' : 'text-gray-600'}`} />
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                {selectedClubId && (
                  <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-[32px] space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-600/10 rounded-xl flex items-center justify-center text-orange-500 border border-orange-500/20">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black">Buoc 2: Chon su kien</h3>
                        <p className="text-[11px] text-gray-500">Su kien trong CLB da chon</p>
                      </div>
                    </div>
                    {clubEvents.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">CLB nay chua co su kien nao.</p>
                    ) : (
                      <div className="space-y-2">
                        {clubEvents.map((ev: any) => (
                          <button key={ev.id} onClick={() => { setSelectedEventId(ev.id); setMyAttendance(null); setGpsStatus('idle'); setScanResult(null); }}
                            className={`w-full text-left p-4 rounded-2xl border transition-all ${
                              selectedEventId === ev.id ? 'bg-orange-600/10 border-orange-500/30 text-orange-400' : 'bg-gray-950/50 border-white/5 text-gray-300 hover:border-white/10'}`}>
                            <div className="text-sm font-bold">{ev.title}</div>
                            <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              {new Date(ev.eventDate).toLocaleDateString('vi-VN')} — {ev.location}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Info Panel */}
            <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-[32px] space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">AI Security</h3>
                  <p className="text-[11px] text-gray-500">Du lieu duoc ma hoa dau cuoi</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: <MapPin className="w-4 h-4 text-orange-500" />, label: 'Vi tri', value: locationName },
                  { icon: <UserCheck className="w-4 h-4 text-blue-500" />, label: 'Nguoi dung', value: user.name },
                  { icon: <Sparkles className="w-4 h-4 text-purple-500" />, label: 'Do chinh xac', value: '99.8%' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-950/50 rounded-2xl border border-white/5">
                    <div className="flex items-center space-x-3">
                      {item.icon}
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{item.label}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-300">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
