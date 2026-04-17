import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Counter: In Progress" };

export default function Page() {
  return (
    <QueueStatus
      stage="counter"
      status="in-progress"
      customerName="DA DONG BAI"
      queueNumber="1001"
      location="Counter 6"
    />
  );
}
