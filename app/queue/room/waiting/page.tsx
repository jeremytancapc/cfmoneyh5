import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Room: Waiting" };

export default function Page() {
  return (
    <QueueStatus
      stage="room"
      status="waiting"
      customerName="DA DONG BAI"
      queueNumber="1001"
    />
  );
}
