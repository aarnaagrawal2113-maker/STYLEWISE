"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";

type Category = "Unsorted" | "Tops" | "Bottoms" | "Shoes" | "Jewellery" | "Bags" | "Accessories";
type WardrobeItem = {
  id: string;
  user_id: string;
  name: string;
  category: Category;
  color: string;
  image_path: string;
  image: string;
};
type Outfit = { id: string; title: string; items: WardrobeItem[] };
type SavedOutfitRow = { id: string; title: string; item_ids: string[]; created_at: string };

const categories: Array<"All items" | Category> = [
  "All items", "Unsorted", "Tops", "Bottoms", "Shoes", "Jewellery", "Bags", "Accessories"
];
const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export default function Home() {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfitRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<"All items" | Category>("All items");
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState<"wardrobe" | "stylist" | "saved">("wardrobe");
  const [mood, setMood] = useState("Effortlessly chic");
  const [occasion, setOccasion] = useState("Everyday");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadWardrobe = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("wardrobe_items")
      .select("id,user_id,name,category,color,image_path")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setNotice("Your wardrobe could not be loaded: " + error.message);
      return;
    }

    const rows = await Promise.all((data ?? []).map(async (row) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from("stylewise-wardrobe")
        .createSignedUrl(row.image_path, 3600);
      return {
        ...row,
        image: signedError ? "" : (signed?.signedUrl ?? "")
      } as WardrobeItem;
    }));
    setItems(rows);

    const { data: saved, error: savedError } = await supabase
      .from("saved_outfits")
      .select("id,title,item_ids,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!savedError) setSavedOutfits((saved ?? []) as SavedOutfitRow[]);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session?.user) void loadWardrobe(data.session.user.id);
    });

    const { data: authData } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        void loadWardrobe(nextSession.user.id);
      } else {
        setItems([]);
        setSavedOutfits([]);
        setSelected([]);
        setOutfits([]);
      }
    });

    return () => {
      alive = false;
      authData.subscription.unsubscribe();
    };
  }, [supabase, loadWardrobe]);

  const filteredItems = useMemo(
    () => activeCategory === "All items"
      ? items
      : items.filter((item) => item.category === activeCategory),
    [items, activeCategory]
  );
  const selectedItems = useMemo(
    () => selected.length ? items.filter((item) => selected.includes(item.id)) : items,
    [items, selected]
  );

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setNotice("");
    const result = authMode === "signup"
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);

    if (result.error) {
      setNotice(result.error.message);
    } else if (authMode === "signup" && !result.data.session) {
      setNotice("Account created. Check your email for a confirmation link, then sign in.");
    } else {
      setNotice("You're signed in. Loading your private wardrobe…");
    }
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!supabase || !session) return;

    const validFiles = files.filter((file) => acceptedTypes.includes(file.type));
    if (validFiles.length !== files.length) {
      setNotice("Please use JPG, PNG, WebP or HEIC photos.");
    }
    if (!validFiles.length) return;

    setBusy(true);
    let successCount = 0;
    for (const file of validFiles) {
      if (file.size > 10 * 1024 * 1024) {
        setNotice(file.name + " is larger than the 10 MB limit.");
        continue;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = session.user.id + "/" + crypto.randomUUID() + "-" + safeName;
      const upload = await supabase.storage
        .from("stylewise-wardrobe")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (upload.error) {
        setNotice("Photo upload failed: " + upload.error.message);
        continue;
      }

      const insert = await supabase.from("wardrobe_items").insert({
        user_id: session.user.id,
        name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        category: "Unsorted",
        color: "Not set",
        image_path: path
      }).select("id,user_id,name,category,color,image_path").single();

      if (insert.error) {
        await supabase.storage.from("stylewise-wardrobe").remove([path]);
        setNotice("Photo uploaded but its details could not be saved: " + insert.error.message);
        continue;
      }

      const signed = await supabase.storage.from("stylewise-wardrobe").createSignedUrl(path, 3600);
      setItems((current) => [{ ...insert.data, image: signed.data?.signedUrl ?? "" } as WardrobeItem, ...current]);
      successCount += 1;
    }
    setBusy(false);
    if (successCount > 0) {
      setActiveCategory("All items");
      setNotice(successCount + " photo(s) saved to your account. They will be there when you sign in on another device.");
    }
  }

  async function changeCategory(item: WardrobeItem, category: Category) {
    if (!supabase) return;
    const { error } = await supabase.from("wardrobe_items").update({ category }).eq("id", item.id);
    if (error) {
      setNotice("Could not update category: " + error.message);
      return;
    }
    setItems((current) => current.map((piece) => piece.id === item.id ? { ...piece, category } : piece));
  }

  async function deleteItem(item: WardrobeItem) {
    if (!supabase || !session) return;
    const { error } = await supabase.from("wardrobe_items").delete().eq("id", item.id).eq("user_id", session.user.id);
    if (error) {
      setNotice("Could not delete item: " + error.message);
      return;
    }
    await supabase.storage.from("stylewise-wardrobe").remove([item.image_path]);
    setItems((current) => current.filter((piece) => piece.id !== item.id));
    setSelected((current) => current.filter((id) => id !== item.id));
    setNotice("Item deleted from your wardrobe.");
  }

  function generateOutfits() {
    const pool = selectedItems;
    if (pool.length < 2) {
      setNotice("Add at least two clothing pieces to create combinations.");
      return;
    }

    const tops = pool.filter((item) => item.category === "Tops");
    const bottoms = pool.filter((item) => item.category === "Bottoms");
    const shoes = pool.filter((item) => item.category === "Shoes");
    const addOns = pool.filter((item) =>
      ["Bags", "Jewellery", "Accessories"].includes(item.category)
    );
    const generated: Outfit[] = [];

    if (tops.length && bottoms.length) {
      for (const top of tops) {
        for (const bottom of bottoms) {
          const pieces = [top, bottom];
          const shoe = shoes.find((item) => !pieces.some((piece) => piece.id === item.id));
          const addOn = addOns.find((item) => !pieces.some((piece) => piece.id === item.id));
          if (shoe) pieces.push(shoe);
          if (addOn) pieces.push(addOn);
          generated.push({
            id: crypto.randomUUID(),
            title: "Look " + String(generated.length + 1).padStart(2, "0"),
            items: pieces
          });
          if (generated.length >= 12) break;
        }
        if (generated.length >= 12) break;
      }
    } else {
      for (let first = 0; first < pool.length && generated.length < 12; first += 1) {
        for (let second = first + 1; second < pool.length && generated.length < 12; second += 1) {
          const pieces = [pool[first], pool[second]];
          const extra = pool.find((item) => !pieces.some((piece) => piece.id === item.id));
          if (extra) pieces.push(extra);
          generated.push({
            id: crypto.randomUUID(),
            title: "Look " + String(generated.length + 1).padStart(2, "0"),
            items: pieces
          });
        }
      }
    }

    setOutfits(generated);
    setView("stylist");
    setNotice(generated.length
      ? generated.length + " outfit combinations using your actual wardrobe photos. " + mood + " · " + occasion + "."
      : "Add tops and bottoms, or select a few different pieces, to build outfit combinations.");
  }

  async function saveOutfit(outfit: Outfit) {
    if (!supabase || !session) return;
    const { error } = await supabase.from("saved_outfits").insert({
      user_id: session.user.id,
      title: outfit.title + " · " + occasion,
      item_ids: outfit.items.map((item) => item.id)
    });
    if (error) {
      setNotice("Could not save outfit: " + error.message);
      return;
    }
    const { data } = await supabase.from("saved_outfits")
      .select("id,title,item_ids,created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (data) setSavedOutfits(data as SavedOutfitRow[]);
    setNotice("Outfit saved to your account.");
  }

  async function deleteSavedOutfit(outfitId: string) {
    if (!supabase) return;
    const { error } = await supabase.from("saved_outfits").delete().eq("id", outfitId);
    if (error) {
      setNotice("Could not remove saved outfit: " + error.message);
      return;
    }
    setSavedOutfits((current) => current.filter((outfit) => outfit.id !== outfitId));
  }

  if (!supabase) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <a className="wordmark">stylewise<span>.</span></a>
          <h1>One small setup step.</h1>
          <p>Add the Supabase Project URL and publishable client key to the Vercel environment variables, then redeploy.</p>
          <p>Required names: <b>NEXT_PUBLIC_SUPABASE_URL</b> and <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b>.</p>
          <p>Never put a service-role or secret key in browser code.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="auth-screen">
        <form className="auth-card" onSubmit={authenticate}>
          <a className="wordmark">stylewise<span>.</span></a>
          <p className="eyebrow">YOUR PERSONAL DIGITAL WARDROBE</p>
          <h1>{authMode === "signup" ? "Create your space." : "Welcome back."}</h1>
          <p className="intro">Your clothes, stored privately and available wherever you sign in.</p>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : authMode === "signup" ? "Create account" : "Sign in"}</button>
          <button type="button" className="text-button" onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}>
            {authMode === "signup" ? "Already have an account? Sign in" : "New to STYLEWISE? Create an account"}
          </button>
          <p className="notice" aria-live="polite">{notice}</p>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="wordmark" href="#">stylewise<span>.</span></a>
        <p className="side-caption">YOUR PERSONAL WARDROBE</p>
        <button className={view === "wardrobe" ? "side-link active" : "side-link"} onClick={() => setView("wardrobe")}>▦ My wardrobe</button>
        <button className={view === "stylist" ? "side-link active" : "side-link"} onClick={() => setView("stylist")}>✳ Visual stylist</button>
        <button className={view === "saved" ? "side-link active" : "side-link"} onClick={() => setView("saved")}>♡ Saved outfits</button>
        <div className="sidebar-bottom">
          <div className="mini-profile">
            <div className="avatar">{(session.user.email ?? "S")[0].toUpperCase()}</div>
            <div><strong>Your account</strong><small>{session.user.email}</small></div>
          </div>
          <button className="text-button" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="mobile-brand">stylewise<span>.</span></div>
          <div className="breadcrumb">{session.user.email}</div>
          <div className="top-actions"><span className="saved-label">Private wardrobe</span></div>
        </header>

        <div className="content">
          {view === "wardrobe" && (
            <>
              <section className="welcome-row">
                <div>
                  <p className="eyebrow">YOUR PERSONAL SPACE</p>
                  <h1>Your wardrobe,<br /><em>your style.</em></h1>
                  <p className="intro">Your pieces are saved to your account and load when you sign in on another device.</p>
                </div>
                <div className="welcome-mark"><span>SW</span><small>STYLE IS<br />PERSONAL</small></div>
              </section>

              <section className="stats-row">
                <div><strong>{items.length.toString().padStart(2, "0")}</strong><span>PIECES IN YOUR CLOSET</span></div>
                <div><strong>{new Set(items.map((item) => item.category)).size.toString().padStart(2, "0")}</strong><span>CATEGORIES</span></div>
                <div><strong>∞</strong><span>WAYS TO REIMAGINE</span></div>
              </section>

              <section className="section-heading">
                <div><p className="eyebrow">THE COLLECTION</p><h2>My wardrobe</h2></div>
                <button className="primary-button" disabled={busy} onClick={() => fileRef.current?.click()}>
                  ＋ Take a photo / Upload
                </button>
                <input ref={fileRef} className="file-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple capture="environment" onChange={addPhotos} />
              </section>

              <div className="category-tabs" role="tablist" aria-label="Wardrobe categories">
                {categories.map((category) => (
                  <button key={category} className={activeCategory === category ? "category-tab selected" : "category-tab"} onClick={() => setActiveCategory(category)}>
                    {category}
                  </button>
                ))}
              </div>

              <div className="wardrobe-grid">
                {filteredItems.length === 0 ? (
                  <div className="empty-state">
                    <h3>{items.length === 0 ? "Your wardrobe starts here" : "No pieces in this category yet"}</h3>
                    <p>Upload photos of clothes you own. They are stored in your private account.</p>
                    <button className="primary-button" onClick={() => fileRef.current?.click()}>＋ Add your first piece</button>
                  </div>
                ) : filteredItems.map((item) => (
                  <article key={item.id} className={selected.includes(item.id) ? "wardrobe-item chosen" : "wardrobe-item"}>
                    <button className="item-card" onClick={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}>
                      <div className="item-image">
                        {item.image ? <img src={item.image} alt={item.name} /> : <span>Photo unavailable — refresh</span>}
                        <span className="item-check">{selected.includes(item.id) ? "✓" : "＋"}</span>
                      </div>
                      <div className="item-meta"><strong>{item.name}</strong><span>{item.color} · {item.category}</span></div>
                    </button>
                    <div className="item-tools">
                      <select aria-label={"Change category for " + item.name} value={item.category} onChange={(event) => changeCategory(item, event.target.value as Category)}>
                        {categories.filter((category) => category !== "All items").map((category) => <option key={category}>{category}</option>)}
                      </select>
                      <button onClick={() => deleteItem(item)} aria-label={"Delete " + item.name}>Remove</button>
                    </div>
                  </article>
                ))}
              </div>

              <section className="selected-bar">
                <div>
                  <span className="selected-kicker">{selected.length ? selected.length + " PIECES SELECTED" : "FULL WARDROBE"}</span>
                  <strong>{selected.length ? "Generate looks using your selected pieces." : "Generate looks using everything in your wardrobe."}</strong>
                  <small>Select individual pieces to lock them into your outfit ideas.</small>
                </div>
                <button className="outline-button" onClick={generateOutfits}>Generate visual outfits ↗</button>
              </section>
            </>
          )}

          {view === "stylist" && (
            <section className="stylist-page">
              <p className="eyebrow">BUILT FROM YOUR ACTUAL CLOTHES</p>
              <h1>Your pieces,<br /><em>new combinations.</em></h1>
              <p className="intro">Each outfit board uses the exact photos saved in your wardrobe — not substitute clothing pictures.</p>
              <div className="stylist-controls">
                <div className="control-block">
                  <label htmlFor="mood">THE FEELING</label>
                  <select id="mood" value={mood} onChange={(event) => setMood(event.target.value)}>
                    <option>Effortlessly chic</option><option>Relaxed and casual</option><option>Modern streetwear</option><option>Quiet luxury</option><option>Playful and bold</option>
                  </select>
                </div>
                <div className="control-block">
                  <label htmlFor="occasion">THE OCCASION</label>
                  <select id="occasion" value={occasion} onChange={(event) => setOccasion(event.target.value)}>
                    <option>Everyday</option><option>College</option><option>Brunch</option><option>Party</option><option>Family gathering</option><option>Evening out</option>
                  </select>
                </div>
              </div>
              <div className="section-heading looks-heading">
                <div><p className="eyebrow">YOUR CLOSET, REMIXED</p><h2>Outfit combinations</h2></div>
                <button className="primary-button" onClick={generateOutfits}>Generate again</button>
              </div>
              {outfits.length === 0 ? (
                <div className="empty-state"><h3>No outfit boards yet</h3><p>Add at least two pieces to your wardrobe, then generate combinations.</p></div>
              ) : (
                <div className="visual-looks">
                  {outfits.map((outfit) => (
                    <article className="visual-look" key={outfit.id}>
                      <div className="visual-look-heading"><div><span className="look-number">{outfit.title}</span><h3>{mood}</h3><p>{occasion}</p></div><button className="outline-button" onClick={() => saveOutfit(outfit)}>♡ Save outfit</button></div>
                      <div className="visual-look-grid">
                        {outfit.items.map((item) => (
                          <div className="visual-piece" key={item.id}>
                            {item.image ? <img src={item.image} alt={item.name} /> : <div className="missing-photo">Refresh to reload photo</div>}
                            <span>{item.name}</span><small>{item.category}</small>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <button className="text-button" onClick={() => setView("wardrobe")}>← Back to my wardrobe</button>
            </section>
          )}

          {view === "saved" && (
            <section className="stylist-page">
              <p className="eyebrow">YOUR PERSONAL COLLECTION</p>
              <h1>Saved <em>outfits.</em></h1>
              <p className="intro">Your saved outfit combinations stay with your account.</p>
              {savedOutfits.length === 0 ? (
                <div className="empty-state"><h3>No saved outfits yet</h3><p>Generate some outfit boards and save your favourites here.</p></div>
              ) : (
                <div className="saved-outfit-list">
                  {savedOutfits.map((outfit) => {
                    const pieces = outfit.item_ids.map((id) => items.find((item) => item.id === id)).filter((item): item is WardrobeItem => Boolean(item));
                    return (
                      <article className="visual-look" key={outfit.id}>
                        <div className="visual-look-heading"><h3>{outfit.title}</h3><button className="text-button" onClick={() => deleteSavedOutfit(outfit.id)}>Remove</button></div>
                        <div className="visual-look-grid">
                          {pieces.map((item) => <div className="visual-piece" key={item.id}>{item.image ? <img src={item.image} alt={item.name} /> : <div className="missing-photo">Photo unavailable</div>}<span>{item.name}</span><small>{item.category}</small></div>)}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <p className="notice" aria-live="polite">{busy ? "Working…" : notice}</p>
        </div>
        <footer className="footer"><span>STYLEWISE © 2026</span><span>MADE FOR YOUR WAY OF WEARING</span></footer>
      </section>

      <nav className="mobile-nav" aria-label="Main navigation">
        <button className={view === "wardrobe" ? "mobile-nav-active" : ""} onClick={() => setView("wardrobe")}>▦ Wardrobe</button>
        <button className={view === "stylist" ? "mobile-nav-active" : ""} onClick={() => setView("stylist")}>✳ Stylist</button>
        <button onClick={() => fileRef.current?.click()}>＋ Add</button>
        <button className={view === "saved" ? "mobile-nav-active" : ""} onClick={() => setView("saved")}>♡ Saved</button>
      </nav>
    </main>
  );
}
