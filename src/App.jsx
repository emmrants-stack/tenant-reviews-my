import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const CATS = [
  { key: 'landlord', label: 'Landlord', ph: 'E.g., returned deposit on time, responsive' },
  { key: 'location', label: 'Location', ph: 'E.g., great transport links, noisy at night' },
  { key: 'management', label: 'Management', ph: 'E.g., slow to fix issues, professional staff' },
  { key: 'security', label: 'Security', ph: 'E.g., 24hr guard, good CCTV coverage' },
  { key: 'value', label: 'Value for Money', ph: 'E.g., overpriced for condition, fair rent' },
];

const waitForGoogle = () => new Promise((resolve) => {
  if (window._googleMapsReady && window.google?.maps) { resolve(window.google.maps); return; }
  window.addEventListener('gmaps-ready', () => resolve(window.google.maps), { once: true });
});

const Stars = ({ rating, size = 14 }) => (
  <span>
    {[1,2,3,4,5].map(s => (
      <span key={s} style={{ fontSize: size, color: s <= Math.round(rating) ? '#ff6b35' : '#e0e0e0' }}>★</span>
    ))}
  </span>
);

const CatStars = ({ reviews }) => {
  const avg = key => {
    const v = reviews.map(r => r[`${key}_rating`]).filter(x => x > 0);
    return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0;
  };
  const active = CATS.filter(c => avg(c.key) > 0);
  if (!active.length) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {active.map(c => (
        <div key={c.key} style={{ display:'flex', alignItems:'center', marginBottom:7 }}>
          <span style={{ fontSize:12, color:'#666', width:120, flexShrink:0 }}>{c.label}</span>
          <Stars rating={avg(c.key)} size={12} />
          <span style={{ fontSize:11, color:'#ff6b35', fontWeight:700, marginLeft:6 }}>{avg(c.key).toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
};

const StarInput = ({ rating, onRate, label, ph, comment, onComment }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
        <label style={{ fontSize:13, fontWeight:600, color:'#333' }}>{label}</label>
        <div>
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => { onRate(s); setShow(true); }}
              style={{ fontSize:24, border:'none', background:'none', cursor:'pointer', padding:'2px',
                color: s <= rating ? '#ff6b35' : '#e0e0e0',
                transform: s <= rating ? 'scale(1.1)' : 'scale(1)', transition:'all 0.12s' }}>★</button>
          ))}
        </div>
      </div>
      {show && <input type="text" placeholder={ph} value={comment||''} onChange={e=>onComment(e.target.value)}
        style={{ width:'100%', padding:'8px 10px', fontSize:12, border:'1px solid #e5e5e5', borderRadius:6, background:'#fafafa', fontFamily:'inherit', boxSizing:'border-box' }} />}
    </div>
  );
};

const fmt = d => new Date(d).toLocaleDateString('en-MY', { day:'numeric', month:'short', year:'numeric' });

const overallAvg = revs => {
  const avgs = revs.map(r => {
    const v = [r.landlord_rating,r.location_rating,r.management_rating,r.security_rating,r.value_rating].filter(x=>x>0);
    return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0;
  }).filter(a=>a>0);
  return avgs.length ? avgs.reduce((a,b)=>a+b,0)/avgs.length : 0;
};

