import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Admin user ──────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@quickintern.com" },
    update: {},
    create: {
      email: "admin@quickintern.com",
      password: adminPassword,
      name: "System Admin",
      role: Role.ADMIN,
    },
  });
  console.log("✅ Admin created:", admin.email);

  // ── Default Document Types ───────────────────────────
  const docTypes = [
    { name: "Aadhar Card", description: "Government-issued Aadhar Card", isRequired: true, acceptedFormats: "pdf,jpg,jpeg,png", maxSizeMb: 5 },
    { name: "PAN Card", description: "Permanent Account Number Card", isRequired: true, acceptedFormats: "pdf,jpg,jpeg,png", maxSizeMb: 5 },
    { name: "College ID", description: "College/University Identity Card", isRequired: true, acceptedFormats: "pdf,jpg,jpeg,png", maxSizeMb: 5 },
    { name: "Resume / CV", description: "Updated Resume or Curriculum Vitae", isRequired: true, acceptedFormats: "pdf,doc,docx", maxSizeMb: 10 },
    { name: "Offer Letter Acceptance", description: "Signed offer letter", isRequired: true, acceptedFormats: "pdf", maxSizeMb: 5 },
    { name: "Passport Photo", description: "Recent passport-size photograph", isRequired: false, acceptedFormats: "jpg,jpeg,png", maxSizeMb: 2 },
    { name: "Bank Account Details", description: "Cancelled cheque or passbook copy", isRequired: false, acceptedFormats: "pdf,jpg,jpeg,png", maxSizeMb: 5 },
    { name: "10th Marksheet", description: "Class 10 mark certificate", isRequired: false, acceptedFormats: "pdf,jpg,jpeg,png", maxSizeMb: 5 },
    { name: "12th Marksheet", description: "Class 12 mark certificate", isRequired: false, acceptedFormats: "pdf,jpg,jpeg,png", maxSizeMb: 5 },
  ];

  for (const dt of docTypes) {
    await prisma.documentType.upsert({
      where: { name: dt.name },
      update: {},
      create: dt,
    });
  }
  console.log("✅ Document types seeded");

  // ── Default Departments ──────────────────────────────
  const departments = [
    { name: "Engineering", description: "Software Development & Technology" },
    { name: "Marketing", description: "Marketing & Brand Management" },
    { name: "Human Resources", description: "HR and People Operations" },
    { name: "Finance", description: "Finance and Accounting" },
    { name: "Design", description: "UI/UX and Graphic Design" },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
  }
  console.log("✅ Departments seeded");

  console.log("🎉 Seeding complete!");
  console.log("\n📋 Login Credentials:");
  console.log("   Admin  → admin@quickintern.com  / Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
