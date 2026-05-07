"use client";
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, addDoc, 
  doc, getDoc, setDoc, deleteDoc, serverTimestamp, updateDoc 
} from 'firebase/firestore';

export default function KaeliaNexus() {
  const [videos, setVideos] = useState<any[]>([]);
  const [users, setUsers] = useState<any>({}); 
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserPanelOpen, setUserPanelOpen] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedVid, setSelectedVid] = useState<any>(null);
  
  // Estados de entrada
  const [adminInput, setAdminInput] = useState("");
  const [upUrl, setUpUrl] = useState("");
  const [upTitle, setUpTitle] = useState("");
  const [upTags, setUpTags] = useState("");
  const [upCover, setUpCover] = useState(""); // Nueva Portada
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  useEffect(() => {
    const localUser = localStorage.getItem('kaelia_user');
    if (localUser) setCurrentUser(JSON.parse(localUser));
    if (localStorage.getItem('kaelia_admin') === 'true') setIsAdmin(true);

    onSnapshot(collection(db, "users"), (snap) => {
      const uMap: any = {};
      snap.forEach(d => uMap[d.id] = d.data());
      setUsers(uMap);
    });

    const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleLogin = async () => {
    const userKey = loginUser.toLowerCase().trim();
    if (!userKey || !loginPass) return alert("Completa los datos de acceso.");
    try {
      const userRef = doc(db, "users", userKey);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        if (snap.data().pass === loginPass) {
          setCurrentUser(snap.data());
          localStorage.setItem('kaelia_user', JSON.stringify(snap.data()));
          setUserPanelOpen(false);
        } else { alert("PIN Incorrecto."); }
      } else {
        const newUser = { user: userKey, pass: loginPass, pfp: 'https://i.imgur.com/6VBx3io.png', cover: '' };
        await setDoc(userRef, newUser);
        setCurrentUser(newUser);
        localStorage.setItem('kaelia_user', JSON.stringify(newUser));
        setUserPanelOpen(false);
      }
    } catch (e) { console.error(e); }
  };

  const checkAdminKey = () => {
    if (adminInput === "KAELIA2024") { // TU LLAVE MAESTRA
      setIsAdmin(true);
      localStorage.setItem('kaelia_admin', 'true');
      setShowAdminModal(false);
      alert("Modo Administrador Activado");
    } else { alert("Llave inválida"); }
  };

  const reproducirSiguiente = (actual: any) => {
    const otros = videos.filter(v => v.id !== actual.id);
    if (otros.length) setSelectedVid(otros[Math.floor(Math.random() * otros.length)]);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-pink-500/30">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 bg-black/80 backdrop-blur-2xl border-b border-white/5 p-4 z-[100]">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-6">
          <button onClick={() => setSidebarOpen(true)} className="text-pink-500 text-2xl p-2">☰</button>
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Explorar el Nexo..." 
            className="flex-1 max-w-xl bg-white/5 border border-white/10 p-3 px-6 rounded-2xl outline-none focus:border-pink-500/50"
          />
          <button onClick={() => setUserPanelOpen(true)} className="w-12 h-12 rounded-full border-2 border-pink-500/20 overflow-hidden bg-zinc-900 shadow-lg">
            <img src={users[currentUser?.user]?.pfp || 'https://i.imgur.com/6VBx3io.png'} className="w-full h-full object-cover" />
          </button>
        </div>
      </nav>

      {/* --- SIDEBAR IZQUIERDA (SUBIDA) --- */}
      <div className={`fixed inset-y-0 left-0 w-80 bg-[#050505] border-r border-white/5 z-[300] transition-transform duration-500 p-8 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black text-pink-500 italic">KAELIA.</h2>
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 text-xl">✕</button>
        </div>
        
        {currentUser ? (
          <div className="space-y-4">
            <p className="text-[10px] font-black tracking-[3px] text-zinc-500 uppercase mb-4">Nueva Publicación</p>
            <input value={upTitle} onChange={e => setUpTitle(e.target.value)} placeholder="Título del video" className="w-full bg-white/5 p-4 rounded-xl text-xs outline-none border border-white/5" />
            <input value={upUrl} onChange={e => setUpUrl(e.target.value)} placeholder="URL del Video (Directo/YouTube)" className="w-full bg-white/5 p-4 rounded-xl text-xs outline-none border border-white/5" />
            <input value={upCover} onChange={e => setUpCover(e.target.value)} placeholder="URL de la Portada (Imagen)" className="w-full bg-white/5 p-4 rounded-xl text-xs outline-none border border-white/5" />
            <input value={upTags} onChange={e => setUpTags(e.target.value)} placeholder="Tags (ej: neon, party)" className="w-full bg-white/5 p-4 rounded-xl text-xs outline-none border border-white/5" />
            <button onClick={async () => {
              if(!upUrl || !upTitle) return alert("Faltan datos");
              await addDoc(collection(db, "videos"), {
                title: upTitle, url: upUrl, cover: upCover || '',
                uploader: currentUser.user, featured: false, timestamp: serverTimestamp(),
                tags: upTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== "")
              });
              setUpUrl(""); setUpTitle(""); setUpCover(""); setUpTags(""); setSidebarOpen(false);
            }} className="w-full bg-pink-600 p-4 rounded-xl font-black text-xs uppercase shadow-lg shadow-pink-600/20">Publicar en Kaelia</button>
          </div>
        ) : <p className="text-zinc-500 italic text-sm text-center pt-10">Inicia sesión para compartir contenido.</p>}

        <button onClick={() => setShowAdminModal(true)} className="absolute bottom-8 left-8 text-[9px] font-black text-zinc-700 tracking-[3px] uppercase hover:text-pink-500">
          {isAdmin ? "MODO ADMIN ACTIVO" : "LLAVE DE SISTEMA"}
        </button>
      </div>

      {/* --- PANEL DE USUARIO (CONFIGURACIÓN) --- */}
      <div className={`fixed inset-y-0 right-0 w-85 bg-[#050505] border-l border-white/10 z-[300] transition-transform duration-500 p-10 shadow-2xl ${isUserPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
          <span className="text-[10px] font-black tracking-[4px] text-zinc-500 uppercase">Perfil de Usuario</span>
          <button onClick={() => setUserPanelOpen(false)}>✕</button>
        </div>

        {currentUser ? (
          <div className="space-y-8">
            <div className="text-center group relative">
              <img src={users[currentUser.user]?.pfp} className="w-32 h-32 rounded-[40px] border-2 border-pink-500 mx-auto object-cover" />
              <button onClick={() => {
                const n = prompt("Nueva URL de Foto:");
                if(n) updateDoc(doc(db, "users", currentUser.user), {pfp: n});
              }} className="mt-4 text-[10px] text-pink-500 font-bold uppercase tracking-widest">Cambiar Foto</button>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Nombre de Usuario</p>
                <p className="text-lg font-bold italic">@{currentUser.user}</p>
              </div>
              <button onClick={() => {
                const n = prompt("Nuevo PIN (mínimo 4 números):");
                if(n) updateDoc(doc(db, "users", currentUser.user), {pass: n});
              }} className="w-full bg-white/5 p-4 rounded-2xl text-[10px] font-black uppercase text-left hover:bg-white/10 transition-all">Cambiar PIN de Acceso</button>
              <button onClick={() => {localStorage.clear(); location.reload();}} className="w-full bg-red-500/10 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase">Cerrar Sesión</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <input placeholder="Usuario" className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/5" onChange={e => setLoginUser(e.target.value)} />
            <input type="password" placeholder="PIN" className="w-full bg-white/5 p-4 rounded-2xl outline-none border border-white/5" onChange={e => setLoginPass(e.target.value)} />
            <button onClick={handleLogin} className="w-full bg-pink-600 p-4 rounded-2xl font-black uppercase tracking-widest">Entrar</button>
          </div>
        )}
      </div>

      {/* --- FEED --- */}
      <main className="p-6 md:p-12 max-w-[1900px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {videos.filter(v => v.title.toLowerCase().includes(search.toLowerCase())).map(vid => (
            <div key={vid.id} className="group flex flex-col rounded-[35px] overflow-hidden border border-white/5 bg-zinc-900/20 hover:border-pink-500/30 transition-all cursor-pointer" onClick={() => setSelectedVid(vid)}>
              <div className="aspect-video relative overflow-hidden bg-black">
                {vid.cover ? (
                  <img src={vid.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-800 italic">Sin Portada</div>
                )}
                {vid.featured && <div className="absolute top-3 right-4 text-2xl drop-shadow-[0_0_10px_#ff00ff] rotate-[-15deg] text-pink-500">👑</div>}
              </div>
              <div className="p-6">
                <div className="flex gap-4 items-center">
                  <img src={users[vid.uploader]?.pfp} className="w-10 h-10 rounded-2xl object-cover border border-white/10" />
                  <div className="overflow-hidden">
                    <h3 className="font-black text-sm truncate group-hover:text-pink-400 transition-colors uppercase italic">{vid.title}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold tracking-widest">@{vid.uploader}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- MODAL REPRODUCTOR + ADMIN --- */}
      {selectedVid && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[2000] p-4 md:p-12 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
               <button onClick={() => setSelectedVid(null)} className="text-[10px] font-black uppercase tracking-[3px] bg-white/5 px-8 py-4 rounded-2xl">← Salir del Nexo</button>
               
               {/* HERRAMIENTAS ADMIN DENTRO DEL VIDEO */}
               {isAdmin && (
                 <div className="flex gap-2">
                   <button onClick={() => updateDoc(doc(db, "videos", selectedVid.id), {featured: !selectedVid.featured})} className={`p-4 rounded-2xl font-black text-[10px] uppercase border ${selectedVid.featured ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-black text-white border-white/20'}`}>
                     {selectedVid.featured ? 'QUITAR CORONA ★' : 'DAR CORONA ☆'}
                   </button>
                   <button onClick={async () => {
                     if(confirm("¿Eliminar permanentemente?")) {
                       await deleteDoc(doc(db, "videos", selectedVid.id));
                       setSelectedVid(null);
                     }
                   }} className="p-4 bg-red-600 rounded-2xl font-black text-[10px] uppercase">Eliminar Archivo</button>
                 </div>
               )}
            </div>

            <div className={`aspect-video w-full rounded-[40px] overflow-hidden border-4 bg-black shadow-2xl ${selectedVid.featured ? 'border-yellow-500 shadow-yellow-500/20' : 'border-white/10'}`}>
              <video 
                key={selectedVid.url} 
                controls autoPlay 
                onEnded={() => reproducirSiguiente(selectedVid)}
                className="w-full h-full object-contain"
              >
                <source src={selectedVid.url} />
              </video>
            </div>

            <div className="p-10 bg-white/[0.02] rounded-[40px] border border-white/5">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-pink-500 mb-4">{selectedVid.title}</h2>
              <div className="flex items-center gap-4">
                <img src={users[selectedVid.uploader]?.pfp} className="w-12 h-12 rounded-2xl border border-pink-500/30" />
                <p className="font-black text-xl italic tracking-tighter uppercase">@{selectedVid.uploader}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL ADMIN KEY --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[3000] flex items-center justify-center">
          <div className="bg-[#111] p-12 rounded-[50px] border border-white/10 w-full max-w-md text-center">
            <h2 className="text-xl font-black uppercase tracking-[5px] mb-8 text-white italic">Llave Maestra</h2>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full bg-black border border-white/10 p-6 rounded-3xl text-center text-2xl tracking-[8px] outline-none mb-6 text-pink-500"
              onChange={e => setAdminInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkAdminKey()}
            />
            <div className="flex gap-4">
              <button onClick={() => setShowAdminModal(false)} className="flex-1 p-5 rounded-2xl text-[10px] font-black uppercase bg-zinc-800">Cancelar</button>
              <button onClick={checkAdminKey} className="flex-1 p-5 rounded-2xl text-[10px] font-black uppercase bg-pink-600">Activar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
