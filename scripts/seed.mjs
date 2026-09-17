import mongoose from "mongoose";

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");

const HospitalSchema = new mongoose.Schema(
  { name: String, region: String, plan: String },
  { timestamps: true }
);
const DepartmentSchema = new mongoose.Schema(
  { hospitalId: mongoose.Schema.Types.ObjectId, name: String, qrSlug: String },
  { timestamps: true }
);

const Hospital = mongoose.model("Hospital", HospitalSchema);
const Department = mongoose.model("Department", DepartmentSchema);

await mongoose.connect(MONGODB_URI);

let hospital = await Hospital.findOne({ name: "Urganch tibbiyot markazi" });
if (!hospital) {
  hospital = await Hospital.create({
    name: "Urganch tibbiyot markazi",
    region: "Xorazm",
    plan: "boshlangich",
  });
  console.log("Created hospital:", hospital._id.toString());
} else {
  console.log("Hospital already exists:", hospital._id.toString());
}

const deptNames = ["Kardiologiya bo'limi", "Qabulxona", "1-statsionar xona"];
for (const name of deptNames) {
  const qrSlug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  let dept = await Department.findOne({ hospitalId: hospital._id, qrSlug });
  if (!dept) {
    dept = await Department.create({ hospitalId: hospital._id, name, qrSlug });
    console.log(`Created department "${name}":`, dept._id.toString());
  } else {
    console.log(`Department "${name}" already exists:`, dept._id.toString());
  }
  console.log(`  -> /f/${hospital._id}/${dept._id}`);
}

await mongoose.disconnect();
