type FirebaseLookupResponse = {
  users?: {
    localId?: string;
    email?: string;
    emailVerified?: boolean;
    displayName?: string;
    photoUrl?: string;
  }[];
  error?: {
    message?: string;
  };
};

export type VerifiedFirebaseUser = {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string | null;
  picture?: string | null;
};

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is required");

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  const data = (await res.json().catch(() => null)) as FirebaseLookupResponse | null;
  if (!res.ok || !data?.users?.[0]) return null;

  const user = data.users[0];
  if (!user.localId || !user.email) return null;

  return {
    uid: user.localId,
    email: user.email.toLowerCase(),
    emailVerified: user.emailVerified === true,
    name: user.displayName || null,
    picture: user.photoUrl || null,
  };
}
