import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Room: Missed" };

export default function Page() {
  return (
    <QueueStatus
      stage="room"
      status="missed"
      customerName="DA DONG BAI"
      queueNumber="1001"
    />
  );
}
