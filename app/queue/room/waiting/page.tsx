import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Room: Waiting" };

export default function Page() {
  return (
    <QueueStatus
      stage="room"
      status="waiting"
      customerName="MUHAMMAD SYAFIQ BIN MOHAMED NOOR"
      queueNumber="1001"
    />
  );
}
