"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type Category = "All items" | "Tops" | "Bottoms" | "Shoes" | "Jewellery" | "Bags" | "Accessories";
type WardrobeItem = { id: string; name: string; category: Exclude<Category, "All items">; color: string; image: string; isNew?: boolean };

const initialItems: WardrobeItem[] = [
  { id: "1", name: "Everyday white tee", category: "Tops", color: "White", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700&q=85" },
  { id: "2", name: "Relaxed black tee", category: "Tops", color: "Black", image: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=700&q=85" },
  { id: "3", name: "Classic blue denim", category: "Bottoms", color: "Blue", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=700&q=85" },
  { id: "4", name: "Tailored neutral trousers", category: "Bottoms", color: "Beige", image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=700&q=85" },
  { id: "5", name: "Leather ankle boots", category: "Shoes", color: "Black", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=700&q=85" },
  { id: "6", name: "Minimal white sneakers", category: "Shoes", color: "White", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=85" },
  { id: "7", name: "Gold pendant necklace", category: "Jewellery", color: "Gold", image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=700&q=85" },
  { id: "8", name: "Everyday shoulder bag", category: "Bags", color: "Tan", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=700&q=85" }
];

const categories: Category[] = ["All items", "Tops", "Bottoms", "Shoes", "Jewellery", "Bags", "Accessories"];

export default function Home() {
  const [items, setItems] = useState<WardrobeItem[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState<Category>("All items");
  const [selected, setSelected] = useState<string>("1");
  const [view, setView] = useState<"wardrobe" | "stylist">("wardrobe");
  const [mood, setMood] = useState("Effortlessly chic");
  const [occasion, setOccasion] = useState("Everyday");
  const [notice, setNotice] = useState("Your wardrobe, thoughtfully put together.");
  const [uploadedName, setUploadedName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(
    () => activeCategory === "All items" ? items : items.filter((item) => item.category === activeCategory),
    [items, activeCategory]
  );
  const selectedItem = items.find((item) => item.id === selected) ?? items[0];

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (!images.length) {
      setNotice("Choose an image file to add to your wardrobe.");
      return;
    }
    const additions = images.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
      category: "Tops" as const,
      color: "Not set",
      image: URL.createObjectURL(file),
      isNew: true
    }));
    setItems((current) => [...additions, ...current]);
    setSelected(additions[0].id);
    setActiveCategory("All items");
    setNotice(`${additions.length} photo${additions.length === 1 ? "" : "s"} added. You can edit their categories as we build the full wardrobe tools.`);
    event.target.value = "";
  }

  function suggestOutfit() {
    setView("stylist");
    setNotice(`A ${mood.toLowerCase()} look for ${occasion.toLowerCase()} is ready to explore.`);
  }

  const looks = [
    { title: "The everyday edit", note: "Easy, polished, and comfortable", pieces: ["Everyday white tee", "Classic blue denim", "Minimal white sneakers"], mood: "Relaxed minimal" },
    { title: "Quiet confidence", note: "A refined look with clean lines", pieces: ["Everyday white tee", "Tailored neutral trousers", "Leather ankle boots"], mood: "Effortlessly chic" },
    { title: "After-hours ease", note: "A little contrast, still understated", pieces: ["Relaxed black tee", "Classic blue denim", "Leather ankle boots"], mood: "Modern classic" }
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="wordmark" href="#" aria-label="Stylewise home">stylewise<span>.</span></a>
        <p className="side-caption">YOUR PERSONAL WARDROBE</p>
        <button className={view === "wardrobe" ? "side-link active" : "side-link"} onClick={() => setView("wardrobe")}><span>▦</span> My wardrobe</button>
        <button className={view === "stylist" ? "side-link active" : "side-link"} onClick={() => setView("stylist")}><span>✳</span> AI stylist <span className="new-pill">NEW</span></button>
        <div className="sidebar-bottom">
          <div className="mini-profile"><div className="avatar">S</div><div><strong>Your space</strong><small>Personal wardrobe</small></div></div>
          <p className="private-note">A little more intention.<br />A lot more outfit possibilities.</p>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="mobile-brand">stylewise<span>.</span></div>
          <div className="breadcrumb">YOUR SPACE <span>/</span> {view === "wardrobe" ? "MY WARDROBE" : "AI STYLIST"}</div>
          <div className="top-actions"><span className="saved-label">A considered closet</span><div className="avatar small">S</div></div>
        </header>

        <div className="content">
          {view === "wardrobe" ? (
            <>
              <section className="welcome-row">
                <div><p className="eyebrow">MONDAY, YOUR WAY</p><h1>Your wardrobe,<br /><em>reimagined.</em></h1><p className="intro">A thoughtful edit of everything you own — and all the ways to wear it.</p></div>
                <div className="welcome-mark"><span>SW</span><small>STYLE IS<br />PERSONAL</small></div>
              </section>

              <section className="stats-row">
                <div><strong>{items.length.toString().padStart(2, "0")}</strong><span>PIECES IN YOUR CLOSET</span></div>
                <div><strong>{new Set(items.map((item) => item.category)).size.toString().padStart(2, "0")}</strong><span>CATEGORIES</span></div>
                <div><strong>∞</strong><span>WAYS TO REIMAGINE</span></div>
              </section>

              <section className="section-heading">
                <div><p className="eyebrow">THE COLLECTION</p><h2>My wardrobe</h2></div>
                <button className="primary-button" onClick={() => fileRef.current?.click()}><span>＋</span> Add pieces</button>
                <input ref={fileRef} className="file-input" type="file" accept="image/*" multiple capture="environment" onChange={addPhotos} />
              </section>

              <div className="category-tabs" role="tablist" aria-label="Wardrobe categories">
                {categories.map((category) => <button key={category} className={activeCategory === category ? "category-tab selected" : "category-tab"} onClick={() => setActiveCategory(category)}>{category}</button>)}
              </div>

              <div className="wardrobe-grid">
                {filteredItems.map((item) => (
                  <button key={item.id} className={selected === item.id ? "item-card chosen" : "item-card"} onClick={() => setSelected(item.id)}>
                    <div className="item-image"><img src={item.image} alt={item.name} /><span className="item-check">{selected === item.id ? "✓" : "＋"}</span></div>
                    <div className="item-meta"><strong>{item.name}</strong><span>{item.color} · {item.category}</span></div>
                  </button>
                ))}
              </div>

              {selectedItem && <section className="selected-bar"><div><span className="selected-kicker">YOUR SELECTED PIECE</span><strong>{selectedItem.name}</strong><small>{selectedItem.category} · {selectedItem.color}</small></div><button className="outline-button" onClick={() => setView("stylist")}>Style this item <span>↗</span></button></section>}
              <p className="notice" aria-live="polite">{notice}</p>
            </>
          ) : (
            <section className="stylist-page">
              <p className="eyebrow">A STYLIST THAT KNOWS YOUR CLOSET</p>
              <h1>Let’s find your<br /><em>next favourite look.</em></h1>
              <p className="intro">Start with a mood. We’ll bring your pieces together.</p>
              <div className="stylist-controls">
                <div className="control-block"><label htmlFor="mood">THE FEELING</label><select id="mood" value={mood} onChange={(e) => setMood(e.target.value)}><option>Effortlessly chic</option><option>Relaxed and casual</option><option>Modern streetwear</option><option>Quiet luxury</option><option>Playful and bold</option></select></div>
                <div className="control-block"><label htmlFor="occasion">THE OCCASION</label><select id="occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)}><option>Everyday</option><option>College</option><option>Brunch</option><option>Party</option><option>Family gathering</option><option>Evening out</option></select></div>
              </div>
              <div className="section-heading looks-heading"><div><p className="eyebrow">CURATED FOR YOU</p><h2>Outfit directions</h2></div><span className="demo-label">EARLY PREVIEW</span></div>
              <div className="looks-grid">{looks.map((look, index) => <article className="look-card" key={look.title}><div className="look-number">0{index + 1}</div><p className="look-mood">{look.mood}</p><h3>{look.title}</h3><p className="look-note">{look.note}</p><div className="look-pieces">{look.pieces.map((piece) => <span key={piece}>{piece}</span>)}</div><button onClick={() => setNotice(`Saved “${look.title}” to your inspiration list (demo).`)}>Save this direction <span>＋</span></button></article>)}</div>
              <p className="notice" aria-live="polite">{notice}</p>
              <button className="text-button" onClick={() => setView("wardrobe")}>← Back to my wardrobe</button>
            </section>
          )}
        </div>
        <footer className="footer"><span>STYLEWISE © 2026</span><span>MADE FOR YOUR WAY OF WEARING</span></footer>
      </section>

      <nav className="mobile-nav" aria-label="Main navigation">
        <button className={view === "wardrobe" ? "mobile-nav-active" : ""} onClick={() => setView("wardrobe")}><span>▦</span>Wardrobe</button>
        <button className={view === "stylist" ? "mobile-nav-active" : ""} onClick={() => setView("stylist")}><span>✳</span>AI Stylist</button>
        <button onClick={() => fileRef.current?.click()}><span>＋</span>Add pieces</button>
      </nav>
    </main>
  );
}