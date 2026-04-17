import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Cash Disbursement: Missed" };

export default function Page() {
  return (
    <QueueStatus
      stage="cash"
      status="missed"
      customerName="DA DONG BAI"
      queueNumber="1001"
    />
  );
}
