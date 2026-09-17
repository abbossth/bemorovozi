// Links a Firebase Auth user to a MongoDB Staff record so they can sign in to /dashboard.
// Usage: node --env-file=.env.local scripts/create-staff.mjs <email> <name> [hospitalId]
//
// Requires FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (service account)
// and a Firebase Auth user already created for <email> (Firebase Console > Authentication > Add user).

import mongoose from "mongoose";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [, , email, name, hospitalIdArg] = process.argv;
if (!email || !name) {
  console.error("Usage: node --env-file=.env.local scripts/create-staff.mjs <email> <name> [hospitalId]");
  process.exit(1);
}

const { MONGODB_URI, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  throw new Error("Firebase admin credentials are not set — add them to .env.local first");
}

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const StaffSchema = new mongoose.Schema(
  { hospitalId: mongoose.Schema.Types.ObjectId, firebaseUid: String, name: String, role: String },
  { timestamps: true }
);
const HospitalSchema = new mongoose.Schema({ name: String, region: String, plan: String }, { timestamps: true });
const Staff = mongoose.model("Staff", StaffSchema);
const Hospital = mongoose.model("Hospital", HospitalSchema);

await mongoose.connect(MONGODB_URI);

const firebaseUser = await getAuth().getUserByEmail(email);

let hospitalId = hospitalIdArg;
if (!hospitalId) {
  const hospital = await Hospital.findOne();
  if (!hospital) throw new Error("No hospital found — run scripts/seed.mjs first or pass a hospitalId");
  hospitalId = hospital._id.toString();
}

const staff = await Staff.findOneAndUpdate(
  { firebaseUid: firebaseUser.uid },
  { hospitalId, firebaseUid: firebaseUser.uid, name, role: "admin" },
  { upsert: true, new: true }
);

console.log(`Linked ${email} (${firebaseUser.uid}) -> Staff ${staff._id} @ hospital ${hospitalId}`);
await mongoose.disconnect();
