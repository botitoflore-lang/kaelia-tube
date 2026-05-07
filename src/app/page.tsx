"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export default function KaeliaUltra() {
  const [videos, setVideos] = useState<any[]>([]);
  const [users, setUsers] = useState<any>({}); // Para el bug de las fotos
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVid, setSelectedVid] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Formulario y Login
  const [upUrl, setUpUrl] = useState("");
  const [upTitle, setUpTitle] = useState("");
  const [upTags, setUpTags] = useState("");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  useEffect(() => {
    const localUser = localStorage.getItem('kaelia_user');
    if (localUser) setCurrentUser(JSON.parse(localUser));
    if (localStorage.getItem('kaelia_admin') === 'true') setIsAdmin(true);

    // 1. Escuchar Usuarios (Para corregir el bug de las fotos en tiempo real)
    onSnapshot(collection(db, "users"), (snap) => {
      const uMap: any = {};
      snap.forEach(d => uMap[d.id] = d.data().pfp);
      setUsers(uMap);
    });

    // 2. Escuchar Videos
    const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // --- LÓGICA DE REPRODUCCIÓN INTELIGENTE ---
  const getRecommended = (currentVid: any) => {
    return videos
      .filter(v => v.id !== currentVid.id)
      .map(v => ({
        ...v,
        score: v.tags?.filter((t: string) => currentVid.tags?.includes(t)).length || 0
      }))
      .sort((a, b) => b.score - a.score || Math.random() - 0.5)
      .slice(0, 6);
  };

  const handleVideoEnd = () => {
    const next = getRecommended(selectedVid)[0];
    if (next) setSelectedVid(next);
  };

  // --- ACCIONES ---
  const handleLogin = async () => {
    const userKey = loginUser.toLowerCase().trim();
    const userRef = doc(db, "users", userKey);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      if (snap.data().pass === loginPass) {
        setCurrentUser(snap.data());
        localStorage.setItem('kaelia_user', JSON.stringify(snap.data()));
      } else alert("PIN incorrecto");
    } else {
      const newUser = { user: userKey, pass: loginPass, pfp: 'https://i.pinimg.com/originals/f1/0f/f7/f10ff70a715515d1662cd46bc3a1bc52.gif' };
      await setDoc(userRef, newUser);
      setCurrentUser(newUser);
      localStorage.setItem('kaelia_user', JSON.stringify(newUser));
    }
  };

  const saveVideo = async () => {
    if (!upUrl || !currentUser) return;
    await addDoc(collection(db, "videos"), {
      title: upTitle || "Sin título",
      url: upUrl,
      tags: upTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== ""),
      uploader: currentUser.user,
      timestamp: serverTimestamp()
    });
    setUpUrl(""); setUpTitle(""); setUpTags("");
    setSidebarOpen(false);
  };

  const filteredVideos = videos.filter(v => 
    v.title?.toLowerCase().includes(search.toLowerCase()) || 
    v.tags?.some((t:any) => t.includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 selection:bg-pink-500/30">
      
      {/* SIDEBAR MEJORADO */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#0a0a0a] border-r border-zinc-800/50 z-[1000] transition-transform duration-500 ease-in-out p-6 ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-pink-500/10' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-pink-500 font-black italic text-xl tracking-tighter">KAELIA.LOG</h2>
            <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
        </div>

        {currentUser ? (
          <div className="space-y-6">
            <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 text-center group">
                <div className="relative inline-block">
                    <img src={users[currentUser.user] || currentUser.pfp} className="w-20 h-20 rounded-full border-2 border-pink-500 object-cover shadow-lg shadow-pink-500/20" />
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer text-[10px]" onClick={() => {
                        const n = prompt("URL nueva foto:");
                        if(n) setDoc(doc(db, "users", currentUser.user), {pfp: n}, {merge: true});
                    }}>EDITAR</div>
                </div>
                <p className="mt-3 font-bold text-sm tracking-wide">{currentUser.user.toUpperCase()}</p>
                {isAdmin && <span className="text-[9px] bg-pink-500/10 text-pink-500 px-2 py-0.5 rounded-full border border-pink-500/20">ADMIN ACCESS</span>}
            </div>
            
            <div className="space-y-1">
                <button onClick={() => setSearch(currentUser.user)} className="w-full text-left p-3 rounded-xl hover:bg-zinc-800 transition-all text-sm flex items-center gap-3"><span>📁</span> Mis Archivos</button>
                <button onClick={() => setSearch("")} className="w-full text-left p-3 rounded-xl hover:bg-zinc-800 transition-all text-sm flex items-center gap-3"><span>🌐</span> Explorar Todo</button>
            </div>

            <div className="pt-6 border-t border-zinc-800 space-y-3">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Upload Terminal</p>
                <input value={upUrl} onChange={e => setUpUrl(e.target.value)} placeholder="Enlace .mp4 / Embed" className="w-full bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl text-xs outline-none focus:border-pink-500" />
                <input value={upTitle} onChange={e => setUpTitle(e.target.value)} placeholder="Nombre del archivo" className="w-full bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl text-xs outline-none focus:border-pink-500" />
                <input value={upTags} onChange={e => setUpTags(e.target.value)} placeholder="Tags (4k, pov, chill)" className="w-full bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl text-xs outline-none focus:border-pink-500" />
                <button onClick={saveVideo} className="w-full bg-white text-black py-3 rounded-xl font-black text-xs hover:bg-pink-500 hover:text-white transition-all shadow-lg shadow-white/5">EJECUTAR SUBIDA</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
             <input type="text" placeholder="ID de Usuario" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm" onChange={e => setLoginUser(e.target.value)} />
             <input type="password" placeholder="PIN de Seguridad" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm" onChange={e => setLoginPass(e.target.value)} />
             <button onClick={handleLogin} className="w-full bg-pink-600 py-3 rounded-xl font-bold shadow-lg shadow-pink-600/20">ACCEDER AL ARCHIVO</button>
          </div>
        )}
      </div>

      {/* NAVBAR */}
      <nav className="sticky top-0 bg-[#020202]/80 backdrop-blur-xl border-b border-zinc-800/50 p-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-xl">☰</button>
          <div className="flex-1 relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-pink-500 transition-colors">🔍</span>
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Escribe para buscar..." 
              className="w-full bg-zinc-900/50 border border-zinc-800 p-3 pl-12 rounded-2xl outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 transition-all"
            />
          </div>
        </div>
      </nav>

      {/* FEED PRINCIPAL */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((vid) => (
            <div key={vid.id} className="group relative bg-zinc-900/20 border border-zinc-800/50 rounded-3xl overflow-hidden hover:border-pink-500/50 transition-all duration-300 shadow-xl" onClick={() => setSelectedVid(vid)}>
              <div className="aspect-video bg-black relative overflow-hidden">
                {vid.url.includes('mp4') ? (
                  <video muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all">
                    <source src={vid.url} />
                  </video>
                ) : (
                  <iframe src={vid.url} className="w-full h-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="p-4 flex gap-3 items-start">
                <img src={users[vid.uploader] || vid.pfp} className="w-10 h-10 rounded-full border border-zinc-800 object-cover flex-shrink-0" />
                <div className="overflow-hidden">
                  <h3 className="font-bold text-sm truncate group-hover:text-pink-400 transition-colors">{vid.title}</h3>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase mt-1 tracking-tighter">@{vid.uploader}</p>
                  <div className="flex gap-1 mt-2 overflow-x-hidden">
                    {vid.tags?.slice(0, 3).map((t: string) => (
                      <span key={t} className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">#{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL / REPRODUCTOR INTELIGENTE */}
      {selectedVid && (
        <div className="fixed inset-0 bg-[#020202] z-[2000] overflow-y-auto p-4 md:p-8 animate-in fade-in zoom-in duration-300">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Player */}
            <div className="lg:col-span-2 space-y-6">
                <button onClick={() => setSelectedVid(null)} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
                    <span>←</span> Regresar al Archivo
                </button>
                <div className="aspect-video w-full bg-black rounded-3xl overflow-hidden shadow-2xl shadow-pink-500/10 border border-zinc-800">
                    {selectedVid.url.includes('mp4') ? (
                        <video ref={videoRef} onEnded={handleVideoEnd} controls autoPlay className="w-full h-full object-contain"><source src={selectedVid.url} /></video>
                    ) : (
                        <iframe src={selectedVid.url} className="w-full h-full" allowFullScreen allow="autoplay" />
                    )}
                </div>
                <div className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/50">
                    <h2 className="text-2xl font-black tracking-tight">{selectedVid.title}</h2>
                    <div className="flex items-center gap-3 mt-4">
                        <img src={users[selectedVid.uploader]} className="w-8 h-8 rounded-full border border-pink-500/30" />
                        <span className="text-zinc-400 font-bold uppercase text-xs tracking-widest">{selectedVid.uploader}</span>
                    </div>
                </div>
            </div>

            {/* Recomendados (Lista de reproducción) */}
            <div className="space-y-4">
                <h3 className="text-pink-500 font-black text-xs uppercase tracking-widest mb-6">Siguiente en la lista</h3>
                {getRecommended(selectedVid).map(rec => (
                    <div key={rec.id} onClick={() => setSelectedVid(rec)} className="flex gap-3 group cursor-pointer bg-zinc-900/20 p-2 rounded-2xl border border-transparent hover:border-zinc-800 transition-all">
                        <div className="w-32 aspect-video bg-black rounded-xl overflow-hidden flex-shrink-0 relative">
                             {rec.url.includes('mp4') ? <video muted className="w-full h-full object-cover opacity-60 group-hover:opacity-100"><source src={rec.url}/></video> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[8px]">EMBED</div>}
                             {rec.score > 0 && <div className="absolute bottom-1 right-1 bg-pink-600 text-[8px] px-1 rounded font-bold">MATCH</div>}
                        </div>
                        <div className="flex flex-col justify-center overflow-hidden">
                            <h4 className="text-xs font-bold truncate group-hover:text-pink-400 transition-colors">{rec.title}</h4>
                            <p className="text-[10px] text-zinc-500 mt-1 uppercase">@{rec.uploader}</p>
                        </div>
                    </div>
                ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
