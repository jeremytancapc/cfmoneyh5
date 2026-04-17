import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Cash Disbursement: In Progress" };

export default function Page() {
  return (
    <QueueStatus
      stage="cash"
      status="in-progress"
      customerName="DA DONG BAI"
      queueNumber="1001"
      location="Counter 3"
    />
  );
}
