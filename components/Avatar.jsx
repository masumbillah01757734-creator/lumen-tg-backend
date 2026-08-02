"use client";

function initials(user) {
  const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function photoUrl(fileId) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return `${process.env.NEXT_PUBLIC_API_URL}/files/${fileId}?token=${token}`;
}

export default function Avatar({ user, size = 44, showOnline = true }) {
  const dim = { width: size, height: size };

  return (
    <div className="relative shrink-0" style={dim}>
      {user.profile_photo_file_id ? (
        <img
          src={photoUrl(user.profile_photo_file_id)}
          alt=""
          className="rounded-full object-cover"
          style={dim}
        />
      ) : (
        <div
          className="rounded-full bg-accent/20 text-accent font-semibold flex items-center justify-center"
          style={{ ...dim, fontSize: size * 0.36 }}
        >
          {initials(user)}
        </div>
      )}
      {showOnline && user.is_online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-online border-2 border-surface animate-pulseRing" />
      )}
    </div>
  );
}
