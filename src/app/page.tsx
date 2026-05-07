"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, addDoc, 
  doc, getDoc, setDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

export default function KaeliaPremiumTags() {
  const [videos, setVideos] = useState<any[]>([]);
  const [users, setUsers] = useState<any>({}); 
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Estados de Interfaz
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserPanelOpen, setUserPanelOpen] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedVid, setSelectedVid] = useState<any>(null);
  
  // Formularios
  const [adminInput, setAdminInput] = useState("");
  const [upUrl, setUpUrl] = useState("");
  const [upTitle, setUpTitle] = useState("");
  const [upTags, setUpTags] = useState("");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const localUser = localStorage.getItem('kaelia_user');
    if (localUser) setCurrentUser(JSON.parse(localUser));
    if (localStorage.getItem('kaelia_admin') === 'true') setIsAdmin(true);

    onSnapshot(collection(db, "users"), (snap) => {
      const uMap: any = {};
      snap.forEach(d => uMap[d.id] = d.data().pfp);
      setUsers(uMap);
    });

    const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const getRecommended = (currentVid: any) => {
    if (!currentVid) return [];
    return videos
      .filter(v => v.id !== currentVid.id)
      .map(v => ({
        ...v,
        score: v.tags?.filter((t: string) => currentVid.tags?.includes(t)).length || 0
      }))
      .sort((a, b) => b.score - a.score || Math.random() - 0.5).slice(0, 8);
  };

  const handleLogin = async () => {
    const userKey = loginUser.toLowerCase().trim();
    if (!userKey || !loginPass) return;
    const userRef = doc(db, "users", userKey);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      if (snap.data().pass === loginPass) {
        setCurrentUser(snap.data());
        localStorage.setItem('kaelia_user', JSON.stringify(snap.data()));
      } else alert("PIN Incorrecto");
    } else {
      const newUser = { user: userKey, pass: loginPass, pfp: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' };
      await setDoc(userRef, newUser);
      setCurrentUser(newUser);
      localStorage.setItem('kaelia_user', JSON.stringify(newUser));
    }
  };

  const checkAdminKey = () => {
    if (adminInput === "1234") {
      setIsAdmin(true);
      localStorage.setItem('kaelia_admin', 'true');
      setShowAdminModal(false);
      setAdminInput("");
    } else { alert("Llave incorrecta"); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 selection:bg-pink-500/30">
      
      {/* --- NAVBAR SUPERIOR --- */}
      <nav className="sticky top-0 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 p-4 z-[100]">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-full text-pink-500 text-xl transition-colors">☰</button>
            <h1 className="hidden md:block font-black italic text-xl tracking-tighter text-white">KAELIA<span className="text-pink-500">.</span></h1>
          </div>

          <div className="flex-1 max-w-2xl relative group">
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, user o #tag..." 
              className="w-full bg-white/5 border border-white/10 p-2.5 px-6 rounded-full outline-none focus:border-pink-500/50 transition-all text-sm"
            />
          </div>

          <button onClick={() => setUserPanelOpen(true)} className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-zinc-900 flex items-center justify-center hover:scale-110 transition-transform active:scale-95 shadow-lg shadow-black/50">
            {currentUser ? (
              <img src={users[currentUser.user] || currentUser.pfp} className="w-full h-full object-cover" />
            ) : ( <span className="text-xl">👤</span> )}
          </button>
        </div>
      </nav>

      {/* --- PANEL DE USUARIO (DERECHA) --- */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-[#0a0a0a] border-l border-white/5 z-[200] transition-transform duration-300 p-8 flex flex-col ${isUserPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
          <h3 className="font-bold text-[10px] tracking-[4px] uppercase text-zinc-500 italic">User Space</h3>
          <button onClick={() => setUserPanelOpen(false)} className="text-xl hover:text-pink-500 transition-colors">✕</button>
        </div>

        {currentUser ? (
          <div className="flex-1 flex flex-col justify-between">
            <div className="text-center space-y-4">
              <div className="relative inline-block group">
                <img src={users[currentUser.user] || currentUser.pfp} className="w-28 h-28 rounded-full border-2 border-pink-500 object-cover p-1 shadow-2xl shadow-pink-500/10" />
                <button onClick={() => {const n = prompt("URL Foto:"); if(n) setDoc(doc(db, "users", currentUser.user), {pfp: n}, {merge: true});}} className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity">EDITAR</button>
              </div>
              <h2 className="font-black text-2xl italic tracking-tighter">@{currentUser.user}</h2>
              {isAdmin && <p className="text-[9px] bg-pink-500/10 text-pink-500 py-1 px-3 rounded-full border border-pink-500/20 inline-block">ADMIN ACCESS</p>}
            </div>
            <button onClick={() => {localStorage.clear(); location.reload();}} className="w-full bg-red-500/10 text-red-500 p-4 rounded-2xl text-[10px] font-black tracking-[2px] hover:bg-red-500/20 transition-all uppercase">Desconectarse</button>
          </div>
        ) : (
          <div className="space-y-4">
            <input type="text" placeholder="Usuario" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-pink-500/30" onChange={e => setLoginUser(e.target.value)} />
            <input type="password" placeholder="PIN" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-pink-500/30" onChange={e => setLoginPass(e.target.value)} />
            <button onClick={handleLogin} className="w-full bg-pink-600 p-4 rounded-2xl font-black text-xs tracking-widest shadow-xl shadow-pink-600/20 active:scale-95 transition-all uppercase">Entrar</button>
          </div>
        )}
      </div>

      {/* --- SIDEBAR IZQUIERDO --- */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#0a0a0a] border-r border-white/5 z-[200] transition-transform duration-300 p-8 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
          <h3 className="font-bold text-pink-500 tracking-tighter italic text-2xl">KAELIA<span className="text-white">.LOG</span></h3>
          <button onClick={() => setSidebarOpen(false)} className="text-xl">✕</button>
        </div>

        <div className="space-y-2 mb-10">
          <button onClick={() => {setSearch(""); setSidebarOpen(false);}} className="w-full text-left p-4 rounded-2xl hover:bg-white/5 transition-all text-sm font-medium flex items-center gap-3"><span>🌐</span> Explorar</button>
          {currentUser && (
            <button onClick={() => {setSearch(currentUser.user); setSidebarOpen(false);}} className="w-full text-left p-4 rounded-2xl hover:bg-white/5 transition-all text-sm font-medium flex items-center gap-3"><span>📂</span> Mis Archivos</button>
          )}
        </div>

        {currentUser && (
          <div className="space-y-4">
            <p className="text-[10px] text-zinc-500 font-black tracking-widest uppercase mb-4">Upload File</p>
            <input value={upUrl} onChange={e => setUpUrl(e.target.value)} placeholder="URL Video / Embed" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs outline-none focus:border-pink-500/30" />
            <input value={upTitle} onChange={e => setUpTitle(e.target.value)} placeholder="Título del archivo" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs outline-none focus:border-pink-500/30" />
            <input value={upTags} onChange={e => setUpTags(e.target.value)} placeholder="Tags (separadas por coma)" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs outline-none focus:border-pink-500/30" />
            <button onClick={async () => {
              if(!upUrl) return;
              await addDoc(collection(db, "videos"), {
                title: upTitle || "Sin título", url: upUrl, uploader: currentUser.user,
                tags: upTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== ""),
                timestamp: serverTimestamp()
              });
              setUpUrl(""); setUpTitle(""); setUpTags(""); setSidebarOpen(false);
            }} className="w-full bg-white text-black py-4 rounded-2xl font-black text-[10px] tracking-widest hover:bg-pink-500 hover:text-white transition-all active:scale-95 uppercase shadow-xl">Publicar ahora</button>
          </div>
        )}

        <button onClick={() => setShowAdminModal(true)} className="absolute bottom-8 left-8 right-8 p-3 bg-zinc-900 border border-white/5 rounded-xl text-[9px] font-black tracking-[2px] text-zinc-500 hover:text-white transition-all uppercase">
          {isAdmin ? 'ADMIN MODE: ON' : 'ADMIN KEY'}
        </button>
      </div>

      {/* --- MODAL DE ADMIN --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-white/10 p-10 rounded-[40px] w-full max-w-sm text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="text-4xl mb-4">🔑</div>
            <h2 className="text-xl font-black mb-1 tracking-tighter uppercase italic text-white">Master Access</h2>
            <p className="text-[10px] text-zinc-500 mb-8 font-bold tracking-widest uppercase">Seguridad Requerida</p>
            <input 
              type="password" autoFocus
              className="w-full bg-black border border-white/10 p-5 rounded-3xl text-center text-3xl tracking-[8px] outline-none focus:border-pink-500/50 transition-all mb-6 font-mono text-pink-500"
              value={adminInput} onChange={e => setAdminInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkAdminKey()}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAdminModal(false)} className="flex-1 p-4 bg-zinc-800 rounded-2xl text-[10px] font-black tracking-widest uppercase hover:bg-zinc-700 transition-colors">Cerrar</button>
              <button onClick={checkAdminKey} className="flex-1 p-4 bg-pink-600 rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-lg shadow-pink-600/20 active:scale-95 transition-all">Verificar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- FEED DE VIDEOS (GRILLA) --- */}
      <main className="p-6 md:p-10 max-w-[1900px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {videos.filter(v => v.title?.toLowerCase().includes(search.toLowerCase()) || v.tags?.some((t:any) => t.includes(search.toLowerCase())) || v.uploader?.toLowerCase().includes(search.toLowerCase()))
          .map((vid) => (
            <div key={vid.id} className="group cursor-pointer relative" onClick={() => setSelectedVid(vid)}>
              <div className="aspect-video bg-black rounded-[32px] overflow-hidden border border-white/5 group-hover:border-pink-500/30 transition-all duration-500 shadow-2xl group-hover:shadow-pink-500/5 relative">
                {vid.url.includes('mp4') ? (
                  <video muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => {e.currentTarget.pause(); e.currentTarget.currentTime = 0;}} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all">
                    <source src={vid.url} />
                  </video>
                ) : (
                  <iframe src={vid.url} className="w-full h-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
                )}
                {isAdmin && (
                   <button onClick={(e) => {e.stopPropagation(); if(confirm("¿Eliminar?")) deleteDoc(doc(db, "videos", vid.id));}} className="absolute top-4 right-4 bg-red-600/80 backdrop-blur-md text-white p-2 px-4 rounded-xl text-[8px] font-black opacity-0 group-hover:opacity-100 transition-all active:scale-90">ELIMINAR</button>
                )}
              </div>
              <div className="p-5 flex gap-4">
                <img src={users[vid.uploader] || vid.pfp} className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-lg" />
                <div className="overflow-hidden space-y-1">
                  <h3 className="font-bold text-[13px] truncate group-hover:text-pink-400 transition-colors leading-tight">{vid.title}</h3>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">@{vid.uploader}</p>
                  
                  {/* TAGS EN LA CUADRÍCULA */}
                  <div className="flex flex-wrap gap-1 pt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    {vid.tags?.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-[8px] bg-white/5 border border-white/5 text-zinc-400 px-2 py-0.5 rounded-full font-medium">#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- MODAL PLAYER --- */}
      {selectedVid && (
        <div className="fixed inset-0 bg-[#050505] z-[2000] overflow-y-auto p-4 md:p-12 animate-in fade-in zoom-in duration-500">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-3">
              <button onClick={() => setSelectedVid(null)} className="mb-8 bg-white/5 p-4 px-8 rounded-2xl text-[9px] font-black tracking-[3px] hover:bg-white/10 transition-all active:scale-95 uppercase">← Regresar</button>
              
              <div key={selectedVid.id} className="aspect-video w-full bg-black rounded-[48px] overflow-hidden border border-white/10 shadow-2xl shadow-pink-500/5">
                {selectedVid.url.includes('mp4') ? (
                  <video onEnded={() => {const n = getRecommended(selectedVid)[0]; if(n) setSelectedVid(n);}} controls autoPlay className="w-full h-full object-contain"><source src={selectedVid.url} /></video>
                ) : (
                  <iframe src={`${selectedVid.url}${selectedVid.url.includes('?') ? '&' : '?'}autoplay=1`} className="w-full h-full" allowFullScreen allow="autoplay" />
                )}
              </div>

              <div className="mt-10 p-2 space-y-4">
                <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white leading-none">{selectedVid.title}</h2>
                <div className="flex items-center gap-4">
                  <img src={users[selectedVid.uploader]} className="w-12 h-12 rounded-full border border-pink-500/30 object-cover shadow-xl shadow-pink-500/5" />
                  <div className="flex flex-col">
                    <span className="text-zinc-400 font-black text-[10px] tracking-[4px] uppercase">Original uploader</span>
                    <span className="text-white font-black italic text-lg tracking-tighter">@{selectedVid.uploader.toUpperCase()}</span>
                  </div>
                </div>

                {/* TAGS EN EL REPRODUCTOR */}
                <div className="flex flex-wrap gap-2 pt-6">
                  {selectedVid.tags?.map((tag: string) => (
                    <span key={tag} className="text-[10px] font-black bg-pink-500/5 border border-pink-500/20 text-pink-500 px-4 py-2 rounded-2xl tracking-widest uppercase shadow-lg shadow-pink-500/5 cursor-default hover:bg-pink-500 hover:text-white transition-all">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-20">
              <h3 className="text-pink-500 font-black text-[10px] uppercase tracking-[4px] px-2 mb-8 italic">Up next</h3>
              <div className="space-y-4">
                {getRecommended(selectedVid).map(rec => (
                  <div key={rec.id} onClick={() => setSelectedVid(rec)} className="flex gap-4 group cursor-pointer bg-white/5 p-4 rounded-[32px] hover:bg-white/10 transition-all border border-transparent hover:border-white/10 active:scale-95">
                    <div className="w-28 aspect-video bg-black rounded-2xl overflow-hidden flex-shrink-0 relative">
                      {rec.url.includes('mp4') ? <video muted className="w-full h-full object-cover opacity-50"><source src={rec.url}/></video> : <div className="w-full h-full bg-zinc-900"/>}
                      {rec.score > 0 && <div className="absolute top-1 right-1 bg-pink-600 text-[7px] px-1.5 py-0.5 rounded font-black italic tracking-tighter">MATCH</div>}
                    </div>
                    <div className="overflow-hidden justify-center flex flex-col space-y-1">
                      <h4 className="text-[11px] font-bold truncate group-hover:text-pink-500 transition-colors uppercase tracking-tight">{rec.title}</h4>
                      <p className="text-[9px] text-zinc-500 font-black uppercase">@{rec.uploader}</p>
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
