import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Counter: Waiting" };

export default function Page() {
  return (
    <QueueStatus
      stage="counter"
      status="waiting"
      customerName="DA DONG BAI"
      queueNumber="1001"
    />
  );
}
