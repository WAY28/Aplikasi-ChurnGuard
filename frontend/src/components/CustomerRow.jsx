import { Link } from "react-router-dom";
import Badge from "./Badge";
import { contactStatusLabel, contactStatusTone, formatPercent, initials, riskLabel, riskTone } from "../utils/format";
import "./CustomerRow.css";

export default function CustomerRow({ customer, index = 0 }) {
  return (
    <Link
      to={`/customers/${customer.id}`}
      className="customer-row stagger-item"
      style={{ "--stagger-index": Math.min(index, 8) }}
    >
      <div className="customer-row-avatar">{initials(customer.name)}</div>
      <div className="customer-row-main">
        <div className="customer-row-name">{customer.name || "Tanpa nama"}</div>
        <div className="customer-row-badges">
          <Badge tone={riskTone(customer.churn_prediction)}>{riskLabel(customer.churn_prediction)}</Badge>
          <Badge tone={contactStatusTone(customer.contact_status)}>{contactStatusLabel(customer.contact_status)}</Badge>
        </div>
      </div>
      <div className="customer-row-score">
        <div className="customer-row-score-value">{formatPercent(customer.churn_probability)}</div>
        <div className="customer-row-score-label">skor risiko</div>
      </div>
    </Link>
  );
}
