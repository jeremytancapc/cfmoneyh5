import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Cash Disbursement: Waiting" };

export default function Page() {
  return (
    <QueueStatus
      stage="cash"
      status="waiting"
      customerName="MUHAMMAD SYAFIQ BIN MOHAMED NOOR"
      queueNumber="1001"
    />
  );
}
