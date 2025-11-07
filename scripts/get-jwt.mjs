import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPA_URL;
const anon = process.env.SUPA_ANON;
const email = process.env.EMAIL;
const password = process.env.PASSWORD;

if (!url || !anon || !email || !password) {
  console.error("Missing env: SUPA_URL, SUPA_ANON, EMAIL, PASSWORD");
  process.exit(1);
}

const supa = createClient(url, anon);
const { data, error } = await supa.auth.signInWithPassword({ email, password });
if (error) {
  console.error("Sign-in error:", error.message);
  process.exit(1);
}
const token = data.session?.access_token;
if (!token) {
  console.error("No access_token. Is the user confirmed? (Email confirmations ON?)");
  process.exit(1);
}
console.log(token);
