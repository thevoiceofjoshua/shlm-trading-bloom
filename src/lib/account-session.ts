import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";

export function googleSignInOptions(redirectTo: string) {
  return { redirectTo, queryParams: { prompt: "select_account" } };
}

export async function signOutAccount(
  auth: Pick<SupabaseClient["auth"], "signOut">,
  queryClient: Pick<QueryClient, "cancelQueries" | "clear">,
  visitStorage: Pick<Storage, "removeItem">,
) {
  await queryClient.cancelQueries();
  queryClient.clear();
  const { error } = await auth.signOut();
  if (error) throw error;
  visitStorage.removeItem("shlm.homeVaultAccessIntent");
  visitStorage.removeItem("shlm.homeIntroSeen");
}