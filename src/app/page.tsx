"use client";
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, addDoc, 
  doc, getDoc, setDoc, deleteDoc, serverTimestamp, updateDoc 
} from 'firebase/firestore';

export default function KaeliaNexusV4() {
  const [videos, setVideos] = useState<any[]>([]);
  const [users, setUsers] = useState<any>({}); 
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserPanelOpen, setUserPanelOpen] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedVid, setSelectedVid] = useState<any>(null);
  const [editVid, setEditVid] = useState<any>(null);
  
  const [adminInput, setAdminInput] = useState("");
  const [upUrl, setUpUrl] = useState("");
  const [upTitle, setUpTitle] = useState("");
  const [upTags, setUpTags] = useState("");
  const [upCover, setUpCover] = useState("");
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
    if (!userKey || !loginPass) return alert("Completa los datos.");
    try {
      const userRef = doc(db, "users", userKey);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        if (snap.data().pass === loginPass) {
          setCurrentUser(snap.data());
          localStorage.setItem('kaelia_user', JSON.stringify(snap.data()));
          setUserPanelOpen(false);
        } else { alert("PIN Incorrecto"); }
      } else {
        const newUser = { user: userKey, pass: loginPass, pfp: 'https://i.imgur.com/6VBx3io.png' };
        await setDoc(userRef, newUser);
        setCurrentUser(newUser);
        localStorage.setItem('kaelia_user', JSON.stringify(newUser));
        setUserPanelOpen(false);
      }
    } catch (e) { console.error(e); }
  };

  const checkAdminKey = () => {
    if (adminInput === "KAELIA2024") {
      setIsAdmin(true);
      localStorage.setItem('kaelia_admin', 'true');
      setShowAdminModal(false);
    } else { alert("Llave inválida"); }
  };

  const reproducirSiguiente = (actual: any) => {
    const otros = videos.filter(v => v.id !== actual.id);
    if (otros.length) setSelectedVid(otros[Math.floor(Math.random() * otros.length)]);
  };

  // Filtrado inteligente: Si el buscador tiene "@", filtra por uploader
  const filteredVideos = videos.filter(v => {
    if (search.startsWith('@')) {
      return v.uploader.toLowerCase() === search.slice(1).toLowerCase();
    }
    return v.title.toLowerCase().includes(search.toLowerCase()) || 
           v.tags?.some((t:any) => t.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-pink-500/30">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 bg-black/80 backdrop-blur-2xl border-b border-white/5 p-4 z-[100]">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-6">
          <button onClick={() => setSidebarOpen(true)} className="text-pink-500 text-2xl p-2">☰</button>
          
          <div className="flex-1 max-w-xl relative">
            <input 
              value={search} onChange={e => setSearch(e.target.value)} 
              placeholder={search.startsWith('@') ? `Viendo videos de ${search}` : "Buscar recuerdos..."} 
              className="w-full bg-white/5 border border-white/10 p-3 px-6 rounded-2xl outline-none focus:border-pink-500/50" 
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-pink-500 uppercase">Limpiar</button>
            )}
          </div>

          <button onClick={() => setUserPanelOpen(true)} className="w-12 h-12 rounded-full border-2 border-pink-500/20 overflow-hidden bg-zinc-900">
            <img src={users[currentUser?.user]?.pfp || 'https://i.imgur.com/6VBx3io.png'} className="w-full h-full object-cover" alt="perfil" />
          </button>
        </div>
      </nav>

      {/* --- SIDEBAR IZQUIERDA --- */}
      <div className={`fixed inset-y-0 left-0 w-80 bg-[#050505] border-r border-white/5 z-[400] transition-transform duration-500 p-8 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black text-pink-500 italic uppercase tracking-tighter">Kaelia</h2>
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-500">✕</button>
        </div>
        
        {currentUser && (
          <div className="space-y-4">
            <p className="text-[10px] font-black tracking-[3px] text-zinc-500 uppercase">Publicar Recuerdo</p>
            <input value={upTitle} onChange={e => setUpTitle(e.target.value)} placeholder="Título" className="w-full bg-white/5 p-4 rounded-xl text-xs border border-white/5 outline-none" />
            <input value={upUrl} onChange={e => setUpUrl(e.target.value)} placeholder="URL Video (.mp4)" className="w-full bg-white/5 p-4 rounded-xl text-xs border border-white/5 outline-none" />
            <input value={upCover} onChange={e => setUpCover(e.target.value)} placeholder="URL Portada (Opcional)" className="w-full bg-white/5 p-4 rounded-xl text-xs border border-white/5 outline-none" />
            <input value={upTags} onChange={e => setUpTags(e.target.value)} placeholder="Tags (coma)" className="w-full bg-white/5 p-4 rounded-xl text-xs border border-white/5 outline-none" />
            <button onClick={async () => {
              if(!upUrl || !upTitle) return;
              await addDoc(collection(db, "videos"), {
                title: upTitle, url: upUrl, cover: upCover, uploader: currentUser.user,
                tags: upTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== ""),
                featured: false, timestamp: serverTimestamp()
              });
              setSidebarOpen(false);
            }} className="w-full bg-pink-600 p-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-pink-600/20">Publicar en Kaelia</button>
          </div>
        )}
        <button onClick={() => setShowAdminModal(true)} className="absolute bottom-8 left-8 text-[9px] font-black text-zinc-700 tracking-[3px] uppercase">Admin Key</button>
      </div>

      {/* --- PANEL DE USUARIO (RESTAURADO) --- */}
      <div className={`fixed inset-y-0 right-0 w-85 bg-[#050505] border-l border-white/10 z-[400] transition-transform duration-500 p-10 ${isUserPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ajustes de Cuenta</span>
          <button onClick={() => setUserPanelOpen(false)}>✕</button>
        </div>
        {currentUser ? (
          <div className="space-y-8">
            <div className="text-center">
              <img src={users[currentUser.user]?.pfp} className="w-24 h-24 rounded-[30px] border-2 border-pink-500 mx-auto object-cover" />
              <h3 className="text-xl font-black italic uppercase mt-4">@{currentUser.user}</h3>
            </div>
            <div className="space-y-3">
              <button onClick={() => {const n = prompt("Nueva URL de Avatar:"); if(n) updateDoc(doc(db, "users", currentUser.user), {pfp: n});}} className="w-full bg-white/5 p-4 rounded-xl text-[10px] font-black uppercase text-left">Cambiar Foto de Perfil</button>
              <button onClick={() => {const n = prompt("Nuevo PIN de Seguridad:"); if(n) updateDoc(doc(db, "users", currentUser.user), {pass: n});}} className="w-full bg-white/5 p-4 rounded-xl text-[10px] font-black uppercase text-left">Cambiar PIN de Acceso</button>
              <button onClick={() => {localStorage.clear(); location.reload();}} className="w-full bg-red-500/10 text-red-500 p-4 rounded-xl font-black text-[10px] uppercase">Cerrar Sesión</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input placeholder="Usuario" className="w-full bg-white/5 p-4 rounded-xl outline-none" onChange={e => setLoginUser(e.target.value)} />
            <input type="password" placeholder="PIN" className="w-full bg-white/5 p-4 rounded-xl outline-none" onChange={e => setLoginPass(e.target.value)} />
            <button onClick={handleLogin} className="w-full bg-pink-600 p-4 rounded-xl font-black uppercase">Entrar</button>
          </div>
        )}
      </div>

      {/* --- FEED DE VIDEOS --- */}
      <main className="p-8 max-w-[1900px] mx-auto">
        {search.startsWith('@') && (
          <div className="mb-10 flex items-center gap-4 animate-in slide-in-from-left duration-500">
            <img src={users[search.slice(1)]?.pfp} className="w-16 h-16 rounded-3xl border-2 border-pink-500 object-cover" />
            <div>
              <p className="text-zinc-500 font-black text-[10px] uppercase tracking-widest">Viendo recuerdos de</p>
              <h2 className="text-3xl font-black italic uppercase text-white">@{search.slice(1)}</h2>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
          {filteredVideos.map(vid => (
            <div key={vid.id} className="group relative">
              
              {/* BORDE DORADO EXTERIOR */}
              {vid.featured && (
                <div className="absolute -inset-[2px] bg-gradient-to-br from-yellow-300 via-yellow-600 to-yellow-400 rounded-[37px] blur-[2px] z-0 opacity-70 group-hover:opacity-100 transition-opacity" />
              )}

              <div className={`relative z-10 flex flex-col h-full rounded-[35px] overflow-hidden border transition-all bg-[#0a0a0a] 
                ${vid.featured ? 'border-yellow-500/50' : 'border-white/5 hover:border-pink-500/30'}`}>
                
                <div onClick={() => setSelectedVid(vid)} className="cursor-pointer">
                  <div className="aspect-video relative overflow-hidden bg-black">
                    <img src={vid.cover || 'https://i.imgur.com/8N7mZ6I.png'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="cover" />
                    {vid.featured && <div className="absolute top-3 right-4 text-2xl drop-shadow-[0_0_10px_#ff00ff] rotate-[-15deg] text-pink-500 z-20">👑</div>}
                  </div>
                  <div className="p-6">
                    <h3 className={`font-black text-sm truncate uppercase italic mb-4 ${vid.featured ? 'text-yellow-500' : 'text-white'}`}>{vid.title}</h3>
                    
                    <div className="flex gap-3 items-center" onClick={(e) => {e.stopPropagation(); setSearch('@' + vid.uploader);}}>
                      <img src={users[vid.uploader]?.pfp} className={`w-8 h-8 rounded-xl object-cover border ${vid.featured ? 'border-yellow-500/50' : 'border-white/10'}`} />
                      <p className="text-[10px] text-zinc-500 font-bold hover:text-pink-500 transition-colors uppercase tracking-widest">@{vid.uploader}</p>
                    </div>
                  </div>
                </div>

                {/* BOTÓN EDITAR (Solo dueño o admin) - SIN BORRAR POR FUERA */}
                {(isAdmin || currentUser?.user === vid.uploader) && (
                  <button onClick={() => setEditVid(vid)} className="absolute top-3 left-3 z-30 p-2.5 bg-blue-600/80 backdrop-blur-md rounded-xl text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity">✎ EDITAR</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- REPRODUCTOR (MODAL PLAYER) --- */}
      {selectedVid && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[500] p-4 md:p-10 overflow-y-auto animate-in fade-in duration-500">
          <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex justify-between items-center">
                <button onClick={() => setSelectedVid(null)} className="text-[10px] font-black uppercase bg-white/5 px-6 py-3 rounded-xl border border-white/5">← Volver</button>
                
                {/* BOTONES DE GESTIÓN INTERNOS (Dueño o Admin) */}
                {(isAdmin || currentUser?.user === selectedVid.uploader) && (
                  <div className="flex gap-2">
                    <button onClick={() => setEditVid(selectedVid)} className="bg-blue-600 p-3 rounded-xl text-[10px] font-black uppercase">Editar Info</button>
                    {isAdmin && <button onClick={() => updateDoc(doc(db, "videos", selectedVid.id), {featured: !selectedVid.featured})} className="bg-yellow-500 text-black p-3 rounded-xl text-[10px] font-black uppercase">Corona</button>}
                    <button onClick={async () => {if(confirm("¿Borrar este recuerdo permanentemente?")){ await deleteDoc(doc(db, "videos", selectedVid.id)); setSelectedVid(null);}}} className="bg-red-600 p-3 rounded-xl text-[10px] font-black uppercase">Borrar Video</button>
                  </div>
                )}
              </div>

              <div className={`aspect-video w-full rounded-[40px] overflow-hidden border-4 bg-black shadow-2xl ${selectedVid.featured ? 'border-yellow-500 shadow-yellow-500/20' : 'border-white/10 shadow-pink-500/10'}`}>
                <video key={selectedVid.url} controls autoPlay onEnded={() => reproducirSiguiente(selectedVid)} className="w-full h-full object-contain"><source src={selectedVid.url} /></video>
              </div>

              <div className="p-8 bg-white/[0.02] rounded-[40px] border border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-4xl font-black italic uppercase text-pink-500 mb-2 leading-none">{selectedVid.title}</h2>
                    
                    {/* INFO DEL USUARIO VISIBLE AL ENTRAR */}
                    <div className="flex items-center gap-4 cursor-pointer group/user" onClick={() => {setSearch('@' + selectedVid.uploader); setSelectedVid(null);}}>
                      <img src={users[selectedVid.uploader]?.pfp} className="w-12 h-12 rounded-2xl border-2 border-pink-500/30 group-hover/user:border-pink-500 transition-all object-cover" />
                      <div>
                        <p className="text-xs font-black uppercase text-zinc-400 group-hover/user:text-white transition-colors">@{selectedVid.uploader}</p>
                        <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-[2px]">Ver Perfil Completo</p>
                      </div>
                    </div>
                  </div>
                  {selectedVid.featured && <span className="text-5xl text-pink-500 drop-shadow-[0_0_15px_#ff00ff]">👑</span>}
                </div>
                <div className="flex flex-wrap gap-2 pt-6 border-t border-white/5">
                  {selectedVid.tags?.map((t:any) => (
                    <span key={t} className="px-4 py-2 bg-pink-500/5 border border-pink-500/20 rounded-xl text-[10px] font-black text-pink-400 uppercase">#{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <h3 className="text-pink-500 font-black text-[10px] uppercase tracking-[6px] italic ml-2">Visiones Similares</h3>
              <div className="grid gap-4">
                {videos.filter(v => v.id !== selectedVid.id).slice(0, 6).map(rec => (
                  <div key={rec.id} onClick={() => setSelectedVid(rec)} className="flex gap-4 p-3 rounded-[25px] bg-white/[0.03] border border-transparent hover:border-pink-500/30 cursor-pointer transition-all">
                    <div className="w-32 aspect-video rounded-xl overflow-hidden bg-black flex-shrink-0 shadow-lg">
                      <img src={rec.cover || 'https://i.imgur.com/8N7mZ6I.png'} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-center overflow-hidden">
                      <h4 className="text-[11px] font-black uppercase truncate text-zinc-100">{rec.title}</h4>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">@{rec.uploader}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL EDITAR --- */}
      {editVid && (
        <div className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center p-6 backdrop-blur-xl">
          <div className="bg-[#111] p-10 rounded-[45px] border border-white/10 w-full max-w-lg space-y-5">
            <h2 className="text-xl font-black uppercase italic text-pink-500">Editar Memoria</h2>
            <div className="space-y-4">
              <input value={editVid.title} onChange={e => setEditVid({...editVid, title: e.target.value})} placeholder="Título" className="w-full bg-black p-4 rounded-xl border border-white/5 outline-none focus:border-pink-500 text-xs" />
              <input value={editVid.cover} onChange={e => setEditVid({...editVid, cover: e.target.value})} placeholder="Portada URL" className="w-full bg-black p-4 rounded-xl border border-white/5 outline-none focus:border-pink-500 text-xs" />
              <input value={editVid.tags?.join(',')} onChange={e => setEditVid({...editVid, tags: e.target.value.split(',')})} placeholder="Tags (coma)" className="w-full bg-black p-4 rounded-xl border border-white/5 outline-none focus:border-pink-500 text-xs" />
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setEditVid(null)} className="flex-1 p-4 bg-zinc-800 rounded-xl font-black text-[10px] uppercase">Cancelar</button>
              <button onClick={async () => {
                await updateDoc(doc(db, "videos", editVid.id), { title: editVid.title, cover: editVid.cover, tags: editVid.tags });
                setEditVid(null);
                if(selectedVid?.id === editVid.id) setSelectedVid({...selectedVid, ...editVid});
              }} className="flex-1 p-4 bg-pink-600 rounded-xl font-black text-[10px] uppercase">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL ADMIN KEY --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/95 z-[2000] flex items-center justify-center">
          <div className="bg-[#111] p-12 rounded-[50px] border border-white/10 text-center">
            <h2 className="text-white font-black uppercase tracking-[5px] mb-8">Master Key</h2>
            <input type="password" placeholder="••••" className="w-full bg-black p-6 rounded-3xl text-center text-3xl text-pink-500 border border-white/10 outline-none mb-6" onChange={e => setAdminInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkAdminKey()} />
            <button onClick={checkAdminKey} className="w-full bg-pink-600 p-5 rounded-2xl font-black uppercase">Activar</button>
            <button onClick={() => setShowAdminModal(false)} className="text-[10px] text-zinc-600 uppercase mt-4 block mx-auto">Cerrar</button>
          </div>
        </div>
      )}

    </div>
  );
}
