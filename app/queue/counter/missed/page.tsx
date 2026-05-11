import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Counter: Missed" };

export default function Page() {
  return (
    <QueueStatus
      stage="counter"
      status="missed"
      customerName="MUHAMMAD SYAFIQ BIN MOHAMED NOOR"
      queueNumber="1001"
    />
  );
}
