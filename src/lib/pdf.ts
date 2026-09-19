import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Vehicle = {
  plate: string; owner_name: string; owner_contact?: string | null; owner_address?: string | null;
  brand: string; model: string; vehicle_type: string; color: string;
  registration_date?: string | null; registration_validity?: string | null;
  insurance_valid: boolean; insurance_expiry?: string | null;
  puc_valid: boolean; puc_expiry?: string | null;
  fitness_valid?: boolean; fitness_expiry?: string | null;
  road_tax_paid?: boolean;
  pending_challans: number; challan_amount: number;
  criminal_cases: string[]; status: string;
  fake_plate?: boolean; duplicate_plate?: boolean; suspicious?: boolean;
  engine_no?: string | null; chassis_no?: string | null;
  fuel_type?: string | null; ownership?: string | null; rto_office?: string | null;
  last_known_lat?: number | null; last_known_lng?: number | null;
  rc_number?: string | null;
};

export function generateVehicleReport(v: Vehicle, opts?: { officer?: string; remarks?: string; scanImage?: string }) {
  const doc = new jsPDF();
  const now = new Date();

  // Header
  doc.setFillColor(20, 30, 60);
  doc.rect(0, 0, 210, 25, "F");
  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TRUEPLATE AI — VEHICLE VERIFICATION REPORT", 105, 15, { align: "center" });

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${now.toLocaleString()}`, 14, 32);
  doc.text(`Officer: ${opts?.officer ?? "—"}`, 196, 32, { align: "right" });

  // Plate box
  doc.setDrawColor(0); doc.setLineWidth(0.5);
  doc.roundedRect(14, 38, 90, 18, 2, 2);
  doc.setFontSize(22); doc.setFont("courier", "bold");
  doc.text(v.plate, 59, 51, { align: "center" });

  // Status
  const statusColor: Record<string, [number, number, number]> = {
    stolen: [220, 38, 38], blacklisted: [220, 38, 38],
    under_investigation: [234, 179, 8], active: [34, 197, 94],
  };
  const c = statusColor[v.status] ?? [100, 100, 100];
  doc.setFillColor(...c);
  doc.roundedRect(110, 38, 86, 18, 2, 2, "F");
  doc.setTextColor(255); doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text(v.status.toUpperCase().replace("_", " "), 153, 51, { align: "center" });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 64,
    head: [["Owner Details", ""]],
    body: [
      ["Name", v.owner_name],
      ["Contact", v.owner_contact ?? "—"],
      ["Address", v.owner_address ?? "—"],
      ["Ownership", v.ownership ?? "—"],
      ["RC Number", v.rc_number ?? "—"],
      ["RTO Office", v.rto_office ?? "—"],
    ],
    theme: "grid", headStyles: { fillColor: [30, 41, 82] },
  });

  autoTable(doc, {
    head: [["Vehicle Details", ""]],
    body: [
      ["Brand / Model", `${v.brand} ${v.model}`],
      ["Type", v.vehicle_type],
      ["Color", v.color],
      ["Fuel Type", v.fuel_type ?? "—"],
      ["Engine No.", v.engine_no ?? "—"],
      ["Chassis No.", v.chassis_no ?? "—"],
      ["Registered", v.registration_date ?? "—"],
      ["Valid Until", v.registration_validity ?? "—"],
    ],
    theme: "grid", headStyles: { fillColor: [30, 41, 82] },
  });

  autoTable(doc, {
    head: [["Compliance & Enforcement", ""]],
    body: [
      ["Insurance", `${v.insurance_valid ? "Valid" : "EXPIRED"} · ${v.insurance_expiry ?? "—"}`],
      ["PUC", `${v.puc_valid ? "Valid" : "EXPIRED"} · ${v.puc_expiry ?? "—"}`],
      ["Fitness", `${v.fitness_valid !== false ? "Valid" : "EXPIRED"} · ${v.fitness_expiry ?? "—"}`],
      ["Road Tax", v.road_tax_paid !== false ? "Paid" : "UNPAID"],
      ["Pending Challans", `${v.pending_challans} (₹${v.challan_amount})`],
      ["Criminal Cases", v.criminal_cases && v.criminal_cases.length ? v.criminal_cases.join("; ") : "None"],
      ["Flags", [v.fake_plate ? "Fake Plate" : "", v.duplicate_plate ? "Duplicate" : "", v.suspicious ? "Suspicious" : ""].filter(Boolean).join(", ") || "None"],
      ["Last Known Location", v.last_known_lat && v.last_known_lng ? `${v.last_known_lat.toFixed(5)}, ${v.last_known_lng.toFixed(5)}` : "—"],
    ],
    theme: "grid", headStyles: { fillColor: [30, 41, 82] },
  });

  if (opts?.remarks) {
    autoTable(doc, {
      head: [["Officer Remarks"]],
      body: [[opts.remarks]],
      theme: "grid", headStyles: { fillColor: [30, 41, 82] },
    });
  }

  doc.setFontSize(8); doc.setTextColor(120);
  doc.text("This report is generated from verified TruePlate AI database records.", 105, 285, { align: "center" });

  doc.save(`TruePlate_${v.plate}_${now.getTime()}.pdf`);
}
