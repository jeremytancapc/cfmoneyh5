import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Room: Missed" };

export default function Page() {
  return (
    <QueueStatus
      stage="room"
      status="missed"
      customerName="MUHAMMAD SYAFIQ BIN MOHAMED NOOR"
      queueNumber="1001"
    />
  );
}
