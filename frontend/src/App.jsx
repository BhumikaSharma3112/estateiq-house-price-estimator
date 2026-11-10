import React, { useEffect, useMemo, useState } from "react";
import {
  Home, Calculator, ChartNoAxesCombined, Building2, Heart, Settings, Bell,
  MapPin, BedDouble, Bath, Ruler, ChevronDown, ArrowUpRight, ArrowDownRight,
  House, Sparkles, Search, Clock3, Menu, X, LoaderCircle, IndianRupee
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const money = (n) => n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const compactMoney = (n) => n >= 10000000 ? `₹${(n/10000000).toFixed(1)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : money(n);
const COLORS = ["#4388f5", "#5e73e8", "#54c49a", "#a78bfa", "#f6a76d"];

const fallbackLocations = [
  { location: "Gurugram", average_price: 12500000, price_per_sqft: 10500, listings: 72 },
  { location: "Bengaluru", average_price: 9800000, price_per_sqft: 9800, listings: 85 },
  { location: "Pune", average_price: 7900000, price_per_sqft: 8500, listings: 66 },
  { location: "Noida", average_price: 6900000, price_per_sqft: 7200, listings: 58 },
  { location: "Jaipur", average_price: 5300000, price_per_sqft: 5200, listings: 92 },
];
const trendData = [
  { month: "May", price: 68 }, { month: "Jun", price: 71 }, { month: "Jul", price: 70 },
  { month: "Aug", price: 75 }, { month: "Sep", price: 79 }, { month: "Oct", price: 83 },
  { month: "Nov", price: 81 }, { month: "Dec", price: 88 }, { month: "Jan", price: 92 },
  { month: "Feb", price: 96 }, { month: "Mar", price: 101 }, { month: "Apr", price: 108 },
];

function StatCard({ icon: Icon, label, value, foot, tone }) {
  return <article className={`stat-card ${tone}`}>
    <div className="stat-icon"><Icon size={21}/></div>
    <div className="stat-content"><span>{label}</span><strong>{value}</strong><small>{foot}</small></div>
  </article>;
}

function App() {
  const [liveListings, setLiveListings] = useState([]);
  const [selectedCity, setSelectedCity] = useState("Delhi");

  const [page, setPage] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ location: "Jaipur", property_type: "Apartment", area_sqft: "1200", bedrooms: "2", bathrooms: "2", age_years: "5" });
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/health`)
      .then(r => r.json())
      .then(d => setApiOnline(Boolean(d.status === "ok")))
      .catch(() => setApiOnline(false));

    fetch(`${API}/api/summary`)
      .then(r => r.json())
      .then(setSummary)
      .catch(() => {});

    fetch(`${API}/api/market-insights`)
      .then(r => r.json())
      .then(setInsights)
      .catch(() => {});

    fetch(`${API}/api/live-listings?city=${selectedCity}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setLiveListings(data.data.properties || []);
        }
      })
      .catch(err => console.error("Live listings error:", err));
  }, [selectedCity]);

  const locations = insights?.locations?.length ? insights.locations : fallbackLocations;
  const distribution = insights?.distribution?.some(d => d.count > 0) ? insights.distribution : [
    { range: "< ₹50L", count: 28 }, { range: "₹50L–1Cr", count: 34 },
    { range: "₹1–1.5Cr", count: 22 }, { range: "₹1.5–2Cr", count: 11 }, { range: "> ₹2Cr", count: 5 }
  ];
  const totalForPie = distribution.reduce((sum, d) => sum + d.count, 0);
  const pieData = distribution.map(d => ({ ...d, value: totalForPie ? Math.round(d.count / totalForPie * 100) : 0 }));
  const nav = [
    { label: "Dashboard", icon: Home }, { label: "Price Estimator", icon: Calculator },
    { label: "Market Insights", icon: ChartNoAxesCombined }, { label: "Listings", icon: Building2 },
    { label: "Favorites", icon: Heart },
  ];

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  async function predict(e) {
    e.preventDefault(); setLoading(true); setError(""); setPrediction(null);
    try {
      const response = await fetch(`${API}/api/predict`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, area_sqft: Number(form.area_sqft), bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms), age_years: Number(form.age_years) })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Could not estimate this property.");
      setPrediction(body);
      setHistory(prev => [{ ...form, price: body.estimated_price_inr, at: new Date().toLocaleString() }, ...prev].slice(0, 8));
    } catch (err) {
      setError(apiOnline ? err.message : "Backend isn't connected. Start the FastAPI server, then try again.");
    } finally { setLoading(false); }
  }

  const topPrice = summary?.highest_price ? money(summary.highest_price) : "—";
  const averagePrice = summary?.average_price ? money(summary.average_price) : "—";
  const lowPrice = summary?.lowest_price ? money(summary.lowest_price) : "—";
  const listingCount = summary?.total_listings ? summary.total_listings.toLocaleString("en-IN") : "—";
  const pageTitle = page === "Dashboard" ? "Welcome back!" : page;

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><House size={25} fill="currentColor"/></div><div><b>EstateIQ</b><span>House Price Estimator</span></div><button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(({label, icon: Icon}) => <button key={label} onClick={() => {setPage(label); setMenuOpen(false);}} className={`nav-link ${page===label?"active":""}`}><Icon size={19}/><span>{label}</span>{label==="Favorites" && <span className="nav-count">0</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-art"><House size={52}/><Building2 size={35}/><House size={42}/></div><div className="sidebar-quote">Better data.<br/>Smarter decisions.<br/>Find your dream home.</div><div className="profile"><div className="avatar">BS</div><div><b>Property Explorer</b><span>Free workspace</span></div><Settings size={17}/></div></div>
    </aside>
    {menuOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <main className="main">
      <header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu/></button><div className="welcome"><h1>{pageTitle}</h1><p>Explore property prices, get estimates and discover market trends.</p></div><div className="top-actions"><span className={`api-status ${apiOnline?"online":"offline"}`}><i/>{apiOnline?"API connected":"API offline"}</span><button className="icon-button" aria-label="Notifications"><Bell size={20}/><i/></button><div className="avatar">BS</div></div></header>

      {page === "Favorites" ? <section className="panel empty-panel"><Heart size={35}/><h2>Your favorites</h2><p>Favorite listings can be added here in a future version.</p></section> :
      page === "Listings" ? <section className="panel"><div className="section-heading"><div><h2>Property listings</h2><p>Sample market locations from the demo dataset</p></div><div className="search-box"><Search size={17}/><input placeholder="Search locations" onChange={e => setForm(f=>({...f, location:e.target.value || "Jaipur"}))}/></div></div><div className="listing-grid">{locations.map((l,i)=><article className="listing-card" key={l.location}><div className={`listing-image house-image-${i%3}`}><House size={52}/><span>Demo data</span></div><div className="listing-info"><h3>{l.location}</h3><p><MapPin size={14}/>{l.location}, India</p><strong>{money(l.average_price)}</strong><div className="listing-meta"><span><Ruler size={14}/>{l.price_per_sqft.toLocaleString("en-IN")} / sq ft</span><span>{l.listings} listings</span></div><button className="outline-button" onClick={()=>{setForm(f=>({...f,location:l.location}));setPage("Price Estimator");}}>Estimate in this area <ArrowUpRight size={15}/></button></div></article>)}</div></section> :
      page === "Market Insights" ? <section className="analytics-page"><div className="panel chart-panel"><div className="section-heading"><div><h2>Location comparison</h2><p>Average price per square foot · demo data</p></div></div><div className="chart-area tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={locations} layout="vertical" margin={{left:15,right:25}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9eef6"/><XAxis type="number" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:11,fill:"#8190a8"}} axisLine={false} tickLine={false}/><YAxis dataKey="location" type="category" width={95} tick={{fontSize:12,fill:"#596982"}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>money(v)+" / sq ft"}/><Bar dataKey="price_per_sqft" fill="#4f86f7" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div></div><div className="panel chart-panel"><div className="section-heading"><div><h2>Price distribution</h2><p>Listings grouped by price range</p></div></div><div className="distribution-layout"><div className="chart-area donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="range" innerRadius={55} outerRadius={82} paddingAngle={3}>{pieData.map((d,i)=><Cell key={d.range} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>`${v}%`}/></PieChart></ResponsiveContainer><div className="donut-center"><span>Price</span><b>Ranges</b></div></div><div className="legend">{pieData.map((d,i)=><div key={d.range}><span><i style={{background:COLORS[i%COLORS.length]}}/>{d.range}</span><b>{d.value}%</b></div>)}</div></div></div></section> :
      <>{page === "Dashboard" && <section className="estimator-panel">
        <div className="estimator-left"><div className="panel-title"><div className="title-icon"><House size={23}/></div><div><h2>House price estimator</h2><p>Enter property details to estimate its market value.</p></div></div>
          <form className="estimator-form" onSubmit={predict}>
            <label>Location <span className="field-icon"><MapPin size={15}/><select value={form.location} onChange={e=>update("location",e.target.value)}>{["Jaipur","Gurugram","Noida","Pune","Bengaluru","Indore"].map(v=><option key={v}>{v}</option>)}</select><ChevronDown size={15}/></span></label>
            <label>Property type <span className="field-icon"><House size={15}/><select value={form.property_type} onChange={e=>update("property_type",e.target.value)}>{["Apartment","Independent House","Villa"].map(v=><option key={v}>{v}</option>)}</select><ChevronDown size={15}/></span></label>
            <label>Bedrooms <span className="field-icon"><BedDouble size={15}/><select value={form.bedrooms} onChange={e=>update("bedrooms",e.target.value)}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v} BHK</option>)}</select><ChevronDown size={15}/></span></label>
            <label>Bathrooms <span className="field-icon"><Bath size={15}/><select value={form.bathrooms} onChange={e=>update("bathrooms",e.target.value)}>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}</select><ChevronDown size={15}/></span></label>
            <label>Area (sq ft) <span className="field-icon"><Ruler size={15}/><input type="number" min="101" max="100000" required value={form.area_sqft} onChange={e=>update("area_sqft",e.target.value)} placeholder="e.g. 1200"/></span></label>
            <label>Property age <span className="field-icon"><Clock3 size={15}/><select value={form.age_years} onChange={e=>update("age_years",e.target.value)}>{[0,1,5,10,15,20,30,40].map(v=><option key={v} value={v}>{v===0?"New construction":`${v} years`}</option>)}</select><ChevronDown size={15}/></span></label>
            <button className="primary-button estimate-button" type="submit" disabled={loading}>{loading?<LoaderCircle className="spin" size={18}/>:<Calculator size={18}/>} {loading?"Calculating...":"Get estimated price"}</button>
          </form>
          {error && <div className="error-message">{error}</div>}
        </div>
        <div className="result-card"><div className="result-art"><div className="sun"/><div className="cloud cloud-one"/><div className="cloud cloud-two"/><div className="tree tree-one"/><div className="tree tree-two"/><div className="modern-house"><div className="roof"/><div className="house-body"><div className="window window-one"/><div className="window window-two"/><div className="door"/></div></div></div>
          <span className="result-label">{prediction?"Your estimated price":"Your price estimate"}</span><strong className="result-price">{prediction?money(prediction.estimated_price_inr):"₹ — — —"}</strong><span className="result-sub">{prediction?`${money(prediction.price_per_sqft)} per sq ft`:"Submit property details to see an estimate"}</span>
          {prediction && <div className="demo-note"><Sparkles size={14}/>{prediction.note}</div>}
          {!prediction && <div className="result-foot"><span><MapPin size={14}/>{form.location}, India</span><span><Ruler size={14}/>{Number(form.area_sqft||0).toLocaleString("en-IN")} sq ft</span></div>}
        </div>
      </section>}

      <section className="stats-grid">
        <StatCard icon={Home} label="Average house price" value={averagePrice} foot="Across demo dataset" tone="green"/>
        <StatCard icon={Building2} label="Total listings" value={listingCount} foot="Records in sample dataset" tone="blue"/>
        <StatCard icon={ChartNoAxesCombined} label="Highest price" value={topPrice} foot="In sample dataset" tone="purple"/>
        <StatCard icon={IndianRupee} label="Lowest price" value={lowPrice} foot="In sample dataset" tone="orange"/>
      </section>

      <section className="charts-grid">
        <article className="panel chart-panel trend-panel"><div className="section-heading"><div><h2>Price trends</h2><p>Illustrative monthly index · not live market data</p></div><span className="chart-chip">12 months</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{top:12,right:8,left:0,bottom:0}}><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4388f5" stopOpacity={0.2}/><stop offset="100%" stopColor="#4388f5" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e9eef6" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10,fill:"#8190a8"}} axisLine={false} tickLine={false}/><YAxis tickFormatter={v=>`₹${v}L`} tick={{fontSize:10,fill:"#8190a8"}} axisLine={false} tickLine={false} width={43}/><Tooltip formatter={v=>`₹${v} lakh index`} contentStyle={{borderRadius:10,border:"1px solid #e3eaf4",fontSize:12}}/><Line type="monotone" dataKey="price" stroke="#3478f6" strokeWidth={2.6} dot={{r:3,fill:"#3478f6",strokeWidth:0}} activeDot={{r:5}}/></LineChart></ResponsiveContainer></div></article>
        <article className="panel chart-panel distribution-panel"><div className="section-heading"><div><h2>Price distribution</h2><p>Sample listings by price range</p></div></div><div className="distribution-layout"><div className="chart-area donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="range" innerRadius={54} outerRadius={78} paddingAngle={3}>{pieData.map((d,i)=><Cell key={d.range} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>`${v}%`}/></PieChart></ResponsiveContainer><div className="donut-center"><span>Price</span><b>mix</b></div></div><div className="legend">{pieData.map((d,i)=><div key={d.range}><span><i style={{background:COLORS[i%COLORS.length]}}/>{d.range}</span><b>{d.value}%</b></div>)}</div></div></article>
        <article className="panel chart-panel locations-panel"><div className="section-heading"><div><h2>Popular locations</h2><p>Average price per sq ft</p></div></div><div className="location-bars">{locations.slice(0,5).map((l,i)=><div className="location-row" key={l.location}><span className="location-name">{l.location}</span><div className="bar-track"><div className="bar-fill" style={{width:`${Math.max(8,l.price_per_sqft/Math.max(...locations.map(x=>x.price_per_sqft))*100)}%`,opacity:1-i*.13}}/></div><b>{money(l.price_per_sqft)}</b></div>)}</div></article>
      </section>

      <section className="insights-strip"><div className="insights-title"><span><Sparkles size={19}/></span><b>Quick insights</b></div><div className="insight"><ArrowUpRight size={19}/><p>Compare location averages before making a decision.</p></div><div className="insight"><MapPin size={18}/><p>Location is one of the inputs used by the estimator.</p></div><div className="insight"><IndianRupee size={18}/><p>Use verified local sales data for realistic estimates.</p></div></section>

      <section className="panel history-panel"><div className="section-heading"><div><h2>Recent predictions</h2><p>Your estimates from this session</p></div><span className="history-count">{history.length} estimates</span></div>{history.length===0?<div className="empty-history"><Clock3 size={20}/><span>Your predictions will appear here after you estimate a property.</span></div>:<div className="history-list">{history.map((h,i)=><div className="history-item" key={`${h.at}-${i}`}><div className="history-icon"><House size={17}/></div><div className="history-details"><b>{h.location} · {h.property_type}</b><span>{h.area_sqft} sq ft · {h.bedrooms} BHK · {h.at}</span></div><strong>{money(h.price)}</strong></div>)}</div>}</section>
      </>}
      <footer className="footer"><span>© 2026 EstateIQ · Student project</span><span>Estimates are illustrative and not financial advice.</span></footer>
    </main>
  </div>;
}

export default App;
