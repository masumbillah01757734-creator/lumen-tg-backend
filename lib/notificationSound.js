let audio;

/** Plays the "new message" notification sound. Safe to call from anywhere client-side. */
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  if (!audio) audio = new Audio("/notification.wav");
  // Reset to the start in case a previous message played it very recently.
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Ignored: browsers block autoplay until the user has interacted with the page.
  });
}
