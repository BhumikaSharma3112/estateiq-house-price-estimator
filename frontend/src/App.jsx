import React, { useEffect, useState } from "react";
import {
  Home, Calculator, ChartNoAxesCombined, Building2, Heart, Settings, Bell,
  MapPin, BedDouble, Bath, Ruler, ChevronDown, ArrowUpRight, House,
  Sparkles, Clock3, Menu, X, LoaderCircle, IndianRupee
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const money = n => n == null ? "—" : new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(n);
const COLORS = ["#4388f5", "#5e73e8", "#54c49a", "#a78bfa", "#f6a76d"];

const trendData = [
  { month: "May", price: 68 }, { month: "Jun", price: 71 }, { month: "Jul", price: 70 },
  { month: "Aug", price: 75 }, { month: "Sep", price: 79 }, { month: "Oct", price: 83 },
  { month: "Nov", price: 81 }, { month: "Dec", price: 88 }, { month: "Jan", price: 92 },
  { month: "Feb", price: 96 }, { month: "Mar", price: 101 }, { month: "Apr", price: 108 },
];

const toNumber = value => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Number(String(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getPropertyPrice = property => {
  const raw = property?.price?.min ?? property?.price?.value ?? property?.price;
  return toNumber(raw);
};

const getPropertyArea = property => {
  const area = toNumber(property?.area?.value ?? property?.area);
  const unit = String(property?.area?.unit || "").toLowerCase();
  if (unit.includes("sq m") || unit.includes("sqm") || unit.includes("square meter")) {
    return area * 10.7639;
  }
  return area;
};

const getPricePerSqft = property => {
  const supplied = toNumber(property?.price_per_sqft);
  if (supplied > 0) return supplied;
  const price = getPropertyPrice(property);
  const area = getPropertyArea(property);
  return price > 0 && area > 0 ? price / area : 0;
};

function StatCard({ icon: Icon, label, value, foot, tone }) {
  return <article className={`stat-card ${tone}`}>
    <div className="stat-icon"><Icon size={21}/></div>
    <div className="stat-content"><span>{label}</span><strong>{value}</strong><small>{foot}</small></div>
  </article>;
}

function App() {
  const [liveListings, setLiveListings] = useState([]);
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [marketListings, setMarketListings] = useState([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState("");
  const [page, setPage] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ location: "Jaipur", property_type: "Apartment", area_sqft: "1200", bedrooms: "2", bathrooms: "2", age_years: "5" });
  const [summary, setSummary] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/health`)
      .then(r => r.json())
      .then(d => setApiOnline(d.status === "ok"))
      .catch(() => setApiOnline(false));

    fetch(`${API}/api/summary`)
      .then(r => r.json())
      .then(setSummary)
      .catch(() => {});
  }, []);

  // Listings page: fetch the selected city.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/live-listings?city=${selectedCity.toLowerCase()}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.success) setLiveListings(data.data.properties || []);
      })
      .catch(err => console.error("Live listings error:", err));
    return () => { cancelled = true; };
  }, [selectedCity]);

    // Market Insights: fetch live listings across the supported cities.
  useEffect(() => {
    const cities = ["Delhi", "Mumbai", "Jaipur", "Noida", "Gurugram", "Pune", "Bengaluru"];
    let cancelled = false;

    async function loadMarketListings() {
      setMarketLoading(true);
      setMarketError("");
      try {
        const responses = await Promise.all(cities.map(async city => {
          const response = await fetch(`${API}/api/live-listings?city=${city.toLowerCase()}`);
          if (!response.ok) throw new Error(`${city}: HTTP ${response.status}`);
          const data = await response.json();
          if (!data.success) return [];
          return (data.data?.properties || []).map(property => ({ ...property, marketCity: city }));
        }));
        if (!cancelled) setMarketListings(responses.flat());
      } catch (err) {
        if (!cancelled) {
          setMarketError("Could not load live listings for all cities. Check the backend/API and try again.");
          setMarketListings([]);
        }
      } finally {
        if (!cancelled) setMarketLoading(false);
      }
    }
    loadMarketListings();
    return () => { cancelled = true; };
  }, []);

  // Calculate insights only from actual listings with usable price and area.
  const validMarketListings = marketListings.filter(property =>
    getPropertyPrice(property) > 0 &&
    getPropertyArea(property) > 0 &&
    getPricePerSqft(property) > 0
  );

  const locations = Object.values(validMarketListings.reduce((groups, property) => {
    const city = property.marketCity || property.city || "Unknown";
    if (!groups[city]) groups[city] = { location: city, totalPrice: 0, totalPricePerSqft: 0, listings: 0 };
    groups[city].totalPrice += getPropertyPrice(property);
    groups[city].totalPricePerSqft += getPricePerSqft(property);
    groups[city].listings += 1;
    return groups;
  }, {})).map(city => ({
    location: city.location,
    average_price: city.totalPrice / city.listings,
    price_per_sqft: city.totalPricePerSqft / city.listings,
    listings: city.listings
  })).sort((a, b) => b.price_per_sqft - a.price_per_sqft);

    const ranges = [
    { range: "< ₹50L", min: 0, max: 5000000 },
    { range: "₹50L–1Cr", min: 5000000, max: 10000000 },
    { range: "₹1–1.5Cr", min: 10000000, max: 15000000 },
    { range: "₹1.5–2Cr", min: 15000000, max: 20000000 },
    { range: "> ₹2Cr", min: 20000000, max: Infinity }
  ];
  const distribution = ranges.map(range => ({
    range: range.range,
    count: validMarketListings.filter(property => {
      const price = getPropertyPrice(property);
      return price >= range.min && price < range.max;
    }).length
  }));
  const totalForPie = distribution.reduce((sum, item) => sum + item.count, 0);
  const pieData = distribution.map(item => ({
    ...item,
    value: totalForPie ? Math.round(item.count / totalForPie * 100) : 0
  }));

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
        body: JSON.stringify({
          ...form, area_sqft: Number(form.area_sqft), bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms), age_years: Number(form.age_years)
        })
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
      page === "Listings" ? <section className="panel">
        <div className="section-heading"><div><h2>Property listings</h2><p>Live property listings from 99acres</p></div>
          <div className="search-box"><MapPin size={17}/><select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>{["Delhi","Mumbai","Jaipur","Noida","Gurugram","Pune","Bengaluru"].map(city => <option key={city} value={city}>{city}</option>)}</select></div>
        </div>
        <div className="listing-grid">
          {liveListings.length === 0 ? <div className="empty-history"><Building2 size={22}/><span>No listings loaded. Try another city or check the API.</span></div> :
          liveListings.map((l, i) => <article className="listing-card" key={l.id || l.url || i}>
            <div className={`listing-image house-image-${i % 3}`}>{l.image ? <img src={l.image} alt={l.heading || "Property listing"}/> : <House size={52}/>}</div>
            <div className="listing-info"><h3>{l.heading || "Property listing"}</h3><p><MapPin size={14}/>{l.locality || "Locality not listed"}, {l.city || selectedCity}</p>
              <strong>{l.price?.label || money(getPropertyPrice(l))}</strong>
              <div className="listing-meta"><span><Ruler size={14}/>{l.price_per_sqft ? `${Number(l.price_per_sqft).toLocaleString("en-IN")} / sq ft` : "Area details unavailable"}</span><span>{l.bedrooms ? `${l.bedrooms} BHK` : "Bedrooms not listed"}</span></div>
              {l.url && <a className="outline-button" href={l.url} target="_blank" rel="noopener noreferrer">View Property <ArrowUpRight size={15}/></a>}
            </div>
          </article>)}
        </div>
      </section> :
      page === "Market Insights" ? <section>
        {marketLoading && <div className="empty-history"><LoaderCircle className="spin" size={20}/><span>Loading live property data from seven cities…</span></div>}
        {marketError && <div className="error-message">{marketError}</div>}
        {!marketLoading && !marketError && <p className="chart-chip" style={{display:"inline-block",marginBottom:12}}>Calculated from {validMarketListings.length} live listings with price and area</p>}
        <div className="analytics-page">
          <div className="panel chart-panel"><div className="section-heading"><div><h2>Location comparison</h2><p>Average listing price per square foot · live data</p></div></div>
            {locations.length ? <div className="chart-area tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={locations} layout="vertical" margin={{left:15,right:25}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9eef6"/><XAxis type="number" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:11,fill:"#8190a8"}} axisLine={false} tickLine={false}/><YAxis dataKey="location" type="category" width={95} tick={{fontSize:12,fill:"#596982"}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>money(v)+" / sq ft"}/><Bar dataKey="price_per_sqft" fill="#4f86f7" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div> : <div className="empty-history">No usable price/area data returned for these cities.</div>}
          <p className="section-heading" style={{marginTop:12}}><span className="chart-chip">City listing counts: {locations.map(city=>`${city.location} (${city.listings})`).join(" · ") || "—"}</span></p>
          </div>
          <div className="panel chart-panel"><div className="section-heading"><div><h2>Price distribution</h2><p>Live listings grouped by asking price</p></div></div>
            {totalForPie ? <div className="distribution-layout"><div className="chart-area donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="range" innerRadius={55} outerRadius={82} paddingAngle={3}>{pieData.map((d,i)=><Cell key={d.range} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>`${v}%`}/></PieChart></ResponsiveContainer><div className="donut-center"><span>Live</span><b>Prices</b></div></div><div className="legend">{pieData.map((d,i)=><div key={d.range}><span><i style={{background:COLORS[i%COLORS.length]}}/>{d.range}</span><b>{d.value}%</b></div>)}</div></div> : <div className="empty-history">No listing prices available for distribution.</div>}
          </div>
        </div>
      </section> :
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
          </form>{error && <div className="error-message">{error}</div>}
        </div>
        <div className="result-card"><div className="result-art"><div className="sun"/><div className="cloud cloud-one"/><div className="cloud cloud-two"/><div className="tree tree-one"/><div className="tree tree-two"/><div className="modern-house"><div className="roof"/><div className="house-body"><div className="window window-one"/><div className="window window-two"/><div className="door"/></div></div></div>
          <span className="result-label">{prediction?"Your estimated price":"Your price estimate"}</span><strong className="result-price">{prediction?money(prediction.estimated_price_inr):"₹ — — —"}</strong><span className="result-sub">{prediction?`${money(prediction.price_per_sqft)} per sq ft`:"Submit property details to see an estimate"}</span>
          {prediction && <div className="demo-note"><Sparkles size={14}/>{prediction.note}</div>}
          {!prediction && <div className="result-foot"><span><MapPin size={14}/>{form.location}, India</span><span><Ruler size={14}/>{Number(form.area_sqft||0).toLocaleString("en-IN")} sq ft</span></div>}
        </div>
      </section>}

            <section className="stats-grid">
        <StatCard icon={Home} label="Average house price" value={averagePrice} foot="Backend dataset" tone="green"/>
        <StatCard icon={Building2} label="Total listings" value={listingCount} foot="Backend dataset records" tone="blue"/>
        <StatCard icon={ChartNoAxesCombined} label="Highest price" value={topPrice} foot="Backend dataset" tone="purple"/>
        <StatCard icon={IndianRupee} label="Lowest price" value={lowPrice} foot="Backend dataset" tone="orange"/>
      </section>

      <section className="charts-grid">
        <article className="panel chart-panel trend-panel"><div className="section-heading"><div><h2>Price trends</h2><p>Illustrative monthly index · not live market data</p></div><span className="chart-chip">12 months</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{top:12,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e9eef6" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10,fill:"#8190a8"}} axisLine={false} tickLine={false}/><YAxis tickFormatter={v=>`₹${v}L`} tick={{fontSize:10,fill:"#8190a8"}} axisLine={false} tickLine={false} width={43}/><Tooltip formatter={v=>`₹${v} lakh index`} contentStyle={{borderRadius:10,border:"1px solid #e3eaf4",fontSize:12}}/><Line type="monotone" dataKey="price" stroke="#3478f6" strokeWidth={2.6} dot={{r:3,fill:"#3478f6",strokeWidth:0}} activeDot={{r:5}}/></LineChart></ResponsiveContainer></div></article>
        <article className="panel chart-panel distribution-panel"><div className="section-heading"><div><h2>Price distribution</h2><p>Sample listings by price range</p></div></div><div className="distribution-layout"><div className="chart-area donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="range" innerRadius={54} outerRadius={78} paddingAngle={3}>{pieData.map((d,i)=><Cell key={d.range} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>`${v}%`}/></PieChart></ResponsiveContainer><div className="donut-center"><span>Price</span><b>mix</b></div></div><div className="legend">{pieData.map((d,i)=><div key={d.range}><span><i style={{background:COLORS[i%COLORS.length]}}/>{d.range}</span><b>{d.value}%</b></div>)}</div></div></article>
        <article className="panel chart-panel locations-panel"><div className="section-heading"><div><h2>Popular locations</h2><p>Average price per sq ft · demo data</p></div></div><div className="location-bars">{locations.slice(0,5).map((l,i)=><div className="location-row" key={l.location}><span className="location-name">{l.location}</span><div className="bar-track"><div className="bar-fill" style={{width:`${Math.max(8,l.price_per_sqft/Math.max(...locations.map(x=>x.price_per_sqft))*100)}%`,opacity:1-i*.13}}/></div><b>{money(l.price_per_sqft)}</b></div>)}</div></article>
      </section>

      <section className="insights-strip"><div className="insights-title"><span><Sparkles size={19}/></span><b>Quick insights</b></div><div className="insight"><ArrowUpRight size={19}/><p>Compare location averages before making a decision.</p></div><div className="insight"><MapPin size={18}/><p>Location is one of the inputs used by the estimator.</p></div><div className="insight"><IndianRupee size={18}/><p>Use verified local sales data for realistic estimates.</p></div></section>

      <section className="panel history-panel"><div className="section-heading"><div><h2>Recent predictions</h2><p>Your estimates from this session</p></div><span className="history-count">{history.length} estimates</span></div>{history.length===0?<div className="empty-history"><Clock3 size={20}/><span>Your predictions will appear here after you estimate a property.</span></div>:<div className="history-list">{history.map((h,i)=><div className="history-item" key={`${h.at}-${i}`}><div className="history-icon"><House size={17}/></div><div className="history-details"><b>{h.location} · {h.property_type}</b><span>{h.area_sqft} sq ft · {h.bedrooms} BHK · {h.at}</span></div><strong>{money(h.price)}</strong></div>)}</div>}</section>
      </>}
      <footer className="footer"><span>© 2026 EstateIQ · Student project</span><span>Estimates are illustrative and not financial advice.</span></footer>
    </main>
  </div>;
}

export default App;