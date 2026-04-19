import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Cash Disbursement: In Progress" };

export default function Page() {
  return (
    <QueueStatus
      stage="cash"
      status="in-progress"
      customerName="MUHAMMAD SYAFIQ BIN MOHAMED NOOR"
      queueNumber="1001"
      location="Counter 3"
    />
  );
}
