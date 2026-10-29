import { describe, expect, it, vi } from "vitest";
import { googleSignInOptions, signOutAccount } from "./account-session";

describe("account switching", () => {
  it("asks Google to select an account without changing the return URL", () => {
    expect(googleSignInOptions("https://shlmtrdng.com")).toEqual({
      redirectTo: "https://shlmtrdng.com",
      queryParams: { prompt: "select_account" },
    });
    expect(googleSignInOptions("https://shlmtrdng.com/centre").redirectTo).toBe("https://shlmtrdng.com/centre");
  });

  it("cancels protected reads, clears their cache, then signs out before removing visit intent", async () => {
    const order: string[] = [];
    await signOutAccount(
      { signOut: vi.fn(async () => { order.push("signOut"); return { error: null }; }) },
      { cancelQueries: vi.fn(async () => { order.push("cancel"); }), clear: vi.fn(() => { order.push("clear"); }) },
      { removeItem: vi.fn(key => { order.push(key); }) },
    );
    expect(order).toEqual(["cancel", "clear", "signOut", "shlm.homeVaultAccessIntent", "shlm.homeIntroSeen"]);
  });

  it("does not report success if Supabase rejects sign-out", async () => {
    const error = new Error("Sign-out failed");
    const removeItem = vi.fn();
    await expect(signOutAccount(
      { signOut: vi.fn().mockResolvedValue({ error }) },
      { cancelQueries: vi.fn().mockResolvedValue(undefined), clear: vi.fn() },
      { removeItem },
    )).rejects.toBe(error);
    expect(removeItem).not.toHaveBeenCalled();
  });
});