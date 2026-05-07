"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, addDoc, 
  doc, getDoc, setDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

export default function KaeliaFinalVersion() {
  const [videos, setVideos] = useState<any[]>([]);
  const [users, setUsers] = useState<any>({}); 
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVid, setSelectedVid] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Estados de formularios
  const [upUrl, setUpUrl] = useState("");
  const [upTitle, setUpTitle] = useState("");
  const [upTags, setUpTags] = useState("");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  useEffect(() => {
    // 1. Cargar persistencia local
    const localUser = localStorage.getItem('kaelia_user');
    if (localUser) setCurrentUser(JSON.parse(localUser));
    if (localStorage.getItem('kaelia_admin') === 'true') setIsAdmin(true);

    // 2. Escuchar Usuarios (Sincronización de fotos de perfil)
    onSnapshot(collection(db, "users"), (snap) => {
      const uMap: any = {};
      snap.forEach(d => uMap[d.id] = d.data().pfp);
      setUsers(uMap);
    });

    // 3. Escuchar Videos en tiempo real
    const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE REPRODUCCIÓN & RECOMENDADOS ---
  const getRecommended = (currentVid: any) => {
    if (!currentVid) return [];
    return videos
      .filter(v => v.id !== currentVid.id)
      .map(v => ({
        ...v,
        score: v.tags?.filter((t: string) => currentVid.tags?.includes(t)).length || 0
      }))
      .sort((a, b) => b.score - a.score || Math.random() - 0.5)
      .slice(0, 8);
  };

  const handleVideoEnd = () => {
    const next = getRecommended(selectedVid)[0];
    if (next) setSelectedVid(next);
  };

  // --- ACCIONES DE USUARIO ---
  const handleLogin = async () => {
    const userKey = loginUser.toLowerCase().trim();
    if (!userKey || !loginPass) return alert("Completa los campos");
    const userRef = doc(db, "users", userKey);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      if (snap.data().pass === loginPass) {
        setCurrentUser(snap.data());
        localStorage.setItem('kaelia_user', JSON.stringify(snap.data()));
      } else alert("PIN incorrecto");
    } else {
      const newUser = { user: userKey, pass: loginPass, pfp: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' };
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

  const askAdminKey = () => {
    const key = prompt("Introduce la llave maestra:");
    if (key === "awwa2008") { // Cambia esto por tu clave real
      setIsAdmin(true);
      localStorage.setItem('kaelia_admin', 'true');
      alert("WELCOME TO HELL!!! :3");
    }
  };

  const filteredVideos = videos.filter(v => 
    v.title?.toLowerCase().includes(search.toLowerCase()) || 
    v.tags?.some((t:any) => t.includes(search.toLowerCase())) ||
    v.uploader?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100">
      
      {/* SIDEBAR SIEMPRE PRESENTE */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#0a0a0a] border-r border-zinc-800/50 z-[1000] transition-transform duration-500 flex flex-col p-6 ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-pink-500/10' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-pink-500 font-black italic text-xl tracking-tighter">KAELIA.LOG</h2>
            <button onClick={() => setSidebarOpen(false)} className="text-zinc-500">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 custom-scroll">
          {currentUser ? (
            <div className="space-y-6">
              <div className="p-4 bg-zinc-900/50 rounded-3xl border border-zinc-800 text-center">
                  <img src={users[currentUser.user] || currentUser.pfp} className="w-20 h-20 rounded-full border-2 border-pink-500 mx-auto object-cover" />
                  <p className="mt-3 font-bold text-sm tracking-wide">@{currentUser.user}</p>
                  <button className="text-[9px] text-zinc-500 mt-2 underline" onClick={() => {
                    const n = prompt("URL nueva foto:");
                    if(n) setDoc(doc(db, "users", currentUser.user), {pfp: n}, {merge: true});
                  }}>Cambiar avatar</button>
              </div>
              <button onClick={() => {setSearch(""); setSidebarOpen(false);}} className="w-full text-left p-3 rounded-xl hover:bg-zinc-800 text-sm">🌐 Explorar Todo</button>
              <button onClick={() => {setSearch(currentUser.user); setSidebarOpen(false);}} className="w-full text-left p-3 rounded-xl hover:bg-zinc-800 text-sm">📁 Mis Videos</button>
              
              <div className="pt-6 border-t border-zinc-800 space-y-3">
                  <p className="text-[10px] text-pink-500 font-bold uppercase tracking-widest">Publicar</p>
                  <input value={upUrl} onChange={e => setUpUrl(e.target.value)} placeholder="URL (.mp4 / embed)" className="w-full bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl text-xs outline-none" />
                  <input value={upTitle} onChange={e => setUpTitle(e.target.value)} placeholder="Título" className="w-full bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl text-xs outline-none" />
                  <input value={upTags} onChange={e => setUpTags(e.target.value)} placeholder="Tags (4k, pov...)" className="w-full bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl text-xs outline-none" />
                  <button onClick={saveVideo} className="w-full bg-white text-black py-3 rounded-xl font-black text-xs">SUBIR ARCHIVO</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
               <input type="text" placeholder="Usuario" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm" onChange={e => setLoginUser(e.target.value)} />
               <input type="password" placeholder="PIN" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-sm" onChange={e => setLoginPass(e.target.value)} />
               <button onClick={handleLogin} className="w-full bg-pink-600 py-3 rounded-xl font-bold">ACCEDER</button>
            </div>
          )}
        </div>

        {/* BOTONES INFERIORES SIEMPRE VISIBLES */}
        <div className="mt-auto pt-6 border-t border-zinc-800 space-y-2">
            <button onClick={askAdminKey} className={`w-full text-left p-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${isAdmin ? 'bg-pink-500/20 text-pink-500 border border-pink-500/50' : 'bg-zinc-900 text-zinc-500 border border-transparent'}`}>
                {isAdmin ? '✔️ MODO ADMIN ACTIVO' : '🔑 ADMIN KEY'}
            </button>
            {currentUser && (
              <button onClick={() => {localStorage.clear(); location.reload();}} className="w-full text-left p-3 rounded-xl text-[10px] font-black text-red-500 hover:bg-red-500/10">CERRAR SESIÓN</button>
            )}
        </div>
      </div>

      {/* NAVBAR */}
      <nav className="sticky top-0 bg-[#020202]/80 backdrop-blur-xl border-b border-zinc-800/50 p-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-2xl text-pink-500">☰</button>
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar títulos, personas o #tags..." 
            className="flex-1 bg-zinc-900/50 border border-zinc-800 p-3 px-5 rounded-2xl outline-none focus:border-pink-500 transition-all text-sm"
          />
        </div>
      </nav>

      {/* GRILLA DE VIDEOS */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((vid) => (
            <div key={vid.id} className="group cursor-pointer" onClick={() => setSelectedVid(vid)}>
              <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-zinc-800 group-hover:border-pink-500/50 transition-all relative shadow-lg">
                {vid.url.includes('mp4') ? (
                  <video muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} className="w-full h-full object-cover">
                    <source src={vid.url} />
                  </video>
                ) : (
                  <iframe src={vid.url} className="w-full h-full pointer-events-none" />
                )}
                { (isAdmin || (currentUser && vid.uploader === currentUser.user)) && (
                   <button onClick={(e) => {e.stopPropagation(); if(confirm("¿Borrar?")) deleteDoc(doc(db, "videos", vid.id));}} className="absolute top-2 right-2 bg-red-600/80 backdrop-blur-md text-white p-1 px-3 rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">ELIMINAR</button>
                )}
              </div>
              <div className="mt-4 flex gap-3 px-1">
                <img src={users[vid.uploader] || vid.pfp} className="w-9 h-9 rounded-full border border-zinc-800 object-cover flex-shrink-0" />
                <div className="overflow-hidden">
                  <h3 className="font-bold text-sm truncate leading-tight">{vid.title}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase mt-1 tracking-wider">{vid.uploader}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL / PLAYER CON KEY PARA RECARGA */}
      {selectedVid && (
        <div className="fixed inset-0 bg-[#020202] z-[2000] overflow-y-auto p-4 md:p-10 animate-in fade-in zoom-in duration-300">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            <div className="lg:col-span-2 space-y-6">
                <button onClick={() => setSelectedVid(null)} className="text-zinc-500 hover:text-white font-bold text-xs bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800 transition-all active:scale-95">← REGRESAR</button>
                
                {/* LA KEY FORZA EL REFRESH AL CAMBIAR DE VIDEO */}
                <div key={selectedVid.id} className="aspect-video w-full bg-black rounded-[40px] overflow-hidden border border-zinc-800 shadow-2xl shadow-pink-500/5">
                    {selectedVid.url.includes('mp4') ? (
                        <video ref={videoRef} onEnded={handleVideoEnd} controls autoPlay className="w-full h-full object-contain"><source src={selectedVid.url} /></video>
                    ) : (
                        <iframe src={`${selectedVid.url}${selectedVid.url.includes('?') ? '&' : '?'}autoplay=1`} className="w-full h-full" allowFullScreen allow="autoplay" />
                    )}
                </div>

                <div className="bg-zinc-900/20 p-8 rounded-[40px] border border-zinc-800/50">
                    <h2 className="text-3xl font-black tracking-tighter">{selectedVid.title}</h2>
                    <div className="flex items-center gap-3 mt-6">
                        <img src={users[selectedVid.uploader]} className="w-10 h-10 rounded-full border border-pink-500/20 object-cover" />
                        <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-[3px]">{selectedVid.uploader}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-pink-500 font-black text-xs uppercase tracking-widest px-2">Recomendados para ti</h3>
                <div className="space-y-4">
                  {getRecommended(selectedVid).map(rec => (
                      <div key={rec.id} onClick={() => setSelectedVid(rec)} className="flex gap-4 group cursor-pointer bg-zinc-900/10 p-3 rounded-3xl border border-transparent hover:border-zinc-800 transition-all">
                          <div className="w-32 aspect-video bg-black rounded-2xl overflow-hidden flex-shrink-0 relative">
                               {rec.url.includes('mp4') ? <video muted className="w-full h-full object-cover opacity-60"><source src={rec.url}/></video> : <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600 bg-zinc-900">EMBED</div>}
                               {rec.score > 0 && <div className="absolute bottom-1 right-1 bg-pink-600 text-[8px] px-1.5 py-0.5 rounded font-bold italic">MATCH</div>}
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
        </div>
      )}
    </div>
  );
}