const ReviewCard = ({ r }) => {
  const cats = [r.landlord_rating,r.location_rating,r.management_rating,r.security_rating,r.value_rating].filter(x=>x>0);
  const avg = cats.length ? cats.reduce((a,b)=>a+b,0)/cats.length : 0;
  return (
    <div style={{ background:'white', borderRadius:10, padding:16, marginBottom:10, border:'1px solid #eee' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div>
          <span style={{ fontWeight:700, fontSize:13 }}>{r.user_name}</span>
          <span style={{ fontSize:11, color:'#bbb', marginLeft:8 }}>{fmt(r.created_at)}</span>
        </div>
        {avg > 0 && <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <Stars rating={avg} size={12} />
          <span style={{ fontSize:11, color:'#ff6b35', fontWeight:700 }}>{avg.toFixed(1)}</span>
        </div>}
      </div>
      <CatStars reviews={[r]} />
      {(r.landlord_name||r.agent_name) && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', margin:'8px 0' }}>
          {r.landlord_name && <span style={{ fontSize:11, background:'#fff5f0', color:'#ff6b35', padding:'3px 8px', borderRadius:20 }}>👤 {r.landlord_name}</span>}
          {r.agent_name && <span style={{ fontSize:11, background:'#f0f5ff', color:'#5b7fc4', padding:'3px 8px', borderRadius:20 }}>🏢 {r.agent_name}</span>}
        </div>
      )}
      <div style={{ marginTop:8 }}>
        {r.good_text && <div style={{ fontSize:12, color:'#444', marginBottom:5, padding:'6px 10px', background:'#f6fff6', borderRadius:6, borderLeft:'3px solid #4caf50' }}>✓ {r.good_text}</div>}
        {r.bad_text && <div style={{ fontSize:12, color:'#444', marginBottom:5, padding:'6px 10px', background:'#fff6f6', borderRadius:6, borderLeft:'3px solid #f44336' }}>✗ {r.bad_text}</div>}
        {r.general_notes && <div style={{ fontSize:12, color:'#888', marginTop:6, fontStyle:'italic' }}>{r.general_notes}</div>}
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('home');
  const [properties, setProperties] = useState([]);
  const [reviews, setReviews] = useState([]);

  // Bottom sheet: open, prop, revs, expanded (peek vs full)
  const [panel, setPanel] = useState({ open:false, prop:null, revs:[], expanded:false });

  // Reviews modal on add page
  const [revModal, setRevModal] = useState(false);
  const [addProp, setAddProp] = useState(null);

  // Home search
  const [homeSearch, setHomeSearch] = useState('');
  const [homeResults, setHomeResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Add form
  const [goodText, setGoodText] = useState('');
  const [badText, setBadText] = useState('');
  const [notes, setNotes] = useState('');
  const [uName, setUName] = useState('');
  const [agentN, setAgentN] = useState('');
  const [landlordN, setLandlordN] = useState('');
  const [ratings, setRatings] = useState({ landlord:0, location:0, management:0, security:0, value:0 });
  const [comments, setComments] = useState({ landlord:'', location:'', management:'', security:'', value:'' });
  const [aboutOpen, setAboutOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sharedPropIdRef = useRef(null);

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const tempMarkerRef = useRef(null); // for searched-but-not-yet-saved properties
  const iwRef = useRef(null);
  const locMarkerRef = useRef(null);
  const PlaceRef = useRef(null);
  const debRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = panel.open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [panel.open]);

  const openPanelRef = useRef(null);
  openPanelRef.current = (prop, expanded = false) => {
    const revs = reviews.filter(r => r.property_id === prop.id);
    setPanel({ open:true, prop, revs, expanded });
    if (iwRef.current) iwRef.current.close();
    // Clear temp marker if opening a saved property
    if (prop.id && tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
    }
  };

  // Check for shared property link on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const propId = params.get('p');
    if (propId) sharedPropIdRef.current = parseInt(propId);
  }, []);

  useEffect(() => {
    if (sharedPropIdRef.current && properties.length > 0) {
      const prop = properties.find(p => p.id === sharedPropIdRef.current);
      if (prop) { openPanelRef.current(prop, false); sharedPropIdRef.current = null; }
    }
  }, [properties]);

  // Trigger map resize when returning to home — fixes blank map bug
  useEffect(() => {
    if (view === 'home' && mapRef.current && window.google?.maps) {
      setTimeout(() => {
        window.google.maps.event.trigger(mapRef.current, 'resize');
      }, 50);
    }
  }, [view]);

  useEffect(() => { fetchData(); initMap(); }, []);
  useEffect(() => { if (mapRef.current) updateMarkers(); }, [properties, reviews]);

  const fetchData = async () => {
    const [{ data:props },{ data:revs }] = await Promise.all([
      supabase.from('properties').select('*'),
      supabase.from('reviews').select('*').order('created_at', { ascending:false })
    ]);
    setProperties(props||[]);
    setReviews(revs||[]);
  };

  const getPlace = async () => {
    if (PlaceRef.current) return PlaceRef.current;
    const maps = await waitForGoogle();
    const { Place } = await maps.importLibrary("places");
    PlaceRef.current = Place;
    return Place;
  };

  const initMap = async () => {
    const maps = await waitForGoogle();
    const el = document.getElementById('gmap');
    if (!el || mapRef.current) return;
    mapRef.current = new maps.Map(el, {
      center:{ lat:3.139, lng:101.6869 }, zoom:12, mapTypeId:'roadmap',
      mapTypeControl:false, streetViewControl:false, fullscreenControl:false,
      styles:[{ featureType:'poi', elementType:'labels', stylers:[{ visibility:'off' }] }]
    });
    iwRef.current = new maps.InfoWindow();
    getPlace();
  };

  const showTempMarker = (lat, lng, name) => {
    if (!mapRef.current || !window.google) return;
    const maps = window.google.maps;
    if (tempMarkerRef.current) tempMarkerRef.current.setMap(null);
    // Drop pin style for new/unsaved properties
    const icon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
          <path d="M15 0 C6.72 0 0 6.72 0 15 C0 25.25 15 40 15 40 C15 40 30 25.25 30 15 C30 6.72 23.28 0 15 0Z" fill="#ff6b35" stroke="white" stroke-width="2.5"/>
          <circle cx="15" cy="15" r="6" fill="white"/>
        </svg>
      `)}`,
      scaledSize: new maps.Size(30, 40),
      anchor: new maps.Point(15, 40),
    };
    tempMarkerRef.current = new maps.Marker({
      position:{ lat, lng }, map:mapRef.current, icon, title:name, zIndex:500
    });
  };

  const updateMarkers = async () => {
    if (!mapRef.current || !window.google) return;
    const maps = window.google.maps;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const byProp = {};
    reviews.forEach(r => { if (!byProp[r.property_id]) byProp[r.property_id]=[]; byProp[r.property_id].push(r); });

    Object.entries(byProp).forEach(([pid, revs]) => {
      const prop = properties.find(p => p.id === parseInt(pid));
      if (!prop?.lat || !prop?.lng) return;
      const avg = overallAvg(revs);
      const color = avg>=4 ? '#4caf50' : avg>=3 ? '#ff9800' : avg>0 ? '#f44336' : '#999';
      const label = avg > 0 ? avg.toFixed(1) : '?';
      const icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42"><circle cx="21" cy="21" r="18" fill="${color}" stroke="white" stroke-width="3"/><text x="21" y="26" text-anchor="middle" fill="white" font-size="13" font-family="Arial" font-weight="bold">${label}</text></svg>`)}`,
        scaledSize: new maps.Size(42, 42), anchor: new maps.Point(21, 21)
      };
      const marker = new maps.Marker({ position:{ lat:prop.lat, lng:prop.lng }, map:mapRef.current, icon, title:prop.name });
      marker.addListener('click', () => {
        const shortName = prop.name.length > 28 ? prop.name.substring(0, 28) + '…' : prop.name;
        iwRef.current.setContent(`<div style="font-family:-apple-system,sans-serif;padding:2px 0;width:200px"><div style="font-weight:700;font-size:13px;margin-bottom:4px;line-height:1.3">${shortName}</div><div style="color:#ff6b35;font-size:12px;margin-bottom:8px">★ ${avg.toFixed(1)} · ${revs.length} review${revs.length>1?'s':''}</div><button id="iw-${prop.id}" style="width:100%;padding:7px;background:#ff6b35;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">View reviews</button></div>`);
        iwRef.current.open(mapRef.current, marker);
        setTimeout(() => {
          const btn = document.getElementById(`iw-${prop.id}`);
          if (btn) btn.onclick = () => openPanelRef.current(prop, false);
        }, 100);
      });
      markersRef.current.push(marker);
    });
  };

  const searchPlaces = async (q) => {
    if (!q || q.length < 2) { setHomeResults([]); return; }
    setSearching(true);
    try {
      const Place = await getPlace();
      const { places } = await Place.searchByText({ textQuery: q + ' Malaysia', fields:['displayName','location','formattedAddress'], maxResultCount:5 });
      setHomeResults(places||[]);
    } catch { setHomeResults([]); }
    setSearching(false);
  };

  const handleSearch = e => {
    const v = e.target.value;
    setHomeSearch(v);
    clearTimeout(debRef.current);
    if (!v) { setHomeResults([]); return; }
    debRef.current = setTimeout(() => searchPlaces(v), 400);
  };

  const handlePlaceSelect = (place) => {
    const lat = place.location.lat(), lng = place.location.lng();
    const name = place.displayName || '', address = place.formattedAddress || 'Malaysia';
    setHomeSearch(''); setHomeResults([]);
    if (mapRef.current) { mapRef.current.setCenter(place.location); mapRef.current.setZoom(15); }

    const existing = properties.find(p => {
      const pn = p.name.toLowerCase(), sn = name.toLowerCase();
      return pn === sn || pn.includes(sn) || sn.includes(pn);
    });
    if (existing) {
      openPanelRef.current(existing, false);
    } else {
      // Show temp pin on map for new property
      showTempMarker(lat, lng, name);
      setPanel({ open:true, prop:{ id:null, name, address, lat, lng }, revs:[], expanded:false });
    }
  };

  const geoLocate = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      if (!mapRef.current || !window.google) return;
      const maps = window.google.maps;
      const loc = { lat:pos.coords.latitude, lng:pos.coords.longitude };
      mapRef.current.setCenter(loc); mapRef.current.setZoom(16);
      if (locMarkerRef.current) locMarkerRef.current.setMap(null);
      locMarkerRef.current = new maps.Marker({
        position:loc, map:mapRef.current, zIndex:999,
        icon:{ url:`data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="#4285F4" stroke="white" stroke-width="2.5"/><circle cx="11" cy="11" r="3.5" fill="white"/></svg>')}`, scaledSize:new maps.Size(22,22), anchor:new maps.Point(11,11) }
      });
    }, () => alert('Could not get location'), { enableHighAccuracy:true, timeout:10000 });
  };

  const shareProperty = (prop) => {
    if (!prop?.id) return;
    const url = `${window.location.origin}${window.location.pathname}?p=${prop.id}`;
    const doCopy = (text) => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
      } else {
        const el = document.createElement('textarea');
        el.value = text; document.body.appendChild(el); el.select();
        document.execCommand('copy'); document.body.removeChild(el);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
      }
    };
    doCopy(url);
  };

  const closePanel = () => {
    setPanel(p => ({ ...p, open:false }));
    if (tempMarkerRef.current) { tempMarkerRef.current.setMap(null); tempMarkerRef.current = null; }
  };

  const startAddReview = (prop) => {
    setAddProp(prop);
    setPanel({ open:false, prop:null, revs:[], expanded:false });
    if (tempMarkerRef.current) { tempMarkerRef.current.setMap(null); tempMarkerRef.current = null; }
    setView('add');
  };

  const resetForm = () => {
    setGoodText(''); setBadText(''); setNotes(''); setUName(''); setAgentN(''); setLandlordN('');
    setRatings({ landlord:0, location:0, management:0, security:0, value:0 });
    setComments({ landlord:'', location:'', management:'', security:'', value:'' });
    setAddProp(null);
  };

  const submitReview = async () => {
    if (!addProp) { alert('Select a property'); return; }
    if (!goodText.trim() || !badText.trim()) { alert('Please fill in what was good and what wasn\'t'); return; }
    setSubmitting(true);
    try {
      let propId = addProp.id, finalProp = addProp;
      if (!propId) {
        const { data:ex } = await supabase.from('properties').select('*').ilike('name', addProp.name).limit(1);
        if (ex && ex.length > 0) { propId = ex[0].id; finalProp = ex[0]; }
        else {
          const { data:np, error } = await supabase.from('properties').insert([{ name:addProp.name, address:addProp.address, lat:addProp.lat, lng:addProp.lng }]).select().single();
          if (error) throw error;
          propId = np.id; finalProp = np;
          setProperties(prev => [...prev, np]);
        }
      }
      await supabase.from('reviews').insert([{
        property_id:propId, good_text:goodText, bad_text:badText,
        landlord_name:landlordN||null, agent_name:agentN||null,
        landlord_rating:ratings.landlord, landlord_comment:comments.landlord,
        location_rating:ratings.location, location_comment:comments.location,
        management_rating:ratings.management, management_comment:comments.management,
        security_rating:ratings.security, security_comment:comments.security,
        value_rating:ratings.value, value_comment:comments.value,
        general_notes:notes, user_name:uName||'Anonymous',
      }]);
      resetForm(); setRevModal(false);
      await fetchData();
      setView('home');
      setTimeout(() => openPanelRef.current(finalProp, true), 400);
    } catch (err) { alert('Error: ' + err.message); }
    setSubmitting(false);
  };

  const inp = { width:'100%', padding:'11px 14px', fontSize:14, border:'1.5px solid #e5e5e5', borderRadius:8, background:'#fafafa', fontFamily:'inherit', boxSizing:'border-box', outline:'none' };
  const card = { background:'white', borderRadius:12, padding:20, marginBottom:12 };
  const secLbl = { fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 };

  const panelRevs = panel.revs || [];
  const panelAvg = overallAvg(panelRevs);

  return (
    <div style={{ maxWidth:500, margin:'0 auto', minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background:'#f5f5f5' }}>

      {/* ===== HOME — always mounted so map stays in DOM ===== */}
      <div style={{ display: view === 'home' ? 'flex' : 'none', flexDirection:'column', minHeight:'100vh' }}>
          <div style={{ padding:'20px 20px 14px', background:'white', borderBottom:'1px solid #f0f0f0' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:26, height:26, background:'#ff6b35', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🏠</div>
                <span style={{ fontWeight:700, fontSize:13 }}>Tenant Reviews MY</span>
              </div>
              <button onClick={() => setAboutOpen(true)}
                style={{ background:'none', border:'1px solid #e0e0e0', borderRadius:20, padding:'4px 10px', cursor:'pointer', fontSize:12, color:'#888', display:'flex', alignItems:'center', gap:4 }}>
                ℹ️ <span>Why this exists</span>
              </button>
            </div>
            <h1 style={{ fontSize:26, fontWeight:900, lineHeight:1.2, marginBottom:6, letterSpacing:'-0.5px' }}>Know before you sign.</h1>
            <p style={{ fontSize:13, color:'#555', lineHeight:1.5, marginBottom:14 }}>
              Real tenant experiences in Malaysia: landlords, agents, management. The truth that listings don't show.
            </p>
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, background:'#fff5f0', color:'#ff6b35', padding:'4px 10px', borderRadius:20, fontWeight:600 }}>{reviews.length} {reviews.length===1?'review':'reviews'}</span>
              <span style={{ fontSize:11, background:'#f5f5f5', color:'#666', padding:'4px 10px', borderRadius:20 }}>{new Set(reviews.map(r=>r.property_id)).size} {new Set(reviews.map(r=>r.property_id)).size===1?'property':'properties'}</span>
              <span style={{ fontSize:11, background:'#f5f5f5', color:'#666', padding:'4px 10px', borderRadius:20 }}>no ads · no tokens</span>
            </div>
            <div style={{ position:'relative' }}>
              <input type="text" value={homeSearch} onChange={handleSearch}
                placeholder="Search a property to read or add reviews..."
                style={{ width:'100%', padding:'11px 44px 11px 14px', fontSize:14, border:'2px solid #ff6b35', borderRadius:10, fontFamily:'inherit', boxSizing:'border-box', outline:'none', background:'white' }} />
              <span style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', fontSize:15, color:searching?'#ff6b35':'#aaa' }}>{searching?'⏳':'🔍'}</span>
              {homeResults.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #eee', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:100, marginTop:4, overflow:'hidden' }}>
                  {homeResults.map((p,i) => (
                    <div key={i} onClick={() => handlePlaceSelect(p)}
                      style={{ padding:'11px 14px', cursor:'pointer', borderBottom:'1px solid #f5f5f5' }}
                      onMouseOver={e => e.currentTarget.style.background='#fff5f0'}
                      onMouseOut={e => e.currentTarget.style.background='white'}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{p.displayName}</div>
                      <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{p.formattedAddress}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ position:'relative' }}>
            <div id="gmap" style={{ height:280, width:'100%' }} />
            <button onClick={geoLocate} title="My location"
              style={{ position:'absolute', bottom:10, left:10, zIndex:5, background:'white', border:'none', borderRadius:7, width:36, height:36, cursor:'pointer', boxShadow:'0 2px 6px rgba(0,0,0,0.2)', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center' }}>📍</button>
          </div>

          <div style={{ display:'flex', gap:14, padding:'7px 14px', background:'white', borderBottom:'1px solid #f0f0f0', fontSize:11, color:'#999' }}>
            <span><span style={{ color:'#4caf50' }}>●</span> Good (4+)</span>
            <span><span style={{ color:'#ff9800' }}>●</span> Average (3+)</span>
            <span><span style={{ color:'#f44336' }}>●</span> Poor</span>
            <span style={{ marginLeft:'auto' }}>Tap pin to view</span>
          </div>

          <div style={{ flex:1, padding:'14px 14px 40px' }}>
            <div style={{ ...secLbl, marginBottom:10 }}>Recent reviews</div>
            {reviews.slice(0,8).map(r => {
              const prop = properties.find(p => p.id === r.property_id);
              const avg = overallAvg([r]);
              return (
                <div key={r.id}
                  onClick={() => prop && openPanelRef.current(prop, false)}
                  style={{ background:'white', borderRadius:10, padding:'13px 14px', marginBottom:9, border:'1px solid #eee', cursor:prop?'pointer':'default' }}
                  onMouseOver={e => { if(prop) e.currentTarget.style.borderColor='#ff6b35'; }}
                  onMouseOut={e => e.currentTarget.style.borderColor='#eee'}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                    <div style={{ fontWeight:700, fontSize:14, flex:1, marginRight:8 }}>{prop?.name||`Property ${r.property_id}`}</div>
                    {avg > 0 && <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                      <Stars rating={avg} size={12} />
                      <span style={{ fontSize:11, fontWeight:700, color:'#ff6b35' }}>{avg.toFixed(1)}</span>
                    </div>}
                  </div>
                  {r.good_text && <div style={{ fontSize:12, color:'#444', marginBottom:4, padding:'5px 9px', background:'#f6fff6', borderRadius:5, borderLeft:'3px solid #4caf50' }}>✓ {r.good_text.substring(0,70)}{r.good_text.length>70?'...':''}</div>}
                  {r.bad_text && <div style={{ fontSize:12, color:'#444', marginBottom:5, padding:'5px 9px', background:'#fff6f6', borderRadius:5, borderLeft:'3px solid #f44336' }}>✗ {r.bad_text.substring(0,70)}{r.bad_text.length>70?'...':''}</div>}
                  <div style={{ fontSize:11, color:'#bbb' }}>By {r.user_name} · {fmt(r.created_at)}</div>
                </div>
              );
            })}
            {reviews.length === 0 && (
              <div style={{ textAlign:'center', color:'#bbb', padding:'40px 20px' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🏘️</div>
                <p>No reviews yet.<br/>Search a property above to be the first.</p>
              </div>
            )}
          </div>
        </div>

      {/* ===== ADD REVIEW ===== */}
      {view === 'add' && (
        <div style={{ minHeight:'100vh', background:'#f5f5f5', paddingBottom:40 }}>
          <div style={{ padding:'16px 20px 12px', background:'white', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button onClick={() => { resetForm(); setView('home'); setRevModal(false); }}
              style={{ padding:'8px 0', background:'none', border:'none', cursor:'pointer', fontWeight:600, fontSize:14, color:'#333' }}>← Back</button>
            {addProp && (
              <button onClick={() => setRevModal(true)}
                style={{ padding:'7px 14px', background:'#fff5f0', color:'#ff6b35', border:'1px solid #ff6b35', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                View reviews
              </button>
            )}
          </div>

          <div style={{ padding:14 }}>
            <div style={card}>
              <h2 style={{ fontSize:19, fontWeight:800, marginBottom:4 }}>Share your experience</h2>
              <p style={{ fontSize:13, color:'#888', marginBottom:16 }}>Help the next person make an informed choice</p>
              {addProp && (
                <div style={{ padding:'10px 12px', background:'#fff5f0', borderRadius:8, borderLeft:'4px solid #ff6b35' }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{addProp.name}</div>
                  <div style={{ fontSize:11, color:'#999' }}>{addProp.address}</div>
                </div>
              )}
            </div>

            {addProp && (
              <>
                <div style={card}>
                  <div style={secLbl}>Your story *</div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#333', marginBottom:7 }}>✓ What was good?</label>
                    <textarea value={goodText} onChange={e=>setGoodText(e.target.value)}
                      placeholder="Landlord was fair, neighbourhood quiet, maintenance was quick..."
                      style={{ width:'100%', padding:'10px 12px', fontSize:13, border:'1.5px solid #e5e5e5', borderRadius:8, background:'#fafafa', fontFamily:'inherit', minHeight:80, resize:'vertical', boxSizing:'border-box', outline:'none' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#333', marginBottom:7 }}>✗ What wasn't good?</label>
                    <textarea value={badText} onChange={e=>setBadText(e.target.value)}
                      placeholder="Deposit took months, water pressure low, management ignored complaints..."
                      style={{ width:'100%', padding:'10px 12px', fontSize:13, border:'1.5px solid #e5e5e5', borderRadius:8, background:'#fafafa', fontFamily:'inherit', minHeight:80, resize:'vertical', boxSizing:'border-box', outline:'none' }} />
                  </div>
                </div>

                <div style={card}>
                  <div style={secLbl}>Rate each category <span style={{ color:'#bbb', fontWeight:400, textTransform:'none' }}>(optional)</span></div>
                  {CATS.map(c => (
                    <StarInput key={c.key} label={c.label} ph={c.ph}
                      rating={ratings[c.key]} onRate={v=>setRatings(p=>({...p,[c.key]:v}))}
                      comment={comments[c.key]} onComment={v=>setComments(p=>({...p,[c.key]:v}))} />
                  ))}
                </div>

                <div style={card}>
                  <div style={secLbl}>People involved <span style={{ color:'#bbb', fontWeight:400, textTransform:'none' }}>(optional)</span></div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#333', marginBottom:6 }}>Landlord name</label>
                    <input type="text" value={landlordN} onChange={e=>setLandlordN(e.target.value)} placeholder="E.g., Mr Lim, Aminah binti Ali..." style={inp} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#333', marginBottom:6 }}>Agent / Company</label>
                    <input type="text" value={agentN} onChange={e=>setAgentN(e.target.value)} placeholder="E.g., IQI Realty, PropNex, John from CBRE..." style={inp} />
                  </div>
                </div>

                <div style={card}>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#333', marginBottom:7 }}>Anything else? <span style={{ color:'#bbb', fontWeight:400 }}>(optional)</span></label>
                    <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                      placeholder="Condo facilities, parking, bullying by management, surroundings..."
                      style={{ width:'100%', padding:'10px 12px', fontSize:13, border:'1.5px solid #e5e5e5', borderRadius:8, background:'#fafafa', fontFamily:'inherit', minHeight:60, resize:'vertical', boxSizing:'border-box', outline:'none' }} />
                  </div>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#333', marginBottom:7 }}>Your name <span style={{ color:'#bbb', fontWeight:400 }}>(optional)</span></label>
                  <input type="text" value={uName} onChange={e=>setUName(e.target.value)} placeholder="Stay anonymous if you prefer" style={inp} />
                </div>

                <button onClick={submitReview} disabled={submitting}
                  style={{ width:'100%', padding:14, background:submitting?'#ddd':'#ff6b35', color:'white', border:'none', borderRadius:10, fontWeight:700, cursor:submitting?'not-allowed':'pointer', fontSize:15 }}>
                  {submitting ? 'Posting...' : 'Post Review'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== BOTTOM SHEET ===== */}
      {panel.open && (
        <div style={{ position:'fixed', inset:0, zIndex:200 }}>
          {/* Backdrop: click to close */}
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.3)' }} onClick={closePanel} />

          {/* Sheet PEEK mode */}
          {/* EXPANDED mode: ~82vh, full detail */}
          <div style={{
            position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
            width:'100%', maxWidth:500, background:'white',
            borderRadius:'18px 18px 0 0',
            boxShadow:'0 -4px 30px rgba(0,0,0,0.15)',
            maxHeight: panel.expanded ? '82vh' : '48vh',
            display:'flex', flexDirection:'column', overflow:'hidden',
            transition:'max-height 0.3s ease'
          }}>
            {/* Handle */}
            <div style={{ padding:'10px 0 0', display:'flex', justifyContent:'center', cursor:'pointer', flexShrink:0 }} onClick={closePanel}>
              <div style={{ width:36, height:4, background:'#e0e0e0', borderRadius:2 }} />
            </div>

            {/* Property header */}
            <div style={{ padding:'10px 18px 12px', borderBottom:'1px solid #f0f0f0', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:2 }}>
                <div style={{ fontWeight:800, fontSize:17, flex:1, marginRight:8 }}>{panel.prop?.name}</div>
                {panel.prop?.id && (
                  <button onClick={() => shareProperty(panel.prop)}
                    style={{ flexShrink:0, padding:'4px 10px', background: copied ? '#4caf50' : '#f5f5f5', color: copied ? 'white' : '#666', border:'none', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}>
                    {copied ? '✓ Copied' : '🔗 Share'}
                  </button>
                )}
              </div>
              <div style={{ fontSize:11, color:'#aaa', marginBottom:8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{panel.prop?.address}</div>
              {panelRevs.length > 0 ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Stars rating={panelAvg} size={15} />
                  <span style={{ fontWeight:800, fontSize:16, color:'#ff6b35' }}>{panelAvg.toFixed(1)}</span>
                  <span style={{ fontSize:12, color:'#aaa' }}>{panelRevs.length} review{panelRevs.length>1?'s':''}</span>
                </div>
              ) : (
                <span style={{ fontSize:13, color:'#bbb' }}>No reviews yet. Be the first.</span>
              )}
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY:'auto', flex:1, padding:'12px 16px' }}>
              {!panel.expanded ? (
                /* PEEK: summary + buttons */
                <>
                  {panelRevs.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      {panelRevs.filter(r=>r.good_text).slice(0,2).map((r,i) => (
                        <div key={i} style={{ fontSize:12, color:'#444', marginBottom:5, padding:'6px 10px', background:'#f6fff6', borderRadius:6, borderLeft:'3px solid #4caf50' }}>✓ {r.good_text.substring(0,90)}{r.good_text.length>90?'...':''}</div>
                      ))}
                      {panelRevs.filter(r=>r.bad_text).slice(0,2).map((r,i) => (
                        <div key={i} style={{ fontSize:12, color:'#444', marginBottom:5, padding:'6px 10px', background:'#fff6f6', borderRadius:6, borderLeft:'3px solid #f44336' }}>✗ {r.bad_text.substring(0,90)}{r.bad_text.length>90?'...':''}</div>
                      ))}
                      <div style={{ fontSize:11, color:'#bbb', textAlign:'center', marginTop:8 }}>
                        Tap "See all reviews" for full details and ratings
                      </div>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:10 }}>
                    {panelRevs.length > 0 && (
                      <button onClick={() => setPanel(p=>({...p,expanded:true}))}
                        style={{ flex:1, padding:'11px', background:'#f5f5f5', color:'#333', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:13 }}>
                        See all {panelRevs.length} review{panelRevs.length>1?'s':''}
                      </button>
                    )}
                    <button onClick={() => startAddReview(panel.prop)}
                      style={{ flex:1, padding:'11px', background:'#ff6b35', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>
                      + Add review
                    </button>
                  </div>
                </>
              ) : (
                /* EXPANDED: full detail */
                <>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                    <button onClick={() => setPanel(p=>({...p,expanded:false}))}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#ff6b35', fontWeight:600, padding:0 }}>← Back</button>
                    <button onClick={() => startAddReview(panel.prop)}
                      style={{ padding:'8px 14px', background:'#ff6b35', color:'white', border:'none', borderRadius:20, fontWeight:600, cursor:'pointer', fontSize:12 }}>+ Add review</button>
                  </div>
                  <CatStars reviews={panelRevs} />
                  {panelRevs.length > 0 && (
                    <div style={{ marginTop:14, marginBottom:14 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#4caf50', marginBottom:8 }}>✓ What's good</div>
                      {panelRevs.filter(r=>r.good_text).slice(0,2).map((r,i) => (
                        <div key={i} style={{ fontSize:12, color:'#444', marginBottom:7, padding:'6px 10px', background:'#f6fff6', borderRadius:6, borderLeft:'3px solid #4caf50' }}>{r.good_text}</div>
                      ))}
                      <div style={{ fontSize:12, fontWeight:700, color:'#f44336', marginBottom:8, marginTop:12 }}>✗ What could be better</div>
                      {panelRevs.filter(r=>r.bad_text).slice(0,2).map((r,i) => (
                        <div key={i} style={{ fontSize:12, color:'#444', marginBottom:7, padding:'6px 10px', background:'#fff6f6', borderRadius:6, borderLeft:'3px solid #f44336' }}>{r.bad_text}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ ...secLbl, marginTop:4 }}>All reviews ({panelRevs.length})</div>
                  {panelRevs.map(r => <ReviewCard key={r.id} r={r} />)}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== REVIEWS MODAL (inside add page) ===== */}
      {revModal && addProp && (
        <div style={{ position:'fixed', inset:0, zIndex:300 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)' }} onClick={() => setRevModal(false)} />
          <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:500, background:'white', borderRadius:'18px 18px 0 0', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'10px 18px 12px', borderBottom:'1px solid #f0f0f0', flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
                <div style={{ width:36, height:4, background:'#e0e0e0', borderRadius:2 }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontWeight:800, fontSize:16 }}>{addProp.name}</div>
                <button onClick={() => setRevModal(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#aaa' }}>✕</button>
              </div>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:14 }}>
              {reviews.filter(r => r.property_id === addProp.id).length > 0
                ? reviews.filter(r => r.property_id === addProp.id).map(r => <ReviewCard key={r.id} r={r} />)
                : <div style={{ textAlign:'center', color:'#bbb', padding:'40px 20px' }}>No reviews yet for this property.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ABOUT MODAL */}
      {aboutOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:400 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)' }} onClick={() => setAboutOpen(false)} />
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'90%', maxWidth:420, background:'white', borderRadius:16, padding:28, boxShadow:'0 8px 40px rgba(0,0,0,0.2)', maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:18 }}>Why this exists</div>
              <button onClick={() => setAboutOpen(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#aaa', lineHeight:1 }}>x</button>
            </div>
            <p style={{ fontSize:14, color:'#444', lineHeight:1.7, marginBottom:14 }}>We built this because we had to.</p>
            <p style={{ fontSize:14, color:'#444', lineHeight:1.7, marginBottom:14 }}>As renters in Malaysia, we faced landlords who ghosted after taking deposits, agents who vanished after closing a deal, and management companies that ignored complaints for months. No way to know beforehand.</p>
            <p style={{ fontSize:14, color:'#444', lineHeight:1.7, marginBottom:14 }}>It all stays hidden. No one talks about it. You only find out after you have signed.</p>
            <p style={{ fontSize:14, color:'#444', lineHeight:1.7, marginBottom:20 }}>This platform exists to change that. Real stories from real tenants. Searchable by property, landlord, and agent. No company pays to be listed. No review gets removed. Nothing is filtered.</p>
            <div style={{ background:'#fff5f0', borderRadius:10, padding:14, borderLeft:'4px solid #ff6b35' }}>
              <p style={{ fontSize:13, color:'#555', lineHeight:1.6, margin:0 }}>If you have rented in Malaysia, good experience or bad, share it. Help the next person decide before they sign.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
