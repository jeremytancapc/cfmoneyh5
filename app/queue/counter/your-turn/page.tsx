import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Counter: Your Turn" };

export default function Page() {
  return (
    <QueueStatus
      stage="counter"
      status="your-turn"
      customerName="DA DONG BAI"
      queueNumber="1001"
      location="Counter 6"
    />
  );
}
