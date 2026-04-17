import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Cash Disbursement: Your Turn" };

export default function Page() {
  return (
    <QueueStatus
      stage="cash"
      status="your-turn"
      customerName="DA DONG BAI"
      queueNumber="1001"
      location="Counter 3"
    />
  );
}
