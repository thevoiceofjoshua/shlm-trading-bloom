import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Review = {
  id: string;
  author: string;
  role: string;
  quote: string;
  rating: number;
  created_at: string;
};

function serverPublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getReviews = createServerFn({ method: "GET" }).handler(async (): Promise<Review[]> => {
  try {
    const supabase = serverPublicClient();
    const { data } = await supabase
      .from("reviews")
      .select("id,author,role,quote,rating,created_at")
      .eq("verified", true)
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(24);
    return (data as Review[] | null) ?? [];
  } catch {
    return [];
  }
});
