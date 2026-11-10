# STYLEWISE

A personal digital wardrobe with private accounts and cross-device wardrobe access.

## Supabase configuration

1. Run `supabase/migrations/0001_private_wardrobes.sql` in the Supabase SQL Editor.
2. In Supabase Project Settings → API Keys, copy the **publishable** key (or legacy anon key).
3. In Vercel → Project → Settings → Environment Variables, set:
   - `NEXT_PUBLIC_SUPABASE_URL` to the Supabase Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the Supabase publishable key (the variable name remains for compatibility).
4. Enable Production, Preview and Development environments, then redeploy.

Never use a Supabase service-role key or secret key in a browser-exposed `NEXT_PUBLIC_` variable.

## Current first version

- Supabase email/password authentication.
- Private per-user wardrobe records and photo storage, enforced by database/storage policies.
- Clothing photo upload, category edits and item removal.
- Outfit boards that use the exact wardrobe photos; this is a photo-combination/collage feature, not AI virtual try-on.
- Saved outfit records.

New sign-ups may require email confirmation, depending on Supabase Auth email settings.
