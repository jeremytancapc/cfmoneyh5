import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Cash Disbursement: Missed" };

export default function Page() {
  return (
    <QueueStatus
      stage="cash"
      status="missed"
      customerName="MUHAMMAD SYAFIQ BIN MOHAMED NOOR"
      queueNumber="1001"
    />
  );
}
