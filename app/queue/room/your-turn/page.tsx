import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Room: Your Turn" };

export default function Page() {
  return (
    <QueueStatus
      stage="room"
      status="your-turn"
      customerName="DA DONG BAI"
      queueNumber="1001"
      location="Room 1"
    />
  );
}
