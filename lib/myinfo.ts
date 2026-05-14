/**
 * MyInfo field mapping utilities.
 * Shared by the Singpass callback route and the dev preview endpoint.
 */

import type { CpfContribution, LoanFormData, NoaRecord } from "./loan-form";

/** Read a { value } field. */
export function str(obj: unknown): string {
  if (obj && typeof obj === "object" && "value" in obj) {
    const v = (obj as Record<string, unknown>).value;
    return typeof v === "string" ? v : String(v ?? "");
  }
  return "";
}

/** Read a { code, desc } field; falls back to { value } if code is absent. */
export function strCode(obj: unknown): string {
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    if ("code" in o && typeof o.code === "string" && o.code) return o.code;
  }
  return str(obj);
}

export function mapResidentialStatus(code: string): LoanFormData["idType"] {
  switch (code) {
    case "C": return "singaporean";
    case "P": return "pr";
    default:  return "foreigner";
  }
}

const MARITAL_CODES: Record<string, string> = {
  "1": "Single",
  "2": "Married",
  "3": "Widowed",
  "4": "Separated",
  "5": "Divorced",
};

export function buildMyInfoPatch(myinfo: Record<string, unknown>): Partial<LoanFormData> {
  const patch: Partial<LoanFormData> = {};

  if (myinfo.name)   patch.fullName = str(myinfo.name);
  if (myinfo.uinfin) patch.nric     = str(myinfo.uinfin);
  if (myinfo.email)  patch.email    = str(myinfo.email);

  // Date of birth — used for CPF rate calculation
  if (myinfo.dob && typeof myinfo.dob === "object") {
    const dobVal = (myinfo.dob as Record<string, unknown>).value;
    if (typeof dobVal === "string" && dobVal) patch.dob = dobVal;
  }

  if (myinfo.mobileno && typeof myinfo.mobileno === "object") {
    const m = myinfo.mobileno as Record<string, { value: string }>;
    const nbr = m.nbr?.value ?? "";
    if (nbr) patch.mobile = nbr;
  }

  if (myinfo.regadd && typeof myinfo.regadd === "object") {
    const a = myinfo.regadd as Record<string, { value?: string }>;
    const block  = a.block?.value  ?? "";
    const street = a.street?.value ?? "";
    const floor  = a.floor?.value  ?? "";
    const unit   = a.unit?.value   ?? "";
    const postal = (myinfo.regadd as Record<string, { value?: string }>).postal?.value ?? "";
    patch.address    = [block, street, floor && unit ? `#${floor}-${unit}` : ""].filter(Boolean).join(" ");
    patch.postalCode = postal;
  }

  if (myinfo.residentialstatus && typeof myinfo.residentialstatus === "object") {
    patch.idType = mapResidentialStatus(strCode(myinfo.residentialstatus));
  }

  // Marital status — map MyInfo codes to form values
  if (myinfo.marital && typeof myinfo.marital === "object") {
    const code   = strCode(myinfo.marital);
    const mapped = MARITAL_CODES[code];
    if (mapped) patch.maritalStatus = mapped;
  }

  // NOA history — all detailed fields per Singpass data display guidelines.
  if (myinfo.noahistory && typeof myinfo.noahistory === "object") {
    const noas = (myinfo.noahistory as Record<string, unknown>).noas;
    if (Array.isArray(noas) && noas.length > 0) {
      patch.noaHistory = noas
        .map((n) => {
          const row = n as Record<string, { value?: string | number }>;
          const ya = String(row.yearofassessment?.value ?? "");
          if (!ya) return null;
          return {
            yearOfAssessment: ya,
            type:             String(row.category?.value    ?? "ORIGINAL"),
            taxClearance:     String(row.taxclearance?.value ?? "N"),
            assessableIncome: Number(row.amount?.value      ?? 0),
            employmentIncome: Number(row.employment?.value  ?? 0),
            tradeIncome:      Number(row.trade?.value       ?? 0),
            rentIncome:       Number(row.rent?.value        ?? 0),
            interestIncome:   Number(row.interest?.value    ?? 0),
          };
        })
        .filter((r): r is NoaRecord => r !== null);

      // Pre-fill declared income from latest NOA for form display
      const latest = patch.noaHistory[0];
      if (latest && latest.employmentIncome > 0) {
        patch.monthlyIncome = String(Math.round(latest.employmentIncome / 12));
      }
    }
  }

  // CPF contributions — employer, For Month, Paid On, Amount per Singpass guidelines.
  if (myinfo.cpfcontributions && typeof myinfo.cpfcontributions === "object") {
    const history = (myinfo.cpfcontributions as Record<string, unknown>).history;
    if (Array.isArray(history)) {
      patch.cpfContributions = history
        .map((h) => {
          const row    = h as Record<string, { value?: string | number }>;
          const month  = String(row.month?.value    ?? "");
          const amount = Number(row.amount?.value   ?? 0);
          // Employer name is truncated to 50 chars in the session cookie to stay
          // within the 4 KB browser limit. The full name is preserved in the raw
          // MyInfo payload saved to the DB via the auth-callback-store.
          const employer = String(row.employer?.value ?? "");
          return month && amount > 0
            ? {
                month,
                amount,
                employer: employer.length > 50 ? employer.slice(0, 50) + "…" : employer,
                paidOn:   String(row.date?.value ?? ""),
              }
            : null;
        })
        .filter((r): r is CpfContribution => r !== null);
    }
  }

  patch.authMethod = "singpass";
  return patch;
}
