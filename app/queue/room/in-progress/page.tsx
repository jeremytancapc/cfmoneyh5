import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Room: In Progress" };

export default function Page() {
  return (
    <QueueStatus
      stage="room"
      status="in-progress"
      customerName="DA DONG BAI"
      queueNumber="1001"
      location="Room 1"
    />
  );
}
