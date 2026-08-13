import { CUSTOMER_FEATURE_FIELDS } from "./customerFields";

export function downloadTemplateCsv() {
  const headers = ["name", "phone", "email", ...CUSTOMER_FEATURE_FIELDS];
  const sampleRow = [
    "Budi Santoso",
    "6281234567890",
    "budi@email.com",
    "12",
    "15",
    "3",
    "4",
    "2",
    "3",
    "1",
    "15",
    "1",
    "2",
    "20",
    "120",
    "Mobile Phone",
    "Debit Card",
    "Male",
    "Mobile",
    "Single",
    "1",
  ];
  const csv = `${headers.join(",")}\n${sampleRow.join(",")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-churnguard.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
