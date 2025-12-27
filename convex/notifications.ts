"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import webpush from "web-push";

export const sendCheckIn = internalAction({
  args: { migraineId: v.id("migraines") },
  handler: async (ctx, { migraineId }) => {
    // Get VAPID keys from environment
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      console.error("VAPID keys not configured");
      return;
    }

    webpush.setVapidDetails(
      "mailto:notifications@migraines.app",
      publicKey,
      privateKey
    );

    // Check if migraine is still active
    const migraine = await ctx.runQuery(internal.migraines.getById, {
      id: migraineId,
    });

    if (!migraine || migraine.endTime !== null) {
      // Migraine already ended, no need to notify
      console.log("Migraine already ended, skipping notification");
      return;
    }

    // Get all push subscriptions
    const subscriptions = await ctx.runQuery(internal.pushSubscriptions.list);

    if (subscriptions.length === 0) {
      console.log("No push subscriptions found");
      return;
    }

    const payload = JSON.stringify({
      title: "Migraine Check-in",
      body: "Is your migraine still ongoing? Tap to update.",
      icon: "/favicon.ico",
      data: { migraineId, url: "/" },
    });

    // Send push to all subscribed devices
    const results = await Promise.allSettled(
      subscriptions.map((sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload
        )
      )
    );

    // Log results
    results.forEach((result: PromiseSettledResult<unknown>, i: number) => {
      if (result.status === "rejected") {
        console.error(
          `Failed to send to ${subscriptions[i].endpoint}:`,
          result.reason
        );
      }
    });

    const succeeded = results.filter(
      (r: PromiseSettledResult<unknown>) => r.status === "fulfilled"
    ).length;
    console.log(
      `Sent check-in notifications: ${succeeded}/${subscriptions.length} succeeded`
    );
  },
});
