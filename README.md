# 📚 Campus Document Hub
### a.k.a. "bro send the notes" — now automated

🔗 **Live here:** [campus-resource-hub-pi.vercel.app](https://campus-resource-hub-pi.vercel.app/)

Every batch has that one guy who has all the notes and never replies on time. This website replaces him. No offense to him. He knows who he is.

Built at 2 AM, fueled by chai and mild panic about deadlines, this is where our notes, assignments, experiments, and exam papers finally live in one place instead of scattered across 6 WhatsApp groups, 2 Google Drive links nobody can find, and one guy's phone gallery.

---

## Why this exists

Because "did anyone do OS Experiment 5" deserves better than 40 unread messages and someone sending a blurry photo taken at a 45-degree angle with their thumb in frame. Upload it once. Everyone finds it. Nobody's thumb is in the shot.

---

## What it actually does

- 📤 **Upload your stuff** — Notes, Assignments, Experiments, End-Sem Papers, Midsems. Snap a pic of your handwritten notes and it turns into a proper PDF on its own, so your questionable handwriting at least looks organized.
- 🕵️ **See who uploaded what** — so when there are three different "OS Exp 5" files, you know exactly whose to trust (and whose to double-check).
- 🔍 **Search & sort** — by title, type, semester, uploader, or deadline. Faster than scrolling up 200 messages going "wait when's this due."
- 👀 **View it right there** — no downloading five files just to find the one you actually need.
- 🤖 **Ask the AI** — say "give me Experiment 5 of OS" like you're ordering food, and it finds it and takes you straight there.
- 🔒 **Your files, your rules** — you can delete your own uploads. You cannot delete someone else's just because your version looks better. We checked. The database says no.
- 🙋 **Your profile** — name, year, sem, branch, a picture so people know it's you, and a scoreboard of how much (or how little) you've actually contributed.
- 🔑 **Sign in with Google** — because nobody's making a new password for this.

---

## Built with

Next.js, Supabase, Google OAuth, Gemini AI, and a genuinely unreasonable number of "why is it a 404 now" moments along the way.

---

## Running it yourself

1. `npm install`
2. Copy `.env.example` → `.env.local`, drop in your own Supabase and Gemini keys. Do not commit real keys. We've all learned this lesson the hard way at least once during this build.
3. Run the SQL in `supabase/schema.sql` on your own Supabase project.
4. Set up Google OAuth, plug it into Supabase.
5. `npm run dev`, and go forth.

---

## The Rules (yes, we need these)

- Don't upload stuff that isn't yours to share.
- If your upload is wrong or outdated, fix it or delete it — don't let the next batch fail an exam because of your typo.
- If you find a bug, either fix it or scream about it in the group chat. Screaming is acceptable engineering feedback here.

---

## Credits

Made by one of your own, for all of you, so nobody has to be "the notes guy" ever again. He's retired now. Let him rest.

Now go pass your exams. 🎓
